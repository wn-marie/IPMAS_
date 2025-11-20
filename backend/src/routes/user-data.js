const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');
const validator = require('validator');

// Middleware to get user email from session
async function getUserEmail(req) {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                       req.cookies?.session_token ||
                       req.query.token;

    if (!sessionToken) return null;

    const session = await dbService.verifySession(sessionToken);
    return session ? session.email : null;
}

// User preferences endpoints
router.post('/preferences', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { key, value } = req.body;
        if (!key) {
            return res.status(400).json({ success: false, error: 'Preference key is required' });
        }

        const result = await dbService.saveUserPreference(email, key, value);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving preference:', error);
        res.status(500).json({ success: false, error: 'Failed to save preference' });
    }
});

router.get('/preferences', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { key } = req.query;
        if (key) {
            const value = await dbService.getUserPreference(email, key);
            res.json({ success: true, data: { key, value } });
        } else {
            const preferences = await dbService.getAllUserPreferences(email);
            res.json({ success: true, data: preferences });
        }
    } catch (error) {
        console.error('Error getting preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to get preferences' });
    }
});

// Feedback endpoints
router.post('/feedback', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        
        const { feedback_type, content, priority, metadata } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, error: 'Feedback content is required' });
        }

        const result = await dbService.saveFeedback({
            user_email: email,
            feedback_type,
            content,
            priority,
            metadata
        });
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ success: false, error: 'Failed to save feedback' });
    }
});

router.get('/feedback', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const feedback = await dbService.getUserFeedback(email);
        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error getting feedback:', error);
        res.status(500).json({ success: false, error: 'Failed to get feedback' });
    }
});

// Dashboard customization endpoints
router.post('/dashboard', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { layout_data, favorite_kpis } = req.body;
        const result = await dbService.saveDashboardCustomization(email, layout_data, favorite_kpis);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving dashboard customization:', error);
        res.status(500).json({ success: false, error: 'Failed to save dashboard customization' });
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const customization = await dbService.getDashboardCustomization(email);
        res.json({ success: true, data: customization });
    } catch (error) {
        console.error('Error getting dashboard customization:', error);
        res.status(500).json({ success: false, error: 'Failed to get dashboard customization' });
    }
});

// Filter presets endpoints
router.post('/filter-presets', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { preset_name, preset_data } = req.body;
        if (!preset_name || !preset_data) {
            return res.status(400).json({ success: false, error: 'Preset name and data are required' });
        }

        const result = await dbService.saveFilterPreset(email, preset_name, preset_data);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving filter preset:', error);
        res.status(500).json({ success: false, error: 'Failed to save filter preset' });
    }
});

router.get('/filter-presets', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const presets = await dbService.getUserFilterPresets(email);
        res.json({ success: true, data: presets });
    } catch (error) {
        console.error('Error getting filter presets:', error);
        res.status(500).json({ success: false, error: 'Failed to get filter presets' });
    }
});

// Notification settings endpoints
router.post('/notifications', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { settings_data } = req.body;
        const result = await dbService.saveNotificationSettings(email, settings_data);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving notification settings:', error);
        res.status(500).json({ success: false, error: 'Failed to save notification settings' });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const settings = await dbService.getNotificationSettings(email);
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error getting notification settings:', error);
        res.status(500).json({ success: false, error: 'Failed to get notification settings' });
    }
});

// Download requests endpoint
router.post('/download-requests', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        
        const result = await dbService.saveDownloadRequest({
            user_email: email,
            ...req.body
        });
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving download request:', error);
        res.status(500).json({ success: false, error: 'Failed to save download request' });
    }
});

// Shared data endpoints
router.post('/shared-data', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        const { share_id, share_type, share_data, expires_at } = req.body;
        
        if (!share_id || !share_type || !share_data) {
            return res.status(400).json({ success: false, error: 'Share ID, type, and data are required' });
        }

        const result = await dbService.saveSharedData(share_id, email, share_type, share_data, expires_at);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving shared data:', error);
        res.status(500).json({ success: false, error: 'Failed to save shared data' });
    }
});

router.get('/shared-data/:shareId', async (req, res) => {
    try {
        const { shareId } = req.params;
        const data = await dbService.getSharedData(shareId);
        
        if (!data) {
            return res.status(404).json({ success: false, error: 'Shared data not found or expired' });
        }
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error getting shared data:', error);
        res.status(500).json({ success: false, error: 'Failed to get shared data' });
    }
});

