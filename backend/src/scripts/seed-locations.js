/**
 * IPMAS Database Seeding Script
 * Populates the database with comprehensive location data
 * Run this script to seed your PostgreSQL database with real location data
 * 
 * Usage: node backend/src/scripts/seed-locations.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
// Try multiple possible .env file locations
const envPaths = [
    path.join(__dirname, '../../.env'),           // backend/.env
    path.join(__dirname, '../../../.env'),       // root/.env
    path.join(process.cwd(), '.env')             // current directory/.env
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log(`📄 Loaded .env from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    // Try default dotenv behavior (looks in current directory and parent directories)
    require('dotenv').config();
    console.log('📄 Attempted to load .env (using default dotenv behavior)');
}

const dbService = require('../config/postgis');

// Build DATABASE_URL from individual DB_* variables if DATABASE_URL is not set
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'ipmas';
    
    // Construct DATABASE_URL
    if (dbPassword) {
        process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    } else {
        process.env.DATABASE_URL = `postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}`;
    }
    
    console.log('📝 Constructed DATABASE_URL from individual DB_* variables');
    console.log(`   Host: ${dbHost}:${dbPort}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${dbUser}`);
}

// Read and parse sample data file
function loadSampleData() {
    try {
        // Path from backend/src/scripts to frontend/public/data/sample-data.js
        // __dirname points to backend/src/scripts, so we need to go up 3 levels
        const sampleDataPath = path.resolve(__dirname, '../../../frontend/public/data/sample-data.js');
        
        console.log(`📂 Looking for sample data at: ${sampleDataPath}`);
        
        if (!fs.existsSync(sampleDataPath)) {
            console.error(`❌ Sample data file not found at: ${sampleDataPath}`);
            console.error(`   Current working directory: ${process.cwd()}`);
            console.error(`   Script directory (__dirname): ${__dirname}`);
            return { locations: [] };
        }
        
        console.log(`✅ Sample data file found`);
        
        // Read the file content
        const fileContent = fs.readFileSync(sampleDataPath, 'utf8');
        
        // Extract the window.sampleData object by evaluating the code in a safe way
        // Since it's a browser script with window.sampleData = {...}, we need to extract it
        const window = {};
        const module = { exports: {} };
        
        // Execute the file content in a context with a fake window object
        // This is safe because we control the source file
        eval(fileContent);
        
        // Return the window.sampleData object
        if (!window.sampleData) {
            console.error('❌ window.sampleData not found in file');
            return { locations: [] };
        }
        
        console.log(`✅ Loaded ${window.sampleData.locations?.length || 0} locations from sample data`);
        return window.sampleData || { locations: [] };
    } catch (error) {
        console.error('❌ Error loading sample data:', error.message);
        console.error('   Stack:', error.stack);
        return { locations: [] };
    }
}

async function seedLocations() {
    console.log('🌱 Starting database seeding...');
    
    try {
        // Initialize database connection
        await dbService.initialize();
        
        // Check if we have a real database connection (not mock mode)
        if (!dbService.pool || dbService.mockData) {
            console.error('\n❌ ERROR: Database is running in MOCK MODE (no real database connection)');
            console.error('\n📝 To seed the database, you need to:');
            console.error('   1. Set up PostgreSQL database');
            console.error('   2. Set DATABASE_URL environment variable');
            console.error('   3. Ensure database connection is configured\n');
            console.error('   Example DATABASE_URL:');
            console.error('   postgresql://username:password@localhost:5432/ipmas\n');
            console.error('   Or set in .env file:');
            console.error('   DATABASE_URL=postgresql://username:password@localhost:5432/ipmas\n');
            console.error('⚠️  Note: In mock mode, data is stored in memory only and will be lost on restart.');
            console.error('    This script requires a real PostgreSQL database connection.\n');
            process.exit(1);
        }
        
        console.log('✅ Database connection established (PostgreSQL)');
        
        // Load sample data
        console.log('📂 Loading sample data...');
        const sampleData = loadSampleData();
        const locations = sampleData.locations || [];
        console.log(`📊 Found ${locations.length} locations to seed`);
        
        if (locations.length === 0) {
            console.error('❌ No locations found in sample data. Cannot seed database.');
            process.exit(1);
        }
        
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        // Insert each location
        for (const location of locations) {
            try {
                // Check if location already exists
                const existing = await dbService.pool.query(
                    `SELECT id FROM geospatial_data WHERE name = $1 AND county = $2 LIMIT 1`,
                    [location.name, location.county]
                );
                
                if (existing.rows.length > 0) {
                    // Update existing location
                    // Note: ST_Point expects (longitude, latitude) - X, Y order
                    await dbService.pool.query(`
                        UPDATE geospatial_data 
                        SET 
                            latitude = $1::DECIMAL,
                            longitude = $2::DECIMAL,
                            location_text = ST_SetSRID(ST_Point($2::DECIMAL, $1::DECIMAL), 4326),
                            poverty_index = $3::DECIMAL,
                            education_access = $4::DECIMAL,
                            health_vulnerability = $5::DECIMAL,
                            water_access = $6::DECIMAL,
                            employment_rate = $7::DECIMAL,
                            housing_quality = $8::DECIMAL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE name = $9 AND county = $10
                    `, [
                        parseFloat(location.lat) || null,
                        parseFloat(location.lng) || null,
                        location.poverty_index ? parseFloat(location.poverty_index) : null,
                        location.education_access ? parseFloat(location.education_access) : null,
                        location.health_vulnerability ? parseFloat(location.health_vulnerability) : null,
                        location.water_access ? parseFloat(location.water_access) : null,
                        location.employment_rate ? parseFloat(location.employment_rate) : null,
                        location.housing_quality ? parseFloat(location.housing_quality) : null,
                        location.name,
                        location.county
                    ]);
                    
                    skippedCount++;
                    console.log(`🔄 Updated: ${location.name}, ${location.county}`);
                } else {
                    // Insert new location
                    // Note: ST_Point expects (longitude, latitude) - X, Y order
                    await dbService.pool.query(`
                        INSERT INTO geospatial_data (
                            name, county, latitude, longitude, location_text,
                            poverty_index, education_access, health_vulnerability,
                            water_access, employment_rate, housing_quality
                        ) VALUES ($1, $2, $3::DECIMAL, $4::DECIMAL, ST_SetSRID(ST_Point($4::DECIMAL, $3::DECIMAL), 4326), $5::DECIMAL, $6::DECIMAL, $7::DECIMAL, $8::DECIMAL, $9::DECIMAL, $10::DECIMAL)
                    `, [
                        location.name,
                        location.county,
                        parseFloat(location.lat) || null,
                        parseFloat(location.lng) || null,
                        location.poverty_index ? parseFloat(location.poverty_index) : null,
                        location.education_access ? parseFloat(location.education_access) : null,
                        location.health_vulnerability ? parseFloat(location.health_vulnerability) : null,
                        location.water_access ? parseFloat(location.water_access) : null,
                        location.employment_rate ? parseFloat(location.employment_rate) : null,
                        location.housing_quality ? parseFloat(location.housing_quality) : null
                    ]);
                    
                    successCount++;
                    console.log(`✅ Inserted: ${location.name}, ${location.county}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Error inserting ${location.name}:`, error.message);
            }
        }
        
        console.log('\n📊 Seeding Summary:');
        console.log(`   ✅ Successfully inserted: ${successCount}`);
        console.log(`   🔄 Updated existing: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📍 Total processed: ${locations.length}`);
        
        // Get final count (only if pool exists)
        if (dbService.pool) {
            try {
                const finalCount = await dbService.pool.query(
                    `SELECT COUNT(*) as count FROM geospatial_data`
                );
                console.log(`\n📈 Total locations in database: ${finalCount.rows[0].count}`);
            } catch (error) {
                console.warn('⚠️  Could not get final count:', error.message);
            }
        }
        
        console.log('\n✅ Database seeding completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        // Close database connection only if pool exists
        if (dbService.pool) {
            try {
                await dbService.pool.end();
                console.log('🔌 Database connection closed');
            } catch (error) {
                console.warn('⚠️  Error closing connection:', error.message);
            }
        }
    }
}

// Run seeding if script is executed directly
if (require.main === module) {
    seedLocations()
        .then(() => {
            console.log('🎉 Seeding process completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { seedLocations };

