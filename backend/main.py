from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import json
from pathlib import Path
from typing import Dict, List, Any
from schemas import (
    PredictionRequest,
    PredictionResponse,
    UserListResponse,
    ModelListResponse,
)
from models import get_model_manager

# ================== LOAD DATA ==================
BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "dashboard_data.json"

with open(DATA_PATH, "r") as f:
    MODEL_DATA = json.load(f)  # list[dict]

USERS_BY_USERID: Dict[str, Dict] = {row["userid"]: row for row in MODEL_DATA}

# ================== FIELD EXTRACTORS ==================
def _get_field(row: Dict, *keys, default=None):
    """Safe getter across multiple possible key names."""
    for k in keys:
        if k in row:
            return row[k]
    return default

def _extract_health_metrics(row: Dict) -> Dict[str, Any]:
    """Extract all health-related metrics."""
    return {
        "vital_signs": {
            "heart_rate_avg": float(_get_field(row, "heart_rate_avg", "heartrateavg", default=0.0)),
            "blood_pressure": float(_get_field(row, "blood_pressure", default=0.0)),
            "cholesterol": float(_get_field(row, "cholesterol", default=0.0)),
        },
        "health_diagnostics": {
            "trestbps": float(_get_field(row, "trestbps", default=0.0)),
            "thalach": float(_get_field(row, "thalach", default=0.0)),
            "chol": float(_get_field(row, "chol", default=0.0)),
            "target": int(_get_field(row, "target", default=0)),
            "has_disease": int(_get_field(row, "has_disease", "hasdisease", default=0)),
        },
        "wellness_factors": {
            "sleep_quality": float(_get_field(row, "sleep_quality", "sleepquality", default=0.0)),
            "stress_level": float(_get_field(row, "stress_level", "stresslevel", default=0.0)),
            "hrv": float(_get_field(row, "hrv", default=0.0)),
        },
        "health_scores": {
            "wellness_score": float(_get_field(row, "wellness_score", "wellnessscore", default=0.0)),
            "cardio_health": float(_get_field(row, "cardio_health", "cardiohealth", default=0.0)),
        },
        "normalized_health": {
            "heart_rate_normalized": float(_get_field(row, "heart_rate_normalized", "heartrate_normalized", default=0.0)),
            "blood_pressure_normalized": float(_get_field(row, "blood_pressure_normalized", "bloodpressure_normalized", default=0.0)),
            "cholesterol_normalized": float(_get_field(row, "cholesterol_normalized", default=0.0)),
        }
    }

def _extract_behavioral_metrics(row: Dict) -> Dict[str, Any]:
    """Extract all behavioral/authentication metrics."""
    return {
        "typing_patterns": {
            "typing_speed_wpm": float(_get_field(row, "typing_speed_wpm", "typingspeedwpm", default=0.0)),
            "typing_consistency": float(_get_field(row, "typing_consistency", "typingconsistency", default=0.0)),
            "typing_error_rate": float(_get_field(row, "typing_error_rate", "typingerrorrate", default=0.0)),
            "dwell_time_ms": float(_get_field(row, "dwell_time_ms", "dwelltimems", default=0.0)),
            "flight_time_ms": float(_get_field(row, "flight_time_ms", "flighttimems", default=0.0)),
        },
        "mouse_patterns": {
            "mouse_velocity_pxs": float(_get_field(row, "mouse_velocity_pxs", "mousevelocitypxs", default=0.0)),
            "mouse_smoothness": float(_get_field(row, "mouse_smoothness", "mousesmoothness", default=0.0)),
            "mouse_click_precision": float(_get_field(row, "mouse_click_precision", "mouseclickprecision", default=0.0)),
        },
        "session_metrics": {
            "session_duration_sec": int(_get_field(row, "session_duration_sec", "sessiondurationsec", default=0)),
            "auth_confidence": float(_get_field(row, "auth_confidence", "authconfidence", default=0.0)),
        }
    }

