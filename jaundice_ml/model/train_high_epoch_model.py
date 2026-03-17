"""High-epoch (1000) scikit-learn model for jaundice detection with deeper pattern learning."""
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
HIGH_EPOCH_MODEL_PATH = MODEL_DIR / "high_epoch_sklearn_model.joblib"
HIGH_EPOCH_META_PATH = MODEL_DIR / "high_epoch_sklearn_meta.json"
DATASET_ROOT = Path(__file__).resolve().parents[2] / "Dataset"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def extract_features(image_path: Path) -> np.ndarray:
    """Extract comprehensive features from image."""
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


def load_dataset(data_root: Path) -> Tuple[np.ndarray, np.ndarray]:
    """Load and prepare dataset."""
    features = []
    labels = []
    
    class_dirs = {
        "normal": 0,
        "jaundice": 1
    }
    
    for class_name, label in class_dirs.items():
        class_dir = data_root / class_name
        if not class_dir.exists():
            logger.warning(f"Class directory {class_dir} not found, skipping")
            continue
        
        image_files = []
        for ext in ALLOWED_EXT:
            image_files.extend(class_dir.glob(f"*{ext}"))
            image_files.extend(class_dir.glob(f"*{ext.upper()}"))
        
        logger.info(f"Loading {len(image_files)} images from {class_name}")
        
        for img_path in image_files:
            try:
                feat = extract_features(img_path)
                features.append(feat)
                labels.append(label)
            except Exception as e:
                logger.warning(f"Failed to process {img_path}: {e}")
    
    if not features:
        raise ValueError("No valid images found in dataset")
    
    return np.array(features), np.array(labels)


def create_high_epoch_model() -> VotingClassifier:
    """Create ensemble model with 1000 epochs (estimators) for deeper learning."""
    
    # Random Forest with 1000 estimators
    rf = RandomForestClassifier(
        n_estimators=1000,  # Increased from 300 to 1000
        max_depth=20,  # Increased depth for better pattern learning
        min_samples_split=3,  # Reduced for finer patterns
        min_samples_leaf=1,   # Reduced for finer patterns
        max_features='sqrt',
        bootstrap=True,
        random_state=42,
        n_jobs=-1
    )
    
    # XGBoost with 1000 estimators
    xgb = XGBClassifier(
        n_estimators=1000,  # Increased from 500 to 1000
        max_depth=8,  # Increased depth
        learning_rate=0.03,  # Reduced learning rate for better convergence
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
        reg_alpha=0.1,  # L1 regularization
        reg_lambda=0.1,  # L2 regularization
    )
    
    # Gradient Boosting with 1000 estimators
    gb = GradientBoostingClassifier(
        n_estimators=1000,  # Increased from 300 to 1000
        learning_rate=0.03,  # Reduced learning rate
        max_depth=8,  # Increased depth
        min_samples_split=3,  # Reduced for finer patterns
        min_samples_leaf=1,   # Reduced for finer patterns
        max_features='sqrt',
        random_state=42,
        subsample=0.9
    )
    
    # SVM with RBF kernel
    svm = SVC(
        probability=True,
        random_state=42,
        C=10.0,  # Increased C for better pattern learning
        gamma='scale',
        kernel='rbf'
    )
    
    # Create voting ensemble
    ensemble = VotingClassifier(
        estimators=[
            ('rf', rf),
            ('xgb', xgb),
            ('gb', gb),
            ('svm', svm)
        ],
        voting='soft',
        weights=[2, 3, 2, 1]  # Give more weight to XGBoost
    )
    
    return ensemble


