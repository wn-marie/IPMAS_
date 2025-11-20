/**
 * IPMAS - Dynamic Poverty Calculator
 * Recalculates poverty indices based on active layer controls with proper weighting
 */

class DynamicPovertyCalculator {
    constructor() {
        // Define indicator weights (these sum to 1.0)
        this.indicatorWeights = {
            poverty_index: 0.25,
            education_access: 0.25,
            health_vulnerability: 0.25,
            water_access: 0.25,
            housing_quality: 0.20  // Reduced slightly to accommodate the 5th indicator
        };
        
        // Track active layers
        this.activeLayers = new Set(['poverty_index']); // Default to poverty index only
        
        // Cache for calculated values
        this.locationCache = new Map();
    }

    /**
     * Update active layers based on checkbox states
     */
    updateActiveLayers() {
        this.activeLayers.clear();
        
        // Check both mobile and desktop checkboxes, prefer desktop if available
        const layerCheckboxes = {
            poverty_index: (document.getElementById('povertyLayer') || document.getElementById('povertyLayerMobile'))?.checked,
            education_access: (document.getElementById('educationLayer') || document.getElementById('educationLayerMobile'))?.checked,
            health_vulnerability: (document.getElementById('healthLayer') || document.getElementById('healthLayerMobile'))?.checked,
            water_access: (document.getElementById('waterLayer') || document.getElementById('waterLayerMobile'))?.checked,
            housing_quality: (document.getElementById('shelterLayer') || document.getElementById('shelterLayerMobile'))?.checked
        };
        
        // Add checked layers
        Object.entries(layerCheckboxes).forEach(([layerName, isChecked]) => {
            if (isChecked) {
                this.activeLayers.add(layerName);
            }
        });
        
        // If no layers selected, default to poverty_index
        if (this.activeLayers.size === 0) {
            this.activeLayers.add('poverty_index');
            const povertyCheckbox = document.getElementById('povertyLayer') || document.getElementById('povertyLayerMobile');
            if (povertyCheckbox) {
                povertyCheckbox.checked = true;
                // Sync both checkboxes
                if (document.getElementById('povertyLayer') && document.getElementById('povertyLayerMobile')) {
                    document.getElementById('povertyLayerMobile').checked = true;
                }
                if (document.getElementById('povertyLayerMobile') && document.getElementById('povertyLayer')) {
                    document.getElementById('povertyLayer').checked = true;
                }
            }
        }
        
        console.log('Active layers updated:', Array.from(this.activeLayers));
    }

    /**
     * Calculate dynamic weights based on active layers
     * @returns {Object} Normalized weights for active layers
     */
    calculateDynamicWeights() {
        const weights = {};
        const activeLayers = Array.from(this.activeLayers);
        
        // Calculate total weight of active layers
        let totalWeight = 0;
        activeLayers.forEach(layer => {
            totalWeight += this.indicatorWeights[layer] || 0;
        });
        
        // Normalize weights to sum to 1.0
        activeLayers.forEach(layer => {
            const originalWeight = this.indicatorWeights[layer] || 0;
            weights[layer] = originalWeight / totalWeight;
        });
        
        return weights;
    }

