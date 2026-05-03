# Retirement Portfolio Optimization - Complete UI Dashboard System

## Project Structure
```
retirement_portfolio_ui/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── models.py               # Model loading & prediction
│   ├── schemas.py              # Pydantic models
│   └── requirements.txt         # Backend dependencies
├── frontend/
│   ├── index.html              # Main dashboard HTML
│   ├── styles.css              # Dashboard styling
│   └── script.js               # Frontend JavaScript
└── README.md                   # Setup instructions
```

## Installation & Setup

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Frontend Setup
- Open `frontend/index.html` in your browser
- Dashboard will connect to http://localhost:8000

## Features
- ✅ Select user by ID
- ✅ Display all user portfolio info
- ✅ Choose model (MPT, DNN, RL, Ensemble)
- ✅ Show predictions from selected model
- ✅ Real-time updates
- ✅ Responsive design
- ✅ Charts visualization