def _extract_portfolio_allocation(row: Dict) -> Dict[str, Any]:
    """Extract portfolio allocation data."""
    # Prefer newer field names but fall back to older names
    stocks = float(_get_field(row, "stocks_pct", "stockspct", default=50.0))
    bonds = float(_get_field(row, "bonds_pct", "bondspct", default=50.0))

    return {
        "current_allocation": {
            "stocks_pct": stocks,
            "bonds_pct": bonds,
        },
        "target_allocations": {
            "vti_alloc": float(_get_field(row, "vti_alloc", "vtialloc", default=0.0)),
            "bnd_alloc": float(_get_field(row, "bnd_alloc", "bndalloc", default=0.0)),
            "dbc_alloc": float(_get_field(row, "dbc_alloc", "dbcalloc", default=0.0)),
        },
        "explicit_allocation": {
            "vtiallocation": float(_get_field(row, "vtiallocation", default=0.0)),
            "bndallocation": float(_get_field(row, "bndallocation", default=0.0)),
            "dbcallocation": float(_get_field(row, "dbcallocation", default=0.0)),
        }
    }

def _extract_financial_metrics(row: Dict) -> Dict[str, Any]:
    """Extract financial and net worth data."""
    return {
        "income_wealth": {
            "annual_income": float(_get_field(row, "annualincome", "annualincome", default=0.0)),
            "net_worth": float(_get_field(row, "networth", "networth", default=0.0)),
            "savings_rate": float(_get_field(row, "savingsrate", "savingsrate", default=0.0)),
        },
        "debt": {
            "debt_ratio": float(_get_field(row, "debtratio", "debtratio", default=0.0)),
        }
    }

def _extract_portfolio_performance(row: Dict) -> Dict[str, Any]:
    """Extract portfolio performance metrics."""
    return {
        "returns": {
            "annual_return": float(_get_field(row, "annual_return", "annualreturn", default=0.0)),
            "daily_returns_mean": float(_get_field(row, "daily_returns_mean", "dailyreturnsmean", default=0.0)),
            "daily_returns_std": float(_get_field(row, "daily_returns_std", "dailyreturnsstd", default=0.0)),
        },
        "volatility": {
            "portfolio_volatility": float(_get_field(row, "portfolio_volatility", "portfoliovolatility", default=0.0)),
            "rolling_volatility_20": float(_get_field(row, "rolling_volatility_20", "rollingvolatility20", default=0.0)),
        },
        "risk_metrics": {
            "sharpe_ratio": float(_get_field(row, "sharpe_ratio", "sharperatio", default=0.0)),
            "max_drawdown": float(_get_field(row, "max_drawdown", "maxdrawdown", default=0.0)),
        }
    }

def _extract_technical_indicators(row: Dict) -> Dict[str, Any]:
    """Extract technical analysis indicators."""
    return {
        "moving_averages": {
            "ma_20": float(_get_field(row, "ma_20", "ma20", default=0.0)),
            "ma_50": float(_get_field(row, "ma_50", "ma50", default=0.0)),
            "ma_signal": float(_get_field(row, "ma_signal", "masignal", default=0.0)),
            "price_vs_ma50": float(_get_field(row, "price_vs_ma50", "pricevsmma50", default=0.0)),
        },
        "momentum": {
            "rsi": float(_get_field(row, "rsi", default=0.0)),
            "momentum_20": float(_get_field(row, "momentum_20", "momentum20", default=0.0)),
            "momentum_50": float(_get_field(row, "momentum_50", "momentum50", default=0.0)),
        }
    }

def _extract_risk_profile(row: Dict) -> Dict[str, Any]:
    """Extract risk capacity and preference data."""
    return {
        "risk_capacity": float(_get_field(row, "risk_capacity", "riskcapacity", default=0.5)),
        "risk_capacity_clipped": float(_get_field(row, "risk_capacity_clipped", "riskcapacityclipped", default=0.5)),
    }

def _extract_user_profile(row: Dict) -> Dict[str, Any]:
    """Extract user demographic and profile data."""
    return {
        "userid": row["userid"],
        "age": int(_get_field(row, "age", default=0)),
        "age_normalized": float(_get_field(row, "age_normalized", "agenormalized", default=0.0)),
        "archetype": _get_field(row, "archetype", default="unknown"),
        "wellness": float(_get_field(row, "wellness", default=0.0)),
    }

