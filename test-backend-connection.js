/**
 * Quick script to test backend connection
 * Run with: node test-backend-connection.js
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://ipmas-backend.onrender.com';

console.log('🔍 Testing backend connection...\n');

// Test health endpoint
function testHealth() {
    return new Promise((resolve, reject) => {
        console.log(`📡 Testing: ${BACKEND_URL}/health`);
        
        https.get(`${BACKEND_URL}/health`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log('📊 Response:', JSON.stringify(json, null, 2));
                    } catch (e) {
                        console.log('📄 Response:', data);
                    }
                } else {
                    console.log('❌ Error response:', data);
                }
                resolve(res.statusCode);
            });
        }).on('error', (err) => {
            console.error('❌ Connection error:', err.message);
            reject(err);
        });
    });
}

// Test analytics endpoint
function testAnalytics() {
    return new Promise((resolve, reject) => {
        console.log(`\n📡 Testing: ${BACKEND_URL}/api/v1/analytics/poverty/all`);
        
        https.get(`${BACKEND_URL}/api/v1/analytics/poverty/all`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`📊 Response: ${json.type || 'data'} with ${json.features?.length || 0} features`);
                    } catch (e) {
                        console.log('📄 Response (first 200 chars):', data.substring(0, 200));
                    }
                } else {
                    console.log('❌ Error response:', data.substring(0, 500));
                }
                resolve(res.statusCode);
            });
        }).on('error', (err) => {
            console.error('❌ Connection error:', err.message);
            reject(err);
        });
    });
}

// Test API info endpoint
function testApiInfo() {
    return new Promise((resolve, reject) => {
        console.log(`\n📡 Testing: ${BACKEND_URL}/api/info`);
        
        https.get(`${BACKEND_URL}/api/info`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log('📊 API Info:', JSON.stringify(json, null, 2));
                    } catch (e) {
                        console.log('📄 Response:', data);
                    }
                } else {
                    console.log('❌ Error response:', data);
                }
                resolve(res.statusCode);
            });
        }).on('error', (err) => {
            console.error('❌ Connection error:', err.message);
            reject(err);
        });
    });
}

// Run all tests
async function runTests() {
    try {
        await testHealth();
        await testAnalytics();
        await testApiInfo();
        
        console.log('\n✅ All tests completed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

runTests();