    /**
     * Recalculate poverty index for a location based on active layers
     * @param {Object} location - Location data with all indicators
     * @returns {Object} Recalculated poverty index and metadata
     */
    calculateLocationPovertyIndex(location, options = {}) {
        const { skipExplainability = false } = options;
        const activeLayers = Array.from(this.activeLayers);
        const weights = this.calculateDynamicWeights();
        
        let weightedSum = 0;
        let totalWeight = 0;
        const breakdown = {};
        
        // Formula: Poverty Score = Σ(Weight × Score)
        // Only include checked layers (weight = 0 for unchecked)
        Object.keys(this.indicatorWeights).forEach(indicator => {
            const isActive = activeLayers.includes(indicator);
            const weight = isActive ? (weights[indicator] || 0) : 0;
            const value = location[indicator];
            
            // Skip if value is missing or invalid
            if (value === undefined || value === null || isNaN(value)) {
                if (isActive) {
                    console.warn(`Missing value for ${indicator} in location ${location.name}`);
                }
                return;
            }
            
            // IMPORTANT: Final score represents POVERTY LEVEL (high = high poverty, low = low poverty)
            // - poverty_index: Use directly (10% = low poverty, 80% = high poverty)
            // - health_vulnerability: Use directly (10% = low vulnerability, 80% = high vulnerability)
            // - education_access, water_access, housing_quality: Invert (high access = low poverty)
            //   So: 90% access → 10% poverty contribution, 30% access → 70% poverty contribution
            let adjustedValue = value;
            if (indicator === 'poverty_index' || indicator === 'health_vulnerability') {
                // Use directly - these already represent poverty/vulnerability
                adjustedValue = value;
            } else if (indicator === 'education_access' || indicator === 'water_access' || indicator === 'housing_quality' || indicator === 'employment_rate') {
                // Invert - high access means low poverty
                // 90% access → 10% poverty, 30% access → 70% poverty
                adjustedValue = 100 - value;
            }
            
            // Contribution = Weight × Adjusted Score
            const contribution = weight * adjustedValue;
            
            weightedSum += contribution;
            if (isActive) {
                totalWeight += weight;
            }
            
            breakdown[indicator] = {
                original_value: value,
                adjusted_value: adjustedValue,
                weight: weight,
                weight_percentage: (weight * 100).toFixed(1) + '%',
                contribution: contribution,
                is_active: isActive,
                status: isActive ? 'included' : 'excluded'
            };
        });
        
        // Calculate poverty index using sum of weighted contributions
        const povertyIndex = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
        
        const result = {
            poverty_index: povertyIndex,
            breakdown: breakdown,
            active_layers: activeLayers,
            weights_used: weights,
            confidence: this.calculateConfidence(activeLayers.length),
            calculation_method: 'weighted_sum'
        };

        if (!skipExplainability) {
            result.explainability = this.buildExplainabilityInsights({
                location,
                breakdown,
                activeLayers,
                baseScore: povertyIndex
            });
        }

        return result;
    }

    /**
     * Calculate confidence score based on number of active layers
     * @param {number} layerCount - Number of active layers
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidence(layerCount) {
        // More layers = higher confidence
        return Math.min(100, (layerCount / 5) * 100);
    }

    /**
     * Recalculate all locations and update visualization
     * @param {Array} locations - Array of location data
     * @returns {Array} Updated locations with new poverty indices
     */
    recalculateAllLocations(locations) {
        console.log('Recalculating poverty indices for all locations...');
        
        const updatedLocations = locations.map(location => {
            const calculation = this.calculateLocationPovertyIndex(location, { skipExplainability: true });
            
            return {
                ...location,
                calculated_poverty_index: calculation.poverty_index,
                calculation_breakdown: calculation.breakdown,
                active_layers: calculation.active_layers,
                confidence: calculation.confidence
            };
        });
        
        console.log(`Recalculated ${updatedLocations.length} locations`);
        return updatedLocations;
    }

    /**
     * Get poverty level category and color
     * @param {number} povertyIndex - Poverty index value (0-100)
     * @returns {Object} Category information
     */
    getPovertyLevel(povertyIndex) {
        if (povertyIndex >= 70) {
            return {
                level: 'Critical',
                category: 'critical',
                color: '#d73027',
                description: 'Critical poverty with severe service gaps'
            };
        } else if (povertyIndex >= 50) {
            return {
                level: 'High',
                category: 'high',
                color: '#fc8d59',
                description: 'High poverty with significant challenges'
            };
        } else if (povertyIndex >= 30) {
            return {
                level: 'Moderate',
                category: 'moderate',
                color: '#fee08b',
                description: 'Moderate poverty with some service gaps'
            };
        } else {
            return {
                level: 'Low',
                category: 'low',
                color: '#91cf60',
                description: 'Low poverty with adequate services'
            };
        }
    }