# ================== FASTAPI APP ==================
app = FastAPI(
    title="Retirement Portfolio Optimization Dashboard",
    description="Multi-model retirement portfolio prediction system with comprehensive analytics",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_manager = get_model_manager()

# ================== ROOT / HEALTH ==================
@app.get("/")
async def root():
    return {
        "message": "Retirement Portfolio Optimization Dashboard v2",
        "status": "running",
        "features": {
            "health_analytics": "Comprehensive health metrics extraction",
            "behavioral_analytics": "Biometric and behavioral pattern analysis",
            "portfolio_analytics": "Multi-dimensional portfolio performance",
            "technical_analysis": "Market technical indicators",
            "risk_profiling": "Risk capacity and preferences",
        },
        "endpoints": {
            "users": "/api/users",
            "portfolio": "/api/portfolio/{userid}",
            "portfolio_full": "/api/portfolio/{userid}/full",
            "health": "/api/portfolio/{userid}/health",
            "behavioral": "/api/portfolio/{userid}/behavioral",
            "performance": "/api/portfolio/{userid}/performance",
            "technical": "/api/portfolio/{userid}/technical",
            "risk": "/api/portfolio/{userid}/risk",
            "predict": "/api/predict",
            "models": "/api/models",
            "health_check": "/health",
            "raw_data": "/api/raw-dashboard-data",
        },
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "portfolio_dashboard"}

@app.get("/api/raw-dashboard-data")
async def get_raw_dashboard_data():
    """Returns raw dashboard data for direct analysis."""
    return MODEL_DATA

# ================== MODELS LIST ==================
@app.get("/api/models", response_model=ModelListResponse)
async def get_available_models():
    models = ["mpt", "dnn", "rl", "ensemble"]
    descriptions = {
        "mpt": "Modern Portfolio Theory (Classical Finance)",
        "dnn": "Deep Neural Network (Primary - ML Based)",
        "rl": "Reinforcement Learning (Market Adaptive)",
        "ensemble": "Ensemble (Consensus of All 3)",
    }
    return ModelListResponse(models=models, descriptions=descriptions)

# ================== USERS ==================
@app.get("/api/users", response_model=UserListResponse)
async def get_user_list():
    userids = sorted(USERS_BY_USERID.keys())
    return UserListResponse(userids=userids, total_users=len(userids))

# ================== PORTFOLIO - FULL ENDPOINTS ==================
# ================== PORTFOLIO - FULL ENDPOINTS ==================

@app.get("/api/portfolio/{userid}")
async def get_portfolio(userid: str):
    """Primary endpoint used by the dashboard."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")

    row = USERS_BY_USERID[userid]

    user_profile = _extract_user_profile(row)
    allocation = _extract_portfolio_allocation(row)
    financial = _extract_financial_metrics(row)
    performance = _extract_portfolio_performance(row)
    health = _extract_health_metrics(row)

    # Add richer health summary so frontend can show HR / HRV
    health_summary = {
        "wellness_score": health["health_scores"]["wellness_score"],
        "cardio_health": health["health_scores"]["cardio_health"],
        "heart_rate_avg": health["vital_signs"]["heart_rate_avg"],
        "hrv": health["wellness_factors"]["hrv"],
        "stress_level": health["wellness_factors"]["stress_level"],
    }

    predictions = model_manager.get_all_predictions(row)

    return {
        "userid": userid,
        "user_profile": user_profile,
        "portfolio_data": {
            "allocation": allocation,
            "financial": financial,
            "performance": performance,
        },
        "health_summary": health_summary,
        "predictions": predictions,
    }

@app.get("/api/portfolio/{userid}/full")
async def get_portfolio_full(userid: str):
    """Complete endpoint - returns all extracted fields organized by category."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")

    row = USERS_BY_USERID[userid]

    return {
        "userid": userid,
        "user_profile": _extract_user_profile(row),
        "health_metrics": _extract_health_metrics(row),
        "behavioral_metrics": _extract_behavioral_metrics(row),
        "portfolio_allocation": _extract_portfolio_allocation(row),
        "financial_metrics": _extract_financial_metrics(row),
        "portfolio_performance": _extract_portfolio_performance(row),
        "technical_indicators": _extract_technical_indicators(row),
        "risk_profile": _extract_risk_profile(row),
    }

@app.get("/api/portfolio/{userid}/health")
async def get_health_metrics(userid: str):
    """Returns only health-related metrics."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")
    row = USERS_BY_USERID[userid]
    return {"userid": userid, **_extract_health_metrics(row)}

@app.get("/api/portfolio/{userid}/behavioral")
async def get_behavioral_metrics(userid: str):
    """Returns only behavioral metrics."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")
    row = USERS_BY_USERID[userid]
    return {"userid": userid, **_extract_behavioral_metrics(row)}

