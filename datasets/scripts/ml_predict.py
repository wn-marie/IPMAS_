"""
Standalone ML Prediction Script
Simple Python script for real-time poverty predictions
"""

import sys
import json
import pandas as pd
from pathlib import Path

# Add parent directory to path for imports
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

def load_model_and_features():
    """Load the trained model and feature names"""
    try:
        # Try to load with joblib first
        try:
            import joblib
            model = joblib.load('processed/models/random_forest_model.pkl')
        except ImportError:
            import pickle
            with open('processed/models/random_forest_model.pkl', 'rb') as f:
                model = pickle.load(f)
        
        # Load features
        with open('processed/models/feature_names.txt', 'r') as f:
            features = [line.strip() for line in f.readlines()]
        
        return model, features
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        sys.exit(1)

def predict(household_data, model, features):
    """Make a poverty prediction"""
    try:
        # Create feature vector with default values
        feature_values = [household_data.get(f, 0) for f in features]
        df = pd.DataFrame([feature_values], columns=features)
        
        # Make prediction
        prediction = model.predict(df)[0]
        
        return float(prediction)
    except Exception as e:
        print(f"Error making prediction: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """Main prediction function"""
    if len(sys.argv) < 2:
        print("Usage: python ml_predict.py '{\"hv271\": 50000, \"hv009\": 5}'", file=sys.stderr)
        sys.exit(1)
    
    # Parse household data from command line
    try:
        household_data = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Load model
    model, features = load_model_and_features()
    
    # Make prediction
    prediction = predict(household_data, model, features)
    
    # Output result as JSON
    result = {
        'success': True,
        'prediction': prediction
    }
    print(json.dumps(result))
    sys.exit(0)

if __name__ == '__main__':
    main()
