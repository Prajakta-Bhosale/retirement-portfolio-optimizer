# SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RETIREMENT PORTFOLIO OPTIMIZER                       │
│                         Complete Dashboard                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Browser)                             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  frontend/index.html                                            │    │
│  │  ✓ User Selection (Dropdown)                                    │    │
│  │  ✓ Model Selection (4 Buttons)                                  │    │
│  │  ✓ Prediction Cards                                             │    │
│  │  ✓ Charts & Visualization                                       │    │
│  │  ✓ Health & Financial Metrics                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │   Axios HTTP     │  │   Chart.js       │  │   DOM Updates    │       │
│  │   Client         │  │   Visualization  │  │   (Event Handlers)       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  frontend/styles.css                                            │    │
│  │  ✓ Responsive Design (Desktop/Tablet/Mobile)                    │    │
│  │  ✓ Color Scheme (4 Models)                                      │    │
│  │  ✓ Animations & Transitions                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  frontend/script.js                                             │    │
│  │  ✓ API Calls (Axios)                                            │    │
│  │  ✓ State Management                                             │    │
│  │  ✓ User Interactions                                            │    │
│  │  ✓ Chart Updates                                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP REST API
                                    │ (Axios)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                              │
│                         http://localhost:8000                             │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  backend/main.py  - FastAPI Server                              │   │
│  │                                                                   │   │
│  │  API Endpoints:                                                  │   │
│  │  ├─ GET  /health                    ✓ Server status             │   │
│  │  ├─ GET  /api/users                 ✓ List all users (1-50)     │   │
│  │  ├─ GET  /api/models                ✓ Available models          │   │
│  │  ├─ GET  /api/portfolio/{id}        ✓ User data + all pred.     │   │
│  │  ├─ POST /api/predict               ✓ Single model prediction    │   │
│  │  ├─ GET  /api/portfolio/{id}/compare ✓ Compare all models       │   │
│  │  └─ POST /api/portfolio/{id}/update-risk ✓ Update risk pref.    │   │
│  │                                                                   │   │
│  │  Features:                                                       │   │
│  │  • CORS enabled (frontend access)                              │   │
│  │  • Request/Response validation                                 │   │
│  │  • Error handling                                              │   │
│  │  • JSON responses                                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  backend/models.py - Model Manager                              │   │
│  │                                                                   │   │
│  │  4 Models (MPT, DNN, RL, ENSEMBLE):                              │   │
│  │  ├─ predict_mpt()        → Classical Portfolio Theory            │   │
│  │  ├─ predict_dnn()        → Deep Neural Network (PRIMARY)         │   │
│  │  ├─ predict_rl()         → Reinforcement Learning               │   │
│  │  └─ predict_ensemble()   → Consensus Voting                     │   │
│  │                                                                   │   │
│  │  Features:                                                       │   │
│  │  • Load real models (pickle + TensorFlow)                        │   │
│  │  • Demo fallback mode (synthetic predictions)                   │   │
│  │  • Feature preparation                                           │   │
│  │  • Prediction post-processing                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  backend/models/ (Optional - Real Trained Models)               │   │
│  │                                                                   │   │
│  │  ├─ mpt_model.pkl              (Scikit-learn)                   │   │
│  │  ├─ dnn_model.h5               (TensorFlow/Keras)               │   │
│  │  ├─ rl_model_stocks.pkl        (Scikit-learn)                   │   │
│  │  └─ rl_model_bonds.pkl         (Scikit-learn)                   │   │
│  │                                                                   │   │
│  │  🔄 Export from your Jupyter notebook                            │   │
│  │  🔄 Replace demo predictions with real ones                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  backend/schemas.py - Data Validation (Pydantic)                │   │
│  │                                                                   │   │
│  │  ├─ PortfolioData        → User portfolio information           │   │
│  │  ├─ PredictionRequest    → Model prediction request             │   │
│  │  ├─ PredictionResponse   → Model prediction response            │   │
│  │  ├─ UserListResponse     → Users list response                  │   │
│  │  ├─ ModelListResponse    → Models list response                 │   │
│  │  └─ PortfolioResponse    → Complete portfolio response          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Demo Data: 50 Users                                             │   │
│  │  • User ID (1-50)                                                │   │
│  │  • Age, Income, Savings, Risk Tolerance                         │   │
│  │  • Health Scores (Wellness, Cardio, Heart Rate, HRV)           │   │
│  │  • Financial Features (Returns, Volatility, Sharpe, etc.)      │   │
│  │  • Behavioral Features (Typing, Mouse, Dwell Time)             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                    JUPYTER NOTEBOOK (Your Code)                          │
│                                                                           │
│  final_-1.ipynb                                                          │
│  ✓ Data Loading & Preprocessing                                         │
│  ✓ Feature Engineering                                                   │
│  ✓ Model 1: MPT (Modern Portfolio Theory)                               │
│  ✓ Model 2: DNN (Deep Neural Network) - PRIMARY                         │
│  ✓ Model 3: RL (Reinforcement Learning)                                 │
│  ✓ Model 4: ENSEMBLE (Consensus)                                        │
│  ✓ Model Training & Evaluation                                          │
│  ✓ Export Models (NEW!)                                                 │
│                                                                           │
│  → Exports to: backend/models/                                          │
│  → Dashboard uses these for real predictions                            │
└──────────────────────────────────────────────────────────────────────────┘

