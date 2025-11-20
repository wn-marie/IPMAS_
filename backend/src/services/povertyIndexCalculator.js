/**
 * IPMAS - Dynamic Poverty Index Calculator
 * Intelligent formula that adapts to selected indicators
 */

class PovertyIndexCalculator {
    constructor() {
        this.indicators = {
            education_access: {
                name: 'Education Access',
                weight: 0.25,
                description: 'Access to quality education facilities and services'
            },
            water_access: {
                name: 'Water Access',
                weight: 0.25,
                description: 'Availability of clean and safe drinking water'
            },
            health_vulnerability: {
                name: 'Health Vulnerability',
                weight: 0.25,
                description: 'Healthcare accessibility and facility quality'
            },
            housing_quality: {
                name: 'Housing Quality Index',
                weight: 0.25,
                description: 'Shelter adequacy and living conditions'
            }
        };
        
        this.aiAnalysisEngine = new AIAnalysisEngine();
        
        // Memory optimization: Cache for processed results
        this.resultCache = new Map();
        this.cacheMaxSize = 1000;
        this.cacheTimeout = 300000; // 5 minutes
        
        // Cleanup interval for cache
        this.cacheCleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, 60000); // Every minute
    }

    /**
     * Calculate poverty index based on selected indicators
     * @param {Object} data - Location data with indicator values
     * @param {Array} selectedIndicators - Array of selected indicator names
     * @returns {Object} Calculation result with breakdown
     */
    calculatePovertyIndex(data, selectedIndicators = []) {
        try {
            // Memory optimization: Check cache first
            const cacheKey = this.generateCacheKey(data, selectedIndicators);
            const cached = this.resultCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                return cached.result;
            }
            
            // If no indicators selected, use all available indicators
            const indicators = selectedIndicators.length > 0 ? selectedIndicators : Object.keys(this.indicators);
            
            // Validate that we have data for selected indicators
            const availableIndicators = indicators.filter(indicator => 
                data.hasOwnProperty(indicator) && 
                typeof data[indicator] === 'number' && 
                data[indicator] >= 0 && 
                data[indicator] <= 100
            );

            if (availableIndicators.length === 0) {
                return {
                    success: false,
                    error: 'No valid indicator data available for calculation',
                    poverty_index: null
                };
            }

            // Calculate dynamic weights based on available indicators
            const dynamicWeights = this.calculateDynamicWeights(availableIndicators);
            
            // Calculate weighted poverty index
            let weightedSum = 0;
            let totalWeight = 0;
            const breakdown = {};

            availableIndicators.forEach(indicator => {
                const value = data[indicator];
                const weight = dynamicWeights[indicator];
                
                // For health_vulnerability, invert the value (higher vulnerability = higher poverty)
                const adjustedValue = indicator === 'health_vulnerability' ? (100 - value) : value;
                
                weightedSum += adjustedValue * weight;
                totalWeight += weight;
                
                breakdown[indicator] = {
                    value: value,
                    adjusted_value: adjustedValue,
                    weight: weight,
                    contribution: (adjustedValue * weight),
                    indicator_name: this.indicators[indicator].name,
                    description: this.indicators[indicator].description
                };
            });

            const povertyIndex = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
            
            // Determine poverty level
            const povertyLevel = this.categorizePovertyLevel(povertyIndex);
            
            // Calculate confidence score based on number of indicators used
            const confidenceScore = this.calculateConfidenceScore(availableIndicators.length, indicators.length);

            const result = {
                success: true,
                poverty_index: povertyIndex,
                poverty_level: povertyLevel,
                confidence_score: confidenceScore,
                indicators_used: availableIndicators.length,
                indicators_total: indicators.length,
                breakdown: breakdown,
                calculation_method: 'dynamic_weighted_average',
                timestamp: new Date().toISOString(),
                recommendations: this.generateRecommendations(povertyIndex, breakdown)
            };
            
            // Memory optimization: Cache the result
            this.cacheResult(cacheKey, result);
            
            return result;

        } catch (error) {
            console.error('Error calculating poverty index:', error);
            return {
                success: false,
                error: error.message,
                poverty_index: null
            };
        }
    }

    /**
     * Calculate dynamic weights based on available indicators
     * @param {Array} availableIndicators - Array of available indicator names
     * @returns {Object} Weight distribution for each indicator
     */
    calculateDynamicWeights(availableIndicators) {
        const weights = {};
        const baseWeight = 1.0 / availableIndicators.length;
        
        availableIndicators.forEach(indicator => {
            // Use original weight if available, otherwise distribute equally
            weights[indicator] = this.indicators[indicator]?.weight || baseWeight;
        });
        
        // Normalize weights to sum to 1
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        
        Object.keys(weights).forEach(indicator => {
            weights[indicator] = weights[indicator] / totalWeight;
        });
        
        return weights;
    }

    /**
     * Categorize poverty level based on index value
     * Note: Higher poverty index = worse conditions (more poverty)
     * @param {number} povertyIndex - Calculated poverty index (0-100)
     * @returns {Object} Poverty level information
     */
    categorizePovertyLevel(povertyIndex) {
        // Simplified poverty categorization with three levels
        // 0-30%: Low poverty
        // 31-60%: Medium poverty
        // 61-100%: High poverty
        
        if (povertyIndex <= 30) {
            return {
                level: 'Low',
                category: 'low_poverty',
                color: '#2ecc71',
                description: 'Area shows low poverty with generally good service access',
                priority: 'low'
            };
        } else if (povertyIndex <= 60) {
            return {
                level: 'Medium',
                category: 'medium_poverty',
                color: '#f39c12',
                description: 'Area shows medium poverty with some service gaps and challenges',
                priority: 'medium'
            };
        } else {
            return {
                level: 'High',
                category: 'high_poverty',
                color: '#e74c3c',
                description: 'Area shows high poverty with significant service deficiencies requiring intervention',
                priority: 'high'
            };
        }
    }

    /**
     * Calculate confidence score based on data completeness
     * @param {number} usedIndicators - Number of indicators used in calculation
     * @param {number} totalIndicators - Total number of available indicators
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidenceScore(usedIndicators, totalIndicators) {
        const completeness = usedIndicators / totalIndicators;
        const baseConfidence = completeness * 100;
        
        // Bonus for using multiple indicators
        const diversityBonus = usedIndicators >= 3 ? 10 : 0;
        
        return Math.min(100, Math.round(baseConfidence + diversityBonus));
    }

    /**
     * Generate actionable recommendations based on poverty index and breakdown
     * @param {number} povertyIndex - Calculated poverty index
     * @param {Object} breakdown - Detailed breakdown of indicators
     * @returns {Array} Array of recommendation objects
     */
    generateRecommendations(povertyIndex, breakdown) {
        const recommendations = [];
        
        // Sort indicators by contribution to poverty
        const sortedIndicators = Object.entries(breakdown)
            .sort(([,a], [,b]) => a.contribution - b.contribution);

        // Generate specific recommendations for lowest performing indicators
        sortedIndicators.slice(0, 2).forEach(([indicator, data]) => {
            if (data.value < 50) { // Only recommend for indicators below 50%
                recommendations.push({
                    indicator: indicator,
                    priority: 'high',
                    current_value: data.value,
                    target_value: Math.min(80, data.value + 30),
                    recommendation: this.getIndicatorRecommendation(indicator, data.value),
                    impact: `Improving ${this.indicators[indicator].name} could reduce poverty index by ${Math.round(data.weight * 30)} points`
                });
            }
        });

        // Add general recommendations based on overall poverty level
        if (povertyIndex > 60) {
            recommendations.push({
                indicator: 'general',
                priority: 'critical',
                recommendation: 'Immediate multi-sectoral intervention required',
                impact: 'Focus on integrated development programs addressing multiple indicators simultaneously'
            });
        }

        return recommendations;
    }

    /**
     * Get specific recommendation for an indicator
     * @param {string} indicator - Indicator name
     * @param {number} value - Current indicator value
     * @returns {string} Specific recommendation text
     */
    getIndicatorRecommendation(indicator, value) {
        const recommendations = {
            education_access: {
                low: 'Establish new schools or improve existing facilities, train teachers, provide learning materials',
                medium: 'Expand school capacity, improve teacher training, enhance learning resources',
                high: 'Maintain current standards, focus on quality improvement and innovation'
            },
            water_access: {
                low: 'Install water points, improve water quality, establish maintenance systems',
                medium: 'Expand water network, improve distribution, ensure regular maintenance',
                high: 'Maintain infrastructure, implement water conservation programs'
            },
            health_vulnerability: {
                high: 'Build health facilities, train medical staff, improve equipment and supplies',
                medium: 'Upgrade existing facilities, increase staffing, improve service delivery',
                low: 'Maintain current standards, focus on preventive care and health education'
            },
            housing_quality: {
                low: 'Improve housing materials, provide sanitation facilities, address overcrowding',
                medium: 'Upgrade housing infrastructure, improve sanitation systems',
                high: 'Maintain housing standards, implement sustainable building practices'
            }
        };

        const category = value < 40 ? 'low' : value < 70 ? 'medium' : 'high';
        return recommendations[indicator]?.[category] || 'Continue monitoring and improvement efforts';
    }

    /**
     * Process questionnaire responses and calculate indicators
     * @param {Object} responses - Questionnaire responses
     * @returns {Object} Calculated indicator values
     */
    async processQuestionnaireResponses(responses) {
        try {
            const indicators = {};
            
            // Validate responses
            if (!responses || typeof responses !== 'object') {
                throw new Error('Invalid responses format: expected an object');
            }
            
            // Process each indicator using AI analysis
            for (const [indicator, questions] of Object.entries(responses)) {
                if (indicator === 'location_name') continue;
                
                // Skip empty indicator groups
                if (!questions || (typeof questions === 'object' && Object.keys(questions).length === 0)) {
                    console.warn(`Skipping empty indicator group: ${indicator}`);
                    continue;
                }
                
                try {
                    indicators[indicator] = await this.aiAnalysisEngine.analyzeIndicator(indicator, questions);
                } catch (error) {
                    console.error(`Error analyzing indicator ${indicator}:`, error);
                    // Continue with other indicators even if one fails
                    // Set a default value or skip
                    console.warn(`Skipping indicator ${indicator} due to analysis error`);
                }
            }
            
            // Check if we got any indicators
            if (Object.keys(indicators).length === 0) {
                throw new Error('No valid indicators could be calculated from the responses');
            }
            
            return indicators;
        } catch (error) {
            console.error('Error processing questionnaire responses:', error);
            console.error('Responses received:', JSON.stringify(responses, null, 2));
            throw error;
        }
    }

    /**
     * Get available indicators and their descriptions
     * @returns {Object} Available indicators information
     */
    getAvailableIndicators() {
        return this.indicators;
    }
    
    /**
     * Generate cache key for data and indicators
     * @param {Object} data - Location data
     * @param {Array} selectedIndicators - Selected indicators
     * @returns {string} Cache key
     */
    generateCacheKey(data, selectedIndicators) {
        const dataHash = JSON.stringify(data);
        const indicatorsHash = selectedIndicators.sort().join(',');
        return `${dataHash}_${indicatorsHash}`;
    }
    
    /**
     * Cache calculation result
     * @param {string} cacheKey - Cache key
     * @param {Object} result - Calculation result
     */
    cacheResult(cacheKey, result) {
        // Prevent cache from growing too large
        if (this.resultCache.size >= this.cacheMaxSize) {
            // Remove oldest entry
            const firstKey = this.resultCache.keys().next().value;
            this.resultCache.delete(firstKey);
        }
        
        this.resultCache.set(cacheKey, {
            result: result,
            expires: Date.now() + this.cacheTimeout
        });
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        let deleted = 0;
        
        for (const [key, value] of this.resultCache.entries()) {
            if (value.expires < now) {
                this.resultCache.delete(key);
                deleted++;
            }
        }
        
        if (deleted > 0) {
            console.log(`🧹 Cleaned up ${deleted} expired poverty calculation cache entries`);
        }
    }
    
    /**
     * Clear all cache entries
     */
    clearCache() {
        this.resultCache.clear();
        console.log('🧹 Poverty calculation cache cleared');
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.resultCache.size,
            maxSize: this.cacheMaxSize,
            timeout: this.cacheTimeout
        };
    }
}

