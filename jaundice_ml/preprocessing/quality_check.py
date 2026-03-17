"""Image quality validation utilities for neonatal jaundice captures."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import cv2
import numpy as np


@dataclass(frozen=True)
class QualityThresholds:
    """Thresholds controlling the quality gate heuristics."""

    min_blur_variance: float = 45.0
    min_brightness_mean: float = 45.0
    max_brightness_mean: float = 225.0
    max_overexposed_ratio: float = 0.25


@dataclass(frozen=True)
class QualityMetrics:
    """Container for raw quality statistics and derived score."""

    blur_variance: float
    brightness_mean: float
    overexposed_ratio: float

    def score(self, thresholds: QualityThresholds) -> float:
        blur_component = min(self.blur_variance / (thresholds.min_blur_variance * 1.5), 1.0)

        bright_min = thresholds.min_brightness_mean
        bright_max = thresholds.max_brightness_mean
        if bright_min < self.brightness_mean < bright_max:
            brightness_component = 1.0
        else:
            distance = min(abs(self.brightness_mean - bright_min), abs(self.brightness_mean - bright_max))
            brightness_component = max(0.0, 1.0 - distance / 255.0)

        exposure_component = max(0.0, 1.0 - self.overexposed_ratio / max(thresholds.max_overexposed_ratio, 1e-6))
        return float(np.clip((blur_component + brightness_component + exposure_component) / 3.0, 0.0, 1.0))


THRESHOLDS = QualityThresholds()


def _compute_blur_variance(gray_image: np.ndarray) -> float:
    laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)
    return float(laplacian.var())


def _compute_overexposed_ratio(image: np.ndarray) -> float:
    overexposed = np.sum(image >= 245)
    total = image.size
    if total == 0:
        return 0.0
    return float(overexposed / total)


def assess_image_quality_with_metrics(
    image: np.ndarray, thresholds: QualityThresholds = THRESHOLDS
) -> Tuple[bool, str, QualityMetrics]:
    """Evaluate blur, lighting, exposure and return raw metrics."""

    if image.ndim != 3 or image.shape[2] != 3:
        return False, "Invalid image format", QualityMetrics(0.0, 0.0, 0.0)

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    blur_variance = _compute_blur_variance(gray)
    brightness_mean = float(gray.mean())
    over_ratio = _compute_overexposed_ratio(image)

    metrics = QualityMetrics(
        blur_variance=blur_variance,
        brightness_mean=brightness_mean,
        overexposed_ratio=over_ratio,
    )

    if blur_variance < thresholds.min_blur_variance:
        return False, "Blur detected", metrics

    if brightness_mean < thresholds.min_brightness_mean:
        return False, "Too dark", metrics
    if brightness_mean > thresholds.max_brightness_mean:
        return False, "Overexposed", metrics

    if over_ratio > thresholds.max_overexposed_ratio:
        return False, "Overexposed", metrics

    return True, "OK", metrics


def assess_image_quality(image: np.ndarray, thresholds: QualityThresholds = THRESHOLDS) -> Tuple[bool, str]:
    """Backwards-compatible wrapper returning only boolean + message."""

    is_ok, reason, _ = assess_image_quality_with_metrics(image, thresholds)
    return is_ok, reason
