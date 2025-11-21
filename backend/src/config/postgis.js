/**
 * IPMAS Database Service
 * PostgreSQL with PostGIS for geospatial operations
 */

const { Pool } = require('pg');

class DatabaseService {
    constructor() {
        this.pool = null;
        this.isInitialized = false;
        this.mockData = null;
    }

    async initialize() {
        try {
            // Build DATABASE_URL from individual DB_* variables if DATABASE_URL is not set
            if (!process.env.DATABASE_URL && process.env.DB_HOST) {
                const dbUser = process.env.DB_USER || 'postgres';
                const dbPassword = process.env.DB_PASSWORD || '';
                const dbHost = process.env.DB_HOST || 'localhost';
                const dbPort = process.env.DB_PORT || '5432';
                const dbName = process.env.DB_NAME || 'ipmas';
                
                // Construct DATABASE_URL
                if (dbPassword) {
                    process.env.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
                } else {
                    process.env.DATABASE_URL = `postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}`;
                }
                
                console.log('📝 Constructed DATABASE_URL from individual DB_* variables');
            }
            
            // Only use mock data if DATABASE_URL is not provided
            if (!process.env.DATABASE_URL) {
                console.log('Using mock database for development');
                await this.initializeMockData();
                this.isInitialized = true;
                return;
            }

            // PostgreSQL connection (works in both development and production)
            console.log('Connecting to PostgreSQL database...');
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            // Initialize PostGIS extensions
            await this.pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
            await this.pool.query('CREATE EXTENSION IF NOT EXISTS postgis_topology;');
            
            // Create tables if they don't exist
            await this.createTables();
            
            this.isInitialized = true;
            console.log('✅ Database initialized successfully');
            console.log('✅ Using PostgreSQL database');
        } catch (error) {
            console.error('Database initialization failed:', error);
            // Fallback to mock data
            console.log('Falling back to mock database');
            await this.initializeMockData();
            this.isInitialized = true;
        }
    }

    async initializeMockData() {
        // Memory optimization: Load mock data on demand instead of all at once
        this.mockData = {
            locations: null, // Load on demand
            predictions: null,
            feedback: null,
            reports: null,
            scheduledReports: null,
            premiumRequests: []
        };
        
        // Set up lazy loading
        this.mockDataLoaders = {
            locations: () => this.generateMockLocations(),
            predictions: () => this.generateMockPredictions(),
            feedback: () => this.generateMockFeedback(),
            reports: () => this.generateMockReports(),
            scheduledReports: () => this.generateMockScheduledReports()
        };
    }