/**
 * AI Analysis Engine for processing questionnaire responses
 */
class AIAnalysisEngine {
    constructor() {
        this.analysisRules = {
            education_access: {
                factors: ['school_distance', 'school_condition', 'classroom_availability', 'teacher_presence'],
                weights: [0.3, 0.3, 0.2, 0.2],
                questions: [
                    'What is the distance to the nearest school from most households?',
                    'What is the condition of the school buildings?',
                    'Are there enough classrooms for the number of students?',
                    'Are teachers regularly present and teaching?'
                ]
            },
            water_access: {
                factors: ['water_source', 'water_distance', 'water_consistency'],
                weights: [0.4, 0.3, 0.3],
                questions: [
                    'What is the main source of drinking water in this area?',
                    'How far do people travel to access clean water?',
                    'Is water available consistently throughout the week?'
                ]
            },
            health_vulnerability: {
                factors: ['facility_distance', 'facility_condition', 'staff_availability', 'treatment_effectiveness'],
                weights: [0.25, 0.25, 0.25, 0.25],
                questions: [
                    'Is there a health facility within walking distance?',
                    'What is the condition of the facility (equipment, cleanliness)?',
                    'Are medical staff available most days?',
                    'Are common illnesses treated effectively?'
                ]
            },
            housing_quality: {
                factors: ['housing_materials', 'roofing_walls', 'overcrowding', 'sanitation'],
                weights: [0.25, 0.25, 0.25, 0.25],
                questions: [
                    'What type of housing is most common (materials used)?',
                    'Do houses have proper roofing and walls?',
                    'Are homes overcrowded or spacious?',
                    'Is sanitation (toilets, drainage) available within the home?'
                ]
            }
        };
    }

