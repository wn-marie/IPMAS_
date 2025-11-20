/**
 * Shared Constants for IPMAS System
 * Common constants used across frontend and backend
 */

// API Configuration
// Frontend will use this to construct API URLs
export const API_CONFIG = {
  // Backend API runs on port 3001
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.ipmas.com' 
    : 'http://localhost:3001',
  VERSION: 'v1',
  ENDPOINTS: {
    ANALYTICS: '/api/v1/analytics',
    LOCATION: '/api/v1/location',
    REPORTS: '/api/v1/reports',
    QUESTIONNAIRE: '/api/v1/questionnaire',
    FEEDBACK: '/api/v1/feedback'
  }
};

// Frontend configuration
export const FRONTEND_CONFIG = {
  // Frontend runs on port 3000
  BASE_URL: process.env.NODE_ENV === 'production'
    ? 'https://ipmas.kenya.gov'
    : 'http://localhost:3000',
  PAGES: {
    HOME: '/',
    REPORTS: '/global-reports.html',
    POVERTY_MODELS: '/poverty-models.html',
    POVERTY_MAP: '/poverty-map.html',
    PROJECTS: '/projects.html',
    SETTINGS: '/settings.html'
  }
};

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [-1.2921, 36.8219], // Nairobi, Kenya
  DEFAULT_ZOOM: 6,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  TILE_LAYERS: {
    OPENSTREETMAP: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    MAPBOX: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}'
  }
};

// Poverty Index Configuration
export const POVERTY_CONFIG = {
  LEVELS: {
    VERY_LOW: { min: 0, max: 0.2, color: '#2E8B57', label: 'Very Low' },
    LOW: { min: 0.2, max: 0.4, color: '#90EE90', label: 'Low' },
    MODERATE: { min: 0.4, max: 0.6, color: '#FFD700', label: 'Moderate' },
    HIGH: { min: 0.6, max: 0.8, color: '#FF8C00', label: 'High' },
    VERY_HIGH: { min: 0.8, max: 1.0, color: '#FF4500', label: 'Very High' }
  },
  INDICATORS: [
    'income',
    'education',
    'health',
    'housing',
    'employment',
    'access_to_services'
  ]
};

// Chart Configuration
export const CHART_CONFIG = {
  COLORS: {
    PRIMARY: '#2E8B57',
    SECONDARY: '#90EE90',
    ACCENT: '#FFD700',
    WARNING: '#FF8C00',
    DANGER: '#FF4500'
  },
  DEFAULTS: {
    RESPONSIVE: true,
    MAINTAIN_ASPECT_RATIO: false,
    ANIMATION_DURATION: 1000
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DATA_SAVED: 'Data saved successfully.',
  DATA_UPDATED: 'Data updated successfully.',
  DATA_DELETED: 'Data deleted successfully.',
  OPERATION_SUCCESS: 'Operation completed successfully.'
};