    generateMockLocations() {
        // Memory optimization: Generate smaller dataset with comprehensive locations
        const kenyaLocations = [
            // Nairobi County - Expanded with more areas
            { name: 'Nairobi Central', lat: -1.2921, lng: 36.8219, county: 'Nairobi', poverty_index: 45.2, education_access: 75.8, health_vulnerability: 38.5, water_access: 68.4, employment_rate: 72.1, housing_quality: 58.3 },
            { name: 'Kibera', lat: -1.3197, lng: 36.7806, county: 'Nairobi', poverty_index: 78.9, education_access: 45.2, health_vulnerability: 82.1, water_access: 35.6, employment_rate: 38.7, housing_quality: 25.4 },
            { name: 'Mathare', lat: -1.2847, lng: 36.8458, county: 'Nairobi', poverty_index: 82.3, education_access: 42.1, health_vulnerability: 85.2, water_access: 28.9, employment_rate: 35.2, housing_quality: 22.1 },
            { name: 'Karen', lat: -1.3197, lng: 36.7185, county: 'Nairobi', poverty_index: 10.5, education_access: 96.5, health_vulnerability: 8.2, water_access: 98.2, employment_rate: 94.5, housing_quality: 92.3 },
            { name: 'Westlands', lat: -1.2667, lng: 36.8000, county: 'Nairobi', poverty_index: 28.4, education_access: 89.2, health_vulnerability: 22.3, water_access: 92.1, employment_rate: 85.7, housing_quality: 78.9 },
            { name: 'Eastleigh', lat: -1.2739, lng: 36.8478, county: 'Nairobi', poverty_index: 52.1, education_access: 68.3, health_vulnerability: 48.7, water_access: 61.2, employment_rate: 64.8, housing_quality: 45.6 },
            { name: 'Runda', lat: -1.2333, lng: 36.7833, county: 'Nairobi', poverty_index: 22.3, education_access: 92.5, health_vulnerability: 18.7, water_access: 94.2, employment_rate: 88.9, housing_quality: 85.3 },
            { name: 'Lavington', lat: -1.2833, lng: 36.7667, county: 'Nairobi', poverty_index: 26.8, education_access: 90.1, health_vulnerability: 20.5, water_access: 93.1, employment_rate: 87.2, housing_quality: 81.4 },
            { name: 'Kawangware', lat: -1.2833, lng: 36.7833, county: 'Nairobi', poverty_index: 65.4, education_access: 56.7, health_vulnerability: 68.2, water_access: 48.3, employment_rate: 52.1, housing_quality: 38.9 },
            { name: 'Dandora', lat: -1.2500, lng: 36.8667, county: 'Nairobi', poverty_index: 74.2, education_access: 48.3, health_vulnerability: 78.9, water_access: 32.7, employment_rate: 42.6, housing_quality: 28.5 },
            { name: 'Huruma', lat: -1.2783, lng: 36.8600, county: 'Nairobi', poverty_index: 69.8, education_access: 51.4, health_vulnerability: 73.2, water_access: 38.9, employment_rate: 47.8, housing_quality: 32.4 },
            { name: 'Embakasi', lat: -1.3000, lng: 36.9167, county: 'Nairobi', poverty_index: 58.7, education_access: 62.3, health_vulnerability: 61.5, water_access: 54.2, employment_rate: 58.4, housing_quality: 48.7 },
            
            // Mombasa County
            { name: 'Mombasa Central', lat: -4.0435, lng: 39.6682, county: 'Mombasa', poverty_index: 38.7, education_access: 72.1, health_vulnerability: 41.3, water_access: 71.5, employment_rate: 68.9, housing_quality: 62.8 },
            { name: 'Likoni', lat: -4.0833, lng: 39.6667, county: 'Mombasa', poverty_index: 65.4, education_access: 58.3, health_vulnerability: 68.7, water_access: 52.1, employment_rate: 55.6, housing_quality: 45.2 },
            
            // Kisumu County
            { name: 'Kisumu Central', lat: -0.0917, lng: 34.7680, county: 'Kisumu', poverty_index: 52.3, education_access: 65.3, health_vulnerability: 58.9, water_access: 61.2, employment_rate: 59.8, housing_quality: 48.7 },
            { name: 'Kondele', lat: -0.0833, lng: 34.7500, county: 'Kisumu', poverty_index: 68.7, education_access: 52.4, health_vulnerability: 71.3, water_access: 48.9, employment_rate: 46.2, housing_quality: 38.5 },
            
            // Nakuru County
            { name: 'Nakuru Town', lat: -0.3072, lng: 36.0800, county: 'Nakuru', poverty_index: 41.8, education_access: 69.5, health_vulnerability: 44.2, water_access: 66.7, employment_rate: 64.3, housing_quality: 56.1 },
            { name: 'Naivasha', lat: -0.7167, lng: 36.4333, county: 'Nakuru', poverty_index: 38.2, education_access: 71.8, health_vulnerability: 39.6, water_access: 69.4, employment_rate: 67.5, housing_quality: 59.8 },
            
            // Eldoret County
            { name: 'Eldoret Central', lat: 0.5143, lng: 35.2697, county: 'Uasin Gishu', poverty_index: 35.6, education_access: 74.2, health_vulnerability: 37.8, water_access: 72.9, employment_rate: 71.4, housing_quality: 63.5 },
            
            // Thika County
            { name: 'Thika Town', lat: -1.0500, lng: 37.0833, county: 'Kiambu', poverty_index: 42.1, education_access: 68.7, health_vulnerability: 45.3, water_access: 65.2, employment_rate: 62.8, housing_quality: 55.4 },
            
            // Meru County
            { name: 'Meru Town', lat: 0.0500, lng: 37.6500, county: 'Meru', poverty_index: 48.9, education_access: 63.4, health_vulnerability: 52.1, water_access: 58.7, employment_rate: 58.3, housing_quality: 49.6 },
            
            // Kakamega County
            { name: 'Kakamega Town', lat: 0.2833, lng: 34.7500, county: 'Kakamega', poverty_index: 55.7, education_access: 59.8, health_vulnerability: 61.2, water_access: 54.3, employment_rate: 52.6, housing_quality: 43.8 },
            
            // Machakos County
            { name: 'Machakos Town', lat: -1.5167, lng: 37.2667, county: 'Machakos', poverty_index: 51.3, education_access: 61.7, health_vulnerability: 56.8, water_access: 57.9, employment_rate: 54.2, housing_quality: 46.5 },
            
            // Nyeri County
            { name: 'Nyeri Town', lat: -0.4167, lng: 36.9500, county: 'Nyeri', poverty_index: 39.6, education_access: 71.3, health_vulnerability: 42.8, water_access: 69.1, employment_rate: 67.4, housing_quality: 59.7 },
            
            // Kericho County
            { name: 'Kericho Town', lat: -0.3667, lng: 35.2833, county: 'Kericho', poverty_index: 43.2, education_access: 67.8, health_vulnerability: 46.5, water_access: 64.3, employment_rate: 61.7, housing_quality: 53.9 },
            
            // Kisii County
            { name: 'Kisii Town', lat: -0.6833, lng: 34.7667, county: 'Kisii', poverty_index: 54.1, education_access: 60.7, health_vulnerability: 58.9, water_access: 56.3, employment_rate: 53.8, housing_quality: 45.2 },
            
            // Garissa County
            { name: 'Garissa Town', lat: -0.4500, lng: 39.6333, county: 'Garissa', poverty_index: 68.4, education_access: 48.7, health_vulnerability: 72.1, water_access: 41.3, employment_rate: 43.8, housing_quality: 35.6 },
            
            // Mandera County
            { name: 'Mandera Town', lat: 3.9333, lng: 41.8500, county: 'Mandera', poverty_index: 72.8, education_access: 44.6, health_vulnerability: 76.3, water_access: 37.2, employment_rate: 39.7, housing_quality: 30.8 },
            
            // Wajir County
            { name: 'Wajir Town', lat: 1.7500, lng: 40.0667, county: 'Wajir', poverty_index: 69.7, education_access: 47.2, health_vulnerability: 73.5, water_access: 40.6, employment_rate: 42.8, housing_quality: 33.7 },
            
            // Marsabit County
            { name: 'Marsabit Town', lat: 2.3333, lng: 37.9833, county: 'Marsabit', poverty_index: 66.3, education_access: 50.4, health_vulnerability: 69.8, water_access: 43.7, employment_rate: 45.9, housing_quality: 37.1 },
            
            // Isiolo County
            { name: 'Isiolo Town', lat: 0.3500, lng: 37.5833, county: 'Isiolo', poverty_index: 58.4, education_access: 56.7, health_vulnerability: 62.1, water_access: 52.3, employment_rate: 54.8, housing_quality: 45.6 },
            
            // Kitui County
            { name: 'Kitui Town', lat: -1.3667, lng: 38.0167, county: 'Kitui', poverty_index: 62.3, education_access: 54.8, health_vulnerability: 66.7, water_access: 48.2, employment_rate: 50.9, housing_quality: 41.7 },
            
            // Makueni County
            { name: 'Wote', lat: -1.7833, lng: 37.6333, county: 'Makueni', poverty_index: 63.6, education_access: 53.9, health_vulnerability: 67.2, water_access: 47.4, employment_rate: 49.7, housing_quality: 40.3 },
            
            // Kilifi County
            { name: 'Kilifi Town', lat: -3.6333, lng: 39.8500, county: 'Kilifi', poverty_index: 56.7, education_access: 58.9, health_vulnerability: 60.3, water_access: 54.2, employment_rate: 56.1, housing_quality: 46.8 },
            
            // Kwale County
            { name: 'Kwale Town', lat: -4.1833, lng: 39.4500, county: 'Kwale', poverty_index: 64.2, education_access: 51.6, health_vulnerability: 68.7, water_access: 46.8, employment_rate: 49.3, housing_quality: 40.2 },
            
            // Taita Taveta County
            { name: 'Voi', lat: -3.4000, lng: 38.5667, county: 'Taita Taveta', poverty_index: 57.3, education_access: 57.9, health_vulnerability: 61.7, water_access: 53.2, employment_rate: 55.6, housing_quality: 47.1 },
            
            // Lamu County
            { name: 'Lamu Town', lat: -2.2667, lng: 40.9000, county: 'Lamu', poverty_index: 58.4, education_access: 56.2, health_vulnerability: 62.7, water_access: 52.3, employment_rate: 54.8, housing_quality: 45.6 }
        ];

        return kenyaLocations;
    }

    generateMockPredictions() {
        return [
            {
                coordinates: { lat: -1.2921, lng: 36.8219 },
                prediction_type: 'poverty_reduction',
                predicted_value: 15.2,
                confidence_score: 0.78,
                model_version: 'v1.0',
                created_at: new Date()
            },
            {
                coordinates: { lat: -4.0435, lng: 39.6682 },
                prediction_type: 'education_improvement',
                predicted_value: 8.7,
                confidence_score: 0.82,
                model_version: 'v1.0',
                created_at: new Date()
            }
        ];
    }

    generateMockFeedback() {
        return [
            {
                coordinates: { lat: -1.3197, lng: 36.7806 },
                feedback_type: 'water_access',
                content: 'Water shortage in Kibera area',
                urgency_level: 'High',
                demographic_info: { age_group: '25-35', gender: 'Female' },
                contact_info: { phone: '+254700000000' },
                status: 'pending',
                created_at: new Date()
            },
            {
                coordinates: { lat: -0.0917, lng: 34.7680 },
                feedback_type: 'health_service',
                content: 'Need for better healthcare access',
                urgency_level: 'Medium',
                demographic_info: { age_group: '35-45', gender: 'Male' },
                contact_info: { email: 'community@example.com' },
                status: 'in_progress',
                created_at: new Date()
            }
        ];
    }

    generateMockReports() {
        return [
            {
                coordinates: { lat: -1.2921, lng: 36.8219 },
                format: 'pdf',
                content: null,
                size: 1024000,
                created_at: new Date()
            },
            {
                coordinates: { lat: -4.0435, lng: 39.6682 },
                format: 'html',
                content: null,
                size: 512000,
                created_at: new Date()
            }
        ];
    }

    generateMockScheduledReports() {
        return [
            {
                coordinates: { lat: -1.2921, lng: 36.8219 },
                frequency: 'monthly',
                format: 'pdf',
                recipients: ['admin@ipmas.kenya', 'analyst@ipmas.kenya'],
                options: { include_charts: true, include_predictions: true },
                status: 'active',
                next_run: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                last_run: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                created_at: new Date()
            }
        ];
    }