    /**
     * Get summary statistics for active layers
     * @param {Array} locations - Array of location data
     * @returns {Object} Summary statistics
     */
    getSummaryStatistics(locations) {
        const recalculated = this.recalculateAllLocations(locations);
        
        const stats = {
            total_locations: recalculated.length,
            active_layers: Array.from(this.activeLayers),
            poverty_distribution: {
                critical: 0,
                high: 0,
                moderate: 0,
                low: 0
            },
            average_poverty_index: 0,
            min_poverty_index: 100,
            max_poverty_index: 0
        };
        
        let totalPoverty = 0;
        
        recalculated.forEach(location => {
            const index = location.calculated_poverty_index;
            totalPoverty += index;
            
            if (index < stats.min_poverty_index) stats.min_poverty_index = index;
            if (index > stats.max_poverty_index) stats.max_poverty_index = index;
            
            const level = this.getPovertyLevel(index);
            stats.poverty_distribution[level.category]++;
        });
        
        stats.average_poverty_index = Math.round(totalPoverty / recalculated.length);
        
        return stats;
    }

    /**
     * Generate visualization data for charts
     * @param {Array} locations - Array of location data
     * @returns {Object} Chart data
     */
    generateChartData(locations) {
        const recalculated = this.recalculateAllLocations(locations);
        
        // Sort by calculated poverty index
        recalculated.sort((a, b) => b.calculated_poverty_index - a.calculated_poverty_index);
        
        // Top 10 locations
        const top10 = recalculated.slice(0, 10).map(loc => ({
            name: loc.name || loc.location_name,
            value: loc.calculated_poverty_index,
            category: this.getPovertyLevel(loc.calculated_poverty_index).category
        }));
        
        // Distribution data
        const distribution = {
            critical: recalculated.filter(loc => loc.calculated_poverty_index >= 70).length,
            high: recalculated.filter(loc => loc.calculated_poverty_index >= 50 && loc.calculated_poverty_index < 70).length,
            moderate: recalculated.filter(loc => loc.calculated_poverty_index >= 30 && loc.calculated_poverty_index < 50).length,
            low: recalculated.filter(loc => loc.calculated_poverty_index < 30).length
        };
        
        return {
            top10,
            distribution,
            summary: this.getSummaryStatistics(locations)
        };
    }

    /**
     * Build explainability insights for a given location calculation
     * @param {Object} params
     * @returns {Object} Explainability payload
     */
    buildExplainabilityInsights({ location, breakdown, activeLayers, baseScore }) {
        const activeEntries = Object.entries(breakdown || {}).filter(([, data]) => data.is_active);

        if (activeEntries.length === 0) {
            return {
                top_contributors: [],
                narratives: [],
                counterfactuals: {}
            };
        }

        const totalContribution = activeEntries.reduce((sum, [, data]) => sum + data.contribution, 0);
        const sortedContributors = [...activeEntries].sort((a, b) => b[1].contribution - a[1].contribution);

        const topContributors = sortedContributors.slice(0, 5).map(([indicator, data]) => ({
            indicator,
            label: this.formatIndicatorLabel(indicator),
            contribution: data.contribution,
            share: totalContribution > 0 ? data.contribution / totalContribution : 0,
            share_percentage: totalContribution > 0 ? `${(data.contribution / totalContribution * 100).toFixed(1)}%` : '0%',
            weight: data.weight,
            weight_percentage: data.weight_percentage,
            adjusted_value: data.adjusted_value
        }));

        const narratives = [];

        if (topContributors[0]) {
            narratives.push(`${topContributors[0].label} is the dominant driver, contributing ${topContributors[0].share_percentage} of the weighted score.`);
        }

        if (activeLayers.length < Object.keys(this.indicatorWeights).length) {
            const inactive = Object.keys(this.indicatorWeights).filter(indicator => !activeLayers.includes(indicator));
            if (inactive.length > 0) {
                narratives.push(`Inactive indicators (${inactive.map(item => this.formatIndicatorLabel(item)).join(', ')}) are excluded from this score.`);
            }
        }

        const counterfactuals = this.generateCounterfactualScenarios({
            location,
            indicators: activeEntries.map(([indicator]) => indicator),
            baseScore
        });

        if (counterfactuals?.priority_action && counterfactuals.priority_action.impact > 0) {
            narratives.push(`Improving ${counterfactuals.priority_action.label} by ${Math.abs(counterfactuals.priority_action.delta).toFixed(0)} points could lower the poverty score by ${counterfactuals.priority_action.impact.toFixed(1)}.`);
        }

        if (counterfactuals?.risk_alert && counterfactuals.risk_alert.impact > 0) {
            narratives.push(`Watch for setbacks in ${counterfactuals.risk_alert.label}; a ${Math.abs(counterfactuals.risk_alert.delta).toFixed(0)}-point decline may raise the score by ${counterfactuals.risk_alert.impact.toFixed(1)}.`);
        }

        return {
            top_contributors: topContributors,
            total_contribution: totalContribution,
            narratives,
            counterfactuals
        };
    }

