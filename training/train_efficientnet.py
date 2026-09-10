"""
DRISHTI-X — EfficientNet-B0 Training Script
Trains on combined APTOS 2019 + IDRiD dataset (3079 images).

Usage:
    python training/train_efficientnet.py

Output:
    models/weights/best_model.pth
    training/logs/training_history.json
"""
import os, sys, json, time, random, argparse, hashlib
from datetime import datetime, timezone
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np
import yaml
from sklearn.model_selection import train_test_split
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from ai.classification.model import DrishtiEfficientNet, DR_GRADE_LABELS
from training.dataset import RetinalDataset, compute_class_weights
from training.transforms import get_train_transforms, get_val_transforms
from training.metrics import compute_multiclass_metrics, compute_binary_metrics


def set_seed(seed=42):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


# ── Epoch functions ───────────────────────────────────────────

def train_epoch(model, loader, optimizer, criterion, device, epoch, log_interval=20):
    model.train()
    total_loss = correct = total = 0
    for i, (images, labels) in enumerate(loader):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
        preds = outputs.detach().argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
        if (i + 1) % log_interval == 0:
            print(f"  Ep{epoch} [{i+1}/{len(loader)}] loss={loss.item():.4f} acc={correct/total:.3f}")
    return total_loss / len(loader), correct / total


