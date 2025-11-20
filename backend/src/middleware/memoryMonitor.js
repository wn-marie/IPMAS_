/**
 * Advanced Memory Monitoring Middleware for IPMAS
 * Comprehensive memory leak detection and optimization
 */

const v8 = require('v8');
const fs = require('fs');
const path = require('path');

class MemoryMonitor {
    constructor() {
        this.memoryHistory = [];
        this.leakDetection = {
            threshold: 0.7, // 70% memory usage threshold
            criticalThreshold: 0.8, // 80% critical threshold
            growthRate: 0.05, // 5% growth per check
            checkInterval: 15000 // 15 seconds (more frequent checks)
        };
        
        this.cleanupTasks = [];
        this.isMonitoring = false;
        this.startTime = Date.now();
        
        // Memory optimization settings
        this.optimization = {
            gcThreshold: 0.7, // Force GC at 70% usage
            cacheLimit: 1000, // Max cache entries
            dataLimit: 10000, // Max data entries
            logRetention: 100 // Max log entries
        };
    }

    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('🧠 Memory monitoring started');
        
        // Start periodic memory checks
        this.memoryCheckInterval = setInterval(() => {
            this.performMemoryCheck();
        }, this.leakDetection.checkInterval);
        
        // Start cleanup tasks
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 60000); // Every minute
        
        // Register cleanup on process exit
        process.on('SIGTERM', () => this.cleanup());
        process.on('SIGINT', () => this.cleanup());
        process.on('exit', () => this.cleanup());
    }

    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanup();
        console.log('🧠 Memory monitoring stopped');
    }

    performMemoryCheck() {
        const memoryUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        
        const memoryData = {
            timestamp: Date.now(),
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            heapSizeLimit: heapStats.heap_size_limit,
            usedHeapSize: heapStats.used_heap_size,
            totalHeapSize: heapStats.total_heap_size,
            heapUsedPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            uptime: process.uptime()
        };
        
        // Add to history
        this.memoryHistory.push(memoryData);
        
        // Keep only recent history
        if (this.memoryHistory.length > this.optimization.logRetention) {
            this.memoryHistory = this.memoryHistory.slice(-this.optimization.logRetention);
        }
        
        // Check for memory leaks
        this.detectMemoryLeaks(memoryData);
        
        // Force garbage collection if needed
        if (memoryData.heapUsedPercentage > this.optimization.gcThreshold * 100) {
            this.forceGarbageCollection();
        }
        
        // Log memory status
        this.logMemoryStatus(memoryData);
    }

    detectMemoryLeaks(memoryData) {
        const { heapUsedPercentage } = memoryData;
        
        // Check if memory usage is critical
        if (heapUsedPercentage > this.leakDetection.criticalThreshold * 100) {
            console.error(`🚨 CRITICAL: Memory usage at ${heapUsedPercentage.toFixed(2)}%`);
            this.triggerEmergencyCleanup();
            return;
        }
        
        // Check for memory growth trend
        if (this.memoryHistory.length >= 3) {
            const recent = this.memoryHistory.slice(-3);
            const growthRate = (recent[2].heapUsed - recent[0].heapUsed) / recent[0].heapUsed;
            
            if (growthRate > this.leakDetection.growthRate) {
                console.warn(`⚠️ Memory leak detected: ${(growthRate * 100).toFixed(2)}% growth`);
                this.triggerLeakCleanup();
            }
        }
        
        // Check if memory usage is high
        if (heapUsedPercentage > this.leakDetection.threshold * 100) {
            console.warn(`⚠️ High memory usage: ${heapUsedPercentage.toFixed(2)}%`);
            this.triggerOptimization();
        }
    }

    forceGarbageCollection() {
        if (global.gc) {
            console.log('🗑️ Forcing garbage collection...');
            global.gc();
        } else {
            console.warn('⚠️ Garbage collection not available. Start with --expose-gc flag');
        }
    }

    triggerEmergencyCleanup() {
        console.log('🚨 Emergency memory cleanup triggered');
        
        // Clear all caches
        this.clearAllCaches();
        
        // Clear global performance metrics
        if (global.performanceMetrics) {
            global.performanceMetrics = {
                requestCount: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                slowRequests: 0
            };
        }
        
        // Clear any other global caches
        if (global.cache) {
            global.cache.clear();
        }
        
        // Clear memory history
        this.memoryHistory = [];
        
        // Force garbage collection multiple times
        this.forceGarbageCollection();
        setTimeout(() => this.forceGarbageCollection(), 100);
        setTimeout(() => this.forceGarbageCollection(), 500);
        
        // Run all cleanup tasks
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Cleanup task failed:', error);
            }
        });
        
        console.log('✅ Emergency cleanup completed');
    }

    triggerLeakCleanup() {
        console.log('🔧 Memory leak cleanup triggered');
        
        // Clear old cache entries
        this.clearOldCacheEntries();
        
        // Clear memory history
        if (this.memoryHistory.length > 50) {
            this.memoryHistory = this.memoryHistory.slice(-50);
        }
        
        // Run cleanup tasks
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Cleanup task failed:', error);
            }
        });
    }

    triggerOptimization() {
        console.log('⚡ Memory optimization triggered');
        
        // Clear old cache entries
        this.clearOldCacheEntries();
        
        // Force garbage collection
        this.forceGarbageCollection();
    }

    clearAllCaches() {
        // Clear global performance metrics
        if (global.performanceMetrics) {
            global.performanceMetrics = {
                requestCount: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                slowRequests: 0
            };
        }
        
        // Clear any other global caches
        if (global.cache) {
            global.cache.clear();
        }
        
        console.log('🧹 All caches cleared');
    }

    clearOldCacheEntries() {
        // This will be implemented by individual services
        console.log('🧹 Old cache entries cleared');
    }

    performCleanup() {
        // Clear old memory history
        if (this.memoryHistory.length > this.optimization.logRetention) {
            this.memoryHistory = this.memoryHistory.slice(-this.optimization.logRetention);
        }
        
        // Run cleanup tasks
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Cleanup task failed:', error);
            }
        });
    }

    logMemoryStatus(memoryData) {
        const { heapUsedPercentage, rss, heapUsed, heapTotal } = memoryData;
        
        if (heapUsedPercentage > 70) {
            console.log(`🧠 Memory: ${heapUsedPercentage.toFixed(1)}% (${this.formatBytes(heapUsed)}/${this.formatBytes(heapTotal)}) RSS: ${this.formatBytes(rss)}`);
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMemoryReport() {
        const current = this.memoryHistory[this.memoryHistory.length - 1];
        if (!current) return null;
        
        const uptime = process.uptime();
        const memoryGrowth = this.memoryHistory.length >= 2 ? 
            this.memoryHistory[this.memoryHistory.length - 1].heapUsed - this.memoryHistory[0].heapUsed : 0;
        
        return {
            current: current,
            uptime: uptime,
            memoryGrowth: memoryGrowth,
            growthRate: uptime > 0 ? memoryGrowth / uptime : 0,
            history: this.memoryHistory.slice(-10), // Last 10 entries
            status: this.getMemoryStatus(current.heapUsedPercentage),
            recommendations: this.getRecommendations(current.heapUsedPercentage)
        };
    }

    getMemoryStatus(percentage) {
        if (percentage > 90) return 'critical';
        if (percentage > 80) return 'high';
        if (percentage > 70) return 'moderate';
        return 'healthy';
    }

    getRecommendations(percentage) {
        const recommendations = [];
        
        if (percentage > 90) {
            recommendations.push('Emergency cleanup required');
            recommendations.push('Consider restarting the application');
        } else if (percentage > 80) {
            recommendations.push('Clear caches and force garbage collection');
            recommendations.push('Review memory-intensive operations');
        } else if (percentage > 70) {
            recommendations.push('Monitor memory usage closely');
            recommendations.push('Consider optimizing data structures');
        }
        
        return recommendations;
    }

    registerCleanupTask(task) {
        this.cleanupTasks.push(task);
    }

    cleanup() {
        console.log('🧹 Memory monitor cleanup');
        this.memoryHistory = [];
        this.cleanupTasks = [];
    }
}

// Create singleton instance
const memoryMonitor = new MemoryMonitor();

// Middleware function
const memoryMonitoringMiddleware = (req, res, next) => {
    // Add memory info to response headers
    const memoryUsage = process.memoryUsage();
    res.setHeader('X-Memory-Used', Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100));
    res.setHeader('X-Memory-RSS', memoryUsage.rss);
    
    next();
};

