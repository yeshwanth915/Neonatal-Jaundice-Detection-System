"""Inference-only TcB prediction utilities - Updated to use final optimized model."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np

# Import final optimized predictor
try:
    from model.final_predict import predict_jaundice_final
    FINAL_MODEL_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info("Final optimized model loaded successfully")
except ImportError:
    FINAL_MODEL_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Final model not available, falling back to original")

MODEL_DIR = Path(__file__).resolve().parent
MODEL_F_PATH = MODEL_DIR / "model_f.joblib"
MODEL_S_PATH = MODEL_DIR / "model_s.joblib"
MODEL_F_CALIBRATED_PATH = MODEL_DIR / "model_f_calibrated.joblib"
MODEL_S_CALIBRATED_PATH = MODEL_DIR / "model_s_calibrated.joblib"
FEATURE_COLUMNS_PATH = MODEL_DIR / "feature_columns.json"
TCB_MIN = 0.0
TCB_MAX = 25.0


class ModelNotReadyError(RuntimeError):
    """Raised when inference is attempted before models are trained."""


def _assert_file_exists(path: Path) -> None:
    if not path.exists():
        raise ModelNotReadyError(f"Required file missing for inference: {path}")


@lru_cache(maxsize=1)
def load_feature_columns() -> Tuple[str, ...]:
    """Load the frozen feature column ordering saved at training time."""
    _assert_file_exists(FEATURE_COLUMNS_PATH)
    columns = json.loads(FEATURE_COLUMNS_PATH.read_text())
    if not isinstance(columns, list) or not columns:
        raise ValueError("Feature columns file is malformed.")
    return tuple(columns)


def _select_model_paths() -> Tuple[Path, Path]:
    if MODEL_F_CALIBRATED_PATH.exists() and MODEL_S_CALIBRATED_PATH.exists():
        return MODEL_F_CALIBRATED_PATH, MODEL_S_CALIBRATED_PATH
    return MODEL_F_PATH, MODEL_S_PATH


@lru_cache(maxsize=1)
def _load_models_with_meta():
    """Load and cache regressors, tracking whether calibrated weights are used."""
    path_f, path_s = _select_model_paths()
    _assert_file_exists(path_f)
    _assert_file_exists(path_s)
    model_f = joblib.load(path_f)
    model_s = joblib.load(path_s)
    calibrated = path_f == MODEL_F_CALIBRATED_PATH and path_s == MODEL_S_CALIBRATED_PATH
    return model_f, model_s, calibrated


def load_models():
    """Public accessor returning only model objects (backward compatible)."""
    model_f, model_s, _ = _load_models_with_meta()
    return model_f, model_s


def calibrated_models_active() -> bool:
    """Return True if calibrated model weights are loaded."""
    _, _, calibrated = _load_models_with_meta()
    return calibrated


def _vectorize_features(feature_vector: Dict[str, float]) -> np.ndarray:
    columns = load_feature_columns()
    missing = [col for col in columns if col not in feature_vector]
    if missing:
        raise ValueError(f"Feature vector missing required columns: {missing}")
    ordered = [float(feature_vector[col]) for col in columns]
    return np.array([ordered], dtype=np.float32)


def stratify_risk(tcb_value: float) -> str:
    """Map TcB estimate to risk category with more sensitive thresholds."""
    if tcb_value < 8:
        return "Normal"
    if tcb_value < 11:
        return "Monitor"
    if tcb_value < 15:
        return "Serum Test Needed"
    return "Urgent Referral"


def predict_jaundice_from_features(feature_vector: Dict[str, float]) -> Dict[str, float | str]:
    """Run frozen models on a single feature vector and return TcB estimates."""
    X = _vectorize_features(feature_vector)
    model_f, model_s = load_models()

    tcb_forehead = float(np.clip(model_f.predict(X)[0], TCB_MIN, TCB_MAX))
    tcb_sternum = float(np.clip(model_s.predict(X)[0], TCB_MIN, TCB_MAX))
    tcb_final = float((tcb_forehead + tcb_sternum) / 2.0)
    risk = stratify_risk(tcb_final)

    return {
        "tcb_forehead": tcb_forehead,
        "tcb_sternum": tcb_sternum,
        "tcb_final": tcb_final,
        "risk": risk,
    }


def predict_jaundice_from_image(image_path: str | Path) -> Dict[str, float | str]:
    """
    Predict jaundice directly from image using final optimized model.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dictionary containing prediction results
    """
    if FINAL_MODEL_AVAILABLE:
        try:
            result = predict_jaundice_final(image_path)
            # Convert to consistent format
            return {
                "predicted_class": result["predicted_class"],
                "jaundice_probability": result["jaundice_probability"],
                "normal_probability": result["normal_probability"],
                "confidence": result["confidence"],
                "risk_level": result["risk_level"],
                "yellow_tint_score": result["yellow_tint_score"],
                "model_type": "final_optimized",
                "threshold_used": result.get("threshold_used", 0.20),
                "success": True
            }
        except Exception as e:
            logger.error(f"Error in final model prediction: {e}")
            return {
                "success": False,
                "error": str(e),
                "model_type": "final_optimized"
            }
    else:
        # Fallback to feature-based prediction
        logger.warning("Final model not available, using feature-based prediction")
        return {
            "success": False,
            "error": "Final optimized model not available. Please use feature-based prediction.",
            "model_type": "fallback"
        }


def get_model_status() -> Dict:
    """Get status of available models."""
    return {
        "final_model_available": FINAL_MODEL_AVAILABLE,
        "original_model_available": MODEL_F_PATH.exists() and MODEL_S_PATH.exists(),
        "recommended_model": "final_optimized" if FINAL_MODEL_AVAILABLE else "original"
    }
