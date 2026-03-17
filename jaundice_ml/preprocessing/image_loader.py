"""Utilities for loading paired neonatal images for feature extraction."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
import logging


LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class ImagePair:
    """Container representing a matched forehead/sternum image pair."""

    image_id: str
    forehead: np.ndarray
    sternum: np.ndarray


def _load_single_image(path: Path) -> np.ndarray | None:
    """Load an image as RGB, returning None when unreadable."""
    img = cv2.imread(str(path))
    if img is None:
        return None
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def _numeric_sort_key(path: Path) -> Tuple[int, str]:
    stem = path.stem
    if stem.isdigit():
        return int(stem), stem
    return 0, stem


def load_image_pairs(forehead_dir: Path, sternum_dir: Path) -> List[ImagePair]:
    """Load matched forehead/sternum image pairs.

    Args:
        forehead_dir: Directory containing forehead JPG files.
        sternum_dir: Directory containing sternum JPG files.

    Returns:
        A list of ImagePair objects ordered by numeric filename when available.
    """

    forehead_paths = sorted(forehead_dir.glob("*.jpg"), key=_numeric_sort_key)
    sternum_index = {p.stem: p for p in sternum_dir.glob("*.jpg")}

    pairs: List[ImagePair] = []
    for f_path in forehead_paths:
        stem = f_path.stem
        s_path = sternum_index.get(stem)
        if s_path is None:
            LOGGER.warning("Missing sternum pair for image_id=%s", stem)
            continue

        forehead_img = _load_single_image(f_path)
        sternum_img = _load_single_image(s_path)
        if forehead_img is None or sternum_img is None:
            LOGGER.warning("Unreadable image(s) for image_id=%s", stem)
            continue

        pairs.append(ImagePair(image_id=stem, forehead=forehead_img, sternum=sternum_img))

    return pairs
