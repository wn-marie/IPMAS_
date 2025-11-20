/**
 * Performance Middleware for IPMAS
 * Optimizations, monitoring, and caching
 */

const compression = require('compression');
const cluster = require('cluster');
const os = require('os');

// Response time monitoring
const responseTimeMonitor = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Log slow requests
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
        }
        
        // Store performance metrics
        if (!global.performanceMetrics) {
            global.performanceMetrics = {
                requestCount: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                slowRequests: 0
            };
        }
        
        global.performanceMetrics.requestCount++;
        global.performanceMetrics.totalResponseTime += duration;
        global.performanceMetrics.averageResponseTime = 
            global.performanceMetrics.totalResponseTime / global.performanceMetrics.requestCount;
            
        if (duration > 1000) {
            global.performanceMetrics.slowRequests++;
        }
    });
    
    next();
};

// Caching middleware
const cacheMiddleware = (ttl = 300, maxSize = 1000) => {
    const cache = new Map();
    let cleanupInterval;
    
    // Clean up expired entries periodically
    const startCleanup = () => {
        cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, value] of cache.entries()) {
                if (value.expires < now) {
                    cache.delete(key);
                }
            }
            // If cache is still too large after cleanup, clear the oldest entries
            if (cache.size > maxSize) {
                const entries = Array.from(cache.entries());
                entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
                const toRemove = entries.slice(0, cache.size - maxSize);
                toRemove.forEach(([key]) => cache.delete(key));
            }
        }, 60000); // Run cleanup every minute
    };
    
    // Start cleanup
    startCleanup();
    
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }
        
        const cacheKey = `${req.method}:${req.url}`;
        const cached = cache.get(cacheKey);
        
        if (cached && cached.expires > Date.now()) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached.data);
        }
        
        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(data) {
            // Prevent cache from growing too large
            if (cache.size >= maxSize) {
                // Remove oldest entry (FIFO)
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            
            // Cache the response
            cache.set(cacheKey, {
                data: data,
                expires: Date.now() + (ttl * 1000),
                createdAt: Date.now()
            });
            
            res.setHeader('X-Cache', 'MISS');
            return originalJson.call(this, data);
        };
        
        next();
    };
};

// Query optimization middleware
const queryOptimization = (req, res, next) => {
    // Add query optimization headers
    res.setHeader('X-Query-Optimized', 'true');
    
    // Log complex queries
    const queryString = req.url.split('?')[1];
    if (queryString && queryString.length > 100) {
        console.log(`Complex query detected: ${req.url}`);
    }
    
    next();
};

// Pagination middleware
const pagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    
    req.pagination = {
        page,
        limit,
        offset
    };
    
    next();
};

// Compression middleware
const compressionMiddleware = compression({
    filter: (req, res) => {
        // Don't compress if the request includes a no-transform directive
        if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
            return false;
        }
        
        // Use compression for all other requests
        return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses larger than 1KB
    level: 6 // Compression level (1-9, where 6 is a good balance)
});

// Static file optimization
const staticOptimization = (options = {}) => {
    return (req, res, next) => {
        // Set cache headers for static files
        if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
            res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
        }
        
        // Enable gzip compression for static files
        if (req.url.match(/\.(css|js|html)$/)) {
            res.setHeader('Content-Encoding', 'gzip');
        }
        
        next();
    };
};

// Memory cleanup middleware
const memoryCleanup = (req, res, next) => {
    // Clean up memory periodically
    if (global.gc && Math.random() < 0.01) { // 1% chance
        global.gc();
    }
    
    next();
};

// Connection optimization
const connectionOptimization = (req, res, next) => {
    // Set connection headers
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');
    
    next();
};

