/**
 * IPMAS Frontend Configuration
 * Configuration for frontend to connect to backend API
 */

// Backend API Configuration
const API_CONFIG = {
    // Backend runs on port 3001 (API only)
    BASE_URL: 'http://localhost:3001',
    // Socket.IO server URL (same as backend)
    SOCKET_URL: 'http://localhost:3001',
    VERSION: 'v1',
    ENDPOINTS: {
        ANALYTICS: '/api/v1/analytics',
        LOCATION: '/api/v1/location',
        REPORTS: '/api/v1/reports',
        QUESTIONNAIRE: '/api/v1/questionnaire',
        FEEDBACK: '/api/v1/feedback',
        UNIFIED_DATA: '/api/v1/unified-data'
    },
    // Helper function to get full API URL
    getApiUrl: function(endpoint) {
        return `${this.BASE_URL}${endpoint}`;
    },
    // Helper function to get Socket.IO URL
    getSocketUrl: function() {
        return this.SOCKET_URL;
    }
};

// Frontend Configuration
const FRONTEND_CONFIG = {
    // Frontend runs on port 3000
    BASE_URL: 'http://localhost:3000',
    PAGES: {
        HOME: '/',
        POVERTY_MODELS: '/poverty-models.html',
        PROJECTS: '/projects.html',
        SETTINGS: '/settings.html',
        TEST_CHARTS: '/test-charts.html'
    }
};

// Make available globally
window.API_CONFIG = API_CONFIG;
window.FRONTEND_CONFIG = FRONTEND_CONFIG;

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, FRONTEND_CONFIG };
}

