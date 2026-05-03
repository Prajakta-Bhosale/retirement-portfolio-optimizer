import os
import pickle
from typing import Dict, Tuple, Any
import json
from pathlib import Path

import numpy as np
import warnings

warnings.filterwarnings("ignore")

try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


class ModelManager:
    """Manages all 4 models for predictions."""

    def __init__(self, models_path: str = "./models"):
        """
        Initialize model manager.

        Args:
            models_path: Path where trained models are saved.
        """
        self.models_path = models_path
        self.mpt_model = None
        self.dnn_model = None
        self.rl_model_stocks = None
        self.rl_model_bonds = None
        self.ensemble_ready = False

        self.load_or_create_models()

        # Load model_features.json for prediction features
        self.feature_rows = {}
        try:
            base_dir = Path(__file__).parent
            feat_path = base_dir / "model_features.json"
            with open(feat_path, "r") as f:
                feats = json.load(f)
            self.feature_rows = {row["userid"]: row for row in feats}
            print(f"Loaded {len(self.feature_rows)} feature rows for models.")
        except Exception as e:
            print(f"⚠ Could not load model_features.json, using dashboard_data features only: {e}")

    # ================== LOADING ==================

    def load_or_create_models(self):
        """Load saved models or fall back to demo heuristics."""
        print("Loading models...")
        try:
            self.mpt_model = self._load_pickle("mpt_model.pkl")
            self.dnn_model = self._load_keras("dnn_model.h5")
            self.rl_model_stocks = self._load_pickle("rl_model_stocks.pkl")
            self.rl_model_bonds = self._load_pickle("rl_model_bonds.pkl")
            self.ensemble_ready = True
            print("✓ All models loaded successfully!")
        except FileNotFoundError:
            print("⚠ Models not found. Using DEMO MODE with dummy predictions.")
            print(" To use real models, export from your notebook:")
            print("  - mpt_model (pickle)")
            print("  - dnn_model (Keras .h5)")
            print("  - rl_model_stocks.pkl, rl_model_bonds.pkl")
            self.ensemble_ready = False

    def _load_pickle(self, filename: str):
        path = os.path.join(self.models_path, filename)
        with open(path, "rb") as f:
            return pickle.load(f)

    def _load_keras(self, filename: str):
        if not TF_AVAILABLE:
            return None
        path = os.path.join(self.models_path, filename)
        return tf.keras.models.load_model(path)

    # ================== FEATURE PREPARATION ==================
    def get_feature_row(self, user_data: Dict) -> Dict:
        """
        Return the feature row used for model training for this user.

        If we have a row in model_features.json for this userid, use that.
        Otherwise fall back to the dashboard_data row.
        """
        uid = user_data.get("userid") or user_data.get("useridperson") or None
        if uid and uid in self.feature_rows:
            return self.feature_rows[uid]
        return user_data

    def prepare_features(self, user_data: Dict) -> np.ndarray:
        """
        Build the feature vector for the models.

        If model_features.json is available, we use its columns
        exactly as during training to avoid shape mismatches.
        """
        # Prefer feature row used during training
        feat = self.get_feature_row(user_data)

        # IMPORTANT: match your notebook training order on model_features.json
        feature_keys = [
            "annual_return",
            "daily_returns_mean",
            "daily_returns_std",
            "portfolio_volatility",
            "rolling_volatility_20",
            "ma_20",
            "ma_50",
            "ma_signal",
            "price_vs_ma50",
            "rsi",
            "momentum_20",
            "momentum_50",
            "sharpe_ratio",
            "max_drawdown",
            "annualincome",
            "savingsrate",
            "networth",
            "debtratio",
            "vtiallocation",
            "bndallocation",
            "dbcallocation",
            "heart_rate_avg",
            "blood_pressure",
            "cholesterol",
            "age_normalized",
            "has_disease",
            "hrv",
            "heart_rate_normalized",
            "blood_pressure_normalized",
            "cholesterol_normalized",
            "cardio_health",
            "wellness_score",
            "typing_consistency",
            "dwell_time_ms",
            "flight_time_ms",
            "typing_error_rate",
            "mouse_velocity_pxs",
            "mouse_click_precision",
            "session_duration_sec",
            "auth_confidence",
        ]

        features = [feat.get(k, 0.0) for k in feature_keys]
        return np.array(features).reshape(1, -1)


    # ================== PREDICTION METHODS ==================

    def predict_mpt(self, user_data: Dict) -> Tuple[float, float, float]:
        """MPT prediction."""
        try:
            if self.mpt_model is not None:
                features = self.prepare_features(user_data)
                pred = self.mpt_model.predict(features)[0]
                stocks_pct = float(np.clip(pred[0], 10, 90))
                bonds_pct = 100 - stocks_pct
                return stocks_pct, bonds_pct, 0.96
        except Exception as e:
            print(f"MPT prediction error: {e}")
        return self._demo_mpt(user_data)

    def predict_dnn(self, user_data: Dict) -> Tuple[float, float, float]:
        """DNN prediction (PRIMARY)."""
        try:
            if self.dnn_model is not None and TF_AVAILABLE:
                features = self.prepare_features(user_data)
                pred = self.dnn_model.predict(features, verbose=0)[0]
                stocks_pct = float(np.clip(pred[0], 10, 90))
                bonds_pct = 100 - stocks_pct
                return stocks_pct, bonds_pct, 0.94
        except Exception as e:
            print(f"DNN prediction error: {e}")
        return self._demo_dnn(user_data)

    def predict_rl(self, user_data: Dict) -> Tuple[float, float, float]:
        """RL prediction (Adaptive)."""
        try:
            if self.rl_model_stocks is not None and self.rl_model_bonds is not None:
                features = self.prepare_features(user_data)
                stocks_pred = self.rl_model_stocks.predict(features)[0]
                stocks_pct = float(np.clip(stocks_pred, 10, 90))
                bonds_pct = 100 - stocks_pct
                return stocks_pct, bonds_pct, 0.64
        except Exception as e:
            print(f"RL prediction error: {e}")
        return self._demo_rl(user_data)

    def predict_ensemble(self, user_data: Dict) -> Tuple[float, float, float]:
        """Ensemble prediction (average of all 3)."""
        mpt_s, mpt_b, _ = self.predict_mpt(user_data)
        dnn_s, dnn_b, _ = self.predict_dnn(user_data)
        rl_s, rl_b, _ = self.predict_rl(user_data)

        ensemble_stocks = (mpt_s + dnn_s + rl_s) / 3.0
        ensemble_bonds = (mpt_b + dnn_b + rl_b) / 3.0
        ensemble_stocks = float(np.clip(ensemble_stocks, 10, 90))
        ensemble_bonds = 100 - ensemble_stocks
        return ensemble_stocks, ensemble_bonds, 0.93

    # ================== DEMO HEURISTICS ==================

    def _demo_mpt(self, user_data: Dict) -> Tuple[float, float, float]:
        age = user_data.get("age", 45)
        years_to_ret = max(0, 65 - age)
        wellness = user_data.get(
            "wellness_score", user_data.get("wellnessscore", 0.5)
        )
        base_stocks = 60 + (years_to_ret / 50.0) * 20.0
        if wellness > 1:
            base_stocks += (wellness - 50) * 0.3
        else:
            base_stocks += (wellness - 0.5) * 60.0
        stocks_pct = float(np.clip(base_stocks, 10, 90))
        bonds_pct = 100 - stocks_pct
        return stocks_pct, bonds_pct, 0.96

    def _demo_dnn(self, user_data: Dict) -> Tuple[float, float, float]:
        wellness = user_data.get(
            "wellness_score", user_data.get("wellnessscore", 0.5)
        )
        cardio = user_data.get(
            "cardio_health", user_data.get("cardiohealth", 0.5)
        )
        wellness_norm = wellness / 100.0 if wellness > 1 else wellness
        cardio_norm = cardio / 100.0 if cardio > 1 else cardio
        base_stocks = 55 + wellness_norm * 25.0
        base_stocks += (cardio_norm - 0.5) * 20.0
        stocks_pct = float(np.clip(base_stocks, 10, 90))
        bonds_pct = 100 - stocks_pct
        return stocks_pct, bonds_pct, 0.94

    def _demo_rl(self, user_data: Dict) -> Tuple[float, float, float]:
        wellness = user_data.get(
            "wellness_score", user_data.get("wellnessscore", 0.5)
        )
        risk_capacity = user_data.get(
            "risk_capacity",
            user_data.get("risk_capacity_clipped", user_data.get("riskcapacity", 0.5)),
        )
        wellness_norm = wellness / 100.0 if wellness > 1 else wellness
        base_stocks = 40 + risk_capacity * 30.0 + (wellness_norm - 0.5) * 20.0
        stocks_pct = float(np.clip(base_stocks, 10, 90))
        bonds_pct = 100 - stocks_pct
        return stocks_pct, bonds_pct, 0.64

    # ================== ALL PREDICTIONS FOR FRONTEND ==================

    def get_all_predictions(self, user_data: Dict) -> Dict[str, Dict[str, Any]]:
        results: Dict[str, Dict[str, Any]] = {}

        s, b, c = self.predict_mpt(user_data)
        results["mpt"] = {
            "model": "MPT (Modern Portfolio Theory)",
            "stocks_percentage": round(s, 2),
            "bonds_percentage": round(b, 2),
            "confidence": round(c, 2),
            "description": "Classical finance-based allocation",
        }

        s, b, c = self.predict_dnn(user_data)
        results["dnn"] = {
            "model": "DNN (Deep Neural Network) - PRIMARY",
            "stocks_percentage": round(s, 2),
            "bonds_percentage": round(b, 2),
            "confidence": round(c, 2),
            "description": "Advanced ML using multi-modal features",
        }

        s, b, c = self.predict_rl(user_data)
        results["rl"] = {
            "model": "RL (Reinforcement Learning)",
            "stocks_percentage": round(s, 2),
            "bonds_percentage": round(b, 2),
            "confidence": round(c, 2),
            "description": "Market adaptive strategy",
        }

        s, b, c = self.predict_ensemble(user_data)
        results["ensemble"] = {
            "model": "Ensemble (MPT + DNN + RL)",
            "stocks_percentage": round(s, 2),
            "bonds_percentage": round(b, 2),
            "confidence": round(c, 2),
            "description": "Consensus of all models",
        }

        return results


def get_model_manager(models_path: str = "./models") -> ModelManager:
    return ModelManager(models_path=models_path)
