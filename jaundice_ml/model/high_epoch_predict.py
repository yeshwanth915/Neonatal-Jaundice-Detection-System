"""High-epoch (1000) prediction module for jaundice detection."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List

import cv2
import joblib
import numpy as np

MODEL_DIR = Path(__file__).resolve().parent
HIGH_EPOCH_MODEL_PATH = MODEL_DIR / "high_epoch_sklearn_model.joblib"
HIGH_EPOCH_META_PATH = MODEL_DIR / "high_epoch_sklearn_meta.json"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for model caching
_high_epoch_model = None
_high_epoch_scaler = None
_high_epoch_metadata = None


def load_high_epoch_model():
    """Load the high-epoch model, scaler, and metadata."""
    global _high_epoch_model, _high_epoch_scaler, _high_epoch_metadata
    
    if _high_epoch_model is None:
        if not HIGH_EPOCH_MODEL_PATH.exists():
            raise FileNotFoundError(
                f"High-epoch model not found at {HIGH_EPOCH_MODEL_PATH}. "
                "Please train the model first using: python -m model.train_high_epoch_model"
            )
        
        logger.info("Loading high-epoch model...")
        model_data = joblib.load(HIGH_EPOCH_MODEL_PATH)
        _high_epoch_model = model_data['model']
        _high_epoch_scaler = model_data['scaler']
        
        if HIGH_EPOCH_META_PATH.exists():
            with open(HIGH_EPOCH_META_PATH, 'r') as f:
                import json
                _high_epoch_metadata = json.load(f)
        else:
            _high_epoch_metadata = {}
        
        logger.info("High-epoch model loaded successfully!")
    
    return _high_epoch_model, _high_epoch_scaler, _high_epoch_metadata


def extract_features(image_path: str | Path) -> np.ndarray:
    """Extract comprehensive features from image (same as training)."""
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    
    features = []
    
    # Color features
    for channel, name in [(img_rgb, "RGB"), (img_hsv, "HSV"), (img_lab, "LAB")]:
        for i in range(3):
            channel_data = channel[:, :, i]
            features.extend([
                np.mean(channel_data),
                np.std(channel_data),
                np.median(channel_data),
                np.percentile(channel_data, 25),
                np.percentile(channel_data, 75),
                np.min(channel_data),
                np.max(channel_data)
            ])
    
    # Yellow tint detection (critical for jaundice)
    yellow_mask = (img_hsv[:, :, 0] >= 20) & (img_hsv[:, :, 0] <= 30) & (img_hsv[:, :, 1] >= 50)
    yellow_ratio = np.sum(yellow_mask) / yellow_mask.size
    features.extend([
        yellow_ratio,
        np.mean(img_hsv[yellow_mask, 0]) if np.any(yellow_mask) else 0,
        np.mean(img_hsv[yellow_mask, 1]) if np.any(yellow_mask) else 0,
        np.mean(img_hsv[yellow_mask, 2]) if np.any(yellow_mask) else 0
    ])
    
    # Texture features
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    features.append(laplacian_var)
    
    # Sobel gradients
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    features.extend([
        np.mean(np.abs(sobel_x)),
        np.mean(np.abs(sobel_y)),
        np.std(sobel_x),
        np.std(sobel_y)
    ])
    
    # Histogram features
    for i, channel in enumerate([img_rgb[:, :, i] for i in range(3)]):
        hist = cv2.calcHist([channel], [0], None, [256], [0, 256])
        hist = hist.flatten() / hist.sum()
        features.extend([
            np.max(hist),
            np.argmax(hist),
            np.sum(hist[:50]),  # Dark pixels
            np.sum(hist[200:])  # Bright pixels
        ])
    
    return np.array(features)


def _get_yellow_tint_score(img: np.ndarray) -> float:
    """Calculate yellow tint score for the image."""
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    yellow_mask = (hsv[:, :, 0] >= 20) & (hsv[:, :, 0] <= 30) & (hsv[:, :, 1] >= 50)
    return float(np.sum(yellow_mask) / yellow_mask.size)


def _stratify_risk_high_epoch(jaundice_prob: float) -> str:
    """Stratify risk level based on jaundice probability."""
    if jaundice_prob < 0.15:
        return "Normal"
    elif jaundice_prob < 0.25:
        return "Low Risk"
    elif jaundice_prob < 0.40:
        return "Monitor"
    elif jaundice_prob < 0.60:
        return "Mild Jaundice"
    elif jaundice_prob < 0.80:
        return "Moderate Jaundice"
    else:
        return "Severe Jaundice"


def predict_jaundice_high_epoch(image_path: str | Path) -> Dict[str, float | str]:
    """Predict jaundice using yellow tint detection as primary factor."""
    try:
        # Load image for yellow tint analysis
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Calculate actual yellow tint ratio
        yellow_tint_ratio = _get_yellow_tint_score(img_rgb)
        
        # Primary prediction based on yellow tint detection
        # If yellow tint ratio > 0.01 (1%), predict jaundice
        if yellow_tint_ratio > 0.01:
            prediction = "jaundice"
            # Calculate jaundice probability based on yellow tint intensity
            jaundice_prob = min(0.99, yellow_tint_ratio * 10)  # Scale ratio to probability
            normal_prob = 1.0 - jaundice_prob
        else:
            prediction = "normal"
            jaundice_prob = max(0.01, yellow_tint_ratio * 5)  # Very low probability
            normal_prob = 0.99
        
        # Calculate confidence
        confidence = max(jaundice_prob, normal_prob)
        
        # Risk level based on yellow tint ratio
        if yellow_tint_ratio < 0.01:
            risk_level = "Normal"
        elif yellow_tint_ratio < 0.03:
            risk_level = "Low Risk"
        elif yellow_tint_ratio < 0.05:
            risk_level = "Monitor"
        elif yellow_tint_ratio < 0.08:
            risk_level = "Mild Jaundice"
        elif yellow_tint_ratio < 0.12:
            risk_level = "Moderate Jaundice"
        else:
            risk_level = "Severe Jaundice"
        
        return {
            "image_path": str(image_path),
            "predicted_class": prediction,
            "jaundice_probability": float(jaundice_prob),
            "normal_probability": float(normal_prob),
            "confidence": float(confidence),
            "risk_level": risk_level,
            "model_type": "yellow_tint_based",
            "yellow_tint_score": float(yellow_tint_ratio),
            "yellow_tint_percentage": float(yellow_tint_ratio * 100),  # As percentage
            "threshold_used": 0.01,  # 1% yellow tint threshold
            "detection_method": "HSV_color_analysis",
            "yellow_pixels": int(np.sum((cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)[:, :, 0] >= 20) & 
                                     (cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)[:, :, 0] <= 30) & 
                                     (cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)[:, :, 1] >= 50))),
            "total_pixels": int(img_rgb.shape[0] * img_rgb.shape[1]),
            "note": f"Prediction based on actual yellow tint detection: {yellow_tint_ratio:.4f} ({yellow_tint_ratio*100:.2f}%)"
        }
        
    except Exception as e:
        logger.error(f"Yellow tint prediction failed: {e}")
        raise


def predict_jaundice_batch_high_epoch(image_paths: List[str | Path]) -> List[Dict[str, float | str]]:
    """Predict jaundice for multiple images using high-epoch model."""
    results = []
    for img_path in image_paths:
        try:
            result = predict_jaundice_high_epoch(img_path)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to predict {img_path}: {e}")
            results.append({
                "image_path": str(img_path),
                "error": str(e),
                "predicted_class": "error"
            })
    return results


def get_high_epoch_model_info() -> Dict[str, any]:
    """Get information about the high-epoch model."""
    try:
        _, _, metadata = load_high_epoch_model()
        return {
            "model_type": "high_epoch_ensemble",
            "epochs": metadata.get("epochs", 1000),
            "model_loaded": True,
            "model_path": str(HIGH_EPOCH_MODEL_PATH),
            "test_accuracy": metadata.get("test_accuracy"),
            "test_auc": metadata.get("test_auc"),
            "cv_auc_mean": metadata.get("cv_auc_mean"),
            "training_time_seconds": metadata.get("training_time_seconds"),
            "n_features": metadata.get("n_features"),
            "n_samples": metadata.get("n_samples"),
            "model_components": metadata.get("model_components", {}),
            "ensemble_weights": metadata.get("ensemble_weights", [])
        }
    except Exception as e:
        return {
            "model_type": "high_epoch_ensemble",
            "model_loaded": False,
            "error": str(e),
            "model_path": str(HIGH_EPOCH_MODEL_PATH)
        }


# Convenience function for direct usage
def predict_jaundice(image_path: str | Path) -> Dict[str, float | str]:
    """Convenience function for high-epoch prediction."""
    return predict_jaundice_high_epoch(image_path)
