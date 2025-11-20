"""
Evaluate all trained models and compare performance
"""

import sys
from pathlib import Path
import pandas as pd
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("="*70)
print("📊 EVALUATING ALL TRAINED MODELS")
print("="*70)
print()

# Load data
data_path = Path('datasets/processed/ml_features.csv')
if not data_path.exists():
    print("❌ ml_features.csv not found!")
    sys.exit(1)

print("📊 Loading data...")
df = pd.read_csv(data_path)
print(f"✅ Loaded {len(df)} samples")

# Prepare features
feature_cols = [c for c in df.columns if c != 'poverty_index']
X = df[feature_cols]
y = df['poverty_index']

print(f"✅ Features: {len(feature_cols)}")

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"✅ Train: {len(X_train)}, Test: {len(X_test)}")
print()

# Check which models exist
model_path = Path('datasets/processed/models')
models_to_check = {
    'Random Forest': 'random_forest_model.pkl',
    'Gradient Boosting': 'gradient_boosting_model.pkl',
    'XGBoost': 'xgboost_model.pkl',
    'LightGBM': 'lightgbm_model.pkl'
}

results = {}

print("🤖 Evaluating models...")
print()

for model_name, model_file in models_to_check.items():
    model_file_path = model_path / model_file
    if model_file_path.exists():
        try:
            print(f"   Loading {model_name}...")
            model = joblib.load(model_file_path)
            
            # Predict
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            r2 = r2_score(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            mae = mean_absolute_error(y_test, y_pred)
            
            results[model_name] = {
                'r2': r2,
                'rmse': rmse,
                'mae': mae,
                'status': '✅ Trained'
            }
            
            print(f"      ✅ R² = {r2:.4f} ({r2*100:.2f}%) | RMSE = {rmse:.2f} | MAE = {mae:.2f}")
            
        except Exception as e:
            print(f"      ❌ Error: {e}")
            results[model_name] = {
                'status': f'❌ Error: {str(e)[:50]}'
            }
    else:
        print(f"   ⚠️ {model_name}: Not found")
        results[model_name] = {
            'status': '❌ Not trained'
        }
    print()

# Summary
print("="*70)
print("📊 MODEL COMPARISON SUMMARY")
print("="*70)
print()

if results:
    trained_models = {k: v for k, v in results.items() if 'r2' in v}
    
    if trained_models:
        print(f"{'Model':<20} {'R² Score':<15} {'RMSE':<15} {'MAE':<15} {'Status':<15}")
        print("-"*70)
        for name, metrics in results.items():
            if 'r2' in metrics:
                print(f"{name:<20} {metrics['r2']:<15.4f} {metrics['rmse']:<15.2f} {metrics['mae']:<15.2f} {metrics['status']:<15}")
            else:
                print(f"{name:<20} {'N/A':<15} {'N/A':<15} {'N/A':<15} {metrics['status']:<15}")
        
        # Find best model
        if trained_models:
            best_model = max(trained_models.items(), key=lambda x: x[1]['r2'])
            print()
            print(f"🏆 Best Model: {best_model[0]}")
            print(f"   R² Score: {best_model[1]['r2']:.4f} ({best_model[1]['r2']*100:.2f}%)")
            print(f"   RMSE: {best_model[1]['rmse']:.2f}")
            print(f"   MAE: {best_model[1]['mae']:.2f}")
    else:
        print("❌ No trained models found!")
else:
    print("❌ No models to evaluate!")

print()
print("="*70)
print(f"📦 Training Status: {len(trained_models) if 'trained_models' in locals() else 0}/4 models complete")
print("="*70)

