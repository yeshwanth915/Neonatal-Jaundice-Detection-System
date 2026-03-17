"""Central rectangular ROI extraction utilities."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np


@dataclass(frozen=True)
class ROIConfig:
    """Configuration describing a fixed central ROI as fractions of image size."""

    width_fraction: float = 0.5
    height_fraction: float = 0.35


# Default ROI captures the middle 50% width and 35% height of each image.
ROI_CONFIG = ROIConfig()


def _validate_image(image: np.ndarray) -> None:
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected an RGB image shaped (H, W, 3).")


def compute_roi_bounds(image_shape: Tuple[int, int, int], config: ROIConfig = ROI_CONFIG) -> Tuple[int, int, int, int]:
    """Compute (y1, y2, x1, x2) bounds for the central ROI.

    Args:
        image_shape: Shape tuple (H, W, C).
        config: ROI configuration specifying fractional width/height.

    Returns:
        Integer pixel bounds describing the ROI.
    """

    height, width = image_shape[:2]
    roi_w = int(width * config.width_fraction)
    roi_h = int(height * config.height_fraction)

    if roi_w <= 0 or roi_h <= 0:
        raise ValueError("ROI fractions yield zero-sized region.")

    x1 = (width - roi_w) // 2
    y1 = (height - roi_h) // 2
    x2 = x1 + roi_w
    y2 = y1 + roi_h
    return y1, y2, x1, x2


def extract_central_roi(image: np.ndarray, config: ROIConfig = ROI_CONFIG) -> np.ndarray:
    """Extract a deterministic central ROI from an RGB image."""

    _validate_image(image)
    y1, y2, x1, x2 = compute_roi_bounds(image.shape, config)
    return image[y1:y2, x1:x2, :]