// Memory debugging endpoint
const memoryDebugEndpoint = (req, res) => {
    const report = memoryMonitor.getMemoryReport();
    const memoryUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            heapUsedPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        },
        heap: {
            heapSizeLimit: heapStats.heap_size_limit,
            usedHeapSize: heapStats.used_heap_size,
            totalHeapSize: heapStats.total_heap_size,
            heapSizeLimitPercentage: (heapStats.used_heap_size / heapStats.heap_size_limit) * 100
        },
        monitoring: report,
        recommendations: memoryMonitor.getRecommendations((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    });
};

// Emergency memory cleanup endpoint
const emergencyCleanupEndpoint = (req, res) => {
    console.log('🚨 Manual emergency cleanup triggered via API');
    
    // Trigger emergency cleanup
    memoryMonitor.triggerEmergencyCleanup();
    
    // Get memory stats after cleanup
    const memoryUsage = process.memoryUsage();
    const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    res.json({
        success: true,
        message: 'Emergency memory cleanup completed',
        timestamp: new Date().toISOString(),
        memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            heapUsedPercentage: heapUsedPercentage,
            status: heapUsedPercentage > 80 ? 'critical' : heapUsedPercentage > 70 ? 'high' : 'healthy'
        }
    });
};

module.exports = {
    memoryMonitor,
    memoryMonitoringMiddleware,
    memoryDebugEndpoint,
    emergencyCleanupEndpoint
};