def evaluate_model(model, X_test, y_test, scaler):
    """Evaluate model performance."""
    # Scale test data
    X_test_scaled = scaler.transform(X_test)
    
    # Make predictions
    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)
    
    # Detailed classification report
    report = classification_report(y_test, y_pred, target_names=['Normal', 'Jaundice'])
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    
    return {
        'accuracy': accuracy,
        'auc': auc,
        'classification_report': report,
        'confusion_matrix': cm.tolist(),
        'predictions': y_pred.tolist(),
        'probabilities': y_proba.tolist()
    }


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description="Train high-epoch (1000) jaundice detection model")
    parser.add_argument("--epochs", type=int, default=1000, help="Number of estimators (epochs)")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test set size")
    parser.add_argument("--cv-folds", type=int, default=5, help="Cross-validation folds")
    args = parser.parse_args()
    
    logger.info("Starting high-epoch (1000) model training for jaundice detection")
    logger.info(f"Using {args.epochs} estimators for deeper pattern learning")
    
    try:
        # Load dataset
        logger.info("Loading dataset...")
        X, y = load_dataset(DATASET_ROOT)
        logger.info(f"Loaded {len(X)} samples with {X.shape[1]} features")
        
        # Split dataset
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=args.test_size, random_state=42, stratify=y
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        
        # Create model with high epochs
        logger.info("Creating high-epoch ensemble model...")
        model = create_high_epoch_model()
        
        # Perform cross-validation
        logger.info("Performing cross-validation...")
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=args.cv_folds, scoring='roc_auc')
        logger.info(f"Cross-validation AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # Train model
        logger.info(f"Training model with {args.epochs} estimators...")
        start_time = datetime.now()
        model.fit(X_train_scaled, y_train)
        training_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Training completed in {training_time:.2f} seconds")
        
        # Evaluate model
        logger.info("Evaluating model...")
        results = evaluate_model(model, X_test, y_test, scaler)
        
        # Print results
        logger.info(f"Test Accuracy: {results['accuracy']:.4f}")
        logger.info(f"Test AUC: {results['auc']:.4f}")
        logger.info("\nClassification Report:")
        logger.info(results['classification_report'])
        logger.info(f"Confusion Matrix:\n{results['confusion_matrix']}")
        
        # Save model and metadata
        logger.info("Saving model and metadata...")
        joblib.dump({
            'model': model,
            'scaler': scaler,
            'feature_names': [f'feature_{i}' for i in range(X.shape[1])]
        }, HIGH_EPOCH_MODEL_PATH)
        
        # Prepare metadata
        metadata = {
            'model_type': 'high_epoch_ensemble',
            'training_date': datetime.now().isoformat(),
            'epochs': args.epochs,
            'n_features': X.shape[1],
            'n_samples': len(X),
            'test_size': args.test_size,
            'cv_folds': args.cv_folds,
            'cv_auc_mean': cv_scores.mean(),
            'cv_auc_std': cv_scores.std(),
            'test_accuracy': results['accuracy'],
            'test_auc': results['auc'],
            'training_time_seconds': training_time,
            'model_components': {
                'random_forest': {'n_estimators': 1000, 'max_depth': 20},
                'xgboost': {'n_estimators': 1000, 'max_depth': 8, 'learning_rate': 0.03},
                'gradient_boosting': {'n_estimators': 1000, 'max_depth': 8, 'learning_rate': 0.03},
                'svm': {'C': 10.0, 'kernel': 'rbf'}
            },
            'ensemble_weights': [2, 3, 2, 1],
            'dataset_info': {
                'normal_samples': int(np.sum(y == 0)),
                'jaundice_samples': int(np.sum(y == 1)),
                'feature_extraction': 'comprehensive_color_texture_histogram'
            }
        }
        
        with open(HIGH_EPOCH_META_PATH, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {HIGH_EPOCH_MODEL_PATH}")
        logger.info(f"Metadata saved to {HIGH_EPOCH_META_PATH}")
        logger.info("✅ High-epoch model training completed successfully!")
        
        # Print summary
        logger.info("\n" + "="*50)
        logger.info("HIGH-EPOCH MODEL TRAINING SUMMARY")
        logger.info("="*50)
        logger.info(f"✅ Epochs (Estimators): {args.epochs}")
        logger.info(f"✅ Cross-Validation AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        logger.info(f"✅ Test Accuracy: {results['accuracy']:.4f}")
        logger.info(f"✅ Test AUC: {results['auc']:.4f}")
        logger.info(f"✅ Training Time: {training_time:.2f} seconds")
        logger.info(f"✅ Model saved: {HIGH_EPOCH_MODEL_PATH}")
        logger.info("="*50)
        
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise


if __name__ == "__main__":
    main()
