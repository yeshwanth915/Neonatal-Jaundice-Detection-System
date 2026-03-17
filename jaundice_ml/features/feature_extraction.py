"""Feature extraction helpers for normalized neonatal skin ROIs."""
from __future__ import annotations

from typing import Dict

import numpy as np

from preprocessing.color_normalization import normalize_lab_roi, rgb_to_lab
from preprocessing.image_loader import ImagePair
from preprocessing.roi_extraction import ROIConfig, ROI_CONFIG, extract_central_roi

EPS = 1e-6


def _channel_stats(channel: np.ndarray) -> Dict[str, float]:
    """Compute summary statistics for a single Lab channel."""
    return {
        "mean": float(channel.mean()),
        "std": float(channel.std()),
        "p10": float(np.percentile(channel, 10)),
        "p90": float(np.percentile(channel, 90)),
    }


def extract_roi_features(normalized_lab_roi: np.ndarray, prefix: str) -> Dict[str, float]:
    """Generate a deterministic feature set from a normalized Lab ROI."""
    l_channel = normalized_lab_roi[:, :, 0]
    a_channel = normalized_lab_roi[:, :, 1]
    b_channel = normalized_lab_roi[:, :, 2]

    l_stats = _channel_stats(l_channel)
    a_stats = _channel_stats(a_channel)
    b_stats = _channel_stats(b_channel)

    features = {
        f"{prefix}_mean_l": l_stats["mean"],
        f"{prefix}_mean_a": a_stats["mean"],
        f"{prefix}_mean_b": b_stats["mean"],
        f"{prefix}_std_l": l_stats["std"],
        f"{prefix}_std_a": a_stats["std"],
        f"{prefix}_std_b": b_stats["std"],
        f"{prefix}_p10_l": l_stats["p10"],
        f"{prefix}_p90_l": l_stats["p90"],
        f"{prefix}_contrast_l": l_stats["p90"] - l_stats["p10"],
    }

    mean_l = l_stats["mean"] + EPS
    mean_a = a_stats["mean"]
    mean_b = b_stats["mean"]
    std_l = l_stats["std"] + EPS

    features.update(
        {
            f"{prefix}_ratio_a_b": float(mean_a / (mean_b + np.sign(mean_b) * EPS if mean_b != 0 else EPS)),
            f"{prefix}_ratio_a_l": float(mean_a / mean_l),
            f"{prefix}_ratio_b_l": float(mean_b / mean_l),
            f"{prefix}_brightness_ratio": float(mean_l / std_l),
        }
    )

    # Additional chromatic energy proxy.
    chroma_energy = float(np.sqrt(mean_a**2 + mean_b**2))
    features[f"{prefix}_chroma_energy"] = chroma_energy

    return features


def build_feature_vector(pair: ImagePair, roi_config: ROIConfig = ROI_CONFIG) -> Dict[str, float]:
    """Build concatenated feature vector for forehead and sternum ROIs."""
    forehead_roi = extract_central_roi(pair.forehead, roi_config)
    sternum_roi = extract_central_roi(pair.sternum, roi_config)

    forehead_lab_norm = normalize_lab_roi(rgb_to_lab(forehead_roi))
    sternum_lab_norm = normalize_lab_roi(rgb_to_lab(sternum_roi))

    feature_vector = {"image_id": pair.image_id}
    feature_vector.update(extract_roi_features(forehead_lab_norm, prefix="forehead"))
    feature_vector.update(extract_roi_features(sternum_lab_norm, prefix="sternum"))
    return feature_vector
