"""
Complete training for all 4 models - Optimized version
Trains all models with faster settings but maintains quality
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import time

# Try to import optional models
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False

print("="*70)
print("🚀 COMPLETE MODEL TRAINING - ALL 4 MODELS")
print("="*70)
print()

# Load data
print("📊 Loading data...")
data_path = Path('datasets/processed/ml_features.csv')
if not data_path.exists():
    print("❌ ml_features.csv not found!")
    sys.exit(1)

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

# Model path
model_path = Path('datasets/processed/models')
model_path.mkdir(parents=True, exist_ok=True)

results = {}

# Check which models already exist
models_to_train = {
    'Random Forest': ('random_forest_model.pkl', RandomForestRegressor, {
        'n_estimators': 50,
        'max_depth': 10,
        'min_samples_split': 5,
        'min_samples_leaf': 2,
        'random_state': 42,
        'n_jobs': -1,
        'verbose': 0
    }),
    'Gradient Boosting': ('gradient_boosting_model.pkl', GradientBoostingRegressor, {
        'n_estimators': 50,
        'max_depth': 5,
        'learning_rate': 0.1,
        'random_state': 42,
        'verbose': 0
    }),
    'XGBoost': ('xgboost_model.pkl', None, None),  # Will be handled separately
    'LightGBM': ('lightgbm_model.pkl', None, None)  # Will be handled separately
}

# Filter out models that already exist
existing_models = []
for model_name, (model_file, _, _) in models_to_train.items():
    if (model_path / model_file).exists():
        existing_models.append(model_name)
        print(f"✅ {model_name} already exists, skipping...")

models_to_train_list = [(name, file, cls, params) for name, (file, cls, params) in models_to_train.items() 
                        if name not in existing_models]

if not models_to_train_list:
    print("\n✅ All models already trained! Nothing to do.")
    sys.exit(0)

print(f"\n📊 Training {len(models_to_train_list)} model(s): {', '.join([m[0] for m in models_to_train_list])}")
print()

# 1. Random Forest
if 'Random Forest' not in existing_models:
    try:
        print("🤖 [1/4] Training Random Forest...")
        start_time = time.time()
        rf_model = RandomForestRegressor(
            n_estimators=50,  # Reduced for speed
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            verbose=0
        )
        rf_model.fit(X_train, y_train)
        rf_pred = rf_model.predict(X_test)
        rf_r2 = r2_score(y_test, rf_pred)
        rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
        rf_mae = mean_absolute_error(y_test, rf_pred)
        elapsed = time.time() - start_time
        print(f"   ✅ R² = {rf_r2:.4f} ({rf_r2*100:.2f}%) | RMSE = {rf_rmse:.2f} | Time = {elapsed:.1f}s")
        results['Random Forest'] = {'r2': rf_r2, 'rmse': rf_rmse, 'mae': rf_mae}
        joblib.dump(rf_model, model_path / 'random_forest_model.pkl')
        print()
    except Exception as e:
        print(f"   ❌ Error training Random Forest: {e}")
        print()

# 2. Gradient Boosting
if 'Gradient Boosting' not in existing_models:
    try:
        print("🤖 [2/4] Training Gradient Boosting...")
        start_time = time.time()
        gb_model = GradientBoostingRegressor(
            n_estimators=50,  # Reduced for speed
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            verbose=0
        )
        gb_model.fit(X_train, y_train)
        gb_pred = gb_model.predict(X_test)
        gb_r2 = r2_score(y_test, gb_pred)
        gb_rmse = np.sqrt(mean_squared_error(y_test, gb_pred))
        gb_mae = mean_absolute_error(y_test, gb_pred)
        elapsed = time.time() - start_time
        print(f"   ✅ R² = {gb_r2:.4f} ({gb_r2*100:.2f}%) | RMSE = {gb_rmse:.2f} | Time = {elapsed:.1f}s")
        results['Gradient Boosting'] = {'r2': gb_r2, 'rmse': gb_rmse, 'mae': gb_mae}
        joblib.dump(gb_model, model_path / 'gradient_boosting_model.pkl')
        print()
    except Exception as e:
        print(f"   ❌ Error training Gradient Boosting: {e}")
        print()

# 3. XGBoost
if 'XGBoost' not in existing_models:
    if XGBOOST_AVAILABLE:
        try:
            print("🤖 [3/4] Training XGBoost...")
            start_time = time.time()
            xgb_model = xgb.XGBRegressor(
                n_estimators=50,  # Reduced for speed
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                verbosity=0
            )
            xgb_model.fit(X_train, y_train)
            xgb_pred = xgb_model.predict(X_test)
            xgb_r2 = r2_score(y_test, xgb_pred)
            xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
            xgb_mae = mean_absolute_error(y_test, xgb_pred)
            elapsed = time.time() - start_time
            print(f"   ✅ R² = {xgb_r2:.4f} ({xgb_r2*100:.2f}%) | RMSE = {xgb_rmse:.2f} | Time = {elapsed:.1f}s")
            results['XGBoost'] = {'r2': xgb_r2, 'rmse': xgb_rmse, 'mae': xgb_mae}
            joblib.dump(xgb_model, model_path / 'xgboost_model.pkl')
            print()
        except Exception as e:
            print(f"   ❌ Error training XGBoost: {e}")
            print()
    else:
        print("🤖 [3/4] XGBoost: ⚠️ Not available (install: pip install xgboost)")
        print()

# 4. LightGBM
if 'LightGBM' not in existing_models:
    if LIGHTGBM_AVAILABLE:
        try:
            print("🤖 [4/4] Training LightGBM...")
            start_time = time.time()
            lgb_model = lgb.LGBMRegressor(
                n_estimators=50,  # Reduced for speed
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                verbose=-1
            )
            lgb_model.fit(X_train, y_train)
            lgb_pred = lgb_model.predict(X_test)
            lgb_r2 = r2_score(y_test, lgb_pred)
            lgb_rmse = np.sqrt(mean_squared_error(y_test, lgb_pred))
            lgb_mae = mean_absolute_error(y_test, lgb_pred)
            elapsed = time.time() - start_time
            print(f"   ✅ R² = {lgb_r2:.4f} ({lgb_r2*100:.2f}%) | RMSE = {lgb_rmse:.2f} | Time = {elapsed:.1f}s")
            results['LightGBM'] = {'r2': lgb_r2, 'rmse': lgb_rmse, 'mae': lgb_mae}
            joblib.dump(lgb_model, model_path / 'lightgbm_model.pkl')
            print()
        except Exception as e:
            print(f"   ❌ Error training LightGBM: {e}")
            print()
    else:
        print("🤖 [4/4] LightGBM: ⚠️ Not available (install: pip install lightgbm)")
        print()

# Save feature names
with open(model_path / 'feature_names.txt', 'w') as f:
    f.write('\n'.join(feature_cols))
print("💾 Saved feature names")
print()

# Summary
print("="*70)
print("✅ TRAINING COMPLETED!")
print("="*70)
print()
print(f"{'Model':<20} {'R² Score':<15} {'RMSE':<15} {'MAE':<15}")
print("-"*70)
for name, metrics in results.items():
    print(f"{name:<20} {metrics['r2']:<15.4f} {metrics['rmse']:<15.2f} {metrics['mae']:<15.2f}")

# Find best model
if results:
    best_model = max(results.items(), key=lambda x: x[1]['r2'])
    print()
    print(f"🏆 Best Model: {best_model[0]} (R² = {best_model[1]['r2']:.4f} = {best_model[1]['r2']*100:.2f}%)")
    print()
    print(f"📦 All {len(results)} models saved to: {model_path}")
    print("✅ Training complete! All models ready for production.")