    /**
     * Generate counterfactual scenarios to test indicator sensitivity
     * @param {Object} params
     * @returns {Object} Counterfactual summary
     */
    generateCounterfactualScenarios({ location, indicators, baseScore }) {
        const delta = 10;
        const improvements = [];
        const regressions = [];

        indicators.forEach(indicator => {
            const improveScenario = this.simulateIndicatorChange(location, indicator, 'improve', delta);
            if (improveScenario) {
                improvements.push(improveScenario);
            }

            const degradeScenario = this.simulateIndicatorChange(location, indicator, 'degrade', delta);
            if (degradeScenario) {
                regressions.push(degradeScenario);
            }
        });

        const priorityAction = improvements
            .map(scenario => ({
                ...scenario,
                impact: baseScore - scenario.poverty_index
            }))
            .filter(scenario => scenario.impact > 0)
            .reduce((best, scenario) => {
                if (!scenario) return best;
                if (!best || scenario.impact > best.impact) return scenario;
                return best;
            }, null);

        const riskAlert = regressions
            .map(scenario => ({
                ...scenario,
                impact: scenario.poverty_index - baseScore
            }))
            .filter(scenario => scenario.impact > 0)
            .reduce((worst, scenario) => {
                if (!scenario) return worst;
                if (!worst || scenario.impact > worst.impact) return scenario;
                return worst;
            }, null);

        return {
            priority_action: priorityAction,
            risk_alert: riskAlert
        };
    }

    /**
     * Simulate the effect of changing an indicator value
     * @param {Object} location
     * @param {string} indicator
     * @param {('improve'|'degrade')} direction
     * @param {number} deltaMagnitude
     * @returns {Object|null}
     */
    simulateIndicatorChange(location, indicator, direction, deltaMagnitude) {
        const currentValue = Number(location[indicator]);

        if (isNaN(currentValue)) {
            return null;
        }

        const delta = this.getIndicatorDelta(indicator, direction, deltaMagnitude);

        if (delta === 0) {
            return null;
        }

        const simulated = { ...location };
        const targetValue = this.clampValue(currentValue + delta, 0, 100);
        simulated[indicator] = targetValue;

        const recalculated = this.calculateLocationPovertyIndex(simulated, { skipExplainability: true });

        return {
            indicator,
            label: this.formatIndicatorLabel(indicator),
            direction,
            delta: targetValue - currentValue,
            baseline_value: currentValue,
            target_value: targetValue,
            poverty_index: recalculated.poverty_index
        };
    }

    /**
     * Determine the delta to apply for a given indicator and direction
     * @param {string} indicator
     * @param {('improve'|'degrade')} direction
     * @param {number} delta
     * @returns {number}
     */
    getIndicatorDelta(indicator, direction, delta) {
        const sign = direction === 'improve' ? 1 : -1;

        switch (indicator) {
            case 'poverty_index':
            case 'health_vulnerability':
                return sign * -delta;
            default:
                return sign * delta;
        }
    }

    /**
     * Clamp a value between min and max
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    clampValue(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Format indicator label for explainability output
     * @param {string} indicator
     * @returns {string}
     */
    formatIndicatorLabel(indicator) {
        return indicator.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }
}

// Export for use in other scripts
window.DynamicPovertyCalculator = DynamicPovertyCalculator;
