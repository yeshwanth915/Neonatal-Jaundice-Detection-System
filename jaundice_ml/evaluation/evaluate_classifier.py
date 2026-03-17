"""Evaluate classifier on Dataset/normal and Dataset/jaundice."""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from model.classifier import classification_threshold, predict_jaundice_probability

DATASET_ROOT = Path(__file__).resolve().parents[2] / "Dataset"
NORMAL_DIR = DATASET_ROOT / "normal"
JAUNDICE_DIR = DATASET_ROOT / "jaundice"
REPORT_DIR = Path(__file__).resolve().parent / "reports"
MISCLASSIFIED_CSV = REPORT_DIR / "misclassified_images.csv"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def iter_images(folder: Path):
    if not folder.exists():
        return []
    return sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_EXT])


def load_rgb(path: Path):
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        return None
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def main() -> None:
    threshold = classification_threshold()
    records: list[dict] = []

    for label_name, folder, true_label in (
        ("normal", NORMAL_DIR, 0),
        ("jaundice", JAUNDICE_DIR, 1),
    ):
        for path in iter_images(folder):
            image = load_rgb(path)
            if image is None:
                continue
            prob = predict_jaundice_probability(image)
            pred = 1 if prob >= threshold else 0
            records.append(
                {
                    "filename": path.name,
                    "folder": label_name,
                    "true_label": true_label,
                    "pred_label": pred,
                    "jaundice_probability": prob,
                }
            )

    if not records:
        raise RuntimeError("No readable images found for evaluation.")

    df = pd.DataFrame(records)
    y_true = df["true_label"].to_numpy(dtype=np.int32)
    y_pred = df["pred_label"].to_numpy(dtype=np.int32)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    report = classification_report(
        y_true,
        y_pred,
        labels=[0, 1],
        target_names=["Normal", "Jaundice"],
        digits=4,
        zero_division=0,
    )

    misclassified = df[df["true_label"] != df["pred_label"]].copy()
    misclassified["true_name"] = np.where(misclassified["true_label"] == 1, "Jaundice", "Normal")
    misclassified["pred_name"] = np.where(misclassified["pred_label"] == 1, "Jaundice", "Normal")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    misclassified.to_csv(MISCLASSIFIED_CSV, index=False)

    logging.basicConfig(level=logging.INFO, format='%(message)s')
    logging.info(f"threshold={threshold:.4f}")
    logging.info(f"samples={len(df)} normal={(y_true == 0).sum()} jaundice={(y_true == 1).sum()}")
    logging.info("confusion_matrix [[TN FP],[FN TP]]:")
    logging.info(cm)
    logging.info("classification_report:")
    logging.info(report)
    logging.info(f"misclassified_count={len(misclassified)}")
    logging.info(f"misclassified_csv={MISCLASSIFIED_CSV}")


if __name__ == "__main__":
    main()
