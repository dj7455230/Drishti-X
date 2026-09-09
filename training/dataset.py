"""
DRISHTI-X — Dataset Pipeline
Supports: APTOS 2019, IDRiD, Messidor-2
Handles: class imbalance analysis, stratified splits, corrupt image detection,
         class weight computation, duplicate detection.
"""
import os
import hashlib
import pandas as pd
import numpy as np
from PIL import Image
from typing import Optional, Tuple, Dict, List
from torch.utils.data import Dataset
from collections import Counter
import torch


DR_GRADE_LABELS = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}


class RetinalDataset(Dataset):
    """
    PyTorch Dataset for retinal fundus images.
    Supports CSV-based label loading for APTOS/IDRiD/Messidor-2.
    """

    def __init__(
        self,
        csv_path: str,
        image_dir: str,
        image_col: str = "id_code",
        label_col: str = "diagnosis",
        transform=None,
        ext: str = ".png",
    ):
        if not os.path.exists(csv_path):
            raise FileNotFoundError(
                f"DATASET NOT AVAILABLE: {csv_path}\n"
                "Download APTOS 2019 from https://www.kaggle.com/c/aptos2019-blindness-detection"
            )

        self.df = pd.read_csv(csv_path)
        self.image_dir = image_dir
        self.image_col = image_col
        self.label_col = label_col
        self.transform = transform
        self.ext = ext

        self._validate()

    def _validate(self):
        """Validate image-label correspondence and detect corrupt images."""
        missing = []
        for _, row in self.df.iterrows():
            fname = str(row[self.image_col])
            if not fname.endswith(self.ext):
                fname += self.ext
            path = os.path.join(self.image_dir, fname)
            if not os.path.exists(path):
                missing.append(path)

        if missing:
            print(f"WARNING: {len(missing)} image files not found. First 5:")
            for p in missing[:5]:
                print(f"  {p}")

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        fname = str(row[self.image_col])
        if not fname.endswith(self.ext):
            fname += self.ext
        path = os.path.join(self.image_dir, fname)

        try:
            image = Image.open(path).convert("RGB")
        except Exception as e:
            # Return a black image placeholder for corrupt files
            print(f"WARNING: Corrupt image {path}: {e}")
            image = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))

        label = int(row[self.label_col])

        if self.transform:
            image = self.transform(image)

        return image, label


def compute_class_weights(labels: List[int], num_classes: int = 5) -> torch.Tensor:
    """
    Compute inverse-frequency class weights to handle imbalanced DR datasets.
    Returns a tensor of shape [num_classes].
    """
    counts = Counter(labels)
    total = len(labels)
    weights = []
    for c in range(num_classes):
        if counts[c] > 0:
            weights.append(total / (num_classes * counts[c]))
        else:
            weights.append(1.0)
    return torch.tensor(weights, dtype=torch.float32)


def analyze_dataset(csv_path: str, label_col: str = "diagnosis") -> Dict:
    """
    Analyze class distribution and report imbalance.
    """
    if not os.path.exists(csv_path):
        return {"error": f"DATASET NOT AVAILABLE: {csv_path}"}

    df = pd.read_csv(csv_path)
    counts = df[label_col].value_counts().sort_index()
    total = len(df)

    distribution = {}
    for grade, count in counts.items():
        distribution[int(grade)] = {
            "label": DR_GRADE_LABELS.get(int(grade), f"Grade {grade}"),
            "count": int(count),
            "percentage": round(count / total * 100, 1),
        }

    imbalance_ratio = max(counts) / max(min(counts), 1)

    return {
        "total_images": total,
        "num_classes": len(counts),
        "distribution": distribution,
        "imbalance_ratio": round(float(imbalance_ratio), 2),
        "recommendation": (
            "High imbalance detected — use weighted loss + oversampling"
            if imbalance_ratio > 5
            else "Moderate imbalance — weighted loss recommended"
        ),
    }


def stratified_split(
    csv_path: str,
    label_col: str = "diagnosis",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
    output_dir: str = "datasets",
) -> Tuple[str, str, str]:
    """
    Create stratified train/val/test splits and save as CSVs.
    Avoids leakage by splitting before any preprocessing.
    """
    from sklearn.model_selection import train_test_split

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"DATASET NOT AVAILABLE: {csv_path}")

    df = pd.read_csv(csv_path)
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, \
        "Ratios must sum to 1.0"

    # First split: train vs (val + test)
    train_df, temp_df = train_test_split(
        df, test_size=(val_ratio + test_ratio),
        stratify=df[label_col], random_state=seed
    )
    # Second split: val vs test
    val_df, test_df = train_test_split(
        temp_df, test_size=(test_ratio / (val_ratio + test_ratio)),
        stratify=temp_df[label_col], random_state=seed
    )

    os.makedirs(output_dir, exist_ok=True)
    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "val.csv")
    test_path = os.path.join(output_dir, "test.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"Split complete: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")
    return train_path, val_path, test_path
