/**
 * ML Prediction Service
 * Integrates Python ML models with Node.js backend
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dbService = require('../config/postgis');

class MLPredictor {
    constructor() {
        // Using LightGBM - best performing model (R² = 56.68%)
        this.modelPath = path.join(__dirname, '../../datasets/processed/models/lightgbm_model.pkl');
        this.scriptPath = path.join(__dirname, '../../datasets/scripts/ml_predict.py');
        this.featuresPath = path.join(__dirname, '../../datasets/processed/models/feature_names.txt');
        this.features = this.loadFeatures();
        // Status tracking
        this.lastMethod = null; // 'ML' | 'Heuristic' | null
        this.lastError = null;
        this.lastPredictionAt = null;
    }

    loadFeatures() {
        try {
            if (fs.existsSync(this.featuresPath)) {
                const features = fs.readFileSync(this.featuresPath, 'utf-8')
                    .split('\n')
                    .filter(f => f.trim());
                console.log(`✅ Loaded ${features.length} ML model features`);
                return features;
            }
            console.log('⚠️ Model features not found');
            return null;
        } catch (error) {
            console.error('Error loading features:', error);
            return null;
        }
    }

    /**
     * Predict poverty index using Python ML model
     * @param {Object} householdData - Household data dictionary
     * @param {Object} locationData - Optional location data with lat/lng
     * @returns {Promise<Object>} Prediction result
     */
    async predict(householdData, locationData = null) {
        if (!this.features) {
            const mock = this.generateMockPrediction(householdData);
            this.lastMethod = mock.method;
            this.lastPredictionAt = new Date().toISOString();
            this.lastError = this.lastError || 'Features not loaded - using heuristic';
            console.warn('⚠️ ML features not loaded; falling back to heuristic prediction');
            return mock;
        }

        try {
            // Create Python script for real-time prediction
            const pythonScript = this.createPredictionScript(householdData);
            
            // Run Python script
            const result = await this.runPythonScript(pythonScript);
            
            if (result.success) {
                const prediction = {
                    poverty_index: result.prediction,
                    confidence: 0.85,
                    model: 'LightGBM',
                    timestamp: new Date().toISOString(),
                    method: 'ML'
                };

                // Update status
                this.lastMethod = 'ML';
                this.lastPredictionAt = prediction.timestamp;
                this.lastError = null;
                
                // Store prediction in database if location provided
                if (locationData && locationData.lat && locationData.lng) {
                    await this.storePrediction(prediction, householdData, locationData);
                }
                
                return prediction;
            } else {
                console.error('Python prediction failed:', result.error);
                this.lastError = result.error || 'Unknown python error';
                const mock = this.generateMockPrediction(householdData);
                this.lastMethod = mock.method;
                this.lastPredictionAt = mock.timestamp;
                console.warn('⚠️ Falling back to heuristic prediction due to python failure');
                return mock;
            }
        } catch (error) {
            console.error('ML prediction error:', error);
            this.lastError = error.message || 'Unhandled ML error';
            const mock = this.generateMockPrediction(householdData);
            this.lastMethod = mock.method;
            this.lastPredictionAt = mock.timestamp;
            console.warn('⚠️ Falling back to heuristic prediction due to exception');
            return mock;
        }
    }

    /**
     * Store prediction in database
     * @param {Object} prediction - Prediction result
     * @param {Object} householdData - Original household data
     * @param {Object} locationData - Location data with lat/lng
     */
    async storePrediction(prediction, householdData, locationData) {
        try {
            // Only store if database is initialized and not in mock mode
            if (!dbService.isInitialized || !dbService.pool) {
                console.log('⚠️ Database not available, skipping prediction storage');
                return;
            }

            const query = `
                INSERT INTO predictions (
                    coordinates,
                    prediction_type,
                    predicted_value,
                    confidence_score,
                    model_version,
                    created_at
                ) VALUES (
                    ST_SetSRID(ST_MakePoint($1, $2), 4326),
                    $3,
                    $4,
                    $5,
                    $6,
                    NOW()
                )
                RETURNING id;
            `;

            const values = [
                locationData.lng,
                locationData.lat,
                'poverty_index',
                prediction.poverty_index,
                prediction.confidence,
                '1.0'
            ];

            const result = await dbService.pool.query(query, values);
            console.log(`✅ Stored prediction in database (ID: ${result.rows[0].id})`);
        } catch (error) {
            console.error('Error storing prediction:', error);
            // Don't fail the prediction if storage fails
        }
    }

    /**
     * Get prediction history for a location
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} limit - Max number of results
     * @returns {Promise<Array>} Prediction history
     */
    async getPredictionHistory(lat, lng, limit = 10) {
        try {
            if (!dbService.isInitialized || !dbService.pool) {
                console.log('⚠️ Database not available');
                return [];
            }

            const query = `
                SELECT 
                    id,
                    ST_X(coordinates) as longitude,
                    ST_Y(coordinates) as latitude,
                    prediction_type,
                    predicted_value,
                    confidence_score,
                    model_version,
                    created_at
                FROM predictions
                WHERE ST_DWithin(
                    coordinates,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326),
                    0.01
                )
                ORDER BY created_at DESC
                LIMIT $3;
            `;

            const result = await dbService.pool.query(query, [lng, lat, limit]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching prediction history:', error);
            return [];
        }
    }

    /**
     * Get bulk predictions for multiple households
     * @param {Array} households - Array of household data objects
     * @returns {Promise<Array>} Predictions
     */
    async bulkPredict(households) {
        try {
            const predictions = [];
            
            for (const household of households) {
                const prediction = await this.predict(household.householdData, household.locationData || null);
                predictions.push({
                    ...prediction,
                    input_data: household.householdData
                });
            }
            
            console.log(`✅ Generated ${predictions.length} bulk predictions`);
            return predictions;
        } catch (error) {
            console.error('Bulk prediction error:', error);
            return [];
        }
    }

    createPredictionScript(householdData) {
        // Use absolute paths to avoid CWD issues on Windows
        const modelAbs = this.modelPath.replace(/\\/g, '\\\\');
        const featuresAbs = this.featuresPath.replace(/\\/g, '\\\\');
        const payload = JSON.stringify(householdData);

        const script = `
import sys
import os
import pandas as pd
import numpy as np
from pathlib import Path

try:
    import joblib
except ImportError:
    import pickle
    
# Absolute paths provided by Node
model_path = r'${modelAbs}'
features_path = r'${featuresAbs}'

# Load model (LightGBM - best performing model) using absolute path
try:
    model = joblib.load(model_path) if 'joblib' in globals() else None
except:
    model = None

if model is None:
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
    except Exception as e:
        print('{"success": false, "error": "Failed to load model: ' + str(e).replace('"','\\\\"') + '"}')
        sys.exit(0)

# Load features (absolute path)
try:
    with open(features_path, 'r') as f:
        features = [line.strip() for line in f.readlines() if line.strip()]
except Exception as e:
    print('{"success": false, "error": "Failed to load feature names: ' + str(e).replace('"','\\\\"') + '"}')
    sys.exit(0)

# Prepare input data
import json
data = json.loads('${payload}')

# Create DataFrame with all features
feature_values = [data.get(f, 0) for f in features]
df = pd.DataFrame([feature_values], columns=features)

# Make prediction
try:
    prediction = float(model.predict(df)[0])
except Exception as e:
    print('{"success": false, "error": "Model prediction failed: ' + str(e).replace('"','\\\\"') + '"}')
    sys.exit(0)

# Return result
print(json.dumps({
    'success': True,
    'prediction': prediction
}))
        `;
        return script;
    }

    async runPythonScript(script) {
        return new Promise((resolve) => {
            try {
                const python = spawn('python', ['-c', script]);
                let output = '';
                let error = '';

                python.stdout.on('data', (data) => {
                    output += data.toString();
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    if (code === 0 && output) {
                        try {
                            const result = JSON.parse(output);
                            resolve(result);
                        } catch (e) {
                            resolve({ success: false, error: 'Could not parse output' });
                        }
                    } else {
                        resolve({ success: false, error: error || `Process exited with code ${code}` });
                    }
                });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    generateMockPrediction(householdData) {
        // Fallback: simple heuristic-based prediction
        let povertyScore = 50;
        
        if (householdData.hv271 || householdData.wealth_index) {
            const wealth = householdData.hv271 || householdData.wealth_index;
            povertyScore = 100 - (wealth / 1000);
        }
        
        if (householdData.hv009 || householdData.household_size) {
            const size = householdData.hv009 || householdData.household_size;
            povertyScore += size * 2;
        }
        
        return {
            poverty_index: Math.max(0, Math.min(100, povertyScore)),
            confidence: 0.60,
            model: 'Mock (Heuristic)',
            timestamp: new Date().toISOString(),
            method: 'Heuristic'
        };
    }

    /**
     * Return current ML service status (for health/debug)
     */
    getStatus() {
        const modelExists = fs.existsSync(this.modelPath);
        const scriptExists = fs.existsSync(this.scriptPath);
        const featuresExists = fs.existsSync(this.featuresPath);
        return {
            model_path: this.modelPath,
            script_path: this.scriptPath,
            features_path: this.featuresPath,
            model_exists: modelExists,
            script_exists: scriptExists,
            features_exists: featuresExists,
            features_loaded: Array.isArray(this.features) ? this.features.length : 0,
            last_method: this.lastMethod,
            last_prediction_at: this.lastPredictionAt,
            last_error: this.lastError
        };
    }
}

// Export singleton instance
const mlPredictor = new MLPredictor();
module.exports = mlPredictor;
