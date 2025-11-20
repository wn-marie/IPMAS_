/**
 * Data Enrichment Service
 * Enriches location data using nearby locations, external sources, and heuristics
 */

const dbService = require('../config/postgis');

class DataEnrichmentService {
    constructor(io) {
        this.io = io;
        this.enrichmentCache = new Map();
        this.pendingEnrichments = new Map();
    }

    /**
     * Enrich location data using nearby locations
     */
    async enrichWithNearbyData(lat, lng, radius = 5, existingData = {}) {
        try {
            // Get nearby locations within radius
            const nearbyLocations = await dbService.getNearbyLocations(lat, lng, radius, 10);
            
            if (!nearbyLocations || nearbyLocations.length === 0) {
                return existingData;
            }

            // Calculate weighted average based on distance
            const enrichedData = { ...existingData };
            const weights = [];
            const indicators = ['poverty_index', 'education_access', 'health_vulnerability', 
                              'water_access', 'housing_quality', 'employment_rate'];

            nearbyLocations.forEach(location => {
                const distance = this.calculateDistance(
                    lat, lng,
                    parseFloat(location.latitude || location.lat),
                    parseFloat(location.longitude || location.lng)
                );
                
                // Weight decreases with distance (closer = more weight)
                const weight = 1 / (1 + distance);
                weights.push({ location, weight, distance });
            });

            // Normalize weights
            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
            
            // Fill missing indicators using weighted average from nearby locations
            indicators.forEach(indicator => {
                if (existingData[indicator] === null || existingData[indicator] === undefined) {
                    let weightedSum = 0;
                    let indicatorWeight = 0;

                    weights.forEach(({ location, weight }) => {
                        const value = location[indicator];
                        if (value !== null && value !== undefined && !isNaN(value)) {
                            weightedSum += value * weight;
                            indicatorWeight += weight;
                        }
                    });

                    if (indicatorWeight > 0) {
                        enrichedData[indicator] = Math.round((weightedSum / indicatorWeight) * 10) / 10;
                        enrichedData[`${indicator}_source`] = 'nearby_enriched';
                        enrichedData[`${indicator}_confidence`] = Math.min(100, Math.round((indicatorWeight / totalWeight) * 100));
                    }
                }
            });

            return enrichedData;
        } catch (error) {
            console.error('Error enriching with nearby data:', error);
            return existingData;
        }
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Request real-time data enrichment for a location
     */
    async requestEnrichment(locationData, socketId) {
        const { lat, lng, name, county } = locationData;
        const cacheKey = `${lat}_${lng}_${name || ''}`;

        // Check cache first
        if (this.enrichmentCache.has(cacheKey)) {
            const cached = this.enrichmentCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.data;
            }
        }

        // Check if enrichment is already in progress
        if (this.pendingEnrichments.has(cacheKey)) {
            // Add socket to pending list
            const pending = this.pendingEnrichments.get(cacheKey);
            pending.sockets.add(socketId);
            return null; // Will be sent via event when ready
        }

        // Start enrichment process
        this.pendingEnrichments.set(cacheKey, {
            sockets: new Set([socketId]),
            startTime: Date.now()
        });

        try {
            // Step 1: Try to get exact location data
            let enrichedData = await dbService.getLocationData(lat, lng);
            
            if (!enrichedData) {
                enrichedData = { name, county, lat, lng };
            }

            // Step 2: Enrich with nearby data for missing indicators
            enrichedData = await this.enrichWithNearbyData(lat, lng, 5, enrichedData);

            // Step 3: Apply heuristics if still missing data
            if (this.shouldApplyHeuristics(enrichedData)) {
                enrichedData = await this.applyHeuristics(enrichedData, name, county);
            }

            // Cache the result
            this.enrichmentCache.set(cacheKey, {
                data: enrichedData,
                timestamp: Date.now()
            });

            // Broadcast to all waiting sockets
            const pending = this.pendingEnrichments.get(cacheKey);
            if (pending) {
                pending.sockets.forEach(sid => {
                    this.io.to(sid).emit('data-enriched', {
                        location: { lat, lng, name, county },
                        data: enrichedData,
                        timestamp: new Date().toISOString()
                    });
                });
                this.pendingEnrichments.delete(cacheKey);
            }

            return enrichedData;
        } catch (error) {
            console.error('Error in data enrichment:', error);
            const pending = this.pendingEnrichments.get(cacheKey);
            if (pending) {
                pending.sockets.forEach(sid => {
                    this.io.to(sid).emit('data-enrichment-error', {
                        location: { lat, lng, name, county },
                        error: error.message
                    });
                });
                this.pendingEnrichments.delete(cacheKey);
            }
            return null;
        }
    }

    /**
     * Check if heuristics should be applied
     */
    shouldApplyHeuristics(data) {
        const requiredIndicators = ['poverty_index', 'education_access', 'health_vulnerability'];
        return requiredIndicators.some(indicator => 
            data[indicator] === null || data[indicator] === undefined
        );
    }

    /**
     * Apply location heuristics (would integrate with frontend heuristics)
     */
    async applyHeuristics(data, name, county) {
        // This would integrate with the location heuristics system
        // For now, return data as-is (heuristics are handled on frontend)
        return data;
    }

    /**
     * Stream fallback data when direct data is unavailable
     */
    async streamFallbackData(locationData, socketId) {
        const { lat, lng, name, county } = locationData;

        // Get nearby locations
        const nearbyLocations = await dbService.getNearbyLocations(lat, lng, 10, 5);
        
        if (nearbyLocations && nearbyLocations.length > 0) {
            // Send each nearby location as fallback option
            nearbyLocations.forEach((location, index) => {
                setTimeout(() => {
                    this.io.to(socketId).emit('fallback-data-stream', {
                        location: { lat, lng, name, county },
                        fallback: {
                            ...location,
                            distance: this.calculateDistance(
                                lat, lng,
                                parseFloat(location.latitude || location.lat),
                                parseFloat(location.longitude || location.lng)
                            ),
                            index: index + 1,
                            total: nearbyLocations.length
                        },
                        timestamp: new Date().toISOString()
                    });
                }, index * 100); // Stagger emissions
            });
        }
    }

    /**
     * Subscribe to location updates
     */
    subscribeToLocation(socketId, locationData) {
        const { lat, lng, name, county } = locationData;
        const roomName = `location-${lat}-${lng}`;
        
        // Join room for this location
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.join(roomName);
        }

        // Request initial enrichment
        this.requestEnrichment(locationData, socketId);
    }

    /**
     * Unsubscribe from location updates
     */
    unsubscribeFromLocation(socketId, locationData) {
        const { lat, lng } = locationData;
        const roomName = `location-${lat}-${lng}`;
        
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(roomName);
        }
    }
}

module.exports = DataEnrichmentService;

