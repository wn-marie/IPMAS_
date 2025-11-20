"""
Complete Training Script - Train all missing models
This script trains only the models that are missing or need retraining
"""

import sys
from pathlib import Path
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

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

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))
from ml_pipeline import PovertyMLPipeline

def check_existing_models():
    """Check which models already exist"""
    model_path = Path('datasets/processed/models')
    models = {
        'Random Forest': model_path / 'random_forest_model.pkl',
        'Gradient Boosting': model_path / 'gradient_boosting_model.pkl',
        'XGBoost': model_path / 'xgboost_model.pkl',
        'LightGBM': model_path / 'lightgbm_model.pkl'
    }
    
    existing = []
    missing = []
    
    for name, file in models.items():
        if file.exists():
            existing.append(name)
        else:
            missing.append(name)
    
    return existing, missing

def main():
    print("="*70)
    print("🎯 COMPLETE ML MODEL TRAINING")
    print("="*70)
    print()
    
    # Check existing models
    existing, missing = check_existing_models()
    print(f"📊 Existing models: {len(existing)}")
    if existing:
        print(f"   ✅ {', '.join(existing)}")
    print(f"📊 Missing models: {len(missing)}")
    if missing:
        print(f"   ❌ {', '.join(missing)}")
    print()
    
    # Check if we need to train
    if not missing and len(existing) >= 2:
        print("✅ All models are already trained!")
        print("   If you want to retrain with updated features, run:")
        print("   python datasets/scripts/ml_pipeline.py")
        return
    
    # Initialize pipeline
    print("🚀 Initializing ML Pipeline...")
    pipeline = PovertyMLPipeline()
    
    # Load and prepare data
    print("\n📊 Loading and preparing data...")
    try:
        # Load features
        features_path = pipeline.processed_data_path / 'ml_features.csv'
        if not features_path.exists():
            print("❌ ml_features.csv not found. Running full feature engineering...")
            # Run full pipeline to create features
            pipeline.run_full_pipeline(use_preprocessed=False)
            return
        
        df = pd.read_csv(features_path)
        print(f"✅ Loaded {len(df)} samples")
        
        # Check if poverty_index exists
        if 'poverty_index' not in df.columns:
            print("❌ poverty_index not found. Running full pipeline...")
            pipeline.run_full_pipeline(use_preprocessed=False)
            return
        
        # Prepare features
        feature_cols = [c for c in df.columns if c != 'poverty_index']
        X = df[feature_cols]
        y = df['poverty_index']
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        print(f"✅ Train set: {len(X_train)} samples")
        print(f"✅ Test set: {len(X_test)} samples")
        print(f"✅ Features: {len(feature_cols)}")
        
        # Store feature names
        pipeline.feature_names = feature_cols
        
        # Train missing models
        print("\n🤖 Training models...")
        results = {}
        
        # Train Random Forest if missing
        if 'Random Forest' in missing:
            print("   Training Random Forest...")
            rf_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
            rf_model.fit(X_train, y_train)
            rf_pred = rf_model.predict(X_test)
            results['Random Forest'] = {
                'model': rf_model,
                'mse': mean_squared_error(y_test, rf_pred),
                'mae': mean_absolute_error(y_test, rf_pred),
                'r2': r2_score(y_test, rf_pred),
                'predictions': rf_pred
            }
            print(f"      ✅ R² Score: {results['Random Forest']['r2']:.4f}")
        
        # Train Gradient Boosting if missing
        if 'Gradient Boosting' in missing:
            print("   Training Gradient Boosting...")
            gb_model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            )
            gb_model.fit(X_train, y_train)
            gb_pred = gb_model.predict(X_test)
            results['Gradient Boosting'] = {
                'model': gb_model,
                'mse': mean_squared_error(y_test, gb_pred),
                'mae': mean_absolute_error(y_test, gb_pred),
                'r2': r2_score(y_test, gb_pred),
                'predictions': gb_pred
            }
            print(f"      ✅ R² Score: {results['Gradient Boosting']['r2']:.4f}")
        
        # Train XGBoost if missing and available
        if 'XGBoost' in missing and XGBOOST_AVAILABLE:
            print("   Training XGBoost...")
            xgb_model = xgb.XGBRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1
            )
            xgb_model.fit(X_train, y_train)
            xgb_pred = xgb_model.predict(X_test)
            results['XGBoost'] = {
                'model': xgb_model,
                'mse': mean_squared_error(y_test, xgb_pred),
                'mae': mean_absolute_error(y_test, xgb_pred),
                'r2': r2_score(y_test, xgb_pred),
                'predictions': xgb_pred
            }
            print(f"      ✅ R² Score: {results['XGBoost']['r2']:.4f}")
        elif 'XGBoost' in missing:
            print("   ⚠️ XGBoost not available (install with: pip install xgboost)")
        
        # Train LightGBM if missing and available
        if 'LightGBM' in missing and LIGHTGBM_AVAILABLE:
            print("   Training LightGBM...")
            lgb_model = lgb.LGBMRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                verbose=-1
            )
            lgb_model.fit(X_train, y_train)
            lgb_pred = lgb_model.predict(X_test)
            results['LightGBM'] = {
                'model': lgb_model,
                'mse': mean_squared_error(y_test, lgb_pred),
                'mae': mean_absolute_error(y_test, lgb_pred),
                'r2': r2_score(y_test, lgb_pred),
                'predictions': lgb_pred
            }
            print(f"      ✅ R² Score: {results['LightGBM']['r2']:.4f}")
        elif 'LightGBM' in missing:
            print("   ⚠️ LightGBM not available (install with: pip install lightgbm)")
        
        # Save models
        if results:
            print("\n💾 Saving models...")
            model_path = pipeline.processed_data_path / 'models'
            model_path.mkdir(parents=True, exist_ok=True)
            
            for model_name, model_data in results.items():
                model_file = model_path / f'{model_name.replace(" ", "_").lower()}_model.pkl'
                joblib.dump(model_data['model'], model_file)
                print(f"   ✅ Saved {model_name} to {model_file}")
            
            # Save feature names
            feature_file = model_path / 'feature_names.txt'
            with open(feature_file, 'w') as f:
                f.write('\n'.join(feature_cols))
            print(f"   ✅ Saved feature names to {feature_file}")
            
            print("\n" + "="*70)
            print("✅ TRAINING COMPLETED!")
            print("="*70)
            print(f"\n📊 Models trained: {len(results)}")
            for name, data in results.items():
                print(f"   {name}: R² = {data['r2']:.4f} ({data['r2']*100:.2f}%)")
        else:
            print("\n✅ All models already exist!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Try running the full pipeline instead:")
        print("   python datasets/scripts/ml_pipeline.py")

if __name__ == '__main__':
    main()

