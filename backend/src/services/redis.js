/**
 * Redis Service for IPMAS
 * Handles caching and session management
 */

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async initialize() {
        try {
            // For development, use in-memory cache instead of actual Redis
            if (process.env.NODE_ENV === 'development' || !process.env.REDIS_URL) {
                console.log('Using in-memory cache for development');
                this.mockCache = new Map();
                this.maxCacheSize = 5000; // Limit cache size
                this.cleanupInterval = setInterval(() => {
                    this.cleanupExpiredEntries();
                }, 300000); // Clean up every 5 minutes
                this.isConnected = true;
                return;
            }

            // Production Redis connection
            const redis = require('redis');
            this.client = redis.createClient({
                url: process.env.REDIS_URL
            });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('Connected to Redis');
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            console.error('Redis initialization failed:', error);
            // Fallback to in-memory cache
            this.mockCache = new Map();
            this.isConnected = true;
        }
    }

    async set(key, value, ttl = 300) {
        try {
            if (this.mockCache) {
                // Enforce size limit
                if (this.mockCache.size >= this.maxCacheSize) {
                    // Remove oldest entry
                    const firstKey = this.mockCache.keys().next().value;
                    this.mockCache.delete(firstKey);
                }
                
                this.mockCache.set(key, {
                    value: value,
                    expires: Date.now() + (ttl * 1000),
                    createdAt: Date.now()
                });
                return true;
            }

            if (this.client && this.isConnected) {
                await this.client.setEx(key, ttl, JSON.stringify(value));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }

    async get(key) {
        try {
            if (this.mockCache) {
                const item = this.mockCache.get(key);
                if (item && item.expires > Date.now()) {
                    return item.value;
                } else if (item) {
                    this.mockCache.delete(key);
                }
                return null;
            }

            if (this.client && this.isConnected) {
                const value = await this.client.get(key);
                return value ? JSON.parse(value) : null;
            }
            return null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async delete(key) {
        try {
            if (this.mockCache) {
                return this.mockCache.delete(key);
            }

            if (this.client && this.isConnected) {
                await this.client.del(key);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }

    async exists(key) {
        try {
            if (this.mockCache) {
                const item = this.mockCache.get(key);
                return item && item.expires > Date.now();
            }

            if (this.client && this.isConnected) {
                const result = await this.client.exists(key);
                return result === 1;
            }
            return false;
        } catch (error) {
            console.error('Redis exists error:', error);
            return false;
        }
    }

    async clear() {
        try {
            if (this.mockCache) {
                this.mockCache.clear();
                return true;
            }

            if (this.client && this.isConnected) {
                await this.client.flushAll();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Redis clear error:', error);
            return false;
        }
    }

    // Cache helper methods
    async setCache(key, value, ttl = 300) {
        return this.set(`cache:${key}`, value, ttl);
    }

    async getCache(key) {
        return this.get(`cache:${key}`);
    }

    async deleteCache(key) {
        return this.delete(`cache:${key}`);
    }

    async setSession(sessionId, sessionData, ttl = 3600) {
        return this.set(`session:${sessionId}`, sessionData, ttl);
    }

    async getSession(sessionId) {
        return this.get(`session:${sessionId}`);
    }

    async deleteSession(sessionId) {
        return this.delete(`session:${sessionId}`);
    }

    cleanupExpiredEntries() {
        if (!this.mockCache) return;
        
        const now = Date.now();
        let deleted = 0;
        
        for (const [key, item] of this.mockCache.entries()) {
            if (item.expires < now) {
                this.mockCache.delete(key);
                deleted++;
            }
        }
        
        // If cache is still too large, remove oldest entries
        if (this.mockCache.size > this.maxCacheSize) {
            const entries = Array.from(this.mockCache.entries());
            entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
            const toRemove = entries.slice(0, this.mockCache.size - this.maxCacheSize);
            toRemove.forEach(([key]) => this.mockCache.delete(key));
        }
        
        if (deleted > 0) {
            console.log(`Cleaned up ${deleted} expired cache entries`);
        }
    }

    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
}

// Export singleton instance
const redisService = new RedisService();
module.exports = redisService;
