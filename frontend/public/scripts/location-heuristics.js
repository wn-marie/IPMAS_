/**
 * Location-Aware Heuristics System
 * Provides known socioeconomic data for well-known areas to prevent illogical predictions
 */

class LocationHeuristics {
    constructor() {
        // Known affluent areas (high-end neighborhoods)
        this.affluentAreas = {
            // Nairobi
            'karen': { poverty_index: 10.5, education_access: 96.5, health_vulnerability: 8.2, water_access: 98.2, employment_rate: 94.5, housing_quality: 92.3, county: 'Nairobi' },
            'runda': { poverty_index: 12.0, education_access: 95.0, health_vulnerability: 10.0, water_access: 97.0, employment_rate: 92.0, housing_quality: 90.0, county: 'Nairobi' },
            'lavington': { poverty_index: 15.0, education_access: 93.0, health_vulnerability: 12.0, water_access: 95.0, employment_rate: 90.0, housing_quality: 88.0, county: 'Nairobi' },
            'westlands': { poverty_index: 18.0, education_access: 91.0, health_vulnerability: 15.0, water_access: 94.0, employment_rate: 88.0, housing_quality: 85.0, county: 'Nairobi' },
            'kilimani': { poverty_index: 16.0, education_access: 92.0, health_vulnerability: 13.0, water_access: 96.0, employment_rate: 89.0, housing_quality: 87.0, county: 'Nairobi' },
            'parklands': { poverty_index: 17.0, education_access: 91.5, health_vulnerability: 14.0, water_access: 95.0, employment_rate: 88.5, housing_quality: 86.0, county: 'Nairobi' },
            
            // Kisumu
            'milimani': { poverty_index: 12.0, education_access: 94.0, health_vulnerability: 10.0, water_access: 96.0, employment_rate: 91.0, housing_quality: 89.0, county: 'Kisumu' },
            
            // Eldoret
            'elgon view': { poverty_index: 13.0, education_access: 93.5, health_vulnerability: 11.0, water_access: 95.5, employment_rate: 90.5, housing_quality: 88.5, county: 'Uasin Gishu' },
            'eldoret west': { poverty_index: 14.0, education_access: 92.5, health_vulnerability: 12.0, water_access: 94.5, employment_rate: 89.5, housing_quality: 87.0, county: 'Uasin Gishu' },
        };
        
        // Known low-income areas (informal settlements/poor neighborhoods)
        this.poorAreas = {
            // Nairobi
            'kibera': { poverty_index: 78.9, education_access: 45.2, health_vulnerability: 82.1, water_access: 35.6, employment_rate: 38.7, housing_quality: 25.4, county: 'Nairobi' },
            'mathare': { poverty_index: 82.3, education_access: 42.1, health_vulnerability: 85.2, water_access: 28.9, employment_rate: 35.2, housing_quality: 22.1, county: 'Nairobi' },
            'kawangware': { poverty_index: 65.4, education_access: 56.7, health_vulnerability: 68.2, water_access: 48.3, employment_rate: 52.1, housing_quality: 38.9, county: 'Nairobi' },
            'dandora': { poverty_index: 74.2, education_access: 48.3, health_vulnerability: 78.9, water_access: 32.7, employment_rate: 42.6, housing_quality: 28.5, county: 'Nairobi' },
            'huruma': { poverty_index: 69.8, education_access: 51.4, health_vulnerability: 73.2, water_access: 38.9, employment_rate: 47.8, housing_quality: 32.4, county: 'Nairobi' },
            'korogocho': { poverty_index: 76.5, education_access: 46.8, health_vulnerability: 80.3, water_access: 30.2, employment_rate: 40.1, housing_quality: 26.8, county: 'Nairobi' },
            
            // Kisumu
            'nyamasaria': { poverty_index: 72.5, education_access: 48.5, health_vulnerability: 75.8, water_access: 38.2, employment_rate: 44.3, housing_quality: 30.5, county: 'Kisumu' },
            'kondele': { poverty_index: 68.3, education_access: 52.1, health_vulnerability: 71.2, water_access: 42.5, employment_rate: 48.7, housing_quality: 35.2, county: 'Kisumu' },
            'manyatta': { poverty_index: 70.8, education_access: 50.3, health_vulnerability: 73.5, water_access: 40.1, employment_rate: 46.2, housing_quality: 32.8, county: 'Kisumu' },
            
            // Mombasa
            'likoni': { poverty_index: 71.2, education_access: 49.8, health_vulnerability: 74.3, water_access: 39.5, employment_rate: 45.6, housing_quality: 31.2, county: 'Mombasa' },
            'changamwe': { poverty_index: 69.5, education_access: 51.2, health_vulnerability: 72.1, water_access: 41.8, employment_rate: 47.3, housing_quality: 33.5, county: 'Mombasa' },
        };
    }
    
