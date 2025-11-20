"""
ML Model Deployment Helper
==========================
Helper script to load and use the trained poverty prediction model
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

def load_model():
    """Load the trained poverty prediction model"""
    try:
        import joblib
        model_path = Path('datasets/processed/models/random_forest_model.pkl')
        if not model_path.exists():
            print("Model file not found!")
            return None
        model = joblib.load(model_path)
        print(f"✅ Model loaded successfully: {type(model).__name__}")
        return model
    except ImportError:
        import pickle
        model_path = Path('datasets/processed/models/random_forest_model.pkl')
        model = pickle.load(open(model_path, 'rb'))
        print(f"✅ Model loaded successfully: {type(model).__name__}")
        return model
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return None

def load_feature_names():
    """Load the list of feature names used by the model"""
    try:
        feature_path = Path('datasets/processed/models/feature_names.txt')
        with open(feature_path, 'r') as f:
            features = [line.strip() for line in f.readlines()]
        print(f"✅ Loaded {len(features)} feature names")
        return features
    except Exception as e:
        print(f"❌ Error loading features: {e}")
        return None

def predict_poverty(new_data_dict):
    """
    Make poverty index predictions for new data
    
    Args:
        new_data_dict: Dictionary with feature names as keys and values
        
    Returns:
        Predicted poverty index (0-100)
    """
    model = load_model()
    if model is None:
        return None
    
    features = load_feature_names()
    if features is None:
        return None
    
    # Create DataFrame with correct feature order
    try:
        feature_values = [new_data_dict.get(f, 0) for f in features]
        df = pd.DataFrame([feature_values], columns=features)
        
        # Make prediction
        prediction = model.predict(df)[0]
        
        print(f"📊 Predicted Poverty Index: {prediction:.2f}%")
        return prediction
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return None

if __name__ == '__main__':
    print("="*70)
    print("🤖 IPMAS2 Poverty Prediction Model Deployment Helper")
    print("="*70)
    
    # Test loading
    model = load_model()
    features = load_feature_names()
    
    if model and features:
        print(f"\n✅ Model ready for deployment!")
        print(f"   Type: {type(model).__name__}")
        print(f"   Features: {len(features)}")
        print(f"\n📚 Example usage:")
        print("""
        from deploy_model import predict_poverty
        
        # Sample household data
        household_data = {
            'hv271': 50000,      # Wealth index
            'hv009': 5,          # Household size
            'hv012': 6,          # Number of women
            'hv013': 3,          # Number of men
            # ... other features ...
        }
        
        poverty_index = predict_poverty(household_data)
        print(f"Predicted poverty: {poverty_index:.1f}%")
        """)
    else:
        print("\n⚠️ Model not ready - run ml_pipeline.py first!")