def validate_epoch(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    all_preds, all_labels, all_probs = [], [], []
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            total_loss += criterion(outputs, labels).item()
            probs = torch.softmax(outputs, 1)
            all_preds.extend(probs.argmax(1).cpu().tolist())
            all_labels.extend(labels.cpu().tolist())
            all_probs.append(probs.cpu().numpy())
    probs_np = np.concatenate(all_probs)
    mc = compute_multiclass_metrics(all_labels, all_preds)
    bm = compute_binary_metrics(all_labels, all_preds, probs_np)
    return total_loss / len(loader), mc, bm


# ── Main ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="training/configs/train_config.yaml")
    args = parser.parse_args()
    cfg  = load_config(args.config)
    set_seed(cfg["reproducibility"]["seed"])

    # ── Dataset ──────────────────────────────────────────────
    combined_csv = cfg["dataset"]["combined_csv"]
    if not os.path.exists(combined_csv):
        print("Combined dataset not found. Running prepare_datasets.py first...")
        os.system("python3 scripts/prepare_datasets.py")
        if not os.path.exists(combined_csv):
            print("ERROR: Dataset preparation failed."); sys.exit(1)

    df = pd.read_csv(combined_csv)
    print(f"Total images: {len(df)}")
    print(f"Class distribution:\n{df['label'].value_counts().sort_index()}")

    # Stratified split
    train_df, temp_df = train_test_split(
        df, test_size=0.30, stratify=df["label"], random_state=42
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=0.50, stratify=temp_df["label"], random_state=42
    )
    print(f"Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    # Save splits for evaluation
    os.makedirs("datasets", exist_ok=True)
    train_df.to_csv("datasets/train_split.csv", index=False)
    val_df.to_csv("datasets/val_split.csv",   index=False)
    test_df.to_csv("datasets/test_split.csv",  index=False)

    # ── Device ───────────────────────────────────────────────
    if torch.cuda.is_available():
        device = torch.device("cuda")
    elif hasattr(torch.backends,"mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")
    print(f"Device: {device}")

    # ── DataLoaders ──────────────────────────────────────────
    img_size = cfg["model"]["image_size"]
    nw = cfg["dataset"]["num_workers"]

    train_ds = RetinalDataset(
        "datasets/train_split.csv",
        image_col=cfg["dataset"]["image_col"],
        label_col=cfg["dataset"]["label_col"],
        transform=get_train_transforms(img_size),
    )
    val_ds = RetinalDataset(
        "datasets/val_split.csv",
        image_col=cfg["dataset"]["image_col"],
        label_col=cfg["dataset"]["label_col"],
        transform=get_val_transforms(img_size),
    )

    class_weights = compute_class_weights(
        train_ds.get_labels(), num_classes=5
    ).to(device)
    print(f"Class weights: {class_weights.tolist()}")

    train_loader = DataLoader(train_ds, batch_size=cfg["training"]["batch_size"],
                              shuffle=True, num_workers=nw)
    val_loader   = DataLoader(val_ds,   batch_size=cfg["training"]["batch_size"],
                              shuffle=False, num_workers=nw)

    # ── Model ─────────────────────────────────────────────────
    model = DrishtiEfficientNet(
        num_classes=cfg["model"]["num_classes"],
        pretrained=cfg["model"]["pretrained"],
        dropout=cfg["model"]["dropout"],
    ).to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.AdamW(model.parameters(),
                            lr=cfg["training"]["learning_rate"],
                            weight_decay=cfg["training"]["weight_decay"])
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=cfg["training"]["epochs"]
    )

    # ── Training loop ─────────────────────────────────────────
    save_dir = cfg["checkpointing"]["save_dir"]
    log_dir  = cfg["logging"]["log_dir"]
    os.makedirs(save_dir, exist_ok=True)
    os.makedirs(log_dir,  exist_ok=True)

    best_f1 = 0.0
    patience = 0
    history  = []

    print(f"\nStarting training — {cfg['training']['epochs']} epochs on {device}")
    print("=" * 65)

    for epoch in range(1, cfg["training"]["epochs"] + 1):
        t0 = time.time()
        tr_loss, tr_acc = train_epoch(
            model, train_loader, optimizer, criterion, device,
            epoch, cfg["logging"]["log_interval"]
        )
        val_loss, mc, bm = validate_epoch(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        sens_flag = "✓" if bm["sensitivity"] >= 0.90 else " "
        spec_flag = "✓" if bm["specificity"] >= 0.85 else " "

        print(
            f"Ep{epoch:3d}/{cfg['training']['epochs']} "
            f"| TrLoss={tr_loss:.4f} Acc={tr_acc:.3f} "
            f"| ValLoss={val_loss:.4f} F1={mc['weighted_f1']:.3f} "
            f"| Sens={bm['sensitivity']:.3f}{sens_flag} "
            f"Spec={bm['specificity']:.3f}{spec_flag} "
            f"| {elapsed:.0f}s"
        )

        record = dict(
            epoch=epoch, train_loss=round(tr_loss,4), train_acc=round(tr_acc,4),
            val_loss=round(val_loss,4), val_f1=mc["weighted_f1"],
            val_sensitivity=bm["sensitivity"], val_specificity=bm["specificity"],
            val_accuracy=mc["accuracy"],
        )
        history.append(record)

        # Save best
        if mc["weighted_f1"] > best_f1:
            best_f1 = mc["weighted_f1"]
            patience = 0
            weights_path = os.path.join(save_dir, "best_model.pth")
            torch.save({
                "model_state_dict": model.state_dict(),
                "epoch": epoch,
                "val_f1": mc["weighted_f1"],
                "val_sensitivity": bm["sensitivity"],
                "val_specificity": bm["specificity"],
                "val_accuracy": mc["accuracy"],
                "version": "1.0.0",
                "status": "TRAINED",
                "training_dataset": "aptos2019+idrid",
                "architecture": "efficientnet_b0",
                "num_classes": 5,
            }, weights_path)
            print(f"  ✓ Best model saved  F1={best_f1:.4f}")
        else:
            patience += 1
            if patience >= cfg["training"]["early_stopping_patience"]:
                print(f"Early stopping at epoch {epoch}")
                break

    # Save history
    hist_path = os.path.join(log_dir, "training_history.json")
    with open(hist_path, "w") as f:
        json.dump(history, f, indent=2)

    # Print final summary
    print("\n" + "=" * 65)
    print("TRAINING COMPLETE")
    print(f"  Best Val F1:          {best_f1:.4f}")
    best_ep = max(history, key=lambda x: x["val_f1"])
    print(f"  Best Sensitivity:     {best_ep['val_sensitivity']:.4f}  "
          f"{'TARGET MET ✓' if best_ep['val_sensitivity']>=0.90 else 'TARGET NOT YET ACHIEVED'}")
    print(f"  Best Specificity:     {best_ep['val_specificity']:.4f}  "
          f"{'TARGET MET ✓' if best_ep['val_specificity']>=0.85 else 'TARGET NOT YET ACHIEVED'}")
    print(f"  Weights:              {save_dir}/best_model.pth")
    print(f"  History:              {hist_path}")
    print("  Next: python training/evaluate.py  (held-out test set metrics)")
    print("=" * 65)


if __name__ == "__main__":
    main()
