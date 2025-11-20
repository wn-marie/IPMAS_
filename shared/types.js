/**
 * Shared Type Definitions for IPMAS System
 * Common data structures and interfaces
 */

// Location Types
export const LocationTypes = {
  COUNTRY: 'country',
  COUNTY: 'county',
  WARD: 'ward',
  VILLAGE: 'village'
};

// Poverty Index Types
export const PovertyIndexTypes = {
  COMPREHENSIVE: 'comprehensive',
  INCOME_BASED: 'income_based',
  MULTIDIMENSIONAL: 'multidimensional'
};

// Data Collection Types
export const DataCollectionTypes = {
  SURVEY: 'survey',
  CENSUS: 'census',
  ADMINISTRATIVE: 'administrative',
  SATELLITE: 'satellite'
};

// Report Types
export const ReportTypes = {
  SUMMARY: 'summary',
  DETAILED: 'detailed',
  COMPARATIVE: 'comparative',
  TREND: 'trend'
};

// User Roles
export const UserRoles = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
  DATA_COLLECTOR: 'data_collector'
};

// API Response Status
export const ApiStatus = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Map Layer Types
export const MapLayerTypes = {
  POVERTY_INDEX: 'poverty_index',
  POPULATION_DENSITY: 'population_density',
  INFRASTRUCTURE: 'infrastructure',
  SERVICES: 'services'
};
