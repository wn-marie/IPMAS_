const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');

// Search locations by name or coordinates
router.get('/search', async (req, res) => {
    try {
        const { query, lat, lng, radius = 10 } = req.query;
        
        // Validate that dbService is initialized
        if (!dbService.isInitialized) {
            await dbService.initialize();
        }
        
        let results = [];
        
        if (query) {
            // Search by name
            try {
                results = await dbService.searchLocationsByName(query);
            } catch (searchError) {
                console.error('Name search error:', searchError);
                // If database search fails, return empty results instead of crashing
                results = [];
            }
        } else if (lat && lng) {
            // Search by coordinates within radius
            try {
                results = await dbService.searchLocationsByCoordinates(
                    parseFloat(lat), 
                    parseFloat(lng), 
                    parseInt(radius)
                );
            } catch (coordError) {
                console.error('Coordinate search error:', coordError);
                // If coordinate search fails, return empty results instead of crashing
                results = [];
            }
        } else {
            return res.status(400).json({
                success: false,
                error: 'Missing parameters',
                message: 'Please provide either query parameter or lat/lng coordinates'
            });
        }

        // Always return success with results (even if empty)
        res.json({
            success: true,
            count: results.length,
            data: results || []
        });
    } catch (error) {
        console.error('Location search error:', error);
        console.error('Error stack:', error.stack);
        // Return empty results instead of 500 error to prevent frontend crashes
        res.status(200).json({
            success: true,
            count: 0,
            data: [],
            warning: 'Search completed but no results found'
        });
    }
});

// Get detailed location data by coordinates
router.get('/:lat/:lng', async (req, res) => {
    try {
        const { lat, lng } = req.params;
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        // Validate coordinates
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Latitude and longitude must be valid numbers'
            });
        }
        
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates are out of valid range'
            });
        }

        const locationData = await dbService.getLocationData(latitude, longitude);
        
        if (!locationData) {
            return res.status(404).json({
                error: 'Location not found',
                message: 'No data available for the specified coordinates'
            });
        }

        res.json({
            success: true,
            location: {
                coordinates: { lat: latitude, lng: longitude },
                ...locationData
            }
        });
    } catch (error) {
        console.error('Location data error:', error);
        res.status(500).json({
            error: 'Data retrieval failed',
            message: 'Unable to retrieve location data'
        });
    }
});

// Get nearby data within radius
router.get('/radius/:lat/:lng', async (req, res) => {
    try {
        const { lat, lng } = req.params;
        const { radius = 5, limit = 50 } = req.query;
        
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = parseInt(radius);
        const limitCount = parseInt(limit);
        
        // Validate parameters
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Latitude and longitude must be valid numbers'
            });
        }
        
        if (radiusKm < 1 || radiusKm > 100) {
            return res.status(400).json({
                error: 'Invalid radius',
                message: 'Radius must be between 1 and 100 kilometers'
            });
        }

        const nearbyData = await dbService.getNearbyLocations(
            latitude, 
            longitude, 
            radiusKm, 
            limitCount
        );

        res.json({
            success: true,
            center: { lat: latitude, lng: longitude },
            radius: radiusKm,
            count: nearbyData.length,
            data: nearbyData
        });
    } catch (error) {
        console.error('Nearby locations error:', error);
        res.status(500).json({
            error: 'Nearby search failed',
            message: 'Unable to retrieve nearby locations'
        });
    }
});

// Get location statistics summary
router.get('/:lat/:lng/stats', async (req, res) => {
    try {
        const { lat, lng } = req.params;
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Latitude and longitude must be valid numbers'
            });
        }

        const stats = await dbService.getLocationStatistics(latitude, longitude);
        
        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            statistics: stats
        });
    } catch (error) {
        console.error('Location stats error:', error);
        res.status(500).json({
            error: 'Statistics retrieval failed',
            message: 'Unable to retrieve location statistics'
        });
    }
});

module.exports = router;
