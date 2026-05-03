# HOW TO EXPORT REAL MODELS FROM YOUR NOTEBOOK

## Step 1: Add Export Code to Your Notebook

At the end of your notebook (after all 4 models are trained), add these cells:

### Cell: Export All Models

```python
# ===== EXPORT TRAINED MODELS =====
import pickle
import os

# Create models directory if it doesn't exist
os.makedirs('./models', exist_ok=True)

print("\n" + "="*70)
print("EXPORTING TRAINED MODELS")
print("="*70 + "\n")

# 1. Export MPT Model
try:
    with open('./models/mpt_model.pkl', 'wb') as f:
        pickle.dump(mpt_model, f)
    print("✓ MPT model exported → ./models/mpt_model.pkl")
except Exception as e:
    print(f"✗ Failed to export MPT model: {e}")

# 2. Export DNN Model (TensorFlow)
try:
    dnn_model.save('./models/dnn_model.h5')
    print("✓ DNN model exported → ./models/dnn_model.h5")
except Exception as e:
    print(f"✗ Failed to export DNN model: {e}")

# 3. Export RL Models
try:
    with open('./models/rl_model_stocks.pkl', 'wb') as f:
        pickle.dump(rl_model_stocks, f)
    print("✓ RL stocks model exported → ./models/rl_model_stocks.pkl")
    
    with open('./models/rl_model_bonds.pkl', 'wb') as f:
        pickle.dump(rl_model_bonds, f)
    print("✓ RL bonds model exported → ./models/rl_model_bonds.pkl")
except Exception as e:
    print(f"✗ Failed to export RL models: {e}")

print("\n" + "="*70)
print("ALL MODELS EXPORTED SUCCESSFULLY!")
print("="*70)
print("\nNext steps:")
print("1. Move ./models/ folder to backend/models/")
print("2. Restart FastAPI server")
print("3. Dashboard will use real trained models")
print("\n")
```

## Step 2: Move Models to Backend

After exporting, move the models folder:

### Option A: Manual Move
```bash
# In your notebook's directory
mkdir -p backend/models
cp -r models/* backend/models/
```

### Option B: Python Script
```python
import shutil
import os

# Copy models to backend
if os.path.exists('./models'):
    shutil.copytree('./models', '../backend/models', dirs_exist_ok=True)
    print("✓ Models copied to backend/models/")
else:
    print("✗ ./models/ directory not found")
```

## Step 3: Verify Models are Loaded

Run the backend and check console:

```bash
cd backend
python main.py
```

You should see:
```
Loading models...
✓ All models loaded successfully!
```

NOT:
```
Loading models...
⚠ Models not found. Using DEMO MODE with dummy predictions.
```

## Step 4: Test with Real Models

1. Start backend: `python main.py`
2. Open frontend: `frontend/index.html`
3. Select a user
4. Select a model
5. **Verify predictions match your notebook's output!**

---

## Expected Model Files

After export, you should have:

```
backend/
├── models/
│   ├── mpt_model.pkl          (Modern Portfolio Theory)
│   ├── dnn_model.h5           (Deep Neural Network - TensorFlow)
│   ├── rl_model_stocks.pkl    (Reinforcement Learning - Stocks)
│   └── rl_model_bonds.pkl     (Reinforcement Learning - Bonds)
├── main.py
├── models.py
├── schemas.py
└── requirements.txt
```

---

## Alternative: Using SavedModel Format for DNN

If you want to use TensorFlow's SavedModel format instead of h5:

```python
# In notebook, instead of: dnn_model.save('./models/dnn_model.h5')
dnn_model.save('./models/dnn_model_savedmodel')

# In models.py, update _load_keras():
def _load_keras(self, filename: str):
    """Load Keras model (SavedModel format)"""
    if not TF_AVAILABLE:
        return None
    path = os.path.join(self.models_path, filename)
    return tf.keras.models.load_model(path)

# Update load_or_create_models():
# self.dnn_model = self._load_keras('dnn_model_savedmodel')
```

---

## Troubleshooting Model Export

### Issue: "ModuleNotFoundError" when loading pickle
**Cause:** Pickle needs the same classes defined  
**Solution:** Ensure all model-related imports are in models.py

### Issue: "ValueError" with TensorFlow model
**Cause:** Model was saved with different TensorFlow version  
**Solution:** 
- Save with same TensorFlow version you load with
- Or retrain model before exporting

### Issue: MemoryError during training
**Solution:** Reduce batch size in notebook:
```python
history = dnn_model.fit(
    X_train_dnn, y_train_numerical,
    validation_split=0.2,
    epochs=150,
    batch_size=8,  # Reduce from 16 to 8
    callbacks=[early_stop, reduce_lr],
    verbose=1
)
```

---

## Advanced: Custom Feature Preprocessing

If your notebook uses custom preprocessing, update `models.py`:

```python
def prepare_features(self, user_data: Dict) -> np.ndarray:
    """
    Prepare features for model prediction
    Match the preprocessing from your notebook!
    """
    # Get raw features
    features = self._extract_features(user_data)
    
    # Apply same scaling/normalization as notebook
    features = self.scaler.transform(features)  # If you used StandardScaler
    
    # Drop userid column if it was included
    # features = features[:, 1:]  # Drop first column
    
    return features
```

Store the scaler too:
```python
# In notebook
import pickle
with open('./models/feature_scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

# In models.py
self.scaler = self._load_pickle('feature_scaler.pkl')
```

---

## Quick Checklist

- [ ] Added export code to notebook
- [ ] Ran export cell successfully
- [ ] Verified files created in ./models/
- [ ] Moved models/ folder to backend/models/
- [ ] Backend loads models (check console)
- [ ] Frontend shows real predictions
- [ ] Predictions match notebook output
- [ ] All 4 models working

---

## Example: Full Export Sequence

```python
# Cell 1: Import utilities
import pickle
import os
from pathlib import Path

# Cell 2: Function to save all models
def export_all_models(output_dir='./models'):
    """Export all trained models"""
    Path(output_dir).mkdir(exist_ok=True)
    
    models_to_export = {
        'mpt_model.pkl': mpt_model,
        'rl_model_stocks.pkl': rl_model_stocks,
        'rl_model_bonds.pkl': rl_model_bonds,
    }
    
    # Save sklearn/xgb models
    for filename, model in models_to_export.items():
        with open(f'{output_dir}/{filename}', 'wb') as f:
            pickle.dump(model, f)
        print(f"✓ {filename}")
    
    # Save DNN separately (TensorFlow)
    dnn_model.save(f'{output_dir}/dnn_model.h5')
    print("✓ dnn_model.h5")
    
    print(f"\n✅ All models exported to {output_dir}/")

# Cell 3: Execute export
export_all_models()

# Cell 4: Verify
import os
files = os.listdir('./models')
print(f"Files in ./models/: {files}")
```

---

## Next: Test Dashboard

```bash
# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend
# Open frontend/index.html in browser

# Verify:
# 1. User selection works
# 2. Models dropdown shows 4 options
# 3. Predictions appear (not "Loading...")
# 4. Values reasonable (not 0% or 100%)
# 5. All 4 models give different predictions
```

You're all set! 🎉
