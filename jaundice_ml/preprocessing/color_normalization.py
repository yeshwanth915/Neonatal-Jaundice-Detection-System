"""Color normalization routines for neonatal skin ROIs."""
from __future__ import annotations

import cv2
import numpy as np


def rgb_to_lab(image: np.ndarray) -> np.ndarray:
    """Convert an RGB uint8 image to float32 Lab representation."""
    if image.dtype != np.uint8:
        raise ValueError("Expected uint8 RGB image.")
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB).astype(np.float32)
    return lab


def normalize_lab_roi(lab_roi: np.ndarray) -> np.ndarray:
    """Normalize L channel min-max and a/b channel z-score."""
    l_channel = lab_roi[:, :, 0]
    a_channel = lab_roi[:, :, 1]
    b_channel = lab_roi[:, :, 2]

    l_min, l_max = l_channel.min(), l_channel.max()
    if l_max - l_min < 1e-6:
        l_norm = np.zeros_like(l_channel)
    else:
        l_norm = (l_channel - l_min) / (l_max - l_min)

    def _z_score(channel: np.ndarray) -> np.ndarray:
        mean = channel.mean()
        std = channel.std()
        if std < 1e-6:
            return np.zeros_like(channel)
        return (channel - mean) / std

    a_norm = _z_score(a_channel)
    b_norm = _z_score(b_channel)

    normalized = np.stack([l_norm, a_norm, b_norm], axis=-1)
    return normalized
