/**
 * IPMAS Frontend Configuration
 * Configuration for frontend to connect to backend API
 */

// Backend API Configuration
// Auto-detect environment: use relative URLs in production, localhost/network IP in development
// You can force localhost by adding ?local=true to the URL or setting FORCE_LOCAL in localStorage
const hostname = window.location.hostname;
const urlParams = new URLSearchParams(window.location.search);
const forceLocal = urlParams.get('local') === 'true' || localStorage.getItem('FORCE_LOCAL') === 'true';
const isProduction = !forceLocal && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./);
const isNetworkIP = !isProduction && !forceLocal && (hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./) || hostname !== 'localhost' && hostname !== '127.0.0.1');

const API_CONFIG = {
    // Backend runs on port 3001 (API only) in development
    // In production, use explicit backend URL (can be overridden with ?local=true)
    BASE_URL: isProduction ? 'https://ipmas-backend.onrender.com' : (isNetworkIP ? `http://${hostname}:3001` : 'http://localhost:3001'),
    // Socket.IO server URL (same as backend)
    SOCKET_URL: isProduction ? 'https://ipmas-backend.onrender.com' : (isNetworkIP ? `http://${hostname}:3001` : 'http://localhost:3001'),
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

// Log configuration for debugging
console.log('🔧 API Configuration:', {
    hostname: hostname,
    isProduction: isProduction,
    isNetworkIP: isNetworkIP,
    BASE_URL: API_CONFIG.BASE_URL,
    SOCKET_URL: API_CONFIG.SOCKET_URL
});

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, FRONTEND_CONFIG };
}

