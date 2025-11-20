/**
 * Memory Optimizer for IPMAS Backend
 * Advanced memory management and optimization utilities
 */

class MemoryOptimizer {
    constructor() {
        this.optimizationTasks = [];
        this.isOptimizing = false;
    }

    /**
     * Register a memory optimization task
     * @param {Function} task - Optimization task function
     * @param {number} priority - Task priority (1-10, higher = more important)
     */
    registerOptimizationTask(task, priority = 5) {
        this.optimizationTasks.push({ task, priority });
        this.optimizationTasks.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Run all optimization tasks
     */
    async runOptimizations() {
        if (this.isOptimizing) return;
        
        this.isOptimizing = true;
        console.log('🔧 Running memory optimizations...');
        
        try {
            for (const { task } of this.optimizationTasks) {
                await task();
            }
            console.log('✅ Memory optimizations completed');
        } catch (error) {
            console.error('❌ Memory optimization failed:', error);
        } finally {
            this.isOptimizing = false;
        }
    }

    /**
     * Clear all caches
     */
    clearAllCaches() {
        console.log('🧹 Clearing all caches...');
        
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
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        console.log('✅ All caches cleared');
    }

    /**
     * Optimize memory usage
     */
    optimizeMemory() {
        const memoryUsage = process.memoryUsage();
        const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        console.log(`🧠 Current memory usage: ${heapUsedPercentage.toFixed(2)}%`);
        
        if (heapUsedPercentage > 80) {
            console.log('⚠️ High memory usage detected, running optimizations...');
            this.runOptimizations();
        }
    }

    /**
     * Get memory statistics
     */
    getMemoryStats() {
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
            totalHeapSize: heapStats.total_heap_size,
            uptime: process.uptime()
        };
    }

    /**
     * Monitor memory and auto-optimize
     */
    startAutoOptimization() {
        setInterval(() => {
            this.optimizeMemory();
        }, 30000); // Check every 30 seconds
    }
}

// Create singleton instance
const memoryOptimizer = new MemoryOptimizer();

module.exports = memoryOptimizer;

