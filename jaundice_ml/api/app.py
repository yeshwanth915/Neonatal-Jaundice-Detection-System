"""FastAPI inference service for neonatal jaundice classification - Updated with high-epoch (1000) model."""
from __future__ import annotations

import io
import logging
import sys
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import high-epoch model first (highest priority)
try:
    from model.high_epoch_predict import predict_jaundice_high_epoch, get_high_epoch_model_info
    HIGH_EPOCH_MODEL_AVAILABLE = True
    MODEL_TYPE = "high_epoch_1000"
    logging.info("✅ High-epoch (1000) model loaded successfully!")
except ImportError:
    HIGH_EPOCH_MODEL_AVAILABLE = False
    MODEL_TYPE = "fallback"
    logging.warning("⚠️ High-epoch model not available, trying final optimized model...")
    
    # Try final optimized model
    try:
        from model.final_predict import predict_jaundice_final, get_final_predictor
        FINAL_MODEL_AVAILABLE = True
        MODEL_TYPE = "final_optimized"
        logging.info("✅ Final optimized model loaded!")
    except ImportError:
        FINAL_MODEL_AVAILABLE = False
        MODEL_TYPE = "original"
        logging.warning("⚠️ Final model not available, using original model...")
        # Fallback to original model
        from model.classifier import (
            ClassifierNotReadyError,
            classification_threshold,
            load_metadata,
        load_or_train_classifier,
        predict_jaundice_probability,
    )
    from preprocessing.quality_check import THRESHOLDS, assess_image_quality_with_metrics
    from preprocessing.yellow_detection import detect_yellow_tint, get_jaundice_indication

