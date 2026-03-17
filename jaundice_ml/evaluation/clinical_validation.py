"""Clinical validation utilities for TcB regression models."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from scipy.stats import pearsonr


@dataclass(frozen=True)
class ValidationReport:
    pearson_r: float
    rmse: float
    bias: float
    sample_count: int

    def to_dict(self) -> dict:
        return {
            "pearson_r": self.pearson_r,
            "rmse": self.rmse,
            "bias": self.bias,
            "sample_count": self.sample_count,
        }


def _compute_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def _compute_bias(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(y_pred - y_true))


def validate_predictions(
    predictions_csv: Path,
    tsb_column: str = "tsb",
    skin_tone_column: Optional[str] = None,
    lighting_column: Optional[str] = None,
    output_csv: Optional[Path] = None,
) -> ValidationReport:
    """Run TcB vs TSB validation from a CSV containing predictions and reference TSB."""

    df = pd.read_csv(predictions_csv)
    required_cols = {"tcb_final", tsb_column}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in predictions CSV: {missing}")

    y_pred = df["tcb_final"].to_numpy(dtype=np.float32)
    y_true = df[tsb_column].to_numpy(dtype=np.float32)

    pearson_r = float(pearsonr(y_true, y_pred)[0])
    rmse = _compute_rmse(y_true, y_pred)
    bias = _compute_bias(y_true, y_pred)

    if skin_tone_column and skin_tone_column in df.columns:
        _write_group_bias_report(df, skin_tone_column, y_true, y_pred, predictions_csv, suffix="skin")
    if lighting_column and lighting_column in df.columns:
        _write_group_bias_report(df, lighting_column, y_true, y_pred, predictions_csv, suffix="lighting")

    report = ValidationReport(pearson_r=pearson_r, rmse=rmse, bias=bias, sample_count=len(df))

    if output_csv:
        pd.DataFrame([report.to_dict()]).to_csv(output_csv, index=False)

    return report


def _write_group_bias_report(
    df: pd.DataFrame,
    grouping_column: str,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    predictions_csv: Path,
    suffix: str,
) -> None:
    groups = df[grouping_column]
    records = []
    for group_name, mask in df.groupby(grouping_column).groups.items():
        indices = np.array(list(mask))
        group_true = y_true[indices]
        group_pred = y_pred[indices]
        if len(group_true) < 3:
            continue
        record = {
            grouping_column: group_name,
            "sample_count": len(group_true),
            "rmse": _compute_rmse(group_true, group_pred),
            "bias": _compute_bias(group_true, group_pred),
        }
        records.append(record)

    if records:
        output_path = predictions_csv.with_name(f"validation_bias_{suffix}.csv")
        pd.DataFrame(records).to_csv(output_path, index=False)
