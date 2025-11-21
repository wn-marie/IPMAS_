const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');
const mlPredictor = require('../services/mlPredictor');

// Get poverty analytics for a location
router.get('/poverty', async (req, res) => {
    try {
        const { lat, lng, timeRange = '1y' } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Missing coordinates',
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates must be valid numbers'
            });
        }

        const analytics = await dbService.getPovertyAnalytics(latitude, longitude, timeRange);
        
        if (!analytics) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No poverty analytics available for this location'
            });
        }

        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            analytics: analytics
        });
    } catch (error) {
        console.error('Poverty analytics error:', error);
        res.status(500).json({
            error: 'Analytics retrieval failed',
            message: 'Unable to retrieve poverty analytics'
        });
    }
});

// Get health analytics for a location
router.get('/health', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Missing coordinates',
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates must be valid numbers'
            });
        }

        const analytics = await dbService.getHealthAnalytics(latitude, longitude);
        
        if (!analytics) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No health analytics available for this location'
            });
        }

        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            analytics: analytics
        });
    } catch (error) {
        console.error('Health analytics error:', error);
        res.status(500).json({
            error: 'Analytics retrieval failed',
            message: 'Unable to retrieve health analytics'
        });
    }
});

// Get education analytics for a location
router.get('/education', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Missing coordinates',
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates must be valid numbers'
            });
        }

        const analytics = await dbService.getEducationAnalytics(latitude, longitude);
        
        if (!analytics) {
            return res.status(404).json({
                error: 'No data found',
                message: 'No education analytics available for this location'
            });
        }

        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            analytics: analytics
        });
    } catch (error) {
        console.error('Education analytics error:', error);
        res.status(500).json({
            error: 'Analytics retrieval failed',
            message: 'Unable to retrieve education analytics'
        });
    }
});

// Get trend analysis for a location
router.get('/trends', async (req, res) => {
    try {
        const { lat, lng, metric, period = '1y' } = req.query;
        
        if (!lat || !lng || !metric) {
            return res.status(400).json({
                error: 'Missing parameters',
                message: 'Latitude, longitude, and metric are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates must be valid numbers'
            });
        }

        const validMetrics = ['poverty', 'education', 'health', 'water', 'employment', 'housing'];
        if (!validMetrics.includes(metric)) {
            return res.status(400).json({
                error: 'Invalid metric',
                message: `Metric must be one of: ${validMetrics.join(', ')}`
            });
        }

        const location = await dbService.getLocationData(latitude, longitude);
        if (!location) {
            return res.status(404).json({
                error: 'Location not found',
                message: 'No data available for the specified coordinates'
            });
        }

        const trends = dbService.generateTrendAnalysis(metric, location[`${metric}_index`] || location[`${metric}_access`] || location[`${metric}_vulnerability`] || 50);
        const historical = dbService.generateHistoricalData(metric, location[`${metric}_index`] || location[`${metric}_access`] || location[`${metric}_vulnerability`] || 50, period);

        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            metric: metric,
            period: period,
            trends: trends,
            historical: historical
        });
    } catch (error) {
        console.error('Trend analysis error:', error);
        res.status(500).json({
            error: 'Trend analysis failed',
            message: 'Unable to retrieve trend analysis'
        });
    }
});

// Get all poverty data for real-time updates
router.get('/poverty/all', async (req, res) => {
    try {
        console.log('📊 Fetching all poverty data for real-time updates');
        
        // Get all poverty data from database
        const allPovertyData = await dbService.getAllPovertyData();
        
        if (!allPovertyData || allPovertyData.length === 0) {
            // Return sample data if no database data available
            let sampleData = null;
            try {
                const sampleDataPath = require('path').join(__dirname, '../../frontend/public/data/sample-data-enhanced.js');
                // Try to load sample data, but don't fail if it doesn't exist
                if (require('fs').existsSync(sampleDataPath.replace('.js', '.js'))) {
                    delete require.cache[require.resolve('../../frontend/public/data/sample-data-enhanced')];
                    sampleData = require('../../frontend/public/data/sample-data-enhanced');
                }
            } catch (err) {
                console.log('Sample data not available, returning empty result');
            }
            
            if (sampleData && sampleData.locations) {
                const geoJsonData = {
                    type: "FeatureCollection",
                    features: sampleData.locations.map(location => ({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [location.lng, location.lat]
                        },
                        properties: {
                            name: location.name,
                            county: location.county,
                            ward: location.ward,
                            poverty_index: location.poverty_index,
                            education_access: location.education_access,
                            health_vulnerability: location.health_vulnerability,
                            water_access: location.water_access,
                            housing_quality: location.housing_quality,
                            population: location.population,
                            last_updated: new Date().toISOString()
                        }
                    }))
                };
                
                return res.json(geoJsonData);
            }
            
            return res.status(404).json({
                error: 'No data available',
                message: 'No poverty data found'
            });
        }
        
        // Convert database data to GeoJSON format
        const geoJsonData = {
            type: "FeatureCollection",
            features: allPovertyData.map(item => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [item.longitude, item.latitude]
                },
                properties: {
                    name: item.name,
                    county: item.county,
                    ward: null, // Not in current schema
                    poverty_index: item.poverty_index,
                    education_access: item.education_access,
                    health_vulnerability: item.health_vulnerability,
                    water_access: item.water_access,
                    housing_quality: item.housing_quality,
                    population: null, // Not in current schema
                    last_updated: item.updated_at || new Date().toISOString()
                }
            }))
        };
        
        res.json(geoJsonData);
        
    } catch (error) {
        console.error('Error fetching all poverty data:', error);
        res.status(500).json({
            error: 'Failed to fetch poverty data',
            message: 'Unable to retrieve poverty data'
        });
    }
});

