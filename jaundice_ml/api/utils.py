"""Utility helpers for the FastAPI inference service."""
from __future__ import annotations

import cv2
import numpy as np

from preprocessing.image_loader import ImagePair


def _skin_ratio(region: np.ndarray) -> float:
    if region.size == 0:
        return 0.0
    ycrcb = cv2.cvtColor(region, cv2.COLOR_RGB2YCrCb)
    lower_skin = np.array([0, 133, 77], dtype=np.uint8)
    upper_skin = np.array([255, 173, 127], dtype=np.uint8)
    mask = cv2.inRange(ycrcb, lower_skin, upper_skin)
    return float(np.sum(mask > 0) / mask.size)


def _safe_crop(image: np.ndarray, y0: int, y1: int) -> np.ndarray:
    h = image.shape[0]
    y0 = max(0, min(y0, h - 1))
    y1 = max(y0 + 1, min(y1, h))
    return image[y0:y1, :, :]


def split_forehead_sternum_views(image: np.ndarray) -> ImagePair:
    """Create forehead/sternum views from a single image.

    Strategy:
    1) Try vertical split (for images that contain both regions stacked).
    2) If split appears invalid (very low skin ratio in one side), fallback to
       two center-biased crops from the same frame.
    """

    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected RGB image for inference.")

    height = image.shape[0]
    forehead_end = max(int(height * 0.45), 1)
    sternum_start = min(int(height * 0.55), height - 1)

    forehead = _safe_crop(image, 0, forehead_end)
    sternum = _safe_crop(image, sternum_start, height)

    if forehead.size == 0 or sternum.size == 0:
        mid = height // 2
        forehead = _safe_crop(image, 0, mid)
        sternum = _safe_crop(image, mid, height)

    # If one split has little/no skin, treat input as single-region capture.
    # Use center crops with small vertical offset to stabilize features.
    skin_top = _skin_ratio(forehead)
    skin_bottom = _skin_ratio(sternum)
    if min(skin_top, skin_bottom) < 0.05:
        upper_start = int(height * 0.15)
        upper_end = int(height * 0.65)
        lower_start = int(height * 0.35)
        lower_end = int(height * 0.85)
        forehead = _safe_crop(image, upper_start, upper_end)
        sternum = _safe_crop(image, lower_start, lower_end)

    return ImagePair(
        image_id="live_capture",
        forehead=forehead.astype(np.uint8, copy=True),
        sternum=sternum.astype(np.uint8, copy=True),
    )
