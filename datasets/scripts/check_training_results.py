"""
Check Training Results - Verify which model was just trained
"""

import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def check_training_results():
    """Check which models exist and evaluate the latest one"""
    print("="*70)
    print("📊 CHECKING TRAINING RESULTS")
    print("="*70)
    print()
    
    model_path = Path('datasets/processed/models')
    
    # Check all model files
    model_files = {
        'Random Forest': model_path / 'random_forest_model.pkl',
        'Gradient Boosting': model_path / 'gradient_boosting_model.pkl',
        'XGBoost': model_path / 'xgboost_model.pkl',
        'LightGBM': model_path / 'lightgbm_model.pkl'
    }
    
    print("📁 Model Files Status:")
    for name, file in model_files.items():
        if file.exists():
            size_kb = file.stat().st_size / 1024
            mod_time = file.stat().st_mtime
            print(f"   ✅ {name}: {size_kb:.1f} KB (modified: {mod_time})")
        else:
            print(f"   ❌ {name}: Not found")
    print()
    
    # Load the latest features
    features_file = Path('datasets/processed/ml_features.csv')
    if not features_file.exists():
        print("❌ ml_features.csv not found!")
        return
    
    print("📊 Loading feature data...")
    df = pd.read_csv(features_file)
    print(f"✅ Loaded {len(df)} samples")
    
    # Check features
    if 'poverty_index' not in df.columns:
        print("❌ poverty_index not found in features!")
        return
    
    feature_cols = [c for c in df.columns if c != 'poverty_index']
    print(f"✅ Found {len(feature_cols)} features")
    print(f"   Features: {feature_cols}")
    print()
    
    # Try to evaluate with Gradient Boosting (newest model)
    if model_files['Gradient Boosting'].exists():
        print("🤖 Evaluating Gradient Boosting Model (newest)...")
        try:
            model = joblib.load(model_files['Gradient Boosting'])
            
            # Prepare data
            X = df[feature_cols]
            y = df['poverty_index']
            
            # Train/test split
            from sklearn.model_selection import train_test_split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Predict
            y_pred = model.predict(X_test)
            
            # Metrics
            r2 = r2_score(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            mae = mean_absolute_error(y_test, y_pred)
            
            print("="*70)
            print("🎯 GRADIENT BOOSTING MODEL RESULTS")
            print("="*70)
            print(f"\n📈 R² Score: {r2:.4f} ({r2*100:.2f}%)")
            print(f"📉 RMSE: {rmse:.2f}")
            print(f"📉 MAE: {mae:.2f}")
            
            # Assessment
            print(f"\n📊 ASSESSMENT:")
            if r2 >= 0.99:
                print("   ⚠️  SUSPICIOUS: R² ≥ 0.99 - Possible data leakage")
            elif r2 >= 0.7:
                print("   ✅ EXCELLENT: Model is accurate and realistic!")
                print("   ✅ Ready for production use!")
            elif r2 >= 0.6:
                print("   ✅ GOOD: Model is acceptable for production")
            else:
                print("   ⚠️  Needs improvement")
            
            print("\n" + "="*70)
            
        except Exception as e:
            print(f"❌ Error evaluating model: {e}")
            import traceback
            traceback.print_exc()
    
    # Also check Random Forest
    if model_files['Random Forest'].exists():
        print("\n🤖 Checking Random Forest Model...")
        try:
            model = joblib.load(model_files['Random Forest'])
            print(f"   Model type: {type(model).__name__}")
            if hasattr(model, 'feature_names_in_'):
                print(f"   Features in model: {len(model.feature_names_in_)}")
                print(f"   First 10: {list(model.feature_names_in_[:10])}")
            else:
                print("   No feature names stored")
        except Exception as e:
            print(f"   ⚠️ Could not load: {e}")

if __name__ == '__main__':
    check_training_results()

