const express = require('express');
const router = express.Router();
const { PovertyIndexCalculator } = require('../services/povertyIndexCalculator');

const povertyCalculator = new PovertyIndexCalculator();

/**
 * Process questionnaire responses and calculate poverty index
 * POST /api/v1/questionnaire/process
 */
router.post('/process', async (req, res) => {
    try {
        const { location_name, responses } = req.body;
        
        // Validate input
        if (!location_name || !responses) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: location_name and responses'
            });
        }
        
        // Process questionnaire responses to get indicator values
        const indicators = await povertyCalculator.processQuestionnaireResponses(responses);
        
        // Get selected indicators from dashboard controls (default to all if not specified)
        const selectedIndicators = req.body.selected_indicators || Object.keys(indicators);
        
        // Calculate poverty index
        const result = povertyCalculator.calculatePovertyIndex(indicators, selectedIndicators);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        // Prepare response with location data
        const locationData = {
            location_name,
            indicators,
            poverty_index: result.poverty_index,
            poverty_level: result.poverty_level,
            confidence_score: result.confidence_score,
            indicators_used: result.indicators_used,
            breakdown: result.breakdown,
            recommendations: result.recommendations,
            calculation_method: result.calculation_method,
            timestamp: result.timestamp
        };
        
        res.json({
            success: true,
            data: locationData,
            message: `Poverty index calculated successfully for ${location_name}`
        });
        
    } catch (error) {
        console.error('Error processing questionnaire:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        res.status(500).json({
            success: false,
            error: 'Internal server error while processing questionnaire',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get available indicators for questionnaire
 * GET /api/v1/questionnaire/indicators
 */
router.get('/indicators', (req, res) => {
    try {
        const indicators = povertyCalculator.getAvailableIndicators();
        
        res.json({
            success: true,
            indicators,
            message: 'Available indicators retrieved successfully'
        });
    } catch (error) {
        console.error('Error getting indicators:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while retrieving indicators',
            message: error.message
        });
    }
});

/**
 * Calculate poverty index for existing location data
 * POST /api/v1/questionnaire/calculate
 */
router.post('/calculate', async (req, res) => {
    try {
        const { location_data, selected_indicators } = req.body;
        
        // Validate input
        if (!location_data) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: location_data'
            });
        }
        
        // Calculate poverty index
        const result = povertyCalculator.calculatePovertyIndex(location_data, selected_indicators);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.json({
            success: true,
            data: result,
            message: 'Poverty index calculated successfully'
        });
        
    } catch (error) {
        console.error('Error calculating poverty index:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while calculating poverty index',
            message: error.message
        });
    }
});

/**
 * Get questionnaire questions structure
 * GET /api/v1/questionnaire/questions
 */
