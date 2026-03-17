"""Evaluation utilities for TcB regression models."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


@dataclass(frozen=True)
class RegressionMetrics:
    """Container for common regression metrics."""

    mae: float
    rmse: float
    r2: float

    def as_dict(self) -> Dict[str, float]:
        return {"mae": self.mae, "rmse": self.rmse, "r2": self.r2}


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> RegressionMetrics:
    """Compute MAE, RMSE, and R² for predictions."""
    mae = float(mean_absolute_error(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true, y_pred))
    return RegressionMetrics(mae=mae, rmse=rmse, r2=r2)
