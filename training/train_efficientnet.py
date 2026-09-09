"""
DRISHTI-X — EfficientNet-B0 Training Script
Real training pipeline. Run this to train the DR classification model.

Usage:
    python training/train_efficientnet.py

Requirements:
    - Dataset must be present at path specified in training/configs/train_config.yaml
    - If dataset not available: DATASET NOT AVAILABLE error will be shown

Output:
    - models/weights/best_model.pth
    - models/configs/model_config.json
    - training/logs/training_history.json
"""
import os
import sys
import json
import time
import random
import argparse
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
import yaml

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai.classification.model import DrishtiEfficientNet, DR_GRADE_LABELS
from training.dataset import RetinalDataset, compute_class_weights, analyze_dataset
from training.transforms import get_train_transforms, get_val_transforms
from training.metrics import compute_multiclass_metrics, compute_binary_metrics


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)


def train_epoch(model, loader, optimizer, criterion, device, epoch, log_interval=10):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (images, labels) in enumerate(loader):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        preds = outputs.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

        if (batch_idx + 1) % log_interval == 0:
            print(f"  Epoch {epoch} [{batch_idx+1}/{len(loader)}] "
                  f"Loss: {loss.item():.4f} "
                  f"Acc: {correct/total:.3f}")

    return total_loss / len(loader), correct / total


