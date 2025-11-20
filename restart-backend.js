/**
 * Quick Memory Fix Script
 * This will restart the backend with memory optimizations
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Restarting IPMAS Backend with Memory Optimizations...');

// Kill existing backend process
const killBackend = spawn('taskkill', ['/F', '/IM', 'node.exe'], { 
    stdio: 'inherit',
    shell: true 
});

killBackend.on('close', (code) => {
    console.log('✅ Stopped existing backend processes');
    
    // Wait a moment then start new backend
    setTimeout(() => {
        console.log('🚀 Starting optimized backend...');
        
        // Start backend with garbage collection enabled
        const backend = spawn('node', ['src/app.js'], {
            cwd: path.join(__dirname, 'backend'),
            stdio: 'inherit',
            shell: true,
            env: {
                ...process.env,
                NODE_OPTIONS: '--expose-gc --max-old-space-size=256'
            }
        });
        
        backend.on('error', (error) => {
            console.error('❌ Failed to start backend:', error);
        });
        
        backend.on('close', (code) => {
            console.log(`Backend process exited with code ${code}`);
        });
        
        // Wait for backend to start, then test memory
        setTimeout(() => {
            console.log('\n🧠 Testing memory status...');
            testMemoryStatus();
        }, 5000);
        
    }, 2000);
});

function testMemoryStatus() {
    const http = require('http');
    
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/status',
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
                console.log('📊 Backend Status:');
                console.log(`Status: ${result.status}`);
                console.log(`Memory Usage: ${result.memory.percentage.toFixed(2)}%`);
                console.log(`Uptime: ${result.uptime.toFixed(2)} seconds`);
                
                if (result.status === 'critical') {
                    console.log('🚨 Still critical - triggering emergency cleanup...');
                    triggerEmergencyCleanup();
                } else if (result.status === 'high') {
                    console.log('⚠️ High memory usage - monitoring...');
                } else {
                    console.log('✅ Memory status is healthy!');
                }
            } catch (error) {
                console.error('Error parsing response:', error);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error checking status:', error);
    });

    req.end();
}

function triggerEmergencyCleanup() {
    const http = require('http');
    
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
                console.log(`Memory Usage: ${result.memory.heapUsedPercentage.toFixed(2)}%`);
                console.log(`Status: ${result.memory.status}`);
            } catch (error) {
                console.error('Error parsing cleanup response:', error);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error triggering cleanup:', error);
    });

    req.end();
}