    /**
     * Normalize location name for matching
     */
    normalizeName(name) {
        if (!name) return '';
        return name.toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' '); // Normalize whitespace
    }
    
    /**
     * Check if location is a known affluent area
     */
    isAffluentArea(locationName, county = null) {
        const normalized = this.normalizeName(locationName);
        
        for (const [key, data] of Object.entries(this.affluentAreas)) {
            if (normalized.includes(key) || key.includes(normalized.split(' ')[0])) {
                // If county is provided, verify it matches
                if (county && data.county && !county.toLowerCase().includes(data.county.toLowerCase())) {
                    continue;
                }
                return { match: true, data: { ...data }, matchedKey: key };
            }
        }
        
        return { match: false };
    }
    
    /**
     * Check if location is a known poor area
     */
    isPoorArea(locationName, county = null) {
        const normalized = this.normalizeName(locationName);
        
        for (const [key, data] of Object.entries(this.poorAreas)) {
            if (normalized.includes(key) || key.includes(normalized.split(' ')[0])) {
                // If county is provided, verify it matches
                if (county && data.county && !county.toLowerCase().includes(data.county.toLowerCase())) {
                    continue;
                }
                return { match: true, data: { ...data }, matchedKey: key };
            }
        }
        
        return { match: false };
    }
    
    /**
     * Get heuristics data for a location
     */
    getLocationData(locationName, county = null) {
        // Check affluent areas first
        const affluentCheck = this.isAffluentArea(locationName, county);
        if (affluentCheck.match) {
            return {
                ...affluentCheck.data,
                source: 'heuristics_affluent',
                confidence: 'high',
                matchedArea: affluentCheck.matchedKey
            };
        }
        
        // Check poor areas
        const poorCheck = this.isPoorArea(locationName, county);
        if (poorCheck.match) {
            return {
                ...poorCheck.data,
                source: 'heuristics_poor',
                confidence: 'high',
                matchedArea: poorCheck.matchedKey
            };
        }
        
        return null;
    }
    
    /**
     * Sanity check: Verify if calculated poverty score makes sense for known areas
     * IMPORTANT: Final score = POVERTY LEVEL (high = high poverty, low = low poverty)
     */
    sanityCheck(locationName, calculatedPovertyIndex, county = null) {
        const normalized = this.normalizeName(locationName);
        
        // Check if it's a known affluent area but showing high poverty
        const affluentCheck = this.isAffluentArea(locationName, county);
        if (affluentCheck.match) {
            // Affluent areas should have LOW poverty score (below 25%)
            // Low score = low poverty = good conditions
            if (calculatedPovertyIndex > 25) {
                console.warn(`⚠️ SANITY CHECK FAILED: ${locationName} is a known affluent area but calculated poverty is ${calculatedPovertyIndex}% (should be <25%)`);
                return {
                    passed: false,
                    issue: 'affluent_area_high_poverty',
                    expected: 'low_poverty_below_25',
                    actual: calculatedPovertyIndex,
                    corrected: affluentCheck.data.poverty_index
                };
            }
        }
        
        // Check if it's a known poor area but showing low poverty
        const poorCheck = this.isPoorArea(locationName, county);
        if (poorCheck.match) {
            // Poor areas should have HIGH poverty score (above 60%)
            // High score = high poverty = poor conditions
            if (calculatedPovertyIndex < 60) {
                console.warn(`⚠️ SANITY CHECK FAILED: ${locationName} is a known poor area but calculated poverty is ${calculatedPovertyIndex}% (should be >60%)`);
                return {
                    passed: false,
                    issue: 'poor_area_low_poverty',
                    expected: 'high_poverty_above_60',
                    actual: calculatedPovertyIndex,
                    corrected: poorCheck.data.poverty_index
                };
            }
        }
        
        return { passed: true };
    }
    
    /**
     * Get fallback data based on location characteristics
     */
    getFallbackData(locationName, county = null, nearbyData = null) {
        // First, try heuristics
        const heuristicsData = this.getLocationData(locationName, county);
        if (heuristicsData) {
            console.log(`✅ Using heuristics data for known area: ${locationName}`);
            return heuristicsData;
        }
        
        // If nearby data exists, use it but apply sanity checks
        if (nearbyData && nearbyData.poverty_index !== null) {
            const sanity = this.sanityCheck(locationName, nearbyData.poverty_index, county);
            if (!sanity.passed) {
                console.warn(`⚠️ Nearby data failed sanity check, using heuristics instead`);
                // Try to find partial match in heuristics
                const normalized = this.normalizeName(locationName);
                for (const [key, data] of Object.entries(this.affluentAreas)) {
                    if (normalized.includes(key.substring(0, 4)) || key.includes(normalized.substring(0, 4))) {
                        return { ...data, source: 'heuristics_partial_match', confidence: 'medium' };
                    }
                }
                for (const [key, data] of Object.entries(this.poorAreas)) {
                    if (normalized.includes(key.substring(0, 4)) || key.includes(normalized.substring(0, 4))) {
                        return { ...data, source: 'heuristics_partial_match', confidence: 'medium' };
                    }
                }
            }
            return { ...nearbyData, source: 'nearby_verified' };
        }
        
        return null;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.LocationHeuristics = LocationHeuristics;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationHeuristics;
}

