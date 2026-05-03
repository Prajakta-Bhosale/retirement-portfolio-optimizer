# Retirement Portfolio Optimization Dashboard - Complete Setup Guide

## 🎯 Quick Start (5 minutes)

### Step 1: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
python main.py
```

You should see:
```
🚀 RETIREMENT PORTFOLIO OPTIMIZATION DASHBOARD
✓ Backend Server starting...
✓ Models loaded (Demo mode)
✓ 50 demo users available

📊 Dashboard URL: http://localhost:3000
📡 API URL: http://localhost:8000
📚 API Docs: http://localhost:8000/docs
```

### Step 2: Frontend Setup
Simply open `frontend/index.html` in your browser (double-click or drag to browser)

## 📁 File Structure Explained

### Backend Files (`backend/`)

**main.py** - FastAPI Server
- Handles all API endpoints
- Connects to model manager
- Serves 50 demo users
- Features: user selection, predictions, comparison

**models.py** - Model Manager
- Loads/manages all 4 models (MPT, DNN, RL, Ensemble)
- Provides prediction methods
- Demo fallback for missing models
- Feature preparation

**schemas.py** - API Data Models
- Pydantic models for type validation
- Request/response structures
- Data validation

**requirements.txt** - Dependencies
- FastAPI, TensorFlow, Scikit-learn
- Pandas, Numpy for data processing

### Frontend Files (`frontend/`)

**index.html** - Dashboard UI
- User selection dropdown
- Model selection buttons
- Prediction cards with charts
- Health & financial metrics panels

**styles.css** - Complete Styling
- Responsive design (mobile, tablet, desktop)
- Color scheme for 4 models
- Charts, tables, forms styling
- Dark/light mode ready

**script.js** - Frontend Logic
- API communication (Axios)
- User selection & loading
- Model prediction display
- Chart visualization
- Toast notifications

## 🔌 API Endpoints

### Users
```
GET /api/users
Response: { userids: [1, 2, ...], total_users: 50 }
```

### Portfolio Data
```
GET /api/portfolio/{user_id}
Response: {
    user_id: 1,
    name: "User 1",
    portfolio_data: {...},
    predictions: {
        mpt: {...},
        dnn: {...},
        rl: {...},
        ensemble: {...}
    },
    portfolio_metrics: {...}
}
```

### Single Prediction
```
POST /api/predict
Body: { userid: 1, model_type: "mpt" }
Response: {
    userid: 1,
    model_type: "mpt",
    stocks_percentage: 60.5,
    bonds_percentage: 39.5,
    confidence: 0.96,
    explanation: "..."
}
```

### Compare All Models
```
GET /api/portfolio/{user_id}/compare
Response: {
    user_id: 1,
    comparison: {
        mpt: {...},
        dnn: {...},
        rl: {...},
        ensemble: {...}
    },
    recommendation: "ensemble"
}
```

## 🤖 Models Explanation

### 1. **MPT (Modern Portfolio Theory)**
- Classical finance approach
- Best performance: R² = 0.9628
- Uses: Financial data only (14 features)
- Use case: Conservative, regulatory compliant
- Color: 🔵 Blue

### 2. **DNN (Deep Neural Network) - PRIMARY** ⭐
- Advanced ML model
- R² = 0.9380
- Uses: ALL 37 features (financial + health + behavioral)
- Captures: Non-linear patterns, personalization
- Best for: High-net-worth clients, maximum accuracy
- Color: 🟣 Purple

### 3. **RL (Reinforcement Learning)**
- Adaptive strategy
- R² = 0.6395
- Uses: Market feedback signals
- Learns: Optimal policy from rewards
- Best for: Dynamic markets, real-time adaptation
- Color: 🔴 Pink

### 4. **ENSEMBLE (Consensus)**
- Combines all 3 models
- R² = 0.9281
- Best for: Production use, risk mitigation
- Advantage: Fallback if one model fails
- Color: 🟢 Teal

## 🔄 How to Use Real Models from Your Notebook

### Export from Jupyter Notebook

Add these cells to your notebook:

```python
# ===== EXPORT MODELS =====

# Export MPT model
import pickle
with open('mpt_model.pkl', 'wb') as f:
    pickle.dump(mpt_model, f)
print("✓ MPT model exported")

# Export DNN model
dnn_model.save('dnn_model.h5')
print("✓ DNN model exported")

# Export RL models
with open('rl_model_stocks.pkl', 'wb') as f:
    pickle.dump(rl_model_stocks, f)
with open('rl_model_bonds.pkl', 'wb') as f:
    pickle.dump(rl_model_bonds, f)
print("✓ RL models exported")
```

### Move Model Files to Backend

```bash
# Create models directory
mkdir backend/models

