"""End-to-end feature extraction pipeline for neonatal jaundice monitoring."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List

import pandas as pd

from features.feature_extraction import build_feature_vector
from preprocessing.image_loader import ImagePair, load_image_pairs
from preprocessing.roi_extraction import ROIConfig, ROI_CONFIG

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class PipelineConfig:
    """Runtime configuration for the feature pipeline."""

    forehead_dir: Path
    sternum_dir: Path
    output_csv: Path
    roi_config: ROIConfig = ROI_CONFIG


class FeaturePipeline:
    """Coordinated pipeline that converts raw images into feature CSV."""

    def __init__(self, config: PipelineConfig) -> None:
        self.config = config

    def run(self) -> Path:
        """Execute the pipeline and write features to CSV."""
        LOGGER.info("Loading image pairs from %s and %s", self.config.forehead_dir, self.config.sternum_dir)
        pairs = load_image_pairs(self.config.forehead_dir, self.config.sternum_dir)
        if not pairs:
            LOGGER.warning("No valid image pairs found. Output CSV will be empty.")

        features = self._extract_features(pairs)
        df = pd.DataFrame(features)
        output_path = self.config.output_csv
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        LOGGER.info("Saved %d feature rows to %s", len(df), output_path)
        return output_path

    def _extract_features(self, pairs: List[ImagePair]):
        records = []
        for pair in pairs:
            try:
                record = build_feature_vector(pair, roi_config=self.config.roi_config)
                records.append(record)
            except Exception as exc:  # noqa: BLE001 - log and continue
                LOGGER.exception("Failed to extract features for image_id=%s: %s", pair.image_id, exc)
        return records
