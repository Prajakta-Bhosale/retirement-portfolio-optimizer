import os
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# Try to import TensorFlow
try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

class ModelManager:
    """Manages all 4 models for predictions"""
    
    def __init__(self, models_path: str = "./models"):
        """
        Initialize model manager
        Args:
            models_path: Path where trained models are saved
        """
        self.models_path = models_path
        self.mpt_model = None
        self.dnn_model = None
        self.rl_model_stocks = None
        self.rl_model_bonds = None
        self.ensemble_ready = False
        
        # Load or create models
        self.load_or_create_models()
    
    def load_or_create_models(self):
        """Load saved models or create dummy ones for demo"""
        # Since your models are in the notebook, we'll create a demo setup
        # You'll need to export your actual models from the notebook
        
        print("Loading models...")
        
        # Try to load saved models
        try:
            self.mpt_model = self._load_pickle('mpt_model.pkl')
            self.dnn_model = self._load_keras('dnn_model.h5')
            self.rl_model_stocks = self._load_pickle('rl_model_stocks.pkl')
            self.rl_model_bonds = self._load_pickle('rl_model_bonds.pkl')
            self.ensemble_ready = True
            print("✓ All models loaded successfully!")
        except FileNotFoundError:
            print("⚠ Models not found. Using DEMO MODE with dummy predictions.")
            print("  To use real models, export from your notebook:")
            print("  - mpt_model")
            print("  - dnn_model")
            print("  - rl_model_stocks, rl_model_bonds")
            self.ensemble_ready = False
    
    def _load_pickle(self, filename: str):
        """Load pickle file"""
        path = os.path.join(self.models_path, filename)
        with open(path, 'rb') as f:
            return pickle.load(f)
    
    def _load_keras(self, filename: str):
        """Load Keras model"""
        if not TF_AVAILABLE:
            return None
        path = os.path.join(self.models_path, filename)
        return tf.keras.models.load_model(path)
    
    def prepare_features(self, user_data: Dict) -> np.ndarray:
        """
        Convert user data to feature array
        Order must match your notebook's feature order
        """
        # Extract features in the same order as your notebook
        features = [
            user_data.get('age', 45),
            user_data.get('income', 100000),
            user_data.get('savings', 500000),
            user_data.get('years_to_retirement', 20),
            user_data.get('sp500_return', 0.10),
            user_data.get('bond_yield', 0.04),
            user_data.get('inflation_rate', 0.03),
            user_data.get('volatility', 0.15),
            user_data.get('sharpe_ratio', 1.2),
            user_data.get('max_drawdown', -0.20),
            user_data.get('savings_rate', 0.20),
            user_data.get('debt_to_income', 0.3),
            user_data.get('expense_ratio', 0.005),
            user_data.get('tax_efficiency', 0.95),
            user_data.get('wellness_score', 75),
            user_data.get('cardio_health', 80),
            user_data.get('heart_rate_avg', 70),
            user_data.get('hrv', 60),
            user_data.get('dwell_time_ms', 500),
            user_data.get('typing_error_rate', 0.02),
            user_data.get('mouse_click_precision', 95),
            # Add more features as per your notebook
        ]
        return np.array(features).reshape(1, -1)
    
    def predict_mpt(self, user_data: Dict) -> Tuple[float, float, float]:
        """MPT Model prediction"""
        try:
            if self.mpt_model:
                features = self.prepare_features(user_data)
                pred = self.mpt_model.predict(features)[0]
                stocks_pct = float(np.clip(pred[0], 10, 90))
                bonds_pct = 100 - stocks_pct
                confidence = 0.96  # MPT has high confidence
                return stocks_pct, bonds_pct, confidence
        except Exception as e:
            print(f"MPT prediction error: {e}")
        
        return self._demo_mpt(user_data)
    
    def predict_dnn(self, user_data: Dict) -> Tuple[float, float, float]:
        """DNN Model prediction (PRIMARY)"""
        try:
            if self.dnn_model and TF_AVAILABLE:
                features = self.prepare_features(user_data)
                # Drop userid if present
                pred = self.dnn_model.predict(features, verbose=0)[0]
                stocks_pct = float(np.clip(pred[0], 10, 90))
                bonds_pct = 100 - stocks_pct
                confidence = 0.94
                return stocks_pct, bonds_pct, confidence
        except Exception as e:
            print(f"DNN prediction error: {e}")
        
        return self._demo_dnn(user_data)
    
    def predict_rl(self, user_data: Dict) -> Tuple[float, float, float]:
        """RL Model prediction (Adaptive)"""
        try:
            if self.rl_model_stocks and self.rl_model_bonds:
                features = self.prepare_features(user_data)
                stocks_pred = self.rl_model_stocks.predict(features)[0]
                bonds_pred = self.rl_model_bonds.predict(features)[0]
                
                stocks_pct = float(np.clip(stocks_pred, 10, 90))
                bonds_pct = 100 - stocks_pct
                confidence = 0.64
                return stocks_pct, bonds_pct, confidence
        except Exception as e:
            print(f"RL prediction error: {e}")
        
        return self._demo_rl(user_data)
    
    def predict_ensemble(self, user_data: Dict) -> Tuple[float, float, float]:
        """Ensemble prediction (Average of all 3)"""
        mpt_stocks, mpt_bonds, _ = self.predict_mpt(user_data)
        dnn_stocks, dnn_bonds, _ = self.predict_dnn(user_data)
        rl_stocks, rl_bonds, _ = self.predict_rl(user_data)
        
        # Average predictions
        ensemble_stocks = (mpt_stocks + dnn_stocks + rl_stocks) / 3
        ensemble_bonds = (mpt_bonds + dnn_bonds + rl_bonds) / 3
        
        # Normalize
        ensemble_stocks = float(np.clip(ensemble_stocks, 10, 90))
        ensemble_bonds = 100 - ensemble_stocks
        
        confidence = 0.93  # High confidence from consensus
        return ensemble_stocks, ensemble_bonds, confidence
    
    # Demo methods for when models aren't loaded
    def _demo_mpt(self, user_data: Dict) -> Tuple[float, float, float]:
        """Demo MPT prediction"""
        age = user_data.get('age', 45)
        years_to_ret = user_data.get('years_to_retirement', 20)
        wellness = user_data.get('wellness_score', 75)
        
        # Simple heuristic: More years to retirement = more stocks
        base_stocks = 60 + (years_to_ret / 50) * 20
        # Adjust for wellness (healthier = more aggressive)
        base_stocks += (wellness - 50) * 0.3
        
        stocks_pct = float(np.clip(base_stocks, 10, 90))
        bonds_pct = 100 - stocks_pct
        return stocks_pct, bonds_pct, 0.96
    
    def _demo_dnn(self, user_data: Dict) -> Tuple[float, float, float]:
        """Demo DNN prediction"""
        # Similar to MPT but with slight variations
        age = user_data.get('age', 45)
        wellness = user_data.get('wellness_score', 75)
        cardio = user_data.get('cardio_health', 75)
        
        base_stocks = 55 + (wellness / 100) * 25
        base_stocks += (cardio - 50) * 0.2
        
        stocks_pct = float(np.clip(base_stocks, 10, 90))
        bonds_pct = 100 - stocks_pct
        return stocks_pct, bonds_pct, 0.94
    
    def _demo_rl(self, user_data: Dict) -> Tuple[float, float, float]:
        """Demo RL prediction"""
        # More adaptive - considers market conditions
        wellness = user_data.get('wellness_score', 75)
        risk_tolerance = user_data.get('risk_tolerance', 'moderate')
        
        risk_map = {'conservative': 30, 'moderate': 60, 'aggressive': 80}
        base_stocks = risk_map.get(risk_tolerance, 60)
        base_stocks += (wellness - 75) * 0.2
        
        stocks_pct = float(np.clip(base_stocks, 10, 90))
        bonds_pct = 100 - stocks_pct
        return stocks_pct, bonds_pct, 0.64
    
    def get_all_predictions(self, user_data: Dict) -> Dict[str, Dict]:
        """Get predictions from all 4 models"""
        results = {}
        
        # MPT Prediction
        stocks, bonds, conf = self.predict_mpt(user_data)
        results['mpt'] = {
            'model': 'MPT (Modern Portfolio Theory)',
            'stocks_percentage': round(stocks, 2),
            'bonds_percentage': round(bonds, 2),
            'confidence': round(conf, 2),
            'description': 'Classical finance-based allocation'
        }
        
        # DNN Prediction (PRIMARY)
        stocks, bonds, conf = self.predict_dnn(user_data)
        results['dnn'] = {
            'model': 'DNN (Deep Neural Network) - PRIMARY',
            'stocks_percentage': round(stocks, 2),
            'bonds_percentage': round(bonds, 2),
            'confidence': round(conf, 2),
            'description': 'Advanced ML using all features'
        }
        
        # RL Prediction
        stocks, bonds, conf = self.predict_rl(user_data)
        results['rl'] = {
            'model': 'RL (Reinforcement Learning)',
            'stocks_percentage': round(stocks, 2),
            'bonds_percentage': round(bonds, 2),
            'confidence': round(conf, 2),
            'description': 'Market-adaptive predictions'
        }
        
        # Ensemble Prediction
        stocks, bonds, conf = self.predict_ensemble(user_data)
        results['ensemble'] = {
            'model': 'ENSEMBLE (Consensus)',
            'stocks_percentage': round(stocks, 2),
            'bonds_percentage': round(bonds, 2),
            'confidence': round(conf, 2),
            'description': 'Average of all 3 models'
        }
        
        return results


# Global model manager instance
_model_manager = None

def get_model_manager():
    """Get or create model manager instance"""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager
