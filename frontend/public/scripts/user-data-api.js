/**
 * User Data API Utility
 * Handles saving/loading user data from database with localStorage fallback
 */

class UserDataAPI {
    constructor() {
        this.apiUrl = window.API_CONFIG ? window.API_CONFIG.getApiUrl('/api/v1/user-data') : '/api/v1/user-data';
        this.useDatabase = true; // Try database first, fallback to localStorage
    }

    getSessionToken() {
        return localStorage.getItem('ipmas_session_token');
    }

    async getAuthHeaders() {
        const token = this.getSessionToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    // User preferences
    async savePreference(key, value) {
        const token = this.getSessionToken();
        if (!token) {
            // Fallback to localStorage
            localStorage.setItem(`ipmas_pref_${key}`, JSON.stringify(value));
            return { success: true, source: 'localStorage' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/preferences`, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify({ key, value })
            });
            const result = await response.json();
            if (result.success) {
                // Also save to localStorage as backup
                localStorage.setItem(`ipmas_pref_${key}`, JSON.stringify(value));
                return { ...result, source: 'database' };
            }
            throw new Error(result.error || 'Failed to save preference');
        } catch (error) {
            console.warn('Database save failed, using localStorage:', error);
            localStorage.setItem(`ipmas_pref_${key}`, JSON.stringify(value));
            return { success: true, source: 'localStorage' };
        }
    }

    async getPreference(key) {
        const token = this.getSessionToken();
        if (!token) {
            // Fallback to localStorage
            const value = localStorage.getItem(`ipmas_pref_${key}`);
            return value ? JSON.parse(value) : null;
        }

        try {
            const response = await fetch(`${this.apiUrl}/preferences?key=${encodeURIComponent(key)}`, {
                method: 'GET',
                headers: await this.getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data.value) {
                return result.data.value;
            }
            // Fallback to localStorage
            const value = localStorage.getItem(`ipmas_pref_${key}`);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.warn('Database load failed, using localStorage:', error);
            const value = localStorage.getItem(`ipmas_pref_${key}`);
            return value ? JSON.parse(value) : null;
        }
    }

    async getAllPreferences() {
        const token = this.getSessionToken();
        if (!token) {
            return {};
        }

        try {
            const response = await fetch(`${this.apiUrl}/preferences`, {
                method: 'GET',
                headers: await this.getAuthHeaders()
            });
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
            return {};
        } catch (error) {
            console.warn('Database load failed:', error);
            return {};
        }
    }

    // Feedback
    async saveFeedback(feedbackData) {
        const token = this.getSessionToken();
        
        // Always save to localStorage as backup
        const savedFeedback = JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
        savedFeedback.push({ ...feedbackData, id: Date.now(), timestamp: new Date().toISOString() });
        localStorage.setItem('ipmas_feedback', JSON.stringify(savedFeedback));

        if (!token) {
            return { success: true, source: 'localStorage' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/feedback`, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify(feedbackData)
            });
            const result = await response.json();
            return { ...result, source: 'database' };
        } catch (error) {
            console.warn('Database save failed, using localStorage:', error);
            return { success: true, source: 'localStorage' };
        }
    }

    async getFeedback() {
        const token = this.getSessionToken();
        if (!token) {
            return JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
        }

        try {
            const response = await fetch(`${this.apiUrl}/feedback`, {
                method: 'GET',
                headers: await this.getAuthHeaders()
            });
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
            return JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
        } catch (error) {
            console.warn('Database load failed, using localStorage:', error);
            return JSON.parse(localStorage.getItem('ipmas_feedback') || '[]');
        }
    }

