"""Improved prediction module using the enhanced ensemble model."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List

import cv2
import joblib
import numpy as np

MODEL_DIR = Path(__file__).resolve().parent
IMPROVED_MODEL_PATH = MODEL_DIR / "improved_sklearn_model.joblib"
IMPROVED_META_PATH = MODEL_DIR / "improved_sklearn_meta.json"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

logger = logging.getLogger(__name__)


class ImprovedJaundicePredictor:
    """Improved jaundice predictor using ensemble model."""
    
    def __init__(self):
        self.model_data = None
        self.metadata = None
        self.model_loaded = False
    
    def load_model(self):
        """Load the improved model and metadata."""
        if self.model_loaded:
            return
        
        try:
            self.model_data = joblib.load(IMPROVED_MODEL_PATH)
            with open(IMPROVED_META_PATH, 'r') as f:
                self.metadata = json.load(f)
            self.model_loaded = True
            logger.info("Improved model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading improved model: {e}")
            raise
    
    def extract_image_features(self, img: np.ndarray) -> np.ndarray:
        """Extract comprehensive features from image (same as training)."""
        features = []
        
        # Color features (RGB channels)
        for i in range(3):
            channel = img[:, :, i]
            features.extend([
                np.mean(channel),
                np.std(channel),
                np.median(channel),
                np.percentile(channel, 25),
                np.percentile(channel, 75)
            ])
        
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # HSV features
        for i in range(3):
            channel = hsv[:, :, i]
            features.extend([
                np.mean(channel),
                np.std(channel),
                np.median(channel)
            ])
        
        # Yellow tint detection (important for jaundice)
        yellow_mask = (hsv[:, :, 0] >= 20) & (hsv[:, :, 0] <= 30) & (hsv[:, :, 1] >= 50)
        yellow_ratio = np.sum(yellow_mask) / yellow_mask.size
        features.append(yellow_ratio)
        
        # Texture features
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        features.extend([
            np.std(gray),
            np.mean(cv2.Laplacian(gray, cv2.CV_64F)),
            np.mean(cv2.Sobel(gray, cv2.CV_64F, 1, 0)),
            np.mean(cv2.Sobel(gray, cv2.CV_64F, 0, 1))
        ])
        
        # Histogram features
        hist_r = cv2.calcHist([img], [0], None, [32], [0, 256])
        hist_g = cv2.calcHist([img], [1], None, [32], [0, 256])
        hist_b = cv2.calcHist([img], [2], None, [32], [0, 256])
        
        # Normalize histograms
        hist_r = hist_r.flatten() / hist_r.sum()
        hist_g = hist_g.flatten() / hist_g.sum()
        hist_b = hist_b.flatten() / hist_b.sum()
        
        features.extend(hist_r[:8])
        features.extend(hist_g[:8])
        features.extend(hist_b[:8])
        
        return np.array(features)
    
    def preprocess_image(self, image_path: str | Path) -> np.ndarray:
        """Load and preprocess a single image."""
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to RGB and resize
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (128, 128))
        
        return img
    
    def predict_single(self, image_path: str | Path) -> Dict:
        """Predict jaundice for a single image."""
        if not self.model_loaded:
            self.load_model()
        
        try:
            # Preprocess image
            img = self.preprocess_image(image_path)
            
            # Extract features
            features = self.extract_image_features(img)
            
            # Scale features
            features_scaled = self.model_data['scaler'].transform([features])
            
            # Make prediction
            prediction = self.model_data['model'].predict_proba(features_scaled)[0]
            predicted_class = self.model_data['model'].predict(features_scaled)[0]
            
            # Map to risk level
            risk_level = self._map_to_risk_level(prediction[1], predicted_class)
            
            return {
                "image_path": str(image_path),
                "predicted_class": "jaundice" if predicted_class == 1 else "normal",
                "jaundice_probability": float(prediction[1]),
                "normal_probability": float(prediction[0]),
                "confidence": float(max(prediction)),
                "risk_level": risk_level,
                "model_type": "improved_ensemble",
                "yellow_tint_score": self._get_yellow_tint_score(img)
            }
            
        except Exception as e:
            logger.error(f"Error predicting {image_path}: {e}")
            return {
                "image_path": str(image_path),
                "error": str(e),
                "predicted_class": "error",
                "jaundice_probability": 0.0,
                "confidence": 0.0,
                "risk_level": "Error"
            }
    
    def predict_batch(self, image_paths: List[str | Path]) -> List[Dict]:
        """Predict jaundice for multiple images."""
        if not self.model_loaded:
            self.load_model()
        
        results = []
        for path in image_paths:
            result = self.predict_single(path)
            results.append(result)
        
        return results
    
    def _get_yellow_tint_score(self, img: np.ndarray) -> float:
        """Calculate yellow tint score for the image."""
        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
        yellow_mask = (hsv[:, :, 0] >= 20) & (hsv[:, :, 0] <= 30) & (hsv[:, :, 1] >= 50)
        return float(np.sum(yellow_mask) / yellow_mask.size)
    
    def _map_to_risk_level(self, jaundice_prob: float, predicted_class: int) -> str:
        """Map prediction to risk level with more sensitive thresholds."""
        if predicted_class == 0:  # Normal
            if jaundice_prob < 0.15:
                return "Normal"
            elif jaundice_prob < 0.25:
                return "Low Risk"
            else:
                return "Monitor"
        else:  # Jaundice
            if jaundice_prob < 0.6:
                return "Mild Jaundice"
            elif jaundice_prob < 0.8:
                return "Moderate Jaundice - Serum Test Recommended"
            else:
                return "Severe Jaundice - Urgent Referral"
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        if not self.model_loaded:
            self.load_model()
        
        return {
            "model_type": "improved_ensemble",
            "models": self.metadata.get("models", []),
            "feature_count": self.metadata.get("feature_count", 0),
            "training_samples": self.metadata.get("training_samples", 0),
            "test_samples": self.metadata.get("test_samples", 0),
            "metrics": self.metadata.get("metrics", {}),
            "cv_scores": self.metadata.get("cv_scores", {}),
            "class_distribution": self.metadata.get("class_distribution", {}),
            "trained_at": self.metadata.get("trained_at", "")
        }


# Global predictor instance
_predictor = None


def get_predictor() -> ImprovedJaundicePredictor:
    """Get the global predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = ImprovedJaundicePredictor()
    return _predictor