@app.get("/api/portfolio/{userid}/performance")
async def get_performance_metrics(userid: str):
    """Returns only portfolio performance metrics."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")
    row = USERS_BY_USERID[userid]
    return {"userid": userid, **_extract_portfolio_performance(row)}

@app.get("/api/portfolio/{userid}/technical")
async def get_technical_indicators(userid: str):
    """Returns only technical indicators."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")
    row = USERS_BY_USERID[userid]
    return {"userid": userid, **_extract_technical_indicators(row)}

@app.get("/api/portfolio/{userid}/risk")
async def get_risk_profile(userid: str):
    """Returns risk capacity and profile."""
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")
    row = USERS_BY_USERID[userid]
    return {"userid": userid, **_extract_risk_profile(row)}

# ================== PREDICT (SINGLE MODEL) ==================
@app.post("/api/predict", response_model=PredictionResponse)
async def predict_portfolio(request: PredictionRequest):
    if request.userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {request.userid} not found")

    if request.model_type not in ["mpt", "dnn", "rl", "ensemble"]:
        raise HTTPException(status_code=400, detail="Invalid model type")

    row = USERS_BY_USERID[request.userid]

    if request.model_type == "mpt":
        stocks, bonds, conf = model_manager.predict_mpt(row)
    elif request.model_type == "dnn":
        stocks, bonds, conf = model_manager.predict_dnn(row)
    elif request.model_type == "rl":
        stocks, bonds, conf = model_manager.predict_rl(row)
    else:
        stocks, bonds, conf = model_manager.predict_ensemble(row)

    explanation = _generate_explanation(request.model_type, row, stocks)

    return PredictionResponse(
        userid=request.userid,
        model_type=request.model_type,
        stocks_percentage=round(stocks, 2),
        bonds_percentage=round(bonds, 2),
        confidence=round(conf, 2),
        explanation=explanation,
    )

# ================== COMPARISON & RISK UPDATE ==================
@app.get("/api/portfolio/{userid}/compare")
async def compare_models(userid: str):
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")

    row = USERS_BY_USERID[userid]
    predictions = model_manager.get_all_predictions(row)

    for m_type in predictions.keys():
        stocks = predictions[m_type]["stocks_percentage"]
        predictions[m_type]["explanation"] = _generate_explanation(m_type, row, stocks)

    return {
        "userid": userid,
        "user_name": userid,
        "comparison": predictions,
        "recommendation": "ensemble",
    }

@app.post("/api/portfolio/{userid}/update-risk")
async def update_risk_preference(userid: str, risk_capacity: float):
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")

    USERS_BY_USERID[userid]["risk_capacity"] = risk_capacity
    USERS_BY_USERID[userid]["riskcapacity"] = risk_capacity

    return {
        "message": "Risk capacity updated",
        "userid": userid,
        "new_risk_capacity": risk_capacity,
    }

# ================== EXPLANATION ==================
def _generate_explanation(model_type: str, row: Dict, stocks_pct: float) -> str:
    wellness = _get_field(row, "wellness_score", "wellnessscore", default=0.0)
    cardio = _get_field(row, "cardio_health", "cardiohealth", default=0.0)
    risk_capacity = _get_field(row, "risk_capacity", "riskcapacity", default=0.5)

    explanations = {
        "mpt": (
            f"Based on Modern Portfolio Theory with risk capacity {risk_capacity:.2f}, "
            f"{stocks_pct:.0f}% stocks are recommended."
        ),
        "dnn": (
            "Deep Neural Network using financial, health, and behavioral features. "
            f"With wellness score {wellness:.2f} and cardio health {cardio:.2f}, "
            f"{stocks_pct:.0f}% stocks are suggested."
        ),
        "rl": (
            "Reinforcement-style model using volatility and drawdown patterns. "
            f"In current conditions, {stocks_pct:.0f}% stocks are optimal."
        ),
        "ensemble": (
            "Ensemble of MPT, DNN, and RL models. "
            f"{stocks_pct:.0f}% stocks is the balanced allocation across methods."
        ),
    }

    return explanations.get(model_type, f"{stocks_pct:.0f}% stocks recommended")

# ================== ERROR HANDLERS ==================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": f"Internal server error: {str(exc)}"},
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)