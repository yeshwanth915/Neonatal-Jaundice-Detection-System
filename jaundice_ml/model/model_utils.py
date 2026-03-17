"""Shared utilities for TcB regression training and inference."""
from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
FEATURES_PATH = PROCESSED_DIR / "extracted_features.csv"
LABELS_PATH = PROCESSED_DIR / "tcb_labels.csv"


def load_training_dataframe(
    features_path: Path = FEATURES_PATH, labels_path: Path = LABELS_PATH
) -> pd.DataFrame:
    """Load and merge feature/label data on image_id."""
    if not features_path.exists():
        raise FileNotFoundError(f"Missing extracted features file: {features_path}")
    if not labels_path.exists():
        raise FileNotFoundError(f"Missing TcB labels file: {labels_path}")

    features_df = pd.read_csv(features_path)
    labels_df = pd.read_csv(labels_path)

    merged = features_df.merge(labels_df, on="image_id", how="inner", validate="one_to_one")
    merged = merged.dropna(subset=["tcb_f", "tcb_s"])
    if merged.empty:
        raise ValueError("Merged dataframe is empty after dropping missing TcB labels.")
    return merged


def get_feature_columns(df: pd.DataFrame) -> List[str]:
    """Return ordered list of feature columns excluding identifiers and labels."""
    excluded = {"image_id", "tcb_f", "tcb_s"}
    return [col for col in df.columns if col not in excluded]


def split_features_targets(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Split merged dataframe into design matrix and TcB targets."""
    feature_cols = get_feature_columns(df)
    X = df[feature_cols]
    y_f = df["tcb_f"]
    y_s = df["tcb_s"]
    return X, y_f, y_s
