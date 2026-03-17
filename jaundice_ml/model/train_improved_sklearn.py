"""Improved scikit-learn model for jaundice detection with better hyperparameters."""
from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Tuple

import cv2
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from xgboost import XGBClassifier

MODEL_DIR = Path(__file__).resolve().parent
IMPROVED_MODEL_PATH = MODEL_DIR / "improved_sklearn_model.joblib"
IMPROVED_META_PATH = MODEL_DIR / "improved_sklearn_meta.json"
DATASET_ROOT = Path(__file__).resolve().parents[2] / "Dataset"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_and_preprocess_images(dataset_path: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Load and preprocess images from dataset directory."""
    images = []
    labels = []
    
    # Process normal images
    normal_dir = dataset_path / "normal"
    if normal_dir.exists():
        for img_path in normal_dir.iterdir():
            if img_path.suffix.lower() in ALLOWED_EXT:
                try:
                    # Load and preprocess image
                    img = cv2.imread(str(img_path))
                    if img is not None:
                        # Convert to RGB and resize
                        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                        img = cv2.resize(img, (128, 128))
                        
                        # Extract features
                        features = extract_image_features(img)
                        images.append(features)
                        labels.append(0)  # Normal = 0
                except Exception as e:
                    logger.warning(f"Error processing {img_path}: {e}")
    
    # Process jaundice images
    jaundice_dir = dataset_path / "jaundice"
    if jaundice_dir.exists():
        for img_path in jaundice_dir.iterdir():
            if img_path.suffix.lower() in ALLOWED_EXT:
                try:
                    # Load and preprocess image
                    img = cv2.imread(str(img_path))
                    if img is not None:
                        # Convert to RGB and resize
                        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                        img = cv2.resize(img, (128, 128))
                        
                        # Extract features
                        features = extract_image_features(img)
                        images.append(features)
                        labels.append(1)  # Jaundice = 1
                except Exception as e:
                    logger.warning(f"Error processing {img_path}: {e}")
    
    if not images:
        raise ValueError("No valid images found in the dataset")
    
    return np.array(images), np.array(labels)


def extract_image_features(img: np.ndarray) -> np.ndarray:
    """Extract comprehensive features from image."""
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
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    
    # HSV features
    for i in range(3):
        channel = hsv[:, :, i]
        features.extend([
            np.mean(channel),
            np.std(channel),
            np.median(channel)
        ])
    
    # Yellow tint detection (important for jaundice)
    # High yellow values in HSV space
    yellow_mask = (hsv[:, :, 0] >= 20) & (hsv[:, :, 0] <= 30) & (hsv[:, :, 1] >= 50)
    yellow_ratio = np.sum(yellow_mask) / yellow_mask.size
    features.append(yellow_ratio)
    
    # Texture features using Local Binary Patterns approximation
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # Simple texture features
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
    
    features.extend(hist_r[:8])  # Take first 8 bins from each channel
    features.extend(hist_g[:8])
    features.extend(hist_b[:8])
    
    return np.array(features)


def create_ensemble_model() -> VotingClassifier:
    """Create an ensemble of different classifiers."""
    
    # Random Forest with optimized parameters
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        bootstrap=True,
        random_state=42,
        n_jobs=-1
    )
    
    # XGBoost with optimized parameters
    xgb = XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.5,
        reg_alpha=0.5,
        random_state=42,
        n_jobs=-1,
        eval_metric='logloss'
    )
    
    # Gradient Boosting
    gb = GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42
    )
    
    # SVM with RBF kernel
    svm = SVC(
        probability=True,
        C=10,
        gamma='scale',
        random_state=42
    )
    
    # Create voting ensemble
    ensemble = VotingClassifier(
        estimators=[
            ('rf', rf),
            ('xgb', xgb),
            ('gb', gb),
            ('svm', svm)
        ],
        voting='soft'  # Use probability averaging
    )
    
    return ensemble


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
    """Evaluate model and return metrics."""
    # Make predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # Calculate metrics
    metrics = {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'auc': float(roc_auc_score(y_test, y_prob)),
        'classification_report': classification_report(y_test, y_pred, output_dict=True)
    }
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    metrics['confusion_matrix'] = cm.tolist()
    
    return metrics


def _parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Train improved scikit-learn jaundice classifier.")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--cv-folds", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    """Main training function."""
    args = _parse_args()
    
    logger.info("Starting improved scikit-learn jaundice model training...")
    
    # Check dataset
    if not DATASET_ROOT.exists():
        raise FileNotFoundError(f"Dataset root not found: {DATASET_ROOT}")
    
    # Load and preprocess data
    logger.info("Loading and preprocessing images...")
    X, y = load_and_preprocess_images(DATASET_ROOT)
    logger.info(f"Loaded {len(X)} images with {X.shape[1]} features each")
    logger.info(f"Class distribution - Normal: {np.sum(y == 0)}, Jaundice: {np.sum(y == 1)}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.random_state, stratify=y
    )
    
    # Feature scaling
    logger.info("Applying feature scaling...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Create and train ensemble model
    logger.info("Creating ensemble model...")
    model = create_ensemble_model()
    
    # Cross-validation
    logger.info("Performing cross-validation...")
    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=args.cv_folds, scoring='roc_auc')
    logger.info(f"CV AUC scores: {cv_scores}")
    logger.info(f"Mean CV AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Train final model
    logger.info("Training final model...")
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    logger.info("Evaluating model...")
    metrics = evaluate_model(model, X_test_scaled, y_test)
    
    # Save model and scaler
    logger.info("Saving model and metadata...")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save model and scaler together
    model_data = {
        'model': model,
        'scaler': scaler,
        'feature_names': [f'feature_{i}' for i in range(X.shape[1])]
    }
    joblib.dump(model_data, IMPROVED_MODEL_PATH)
    
    # Prepare metadata
    meta = {
        "model_type": "ensemble_sklearn",
        "models": ["RandomForest", "XGBoost", "GradientBoosting", "SVM"],
        "feature_count": X.shape[1],
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "class_distribution": {
            "normal": int(np.sum(y == 0)),
            "jaundice": int(np.sum(y == 1))
        },
        "metrics": {
            "accuracy": metrics['accuracy'],
            "auc": metrics['auc'],
            "classification_report": metrics['classification_report']
        },
        "cv_scores": {
            "mean_auc": float(cv_scores.mean()),
            "std_auc": float(cv_scores.std()),
            "scores": cv_scores.tolist()
        },
        "training_params": {
            "test_size": args.test_size,
            "random_state": args.random_state,
            "cv_folds": args.cv_folds
        },
        "trained_at": datetime.utcnow().isoformat() + "Z"
    }
    
    with open(IMPROVED_META_PATH, "w") as f:
        json.dump(meta, f, indent=2)
    
    # Print results
    print("\n" + "="*60)
    print("IMPROVED SKLEARN MODEL TRAINING RESULTS")
    print("="*60)
    print(f"Model: Ensemble (RF + XGB + GB + SVM)")
    print(f"Features extracted: {X.shape[1]}")
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Cross-validation AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    print(f"Test Accuracy: {metrics['accuracy']:.4f}")
    print(f"Test AUC: {metrics['auc']:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, model.predict(X_test_scaled), 
                              target_names=['Normal', 'Jaundice']))
    print("="*60)
    
    logger.info("Training completed successfully!")
    logger.info("Model saved to %s", IMPROVED_MODEL_PATH)
    logger.info("Metadata saved to %s", IMPROVED_META_PATH)


if __name__ == "__main__":
    main()
