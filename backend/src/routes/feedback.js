const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');

// Submit community feedback
router.post('/submit', async (req, res) => {
    try {
        // Support both old format (location, comment, sentiment) and new format (feedback_type, content, urgency_level)
        const { 
            location, 
            comment, 
            sentiment, 
            urgency_level, 
            demographic_info, 
            contact_info,
            // New format fields
            feedback_type,
            content
        } = req.body;
        
        // Determine which format is being used
        const isNewFormat = feedback_type && content;
        const isOldFormat = location && comment && sentiment;
        
        // Validate required fields based on format
        if (!isNewFormat && !isOldFormat) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Either provide (location, comment, sentiment) or (feedback_type, content)'
            });
        }

        // Handle new format (from frontend feedback form)
        if (isNewFormat) {
            // Validate urgency level
            const validUrgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
            const urgency = urgency_level || 'Medium';
            if (!validUrgencyLevels.includes(urgency)) {
                return res.status(400).json({
                    error: 'Invalid urgency level',
                    message: `Urgency level must be one of: ${validUrgencyLevels.join(', ')}`
                });
            }

            const feedbackData = {
                coordinates: location || { lat: 0, lng: 0 }, // Default if no location provided
                feedback_type: feedback_type || 'general',
                content: content,
                urgency_level: urgency,
                demographic_info: demographic_info || {},
                contact_info: contact_info || {}
            };

            const savedFeedback = await dbService.saveCommunityFeedback(feedbackData);
            
            return res.status(201).json({
                success: true,
                message: 'Feedback submitted successfully',
                feedback: {
                    id: savedFeedback.id,
                    type: feedback_type,
                    urgency_level: urgency,
                    submitted_at: savedFeedback.created_at
                }
            });
        }

        // Handle old format (with location and sentiment)
        // Validate sentiment
        const validSentiments = ['Positive', 'Negative', 'Neutral'];
        if (!validSentiments.includes(sentiment)) {
            return res.status(400).json({
                error: 'Invalid sentiment',
                message: `Sentiment must be one of: ${validSentiments.join(', ')}`
            });
        }

        // Validate urgency level
        const validUrgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
        if (urgency_level && !validUrgencyLevels.includes(urgency_level)) {
            return res.status(400).json({
                error: 'Invalid urgency level',
                message: `Urgency level must be one of: ${validUrgencyLevels.join(', ')}`
            });
        }

        const feedbackData = {
            coordinates: { lat: location.lat, lng: location.lng },
            feedback_type: 'general',
            content: comment,
            urgency_level: urgency_level || 'Medium',
            demographic_info: demographic_info || {},
            contact_info: contact_info || {}
        };

        const savedFeedback = await dbService.saveCommunityFeedback(feedbackData);
        
        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback: {
                id: savedFeedback.id,
                location: location,
                sentiment: sentiment,
                urgency_level: urgency_level,
                submitted_at: savedFeedback.created_at
            }
        });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({
            error: 'Submission failed',
            message: 'Unable to submit feedback'
        });
    }
});

// Get feedback for a specific location
router.get('/location', async (req, res) => {
    try {
        const { lat, lng, radius = 5, limit = 20 } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Missing coordinates',
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = parseFloat(radius);
        const limitCount = parseInt(limit);
        
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates',
                message: 'Coordinates must be valid numbers'
            });
        }

        const filters = {
            radius: radiusKm,
            limit: limitCount
        };

        const feedback = await dbService.getLocationFeedback(latitude, longitude, filters);
        
        res.json({
            success: true,
            location: { lat: latitude, lng: longitude },
            radius: radiusKm,
            count: feedback.length,
            feedback: feedback
        });
    } catch (error) {
        console.error('Location feedback error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'Unable to retrieve location feedback'
        });
    }
});

// Get urgent alerts
router.get('/urgent', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        if (dbService.mockData) {
            const urgentFeedback = dbService.mockData.feedback.filter(fb => 
                fb.urgency_level === 'High' || fb.urgency_level === 'Critical'
            ).slice(0, parseInt(limit));

            res.json({
                success: true,
                count: urgentFeedback.length,
                urgent_alerts: urgentFeedback
            });
        } else {
            // Production implementation would query the database
            res.status(501).json({
                error: 'Not implemented',
                message: 'Urgent alerts not implemented for production database'
            });
        }
    } catch (error) {
        console.error('Urgent alerts error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'Unable to retrieve urgent alerts'
        });
    }
});

module.exports = router;
