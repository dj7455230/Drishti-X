"""
DRISHTI-X — Lesion Evidence Analysis
Real computer-vision pipeline using classical image processing.
U-Net segmentation will replace this when a trained model is available.

Provenance is always declared: every finding states its origin.
Terminology: "Potential lesion" / "Detected evidence" — never "Confirmed".
"""
import cv2
import numpy as np
from typing import Dict, Any, Optional
from pathlib import Path


LESION_PROVENANCE = "CV_PIPELINE_HEURISTIC"  # Will become "UNET_MODEL" when trained


def detect_microaneurysms(img_gray: np.ndarray) -> Dict[str, Any]:
    """
    Detect microaneurysm candidates using morphological top-hat transform.
    Small bright spots relative to local background.
    Returns candidate count and area — labeled as 'potential'.
    """
    # Top-hat: highlights small bright features
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    tophat = cv2.morphologyEx(img_gray, cv2.MORPH_TOPHAT, kernel)

    # Threshold to find candidate spots
    _, thresh = cv2.threshold(tophat, 15, 255, cv2.THRESH_BINARY)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter by size: microaneurysms are typically 25–100 µm
    # In a 224×224 image from typical fundus, roughly 2–8 pixels diameter
    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 3 < area < 80:  # rough pixel area range
            candidates.append({"area": float(area)})

    return {
        "count": len(candidates),
        "total_area_px": round(sum(c["area"] for c in candidates), 1),
        "label": "Potential microaneurysm candidates",
        "provenance": LESION_PROVENANCE,
    }


def detect_hemorrhages(img_gray: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict[str, Any]:
    """
    Detect hemorrhage candidates: dark regions within the retinal area.
    Uses adaptive thresholding and blob detection.
    """
    # Invert so dark regions become bright
    inverted = cv2.bitwise_not(img_gray)

    # Adaptive threshold
    thresh = cv2.adaptiveThreshold(
        inverted, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 51, 5
    )

    if mask is not None:
        thresh = cv2.bitwise_and(thresh, thresh, mask=mask)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 80 < area < 5000:  # larger than MA, smaller than noise blobs
            candidates.append({"area": float(area)})

    return {
        "count": len(candidates),
        "total_area_px": round(sum(c["area"] for c in candidates), 1),
        "label": "Potential hemorrhage candidates",
        "provenance": LESION_PROVENANCE,
    }


def detect_hard_exudates(img_rgb: np.ndarray) -> Dict[str, Any]:
    """
    Detect hard exudate candidates: bright yellowish regions.
    Uses color thresholding in the green channel (high intensity) 
    combined with region filtering.
    """
    # Hard exudates are bright — high in R and G channels
    r_channel = img_rgb[:, :, 0].astype(np.float32)
    g_channel = img_rgb[:, :, 1].astype(np.float32)

    # Bright yellowish: high R and G
    bright_mask = ((r_channel > 180) & (g_channel > 160)).astype(np.uint8) * 255

    # Remove optic disc region (circular mask approximation at center-ish)
    h, w = img_rgb.shape[:2]
    # Approximate OD exclusion: circle at ~top-right of image (heuristic)
    cv2.circle(bright_mask, (int(w * 0.7), int(h * 0.5)), int(w * 0.08), 0, -1)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    cleaned = cv2.morphologyEx(bright_mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 50 < area < 8000:
            candidates.append({"area": float(area)})

    return {
        "count": len(candidates),
        "total_area_px": round(sum(c["area"] for c in candidates), 1),
        "label": "Potential hard exudate candidates",
        "provenance": LESION_PROVENANCE,
    }


def get_retinal_mask(img_bgr: np.ndarray) -> np.ndarray:
    """Return a binary mask of the retinal circle area (exclude black borders)."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)
    kernel = np.ones((15, 15), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    return mask


def compute_lesion_evidence_score(
    ma_count: int,
    hem_count: int,
    exudate_count: int,
) -> float:
    """
    Compute a normalized evidence score 0–1 based on lesion burden.
    This is a heuristic score, not a clinical metric.
    """
    # Rough weighting based on clinical significance
    score = 0.0
    score += min(ma_count / 50.0, 0.3)      # MAs: up to 0.3
    score += min(hem_count / 20.0, 0.4)     # Hemorrhages: up to 0.4
    score += min(exudate_count / 10.0, 0.3) # Exudates: up to 0.3
    return round(min(score, 1.0), 3)


def analyze_lesions(
    image_path: str,
    output_mask_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full lesion analysis pipeline. Returns structured evidence.
    All findings labeled as 'potential' — requires ophthalmologist confirmation.
    """
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return {
            "error": "Could not load image for lesion analysis",
            "provenance": LESION_PROVENANCE,
        }

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    retinal_mask = get_retinal_mask(img_bgr)

    # Run individual detectors
    ma_result = detect_microaneurysms(img_gray)
    hem_result = detect_hemorrhages(img_gray, mask=retinal_mask)
    exudate_result = detect_hard_exudates(img_rgb)

    evidence_score = compute_lesion_evidence_score(
        ma_count=ma_result["count"],
        hem_count=hem_result["count"],
        exudate_count=exudate_result["count"],
    )

    # Generate combined visualization mask
    if output_mask_path:
        combined_mask = np.zeros_like(img_bgr)
        # Overlay detections with distinct colors (BGR)
        # This is a simplified visualization — U-Net will replace this
        gray_vis = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        _, ma_thresh = cv2.threshold(
            cv2.morphologyEx(gray_vis, cv2.MORPH_TOPHAT,
                             cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))),
            15, 255, cv2.THRESH_BINARY
        )
        combined_mask[:, :, 1] = ma_thresh  # Green: MA candidates
        Path(output_mask_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_mask_path, combined_mask)

    return {
        "microaneurysms": ma_result,
        "hemorrhages": hem_result,
        "hard_exudates": exudate_result,
        "neovascularization_signal": False,    # Requires trained model — NOT_AVAILABLE
        "neovascularization_note": "Neovascularization detection requires trained U-Net — NOT_AVAILABLE",
        "lesion_evidence_score": evidence_score,
        "provenance": LESION_PROVENANCE,
        "disclaimer": (
            "All lesion detections are model-indicated candidates. "
            "Requires ophthalmologist review. Not clinically confirmed."
        ),
    }