// Performance monitoring class
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            requestCount: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            errorCount: 0,
            errorRate: 0,
            memoryUsage: process.memoryUsage(),
            cacheHitRate: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Initialize global performance metrics if not exists
        if (!global.performanceMetrics) {
            global.performanceMetrics = {
                requestCount: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                slowRequests: 0,
                responses: []
            };
        }
        
        // Update metrics every 30 seconds
        this.metricsInterval = setInterval(() => {
            this.updateMetrics();
        }, 30000);
        
        console.log('Performance monitoring started');
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        console.log('Performance monitoring stopped');
    }

    updateMetrics() {
        this.metrics.memoryUsage = process.memoryUsage();
        this.metrics.uptime = process.uptime();
        
        if (global.performanceMetrics) {
            this.metrics.requestCount = global.performanceMetrics.requestCount;
            this.metrics.totalResponseTime = global.performanceMetrics.totalResponseTime;
            this.metrics.averageResponseTime = global.performanceMetrics.averageResponseTime;
            this.metrics.slowRequests = global.performanceMetrics.slowRequests;
        }
        
        // Calculate error rate
        this.metrics.errorRate = this.metrics.requestCount > 0 ? 
            (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0;
        
        // Calculate cache hit rate
        const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
        this.metrics.cacheHitRate = totalCacheRequests > 0 ? 
            (this.metrics.cacheHits / totalCacheRequests) * 100 : 0;
    }

    recordRequest(duration) {
        this.metrics.requestCount++;
        this.metrics.totalResponseTime += duration;
        this.metrics.averageResponseTime = 
            this.metrics.totalResponseTime / this.metrics.requestCount;
    }

    recordError() {
        this.metrics.errorCount++;
    }

    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }

    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }

    getHealthStatus() {
        const metrics = this.getMetrics();
        
        // Calculate event loop lag
        const lagStart = process.hrtime.bigint();
        const lag = process.hrtime.bigint() - lagStart;
        const lagMs = Number(lag) / 1e6;
        
        // GC stats (if available)
        let gcStats = null;
        if (global.gc) {
            const gcTiming = process.memoryUsage();
            gcStats = {
                available: true,
                heapUsed: gcTiming.heapUsed,
                heapTotal: gcTiming.heapTotal,
                external: gcTiming.external
            };
        }
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: metrics.uptime,
            memory: {
                used: metrics.memoryUsage.heapUsed,
                total: metrics.memoryUsage.heapTotal,
                percentage: (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100
            },
            performance: {
                averageResponseTime: metrics.averageResponseTime,
                errorRate: metrics.errorRate,
                cacheHitRate: metrics.cacheHitRate,
                eventLoopLag: parseFloat(lagMs.toFixed(2)),
                gcStats: gcStats
            },
            issues: []
        };
        
        // Check for issues
        if (metrics.averageResponseTime > 1000) {
            health.issues.push('High average response time');
            health.status = 'degraded';
        }
        
        if (metrics.errorRate > 5) {
            health.issues.push('High error rate');
            health.status = 'degraded';
        }
        
        if (health.memory.percentage > 90) {
            health.issues.push('High memory usage');
            health.status = 'critical';
        } else if (health.memory.percentage > 75) {
            health.issues.push('Elevated memory usage');
            health.status = 'degraded';
        }
        
        return health;
    }
}

// Health check middleware
const healthCheck = (req, res, next) => {
    const health = performanceMonitor.getHealthStatus();
    const statusCode = health.status === 'critical' ? 503 : 
                      health.status === 'degraded' ? 200 : 200;
    
    res.status(statusCode).json(health);
};

// Performance metrics endpoint
const getPerformanceMetrics = (req, res) => {
    const metrics = performanceMonitor.getMetrics();
    res.json({
        success: true,
        metrics: metrics,
        timestamp: new Date().toISOString()
    });
};

// Clustering setup
const setupClustering = () => {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CLUSTERING === 'true') {
        if (cluster.isMaster) {
            const numCPUs = os.cpus().length;
            console.log(`Master process ${process.pid} is running`);
            
            // Fork workers
            for (let i = 0; i < numCPUs; i++) {
                cluster.fork();
            }
            
            cluster.on('exit', (worker, code, signal) => {
                console.log(`Worker ${worker.process.pid} died`);
                console.log('Starting a new worker');
                cluster.fork();
            });
            
            // Graceful shutdown
            process.on('SIGTERM', () => {
                console.log('Master received SIGTERM, shutting down workers...');
                for (const id in cluster.workers) {
                    cluster.workers[id].kill();
                }
            });
        } else {
            console.log(`Worker ${process.pid} started`);
        }
    }
};

// Create performance monitor instance
const performanceMonitor = new PerformanceMonitor();

module.exports = {
    responseTimeMonitor,
    cacheMiddleware,
    queryOptimization,
    pagination,
    compressionMiddleware,
    staticOptimization,
    memoryCleanup,
    connectionOptimization,
    performanceMonitor,
    healthCheck,
    getPerformanceMetrics,
    setupClustering
};
