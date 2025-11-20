const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');

// Get complete location data with all indicators
router.get('/location/:lat/:lng', async (req, res) => {
    try {
        const { lat, lng } = req.params;
        const { includePredictions = false, includeHistory = false } = req.query;
        
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

        const response = {
            success: true,
            location: {
                coordinates: { lat: latitude, lng: longitude },
                ...locationData
            },
            indicators: {
                poverty_index: locationData.poverty_index,
                education_access: locationData.education_access,
                health_vulnerability: locationData.health_vulnerability,
                water_access: locationData.water_access,
                employment_rate: locationData.employment_rate,
                housing_quality: locationData.housing_quality
            },
            severity_levels: {
                poverty: dbService.getSeverityLevel(locationData.poverty_index, 'poverty'),
                education: dbService.getSeverityLevel(locationData.education_access, 'education'),
                health: dbService.getSeverityLevel(locationData.health_vulnerability, 'health'),
                water: dbService.getSeverityLevel(locationData.water_access, 'water'),
                employment: dbService.getSeverityLevel(locationData.employment_rate, 'employment'),
                housing: dbService.getSeverityLevel(locationData.housing_quality, 'housing')
            },
            comparisons: {
                national_averages: {
                    poverty: dbService.getNationalAverage('poverty'),
                    education: dbService.getNationalAverage('education'),
                    health: dbService.getNationalAverage('health'),
                    water: dbService.getNationalAverage('water'),
                    employment: dbService.getNationalAverage('employment'),
                    housing: dbService.getNationalAverage('housing')
                }
            }
        };

        if (includePredictions === 'true') {
            response.predictions = await dbService.getLocationPredictions(latitude, longitude);
        }

        if (includeHistory === 'true') {
            response.historical_data = {
                poverty: dbService.generateHistoricalData('poverty', locationData.poverty_index, '1y'),
                education: dbService.generateHistoricalData('education', locationData.education_access, '1y'),
                health: dbService.generateHistoricalData('health', locationData.health_vulnerability, '1y')
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Unified data error:', error);
        res.status(500).json({
            error: 'Data retrieval failed',
            message: 'Unable to retrieve unified location data'
        });
    }
});

// Get filtered data based on criteria
router.get('/filtered', async (req, res) => {
    try {
        const { 
            county, 
            minPoverty = 0, 
            maxPoverty = 100, 
            minEducation = 0, 
            maxEducation = 100,
            severity,
            limit = 50
        } = req.query;

        // For mock data, we'll filter the locations
        if (dbService.mockData) {
            let filteredLocations = dbService.mockData.locations;

            if (county) {
                filteredLocations = filteredLocations.filter(loc => 
                    loc.county.toLowerCase().includes(county.toLowerCase())
                );
            }

            filteredLocations = filteredLocations.filter(loc => 
                loc.poverty_index >= parseFloat(minPoverty) && 
                loc.poverty_index <= parseFloat(maxPoverty) &&
                loc.education_access >= parseFloat(minEducation) && 
                loc.education_access <= parseFloat(maxEducation)
            );

            if (severity) {
                filteredLocations = filteredLocations.filter(loc => {
                    const povertySeverity = dbService.getSeverityLevel(loc.poverty_index, 'poverty');
                    return povertySeverity === severity;
                });
            }

            filteredLocations = filteredLocations.slice(0, parseInt(limit));

            res.json({
                success: true,
                count: filteredLocations.length,
                filters: {
                    county,
                    minPoverty: parseFloat(minPoverty),
                    maxPoverty: parseFloat(maxPoverty),
                    minEducation: parseFloat(minEducation),
                    maxEducation: parseFloat(maxEducation),
                    severity
                },
                data: filteredLocations
            });
        } else {
            // Production implementation would query the database
            res.status(501).json({
                error: 'Not implemented',
                message: 'Filtered data retrieval not implemented for production database'
            });
        }
    } catch (error) {
        console.error('Filtered data error:', error);
        res.status(500).json({
            error: 'Filtering failed',
            message: 'Unable to retrieve filtered data'
        });
    }
});

// Export data in various formats
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', filters = {} } = req.query;
        
        let data = [];
        
        if (dbService.mockData) {
            data = dbService.mockData.locations;
        }

        switch (format.toLowerCase()) {
            case 'json':
                res.json({
                    success: true,
                    format: 'json',
                    count: data.length,
                    data: data,
                    exported_at: new Date().toISOString()
                });
                break;
                
            case 'csv':
                const csvHeader = 'Name,County,Latitude,Longitude,Poverty Index,Education Access,Health Vulnerability,Water Access,Employment Rate,Housing Quality\n';
                const csvRows = data.map(loc => 
                    `"${loc.name}","${loc.county}",${loc.lat},${loc.lng},${loc.poverty_index},${loc.education_access},${loc.health_vulnerability},${loc.water_access},${loc.employment_rate},${loc.housing_quality}`
                ).join('\n');
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="ipmas-data.csv"');
                res.send(csvHeader + csvRows);
                break;
                
            default:
                res.status(400).json({
                    error: 'Unsupported format',
                    message: 'Supported formats: json, csv'
                });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            error: 'Export failed',
            message: 'Unable to export data'
        });
    }
});

module.exports = router;