// Area report data endpoints
router.post('/area-report', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        const { location_name, report_data } = req.body;
        
        if (!location_name || !report_data) {
            return res.status(400).json({ success: false, error: 'Location name and report data are required' });
        }

        const result = await dbService.saveAreaReportData(email, location_name, report_data);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error saving area report:', error);
        res.status(500).json({ success: false, error: 'Failed to save area report' });
    }
});

router.get('/area-report', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        const { location_name } = req.query;
        
        if (!location_name) {
            return res.status(400).json({ success: false, error: 'Location name is required' });
        }

        const data = await dbService.getAreaReportData(email, location_name);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error getting area report:', error);
        res.status(500).json({ success: false, error: 'Failed to get area report' });
    }
});

// Migration endpoint - import localStorage data
router.post('/migrate', async (req, res) => {
    try {
        const email = await getUserEmail(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { localStorageData } = req.body;
        if (!localStorageData) {
            return res.status(400).json({ success: false, error: 'localStorage data is required' });
        }

        const results = {};

        // Migrate user preferences
        if (localStorageData.ipmas_user_data) {
            try {
                const userData = typeof localStorageData.ipmas_user_data === 'string' 
                    ? JSON.parse(localStorageData.ipmas_user_data) 
                    : localStorageData.ipmas_user_data;
                
                await dbService.saveUserPreference(email, 'user_data', userData);
                results.user_data = 'migrated';
            } catch (e) {
                results.user_data = 'error: ' + e.message;
            }
        }

        // Migrate feedback
        if (localStorageData.ipmas_feedback) {
            try {
                const feedback = typeof localStorageData.ipmas_feedback === 'string'
                    ? JSON.parse(localStorageData.ipmas_feedback)
                    : localStorageData.ipmas_feedback;
                
                if (Array.isArray(feedback)) {
                    for (const item of feedback) {
                        await dbService.saveFeedback({
                            user_email: email,
                            feedback_type: item.type || item.feedback_type,
                            content: item.message || item.content,
                            priority: item.priority || 'medium',
                            metadata: item
                        });
                    }
                }
                results.feedback = 'migrated';
            } catch (e) {
                results.feedback = 'error: ' + e.message;
            }
        }

        // Migrate dashboard customization
        if (localStorageData.ipmas_dashboard_layout || localStorageData.ipmas_favorite_kpis) {
            try {
                const layout = localStorageData.ipmas_dashboard_layout 
                    ? (typeof localStorageData.ipmas_dashboard_layout === 'string' 
                        ? JSON.parse(localStorageData.ipmas_dashboard_layout) 
                        : localStorageData.ipmas_dashboard_layout)
                    : {};
                const kpis = localStorageData.ipmas_favorite_kpis
                    ? (typeof localStorageData.ipmas_favorite_kpis === 'string'
                        ? JSON.parse(localStorageData.ipmas_favorite_kpis)
                        : localStorageData.ipmas_favorite_kpis)
                    : [];
                
                await dbService.saveDashboardCustomization(email, layout, kpis);
                results.dashboard = 'migrated';
            } catch (e) {
                results.dashboard = 'error: ' + e.message;
            }
        }

        // Migrate filter presets
        if (localStorageData.ipmas_filter_presets) {
            try {
                const presets = typeof localStorageData.ipmas_filter_presets === 'string'
                    ? JSON.parse(localStorageData.ipmas_filter_presets)
                    : localStorageData.ipmas_filter_presets;
                
                if (Array.isArray(presets)) {
                    for (const preset of presets) {
                        await dbService.saveFilterPreset(email, preset.name || 'preset', preset);
                    }
                }
                results.filter_presets = 'migrated';
            } catch (e) {
                results.filter_presets = 'error: ' + e.message;
            }
        }

        // Migrate notification settings
        if (localStorageData.ipmas_notification_settings) {
            try {
                const settings = typeof localStorageData.ipmas_notification_settings === 'string'
                    ? JSON.parse(localStorageData.ipmas_notification_settings)
                    : localStorageData.ipmas_notification_settings;
                
                await dbService.saveNotificationSettings(email, settings);
                results.notification_settings = 'migrated';
            } catch (e) {
                results.notification_settings = 'error: ' + e.message;
            }
        }

        res.json({ success: true, message: 'Migration completed', results });
    } catch (error) {
        console.error('Error migrating data:', error);
        res.status(500).json({ success: false, error: 'Failed to migrate data' });
    }
});

module.exports = router;

