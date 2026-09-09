"""
DRISHTI-X — EfficientNet-B0 DR Classification Model
Real architecture using timm (PyTorch Image Models).
Transfer learning from ImageNet weights.

Model Status: NOT_TRAINED until training/train_efficientnet.py is run.
"""
import torch
import torch.nn as nn
from typing import Optional, Dict, Tuple
import json
import os
import hashlib

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False

NUM_CLASSES = 5
DR_GRADE_LABELS = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}
REFERABLE_GRADES = {2, 3, 4}


class DrishtiEfficientNet(nn.Module):
    """
    EfficientNet-B0 with custom classification head for 5-class DR grading.
    Uses timm for architecture; falls back to torchvision if timm unavailable.
    """

    def __init__(self, num_classes: int = NUM_CLASSES, pretrained: bool = True,
                 dropout: float = 0.3):
        super().__init__()
        self.num_classes = num_classes

        if TIMM_AVAILABLE:
            self.backbone = timm.create_model(
                "efficientnet_b0",
                pretrained=pretrained,
                num_classes=0,  # Remove classifier head — we add our own
            )
            feature_dim = self.backbone.num_features
        else:
            # Fallback: torchvision EfficientNet-B0
            from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
            weights = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
            base = efficientnet_b0(weights=weights)
            # Remove final classifier
            self.backbone = nn.Sequential(*list(base.children())[:-1])
            feature_dim = 1280

        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1) if not TIMM_AVAILABLE else nn.Identity(),
            nn.Flatten(),
            nn.Dropout(p=dropout),
            nn.Linear(feature_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout / 2),
            nn.Linear(256, num_classes),
        )

        self._feature_dim = feature_dim
        self._using_timm = TIMM_AVAILABLE

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        return self.classifier(features)

    def get_feature_map(self, x: torch.Tensor) -> torch.Tensor:
        """Return feature maps from the last conv layer (for Grad-CAM)."""
        if self._using_timm:
            # Get features before global pool
            return self.backbone.forward_features(x)
        else:
            # For torchvision fallback, return before AdaptiveAvgPool
            features = x
            for layer in list(self.backbone.children())[:-1]:
                features = layer(features)
            return features


class ModelLoader:
    """
    Manages model loading with explicit status tracking.
    Never silently switches between real and demo modes.
    """

    MODEL_STATUSES = {
        "NOT_TRAINED": "Model architecture exists but has not been trained on any dataset.",
        "TRAINED": "Model has been trained but not validated on a held-out test set.",
        "VALIDATED": "Model has been trained and evaluated on a held-out test set.",
        "DEMO": "DEMO MODEL — Outputs synthetic predictions. NOT clinical AI.",
    }

    def __init__(self, weights_path: Optional[str] = None,
                 config_path: Optional[str] = None):
        self.weights_path = weights_path
        self.config_path = config_path
        self.model: Optional[DrishtiEfficientNet] = None
        self.status: str = "NOT_TRAINED"
        self.model_version: str = "0.0.0"
        self.weights_hash: Optional[str] = None
        self.training_dataset: Optional[str] = None
        self.device = self._detect_device()

    def _detect_device(self) -> torch.device:
        if torch.cuda.is_available():
            return torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")

    def load(self) -> "ModelLoader":
        """
        Attempt to load trained weights. If unavailable, model stays NOT_TRAINED.
        """
        # Build architecture (always available — uses ImageNet pretrained weights for features)
        self.model = DrishtiEfficientNet(pretrained=True)
        self.model.eval()

        if self.weights_path and os.path.exists(self.weights_path):
            try:
                checkpoint = torch.load(
                    self.weights_path,
                    map_location=self.device,
                    weights_only=True
                )
                # Handle both raw state_dict and checkpoint dict
                state_dict = checkpoint.get("model_state_dict", checkpoint)
                self.model.load_state_dict(state_dict)
                self.model.to(self.device)
                self.status = checkpoint.get("status", "TRAINED")
                self.model_version = checkpoint.get("version", "1.0.0")
                self.training_dataset = checkpoint.get("training_dataset", "unknown")
                # Compute hash of weights file for audit trail
                with open(self.weights_path, "rb") as f:
                    self.weights_hash = hashlib.sha256(f.read()).hexdigest()
                print(f"[ModelLoader] Loaded weights: {self.weights_path}")
                print(f"[ModelLoader] Status: {self.status} | Version: {self.model_version}")
            except Exception as e:
                print(f"[ModelLoader] WARNING: Could not load weights: {e}")
                print("[ModelLoader] Status: NOT_TRAINED")
                self.status = "NOT_TRAINED"
        else:
            if self.weights_path:
                print(f"[ModelLoader] Weights not found at: {self.weights_path}")
            print(f"[ModelLoader] Status: NOT_TRAINED — architecture ready, no trained weights.")
            self.status = "NOT_TRAINED"

        return self

    def get_status_banner(self) -> str:
        return f"MODEL STATUS: {self.status} — {self.MODEL_STATUSES.get(self.status, '')}"

    def is_ready_for_real_inference(self) -> bool:
        return self.status in ("TRAINED", "VALIDATED")


# Singleton loader — initialized at app startup
_loader: Optional[ModelLoader] = None


def get_model_loader(weights_path: Optional[str] = None) -> ModelLoader:
    global _loader
    if _loader is None:
        _loader = ModelLoader(weights_path=weights_path).load()
    return _loader
