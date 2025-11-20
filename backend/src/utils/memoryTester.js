/**
 * Memory Testing and Validation for IPMAS Backend
 * Comprehensive memory leak testing and validation utilities
 */

const fs = require('fs');
const path = require('path');

class MemoryTester {
    constructor() {
        this.testResults = [];
        this.baselineMemory = null;
        this.testStartTime = null;
    }

    /**
     * Start memory testing
     */
    startTesting() {
        this.testStartTime = Date.now();
        this.baselineMemory = this.getMemoryUsage();
        console.log('🧪 Starting memory testing...');
        console.log(`📊 Baseline memory: ${this.formatBytes(this.baselineMemory.heapUsed)}`);
    }

    /**
     * Record memory snapshot
     * @param {string} testName - Name of the test
     */
    recordSnapshot(testName) {
        const currentMemory = this.getMemoryUsage();
        const memoryGrowth = currentMemory.heapUsed - this.baselineMemory.heapUsed;
        const growthPercentage = (memoryGrowth / this.baselineMemory.heapUsed) * 100;
        
        const snapshot = {
            testName,
            timestamp: Date.now(),
            memory: currentMemory,
            growth: memoryGrowth,
            growthPercentage: growthPercentage,
            uptime: process.uptime()
        };
        
        this.testResults.push(snapshot);
        
        console.log(`📸 ${testName}: ${this.formatBytes(currentMemory.heapUsed)} (+${this.formatBytes(memoryGrowth)}, ${growthPercentage.toFixed(2)}%)`);
        
        return snapshot;
    }

    /**
     * Test memory leak scenarios
     */
    async testMemoryLeaks() {
        console.log('🔍 Testing for memory leaks...');
        
        // Test 1: Repeated API calls
        this.recordSnapshot('Before API calls');
        await this.simulateApiCalls(100);
        this.recordSnapshot('After 100 API calls');
        
        // Test 2: Cache operations
        this.recordSnapshot('Before cache operations');
        await this.simulateCacheOperations(1000);
        this.recordSnapshot('After 1000 cache operations');
        
        // Test 3: Socket connections
        this.recordSnapshot('Before socket operations');
        await this.simulateSocketOperations(50);
        this.recordSnapshot('After 50 socket operations');
        
        // Test 4: Data processing
        this.recordSnapshot('Before data processing');
        await this.simulateDataProcessing(100);
        this.recordSnapshot('After 100 data processing operations');
    }

    /**
     * Simulate API calls
     * @param {number} count - Number of API calls to simulate
     */
    async simulateApiCalls(count) {
        for (let i = 0; i < count; i++) {
            // Simulate API call processing
            const data = {
                lat: -1.2921 + (Math.random() - 0.5) * 0.1,
                lng: 36.8219 + (Math.random() - 0.5) * 0.1,
                timestamp: Date.now()
            };
            
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    /**
     * Simulate cache operations
     * @param {number} count - Number of cache operations to simulate
     */
    async simulateCacheOperations(count) {
        const cache = new Map();
        
        for (let i = 0; i < count; i++) {
            const key = `test_${i}`;
            const value = {
                data: new Array(1000).fill(Math.random()),
                timestamp: Date.now()
            };
            
            cache.set(key, value);
            
            // Simulate cache expiration
            if (i % 100 === 0) {
                const keysToDelete = Array.from(cache.keys()).slice(0, 10);
                keysToDelete.forEach(key => cache.delete(key));
            }
        }
        
        cache.clear();
    }

    /**
     * Simulate socket operations
     * @param {number} count - Number of socket operations to simulate
     */
    async simulateSocketOperations(count) {
        const connections = [];
        
        for (let i = 0; i < count; i++) {
            const connection = {
                id: `socket_${i}`,
                data: new Array(100).fill(Math.random()),
                timestamp: Date.now()
            };
            
            connections.push(connection);
            
            // Simulate connection cleanup
            if (i % 10 === 0) {
                connections.splice(0, 5);
            }
        }
        
        connections.length = 0;
    }

    /**
     * Simulate data processing
     * @param {number} count - Number of data processing operations to simulate
     */
    async simulateDataProcessing(count) {
        for (let i = 0; i < count; i++) {
            // Simulate poverty index calculation
            const data = {
                education_access: Math.random() * 100,
                water_access: Math.random() * 100,
                health_vulnerability: Math.random() * 100,
                housing_quality: Math.random() * 100
            };
            
            // Simulate processing
            const result = this.calculatePovertyIndex(data);
            
            // Simulate result storage
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    /**
     * Calculate poverty index (simplified)
     * @param {Object} data - Input data
     * @returns {Object} Calculation result
     */
    calculatePovertyIndex(data) {
        const indicators = Object.values(data);
        const average = indicators.reduce((sum, val) => sum + val, 0) / indicators.length;
        
        return {
            poverty_index: Math.round(average),
            timestamp: Date.now(),
            indicators: indicators
        };
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        const memoryUsage = process.memoryUsage();
        const heapStats = require('v8').getHeapStatistics();
        
        return {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            heapUsedPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            heapSizeLimit: heapStats.heap_size_limit,
            usedHeapSize: heapStats.used_heap_size,
            totalHeapSize: heapStats.total_heap_size
        };
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate test report
     */
    generateReport() {
        const report = {
            testStartTime: this.testStartTime,
            testEndTime: Date.now(),
            duration: Date.now() - this.testStartTime,
            baselineMemory: this.baselineMemory,
            finalMemory: this.getMemoryUsage(),
            snapshots: this.testResults,
            analysis: this.analyzeResults()
        };
        
        return report;
    }

    /**
     * Analyze test results
     */
    analyzeResults() {
        if (this.testResults.length < 2) {
            return { error: 'Insufficient test data' };
        }
        
        const first = this.testResults[0];
        const last = this.testResults[this.testResults.length - 1];
        
        const totalGrowth = last.memory.heapUsed - first.memory.heapUsed;
        const growthRate = totalGrowth / (last.timestamp - first.timestamp) * 1000; // bytes per second
        
        const analysis = {
            totalGrowth: totalGrowth,
            growthRate: growthRate,
            maxMemory: Math.max(...this.testResults.map(r => r.memory.heapUsed)),
            minMemory: Math.min(...this.testResults.map(r => r.memory.heapUsed)),
            memoryLeakDetected: growthRate > 1000, // More than 1KB/s growth
            recommendations: []
        };
        
        if (analysis.memoryLeakDetected) {
            analysis.recommendations.push('Memory leak detected - review cache management');
            analysis.recommendations.push('Check for unclosed resources and event listeners');
        }
        
        if (analysis.maxMemory > analysis.baselineMemory.heapUsed * 2) {
            analysis.recommendations.push('High memory usage - consider data structure optimization');
        }
        
        return analysis;
    }

    /**
     * Save test report to file
     * @param {string} filename - Output filename
     */
    saveReport(filename = 'memory-test-report.json') {
        const report = this.generateReport();
        const reportPath = path.join(__dirname, '../../reports', filename);
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Test report saved to: ${reportPath}`);
        
        return reportPath;
    }
}

module.exports = MemoryTester;

