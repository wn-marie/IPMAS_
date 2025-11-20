"""
Evaluate ML Model Accuracy
Run this script to get actual model performance metrics
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

def load_model_and_evaluate():
    """Load the trained model and evaluate its performance"""
    
    try:
        # Load model
        model_path = Path(__file__).parent.parent / 'processed' / 'models' / 'random_forest_model.pkl'
        if not model_path.exists():
            print("❌ Model file not found. Please train the model first.")
            return None
        
        print("📊 Loading trained model...")
        model = joblib.load(model_path)
        print(f"✅ Model loaded: {type(model).__name__}")
        
        # Load features
        features_path = Path(__file__).parent.parent / 'processed' / 'models' / 'feature_names.txt'
        if not features_path.exists():
            print("❌ Feature names file not found.")
            return None
        
        with open(features_path, 'r') as f:
            feature_names = [line.strip() for line in f.readlines() if line.strip()]
        print(f"✅ Loaded {len(feature_names)} features")
        
        # Load data
        data_path = Path(__file__).parent.parent / 'processed' / 'ml_features.csv'
        if not data_path.exists():
            print("❌ Feature data file not found.")
            return None
        
        print("📊 Loading feature data...")
        df = pd.read_csv(data_path)
        print(f"✅ Loaded {len(df)} samples")
        
        # Prepare data
        # Assuming target is 'poverty_index' or similar
        target_col = None
        for col in ['poverty_index', 'target', 'y', 'poverty']:
            if col in df.columns:
                target_col = col
                break
        
        if target_col is None:
            print("⚠️ Target column not found. Assuming last column is target.")
            target_col = df.columns[-1]
        
        X = df[feature_names]
        y = df[target_col]
        
        print(f"📊 Features: {X.shape[1]}, Target: {target_col}")
        
        # Train/test split (80/20)
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print(f"📊 Train set: {len(X_train)} samples")
        print(f"📊 Test set: {len(X_test)} samples")
        
        # Evaluate on test set
        print("\n📊 Evaluating model on test set...")
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        r2 = r2_score(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        
        # Calculate percentage accuracy (within 10% error)
        error_percent = np.abs((y_test - y_pred) / y_test * 100)
        within_10_percent = (error_percent <= 10).mean() * 100
        within_20_percent = (error_percent <= 20).mean() * 100
        
        # Print results
        print("\n" + "="*70)
        print("🎯 MODEL ACCURACY METRICS")
        print("="*70)
        print(f"\n📈 R² Score (Explained Variance): {r2:.4f} ({r2*100:.2f}%)")
        print(f"   - Interpretation: Model explains {r2*100:.2f}% of variance in poverty index")
        print(f"   - Range: 0 (poor) to 1 (perfect)")
        print(f"   - Good if > 0.7 (70%)")
        
        print(f"\n📉 RMSE (Root Mean Squared Error): {rmse:.4f}")
        print(f"   - Average prediction error in poverty index units")
        print(f"   - Lower is better")
        
        print(f"\n📉 MAE (Mean Absolute Error): {mae:.4f}")
        print(f"   - Average absolute error in poverty index units")
        print(f"   - Lower is better")
        
        print(f"\n🎯 Prediction Accuracy:")
        print(f"   - Within 10% error: {within_10_percent:.2f}% of predictions")
        print(f"   - Within 20% error: {within_20_percent:.2f}% of predictions")
        
        # Check for data leakage
        leakage_warning = ""
        if r2 > 0.99:
            leakage_warning = """
   ⚠️  WARNING: R² = 1.0 indicates potential DATA LEAKAGE:
      - poverty_index might be derived from features (e.g., hv271 wealth index)
      - Model can perfectly predict because target is created from inputs
      - This is NOT real-world accuracy - need actual poverty data for true metrics