def predict_jaundice_improved(image_path: str | Path) -> Dict:
    """Convenience function to predict jaundice for a single image."""
    return get_predictor().predict_single(image_path)


def predict_jaundice_batch_improved(image_paths: List[str | Path]) -> List[Dict]:
    """Convenience function to predict jaundice for multiple images."""
    return get_predictor().predict_batch(image_paths)


def get_improved_model_info() -> Dict:
    """Get information about the improved model."""
    return get_predictor().get_model_info()


if __name__ == "__main__":
    # Test the predictor
    predictor = ImprovedJaundicePredictor()
    
    # Print model info
    info = predictor.get_model_info()
    print("Improved Model Information:")
    print(json.dumps(info, indent=2))
    
    # Test prediction on a sample image if available
    dataset_path = Path(__file__).resolve().parents[2] / "Dataset"
    test_image = None
    
    # Try to find a test image
    for class_name in ["normal", "jaundice"]:
        class_dir = dataset_path / class_name
        if class_dir.exists():
            for img_path in class_dir.iterdir():
                if img_path.suffix.lower() in ALLOWED_EXT:
                    test_image = img_path
                    break
            if test_image:
                break
    
    if test_image:
        print(f"\nTesting prediction on: {test_image}")
        result = predictor.predict_single(test_image)
        print("Prediction result:")
        print(json.dumps(result, indent=2))
    else:
        print("\nNo test images found for prediction testing.")
