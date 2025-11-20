"""
Quick script to train Random Forest and Gradient Boosting models
"""

import sys
from pathlib import Path
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

# Load data
print("📊 Loading data...")
data_path = Path('datasets/processed/ml_features.csv')
df = pd.read_csv(data_path)
print(f"✅ Loaded {len(df)} samples")

# Prepare features
feature_cols = [c for c in df.columns if c != 'poverty_index']
X = df[feature_cols]
y = df['poverty_index']

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"✅ Train: {len(X_train)}, Test: {len(X_test)}")

# Train Random Forest (optimized for faster training)
print("\n🤖 Training Random Forest...")
rf_model = RandomForestRegressor(
    n_estimators=50,  # Reduced for faster training
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train, y_train)
rf_pred = rf_model.predict(X_test)
rf_r2 = r2_score(y_test, rf_pred)
print(f"   ✅ R² Score: {rf_r2:.4f} ({rf_r2*100:.2f}%)")

# Train Gradient Boosting
print("\n🤖 Training Gradient Boosting...")
gb_model = GradientBoostingRegressor(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42
)
gb_model.fit(X_train, y_train)
gb_pred = gb_model.predict(X_test)
gb_r2 = r2_score(y_test, gb_pred)
print(f"   ✅ R² Score: {gb_r2:.4f} ({gb_r2*100:.2f}%)")

# Save models
print("\n💾 Saving models...")
model_path = Path('datasets/processed/models')
model_path.mkdir(parents=True, exist_ok=True)

joblib.dump(rf_model, model_path / 'random_forest_model.pkl')
print(f"   ✅ Saved Random Forest")
joblib.dump(gb_model, model_path / 'gradient_boosting_model.pkl')
print(f"   ✅ Saved Gradient Boosting")

# Save feature names
with open(model_path / 'feature_names.txt', 'w') as f:
    f.write('\n'.join(feature_cols))
print(f"   ✅ Saved feature names")

print("\n" + "="*70)
print("✅ TRAINING COMPLETED!")
print("="*70)
print(f"\n📊 Model Performance:")
print(f"   Random Forest: R² = {rf_r2:.4f} ({rf_r2*100:.2f}%)")
print(f"   Gradient Boosting: R² = {gb_r2:.4f} ({gb_r2*100:.2f}%)")