def validate_epoch(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_preds, all_labels, all_probs = [], [], []

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item()

            probs = torch.softmax(outputs, dim=1)
            preds = probs.argmax(dim=1)
            all_preds.extend(preds.cpu().numpy().tolist())
            all_labels.extend(labels.cpu().numpy().tolist())
            all_probs.append(probs.cpu().numpy())

    all_probs_np = np.concatenate(all_probs, axis=0)
    metrics = compute_multiclass_metrics(all_labels, all_preds)
    binary_metrics = compute_binary_metrics(all_labels, all_preds, all_probs_np)

    return (
        total_loss / len(loader),
        metrics,
        binary_metrics,
        all_preds,
        all_labels,
        all_probs_np,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="training/configs/train_config.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    set_seed(cfg["reproducibility"]["seed"])

    # ----------------------------------------------------------------
    # Dataset availability check
    # ----------------------------------------------------------------
    train_csv = cfg["dataset"]["train_csv"]
    if not os.path.exists(train_csv):
        print("=" * 60)
        print("DATASET NOT AVAILABLE")
        print(f"Expected: {train_csv}")
        print("Download APTOS 2019: https://www.kaggle.com/c/aptos2019-blindness-detection")
        print("Then update training/configs/train_config.yaml with correct paths.")
        print("=" * 60)
        sys.exit(1)

    # ----------------------------------------------------------------
    # Device
    # ----------------------------------------------------------------
    if torch.cuda.is_available():
        device = torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")
    print(f"Device: {device}")

    # ----------------------------------------------------------------
    # Dataset analysis
    # ----------------------------------------------------------------
    print("\nDataset Analysis:")
    analysis = analyze_dataset(train_csv, cfg["dataset"]["label_col"])
    print(json.dumps(analysis, indent=2))

    # ----------------------------------------------------------------
    # Datasets + DataLoaders
    # ----------------------------------------------------------------
    img_size = cfg["model"]["image_size"]
    train_ds = RetinalDataset(
        csv_path=cfg["dataset"]["train_csv"],
        image_dir=cfg["dataset"]["image_dir"],
        image_col=cfg["dataset"]["image_col"],
        label_col=cfg["dataset"]["label_col"],
        transform=get_train_transforms(img_size),
    )
    val_ds = RetinalDataset(
        csv_path=cfg["dataset"]["val_csv"],
        image_dir=cfg["dataset"]["image_dir"],
        image_col=cfg["dataset"]["image_col"],
        label_col=cfg["dataset"]["label_col"],
        transform=get_val_transforms(img_size),
    )

    # Class weights for imbalance handling
    train_labels = [int(train_ds.df.iloc[i][cfg["dataset"]["label_col"]])
                    for i in range(len(train_ds))]
    class_weights = compute_class_weights(train_labels, num_classes=5).to(device)
    print(f"\nClass weights: {class_weights.cpu().numpy()}")

    train_loader = DataLoader(
        train_ds, batch_size=cfg["training"]["batch_size"],
        shuffle=True, num_workers=cfg["dataset"]["num_workers"],
        pin_memory=device.type == "cuda",
    )
    val_loader = DataLoader(
        val_ds, batch_size=cfg["training"]["batch_size"],
        shuffle=False, num_workers=cfg["dataset"]["num_workers"],
    )

    # ----------------------------------------------------------------
    # Model, Loss, Optimizer
    # ----------------------------------------------------------------
    model = DrishtiEfficientNet(
        num_classes=cfg["model"]["num_classes"],
        pretrained=cfg["model"]["pretrained"],
        dropout=cfg["model"]["dropout"],
    ).to(device)

    loss_type = cfg["loss"]["type"]
    if loss_type == "weighted_cross_entropy":
        criterion = nn.CrossEntropyLoss(weight=class_weights)
    else:
        criterion = nn.CrossEntropyLoss(weight=class_weights)

    optimizer = optim.AdamW(
        model.parameters(),
        lr=cfg["training"]["learning_rate"],
        weight_decay=cfg["training"]["weight_decay"],
    )

    sched_type = cfg["training"]["lr_scheduler"]
    if sched_type == "cosine":
        scheduler = optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=cfg["training"]["epochs"]
        )
    else:
        scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

    # ----------------------------------------------------------------
    # Training loop
    # ----------------------------------------------------------------
    save_dir = cfg["checkpointing"]["save_dir"]
    os.makedirs(save_dir, exist_ok=True)
    log_dir = cfg["logging"]["log_dir"]
    os.makedirs(log_dir, exist_ok=True)

    best_val_f1 = 0.0
    patience_counter = 0
    history = []

    print(f"\nStarting training for {cfg['training']['epochs']} epochs...")
    for epoch in range(1, cfg["training"]["epochs"] + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(
            model, train_loader, optimizer, criterion, device, epoch,
            cfg["logging"]["log_interval"]
        )
        val_loss, val_metrics, val_binary, _, _, _ = validate_epoch(
            model, val_loader, criterion, device
        )
        scheduler.step()
        elapsed = time.time() - t0

        print(
            f"Epoch {epoch:3d}/{cfg['training']['epochs']} "
            f"| Train Loss={train_loss:.4f} Acc={train_acc:.3f} "
            f"| Val Loss={val_loss:.4f} F1={val_metrics['weighted_f1']:.3f} "
            f"| Sens={val_binary['sensitivity']:.3f} "
            f"Spec={val_binary['specificity']:.3f} "
            f"| {elapsed:.1f}s"
        )

        record = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_f1": val_metrics["weighted_f1"],
            "val_sensitivity": val_binary["sensitivity"],
            "val_specificity": val_binary["specificity"],
        }
        history.append(record)

        # Save best model
        val_f1 = val_metrics["weighted_f1"]
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            patience_counter = 0
            weights_path = os.path.join(save_dir, "best_model.pth")
            torch.save({
                "model_state_dict": model.state_dict(),
                "epoch": epoch,
                "val_f1": val_f1,
                "val_sensitivity": val_binary["sensitivity"],
                "val_specificity": val_binary["specificity"],
                "version": "1.0.0",
                "status": "TRAINED",
                "training_dataset": cfg["dataset"]["train_csv"],
                "architecture": "efficientnet_b0",
                "num_classes": cfg["model"]["num_classes"],
            }, weights_path)
            print(f"  ✓ Saved best model (F1={val_f1:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= cfg["training"]["early_stopping_patience"]:
                print(f"Early stopping at epoch {epoch}")
                break

    # Save training history
    history_path = os.path.join(log_dir, "training_history.json")
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)

    print(f"\nTraining complete. Best Val F1: {best_val_f1:.4f}")
    print(f"Weights saved to: {save_dir}/best_model.pth")
    print(f"History saved to: {history_path}")
    print("\nRun training/evaluate.py to compute final test-set metrics.")


if __name__ == "__main__":
    main()
