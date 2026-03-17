"""Calibration routines for neonatal jaundice captures."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Tuple

import cv2
import numpy as np


@dataclass(frozen=True)
class CalibrationOutput:
    """Describes the outcome of a calibration attempt."""

    image: np.ndarray
    applied: bool
    notes: str


# Physical dimensions of the calibration card (mm)
CARD_WIDTH = 360  # mm
CARD_HEIGHT = 240  # mm
PATCH_GRID = (3, 3)  # 3x3 grid of color patches

# Detection parameters
MIN_CARD_AREA = 10000  # Minimum area for card detection (pixels)
CANNY_THRESHOLD1 = 30   # Lower threshold for edge detection
CANNY_THRESHOLD2 = 100  # Upper threshold for edge detection
PATCH_MARGIN = 0.2      # Margin around each patch (percentage of patch size)

import logging
logger = logging.getLogger(__name__)
REFERENCE_RGB = np.array(
    [
        [235, 235, 235],
        [200, 165, 150],
        [160, 195, 180],
        [120, 90, 70],
        [185, 125, 110],
        [155, 115, 160],
        [100, 140, 90],
        [60, 90, 130],
        [45, 60, 70],
    ],
    dtype=np.float32,
) / 255.0


def apply_calibration_if_present(image: np.ndarray) -> CalibrationOutput:
    """Attempt to detect calibration card and apply color correction."""

    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("Expected RGB image for calibration.")

    quad = _detect_calibration_quad(image)
    if quad is None:
        return CalibrationOutput(image=image, applied=False, notes="Calibration card not detected")

    warped = _warp_to_reference(image, quad)
    observed = _sample_patch_means(warped)
    if observed is None:
        return CalibrationOutput(image=image, applied=False, notes="Unable to sample calibration patches")

    transform = _estimate_color_transform(observed, REFERENCE_RGB[: len(observed)])
    if transform is None:
        return CalibrationOutput(image=image, applied=False, notes="Failed to compute color transform")

    corrected = _apply_color_transform(image, transform)
    return CalibrationOutput(image=corrected, applied=True, notes="Calibration applied via reference card")


def _detect_calibration_quad(image: np.ndarray) -> Optional[np.ndarray]:
    # Convert to grayscale and apply preprocessing
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.5)
    
    # Adaptive thresholding to handle different lighting
    thresh = cv2.adaptiveThreshold(
        blurred, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter and sort contours by area
    contours = [cnt for cnt in contours if cv2.contourArea(cnt) > MIN_CARD_AREA]
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]  # Top 5 largest
    
    for cnt in contours:
        # Approximate the contour
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)
        
        # Check if we have a quadrilateral
        if len(approx) == 4:
            # Calculate contour area and solidity
            area = cv2.contourArea(approx)
            hull = cv2.convexHull(approx)
            hull_area = cv2.contourArea(hull)
            
            if hull_area > 0 and (area / hull_area) > 0.9:  # Check for convexity
                ordered = _order_points(approx.reshape(4, 2))
                return ordered
    
    logger.warning("No suitable calibration card detected")
    return None
    return None


def _order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _warp_to_reference(image: np.ndarray, quad: np.ndarray) -> np.ndarray:
    dst = np.array(
        [
            [0, 0],
            [CARD_WIDTH - 1, 0],
            [CARD_WIDTH - 1, CARD_HEIGHT - 1],
            [0, CARD_HEIGHT - 1],
        ],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(quad.astype(np.float32), dst)
    return cv2.warpPerspective(image, matrix, (CARD_WIDTH, CARD_HEIGHT))


def _sample_patch_means(card_image: np.ndarray) -> Optional[np.ndarray]:
    rows, cols = PATCH_GRID
    patch_h = card_image.shape[0] / rows
    patch_w = card_image.shape[1] / cols
    margin_y = patch_h * PATCH_MARGIN
    margin_x = patch_w * PATCH_MARGIN

    means = []
    for r in range(rows):
        for c in range(cols):
            y0 = int(max(r * patch_h + margin_y, 0))
            y1 = int(min((r + 1) * patch_h - margin_y, card_image.shape[0]))
            x0 = int(max(c * patch_w + margin_x, 0))
            x1 = int(min((c + 1) * patch_w - margin_x, card_image.shape[1]))
            if y1 <= y0 or x1 <= x0:
                continue
            patch = card_image[y0:y1, x0:x1]
            means.append(patch.reshape(-1, 3).mean(axis=0) / 255.0)

    if len(means) < 4:
        return None
    return np.array(means, dtype=np.float32)


def _estimate_color_transform(observed: np.ndarray, reference: np.ndarray) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    if observed.shape[0] != reference.shape[0]:
        min_len = min(observed.shape[0], reference.shape[0])
        observed = observed[:min_len]
        reference = reference[:min_len]

    ones = np.ones((observed.shape[0], 1), dtype=np.float32)
    design = np.hstack([observed, ones])

    try:
        coeffs, _, _, _ = np.linalg.lstsq(design, reference, rcond=None)
    except np.linalg.LinAlgError:
        return None

    matrix = coeffs[:3, :].T
    offset = coeffs[3, :].T
    return matrix, offset


def _apply_color_transform(image: np.ndarray, transform: Tuple[np.ndarray, np.ndarray]) -> np.ndarray:
    matrix, offset = transform
    reshaped = image.reshape(-1, 3).astype(np.float32) / 255.0
    corrected = reshaped @ matrix.T + offset
    corrected = np.clip(corrected, 0.0, 1.0)
    corrected = (corrected * 255.0).reshape(image.shape).astype(np.uint8)
    return corrected
