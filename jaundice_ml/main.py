"""Phase-01B entrypoint: inference-only TcB prediction using optimized models."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict

import pandas as pd

from model.model_utils import FEATURES_PATH
from model.predict import (
    ModelNotReadyError,
    load_feature_columns,
    predict_jaundice_from_features,
    predict_jaundice_from_image,
    get_model_status,
)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    )


def _load_sample_feature_vector(features_path: Path) -> Dict[str, float]:
    """Load a single feature vector aligned with the frozen model schema."""
    if not features_path.exists():
        raise FileNotFoundError(f"Missing feature CSV: {features_path}")

    df = pd.read_csv(features_path)
    if df.empty:
        raise ValueError("Feature CSV is empty; cannot run inference sample.")

    feature_columns = load_feature_columns()
    missing_cols = [col for col in feature_columns if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Feature CSV missing required columns: {missing_cols}")

    sample_row = df.iloc[0]
    return {col: float(sample_row[col]) for col in feature_columns}


def main() -> None:
    configure_logging()

    # Show model status
    model_status = get_model_status()
    logging.info("Model Status: %s", model_status)
    
    # Try image-based prediction first (recommended)
    try:
        # Try to find a test image
        test_image_path = Path("../../../test/download.jpg")
        if test_image_path.exists():
            logging.info("Running image-based prediction on %s", test_image_path)
            result = predict_jaundice_from_image(test_image_path)
            if result.get("success", False):
                logging.info(
                    "Image Prediction -> Class: %s | Risk: %s | Confidence: %.1f%% | Yellow Tint: %.3f",
                    result["predicted_class"],
                    result["risk_level"],
                    result["confidence"] * 100,
                    result["yellow_tint_score"],
                )
            else:
                logging.error("Image prediction failed: %s", result.get("error", "Unknown error"))
        else:
            logging.info("No test image found, falling back to feature-based prediction")
            raise FileNotFoundError("Test image not found")
    except Exception as e:
        logging.info("Falling back to feature-based prediction: %s", e)
        
        # Original feature-based prediction
        try:
            feature_vector = _load_sample_feature_vector(FEATURES_PATH)
            result = predict_jaundice_from_features(feature_vector)
            logging.info(
                "Feature Prediction -> TcB Forehead: %.2f | TcB Sternum: %.2f | Final: %.2f | Risk: %s",
                result["tcb_forehead"],
                result["tcb_sternum"],
                result["tcb_final"],
                result["risk"],
            )
        except ModelNotReadyError as exc:
            logging.error("Models are not ready for inference: %s", exc)
            logging.info("Train once via `python -m model.train_model` before running main.")
            return
        except (FileNotFoundError, ValueError) as exc:
            logging.error("Unable to prepare inference sample: %s", exc)
            return


if __name__ == "__main__":
    main()
