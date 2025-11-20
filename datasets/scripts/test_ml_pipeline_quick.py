"""
Quick Test: ML Pipeline with Actual Poverty Data
Tests the updated pipeline on a smaller sample to verify changes work correctly
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from ml_pipeline import PovertyMLPipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor

def quick_test():
    """Quick test on smaller sample"""
    print("="*70)
    print("🧪 QUICK TEST: ML Pipeline with Actual Poverty Data")
    print("="*70)
    print()
    
    # Initialize pipeline
    pipeline = PovertyMLPipeline()
    
    # Load a small sample of processed data
    print("📊 Step 1: Loading sample data...")
    processed_file = pipeline.processed_data_path / 'dhs_household_clean.csv'
    
    if not processed_file.exists():
        print("❌ Processed data file not found!")
        return
    
    # Load only first 5000 rows for quick test
    print("   Loading first 5000 samples for quick test...")
    df = pd.read_csv(processed_file, nrows=5000, low_memory=False)
    print(f"✅ Loaded {len(df)} samples")
    
    # Check for hv270
    if 'hv270' not in df.columns:
        print("❌ ERROR: hv270 (wealth quintile) not found in data!")
        print(f"   Available columns: {list(df.columns)[:10]}...")
        return
    
    print(f"✅ Found hv270 column: {df['hv270'].value_counts().to_dict()}")
    print()
    
    # Prepare data manually (simulating what pipeline does)
    print("📊 Step 2: Preparing features and target...")
    
    # Convert hv270 to poverty_index (as per our new logic)
    quintile_map = {
        'poorest': 90,
        'poorer': 70,
        'middle': 50,
        'richer': 30,
        'richest': 10
    }
    
    # Handle both string and numeric
    if df['hv270'].dtype in [np.number, 'int64', 'float64']:
        y = df['hv270'].map({1: 90, 2: 70, 3: 50, 4: 30, 5: 10}).fillna(50)
    else:
        y = df['hv270'].map(quintile_map).fillna(50)
    
    print(f"✅ Created target variable (poverty_index) from hv270")
    print(f"   Target distribution: min={y.min():.1f}, max={y.max():.1f}, mean={y.mean():.1f}")
    print()
    
    # Prepare features (exclude hv270 and hv271)
    print("📊 Step 3: Preparing features...")
    feature_cols = []
    
    # Exclude target and leakage variables
    exclude_cols = ['hv270', 'hv271', 'poverty_index']
    available_cols = [col for col in df.columns if col not in exclude_cols]
    
    # Select numeric columns only
    numeric_cols = df[available_cols].select_dtypes(include=[np.number]).columns
    X = df[numeric_cols].copy()
    
    # Remove hv271 if it somehow got in
    if 'hv271' in X.columns:
        X = X.drop(columns=['hv271'])
    
    # Fill missing values
    X = X.fillna(X.median())
    
    # Remove infinite values
    X = X.replace([np.inf, -np.inf], np.nan).fillna(X.median())
    
    print(f"✅ Prepared {X.shape[1]} features")
    print(f"   Excluded: hv270 (target), hv271 (leakage)")
    print(f"   Features: {list(X.columns[:10])}...")
    print()
    
    # Train/test split
    print("📊 Step 4: Train/Test Split (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"✅ Train set: {len(X_train)} samples")
    print(f"✅ Test set: {len(X_test)} samples")
    print()
    
    # Train model
    print("🤖 Step 5: Training Random Forest model...")
    model = RandomForestRegressor(
        n_estimators=50,  # Reduced for quick test
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    print("✅ Model trained")
    print()
    
    # Evaluate
    print("📊 Step 6: Evaluating model...")
    y_pred = model.predict(X_test)
    
    r2 = r2_score(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    
    # Calculate percentage accuracy
    error_percent = np.abs((y_test - y_pred) / y_test * 100)
    within_10_percent = (error_percent <= 10).mean() * 100
    within_20_percent = (error_percent <= 20).mean() * 100
    
    print("="*70)
    print("🎯 TEST RESULTS")
    print("="*70)
    print(f"\n📈 R² Score: {r2:.4f} ({r2*100:.2f}%)")
    print(f"📉 RMSE: {rmse:.2f}")
    print(f"📉 MAE: {mae:.2f}")
    print(f"\n🎯 Prediction Accuracy:")
    print(f"   - Within 10% error: {within_10_percent:.1f}%")
    print(f"   - Within 20% error: {within_20_percent:.1f}%")
    
    # Assessment
    print(f"\n📊 ASSESSMENT:")
    if r2 >= 0.99:
        print("   ⚠️  SUSPICIOUS: R² ≥ 0.99 - Still indicates potential data leakage")
        print("   ⚠️  Check if hv271 or other leakage variables are still in features")
    elif r2 >= 0.7:
        print("   ✅ EXCELLENT: R² ≥ 0.7 - Model is accurate and realistic")
        print("   ✅ This is good for production use!")
    elif r2 >= 0.6:
        print("   ✅ GOOD: R² ≥ 0.6 - Model is acceptable")
        print("   ✅ This is realistic for poverty prediction")
    elif r2 >= 0.5:
        print("   ⚠️  MODERATE: R² ≥ 0.5 - Model needs improvement")
        print("   ⚠️  May need more features or data")
    else:
        print("   ❌ POOR: R² < 0.5 - Model needs significant improvement")
    
    print("\n" + "="*70)
    print("✅ QUICK TEST COMPLETE")
    print("="*70)
    print("\n💡 Interpretation:")
    print(f"   - If R² is between 0.6-0.85: ✅ Changes are working correctly!")
    print(f"   - If R² is still 1.0: ⚠️  Data leakage still present (check features)")
    print(f"   - If R² is < 0.5: ⚠️  May need more data or better features")
    print()
    
    return {
        'r2': r2,
        'rmse': rmse,
        'mae': mae,
        'within_10_percent': within_10_percent,
        'within_20_percent': within_20_percent
    }

if __name__ == '__main__':
    try:
        results = quick_test()
        if results:
            print(f"\n✅ Test completed successfully!")
            print(f"   R² = {results['r2']:.4f} is {'✅ REALISTIC' if 0.6 <= results['r2'] < 0.99 else '⚠️ CHECK RESULTS'}")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