router.get('/questions', (req, res) => {
    try {
        const questions = {
            location_name: {
                type: 'text',
                label: 'Location Name',
                placeholder: 'Enter the name of the area or location',
                required: true,
                description: 'What is the name of the area or location you\'re reporting on?'
            },
            education_access: {
                type: 'group',
                label: 'Education Access',
                description: 'Please answer questions about education facilities and access in this area.',
                questions: [
                    {
                        id: 'school_distance',
                        type: 'select',
                        label: 'Distance to Nearest School',
                        options: [
                            { value: 'walking_distance', text: 'Within walking distance (less than 1km)' },
                            { value: 'moderate_distance', text: 'Moderate distance (2-5km)' },
                            { value: 'far_distance', text: 'Far distance (over 5km)' },
                            { value: 'very_far_distance', text: 'Very far (over 10km)' }
                        ],
                        required: true
                    },
                    {
                        id: 'school_condition',
                        type: 'select',
                        label: 'School Building Condition',
                        options: [
                            { value: 'excellent', text: 'Excellent - Modern, well-maintained' },
                            { value: 'good', text: 'Good - Adequate and functional' },
                            { value: 'poor', text: 'Poor - Needs repair' },
                            { value: 'very_poor', text: 'Very poor - Dangerous or collapsing' }
                        ],
                        required: true
                    },
                    {
                        id: 'classroom_availability',
                        type: 'select',
                        label: 'Classroom Availability',
                        options: [
                            { value: 'adequate', text: 'Enough classrooms for all students' },
                            { value: 'somewhat_adequate', text: 'Mostly adequate, some crowding' },
                            { value: 'insufficient', text: 'Not enough classrooms' },
                            { value: 'severely_insufficient', text: 'Severely overcrowded' }
                        ],
                        required: true
                    },
                    {
                        id: 'teacher_presence',
                        type: 'select',
                        label: 'Teacher Presence',
                        options: [
                            { value: 'regularly', text: 'Teachers regularly present and teaching' },
                            { value: 'mostly', text: 'Teachers mostly present' },
                            { value: 'sometimes', text: 'Teachers sometimes absent' },
                            { value: 'rarely', text: 'Teachers rarely present' }
                        ],
                        required: true
                    }
                ]
            },
            water_access: {
                type: 'group',
                label: 'Water Access',
                description: 'Please answer questions about water sources and availability.',
                questions: [
                    {
                        id: 'water_source',
                        type: 'select',
                        label: 'Main Water Source',
                        options: [
                            { value: 'piped_water', text: 'Piped water (tap water)' },
                            { value: 'borehole', text: 'Borehole or protected well' },
                            { value: 'unprotected_source', text: 'River, stream, or lake' },
                            { value: 'unsafe_source', text: 'Pond or unsafe source' }
                        ],
                        required: true
                    },
                    {
                        id: 'water_distance',
                        type: 'select',
                        label: 'Distance to Water Source',
                        options: [
                            { value: 'at_home', text: 'Water available at home' },
                            { value: 'walking_distance', text: 'Within walking distance' },
                            { value: 'moderate_distance', text: 'Some distance (2-5km)' },
                            { value: 'far_distance', text: 'Far distance (over 5km)' }
                        ],
                        required: true
                    },
                    {
                        id: 'water_consistency',
                        type: 'select',
                        label: 'Water Availability',
                        options: [
                            { value: 'always', text: 'Always available' },
                            { value: 'mostly', text: 'Mostly available' },
                            { value: 'sometimes', text: 'Sometimes available' },
                            { value: 'rarely', text: 'Rarely available' }
                        ],
                        required: true
                    }
                ]
            },
            health_vulnerability: {
                type: 'group',
                label: 'Health Vulnerability',
                description: 'Please answer questions about healthcare facilities and services.',
                questions: [
                    {
                        id: 'facility_distance',
                        type: 'select',
                        label: 'Distance to Health Facility',
                        options: [
                            { value: 'walking_distance', text: 'Within walking distance' },
                            { value: 'moderate_distance', text: 'Some distance (2-5km)' },
                            { value: 'far_distance', text: 'Far distance (over 5km)' },
                            { value: 'no_facility', text: 'No facility nearby (over 10km)' }
                        ],
                        required: true
                    },
                    {
                        id: 'facility_condition',
                        type: 'select',
                        label: 'Health Facility Condition',
                        options: [
                            { value: 'excellent', text: 'Excellent - Modern and well-equipped' },
                            { value: 'good', text: 'Good - Adequate and functional' },
                            { value: 'poor', text: 'Poor - Basic and limited equipment' },
                            { value: 'very_poor', text: 'Very poor - Inadequate equipment' }
                        ],
                        required: true
                    },
                    {
                        id: 'staff_availability',
                        type: 'select',
                        label: 'Medical Staff Availability',
                        options: [
                            { value: 'always', text: 'Always available' },
                            { value: 'mostly', text: 'Mostly available' },
                            { value: 'sometimes', text: 'Sometimes available' },
                            { value: 'rarely', text: 'Rarely available' }
                        ],
                        required: true
                    },
                    {
                        id: 'treatment_effectiveness',
                        type: 'select',
                        label: 'Treatment Effectiveness',
                        options: [
                            { value: 'very_effective', text: 'Very effective - Comprehensive care' },
                            { value: 'effective', text: 'Effective - Good care' },
                            { value: 'limited', text: 'Limited - Basic care only' },
                            { value: 'ineffective', text: 'Ineffective - Minimal care' }
                        ],
                        required: true
                    }
                ]
            },
            housing_quality: {
                type: 'group',
                label: 'Housing Quality Index',
                description: 'Please answer questions about housing and living conditions.',
                questions: [
                    {
                        id: 'housing_materials',
                        type: 'select',
                        label: 'Common Housing Materials',
                        options: [
                            { value: 'permanent', text: 'Concrete, brick, or stone (permanent)' },
                            { value: 'mixed', text: 'Mixed materials (partially permanent)' },
                            { value: 'temporary', text: 'Mud, wood, or temporary materials' },
                            { value: 'makeshift', text: 'Grass, plastic, or makeshift materials' }
                        ],
                        required: true
                    },
                    {
                        id: 'roofing_walls',
                        type: 'select',
                        label: 'Roofing and Walls Condition',
                        options: [
                            { value: 'proper', text: 'Proper and complete construction' },
                            { value: 'adequate', text: 'Mostly proper and functional' },
                            { value: 'partial', text: 'Partially proper with some gaps' },
                            { value: 'improper', text: 'Improper or incomplete construction' }
                        ],
                        required: true
                    },
                    {
                        id: 'overcrowding',
                        type: 'select',
                        label: 'Housing Overcrowding',
                        options: [
                            { value: 'spacious', text: 'Spacious - Adequate space for all' },
                            { value: 'reasonable', text: 'Reasonable - Mostly adequate space' },
                            { value: 'crowded', text: 'Somewhat crowded - Limited space' },
                            { value: 'overcrowded', text: 'Overcrowded - Very limited space' }
                        ],
                        required: true
                    },
                    {
                        id: 'sanitation',
                        type: 'select',
                        label: 'Sanitation Facilities',
                        options: [
                            { value: 'available', text: 'Available within the home' },
                            { value: 'shared', text: 'Shared facilities nearby' },
                            { value: 'limited', text: 'Limited or basic facilities' },
                            { value: 'unavailable', text: 'No facilities available' }
                        ],
                        required: true
                    }
                ]
            }
        };
        
        res.json({
            success: true,
            questions,
            message: 'Questionnaire structure retrieved successfully'
        });
        
    } catch (error) {
        console.error('Error getting questionnaire questions:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while retrieving questionnaire structure',
            message: error.message
        });
    }
});

module.exports = router;