    /**
     * Analyze questionnaire responses for a specific indicator
     * @param {string} indicator - Indicator name
     * @param {Array|Object} responses - Array or object of responses for this indicator
     * @returns {Promise<number>} Calculated indicator value (0-100)
     */
    async analyzeIndicator(indicator, responses) {
        const rules = this.analysisRules[indicator];
        if (!rules) {
            throw new Error(`No analysis rules found for indicator: ${indicator}`);
        }

        // Convert object to array if needed, maintaining order based on factors
        let responseArray;
        if (Array.isArray(responses)) {
            responseArray = responses;
        } else if (typeof responses === 'object' && responses !== null) {
            // Convert object to array in the order of factors
            // Keep array aligned with factors array, even if some values are missing
            responseArray = rules.factors.map(factor => responses[factor] || null);
        } else {
            throw new Error(`Invalid responses format for indicator ${indicator}. Expected array or object, got ${typeof responses}`);
        }

        let totalScore = 0;
        let totalWeight = 0;

        responseArray.forEach((response, index) => {
            if (index < rules.factors.length && response !== null && response !== undefined) {
                const factorScore = this.analyzeResponse(indicator, rules.factors[index], response);
                const weight = rules.weights[index];
                
                totalScore += factorScore * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }

    /**
     * Analyze individual response using AI-like logic
     * @param {string} indicator - Indicator name
     * @param {string} factor - Factor being analyzed
     * @param {string} response - User response text
     * @returns {number} Score for this factor (0-100)
     */
    analyzeResponse(indicator, factor, response) {
        if (!response || typeof response !== 'string') {
            return 50; // Default neutral score for invalid responses
        }
        
        const responseLower = response.toLowerCase().trim();
        const responseWithSpaces = responseLower.replace(/_/g, ' '); // Convert underscores to spaces
        
        // Define direct value mappings (exact matches from frontend option values)
        const valueMappings = {
            education_access: {
                school_distance: {
                    'walking_distance': 90,
                    'moderate_distance': 70,
                    'far_distance': 30,
                    'very_far_distance': 10
                },
                school_condition: {
                    'excellent': 95,
                    'good': 75,
                    'poor': 35,
                    'very_poor': 10
                },
                classroom_availability: {
                    'adequate': 90,
                    'somewhat_adequate': 65,
                    'insufficient': 30,
                    'severely_insufficient': 15
                },
                teacher_presence: {
                    'regularly': 95,
                    'mostly': 75,
                    'sometimes': 45,
                    'rarely': 20
                }
            },
            water_access: {
                water_source: {
                    'piped_water': 95,
                    'borehole': 80,
                    'unprotected_source': 40,
                    'unsafe_source': 15
                },
                water_distance: {
                    'at_home': 95,
                    'walking_distance': 80,
                    'moderate_distance': 50,
                    'far_distance': 20
                },
                water_consistency: {
                    'always': 95,
                    'mostly': 75,
                    'sometimes': 45,
                    'rarely': 25
                }
            },
            health_vulnerability: {
                facility_distance: {
                    'walking_distance': 85,
                    'moderate_distance': 60,
                    'far_distance': 30,
                    'no_facility': 5
                },
                facility_condition: {
                    'excellent': 90,
                    'good': 70,
                    'poor': 40,
                    'very_poor': 15
                },
                staff_availability: {
                    'always': 90,
                    'mostly': 70,
                    'sometimes': 40,
                    'rarely': 15
                },
                treatment_effectiveness: {
                    'very_effective': 90,
                    'effective': 70,
                    'limited': 45,
                    'ineffective': 20
                }
            },
            housing_quality: {
                housing_materials: {
                    'permanent': 90,
                    'mixed': 65,
                    'temporary': 40,
                    'makeshift': 15
                },
                roofing_walls: {
                    'proper': 90,
                    'adequate': 70,
                    'partial': 45,
                    'improper': 20
                },
                overcrowding: {
                    'spacious': 90,
                    'reasonable': 70,
                    'crowded': 40,
                    'overcrowded': 15
                },
                sanitation: {
                    'available': 90,
                    'shared': 60,
                    'limited': 35,
                    'unavailable': 10
                }
            }
        };
        
        // Check direct value mapping first
        if (valueMappings[indicator] && valueMappings[indicator][factor]) {
            const directScore = valueMappings[indicator][factor][responseLower];
            if (directScore !== undefined) {
                return directScore;
            }
        }
        
        // Fall back to keyword matching
        // Define scoring patterns for different factors
        const scoringPatterns = {
            education_access: {
                school_distance: {
                    patterns: [
                        { keywords: ['walking distance', 'nearby', 'close', 'within 1km'], score: 90 },
                        { keywords: ['2-5km', 'moderate distance', 'some distance'], score: 70 },
                        { keywords: ['far', 'distant', 'over 5km', 'long distance'], score: 30 },
                        { keywords: ['very far', 'over 10km', 'extremely distant'], score: 10 }
                    ]
                },
                school_condition: {
                    patterns: [
                        { keywords: ['excellent', 'very good', 'modern', 'well maintained'], score: 95 },
                        { keywords: ['good', 'adequate', 'fair', 'reasonable'], score: 75 },
                        { keywords: ['poor', 'bad', 'dilapidated', 'needs repair'], score: 35 },
                        { keywords: ['very poor', 'dangerous', 'collapsing'], score: 10 }
                    ]
                },
                classroom_availability: {
                    patterns: [
                        { keywords: ['enough', 'adequate', 'sufficient', 'plenty'], score: 90 },
                        { keywords: ['somewhat adequate', 'mostly enough'], score: 65 },
                        { keywords: ['not enough', 'insufficient', 'crowded'], score: 30 },
                        { keywords: ['severely overcrowded', 'very insufficient'], score: 15 }
                    ]
                },
                teacher_presence: {
                    patterns: [
                        { keywords: ['regularly', 'always', 'consistent', 'reliable'], score: 95 },
                        { keywords: ['mostly', 'usually', 'generally'], score: 75 },
                        { keywords: ['sometimes', 'irregular', 'inconsistent'], score: 45 },
                        { keywords: ['rarely', 'seldom', 'often absent'], score: 20 }
                    ]
                }
            },
            water_access: {
                water_source: {
                    patterns: [
                        { keywords: ['piped water', 'tap water', 'municipal water'], score: 95 },
                        { keywords: ['borehole', 'well', 'protected source'], score: 80 },
                        { keywords: ['river', 'stream', 'lake', 'unprotected'], score: 40 },
                        { keywords: ['pond', 'dirty water', 'unsafe source'], score: 15 }
                    ]
                },
                water_distance: {
                    patterns: [
                        { keywords: ['at home', 'very close', 'within compound'], score: 95 },
                        { keywords: ['walking distance', 'nearby', 'close'], score: 80 },
                        { keywords: ['some distance', '2-5km', 'moderate'], score: 50 },
                        { keywords: ['far', 'over 5km', 'long distance'], score: 20 }
                    ]
                },
                water_consistency: {
                    patterns: [
                        { keywords: ['always', 'consistent', 'reliable', 'daily'], score: 95 },
                        { keywords: ['mostly', 'usually', 'regular'], score: 75 },
                        { keywords: ['sometimes', 'irregular', 'intermittent'], score: 45 },
                        { keywords: ['rarely', 'unreliable', 'seasonal'], score: 25 }
                    ]
                }
            },
            health_vulnerability: {
                facility_distance: {
                    patterns: [
                        { keywords: ['walking distance', 'very close', 'nearby'], score: 85 },
                        { keywords: ['some distance', '2-5km', 'moderate'], score: 60 },
                        { keywords: ['far', 'over 5km', 'distant'], score: 30 },
                        { keywords: ['very far', 'over 10km', 'no facility'], score: 5 }
                    ]
                },
                facility_condition: {
                    patterns: [
                        { keywords: ['excellent', 'modern', 'well equipped'], score: 90 },
                        { keywords: ['good', 'adequate', 'functional'], score: 70 },
                        { keywords: ['poor', 'basic', 'limited equipment'], score: 40 },
                        { keywords: ['very poor', 'inadequate', 'no equipment'], score: 15 }
                    ]
                },
                staff_availability: {
                    patterns: [
                        { keywords: ['always', 'regularly', 'consistent'], score: 90 },
                        { keywords: ['mostly', 'usually', 'frequently'], score: 70 },
                        { keywords: ['sometimes', 'irregular', 'inconsistent'], score: 40 },
                        { keywords: ['rarely', 'seldom', 'often absent'], score: 15 }
                    ]
                },
                treatment_effectiveness: {
                    patterns: [
                        { keywords: ['very effective', 'excellent', 'comprehensive'], score: 90 },
                        { keywords: ['effective', 'good', 'adequate'], score: 70 },
                        { keywords: ['somewhat effective', 'limited'], score: 45 },
                        { keywords: ['ineffective', 'poor', 'minimal'], score: 20 }
                    ]
                }
            },
            housing_quality: {
                housing_materials: {
                    patterns: [
                        { keywords: ['concrete', 'brick', 'stone', 'permanent'], score: 90 },
                        { keywords: ['mixed', 'partially permanent', 'some concrete'], score: 65 },
                        { keywords: ['mud', 'wood', 'temporary', 'semi-permanent'], score: 40 },
                        { keywords: ['grass', 'plastic', 'makeshift', 'very temporary'], score: 15 }
                    ]
                },
                roofing_walls: {
                    patterns: [
                        { keywords: ['proper', 'complete', 'well constructed'], score: 90 },
                        { keywords: ['mostly proper', 'adequate', 'functional'], score: 70 },
                        { keywords: ['partially proper', 'some gaps'], score: 45 },
                        { keywords: ['improper', 'incomplete', 'many gaps'], score: 20 }
                    ]
                },
                overcrowding: {
                    patterns: [
                        { keywords: ['spacious', 'adequate space', 'not crowded'], score: 90 },
                        { keywords: ['reasonable', 'mostly adequate'], score: 70 },
                        { keywords: ['somewhat crowded', 'limited space'], score: 40 },
                        { keywords: ['overcrowded', 'very crowded', 'severe crowding'], score: 15 }
                    ]
                },
                sanitation: {
                    patterns: [
                        { keywords: ['available', 'proper', 'within home'], score: 95 },
                        { keywords: ['mostly available', 'shared', 'nearby'], score: 70 },
                        { keywords: ['limited', 'basic', 'some facilities'], score: 45 },
                        { keywords: ['unavailable', 'no facilities', 'open defecation'], score: 10 }
                    ]
                }
            }
        };

        const factorPatterns = scoringPatterns[indicator]?.[factor];
        if (!factorPatterns) {
            return 50; // Default neutral score
        }

        // Find matching pattern (check both original and space-converted response)
        for (const pattern of factorPatterns.patterns) {
            if (pattern.keywords.some(keyword => 
                responseLower.includes(keyword) || responseWithSpaces.includes(keyword)
            )) {
                return pattern.score;
            }
        }

        // If no pattern matches, return neutral score
        return 50;
    }
}

module.exports = { PovertyIndexCalculator, AIAnalysisEngine };
