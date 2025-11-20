/**
 * Update Karen's data to reflect affluent area (low poverty ~10%)
 * Run: node backend/src/scripts/update-karen-data.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
const envPaths = [
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../.env'),
    path.join(process.cwd(), '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    require('dotenv').config();
}

const dbService = require('../config/postgis');

async function updateKarenData() {
    console.log('🔄 Updating Karen data to reflect affluent area...');
    
    try {
        await dbService.initialize();
        
        if (!dbService.pool || dbService.mockData) {
            console.log('ℹ️ Database is in mock mode. Data will be updated when real database is connected.');
            console.log('✅ Sample data file has been updated with Karen: poverty_index = 10.5%');
            process.exit(0);
        }
        
        // Update Karen in database
        const result = await dbService.pool.query(`
            UPDATE geospatial_data 
            SET 
                poverty_index = 10.5,
                education_access = 96.5,
                health_vulnerability = 8.2,
                water_access = 98.2,
                employment_rate = 94.5,
                housing_quality = 92.3,
                updated_at = CURRENT_TIMESTAMP
            WHERE name = $1 AND county = $2
            RETURNING name, county, poverty_index
        `, ['Karen', 'Nairobi']);
        
        if (result.rows.length > 0) {
            console.log('✅ Successfully updated Karen in database:');
            console.log(`   Name: ${result.rows[0].name}`);
            console.log(`   County: ${result.rows[0].county}`);
            console.log(`   Poverty Index: ${result.rows[0].poverty_index}%`);
            console.log('\n📊 Updated values:');
            console.log('   - Poverty Index: 10.5% (very low - affluent area)');
            console.log('   - Education Access: 96.5%');
            console.log('   - Health Vulnerability: 8.2% (very low)');
            console.log('   - Water Access: 98.2%');
            console.log('   - Employment Rate: 94.5%');
            console.log('   - Housing Quality: 92.3%');
        } else {
            console.log('⚠️ Karen not found in database. Run seed-locations.js first.');
        }
        
        await dbService.pool.end();
        console.log('\n✅ Update complete!');
        
    } catch (error) {
        console.error('❌ Error updating Karen data:', error.message);
        process.exit(1);
    }
}

updateKarenData();