    // Location methods
    async getLocationData(lat, lng) {
        if (!this.isInitialized) await this.initialize();
        
        if (this.mockData) {
            // Find closest location in mock data
            return this.mockData.locations.reduce((closest, location) => {
                const currentDistance = this.calculateDistance(lat, lng, location.lat, location.lng);
                const closestDistance = closest ? this.calculateDistance(lat, lng, closest.lat, closest.lng) : Infinity;
                return currentDistance < closestDistance ? location : closest;
            }, null);
        }
        
        // Production implementation
        const query = `
            SELECT *, ST_AsText(location_text) as location_wkt
            FROM geospatial_data 
            WHERE ST_DWithin(location_text, ST_SetSRID(ST_Point($1, $2), 4326), 0.01)
            ORDER BY ST_Distance(location_text, ST_SetSRID(ST_Point($1, $2), 4326))
            LIMIT 1
        `;
        
        const result = await this.pool.query(query, [lng, lat]);
        return result.rows[0] || null;
    }

    async searchLocationsByName(query) {
        if (!this.isInitialized) await this.initialize();
        
        // Validate query parameter
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return [];
        }
        
        if (this.mockData) {
            const cleanQuery = query.trim().toLowerCase();
            return this.mockData.locations.filter(loc =>
                (loc.name && loc.name.toLowerCase().includes(cleanQuery)) ||
                (loc.county && loc.county.toLowerCase().includes(cleanQuery))
            );
        }
        
        // Check if database connection exists
        if (!this.pool) {
            console.warn('⚠️ Database pool not available, returning empty results');
            return [];
        }
        
        // Production query - prioritize exact matches, then partial matches
        // Try exact match first, then partial match
        const cleanQuery = query.trim();
        
