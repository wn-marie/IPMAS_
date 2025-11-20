"""
Train only the missing models (Random Forest and Gradient Boosting)
Optimized for speed with minimal settings
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

print("="*70)
print("🚀 TRAINING MISSING MODELS ONLY")
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
trained_count = 0

# 1. Random Forest
rf_model_file = model_path / 'random_forest_model.pkl'
if not rf_model_file.exists():
    try:
        print("🤖 Training Random Forest (this may take 3-5 minutes)...")
        print("   💡 Tip: This is normal - Random Forest is computationally intensive")
        start_time = time.time()
        rf_model = RandomForestRegressor(
            n_estimators=30,  # Further reduced for speed
            max_depth=8,      # Reduced depth
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,        # Use all CPU cores
            verbose=0
        )
        print("   🔄 Training in progress...")
        rf_model.fit(X_train, y_train)
        rf_pred = rf_model.predict(X_test)
        rf_r2 = r2_score(y_test, rf_pred)
        rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
        rf_mae = mean_absolute_error(y_test, rf_pred)
        elapsed = time.time() - start_time
        print(f"   ✅ R² = {rf_r2:.4f} ({rf_r2*100:.2f}%) | RMSE = {rf_rmse:.2f} | Time = {elapsed:.1f}s")
        results['Random Forest'] = {'r2': rf_r2, 'rmse': rf_rmse, 'mae': rf_mae}
        joblib.dump(rf_model, rf_model_file)
        trained_count += 1
        print()
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print()
else:
    print("✅ Random Forest already exists, skipping...")
    print()

# 2. Gradient Boosting
gb_model_file = model_path / 'gradient_boosting_model.pkl'
if not gb_model_file.exists():
    try:
        print("🤖 Training Gradient Boosting...")
        start_time = time.time()
        gb_model = GradientBoostingRegressor(
            n_estimators=30,  # Reduced for speed
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
        joblib.dump(gb_model, gb_model_file)
        trained_count += 1
        print()
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print()
else:
    print("✅ Gradient Boosting already exists, skipping...")
    print()

# Save feature names
with open(model_path / 'feature_names.txt', 'w') as f:
    f.write('\n'.join(feature_cols))

# Summary
print("="*70)
if trained_count > 0:
    print(f"✅ TRAINING COMPLETED! ({trained_count} model(s) trained)")
    print("="*70)
    print()
    if results:
        print(f"{'Model':<20} {'R² Score':<15} {'RMSE':<15} {'MAE':<15}")
        print("-"*70)
        for name, metrics in results.items():
            print(f"{name:<20} {metrics['r2']:<15.4f} {metrics['rmse']:<15.2f} {metrics['mae']:<15.2f}")
        print()
        print(f"📦 Models saved to: {model_path}")
else:
    print("✅ All models already trained! Nothing to do.")
    print("="*70)

print()
print("💡 Tip: If you want to retrain with higher quality:")
print("   - Increase n_estimators to 100 (takes longer)")
print("   - Run: python datasets/scripts/ml_pipeline.py")