# Move exported files
mv *.pkl backend/models/
mv *.h5 backend/models/
```

### Update model.py Import Path

The models.py will automatically detect and load these files!

## 🎮 Using the Dashboard

### 1. Select User
- Dropdown in left panel has 50 demo users
- Shows: Age, retirement years, risk profile, wellness score

### 2. Choose Model
- 4 buttons: MPT, DNN, RL, ENSEMBLE
- Default: DNN (primary model)
- Each shows different recommendation

### 3. View Predictions
- Large allocation bars (stocks ↔ bonds)
- Confidence percentage
- Detailed breakdown
- Explanation text

### 4. Compare Models
- Right panel shows all 4 predictions
- Comparison chart
- Model rankings

### 5. Health & Financial Metrics
- Wellness, cardio health, heart rate, HRV
- Annual return, volatility, Sharpe ratio
- Max drawdown

## 🔧 Advanced Configuration

### Change API Port
Edit `backend/main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=9000)  # Change 8000 to 9000
```

Update `frontend/script.js`:
```javascript
const API_BASE = 'http://localhost:9000';
```

### Add Real User Data
Replace DEMO_USERS in `backend/main.py`:
```python
# Load from CSV
DEMO_USERS = {}
df = pd.read_csv('users.csv')
for _, row in df.iterrows():
    DEMO_USERS[row['userid']] = row.to_dict()
```

### Connect to Database
```python
from sqlalchemy import create_engine

engine = create_engine('sqlite:///portfolio.db')
# Use SQLAlchemy ORM to load users
```

## 📊 Dashboard Features

✅ **User Management**
- 50 demo users (customize with your data)
- Profile information display
- Risk preference updates

✅ **Model Selection**
- 4 different prediction models
- Easy model switching
- Color-coded interface

✅ **Predictions**
- Allocation percentages (stocks/bonds)
- Confidence scores
- AI explanations
- Comparison visualization

✅ **Metrics & Analytics**
- Health score tracking
- Financial KPIs
- Performance comparison
- Historical trends (extensible)

✅ **Responsive Design**
- Desktop (3-column layout)
- Tablet (responsive grid)
- Mobile (single column)

## 🚀 Production Deployment

### Docker Setup
```dockerfile
# Dockerfile
FROM python:3.10
WORKDIR /app
COPY backend/ .
RUN pip install -r requirements.txt
CMD ["python", "main.py"]
```

### Deploy Backend
```bash
docker build -t portfolio-optimizer .
docker run -p 8000:8000 portfolio-optimizer
```

### Deploy Frontend
```bash
# Option 1: Simple HTTP server
python -m http.server 3000 --directory frontend

# Option 2: Deploy to AWS S3 / CloudFront
aws s3 sync frontend/ s3://your-bucket/
```

## 🐛 Troubleshooting

### "Failed to connect to backend"
```bash
# Check if backend is running
curl http://localhost:8000/health

# Start backend again
cd backend && python main.py
```

### "Models not found" message
```bash
# This is normal in DEMO mode
# Export and move models from notebook:
# See "Export from Jupyter Notebook" section above
```

### CORS errors
```
# Backend already has CORS enabled
# If still issues, check:
# 1. Backend URL correct in script.js
# 2. Backend is running
# 3. Ports not blocked (8000, 3000)
```

### Predictions don't change
```
# Models are using same features
# To personalize: modify feature preparation in models.py
# Or integrate real trained models from notebook
```

## 📚 Integration with Your Notebook

### Option 1: Export Models (Recommended)
1. Train models in notebook ✓ (already done)
2. Export pickle/h5 files
3. Move to backend/models/
4. Restart backend
5. Dashboard uses real models

### Option 2: Call Notebook from Backend
```python
# backend/main.py
import subprocess
result = subprocess.run(['jupyter', 'nbconvert', '--to', 'python', 'final_-1.ipynb'])
```

### Option 3: Convert Notebook to Module
```bash
# In notebook directory
jupyter nbconvert --to python final_-1.ipynb
# Import functions from converted module
```

## 🎓 Learning Path

1. **Understand the Dashboard**
   - Navigate around UI
   - Try different models
   - Check predictions

2. **Integrate Real Models**
   - Export from notebook
   - Test with real data
   - Adjust thresholds

3. **Customize for Production**
   - Replace demo users
   - Add real financial data
   - Connect to database

4. **Deploy**
   - Docker containers
   - Cloud platforms (AWS, GCP, Azure)
   - CI/CD pipeline

## 📞 Support

### Logs
```bash
# Check backend logs
cd backend && python main.py

# Browser console (F12 → Console tab)
# Check frontend logs and API calls
```

### API Documentation
- Interactive: http://localhost:8000/docs
- Swagger UI with all endpoints

### Test API Endpoints
```bash
# Get users
curl http://localhost:8000/api/users

# Get portfolio
curl http://localhost:8000/api/portfolio/1

# Make prediction
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"userid": 1, "model_type": "mpt"}'
```

## 🎉 Next Steps

1. ✅ Start backend: `python main.py` (backend/)
2. ✅ Open frontend: `frontend/index.html`
3. ✅ Select a user and model
4. ✅ View AI recommendations
5. ✅ Export real models from notebook
6. ✅ Deploy to production!

---

**Created with ❤️ for retirement portfolio optimization**