        try {
            // First try exact match (without wildcards)
            let searchQuery = `
                SELECT *, 
                       ST_AsText(location_text) as location_wkt,
                       ST_X(location_text) as lon,
                       ST_Y(location_text) as lat,
                       1 as match_priority
                FROM geospatial_data 
                WHERE LOWER(name) = LOWER($1) 
                   OR (LOWER(name) = LOWER($1) AND LOWER(county) = LOWER($2))
                ORDER BY name
                LIMIT 10
            `;
            
            let result = await this.pool.query(searchQuery, [cleanQuery, cleanQuery]);
            
            // If no exact match, try partial match
            if (result.rows.length === 0) {
                searchQuery = `
                    SELECT *, 
                           ST_AsText(location_text) as location_wkt,
                           ST_X(location_text) as lon,
                           ST_Y(location_text) as lat,
                           CASE 
                               WHEN LOWER(name) LIKE LOWER($1) || '%' THEN 2
                               WHEN LOWER(name) LIKE '%' || LOWER($1) || '%' THEN 3
                               WHEN LOWER(county) ILIKE $1 THEN 4
                               WHEN LOWER(ward) ILIKE $1 THEN 5
                               ELSE 6
                           END as match_priority
                    FROM geospatial_data 
                    WHERE name ILIKE $1 OR county ILIKE $1 OR ward ILIKE $1
                    ORDER BY match_priority, name
                    LIMIT 50
                `;
                
                result = await this.pool.query(searchQuery, [`%${cleanQuery}%`]);
            }
            
            return result.rows || [];
        } catch (error) {
            console.error('Database search error:', error);
            console.error('Query:', cleanQuery);
            // Return empty array instead of throwing to prevent crashes
            return [];
        }
    }

    async searchLocationsByCoordinates(lat, lng, radius) {
        if (!this.isInitialized) await this.initialize();
        
        if (this.mockData) {
            return this.mockData.locations.filter(loc => {
                const distance = this.calculateDistance(lat, lng, loc.latitude, loc.longitude);
                return distance <= radius;
            });
        }
        
        // Production query
        const query = `
            SELECT *, 
                   ST_AsText(location_text) as location_wkt,
                   ST_X(location_text) as lon,
                   ST_Y(location_text) as lat,
                   ST_Distance(location_text, ST_SetSRID(ST_Point($1, $2), 4326)) as distance
            FROM geospatial_data 
            WHERE ST_DWithin(location_text, ST_SetSRID(ST_Point($1, $2), 4326), $3)
            ORDER BY distance
        `;
        
        const result = await this.pool.query(query, [lng, lat, radius * 1000]); // Convert km to meters
        return result.rows;
    }

    async getNearbyLocations(lat, lng, radius, limit = 50) {
        if (!this.isInitialized) await this.initialize();
        
        if (this.mockData) {
            return this.mockData.locations.filter(location => {
                const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
                return distance <= radius;
            }).slice(0, limit);
        }
        
        // Production implementation
        const radiusDegrees = radius / 111; // Convert km to degrees
        
        const query = `
            SELECT id, name, county, longitude, latitude, poverty_index, education_access,
                   health_vulnerability, water_access, employment_rate, housing_quality,
                   ST_AsText(location_text) as location_wkt,
                   ST_Distance(location_text, ST_SetSRID(ST_Point($2, $1), 4326)) as distance
            FROM geospatial_data 
            WHERE ST_DWithin(location_text, ST_SetSRID(ST_Point($2, $1), 4326), $3)
            ORDER BY distance ASC
            LIMIT $4
        `;
        
        const result = await this.pool.query(query, [lat, lng, radiusDegrees, limit]);
        return result.rows;
    }

    async getLocationStatistics(lat, lng) {
        if (!this.isInitialized) await this.initialize();
        
        const location = await this.getLocationData(lat, lng);
        if (!location) return null;
        
        // Generate comprehensive statistics
        const stats = {
            basic_info: {
                name: location.name,
                county: location.county,
                coordinates: { lat, lng }
            },
            poverty_metrics: {
                index: location.poverty_index,
                severity: this.getSeverityLevel(location.poverty_index, 'poverty'),
                trend: this.calculateTrend('poverty', location.poverty_index),
                comparison: this.generateComparisonData('poverty', location)
            },
            education_metrics: {
                access_score: location.education_access,
                severity: this.getSeverityLevel(location.education_access, 'education'),
                trend: this.calculateTrend('education', location.education_access),
                comparison: this.generateComparisonData('education', location)
            },
            health_metrics: {
                vulnerability_score: location.health_vulnerability,
                severity: this.getSeverityLevel(location.health_vulnerability, 'health'),
                trend: this.calculateTrend('health', location.health_vulnerability),
                comparison: this.generateComparisonData('health', location)
            },
            infrastructure_metrics: {
                water_access: location.water_access,
                housing_quality: location.housing_quality,
                employment_rate: location.employment_rate
            },
            historical_data: {
                poverty: this.generateHistoricalData('poverty', location.poverty_index, '1y'),
                education: this.generateHistoricalData('education', location.education_access, '1y'),
                health: this.generateHistoricalData('health', location.health_vulnerability, '1y')
            },
            predictions: await this.getLocationPredictions(lat, lng),
            last_updated: new Date().toISOString()
        };
        
        return stats;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Analytics methods
    async getPovertyAnalytics(lat, lng, timeRange = '1y') {
        const location = await this.getLocationData(lat, lng);
        if (!location) return null;
        
        return {
            current: {
                poverty_index: location.poverty_index,
                severity_level: this.getSeverityLevel(location.poverty_index, 'poverty'),
                trend: this.calculateTrend('poverty', location.poverty_index)
            },
            historical: this.generateHistoricalData('poverty', location.poverty_index, timeRange),
            trends: this.generateTrendAnalysis('poverty', location.poverty_index),
            comparisons: this.generateComparisonData('poverty', location)
        };
    }

    async getHealthAnalytics(lat, lng) {
        const location = await this.getLocationData(lat, lng);
        if (!location) return null;
        
        return {
            vulnerability_score: location.health_vulnerability,
            access_score: 100 - location.health_vulnerability,
            disease_burden: this.generateDiseaseBurden(location.health_vulnerability),
            maternal_health: this.generateMaternalHealth(location.health_vulnerability),
            child_health: this.generateChildHealth(location.health_vulnerability)
        };
    }

    async getEducationAnalytics(lat, lng) {
        const location = await this.getLocationData(lat, lng);
        if (!location) return null;
        
        return {
            access_score: location.education_access,
            enrollment_rate: location.education_access * 0.9,
            completion_rate: location.education_access * 0.75,
            quality_index: location.education_access * 0.8,
            gender_parity: this.generateGenderParity(location.education_access)
        };
    }

    getSeverityLevel(value, metric) {
        const thresholds = {
            poverty: { low: 30, medium: 50, high: 70 },
            education: { low: 70, medium: 50, high: 30 },
            health: { low: 30, medium: 50, high: 70 },
            water: { low: 70, medium: 50, high: 30 },
            employment: { low: 30, medium: 50, high: 70 },
            housing: { low: 30, medium: 50, high: 70 }
        };

        const threshold = thresholds[metric];
        if (value >= threshold.high) return 'high';
        if (value >= threshold.medium) return 'medium';
        return 'low';
    }

    generateHistoricalData(metric, currentValue, timeRange) {
        const months = timeRange === '1y' ? 12 : timeRange === '5y' ? 60 : 6;
        const data = [];
        
        for (let i = months; i >= 0; i--) {
            const variation = (Math.random() - 0.5) * 10;
            const value = Math.max(0, Math.min(100, currentValue + variation + (months - i) * 0.5));
            data.push({
                date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
                value: Math.round(value * 10) / 10
            });
        }
        
        return data;
    }

    generateTrendAnalysis(metric, currentValue) {
        return {
            short_term: this.calculateTrend(metric, currentValue),
            medium_term: this.calculateTrend(metric, currentValue),
            long_term: this.calculateTrend(metric, currentValue)
        };
    }

    generateComparisonData(metric, location) {
        return {
            national_average: this.getNationalAverage(metric),
            county_average: this.getCountyAverage(metric, location.county),
            regional_average: this.getRegionalAverage(metric, location.county)
        };
    }

    getNationalAverage(metric) {
        const averages = {
            poverty: 36.1,
            education: 68.4,
            health: 42.3,
            water: 71.2,
            employment: 65.8,
            housing: 52.7
        };
        return averages[metric] || 50;
    }

    getCountyAverage(metric, county) {
        // Mock county averages
        return this.getNationalAverage(metric) + (Math.random() - 0.5) * 20;
    }

    getRegionalAverage(metric, county) {
        // Mock regional averages
        return this.getNationalAverage(metric) + (Math.random() - 0.5) * 15;
    }

    generateDiseaseBurden(vulnerabilityScore) {
        return {
            malaria: Math.round(vulnerabilityScore * 0.8),
            tuberculosis: Math.round(vulnerabilityScore * 0.6),
            hiv_aids: Math.round(vulnerabilityScore * 0.4),
            diarrhea: Math.round(vulnerabilityScore * 0.7),
            respiratory_infections: Math.round(vulnerabilityScore * 0.5)
        };
    }

    generateMaternalHealth(vulnerabilityScore) {
        return {
            antenatal_care: Math.round((100 - vulnerabilityScore) * 0.9),
            skilled_birth_attendance: Math.round((100 - vulnerabilityScore) * 0.8),
            postnatal_care: Math.round((100 - vulnerabilityScore) * 0.7),
            maternal_mortality_risk: Math.round(vulnerabilityScore * 1.2)
        };
    }

    generateChildHealth(vulnerabilityScore) {
        return {
            immunization_rate: Math.round((100 - vulnerabilityScore) * 0.85),
            malnutrition_rate: Math.round(vulnerabilityScore * 0.6),
            child_mortality_risk: Math.round(vulnerabilityScore * 1.1),
            school_health_programs: Math.round((100 - vulnerabilityScore) * 0.6)
        };
    }

    generateGenderParity(educationAccess) {
        return {
            primary: Math.round(educationAccess * (0.95 + Math.random() * 0.1)),
            secondary: Math.round(educationAccess * (0.85 + Math.random() * 0.2)),
            tertiary: Math.round(educationAccess * (0.75 + Math.random() * 0.3))
        };
    }

    calculateTrend(metric, currentValue) {
        const trends = ['improving', 'declining', 'stable'];
        const weights = [0.3, 0.2, 0.5]; // Favor stable trends
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < trends.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return {
                    direction: trends[i],
                    percentage: Math.round((Math.random() - 0.5) * 20 * 10) / 10
                };
            }
        }
        
        return { direction: 'stable', percentage: 0 };
    }

    // Prediction methods
    async getLocationPredictions(lat, lng) {
        if (!this.mockData) return null;
        
        return this.mockData.predictions.filter(pred => 
            Math.abs(pred.coordinates.lat - lat) < 0.01 && 
            Math.abs(pred.coordinates.lng - lng) < 0.01
        );
    }

    // Feedback methods
    async saveCommunityFeedback(feedbackData) {
        if (!this.isInitialized) await this.initialize();
        
        const feedback = {
            id: Date.now(),
            ...feedbackData,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        if (this.mockData) {
            this.mockData.feedback.push(feedback);
            return feedback;
        }
        
        // Production implementation
        const query = `
            INSERT INTO community_feedback 
            (coordinates, feedback_type, content, urgency_level, demographic_info, contact_info, status)
            VALUES (ST_SetSRID(ST_Point($1, $2), 4326), $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [
            feedbackData.coordinates.lng,
            feedbackData.coordinates.lat,
            feedbackData.feedback_type,
            feedbackData.content,
            feedbackData.urgency_level,
            JSON.stringify(feedbackData.demographic_info),
            JSON.stringify(feedbackData.contact_info),
            'pending'
        ]);
        
        return result.rows[0];
    }

    async getLocationFeedback(lat, lng, filters) {
        if (!this.mockData) return [];
        
        return this.mockData.feedback.filter(fb => {
            const distance = this.calculateDistance(lat, lng, fb.coordinates.lat, fb.coordinates.lng);
            return distance <= filters.radius;
        }).slice(0, filters.limit);
    }

    // Premium upgrade requests
    formatUpgradeRecord(record) {
        if (!record) return null;
        return {
            id: record.id,
            organizationName: record.organization_name || record.organizationName,
            contactPerson: record.contact_person || record.contactPerson,
            contactEmail: record.contact_email || record.contactEmail,
            contactPhone: record.contact_phone || record.contactPhone,
            paymentMethod: record.payment_method || record.paymentMethod,
            planTier: record.plan_tier || record.planTier || 'premium',
            notes: record.notes || null,
            status: record.status || 'received',
            source: record.source || 'web',
            daraja: {
                mode: record.daraja_mode || record.daraja?.mode || null,
                checkoutRequestId: record.daraja_checkout_id || record.daraja?.checkoutRequestId || null,
                merchantRequestId: record.daraja_merchant_id || record.daraja?.merchantRequestId || null,
                payload: record.daraja_response || record.daraja?.payload || null
            },
            createdAt: record.created_at || record.createdAt,
            updatedAt: record.updated_at || record.updatedAt
        };
    }

    async saveUpgradeRequest(requestData) {
        if (!this.isInitialized) await this.initialize();

        const now = new Date();
        const payload = {
            id: Date.now(),
            organization_name: requestData.organizationName,
            contact_person: requestData.contactPerson,
            contact_email: requestData.contactEmail,
            contact_phone: requestData.contactPhone,
            payment_method: requestData.paymentMethod,
            plan_tier: requestData.planTier || 'premium',
            notes: requestData.notes || null,
            status: requestData.status || 'received',
            source: requestData.source || 'web',
            daraja_mode: requestData.daraja?.mode || null,
            daraja_checkout_id: requestData.daraja?.checkoutRequestId || null,
            daraja_merchant_id: requestData.daraja?.merchantRequestId || null,
            daraja_response: requestData.daraja?.payload || null,
            created_at: now,
            updated_at: now
        };

        if (this.mockData) {
            this.mockData.premiumRequests.push(payload);
            return this.formatUpgradeRecord(payload);
        }

        const insertQuery = `
            INSERT INTO premium_upgrade_requests (
                organization_name,
                contact_person,
                contact_email,
                contact_phone,
                payment_method,
                plan_tier,
                notes,
                status,
                source,
                daraja_mode,
                daraja_checkout_id,
                daraja_merchant_id,
                daraja_response
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *
        `;

        const values = [
            payload.organization_name,
            payload.contact_person,
            payload.contact_email,
            payload.contact_phone,
            payload.payment_method,
            payload.plan_tier,
            payload.notes,
            payload.status,
            payload.source,
            payload.daraja_mode,
            payload.daraja_checkout_id,
            payload.daraja_merchant_id,
            payload.daraja_response ? JSON.stringify(payload.daraja_response) : null
        ];

        const result = await this.pool.query(insertQuery, values);
        return this.formatUpgradeRecord(result.rows[0]);
    }

    async getUpgradeRequests({ status, search, limit = 50, offset = 0 } = {}) {
        if (!this.isInitialized) await this.initialize();

        if (this.mockData) {
            let records = [...this.mockData.premiumRequests];
            if (status) {
                records = records.filter(item => (item.status || 'received') === status);
            }
            if (search) {
                const term = search.toLowerCase();
                records = records.filter(item =>
                    item.organization_name.toLowerCase().includes(term) ||
                    item.contact_person.toLowerCase().includes(term) ||
                    item.contact_email.toLowerCase().includes(term)
                );
            }
            const total = records.length;
            const paginated = records
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(offset, offset + limit)
                .map(rec => this.formatUpgradeRecord(rec));

            return { total, records: paginated };
        }

        const conditions = [];
        const params = [];

        if (status) {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            conditions.push(`(organization_name ILIKE $${params.length - 2} OR contact_person ILIKE $${params.length - 1} OR contact_email ILIKE $${params.length})`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM premium_upgrade_requests ${whereClause}`;
        const countResult = await this.pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count, 10);

        params.push(limit);
        params.push(offset);

        const dataQuery = `
            SELECT *
            FROM premium_upgrade_requests
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${params.length - 1}
            OFFSET $${params.length}
        `;

        const result = await this.pool.query(dataQuery, params);
        return {
            total,
            records: result.rows.map(row => this.formatUpgradeRecord(row))
        };
    }

    async getUpgradeRequestById(id) {
        if (!this.isInitialized) await this.initialize();

        if (this.mockData) {
            const record = this.mockData.premiumRequests.find(item => String(item.id) === String(id));
            return this.formatUpgradeRecord(record);
        }

        const query = `
            SELECT *
            FROM premium_upgrade_requests
            WHERE id = $1
        `;

        const result = await this.pool.query(query, [id]);
        return this.formatUpgradeRecord(result.rows[0] || null);
    }

    // Payment verification methods
    async verifyMpesaPayment(transactionCode, expectedAmount = null) {
        if (!this.isInitialized) await this.initialize();

        // Check if payment exists in database (should be added via webhook or manual entry)
        const query = `
            SELECT *
            FROM payments
            WHERE transaction_code = $1
            AND payment_method = 'M-Pesa'
            AND verified = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await this.pool.query(query, [transactionCode]);
        
        if (result.rows.length === 0) {
            // Payment not found - this means the M-Pesa payment hasn't been received yet
            // or the transaction code is incorrect
            return {
                verified: false,
                message: 'M-Pesa transaction code not found. Please ensure you have completed the M-Pesa payment and received the transaction code via SMS.'
            };
        }

        const payment = result.rows[0];
        const actualAmount = parseFloat(payment.amount);
        
        // If expected amount is provided, check if payment is sufficient
        if (expectedAmount !== null && actualAmount < expectedAmount) {
            return {
                verified: false,
                amount: actualAmount,
                message: `Payment amount insufficient. Expected at least ${expectedAmount} KES, received ${actualAmount} KES.`
            };
        }

        // Verify and update payment
        const updateQuery = `
            UPDATE payments
            SET verified = TRUE,
                verified_at = CURRENT_TIMESTAMP,
                status = 'verified',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await this.pool.query(updateQuery, [payment.id]);
        
        return {
            verified: true,
            id: payment.id,
            amount: actualAmount,
            message: 'M-Pesa payment verified successfully.'
        };
    }

    async verifyPayPalPayment(paypalEmail, expectedAmount) {
        if (!this.isInitialized) await this.initialize();

        // Check if payment exists in database
        const query = `
            SELECT *
            FROM payments
            WHERE paypal_email = $1
            AND payment_method = 'PayPal'
            AND verified = FALSE
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await this.pool.query(query, [paypalEmail.toLowerCase()]);
        
        if (result.rows.length === 0) {
            // Payment not found - create pending payment record
            const insertQuery = `
                INSERT INTO payments (
                    payment_method,
                    paypal_email,
                    amount,
                    currency,
                    status,
                    verified,
                    contact_email
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const insertResult = await this.pool.query(insertQuery, [
                'PayPal',
                paypalEmail.toLowerCase(),
                expectedAmount,
                'KES',
                'pending',
                false,
                paypalEmail.toLowerCase()
            ]);

            return {
                verified: false,
                id: insertResult.rows[0].id,
                message: 'PayPal payment verification pending. Please complete payment through PayPal.'
            };
        }

        const payment = result.rows[0];
        
        // Check if amount matches
        if (parseFloat(payment.amount) !== expectedAmount) {
            return {
                verified: false,
                message: `Payment amount mismatch. Expected ${expectedAmount} KES, received ${payment.amount} KES.`
            };
        }

        // Verify and update payment
        const updateQuery = `
            UPDATE payments
            SET verified = TRUE,
                verified_at = CURRENT_TIMESTAMP,
                status = 'verified',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        const updateResult = await this.pool.query(updateQuery, [payment.id]);
        
        return {
            verified: true,
            id: payment.id,
            amount: parseFloat(payment.amount),
            message: 'PayPal payment verified successfully.'
        };
    }

    async verifyCardPayment(cardDetails) {
        if (!this.isInitialized) await this.initialize();

        const { cardNumber, cardExpiry, cardCVC, cardName, amount, email } = cardDetails;
        const cardLastFour = cardNumber.slice(-4);

        // In production, this would integrate with a payment gateway (Stripe, etc.)
        // For now, we'll create a payment record and mark it as verified
        // In a real system, you'd process the payment through a gateway first

        const insertQuery = `
            INSERT INTO payments (
                payment_method,
                card_last_four,
                amount,
                currency,
                status,
                verified,
                contact_email,
                payment_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const paymentData = {
            cardExpiry,
            cardName,
            // Never store full card number or CVC
            maskedCard: `**** **** **** ${cardLastFour}`
        };

        const result = await this.pool.query(insertQuery, [
            'Card',
            cardLastFour,
            amount,
            'KES',
            'verified', // In production, this would be set after gateway confirmation
            true, // In production, verify through payment gateway first
            email,
            JSON.stringify(paymentData)
        ]);

        return {
            verified: true,
            id: result.rows[0].id,
            amount: parseFloat(amount),
            message: 'Card payment processed successfully.'
        };
    }

    async savePayment(paymentData) {
        if (!this.isInitialized) await this.initialize();

        const insertQuery = `
            INSERT INTO payments (
                payment_method,
                transaction_code,
                paypal_email,
                amount,
                currency,
                status,
                verified,
                contact_email,
                contact_phone,
                organization_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            paymentData.paymentMethod,
            paymentData.transactionCode || null,
            paymentData.paypalEmail || null,
            paymentData.amount,
            'KES',
            'pending',
            false,
            paymentData.contactEmail,
            paymentData.contactPhone || null,
            paymentData.organizationName || null
        ];

        const result = await this.pool.query(insertQuery, values);
        return result.rows[0];
    }

    async createSubscription(subscriptionData) {
        if (!this.isInitialized) await this.initialize();

        const dateFrom = new Date();
        const dateTo = new Date();
        dateTo.setDate(dateTo.getDate() + subscriptionData.subscriptionDays);

        const insertQuery = `
            INSERT INTO subscriptions (
                user_email,
                username,
                organization_name,
                package_name,
                package_amount,
                amount_paid,
                subscription_days,
                date_from,
                date_to,
                status,
                payment_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            subscriptionData.userEmail,
            subscriptionData.username || null,
            subscriptionData.organizationName || null,
            subscriptionData.packageName || 'premium',
            subscriptionData.packageAmount,
            subscriptionData.amountPaid,
            subscriptionData.subscriptionDays,
            dateFrom,
            dateTo,
            'active',
            subscriptionData.paymentId
        ];

        const result = await this.pool.query(insertQuery, values);
        const subscription = result.rows[0];

        console.log(`✅ Subscription created: ${subscriptionData.userEmail} - ${subscriptionData.subscriptionDays} days (ID: ${subscription.id})`);
        
        return {
            id: subscription.id,
            userEmail: subscription.user_email,
            username: subscription.username,
            organizationName: subscription.organization_name,
            packageName: subscription.package_name,
            packageAmount: parseFloat(subscription.package_amount),
            amountPaid: parseFloat(subscription.amount_paid),
            subscriptionDays: subscription.subscription_days,
            dateFrom: subscription.date_from,
            dateTo: subscription.date_to,
            status: subscription.status,
            paymentId: subscription.payment_id
        };
    }

    async getActiveSubscription(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            SELECT *
            FROM subscriptions
            WHERE user_email = $1
            AND status = 'active'
            AND date_to > CURRENT_TIMESTAMP
            ORDER BY date_to DESC
            LIMIT 1
        `;

        const result = await this.pool.query(query, [email.toLowerCase()]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const subscription = result.rows[0];
        return {
            id: subscription.id,
            userEmail: subscription.user_email,
            username: subscription.username,
            organizationName: subscription.organization_name,
            packageName: subscription.package_name,
            packageAmount: parseFloat(subscription.package_amount),
            amountPaid: parseFloat(subscription.amount_paid),
            subscriptionDays: subscription.subscription_days,
            dateFrom: subscription.date_from,
            dateTo: subscription.date_to,
            status: subscription.status,
            paymentId: subscription.payment_id,
            isActive: new Date(subscription.date_to) > new Date()
        };
    }

    async checkSubscriptionStatus(email) {
        if (!this.isInitialized) await this.initialize();

        const subscription = await this.getActiveSubscription(email);
        
        if (!subscription) {
            return {
                hasActiveSubscription: false,
                isPremium: false,
                message: 'No active subscription found.'
            };
        }

        const now = new Date();
        const expiryDate = new Date(subscription.dateTo);
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        // Update status if expired
        if (expiryDate < now && subscription.status === 'active') {
            const updateQuery = `
                UPDATE subscriptions
                SET status = 'expired',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await this.pool.query(updateQuery, [subscription.id]);
            subscription.status = 'expired';
        }

        return {
            hasActiveSubscription: subscription.status === 'active' && expiryDate > now,
            isPremium: subscription.status === 'active' && expiryDate > now,
            subscription: subscription,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            message: daysRemaining > 0 
                ? `Premium subscription active. ${daysRemaining} days remaining.`
                : 'Premium subscription has expired.'
        };
    }

    async activatePremium(email, paymentId) {
        if (!this.isInitialized) await this.initialize();

        // Update payment record to mark premium as activated
        const updatePaymentQuery = `
            UPDATE payments
            SET premium_activated = TRUE,
                premium_activated_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await this.pool.query(updatePaymentQuery, [paymentId]);

        // In a real system, you would also:
        // 1. Create/update a user record with premium status
        // 2. Set premium expiration date
        // 3. Send activation email
        // 4. Update user session/token

        console.log(`✅ Premium activated for ${email} (Payment ID: ${paymentId})`);
        
        return {
            success: true,
            email: email,
            paymentId: paymentId,
            activatedAt: new Date()
        };
    }

    // Report methods
    async getReportHistory(filters) {
        if (!this.mockData) return [];
        
        return this.mockData.reports.filter(report => {
            if (filters.format && report.format !== filters.format) return false;
            if (filters.dateFrom && report.created_at < filters.dateFrom) return false;
            if (filters.dateTo && report.created_at > filters.dateTo) return false;
            return true;
        }).slice(0, filters.limit);
    }

    async getScheduledReports(filters) {
        if (!this.mockData) return [];
        
        return this.mockData.scheduledReports.filter(report => {
            if (filters.status && report.status !== filters.status) return false;
            return true;
        }).slice(0, filters.limit);
    }

    // Utility methods
    async createTables() {
        const createTablesSQL = `
            CREATE TABLE IF NOT EXISTS geospatial_data (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                county VARCHAR(100),
                location_text GEOMETRY(POINT, 4326),
                longitude DECIMAL(10, 7),
                latitude DECIMAL(10, 7),
                poverty_index DECIMAL(5, 2),
                education_access DECIMAL(5, 2),
                health_vulnerability DECIMAL(5, 2),
                water_access DECIMAL(5, 2),
                employment_rate DECIMAL(5, 2),
                housing_quality DECIMAL(5, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                location_id INTEGER REFERENCES geospatial_data(id),
                coordinates GEOMETRY(POINT, 4326),
                prediction_type VARCHAR(50),
                predicted_value DECIMAL(10, 4),
                confidence_score DECIMAL(5, 4),
                model_version VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS community_feedback (
                id SERIAL PRIMARY KEY,
                coordinates GEOMETRY(POINT, 4326),
                feedback_type VARCHAR(50),
                content TEXT,
                urgency_level VARCHAR(20),
                demographic_info JSONB,
                contact_info JSONB,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                coordinates GEOMETRY(POINT, 4326),
                format VARCHAR(10),
                content BYTEA,
                size INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS scheduled_reports (
                id SERIAL PRIMARY KEY,
                coordinates GEOMETRY(POINT, 4326),
                frequency VARCHAR(20),
                format VARCHAR(10),
                recipients TEXT[],
                options JSONB,
                status VARCHAR(20) DEFAULT 'active',
                next_run TIMESTAMP,
                last_run TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_geospatial_location ON geospatial_data USING GIST (location_text);
            CREATE INDEX IF NOT EXISTS idx_predictions_coordinates ON predictions USING GIST (coordinates);
            CREATE INDEX IF NOT EXISTS idx_feedback_coordinates ON community_feedback USING GIST (coordinates);
            
            CREATE TABLE IF NOT EXISTS premium_upgrade_requests (
                id SERIAL PRIMARY KEY,
                organization_name VARCHAR(255) NOT NULL,
                contact_person VARCHAR(255) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                plan_tier VARCHAR(50) DEFAULT 'premium',
                notes TEXT,
                status VARCHAR(50) DEFAULT 'received',
                source VARCHAR(50) DEFAULT 'web',
                daraja_mode VARCHAR(20),
                daraja_checkout_id VARCHAR(100),
                daraja_merchant_id VARCHAR(100),
                daraja_response JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_premium_upgrade_status ON premium_upgrade_requests(status);
            CREATE INDEX IF NOT EXISTS idx_premium_upgrade_created_at ON premium_upgrade_requests(created_at DESC);

            -- Payments table for storing payment details
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                payment_method VARCHAR(50) NOT NULL,
                transaction_code VARCHAR(100),
                paypal_email VARCHAR(255),
                card_last_four VARCHAR(4),
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'KES',
                status VARCHAR(50) DEFAULT 'pending',
                verified BOOLEAN DEFAULT FALSE,
                verified_at TIMESTAMP,
                contact_email VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50),
                organization_name VARCHAR(255),
                premium_activated BOOLEAN DEFAULT FALSE,
                premium_activated_at TIMESTAMP,
                payment_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_payments_transaction_code ON payments(transaction_code);
            CREATE INDEX IF NOT EXISTS idx_payments_paypal_email ON payments(paypal_email);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
            CREATE INDEX IF NOT EXISTS idx_payments_verified ON payments(verified);
            CREATE INDEX IF NOT EXISTS idx_payments_contact_email ON payments(contact_email);

            -- Subscriptions table for managing premium subscriptions
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                username VARCHAR(255),
                organization_name VARCHAR(255),
                package_name VARCHAR(100) DEFAULT 'premium',
                package_amount DECIMAL(10, 2) NOT NULL,
                amount_paid DECIMAL(10, 2) NOT NULL,
                subscription_days INTEGER NOT NULL,
                date_from TIMESTAMP NOT NULL,
                date_to TIMESTAMP NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                payment_id INTEGER REFERENCES payments(id),
                auto_renew BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_date_to ON subscriptions(date_to);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);

            -- Users table for authentication
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                username VARCHAR(255),
                organization_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

            -- Sessions table for managing user sessions
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
            CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON user_sessions(user_email);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

            -- User preferences and settings table
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                preference_key VARCHAR(100) NOT NULL,
                preference_value JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, preference_key)
            );

            CREATE INDEX IF NOT EXISTS idx_user_preferences_email ON user_preferences(user_email);
            CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

            -- User feedback table
            CREATE TABLE IF NOT EXISTS user_feedback (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                feedback_type VARCHAR(50),
                content TEXT NOT NULL,
                priority VARCHAR(20),
                status VARCHAR(20) DEFAULT 'pending',
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_user_feedback_email ON user_feedback(user_email);
            CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
            CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);

            -- Dashboard customization table
            CREATE TABLE IF NOT EXISTS dashboard_customization (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                layout_data JSONB NOT NULL,
                favorite_kpis JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email)
            );

            CREATE INDEX IF NOT EXISTS idx_dashboard_customization_email ON dashboard_customization(user_email);

            -- Filter presets table
            CREATE TABLE IF NOT EXISTS filter_presets (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                preset_name VARCHAR(100) NOT NULL,
                preset_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, preset_name)
            );

            CREATE INDEX IF NOT EXISTS idx_filter_presets_email ON filter_presets(user_email);

            -- Notification settings table
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                settings_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email)
            );

            CREATE INDEX IF NOT EXISTS idx_notification_settings_email ON notification_settings(user_email);

            -- Download requests table
            CREATE TABLE IF NOT EXISTS download_requests (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                request_type VARCHAR(50),
                request_data JSONB,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_download_requests_email ON download_requests(user_email);
            CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status);

            -- Shared data table
            CREATE TABLE IF NOT EXISTS shared_data (
                id SERIAL PRIMARY KEY,
                share_id VARCHAR(100) UNIQUE NOT NULL,
                user_email VARCHAR(255),
                share_type VARCHAR(50),
                share_data JSONB NOT NULL,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_shared_data_share_id ON shared_data(share_id);
            CREATE INDEX IF NOT EXISTS idx_shared_data_email ON shared_data(user_email);
            CREATE INDEX IF NOT EXISTS idx_shared_data_expires_at ON shared_data(expires_at);

            -- Area report data table
            CREATE TABLE IF NOT EXISTS area_report_data (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                location_name VARCHAR(255),
                report_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_area_report_data_email ON area_report_data(user_email);
            CREATE INDEX IF NOT EXISTS idx_area_report_data_location ON area_report_data(location_name);
        `;
        
        await this.pool.query(createTablesSQL);
    }

    async getAllPovertyData() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Return mock data if using mock database
            if (this.mockData) {
                return this.mockData.locations || [];
            }

            // Query PostgreSQL database
            const query = `
                SELECT 
                    id,
                    name,
                    county,
                    latitude,
                    longitude,
                    poverty_index,
                    education_access,
                    health_vulnerability,
                    water_access,
                    housing_quality,
                    employment_rate,
                    created_at,
                    updated_at
                FROM geospatial_data 
                WHERE poverty_index IS NOT NULL
                ORDER BY updated_at DESC
            `;

            const result = await this.pool.query(query);
            return result.rows;

        } catch (error) {
            console.error('Error fetching all poverty data:', error);
            return [];
        }
    }

    // Authentication methods
    async createUser(email, password, username = null, organizationName = null) {
        if (!this.isInitialized) await this.initialize();

        const crypto = require('crypto');
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        const passwordHash = `${salt}:${hash}`;

        const query = `
            INSERT INTO users (email, password_hash, username, organization_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                username = COALESCE(EXCLUDED.username, users.username),
                organization_name = COALESCE(EXCLUDED.organization_name, users.organization_name),
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, email, username, organization_name, created_at
        `;

        const result = await this.pool.query(query, [email, passwordHash, username, organizationName]);
        return result.rows[0];
    }

    async verifyUser(email, password) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT id, email, password_hash, username, organization_name FROM users WHERE email = $1`;
        const result = await this.pool.query(query, [email]);

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];
        const crypto = require('crypto');
        const [salt, hash] = user.password_hash.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

        if (hash !== verifyHash) {
            return null;
        }

        // Update last login
        await this.pool.query(
            `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
            [user.id]
        );

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            organizationName: user.organization_name
        };
    }

    async getUserByEmail(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT id, email, username, organization_name, created_at, last_login FROM users WHERE email = $1`;
        const result = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }

    async createSession(userEmail, expiresInDays = 30) {
        if (!this.isInitialized) await this.initialize();

        const crypto = require('crypto');
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const query = `
            INSERT INTO user_sessions (user_email, session_token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING session_token, expires_at, created_at
        `;

        const result = await this.pool.query(query, [userEmail, sessionToken, expiresAt]);
        return result.rows[0];
    }

    async verifySession(sessionToken) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            SELECT us.user_email, us.expires_at, us.last_activity,
                   u.id, u.email, u.username, u.organization_name
            FROM user_sessions us
            JOIN users u ON us.user_email = u.email
            WHERE us.session_token = $1 AND us.expires_at > CURRENT_TIMESTAMP
        `;

        const result = await this.pool.query(query, [sessionToken]);

        if (result.rows.length === 0) {
            return null;
        }

        // Update last activity
        await this.pool.query(
            `UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = $1`,
            [sessionToken]
        );

        return {
            email: result.rows[0].email,
            userId: result.rows[0].id,
            username: result.rows[0].username,
            organizationName: result.rows[0].organization_name,
            expiresAt: result.rows[0].expires_at
        };
    }

    async deleteSession(sessionToken) {
        if (!this.isInitialized) await this.initialize();

        const query = `DELETE FROM user_sessions WHERE session_token = $1`;
        await this.pool.query(query, [sessionToken]);
    }

    async deleteUserSessions(userEmail) {
        if (!this.isInitialized) await this.initialize();

        const query = `DELETE FROM user_sessions WHERE user_email = $1`;
        await this.pool.query(query, [userEmail]);
    }

    async cleanupExpiredSessions() {
        if (!this.isInitialized) await this.initialize();

        const query = `DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP`;
        await this.pool.query(query);
    }

    // User preferences methods
    async saveUserPreference(email, key, value) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO user_preferences (user_email, preference_key, preference_value)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_email, preference_key)
            DO UPDATE SET preference_value = EXCLUDED.preference_value, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await this.pool.query(query, [email, key, JSON.stringify(value)]);
        return result.rows[0];
    }

    async getUserPreference(email, key) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT preference_value FROM user_preferences WHERE user_email = $1 AND preference_key = $2`;
        const result = await this.pool.query(query, [email, key]);
        return result.rows[0] ? result.rows[0].preference_value : null;
    }

    async getAllUserPreferences(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT preference_key, preference_value FROM user_preferences WHERE user_email = $1`;
        const result = await this.pool.query(query, [email]);
        const preferences = {};
        result.rows.forEach(row => {
            preferences[row.preference_key] = row.preference_value;
        });
        return preferences;
    }

    // Feedback methods
    async saveFeedback(feedbackData) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO user_feedback (user_email, feedback_type, content, priority, status, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await this.pool.query(query, [
            feedbackData.user_email || null,
            feedbackData.feedback_type || null,
            feedbackData.content,
            feedbackData.priority || 'medium',
            feedbackData.status || 'pending',
            JSON.stringify(feedbackData.metadata || {})
        ]);
        return result.rows[0];
    }

    async getUserFeedback(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT * FROM user_feedback WHERE user_email = $1 ORDER BY created_at DESC`;
        const result = await this.pool.query(query, [email]);
        return result.rows.map(row => ({
            ...row,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }));
    }

    // Dashboard customization methods
    async saveDashboardCustomization(email, layoutData, favoriteKPIs) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO dashboard_customization (user_email, layout_data, favorite_kpis)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_email)
            DO UPDATE SET layout_data = EXCLUDED.layout_data, 
                         favorite_kpis = EXCLUDED.favorite_kpis,
                         updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await this.pool.query(query, [
            email,
            JSON.stringify(layoutData),
            JSON.stringify(favoriteKPIs || [])
        ]);
        return result.rows[0];
    }

    async getDashboardCustomization(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT * FROM dashboard_customization WHERE user_email = $1`;
        const result = await this.pool.query(query, [email]);
        if (result.rows.length === 0) return null;
        
        const row = result.rows[0];
        return {
            layout_data: typeof row.layout_data === 'string' ? JSON.parse(row.layout_data) : row.layout_data,
            favorite_kpis: typeof row.favorite_kpis === 'string' ? JSON.parse(row.favorite_kpis) : row.favorite_kpis
        };
    }

    // Filter presets methods
    async saveFilterPreset(email, presetName, presetData) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO filter_presets (user_email, preset_name, preset_data)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_email, preset_name)
            DO UPDATE SET preset_data = EXCLUDED.preset_data, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await this.pool.query(query, [email, presetName, JSON.stringify(presetData)]);
        return result.rows[0];
    }

    async getUserFilterPresets(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT * FROM filter_presets WHERE user_email = $1 ORDER BY created_at DESC`;
        const result = await this.pool.query(query, [email]);
        return result.rows.map(row => ({
            name: row.preset_name,
            data: typeof row.preset_data === 'string' ? JSON.parse(row.preset_data) : row.preset_data,
            created_at: row.created_at
        }));
    }

    // Notification settings methods
    async saveNotificationSettings(email, settingsData) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO notification_settings (user_email, settings_data)
            VALUES ($1, $2)
            ON CONFLICT (user_email)
            DO UPDATE SET settings_data = EXCLUDED.settings_data, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await this.pool.query(query, [email, JSON.stringify(settingsData)]);
        return result.rows[0];
    }

    async getNotificationSettings(email) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT settings_data FROM notification_settings WHERE user_email = $1`;
        const result = await this.pool.query(query, [email]);
        if (result.rows.length === 0) return null;
        return typeof result.rows[0].settings_data === 'string' 
            ? JSON.parse(result.rows[0].settings_data) 
            : result.rows[0].settings_data;
    }

    // Download requests methods
    async saveDownloadRequest(requestData) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO download_requests (user_email, request_type, request_data, status)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await this.pool.query(query, [
            requestData.user_email || null,
            requestData.request_type || 'data_export',
            JSON.stringify(requestData.request_data || {}),
            requestData.status || 'pending'
        ]);
        return result.rows[0];
    }

    // Shared data methods
    async saveSharedData(shareId, email, shareType, shareData, expiresAt = null) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO shared_data (share_id, user_email, share_type, share_data, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (share_id)
            DO UPDATE SET share_data = EXCLUDED.share_data, expires_at = EXCLUDED.expires_at
            RETURNING *
        `;
        const result = await this.pool.query(query, [
            shareId,
            email || null,
            shareType,
            JSON.stringify(shareData),
            expiresAt
        ]);
        return result.rows[0];
    }

    async getSharedData(shareId) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT * FROM shared_data WHERE share_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`;
        const result = await this.pool.query(query, [shareId]);
        if (result.rows.length === 0) return null;
        
        const row = result.rows[0];
        return {
            type: row.share_type,
            data: typeof row.share_data === 'string' ? JSON.parse(row.share_data) : row.share_data
        };
    }

    // Area report data methods
    async saveAreaReportData(email, locationName, reportData) {
        if (!this.isInitialized) await this.initialize();

        const query = `
            INSERT INTO area_report_data (user_email, location_name, report_data)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            RETURNING *
        `;
        const result = await this.pool.query(query, [
            email || null,
            locationName,
            JSON.stringify(reportData)
        ]);
        return result.rows[0];
    }

    async getAreaReportData(email, locationName) {
        if (!this.isInitialized) await this.initialize();

        const query = `SELECT report_data FROM area_report_data WHERE user_email = $1 AND location_name = $2 ORDER BY updated_at DESC LIMIT 1`;
        const result = await this.pool.query(query, [email, locationName]);
        if (result.rows.length === 0) return null;
        return typeof result.rows[0].report_data === 'string' 
            ? JSON.parse(result.rows[0].report_data) 
            : result.rows[0].report_data;
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

// Export singleton instance
const dbService = new DatabaseService();
module.exports = dbService;
