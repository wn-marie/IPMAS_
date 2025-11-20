"""
Full Training Script - Skip Preprocessing, Use Processed Data
Trains ML model on all 37,911 samples with actual poverty data
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from ml_pipeline import PovertyMLPipeline

def main():
    """Run full training pipeline"""
    print("="*70)
    print("🚀 FULL ML TRAINING - Using Actual Poverty Data")
    print("="*70)
    print()
    
    # Initialize pipeline
    pipeline = PovertyMLPipeline()
    
    # Step 1: Skip preprocessing (we already have processed data)
    print("📋 Step 1: Skipping preprocessing (using existing processed data)")
    print()
    
    # Step 2: Load datasets (will use processed CSV files)
    print("📊 Step 2: Loading datasets...")
    dhs_data = pipeline.load_dhs_data()
    faostat_data = pipeline.load_faostat_data()
    knbs_data = pipeline.load_knbs_data()
    wb_data = pipeline.load_worldbank_data()
    
    if dhs_data['household'] is None:
        print("❌ ERROR: Could not load DHS data!")
        return
    
    print(f"✅ Loaded DHS data: {dhs_data['household'].shape}")
    print()
    
    # Step 3: Create features
    print("🔧 Step 3: Feature Engineering...")
    features_df = pipeline.create_features(dhs_data, faostat_data, knbs_data, wb_data)
    
    if features_df is None or len(features_df) == 0:
        print("❌ ERROR: Could not create features!")
        return
    
    print(f"✅ Created features: {features_df.shape}")
    
    # Save processed features
    features_file = pipeline.processed_data_path / 'ml_features.csv'
    features_df.to_csv(features_file, index=False)
    print(f"✅ Saved features to {features_file.name}")
    print()
    
    # Step 4: Train/test split
    print("📊 Step 4: Train-Test Split (80/20)...")
    X_train, X_test, y_train, y_test = pipeline.prepare_train_test_split(
        features_df, test_size=0.2, random_state=42
    )
    
    print(f"✅ Train set: {len(X_train)} samples, {X_train.shape[1]} features")
    print(f"✅ Test set: {len(X_test)} samples, {X_test.shape[1]} features")
    print()
    
    # Step 5: Train ALL models (Random Forest, Gradient Boosting, XGBoost, LightGBM)
    print("🤖 Step 5: Training ALL Models...")
    print("   This will train: Random Forest, Gradient Boosting, XGBoost, LightGBM")
    print("   Comparing all models to find the best one...")
    results = pipeline.train_models(X_train, X_test, y_train, y_test)
    
    if not results:
        print("❌ ERROR: Model training failed!")
        return
    
    # Step 6: Print comparison
    pipeline.print_model_comparison(results)
    
    # Step 7: Save best model
    print("\n💾 Step 6: Saving Best Model...")
    pipeline.save_model()
    
    # Step 8: Create visualizations (optional, may take time)
    print("\n📈 Step 7: Creating Visualizations...")
    try:
        from visualizations import ModelVisualizer
        
        # Find best model
        best_model_name = max(results.items(), key=lambda x: x[1]['r2'])[0]
        best_model = results[best_model_name]['model']
        
        visualizer = ModelVisualizer()
        visualizer.create_full_report(
            results, 
            X_test, 
            y_test, 
            pipeline.feature_names
        )
        print("✅ Visualizations created")
    except Exception as e:
        print(f"⚠️ Could not create visualizations: {e}")
        print("   Continuing without visualizations...")
    
    print("\n" + "="*70)
    print("✅ FULL TRAINING COMPLETE!")
    print("="*70)
    print()
    print("📊 Final Results:")
    best_model_name = max(results.items(), key=lambda x: x[1]['r2'])[0]
    best_metrics = results[best_model_name]
    print(f"   Best Model: {best_model_name}")
    print(f"   R² Score: {best_metrics['r2']:.4f} ({best_metrics['r2']*100:.2f}%)")
    print(f"   RMSE: {np.sqrt(best_metrics['mse']):.2f}")
    print(f"   MAE: {best_metrics['mae']:.2f}")
    print()
    print("✅ Model saved to: datasets/processed/models/")
    print("✅ Features saved to: datasets/processed/ml_features.csv")
    print()

if __name__ == '__main__':
    import numpy as np
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Training interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Training failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