    // Dashboard customization
    async saveDashboardCustomization(layoutData, favoriteKPIs) {
        const token = this.getSessionToken();
        
        // Always save to localStorage as backup
        if (layoutData) localStorage.setItem('ipmas_dashboard_layout', JSON.stringify(layoutData));
        if (favoriteKPIs) localStorage.setItem('ipmas_favorite_kpis', JSON.stringify(favoriteKPIs));

        if (!token) {
            return { success: true, source: 'localStorage' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/dashboard`, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify({ layout_data: layoutData, favorite_kpis: favoriteKPIs })
            });
            const result = await response.json();
            return { ...result, source: 'database' };
        } catch (error) {
            console.warn('Database save failed, using localStorage:', error);
            return { success: true, source: 'localStorage' };
        }
    }

    async getDashboardCustomization() {
        const token = this.getSessionToken();
        if (!token) {
            return {
                layout_data: JSON.parse(localStorage.getItem('ipmas_dashboard_layout') || '{}'),
                favorite_kpis: JSON.parse(localStorage.getItem('ipmas_favorite_kpis') || '[]')
            };
        }

        try {
            const response = await fetch(`${this.apiUrl}/dashboard`, {
                method: 'GET',
                headers: await this.getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data) {
                return result.data;
            }
            return {
                layout_data: JSON.parse(localStorage.getItem('ipmas_dashboard_layout') || '{}'),
                favorite_kpis: JSON.parse(localStorage.getItem('ipmas_favorite_kpis') || '[]')
            };
        } catch (error) {
            console.warn('Database load failed, using localStorage:', error);
            return {
                layout_data: JSON.parse(localStorage.getItem('ipmas_dashboard_layout') || '{}'),
                favorite_kpis: JSON.parse(localStorage.getItem('ipmas_favorite_kpis') || '[]')
            };
        }
    }

    // Filter presets
    async saveFilterPreset(presetName, presetData) {
        const token = this.getSessionToken();
        
        // Always save to localStorage as backup
        const presets = JSON.parse(localStorage.getItem('ipmas_filter_presets') || '[]');
        const existingIndex = presets.findIndex(p => p.name === presetName);
        if (existingIndex >= 0) {
            presets[existingIndex] = { name: presetName, ...presetData };
        } else {
            presets.push({ name: presetName, ...presetData });
        }
        localStorage.setItem('ipmas_filter_presets', JSON.stringify(presets));

        if (!token) {
            return { success: true, source: 'localStorage' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/filter-presets`, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify({ preset_name: presetName, preset_data: presetData })
            });
            const result = await response.json();
            return { ...result, source: 'database' };
        } catch (error) {
            console.warn('Database save failed, using localStorage:', error);
            return { success: true, source: 'localStorage' };
        }
    }

    async getFilterPresets() {
        const token = this.getSessionToken();
        if (!token) {
            return JSON.parse(localStorage.getItem('ipmas_filter_presets') || '[]');
        }

        try {
            const response = await fetch(`${this.apiUrl}/filter-presets`, {
                method: 'GET',
                headers: await this.getAuthHeaders()
            });
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
            return JSON.parse(localStorage.getItem('ipmas_filter_presets') || '[]');
        } catch (error) {
            console.warn('Database load failed, using localStorage:', error);
            return JSON.parse(localStorage.getItem('ipmas_filter_presets') || '[]');
        }
    }

    // Notification settings
    async saveNotificationSettings(settingsData) {
        const token = this.getSessionToken();
        
        // Always save to localStorage as backup
        localStorage.setItem('ipmas_notification_settings', JSON.stringify(settingsData));

        if (!token) {
            return { success: true, source: 'localStorage' };
        }

        try {
            const response = await fetch(`${this.apiUrl}/notifications`, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
                body: JSON.stringify({ settings_data: settingsData })
            });
            const result = await response.json();
            return { ...result, source: 'database' };
        } catch (error) {
            console.warn('Database save failed, using localStorage:', error);
            return { success: true, source: 'localStorage' };
        }
    }

    async getNotificationSettings() {
        const token = this.getSessionToken();
        if (!token) {
            const value = localStorage.getItem('ipmas_notification_settings');
            return value ? JSON.parse(value) : null;
        }

        try {
            const response = await fetch(`${this.apiUrl}/notifications`, {
                method: 'GET',
                headers: await this.getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data) {
                return result.data;
            }
            const value = localStorage.getItem('ipmas_notification_settings');
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.warn('Database load failed, using localStorage:', error);
            const value = localStorage.getItem('ipmas_notification_settings');
            return value ? JSON.parse(value) : null;
        }
    }
}

// Create global instance
window.userDataAPI = new UserDataAPI();