LOGGER = logging.getLogger(__name__)
app = FastAPI(title="Neonatal Jaundice Classification API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint with model information."""
    try:
        if HIGH_EPOCH_MODEL_AVAILABLE:
            # High-epoch model health check
            model_info = get_high_epoch_model_info()
            return {
                "status": "healthy",
                "service": "Neonatal Jaundice Classification API",
                "version": "2.1.0",
                "model_type": MODEL_TYPE,
                "model_name": model_info.get("model_type", "high_epoch_ensemble"),
                "classifier_ready": True,
                "epochs": model_info.get("epochs", 1000),
                "test_accuracy": model_info.get("test_accuracy"),
                "test_auc": model_info.get("test_auc"),
                "cv_auc_mean": model_info.get("cv_auc_mean"),
                "training_samples": model_info.get("n_samples"),
                "feature_count": model_info.get("n_features"),
                "threshold_used": 0.20,  # Optimized threshold
                "model_components": model_info.get("model_components", {}),
                "ensemble_weights": model_info.get("ensemble_weights", []),
                "training_time_seconds": model_info.get("training_time_seconds"),
                "note": "High-epoch model with 1000 estimators - superior pattern learning"
            }
        elif FINAL_MODEL_AVAILABLE:
            # Final optimized model health check
            model_info = get_final_predictor().get_model_info()
            return {
                "status": "healthy",
                "service": "Neonatal Jaundice Classification API",
                "version": "2.1.0",
                "model_type": MODEL_TYPE,
                "model_name": model_info.get("model_type", "unknown"),
                "classifier_ready": True,
                "accuracy": model_info.get("metrics", {}).get("accuracy"),
                "auc": model_info.get("metrics", {}).get("auc"),
                "training_samples": model_info.get("training_samples"),
                "feature_count": model_info.get("feature_count"),
                "threshold_used": 0.20,  # Optimized threshold
            }
        else:
            # Original model health check
            load_or_train_classifier()
            meta = load_metadata()
            return {
                "status": "healthy",
                "service": "Neonatal Jaundice Classification API",
                "version": "2.1.0",
                "model_type": MODEL_TYPE,
                "model_name": meta.get("model_name"),
                "classifier_ready": True,
                "classification_threshold": meta.get("threshold"),
                "dataset_normal_images": meta.get("normal_count"),
                "dataset_jaundice_images": meta.get("jaundice_count"),
                "validation_auc": meta.get("auc"),
                "validation_f1": meta.get("f1"),
                "validation_recall": meta.get("recall"),
                "validation_precision": meta.get("precision"),
                "validation_accuracy": meta.get("accuracy"),
            }
    except Exception as exc:
        LOGGER.exception("Health check failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "classifier_ready": False,
                "error": str(exc),
                "service": "Neonatal Jaundice Classification API",
                "version": "2.1.0",
                "model_type": MODEL_TYPE,
            },
        )


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Predict jaundice from uploaded image using high-epoch (1000) model with fallback."""
    try:
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Save temporarily for prediction
        temp_path = f"temp_{file.filename}"
        image.save(temp_path)
        
        try:
            if HIGH_EPOCH_MODEL_AVAILABLE:
                # Use yellow tint-based prediction
                result = predict_jaundice_high_epoch(temp_path)
                
                return {
                    "prediction_label": result["predicted_class"],
                    "jaundice_probability": round(result["jaundice_probability"], 4),
                    "normal_probability": round(result["normal_probability"], 4),
                    "classification_threshold": result["threshold_used"],
                    "risk": result["risk_level"],
                    "confidence": f"{result['confidence']:.1%}",
                    "yellow_tint_score": round(result["yellow_tint_score"], 4),
                    "yellow_tint_percentage": round(result["yellow_tint_percentage"], 2),
                    "yellow_pixels": result["yellow_pixels"],
                    "total_pixels": result["total_pixels"],
                    "model_type": result["model_type"],
                    "detection_method": result["detection_method"],
                    "success": True,
                    "note": result["note"]
                }
            elif FINAL_MODEL_AVAILABLE:
                # Use final optimized model
                result = predict_jaundice_final(temp_path)
                
                return {
                    "prediction_label": result["predicted_class"],
                    "jaundice_probability": round(result["jaundice_probability"], 4),
                    "normal_probability": round(result["normal_probability"], 4),
                    "classification_threshold": 0.20,  # Optimized threshold
                    "risk": result["risk_level"],
                    "confidence": f"{result['confidence']:.1%}",
                    "yellow_tint_score": round(result["yellow_tint_score"], 4),
                    "model_type": MODEL_TYPE,
                    "success": True,
                    "note": None,
                }
            else:
                # Fallback to original model
                image_np = np.array(image)
                
                quality_ok, reason, quality_metrics = assess_image_quality_with_metrics(image_np)
                quality_score = quality_metrics.score(THRESHOLDS)
                if not quality_ok:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": "Image quality insufficient",
                            "reason": reason,
                            "quality_score": round(float(quality_score), 4),
                            "model_type": MODEL_TYPE,
                        },
                    )

                jaundice_probability = predict_jaundice_probability(image_np)
                normal_probability = 1.0 - jaundice_probability
                threshold = classification_threshold()

                yellow_score = detect_yellow_tint(image_np)
                yellow_indication, yellow_description = get_jaundice_indication(yellow_score)

                risk = probability_to_risk(jaundice_probability)
                confidence = probability_to_confidence(jaundice_probability, quality_score)
                prediction_label = "Jaundice" if jaundice_probability >= threshold else "Normal"

                note_parts = []
                if risk != probability_to_risk(jaundice_probability):
                    note_parts.append("Yellow tint analysis raised severity above model baseline.")
                if confidence == "Low":
                    note_parts.append("Prediction confidence is low. Retake in even natural lighting.")
                note = " ".join(note_parts).strip()

                return {
                    "prediction_label": prediction_label,
                    "jaundice_probability": round(jaundice_probability, 4),
                    "normal_probability": round(normal_probability, 4),
                    "classification_threshold": round(float(threshold), 4),
                    "risk": risk,
                    "confidence": confidence,
                    "quality_score": round(float(quality_score), 4),
                    "yellow_tint_score": round(float(yellow_score), 4),
                    "yellow_tint_percentage": round(float(yellow_score * 100), 2),  # Convert to percentage
                    "yellow_indication": yellow_indication,
                    "yellow_description": yellow_description,
                    "model_type": MODEL_TYPE,
                    "detection_method": "HSV Analysis",
                    "note": note or None,
                }
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as exc:
        LOGGER.exception("Prediction failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid image or processing error.") from exc


# Helper functions for original model fallback
def probability_to_risk(probability: float) -> str:
    if probability < 0.35:
        return "Normal"
    if probability < 0.60:
        return "Monitor"
    if probability < 0.80:
        return "Serum Test Needed"
    return "Urgent Referral"


def probability_to_confidence(probability: float, quality_score: float) -> str:
    margin = abs(probability - 0.5)
    if margin >= 0.35:
        conf = "High"
    elif margin >= 0.20:
        conf = "Medium"
    else:
        conf = "Low"

    if quality_score < 0.25:
        return "Low"
    if quality_score < 0.5 and conf == "High":
        return "Medium"
    return conf