```

---

## DATA FLOW DIAGRAM

```
┌─────────────────┐
│  User Action    │
│  (Select User)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ frontend/script.js          │
│ setupEventListeners()       │
│ async selectUser(userId)    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Axios HTTP Request          │
│ GET /api/portfolio/1        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ backend/main.py             │
│ @app.get("/api/portfolio") │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ backend/models.py           │
│ get_all_predictions(data)   │
└────────┬────────────────────┘
         │
    ┌────┴────┬────────┬──────────┐
    │          │        │          │
    ▼          ▼        ▼          ▼
  MPT Model  DNN Model RL Model  Ensemble
    │          │        │          │
    └────┬────┴────┬────┴──────┬───┘
         │         │           │
         ▼         ▼           ▼
    Predictions Combined Response
         │         │           │
         └────┬────┴───────┬───┘
              │           │
              ▼           ▼
         JSON Response  HTTP 200
              │
              ▼
    ┌──────────────────────────┐
    │ frontend/script.js       │
    │ displayPrediction()      │
    │ updateChart()            │
    └──────────────────────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ DOM Updates              │
    │ • Allocation bars        │
    │ • Confidence badges      │
    │ • Metrics panels         │
    │ • Charts                 │
    └──────────────────────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ User Sees Results! ✨   │
    └──────────────────────────┘
```

---

## MODEL SELECTION FLOW

```
User Clicks Model Button (MPT/DNN/RL/ENSEMBLE)
         │
         ▼
script.js: selectModel(model_type)
         │
         ▼
Update Active Button State
         │
         ▼
Get Prediction from state.predictions[model_type]
         │
         ▼
displayPrediction(prediction)
         ├─ Update Title
         ├─ Update Confidence
         ├─ Update Allocation Bars
         ├─ Update Percentages
         ├─ Update Explanation
         └─ Update Description
         │
         ▼
updateChart()
         ├─ Destroy Previous Chart
         ├─ Prepare Chart Data
         └─ Render New Chart
         │
         ▼
Dashboard Updates Instantly!
```

---

## FEATURE MATRIX

```
┌───────────────────┬──────┬──────┬──────┬─────────┐
│ Feature           │ MPT  │ DNN  │ RL   │ Backend │
├───────────────────┼──────┼──────┼──────┼─────────┤
│ Financial (14)    │  ✓   │  ✓   │  ✓   │   ✓     │
│ Health (4)        │  ✗   │  ✓   │  ✓   │   ✓     │
│ Behavioral (19)   │  ✗   │  ✓   │  ✓   │   ✓     │
│ Demo Fallback     │  ✓   │  ✓   │  ✓   │   ✓     │
│ Real Models       │  ✓   │  ✓   │  ✓   │   ✓     │
│ Confidence Score  │  ✓   │  ✓   │  ✓   │   ✓     │
│ Explanation Text  │  ✓   │  ✓   │  ✓   │   ✓     │
└───────────────────┴──────┴──────┴──────┴─────────┘
```

---

## DEPLOYMENT ARCHITECTURE (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS / Cloud Platform                    │
│                                                              │
│  ┌──────────────────────────┐  ┌───────────────────────┐   │
│  │  CloudFront              │  │  EC2 Instance         │   │
│  │  (Frontend Cache)        │  │  (Backend Server)     │   │
│  │  │                       │  │  │                   │   │
│  │  └─ S3 Bucket            │  │  └─ FastAPI (8000)   │   │
│  │     (HTML/CSS/JS)        │  │     Docker Container │   │
│  └──────────────────────────┘  └───────────────────────┘   │
│           │                              │                  │
│           │                              │                  │
│           └──────────────┬───────────────┘                  │
│                          │                                   │
│                  API Communication                          │
│                   (HTTPs/REST)                              │
│                          │                                   │
│              ┌───────────┴────────────┐                     │
│              │                        │                     │
│              ▼                        ▼                     │
│         ┌─────────────┐         ┌──────────────┐           │
│         │  RDS        │         │  S3 Bucket   │           │
│         │  Database   │         │  (Models)    │           │
│         │  (Users)    │         │  (mpt, dnn)  │           │
│         └─────────────┘         └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## TECH STACK SUMMARY

```
FRONTEND
  Language: JavaScript (Vanilla)
  HTTP Client: Axios
  Charts: Chart.js
  Styling: CSS3 (Responsive)
  Runtime: Browser

BACKEND
  Framework: FastAPI
  Server: Uvicorn
  Language: Python 3.10+
  
ML MODELS
  MPT: Scikit-learn (RandomForestRegressor)
  DNN: TensorFlow / Keras
  RL: Scikit-learn (GradientBoostingRegressor)
  Ensemble: Custom averaging

DATA
  Format: JSON (REST API)
  Validation: Pydantic
  Demo: In-memory dictionary
  Real: pickle + h5 files

DEPLOYMENT
  Docker: Containerization
  Cloud: AWS/GCP/Azure
  Frontend: S3 + CloudFront
  Backend: EC2 / Lambda / App Engine
```

---

## KEY FILES INTERACTION

```
browser/index.html
        │
        ├─ Loads: styles.css
        ├─ Loads: script.js
        ├─ Loads: Chart.js (CDN)
        └─ Loads: Axios (CDN)
                  │
                  ▼
            script.js
                  │
                  ├─ API_BASE = 'http://localhost:8000'
                  ├─ setupEventListeners()
                  ├─ loadUsers() → GET /api/users
                  ├─ selectUser() → GET /api/portfolio/{id}
                  ├─ selectModel() → Display predictions
                  └─ updateChart() → Render Chart.js
                      │
                      ▼
                localhost:8000
                (FastAPI Server)
                      │
                      ├─ main.py (routes)
                      ├─ schemas.py (validation)
                      └─ models.py (predictions)
                              │
                              ├─ mpt_model.pkl
                              ├─ dnn_model.h5
                              ├─ rl_model_stocks.pkl
                              └─ rl_model_bonds.pkl
```

This is your complete system!
