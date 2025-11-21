/**
 * IPMAS PostGIS Extension Setup Script
 * Enables PostGIS and PostGIS Topology extensions in PostgreSQL database
 * 
 * This script should be run once after database creation on Render
 * 
 * Usage: 
 *   node backend/src/scripts/enable-postgis.js
 * 
 * Or from project root:
 *   cd backend && node src/scripts/enable-postgis.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

// Build DATABASE_URL from individual DB_* variables if DATABASE_URL is not set
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'ipmas_db';
    
    // Construct DATABASE_URL
    if (dbPassword) {
        process.env.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
    } else {
        process.env.DATABASE_URL = `postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}`;
    }
    
    console.log('📝 Constructed DATABASE_URL from individual DB_* variables');
    console.log(`   Host: ${dbHost}:${dbPort}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${dbUser}`);
}

async function enablePostGIS() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('\n🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database\n');

        // Enable PostGIS extension
        console.log('📦 Enabling PostGIS extension...');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        console.log('✅ PostGIS extension enabled');

        // Enable PostGIS Topology extension
        console.log('📦 Enabling PostGIS Topology extension...');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis_topology;');
        console.log('✅ PostGIS Topology extension enabled\n');

        // Verify PostGIS installation
        console.log('🔍 Verifying PostGIS installation...');
        const versionResult = await client.query('SELECT PostGIS_version();');
        const version = versionResult.rows[0].postgis_version;
        console.log(`✅ PostGIS version: ${version}\n`);

        // Check if extensions are enabled
        const extensionsResult = await client.query(`
            SELECT extname, extversion 
            FROM pg_extension 
            WHERE extname IN ('postgis', 'postgis_topology')
            ORDER BY extname;
        `);

        console.log('📋 Installed PostGIS extensions:');
        if (extensionsResult.rows.length > 0) {
            extensionsResult.rows.forEach(row => {
                console.log(`   - ${row.extname}: ${row.extversion}`);
            });
        } else {
            console.log('   ⚠️  No PostGIS extensions found (this should not happen)');
        }

        console.log('\n✅ PostGIS setup complete!');
        console.log('🎉 Your database is ready for geospatial operations.\n');

    } catch (error) {
        console.error('\n❌ Error enabling PostGIS:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('   → Could not connect to database. Check your connection string.');
        } else if (error.code === '28P01') {
            console.error('   → Authentication failed. Check your database credentials.');
        } else if (error.message.includes('permission denied')) {
            console.error('   → Database user does not have permission to create extensions.');
            console.error('   → Contact your database administrator or use a superuser account.');
        } else if (error.message.includes('extension "postgis" does not exist')) {
            console.error('   → PostGIS is not installed on the PostgreSQL server.');
            console.error('   → Contact your hosting provider to install PostGIS.');
        }
        
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔒 Database connection closed\n');
    }
}

// Run the script
if (require.main === module) {
    enablePostGIS()
        .then(() => {
            console.log('✨ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script failed:', error);
            process.exit(1);
        });
}

module.exports = { enablePostGIS };

