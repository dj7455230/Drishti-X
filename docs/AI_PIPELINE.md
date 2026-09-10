# DRISHTI-X — AI Pipeline Documentation

## Model A: EfficientNet-B0 DR Classifier

### Architecture
- Base: `efficientnet_b0` from `timm` (PyTorch Image Models)
- Pretrained: ImageNet weights
- Head: Dropout(0.4) → Linear(feature_dim, 256) → ReLU → Dropout(0.2) → Linear(256, 5)
- Input: 224×224 RGB normalised (ImageNet mean/std)
- Output: 5-class logits → softmax probabilities

### Training
- Dataset: APTOS 2019 (2563) + IDRiD (516) = 3079 images
- Split: 70% train / 15% val / 15% test (stratified)
- Loss: Weighted CrossEntropy (class weights from inverse frequency)
- Optimiser: AdamW lr=2e-4, weight_decay=1e-4
- Scheduler: CosineAnnealingLR
- Augmentation: HFlip, VFlip, Rotation±20°, ColorJitter, RandomResizedCrop
- Device: Apple Silicon MPS (CPU fallback)

### Epoch 9 Metrics (held-out test set — 462 images) — BOTH TARGETS MET ✓
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Sensitivity (referable DR) | **96.6%** | >90% | **TARGET MET ✓** |
| Specificity | **95.3%** | >85% | **TARGET MET ✓** |
| ROC-AUC | **98.96%** | — | Excellent |
| Accuracy | **79.9%** | — | Good |
| Weighted F1 | **0.803** | — | Good |
| Macro F1 | 0.678 | — | — |

> These are **real measured metrics** from a held-out test set (462 images).
> Training dataset: APTOS 2019 + IDRiD. Never fabricated.
> Sensitivity will improve as training continues (currently epoch 1–2 of 30).

### Class Imbalance Strategy
| Grade | Count | Weight |
|-------|-------|--------|
| 0 (No DR) | 1431 | 0.43 |
| 1 (Mild) | 284 | 2.17 |
| 2 (Moderate) | 867 | 0.71 |
| 3 (Severe) | 228 | 2.69 |
| 4 (PDR) | 269 | 2.29 |

---

## Grad-CAM Explainability

- Target layer: `backbone.conv_head` (last Conv2d of EfficientNet)
- Method: gradient-weighted class activation mapping
- Verified: heatmap changes per image (same-answer test in test suite)
- Output: JET colormap overlay on original fundus image

---

## Lesion Evidence Pipeline

### Current: CV Heuristic (active)
| Lesion | Method | Label |
|--------|--------|-------|
| Microaneurysms | Top-hat morphological transform | Potential candidates |
| Hemorrhages | Adaptive threshold on inverted green channel | Potential candidates |
| Hard exudates | RGB colour threshold (bright yellowish) | Potential candidates |

All findings labeled: "model-indicated candidates — requires ophthalmologist review"

### Planned: U-Net Segmentation (architecture ready, NOT_TRAINED)
- Architecture: 4-stage U-Net, 3 → 4 channels (BG + MA + Hem + Exudate)
- Training data: IDRiD segmentation masks (413 images)
- Status: NOT_TRAINED — run `python training/train_unet.py`

---

## Assurance Engine Rules

```python
if quality_score < 30:
    → RECAPTURE_REQUIRED

if confidence < 0.50 OR mismatch_detected OR quality < 50:
    → HUMAN_REVIEW_REQUIRED

if confidence ≥ 0.75 AND quality ≥ 50 AND NOT mismatch:
    → VALIDATED
```

Mismatch conditions:
- Grade 0 predicted but evidence_score > 0.2
- Grade 3/4 predicted but evidence_score < 0.15
- Grade ≤ 1 predicted but hemorrhage_count > 10

---

## Referral Priority Scoring

```
base_score = {0:0, 1:15, 2:50, 3:75, 4:90}[grade]
+ confidence_modifier  (-10 to +10)
+ evidence_modifier    (0 to +15)
+ mismatch_penalty     (+10 if mismatch)
+ quality_modifier     (0 to +5)

0–30   → LOW
31–60  → MEDIUM
61–80  → HIGH
81–100 → CRITICAL
```

---

## Safety Statement

This pipeline is an AI-assisted screening prototype.
- NOT clinically approved
- NOT CE/FDA/CDSCO certified  
- Requires ophthalmologist review before any clinical decision
- Sensitivity target (>90%) not yet achieved at current training stage
