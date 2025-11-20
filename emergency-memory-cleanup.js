/**
 * Emergency Memory Cleanup Script
 * Run this to immediately clean up memory and get status back to healthy
 */

const http = require('http');

function triggerEmergencyCleanup() {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/memory/cleanup',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('🚨 Emergency Cleanup Results:');
                console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
                console.log(`Message: ${result.message}`);
                console.log(`Memory Usage: ${result.memory.heapUsedPercentage.toFixed(2)}%`);
                console.log(`Status: ${result.memory.status}`);
                
                if (result.memory.status === 'healthy') {
                    console.log('🎉 Memory status is now HEALTHY!');
                } else if (result.memory.status === 'high') {
                    console.log('⚠️ Memory status is HIGH - may need additional cleanup');
                } else {
                    console.log('🚨 Memory status is still CRITICAL - restart may be needed');
                }
            } catch (error) {
                console.error('Error parsing response:', error);
                console.log('Raw response:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error making request:', error);
        console.log('Make sure the backend is running on port 3001');
    });

    req.end();
}

function checkMemoryStatus() {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/memory',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('📊 Current Memory Status:');
                console.log(`Memory Usage: ${result.memory.heapUsedPercentage.toFixed(2)}%`);
                console.log(`Heap Used: ${(result.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
                console.log(`Heap Total: ${(result.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
                console.log(`RSS: ${(result.memory.rss / 1024 / 1024).toFixed(2)} MB`);
                
                if (result.recommendations && result.recommendations.length > 0) {
                    console.log('💡 Recommendations:');
                    result.recommendations.forEach(rec => console.log(`  - ${rec}`));
                }
            } catch (error) {
                console.error('Error parsing response:', error);
                console.log('Raw response:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error making request:', error);
        console.log('Make sure the backend is running on port 3001');
    });

    req.end();
}

// Main execution
console.log('🧠 IPMAS Memory Emergency Cleanup');
console.log('================================');

// Check current status
console.log('\n1. Checking current memory status...');
checkMemoryStatus();

// Wait a moment then trigger cleanup
setTimeout(() => {
    console.log('\n2. Triggering emergency cleanup...');
    triggerEmergencyCleanup();
    
    // Check status again after cleanup
    setTimeout(() => {
        console.log('\n3. Checking status after cleanup...');
        checkMemoryStatus();
    }, 2000);
}, 1000);
