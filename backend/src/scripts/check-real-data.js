/**
 * Script to check which locations are using real database data
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const dbService = require('../config/postgis');

async function checkRealData() {
    console.log('🔍 Checking which locations have real database data...\n');
    
    try {
        await dbService.initialize();
        
        if (!dbService.pool || dbService.mockData) {
            console.log('❌ Database is in MOCK MODE');
            console.log('   Real database data is not available.\n');
            console.log('📝 To use real data:');
            console.log('   1. Set up PostgreSQL database');
            console.log('   2. Set DATABASE_URL in .env file');
            console.log('   3. Run: node src/scripts/seed-locations.js\n');
            return;
        }
        
        console.log('✅ Database connection established (PostgreSQL)\n');
        
        // Get total count
        const countResult = await dbService.pool.query('SELECT COUNT(*) as count FROM geospatial_data');
        const totalCount = parseInt(countResult.rows[0].count);
        
        console.log(`📊 Total locations in database: ${totalCount}\n`);
        
        if (totalCount === 0) {
            console.log('⚠️ No locations found in database!');
            console.log('   Run: node src/scripts/seed-locations.js to seed data\n');
            return;
        }
        
        // Get all locations grouped by county
        const locationsResult = await dbService.pool.query(`
            SELECT name, county, poverty_index, education_access, 
                   health_vulnerability, water_access, housing_quality, employment_rate
            FROM geospatial_data 
            ORDER BY county, name
        `);
        
        const locations = locationsResult.rows;
        
        // Group by county
        const byCounty = {};
        locations.forEach(loc => {
            if (!byCounty[loc.county]) {
                byCounty[loc.county] = [];
            }
            byCounty[loc.county].push(loc);
        });
        
        console.log('📍 Locations with REAL DATABASE DATA:\n');
        console.log('=' .repeat(60));
        
        Object.keys(byCounty).sort().forEach(county => {
            console.log(`\n🏛️  ${county} (${byCounty[county].length} locations):`);
            byCounty[county].forEach(loc => {
                console.log(`   ✅ ${loc.name.padEnd(25)} | Poverty: ${loc.poverty_index}%`);
            });
        });
        
        console.log('\n' + '='.repeat(60));
        console.log(`\n📈 Summary:`);
        console.log(`   Total locations: ${totalCount}`);
        console.log(`   Counties in database: ${Object.keys(byCounty).length} (Kenya has 47 counties)`);
        console.log(`   Average locations per county: ${(totalCount / Object.keys(byCounty).length).toFixed(1)}`);
        
        console.log('\n✅ These locations will use REAL DATABASE DATA when searched');
        console.log('   (source: "exact_name_match" or "name_match")\n');
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
        console.error('   Stack:', error.stack);
    } finally {
        await dbService.close();
    }
}

checkRealData();