// Geocoding proxy for Nominatim API
router.get('/geocoding/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'Invalid query',
                message: 'Search query must be at least 2 characters long'
            });
        }
        
        console.log('🔍 Geocoding search:', q);
        
        // Call Nominatim API from backend
        const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
        nominatimUrl.searchParams.set('q', q);
        nominatimUrl.searchParams.set('format', 'json');
        nominatimUrl.searchParams.set('limit', limit.toString());
        nominatimUrl.searchParams.set('addressdetails', '1');
        nominatimUrl.searchParams.set('extratags', '1');
        nominatimUrl.searchParams.set('namedetails', '1');
        
        const response = await fetch(nominatimUrl.toString(), {
            headers: {
                'User-Agent': 'IPMAS-System/1.0 (https://ipmas.kenya.gov)',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        res.json(data);
        
    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({
            error: 'Geocoding failed',
            message: 'Unable to search for locations',
            details: error.message
        });
    }
});

// Reverse geocoding proxy for Nominatim API
router.get('/geocoding/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({
                error: 'Invalid parameters',
                message: 'Both lat and lon are required'
            });
        }
        
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        
        if (isNaN(latNum) || isNaN(lonNum)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'lat and lon must be valid numbers'
            });
        }
        
        if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates out of valid range'
            });
        }
        
        console.log('🔍 Reverse geocoding:', lat, lon);
        
        // Call Nominatim reverse geocoding API from backend
        const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse');
        nominatimUrl.searchParams.set('lat', lat);
        nominatimUrl.searchParams.set('lon', lon);
        nominatimUrl.searchParams.set('format', 'json');
        nominatimUrl.searchParams.set('addressdetails', '1');
        
        const response = await fetch(nominatimUrl.toString(), {
            headers: {
                'User-Agent': 'IPMAS-System/1.0 (https://ipmas.kenya.gov)',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        res.json(data);
        
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({
            error: 'Reverse geocoding failed',
            message: 'Unable to get location details',
            details: error.message
        });
    }
});

// ML Prediction endpoint for poverty index
router.post('/ml-predict', async (req, res) => {
    try {
        const { householdData, locationData } = req.body;
        
        if (!householdData) {
            return res.status(400).json({
                error: 'Missing data',
                message: 'householdData is required for ML prediction'
            });
        }

        console.log('📊 ML Prediction requested for household data');
        
        // Get prediction from ML service (with optional location data for storage)
        const prediction = await mlPredictor.predict(householdData, locationData || null);
        
        res.json({
            success: true,
            prediction: prediction,
            message: prediction.method === 'ML' 
                ? 'Using trained ML model prediction' 
                : 'Using fallback heuristic prediction'
        });
    } catch (error) {
        console.error('ML prediction error:', error);
        res.status(500).json({
            error: 'Prediction failed',
            message: 'Unable to generate poverty prediction'
        });
    }
});

// ML service status
router.get('/ml-status', async (_req, res) => {
    try {
        const status = mlPredictor.getStatus();
        res.json({
            success: true,
            status
        });
    } catch (error) {
        console.error('ML status error:', error);
        res.status(500).json({ success: false, error: 'Unable to fetch ML status' });
    }
});

// Bulk ML Prediction endpoint
router.post('/ml-predict-bulk', async (req, res) => {
    try {
        const { households } = req.body;
        
        if (!households || !Array.isArray(households)) {
            return res.status(400).json({
                error: 'Missing data',
                message: 'households array is required for bulk prediction'
            });
        }

        console.log(`📊 Bulk ML Prediction requested for ${households.length} households`);
        
        // Get bulk predictions
        const predictions = await mlPredictor.bulkPredict(households);
        
        res.json({
            success: true,
            count: predictions.length,
            predictions: predictions,
            message: `Generated ${predictions.length} predictions successfully`
        });
    } catch (error) {
        console.error('Bulk prediction error:', error);
        res.status(500).json({
            error: 'Prediction failed',
            message: 'Unable to generate bulk predictions'
        });
    }
});

// Prediction history endpoint
router.get('/ml-predict-history', async (req, res) => {
    try {
        const { lat, lng, limit = 10 } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Missing coordinates',
                message: 'lat and lng are required'
            });
        }

        console.log('📊 Fetching prediction history');
        
        // Get prediction history
        const history = await mlPredictor.getPredictionHistory(
            parseFloat(lat), 
            parseFloat(lng), 
            parseInt(limit)
        );
        
        res.json({
            success: true,
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            count: history.length,
            history: history
        });
    } catch (error) {
        console.error('Prediction history error:', error);
        res.status(500).json({
            error: 'History retrieval failed',
            message: 'Unable to fetch prediction history'
        });
    }
});

// ML smoke test (runs a minimal prediction to verify ML path)
router.post('/ml-smoke', async (req, res) => {
    try {
        const sample = req.body?.householdData || {
            hv271: 500,          // wealth_index (scaled)
            hv009: 5,            // household_size
            education_years: 7,
            water_access: 70,
            electricity: 1
        };
        const result = await mlPredictor.predict(sample, null);
        res.json({
            success: true,
            method: result.method,
            prediction: result.poverty_index,
            confidence: result.confidence
        });
    } catch (error) {
        console.error('ML smoke test error:', error);
        res.status(500).json({ success: false, error: 'Smoke test failed' });
    }
});

module.exports = router;
