from pydantic import BaseModel
from typing import List, Dict, Optional

class PortfolioData(BaseModel):
    """User portfolio data"""
    userid: str
    age: int
    income: float
    savings: float
    years_to_retirement: int
    risk_tolerance: str
    current_stocks_pct: float
    current_bonds_pct: float
    wellness_score: float
    cardio_health: float
    heart_rate_avg: float
    hrv: float
    dwell_time_ms: float
    typing_error_rate: float
    mouse_click_precision: float
    # Add other features as needed from your notebook

class PredictionRequest(BaseModel):
    """Request for predictions"""
    userid: str
    model_type: str  # "mpt", "dnn", "rl", "ensemble"

class PredictionResponse(BaseModel):
    """Prediction response"""
    userid: str
    model_type: str
    stocks_percentage: float
    bonds_percentage: float
    confidence: Optional[float] = None
    explanation: Optional[str] = None

class UserListResponse(BaseModel):
    """List of available users"""
    userids: List[str]
    total_users: int

class ModelListResponse(BaseModel):
    """Available models"""
    models: List[str]
    descriptions: Dict[str, str]

class PortfolioResponse(BaseModel):
    """Complete portfolio response"""
    userid: str
    portfolio_data: Dict
    predictions: Dict[str, Dict]  # {model_name: prediction}
    portfolio_metrics: Dict
