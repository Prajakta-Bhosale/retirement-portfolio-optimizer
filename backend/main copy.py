from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import uvicorn
import json
from pathlib import Path
from typing import Dict

from schemas import (
    PredictionRequest,
    PredictionResponse,
    UserListResponse,
    ModelListResponse,
)
from models import get_model_manager


# ================== LOAD DATA ==================

BASE_DIR = Path(__file__).parent

# Use dashboard_data.json for the dashboard
DATA_PATH = BASE_DIR / "dashboard_data.json"

with open(DATA_PATH, "r") as f:
    MODEL_DATA = json.load(f)  # list[dict]

USERS_BY_USERID: Dict[str, Dict] = {row["userid"]: row for row in MODEL_DATA}


# ================== FASTAPI APP ==================

app = FastAPI(
    title="Retirement Portfolio Optimization Dashboard",
    description="Multi-model retirement portfolio prediction system",
    version="1.0.0",
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
        "message": "Retirement Portfolio Optimization Dashboard",
        "status": "running",
        "endpoints": {
            "users": "/api/users",
            "portfolio": "/api/portfolio/{userid}",
            "predict": "/api/predict",
            "models": "/api/models",
            "health": "/health",
            "raw_dashboard_data": "/api/raw-dashboard-data",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "portfolio_dashboard"}


@app.get("/api/raw-dashboard-data")
async def get_raw_dashboard_data():
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


# ================== PORTFOLIO ==================

def _g(row: Dict, *keys, default=None):
    """Safe getter across multiple possible key names."""
    for k in keys:
        if k in row:
            return row[k]
    return default


@app.get("/api/portfolio/{userid}")
async def get_portfolio(userid: str):
    if userid not in USERS_BY_USERID:
        raise HTTPException(status_code=404, detail=f"User {userid} not found")

    row = USERS_BY_USERID[userid]

    # Current allocation from JSON
    current_stocks = float(_g(row, "stocks_pct", "stockspct", default=50.0))
    current_bonds = float(_g(row, "bonds_pct", "bondspct", default=50.0))

    predictions = model_manager.get_all_predictions(row)

    portfolio_metrics = {
        "current_allocation": {
            "stocks": current_stocks,
            "bonds": current_bonds,
        },
        "portfolio_value": float(_g(row, "networth", default=0.0)),
        "annual_return": float(_g(row, "annual_return", "annualreturn", default=0.0)),
        "volatility": float(
            _g(row, "portfolio_volatility", "portfoliovolatility", default=0.0)
        ),
        "sharpe_ratio": float(_g(row, "sharpe_ratio", "sharperatio", default=0.0)),
        "max_drawdown": float(_g(row, "max_drawdown", "maxdrawdown", default=0.0)),
        "health_score": {
            "wellness": float(_g(row, "wellness_score", "wellnessscore", default=0.0)),
            "cardio_health": float(
                _g(row, "cardio_health", "cardiohealth", default=0.0)
            ),
            "heart_rate": float(
                _g(row, "heart_rate_avg", "heartrateavg", default=0.0)
            ),
            "hrv": float(_g(row, "hrv", default=0.0)),
        },
    }

    portfolio_data = {
        "userid": userid,
        "age": _g(row, "age"),
        "networth": float(_g(row, "networth", default=0.0)),
        "wellness_score": float(
            _g(row, "wellness_score", "wellnessscore", default=0.0)
        ),
        "stocks_pct": current_stocks,
        "bonds_pct": current_bonds,
        # extra actual health fields (optional)
        "trestbps": _g(row, "trestbps"),
        "chol": _g(row, "chol"),
        "thalach": _g(row, "thalach"),
        "has_disease": _g(row, "hasdisease"),
    }

    return {
        "userid": userid,
        "name": userid,
        "portfolio_data": portfolio_data,
        "predictions": predictions,
        "portfolio_metrics": portfolio_metrics,
    }


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
    
     # add textual explanations per model (optional)
    for m_type in predictions.keys():
        stocks = predictions[m_type]["stocks_percentage"]
        predictions[m_type]["explanation"] = _generate_explanation(
            m_type, row, stocks
        )

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
    # store both snake and original key for compatibility
    USERS_BY_USERID[userid]["risk_capacity"] = risk_capacity
    USERS_BY_USERID[userid]["riskcapacity"] = risk_capacity
    return {
        "message": "Risk capacity updated",
        "userid": userid,
        "new_risk_capacity": risk_capacity,
    }


# ================== EXPLANATION ==================

def _generate_explanation(model_type: str, row: Dict, stocks_pct: float) -> str:
    wellness = _g(row, "wellness_score", "wellnessscore", default=0.0)
    cardio = _g(row, "cardio_health", "cardiohealth", default=0.0)
    risk_capacity = _g(row, "risk_capacity", "riskcapacity", default=0.5)

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
