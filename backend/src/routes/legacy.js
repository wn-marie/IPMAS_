const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');

// Legacy data endpoint - general data retrieval
router.get('/data', async (req, res) => {
    try {
        const { lat, lng, type = 'all' } = req.query;
        
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            
            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({
                    error: 'Invalid coordinates',
                    message: 'Coordinates must be valid numbers'
                });
            }

            const locationData = await dbService.getLocationData(latitude, longitude);
            
            if (!locationData) {
                return res.status(404).json({
                    error: 'Location not found',
                    message: 'No data available for the specified coordinates'
                });
            }

            // Return data based on type
            let responseData = locationData;
            if (type === 'poverty') {
                responseData = { poverty_index: locationData.poverty_index };
            } else if (type === 'education') {
                responseData = { education_access: locationData.education_access };
            } else if (type === 'health') {
                responseData = { health_vulnerability: locationData.health_vulnerability };
            }

            res.json({
                success: true,
                location: { lat: latitude, lng: longitude },
                type: type,
                data: responseData
            });
        } else {
            // Return all mock data if no coordinates provided
            if (dbService.mockData) {
                res.json({
                    success: true,
                    count: dbService.mockData.locations.length,
                    data: dbService.mockData.locations
                });
            } else {
                res.status(404).json({
                    error: 'No data available',
                    message: 'No location data available'
                });
            }
        }
    } catch (error) {
        console.error('Legacy data error:', error);
        res.status(500).json({
            error: 'Data retrieval failed',
            message: 'Unable to retrieve data'
        });
    }
});

// Legacy submission endpoint
router.post('/submit', async (req, res) => {
    try {
        const { data, location, type = 'general' } = req.body;
        
        if (!data) {
            return res.status(400).json({
                error: 'Missing data',
                message: 'Data is required'
            });
        }

        // Mock submission - in a real implementation, this would save to database
        const submission = {
            id: Date.now(),
            type: type,
            data: data,
            location: location || null,
            submitted_at: new Date().toISOString(),
            status: 'received'
        };

        res.status(201).json({
            success: true,
            message: 'Data submitted successfully',
            submission: submission
        });
    } catch (error) {
        console.error('Legacy submission error:', error);
        res.status(500).json({
            error: 'Submission failed',
            message: 'Unable to submit data'
        });
    }
});

// Legacy ML prediction endpoint
router.post('/predict', async (req, res) => {
    try {
        const { location, indicators, model = 'default' } = req.body;
        
        if (!location || !indicators) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Location and indicators are required'
            });
        }

        const { lat, lng } = location;
        
        if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Valid latitude and longitude are required'
            });
        }

        // Mock prediction - in a real implementation, this would call ML service
        const prediction = {
            id: Date.now(),
            location: { lat: parseFloat(lat), lng: parseFloat(lng) },
            model: model,
            indicators: indicators,
            predictions: {
                poverty_reduction_potential: Math.random() * 30 + 10,
                education_improvement: Math.random() * 20 + 5,
                health_vulnerability_reduction: Math.random() * 25 + 8,
                confidence_score: Math.random() * 0.3 + 0.7
            },
            recommendations: [
                'Implement community-based interventions',
                'Focus on education and skill development',
                'Improve healthcare access and infrastructure',
                'Strengthen local governance and participation'
            ],
            generated_at: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'Prediction generated successfully',
            prediction: prediction
        });
    } catch (error) {
        console.error('ML prediction error:', error);
        res.status(500).json({
            error: 'Prediction failed',
            message: 'Unable to generate prediction'
        });
    }
});

// Legacy analytics endpoint
router.get('/analytics', async (req, res) => {
    try {
        const { metric, period = '1y', aggregation = 'average' } = req.query;
        
        if (!metric) {
            return res.status(400).json({
                error: 'Missing metric',
                message: 'Metric parameter is required'
            });
        }

        const validMetrics = ['poverty', 'education', 'health', 'water', 'employment', 'housing'];
        if (!validMetrics.includes(metric)) {
            return res.status(400).json({
                error: 'Invalid metric',
                message: `Metric must be one of: ${validMetrics.join(', ')}`
            });
        }

        // Mock analytics - in a real implementation, this would query the database
        const analytics = {
            metric: metric,
            period: period,
            aggregation: aggregation,
            national_average: dbService.getNationalAverage(metric),
            trends: {
                current: Math.random() * 100,
                previous: Math.random() * 100,
                change: (Math.random() - 0.5) * 10
            },
            regional_breakdown: [
                { region: 'Nairobi', value: Math.random() * 100 },
                { region: 'Coast', value: Math.random() * 100 },
                { region: 'Western', value: Math.random() * 100 },
                { region: 'Rift Valley', value: Math.random() * 100 },
                { region: 'Eastern', value: Math.random() * 100 },
                { region: 'Central', value: Math.random() * 100 },
                { region: 'Nyanza', value: Math.random() * 100 },
                { region: 'North Eastern', value: Math.random() * 100 }
            ],
            generated_at: new Date().toISOString()
        };

        res.json({
            success: true,
            analytics: analytics
        });
    } catch (error) {
        console.error('Legacy analytics error:', error);
        res.status(500).json({
            error: 'Analytics failed',
            message: 'Unable to generate analytics'
        });
    }
});

module.exports = router;
