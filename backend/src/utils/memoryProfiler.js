/**
 * Memory Profiler for IPMAS Backend
 * Analyzes memory usage patterns, identifies leaks, and provides diagnostics
 */

const v8 = require('v8');
const { writeHeapSnapshot } = require('v8');
const fs = require('fs');
const path = require('path');

class MemoryProfiler {
    constructor() {
        this.snapshots = [];
        this.profileData = [];
        this.heapAnalysis = {
            totalObjects: 0,
            totalSize: 0,
            topConsumers: []
        };
        this.longRunningInterval = null;
    }

    /**
     * Take a heap snapshot
     */
    takeHeapSnapshot(label = 'snapshot') {
        try {
            const snapshot = {
                label,
                timestamp: Date.now(),
                memory: process.memoryUsage(),
                heapStats: v8.getHeapStatistics(),
                heapSpaceStatistics: v8.getHeapSpaceStatistics()
            };

            this.snapshots.push(snapshot);
            
            // Keep only last 10 snapshots
            if (this.snapshots.length > 10) {
                this.snapshots.shift();
            }

            console.log(`📸 Heap snapshot "${label}" taken - Memory: ${(snapshot.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            
            return snapshot;
        } catch (error) {
            console.error('Error taking heap snapshot:', error);
            return null;
        }
    }

    /**
     * Analyze memory usage over time
     */
    analyzeMemoryTrend() {
        if (this.snapshots.length < 2) {
            return null;
        }

        const oldest = this.snapshots[0];
        const newest = this.snapshots[this.snapshots.length - 1];
        
        const timeDiff = newest.timestamp - oldest.timestamp;
        const memoryDiff = newest.memory.heapUsed - oldest.memory.heapUsed;
        const growthRate = (memoryDiff / oldest.memory.heapUsed) * 100;
        const growthPerSecond = memoryDiff / (timeDiff / 1000);

        return {
            timeSpan: timeDiff / 1000,
            startMemory: oldest.memory.heapUsed,
            endMemory: newest.memory.heapUsed,
            memoryChange: memoryDiff,
            growthRate: growthRate.toFixed(2),
            growthPerSecond: (growthPerSecond / 1024).toFixed(2),
            isGrowing: growthRate > 1,
            isLeak: growthRate > 10
        };
    }

    /**
     * Compare two snapshots to identify memory leaks
     */
    compareSnapshots(snapshot1, snapshot2) {
        const heapDiff = {
            heapUsedDiff: snapshot2.memory.heapUsed - snapshot1.memory.heapUsed,
            heapTotalDiff: snapshot2.memory.heapTotal - snapshot1.memory.heapTotal,
            externalDiff: snapshot2.memory.external - snapshot1.memory.external,
            rssDiff: snapshot2.memory.rss - snapshot1.memory.rss
        };

        const heapGrowth = ((heapDiff.heapUsedDiff / snapshot1.memory.heapUsed) * 100).toFixed(2);

        return {
            ...heapDiff,
            heapGrowth: `${heapGrowth}%`,
            isIncreasing: heapDiff.heapUsedDiff > 0,
            potentialLeak: heapGrowth > 5
        };
    }

    /**
     * Get detailed memory breakdown
     */
    getMemoryBreakdown() {
        const memory = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        const heapSpaces = v8.getHeapSpaceStatistics();

        return {
            rss: {
                value: memory.rss,
                percentage: 0
            },
            heapUsed: {
                value: memory.heapUsed,
                percentage: ((memory.heapUsed / memory.heapTotal) * 100).toFixed(2)
            },
            heapTotal: {
                value: memory.heapTotal,
                percentage: 100
            },
            external: {
                value: memory.external,
                percentage: ((memory.external / memory.heapTotal) * 100).toFixed(2)
            },
            arrayBuffers: {
                value: memory.arrayBuffers,
                percentage: ((memory.arrayBuffers / memory.heapTotal) * 100).toFixed(2)
            },
            heapSizeLimit: heapStats.heap_size_limit,
            usedHeapSize: heapStats.used_heap_size,
            totalHeapSize: heapStats.total_heap_size,
            totalPhysicalSize: heapStats.total_physical_size,
            availableSize: heapStats.heap_size_limit - heapStats.used_heap_size,
            heapSpaces: heapSpaces.map(space => ({
                spaceName: space.space_name,
                spaceSize: space.space_size,
                spaceUsedSize: space.space_used_size,
                spaceAvailableSize: space.space_available_size,
                physicalSpaceSize: space.physical_space_size
            }))
        };
    }

    /**
     * Identify top memory consumers
     */
    identifyTopConsumers() {
        const heapStats = v8.getHeapStatistics();
        
        return {
            totalHeapSize: heapStats.total_heap_size,
            usedHeapSize: heapStats.used_heap_size,
            availableSize: heapStats.heap_size_limit - heapStats.used_heap_size,
            heapFragmentation: ((heapStats.total_heap_size - heapStats.used_heap_size) / heapStats.total_heap_size * 100).toFixed(2),
            recommendations: this.getRecommendations(heapStats)
        };
    }

    /**
     * Get recommendations based on memory state
     */
    getRecommendations(heapStats) {
        const recommendations = [];
        const usedPercentage = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100;

        if (usedPercentage > 85) {
            recommendations.push({
                priority: 'high',
                message: 'Heap usage is above 85% - consider increasing max-old-space-size',
                action: 'Increase Node.js heap size or optimize memory usage'
            });
        }

        if (heapStats.total_heap_size > heapStats.heap_size_limit * 0.8) {
            recommendations.push({
                priority: 'medium',
                message: 'Heap is approaching size limit',
                action: 'Monitor memory growth closely'
            });
        }

        const fragmentation = ((heapStats.total_heap_size - heapStats.used_heap_size) / heapStats.total_heap_size * 100);
        if (fragmentation > 30) {
            recommendations.push({
                priority: 'medium',
                message: `High heap fragmentation (${fragmentation.toFixed(1)}%)`,
                action: 'Consider forcing garbage collection more frequently'
            });
        }

        return recommendations;
    }

    /**
     * Start long-running memory monitoring
     */
    startLongRunningMonitoring(intervalMs = 60000) {
        if (this.longRunningInterval) return;

        console.log(`📊 Starting long-running memory monitoring (interval: ${intervalMs}ms)`);

        this.longRunningInterval = setInterval(() => {
            const snapshot = this.takeHeapSnapshot(`auto-${Date.now()}`);
            
            if (snapshot) {
                this.analyzeAndLog(snapshot);
            }
        }, intervalMs);
    }

    stopLongRunningMonitoring() {
        if (this.longRunningInterval) {
            clearInterval(this.longRunningInterval);
            this.longRunningInterval = null;
            console.log('📊 Stopped long-running memory monitoring');
        }
    }

    analyzeAndLog(snapshot) {
        const trend = this.analyzeMemoryTrend();
        
        if (trend) {
            console.log(`📈 Memory trend: ${trend.growthRate}% over ${trend.timeSpan.toFixed(1)}s`);
            
            if (trend.isLeak) {
                console.error(`🚨 POTENTIAL MEMORY LEAK DETECTED: ${trend.growthRate}% growth`);
            }
        }

        const topConsumers = this.identifyTopConsumers();
        if (topConsumers.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            topConsumers.recommendations.forEach(rec => {
                console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
        }
    }

    /**
     * Generate a comprehensive memory report
     */
    generateReport() {
        const currentSnapshot = this.takeHeapSnapshot('report-final');
        const breakdown = this.getMemoryBreakdown();
        const trend = this.analyzeMemoryTrend();
        const topConsumers = this.identifyTopConsumers();

        return {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            snapshots: this.snapshots.length,
            currentMemory: {
                heapUsed: currentSnapshot.memory.heapUsed,
                heapTotal: currentSnapshot.memory.heapTotal,
                rss: currentSnapshot.memory.rss,
                external: currentSnapshot.memory.external,
                percentage: ((currentSnapshot.memory.heapUsed / currentSnapshot.memory.heapTotal) * 100).toFixed(2)
            },
            memoryBreakdown: breakdown,
            trend: trend,
            topConsumers: topConsumers,
            recommendations: topConsumers.recommendations
        };
    }

    /**
     * Save heap snapshot to file
     */
    async saveHeapSnapshotToFile(label = 'heap') {
        try {
            const snapshotsDir = path.join(__dirname, '../../reports/heap-snapshots');
            
            if (!fs.existsSync(snapshotsDir)) {
                fs.mkdirSync(snapshotsDir, { recursive: true });
            }

            const filename = path.join(snapshotsDir, `${label}-${Date.now()}.heapsnapshot`);
            writeHeapSnapshot(filename);
            
            console.log(`💾 Heap snapshot saved to: ${filename}`);
            return filename;
        } catch (error) {
            console.error('Error saving heap snapshot:', error);
            return null;
        }
    }
}

module.exports = MemoryProfiler;