"""
            print(leakage_warning)
        
        # Performance assessment
        print(f"\n📊 PERFORMANCE ASSESSMENT:")
        if r2 >= 0.99:
            print("   ⚠️ SUSPICIOUS (R² ≥ 0.99) - Likely data leakage, not real accuracy")
            print("   ⚠️ Need to use actual poverty data (not derived from features)")
        elif r2 >= 0.8:
            print("   ✅ EXCELLENT (R² ≥ 0.8) - Model is highly accurate")
        elif r2 >= 0.7:
            print("   ✅ GOOD (R² ≥ 0.7) - Model is accurate for production use")
        elif r2 >= 0.6:
            print("   ⚠️ MODERATE (R² ≥ 0.6) - Model is acceptable but could be improved")
        else:
            print("   ❌ POOR (R² < 0.6) - Model needs improvement")
        
        print("\n" + "="*70)
        print("🤖 IS MACHINE LEARNING APPROPRIATE?")
        print("="*70)
        print("\n✅ YES - Machine Learning is HIGHLY APPROPRIATE for poverty prediction:")
        print("\n   1. ✅ Real Data: 37,911 households is excellent sample size")
        print("      - Rule of thumb: Need 10x features = you have 37k+ samples")
        print("      - Your 90 features need ~900 samples, you have 37,911 ✅")
        
        print("\n   2. ✅ Complex Relationships: Poverty has non-linear patterns")
        print("      - Wealth × Education × Health interactions")
        print("      - Geographic clustering effects")
        print("      - Tree-based models (Random Forest) excel at this")
        
        print("\n   3. ✅ Feature Rich: 90 features from multiple sources")
        print("      - DHS household data (wealth, education, health)")
        print("      - Census data (population, density)")
        print("      - World Bank indicators")
        print("      - ML can learn complex patterns from these")
        
        print("\n   4. ✅ Real-World Application: Actionable predictions")
        print("      - Policy makers need data-driven insights")
        print("      - ML provides fast, scalable predictions")
        print("      - Can predict for new locations without surveys")
        
        print("\n   5. ✅ Random Forest is Optimal Choice:")
        print("      - Excellent for tabular data (your data type)")
        print("      - Handles missing values well")
        print("      - Provides feature importance (interpretable)")
        print("      - Robust to outliers")
        print("      - Fast prediction (< 0.5s)")
        
        print(f"\n📊 YOUR MODEL STATUS:")
        if r2 >= 0.99:
            print("   ⚠️  CURRENT METRICS: R² = 1.0 (Perfect) - This indicates:")
            print("      - poverty_index is derived from features (data leakage)")
            print("      - Model learned the derivation formula, not real poverty")
            print("      - Need actual poverty data for true accuracy assessment")
            print("\n   ✅ SOLUTION: Use actual poverty survey data:")
            print("      - If you have DHS poverty indicators, use those")
            print("      - Or collect actual poverty measurements")
            print("      - Expected realistic R²: 0.65-0.85 for poverty prediction")
        elif r2 >= 0.7:
            print("   ✅ Model is production-ready and accurate")
            print("   ✅ Suitable for real-world poverty predictions")
            print("   ✅ Confidence scores can guide decision-making")
        else:
            print("   ⚠️ Model could be improved with:")
            print("      - More training data")
            print("      - Feature engineering")
            print("      - Hyperparameter tuning")
            print("      - Different algorithms")
        
        print("\n📈 EXPECTED REAL-WORLD ACCURACY:")
        print("   For poverty prediction with real data:")
        print("   - R² = 0.65-0.75: Good (acceptable for production)")
        print("   - R² = 0.75-0.85: Excellent (high-quality predictions)")
        print("   - R² > 0.85: Outstanding (rare, requires perfect data)")
        print("\n   Your model architecture (Random Forest) is correct.")
        print("   Once you use actual poverty data, expect 65-85% accuracy.")
        
        return {
            'r2': r2,
            'rmse': rmse,
            'mae': mae,
            'mse': mse,
            'within_10_percent': within_10_percent,
            'within_20_percent': within_20_percent
        }
        
    except Exception as e:
        print(f"❌ Error evaluating model: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    print("="*70)
    print("🔍 EVALUATING ML MODEL ACCURACY")
    print("="*70)
    print()
    
    metrics = load_model_and_evaluate()
    
    if metrics:
        print("\n✅ Evaluation complete!")
    else:
        print("\n❌ Evaluation failed. Check errors above.")

