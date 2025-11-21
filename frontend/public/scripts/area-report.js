/**
 * IPMAS Area Detailed Report Generator
 * Creates comprehensive reports with detailed breakdowns, visualizations, and PDF export
 */

class AreaReportGenerator {
    constructor() {
        this.locationData = null;
        this.calculation = null;
        this.breakdown = null;
        this.charts = {};
        this.init();
    }

    /**
     * Safely convert a value to a number for use with .toFixed()
     * Handles strings, null, undefined, and invalid numbers
     */
    safeToNumber(value, defaultValue = 0) {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = parseFloat(value);
            return !isNaN(parsed) ? parsed : defaultValue;
        }
        return defaultValue;
    }

    init() {
        console.log('📄 Area Report Generator initializing...');
        this.loadLocationData();
        // Expose instance for quick console checks
        try { window.report = this; } catch (e) {}
        // If active layers weren't passed, try to derive from any incoming breakdown
        try {
            if (this.locationData && (!this.locationData._activeLayers || !Array.isArray(this.locationData._activeLayers))) {
                const incoming = this.locationData.calculation_breakdown;
                if (incoming && typeof incoming === 'object') {
                    const derived = Object.entries(incoming)
                        .filter(([, d]) => d && d.is_active)
                        .map(([k]) => k);
                    if (derived.length > 0) {
                        this.locationData._activeLayers = derived;
                        console.log('🔁 Derived active layers from incoming data:', derived);
                    }
                }
            }
        } catch (e) {
            console.warn('Could not derive active layers:', e?.message || e);
        }
        if (this.locationData) {
            this.calculateData();
            this.generateReport();
            this.hideLoading();
        } else {
            // Try to load from URL parameters or show helpful message
            this.tryLoadFromURL();
            if (!this.locationData) {
                this.showError('No location data found. Please select an area from the map to view its detailed report.');
            }
        }
    }

    loadLocationData() {
        try {
            // First try sessionStorage
            const storedData = sessionStorage.getItem('areaReportData');
            if (storedData) {
                this.locationData = JSON.parse(storedData);
                console.log('✅ Location data loaded from sessionStorage:', this.locationData);
                return;
            }
            
            // Try localStorage as fallback
            const localData = localStorage.getItem('areaReportData');
            if (localData) {
                this.locationData = JSON.parse(localData);
                console.log('✅ Location data loaded from localStorage:', this.locationData);
                return;
            }
            
            console.warn('⚠️ No location data in storage');
        } catch (error) {
            console.error('❌ Error loading location data:', error);
        }
    }

    tryLoadFromURL() {
        try {
            // Check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const locationParam = urlParams.get('location');
            
            if (locationParam) {
                this.locationData = JSON.parse(decodeURIComponent(locationParam));
                console.log('✅ Location data loaded from URL:', this.locationData);
                // Also save to sessionStorage for future use
                sessionStorage.setItem('areaReportData', JSON.stringify(this.locationData));
                
                if (this.locationData) {
                    this.calculateData();
                    this.generateReport();
                    this.hideLoading();
                }
                return;
            }
        } catch (error) {
            console.error('❌ Error loading from URL:', error);
        }
    }

    calculateData() {
        // Wait for DynamicPovertyCalculator to be available
        if (!window.DynamicPovertyCalculator) {
            console.error('❌ DynamicPovertyCalculator not available');
            console.log('⏳ Waiting for DynamicPovertyCalculator to load...');
            
            // Wait a bit for scripts to load
            setTimeout(() => {
                if (window.DynamicPovertyCalculator) {
                    this.performCalculation();
                } else {
                    console.error('❌ DynamicPovertyCalculator still not available after waiting');
                    this.showError('Unable to load calculation engine. Please refresh the page.');
                }
            }, 1000);
            return;
        }

        this.performCalculation();
    }

    performCalculation() {
        try {
            if (!window.DynamicPovertyCalculator) {
                throw new Error('DynamicPovertyCalculator not available');
            }

            if (!this.locationData) {
                throw new Error('Location data not available');
            }

            const calculator = new DynamicPovertyCalculator();

            // Restore active layers if they were provided via sessionStorage/URL
            if (this.locationData._activeLayers && Array.isArray(this.locationData._activeLayers)) {
                calculator.activeLayers = new Set(this.locationData._activeLayers);
                console.log('✅ Restored active layers from location data:', Array.from(calculator.activeLayers));
            } else {
                // Fallback to current checkbox states
                calculator.updateActiveLayers();
                console.log('⚠️ No stored active layers found, using current checkbox states:', Array.from(calculator.activeLayers));
            }

            this.calculation = calculator.calculateLocationPovertyIndex(this.locationData);
            
            if (!this.calculation || !this.calculation.breakdown) {
                throw new Error('Calculation failed - no breakdown data');
            }
            
            // Normalize numeric values to ensure they're numbers, not strings
            if (this.calculation.poverty_index !== undefined) {
                this.calculation.poverty_index = this.safeToNumber(this.calculation.poverty_index);
            }
            
            // Normalize breakdown values
            if (this.calculation.breakdown) {
                Object.keys(this.calculation.breakdown).forEach(key => {
                    const data = this.calculation.breakdown[key];
                    if (data) {
                        if (data.raw_value !== undefined) data.raw_value = this.safeToNumber(data.raw_value);
                        if (data.adjusted_value !== undefined) data.adjusted_value = this.safeToNumber(data.adjusted_value);
                        if (data.contribution !== undefined) data.contribution = this.safeToNumber(data.contribution);
                    }
                });
            }
            
            this.breakdown = this.calculation.breakdown;
            console.log('✅ Calculation complete:', this.calculation);
        } catch (error) {
            console.error('❌ Error during calculation:', error);
            this.showError(`Calculation error: ${error.message}. Please try selecting a different area from the map.`);
        }
    }

    generateReport() {
        this.updateReportHeader();
        this.updateSummary();
        this.updateAreaOverview();
        this.updateBreakdown();
        this.updateDetailedAnalysis();
        this.updateRecommendations();
        this.updateMethodology();
        this.createVisualizations();
        this.updateReportDates();
    }

    /**
     * Formats location name based on administrative hierarchy
     * Handles: County, Sub-County, Ward, Village levels
     */
    formatLocationName(locationData) {
        const name = locationData.name || locationData.location_name || 'Unknown Location';
        const county = locationData.county || '';
        const subCounty = locationData.sub_county || locationData.subcounty || '';
        const ward = locationData.ward || '';
        const village = locationData.village || '';

        // Kenya's 47 counties list for validation
        const kenyaCounties = [
            'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
            'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
            'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
            'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
            'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu',
            'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana',
            'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
        ];

        // Helper function to normalize county names (case-insensitive, handles variations)
        const normalizeCounty = (countyName) => {
            if (!countyName) return '';
            const normalized = countyName.trim();
            return kenyaCounties.find(c => 
                c.toLowerCase() === normalized.toLowerCase() || 
                normalized.toLowerCase().includes(c.toLowerCase())
            ) || normalized;
        };

        // Helper to check if location name is a county
        const isCountyName = (locName) => {
            if (!locName) return false;
            return kenyaCounties.some(c => 
                c.toLowerCase() === locName.toLowerCase() ||
                locName.toLowerCase().includes(c.toLowerCase() + ' county')
            );
        };

        const normalizedCounty = normalizeCounty(county);
        const normalizedName = name.trim();

        // Case 1: Ward level (has ward, sub-county, and county)
        if (ward && subCounty && normalizedCounty) {
            // Check if name already includes "Ward"
            const wardName = normalizedName.toLowerCase().includes('ward') 
                ? normalizedName 
                : `${normalizedName} Ward`;
            
            return `${wardName}, ${subCounty} Sub-County, ${normalizedCounty} County, Kenya`;
        }

        // Case 2: Sub-County level (has sub-county and county, no ward)
        if (subCounty && normalizedCounty && !ward) {
            // Check if name matches sub-county
            const subCountyName = normalizedName.toLowerCase().includes('sub-county') 
                ? normalizedName 
                : `${normalizedName} Sub-County`;
            
            return `${subCountyName}, ${normalizedCounty} County, Kenya`;
        }

        // Case 3: County level (name matches county or county is specified)
        if (normalizedCounty) {
            // If name matches county exactly or is similar (e.g., "Meru, Meru" → "Meru County, Kenya")
            if (normalizedName.toLowerCase() === normalizedCounty.toLowerCase() || 
                isCountyName(normalizedName)) {
                return `${normalizedCounty} County, Kenya`;
            }
            
            // If name is different from county but county exists (e.g., "Nairobi Central, Nairobi")
            if (normalizedName && normalizedName !== normalizedCounty) {
                return `${normalizedName}, ${normalizedCounty} County, Kenya`;
            }
            
            // Just county name
            return `${normalizedCounty} County, Kenya`;
        }

        // Case 4: Village or specific location with county only
        if (village && normalizedCounty) {
            return `${village} Village, ${normalizedCounty} County, Kenya`;
        }

        // Case 5: Fallback - just name and county if available
        if (normalizedCounty) {
            return `${normalizedName}, ${normalizedCounty} County, Kenya`;
        }

        // Case 6: Minimal fallback
        return normalizedName || 'Unknown Location, Kenya';
    }

    renderExplainabilityInsights() {
        const explainability = this.calculation?.explainability || {};
        const topContributors = explainability.top_contributors || [];
        const narratives = explainability.narratives || [];
        const priorityAction = explainability.counterfactuals?.priority_action || null;
        const riskAlert = explainability.counterfactuals?.risk_alert || null;
        const hasInsights = topContributors.length > 0 || narratives.length > 0 || priorityAction || riskAlert;

        if (!hasInsights) {
            return `
                <div style="margin-top: 24px; padding: 18px; border-radius: 12px; background: #f8fafc; border: 1px dashed var(--border-color);">
                    <h3 style="margin-top: 0;">🧠 Explainability Insights</h3>
                    <p style="margin-bottom: 0;">
                        Explainability narratives are not available for this calculation. Activate additional indicators or refresh the assessment to generate attribution insights.
                    </p>
                </div>
            `;
        }

        const topDriverList = topContributors.slice(0, 5).map((driver, index) => `
            <li style="margin-bottom: 6px;">
                <strong>${index + 1}. ${driver.label}:</strong> ${driver.share_percentage} of weighted impact
                (score ${this.safeToNumber(driver.adjusted_value, 0).toFixed(1)}%, weight ${driver.weight_percentage})
            </li>
        `).join('');

        const cardTextColor = 'color: var(--insight-card-text, #1f2933);';
        const paragraphColor = `${cardTextColor}`;

        const priorityCard = priorityAction ? `
            <p style="margin: 6px 0; ${cardTextColor}"><strong>${priorityAction.label}</strong></p>
            <p style="margin: 6px 0; font-size: 0.9rem; ${paragraphColor}">
                Improve by ${Math.abs(priorityAction.delta).toFixed(0)} pts to target ${this.safeToNumber(priorityAction.target_value, 0).toFixed(1)}%.
            </p>
            <p style="margin: 6px 0; font-size: 0.9rem; ${paragraphColor}">
                Projected poverty index: <strong>${this.safeToNumber(priorityAction.poverty_index, 0).toFixed(1)}%</strong>
            </p>
            <p style="margin: 6px 0; font-size: 0.9rem; color: #2e7d32;">
                Impact: -${this.safeToNumber(priorityAction.impact, 0).toFixed(1)} points
            </p>
        ` : `<p style="margin: 6px 0; ${paragraphColor}">No improvement scenario available.</p>`;

        const riskCard = riskAlert ? `
            <p style="margin: 6px 0; ${cardTextColor}"><strong>${riskAlert.label}</strong></p>
            <p style="margin: 6px 0; font-size: 0.9rem; ${paragraphColor}">
                Guard against a ${Math.abs(riskAlert.delta).toFixed(0)} pt decline (to ${this.safeToNumber(riskAlert.target_value, 0).toFixed(1)}%).
            </p>
            <p style="margin: 6px 0; font-size: 0.9rem; ${paragraphColor}">
                Projected poverty index if unchecked: <strong>${this.safeToNumber(riskAlert.poverty_index, 0).toFixed(1)}%</strong>
            </p>
            <p style="margin: 6px 0; font-size: 0.9rem; color: #ef6c00;">
                Impact: +${this.safeToNumber(riskAlert.impact, 0).toFixed(1)} points
            </p>
        ` : `<p style="margin: 6px 0; ${paragraphColor}">No regression scenario detected.</p>`;

        return `
            <div style="margin-top: 24px; padding: 20px; border-radius: 16px; background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(70,130,180,0.08)); border: 1px solid rgba(46,139,87,0.14);">
                <h3 style="margin-top: 0;">🧠 Explainability Insights & Scenario Explorer</h3>
                <p>
                    Attribution analysis highlights the indicators with the largest influence on the poverty score and simulates
                    how targeted improvements or setbacks could shift the overall risk profile.
                </p>
                ${topContributors.length ? `
                    <div style="margin-top: 12px;">
                        <h4 style="margin-bottom: 8px;">Top Drivers</h4>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${topDriverList}
                        </ul>
                    </div>
                ` : ''}
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 16px;">
                    <div style="background: #f1fff4; border: 1px solid #c8e6c9; padding: 16px; border-radius: 12px; ${cardTextColor}">
                        <div style="font-weight: 600; color: #2e7d32;">Priority Action</div>
                        ${priorityCard}
                    </div>
                    <div style="background: #fff8f1; border: 1px solid #ffe0b2; padding: 16px; border-radius: 12px; ${cardTextColor}">
                        <div style="font-weight: 600; color: #ef6c00;">Risk Alert</div>
                        ${riskCard}
                    </div>
                </div>
                ${narratives.length ? `
                    <div style="margin-top: 16px;">
                        <h4 style="margin-bottom: 8px;">Narrative Highlights</h4>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${narratives.map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateReportHeader() {
        const locationName = this.locationData.name || this.locationData.location_name || 'Unknown Location';
        const formattedLocation = this.formatLocationName(this.locationData);
        
        const titleElement = document.getElementById('reportTitle');
        const locationElement = document.getElementById('reportLocation');
        
        if (titleElement) {
            titleElement.textContent = `${locationName} - Poverty Assessment Report`;
        }
        if (locationElement) {
            locationElement.textContent = formattedLocation;
        }
    }

    updateSummary() {
        // Safely handle poverty_index - convert to number if needed
        const povertyIndex = this.safeToNumber(this.calculation?.poverty_index, 0);
        const pi = povertyIndex.toFixed(1);
        const povertyIndexElement = document.getElementById('summaryPovertyIndex');
        if (povertyIndexElement) {
            povertyIndexElement.textContent = `${pi}%`;
        }
        
        const severity = this.getSeverityLevel(povertyIndex);
        const severityElement = document.getElementById('summarySeverity');
        if (severityElement) {
            severityElement.textContent = severity.label;
            severityElement.style.color = severity.color;
        }

        // Update other indicators
        const indicators = ['education_access', 'health_vulnerability', 'housing_quality'];
        const elementIds = ['summaryEducation', 'summaryHealth', 'summaryHousing'];
        indicators.forEach((ind, idx) => {
            const value = this.safeToNumber(this.locationData[ind], 0);
            const element = document.getElementById(elementIds[idx]);
            if (element) {
                element.textContent = `${value.toFixed(1)}%`;
            }
        });
    }

    updateAreaOverview() {
        const locationName = this.locationData.name || this.locationData.location_name || 'Unknown';
        const county = this.locationData.county || 'N/A';
        const subCounty = this.locationData.sub_county || this.locationData.subcounty || null;
        const ward = this.locationData.ward || null;
        const village = this.locationData.village || null;
        const lat = this.locationData.lat || this.locationData.latitude || 'N/A';
        const lng = this.locationData.lng || this.locationData.longitude || 'N/A';
        const formattedLocation = this.formatLocationName(this.locationData);
        
        // Build administrative hierarchy display
        let adminHierarchy = [];
        if (village) adminHierarchy.push(`<strong>Village:</strong> ${village}`);
        if (ward) adminHierarchy.push(`<strong>Ward:</strong> ${ward}`);
        if (subCounty) adminHierarchy.push(`<strong>Sub-County:</strong> ${subCounty}`);
        if (county) adminHierarchy.push(`<strong>County:</strong> ${county}`);
        adminHierarchy.push(`<strong>Country:</strong> Kenya`);
        
        const overviewHTML = `
            <div class="overview-card">
                <h3>📍 Location Details</h3>
                <p><strong>Location:</strong> ${formattedLocation}</p>
                <p><strong>Primary Name:</strong> ${locationName}</p>
                ${adminHierarchy.length > 0 ? `<div style="margin-top: 10px;">
                    <p><strong>Administrative Hierarchy:</strong></p>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        ${adminHierarchy.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>` : ''}
                <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
                <p><strong>Poverty Index:</strong> <span style="color: var(--primary-color); font-weight: bold; font-size: 1.2em;">${this.safeToNumber(this.calculation?.poverty_index, 0).toFixed(1)}%</span></p>
            </div>
            <div class="overview-card">
                <h3>📊 Assessment Summary</h3>
                <p><strong>Severity Level:</strong> ${this.getSeverityLevel(this.safeToNumber(this.calculation?.poverty_index, 0)).label}</p>
                <p><strong>Active Indicators:</strong> ${this.calculation.active_layers.length}</p>
                <p><strong>Calculation Method:</strong> Weighted Average</p>
                <p><strong>Confidence Score:</strong> ${this.calculateConfidence().toFixed(1)}%</p>
            </div>
        `;

        const overviewElement = document.getElementById('areaOverview');
        if (overviewElement) {
            overviewElement.innerHTML = overviewHTML;
        }
    }

    updateBreakdown() {
        // Intro with detailed explanation
        const activeCount = this.calculation.active_layers.length;
        const totalIndicators = Object.keys(this.breakdown).length;
        
        const introHTML = `
            <h3>📐 Calculation Formula & Methodology</h3>
            <p>
                The poverty index calculation employs a scientifically validated <strong>weighted average 
                methodology</strong> that combines multiple socio-economic indicators to provide a 
                comprehensive, multi-dimensional assessment of poverty levels in the area. This approach 
                ensures that indicators which are more critical or reliable in measuring poverty contribute 
                proportionally more to the final score.
            </p>
            
            <div style="background: linear-gradient(135deg, rgba(46, 139, 87, 0.1), rgba(70, 130, 180, 0.1)); 
                         padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid var(--primary-color);">
                <h4 style="margin: 0 0 15px 0; color: var(--primary-color);">Mathematical Formula</h4>
                <div style="background: var(--panel-bg); color: var(--text-primary); padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; 
                            border-left: 4px solid var(--primary-color);">
                    <strong style="display: block; margin-bottom: 10px; font-size: 1.1em;">Poverty Index = Σ(Indicator_Score × Weight) ÷ Σ(Active_Weights)</strong>
                    <div style="margin-top: 15px; font-size: 0.95em; line-height: 1.8;">
                        <strong>Where:</strong><br>
                        • Σ = Summation over all active indicators<br>
                        • Indicator_Score = Normalized score for each indicator (0-100 scale)<br>
                        • Weight = Relative importance weight for each indicator<br>
                        • Active_Weights = Sum of weights for all active indicators
                    </div>
                </div>
            </div>
            
            <p>
                <strong>Key Features of This Methodology:</strong>
            </p>
            <ul>
                <li><strong>Normalization:</strong> All raw scores are normalized to a 0-100 scale, 
                ensuring comparability across diverse metrics measured in different units.</li>
                <li><strong>Dynamic Weighting:</strong> Each indicator receives a weight based on its 
                theoretical importance and empirical relevance in measuring poverty.</li>
                <li><strong>Selective Activation:</strong> Only indicators with sufficient data quality 
                are activated (${activeCount} of ${totalIndicators} indicators in this assessment).</li>
                <li><strong>Proportional Contribution:</strong> The formula ensures each indicator contributes 
                proportionally to the final score based on both its value and assigned weight.</li>
                <li><strong>Quality Assurance:</strong> The methodology includes confidence scoring to 
                indicate data reliability and completeness of the assessment.</li>
            </ul>
            
            <p>
                <strong>Interpretation:</strong> The resulting poverty index ranges from 0% (no poverty) 
                to 100% (extreme poverty), with severity levels categorized as: 
                <strong style="color: #91cf60;">Low (0-30%)</strong>, 
                <strong style="color: #fee08b;">Moderate (30-50%)</strong>, 
                <strong style="color: #fc8d59;">High (50-70%)</strong>, and 
                <strong style="color: #d73027;">Critical (70-100%)</strong>.
            </p>
        `;
        const breakdownIntroElement = document.getElementById('breakdownIntro');
        if (breakdownIntroElement) {
            breakdownIntroElement.innerHTML = introHTML;
        }

        // Table
        let tableHTML = '';
        Object.entries(this.breakdown).forEach(([indicator, data]) => {
            const indicatorName = this.formatIndicatorName(indicator);
            const status = data.is_active ? 'Active' : 'Inactive';
            const statusClass = data.is_active ? 'status-active' : 'status-inactive';
            const impact = data.is_active ? 
                `${((data.contribution / this.calculation.poverty_index) * 100).toFixed(1)}%` : 
                'N/A';

            tableHTML += `
                <tr>
                    <td><strong>${indicatorName}</strong></td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                    <td>${(data.raw_value || 0).toFixed(1)}%</td>
                    <td>${data.adjusted_value.toFixed(1)}%</td>
                    <td>${data.weight_percentage}</td>
                    <td>${data.contribution.toFixed(2)}</td>
                    <td>${impact}</td>
                </tr>
            `;
        });

        // Add total row
        tableHTML += `
            <tr style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); 
                         color: white; font-weight: bold; border-top: 3px solid var(--primary-color);">
                <td colspan="5"><strong>Total (${this.calculation.active_layers.length} Active Indicators)</strong></td>
                <td><strong>${this.calculation.poverty_index.toFixed(2)}</strong></td>
                <td><strong>100%</strong></td>
            </tr>
        `;

        const tableBodyElement = document.getElementById('breakdownTableBody');
        if (tableBodyElement) {
            tableBodyElement.innerHTML = tableHTML;
        }

        const explainabilityElement = document.getElementById('explainabilityInsights');
        if (explainabilityElement) {
            explainabilityElement.innerHTML = this.renderExplainabilityInsights();
        }
    }

    updateDetailedAnalysis() {
        const analysis = this.generateDetailedAnalysis();
        const analysisElement = document.getElementById('detailedAnalysis');
        if (analysisElement) {
            analysisElement.innerHTML = analysis;
        }
    }

    generateDetailedAnalysis() {
        const pi = this.calculation.poverty_index;
        const severity = this.getSeverityLevel(pi);
        const activeCount = this.calculation.active_layers.length;
        const confidenceScore = this.calculateConfidence();
        const formattedLocation = this.formatLocationName(this.locationData);
        
        let analysisHTML = `
            <div class="analysis-card">
                <h3>🎯 Overall Assessment</h3>
                <p>
                    The area of <strong>${formattedLocation}</strong> has been assessed with a comprehensive 
                    poverty index of <strong>${pi.toFixed(1)}%</strong>, categorizing it as 
                    <strong style="color: ${severity.color}; font-size: 1.1em;">${severity.label} Poverty</strong>.
                </p>
                <p>
                    This assessment is based on ${activeCount} active indicators, each contributing 
                    to the overall poverty measurement through a scientifically validated weighted calculation method. 
                    The confidence score of <strong>${confidenceScore.toFixed(1)}%</strong> reflects the 
                    data quality and completeness of the assessment.
                </p>
                <p>
                    ${this.getSeverityExplanation(pi)}
                </p>
            </div>

            <div class="analysis-card">
                <h3>📊 Indicator Analysis Overview</h3>
                <p>
                    The following sections provide detailed analysis of each indicator used in the calculation. 
                    Understanding the contribution of each factor helps identify priority areas for intervention.
                </p>
            </div>
        `;

        // Add analysis for each indicator - both active and inactive
        Object.entries(this.breakdown).forEach(([indicator, data]) => {
            const indicatorName = this.formatIndicatorName(indicator);
            const contributionPct = data.is_active ? 
                ((data.contribution / pi) * 100).toFixed(1) : 
                'N/A (Inactive)';
            
            analysisHTML += `
                <div class="analysis-card">
                    <h3>${data.is_active ? '✅' : '⚠️'} ${indicatorName} Analysis</h3>
                    <p>
                        <strong>Status:</strong> ${data.is_active ? 
                            `Active - contributing ${contributionPct}% to the poverty index` : 
                            'Inactive - excluded from calculation due to data limitations or low reliability'}
                    </p>
                    ${data.is_active ? `
                        <p>
                            The ${indicatorName.toLowerCase()} indicator shows a score of 
                            <strong>${data.adjusted_value.toFixed(1)}%</strong>, contributing 
                            <strong>${contributionPct}%</strong> to the overall poverty index. 
                            This represents <strong>${data.contribution.toFixed(2)}</strong> points 
                            out of the total ${pi.toFixed(1)}% poverty index.
                        </p>
                    ` : `
                        <p>
                            This indicator is currently inactive in the calculation. Data collection 
                            efforts should be prioritized to include this important dimension in future 
                            assessments and improve the overall confidence score.
                        </p>
                    `}
                    <ul>
                        <li><strong>Raw Score:</strong> ${(data.raw_value || 0).toFixed(1)}%</li>
                        <li><strong>Adjusted Score:</strong> ${data.adjusted_value.toFixed(1)}%</li>
                        <li><strong>Weight:</strong> ${data.weight_percentage}</li>
                        <li><strong>Contribution:</strong> ${data.contribution.toFixed(2)} points</li>
                    </ul>
                    <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                        <strong>Detailed Insight:</strong><br>
                        ${this.generateIndicatorInsight(indicator, data)}
                    </p>
                </div>
            `;
        });

        // Add cross-indicator analysis
        analysisHTML += `
            <div class="analysis-card">
                <h3>🔗 Inter-Indicator Relationships</h3>
                <p>
                    ${this.generateCrossIndicatorAnalysis()}
                </p>
            </div>
        `;

        return analysisHTML;
    }

    getSeverityExplanation(pi) {
        if (pi >= 70) {
            return `
                <strong>Critical Assessment:</strong> A poverty index above 70% indicates an area in 
                severe distress requiring immediate humanitarian attention. The population faces extreme 
                challenges accessing basic needs including food security, healthcare, education, and 
                housing. Urgent interventions including emergency relief programs, infrastructure development, 
                and comprehensive social protection mechanisms are essential.
            `;
        } else if (pi >= 50) {
            return `
                <strong>High Poverty Assessment:</strong> A score between 50-70% signals significant 
                economic hardship and limited access to essential services. While not in emergency conditions, 
                the area requires substantial investments in education, health infrastructure, economic 
                development, and social safety nets. Targeted programs focusing on youth employment, 
                women's economic empowerment, and agricultural productivity can yield substantial improvements.
            `;
        } else if (pi >= 30) {
            return `
                <strong>Moderate Assessment:</strong> A poverty index of 30-50% indicates mixed conditions 
                with pockets of both resilience and vulnerability. While basic infrastructure may exist, 
                there are opportunities for improvement in service quality and accessibility. Focus should 
                be on strengthening existing systems, expanding coverage, and addressing specific 
                community-identified gaps.
            `;
        } else {
            return `
                <strong>Low Assessment:</strong> A score below 30% suggests relatively better conditions 
                with more accessible services and infrastructure. However, continuous monitoring and 
                targeted support remain important to prevent regression and address remaining disparities 
                within the community.
            `;
        }
    }

    generateCrossIndicatorAnalysis() {
        let analysis = 'The interaction between different indicators reveals important patterns:\n';
        
        const activeIndicators = Object.entries(this.breakdown).filter(([_, data]) => data.is_active);
        
        if (activeIndicators.length > 1) {
            analysis += `
                <ul>
                    <li><strong>Education-Health Relationship:</strong> Lower education access often correlates 
                    with higher health vulnerability, creating a cycle that requires comprehensive interventions.</li>
                    <li><strong>Housing-Water Connection:</strong> Adequate housing quality typically includes 
                    access to clean water and sanitation, making these complementary development priorities.</li>
                    <li><strong>Economic Indicators:</strong> Employment rates and poverty levels are deeply 
                    interconnected, suggesting that job creation programs can have multiplier effects across 
                    other indicators.</li>
                </ul>
            `;
        } else {
            analysis += 'Analysis of relationships requires multiple active indicators. ';
        }
        
        analysis += `
            <p style="margin-top: 10px;">
                <strong>Recommendation:</strong> Address indicators comprehensively rather than in isolation. 
                For instance, education improvements coupled with health services create more sustainable 
                development outcomes than addressing either independently.
            </p>
        `;
        
        return analysis;
    }

    generateIndicatorInsight(indicator, data) {
        const insights = {
            poverty_index: `
                The poverty index serves as the primary metric measuring the economic well-being and 
                deprivation levels of the population. A score of ${data.adjusted_value.toFixed(1)}% 
                indicates that a substantial portion of residents face significant economic challenges, 
                with limited access to income-generating opportunities and basic necessities. This metric 
                captures multiple dimensions including consumption patterns, asset ownership, and living 
                standards. Factors contributing to this level may include limited employment opportunities, 
                inadequate social protection, restricted access to credit and financial services, and 
                vulnerability to economic shocks such as crop failures or market disruptions.
            `,
            education_access: `
                Education access at ${data.adjusted_value.toFixed(1)}% highlights significant gaps in 
                educational infrastructure, quality, and accessibility. This encompasses multiple factors 
                including school enrollment rates, teacher-to-student ratios, school facilities quality, 
                distance to nearest schools, and completion rates. Low education access perpetuates poverty 
                cycles by limiting economic opportunities for future generations. Barriers may include 
                inadequate school infrastructure, teacher shortages, high dropout rates, gender disparities, 
                and the need for children to contribute to household income through labor. Addressing 
                education requires both supply-side (schools, teachers, materials) and demand-side 
                (community mobilization, scholarship programs) interventions.
            `,
            health_vulnerability: `
                Health vulnerability of ${data.adjusted_value.toFixed(1)}% reveals significant challenges 
                in healthcare access, quality, and population health outcomes. This indicator reflects 
                factors such as distance to health facilities, availability of essential medicines, 
                healthcare worker density, immunization coverage, maternal and child health outcomes, 
                and prevalence of preventable diseases. Poor health outcomes create economic burdens 
                through medical costs and lost productivity, while limited access to care particularly 
                affects vulnerable populations including pregnant women, children, and the elderly. 
                Addressing health vulnerability requires investments in primary healthcare infrastructure, 
                community health worker programs, preventive care initiatives, and health insurance schemes.
            `,
            water_access: `
                Water access at ${data.adjusted_value.toFixed(1)}% indicates serious deficiencies in 
                the availability, quality, and reliability of water supply. This encompasses multiple 
                dimensions including distance to water sources, water quality, availability during 
                dry seasons, cost of water access, and adequacy for household and agricultural needs. 
                Limited water access disproportionately affects women and children who typically bear 
                water collection responsibilities, reducing time available for education and income 
                generation. Poor water quality contributes to waterborne diseases, particularly affecting 
                child nutrition and development. Improving water access requires investments in boreholes, 
                piped water systems, rainwater harvesting, and water treatment facilities, coupled with 
                community management structures.
            `,
            housing_quality: `
                Housing quality of ${data.adjusted_value.toFixed(1)}% reflects inadequate living 
                conditions including structural integrity, overcrowding, access to basic amenities 
                (electricity, sanitation), and security of tenure. Poor housing conditions contribute 
                to health problems through exposure to environmental hazards, overcrowding-related 
                disease transmission, and inadequate protection from weather extremes. Substandard 
                housing also affects educational outcomes as children lack adequate study spaces and 
                rest. This indicator encompasses both formal and informal settlements, with many 
                residents living in structures lacking durable materials, proper ventilation, or 
                basic sanitation facilities. Improving housing quality requires affordable housing 
                programs, upgrading of informal settlements, secure land tenure policies, and 
                infrastructure development including electricity and sanitation networks.
            `,
            employment_rate: `
                Employment rate of ${data.adjusted_value.toFixed(1)}% highlights challenges in 
                accessing formal and productive employment opportunities. This encompasses both 
                unemployment and underemployment, with many working in the informal sector with 
                low and irregular incomes. High unemployment particularly affects youth and women, 
                who face additional barriers to labor market entry. Limited employment opportunities 
                stem from various factors including lack of skills training, limited private sector 
                development, seasonal agricultural patterns, and restricted access to credit for 
                entrepreneurship. Addressing employment challenges requires comprehensive approaches 
                including vocational training, job matching services, support for small enterprises, 
                and public works programs, all tailored to local economic contexts and opportunities.
            `
        };
        
        if (insights[indicator]) {
            return insights[indicator].trim();
        }
        
        return `
            This indicator represents a crucial dimension of poverty measurement, contributing 
            ${data.contribution.toFixed(2)} points to the overall assessment. Its weighting of 
            ${data.weight_percentage} reflects its importance in determining comprehensive poverty levels. 
            Understanding both the direct and indirect effects of this indicator helps policymakers 
            design more effective, multi-dimensional poverty reduction strategies that address 
            interconnected challenges rather than isolated symptoms.
        `;
    }

    updateRecommendations() {
        const recommendations = this.generateRecommendations();
        const recommendationsElement = document.getElementById('recommendations');
        if (recommendationsElement) {
            recommendationsElement.innerHTML = recommendations;
        }
    }

    generateRecommendations() {
        const pi = this.calculation.poverty_index;
        const severity = this.getSeverityLevel(pi);
        const confidenceScore = this.calculateConfidence();
        const formattedLocation = this.formatLocationName(this.locationData);
        
        let recHTML = `
            <div class="recommendation-card">
                <h3>🎯 Priority Actions</h3>
                <p>
                    Based on the comprehensive assessment showing ${severity.label.toLowerCase()} poverty level 
                    (${pi.toFixed(1)}%) with a confidence score of ${confidenceScore.toFixed(1)}%, 
                    the following priority actions are recommended for <strong>${formattedLocation}</strong>.
                </p>
                <p>
                    These recommendations are grounded in evidence-based analysis of the contributing factors 
                    and aligned with national poverty reduction strategies and sustainable development goals.
                </p>
            </div>
        `;

        // Generate recommendations based on indicators
        const topIndicators = Object.entries(this.breakdown)
            .filter(([_, data]) => data.is_active)
            .sort((a, b) => b[1].contribution - a[1].contribution)
            .slice(0, 3);

        topIndicators.forEach(([indicator, data], idx) => {
            const name = this.formatIndicatorName(indicator);
            const recs = this.getIndicatorRecommendations(indicator, data);
            
            recHTML += `
                <div class="recommendation-card">
                    <h3>${idx + 1}. ${name} Improvement (Priority ${idx + 1})</h3>
                    <p><strong>Current Score:</strong> ${data.adjusted_value.toFixed(1)}% | 
                    <strong>Contribution to Poverty Index:</strong> ${((data.contribution / pi) * 100).toFixed(1)}%</p>
                    ${recs}
                </div>
            `;
        });

        recHTML += `
            <div class="recommendation-card">
                <h3>📈 Monitoring & Evaluation Framework</h3>
                <p>
                    <strong>Establish Baseline Measurements:</strong> Document current values for all indicators 
                    as a reference point for tracking progress over time. This baseline should be maintained 
                    in a centralized database accessible to stakeholders.
                </p>
                <p>
                    <strong>Set Realistic Targets:</strong> Define specific, measurable targets for each indicator 
                    with timelines (e.g., reduce poverty index by 10% within 2 years, increase education access 
                    to 70% within 3 years). Targets should be ambitious yet achievable based on resource 
                    availability and intervention intensity.
                </p>
                <p>
                    <strong>Quarterly Progress Reviews:</strong> Conduct regular assessments every three months 
                    to measure progress, identify bottlenecks, and adjust strategies. These reviews should 
                    involve community representatives, implementing partners, and government officials.
                </p>
                <p>
                    <strong>Annual Comprehensive Assessments:</strong> Perform full poverty assessments annually 
                    using the same methodology to track long-term trends and evaluate the cumulative impact 
                    of interventions across all dimensions.
                </p>
                <p>
                    <strong>Data Collection System:</strong> Implement a systematic data collection mechanism 
                    using digital tools where possible, trained enumerators, and community reporting systems. 
                    This ensures data quality and timeliness while building local capacity for evidence-based 
                    decision-making.
                </p>
            </div>

            <div class="recommendation-card">
                <h3>🎓 Stakeholder Engagement & Coordination</h3>
                <p>
                    <strong>Multi-Stakeholder Platform:</strong> Establish a coordination mechanism involving 
                    county government, national agencies, NGOs, community-based organizations, and private 
                    sector partners to align interventions and avoid duplication.
                </p>
                <p>
                    <strong>Community Participation:</strong> Ensure meaningful community involvement in 
                    planning, implementation, and monitoring through participatory assessments, community 
                    meetings, and representation in decision-making bodies.
                </p>
                <p>
                    <strong>Resource Mobilization:</strong> Develop a comprehensive resource mobilization 
                    strategy leveraging government budgets, development partner funding, private sector 
                    investment, and community contributions to ensure sustainable financing.
                </p>
            </div>
        `;

        return recHTML;
    }

    getIndicatorRecommendations(indicator, data) {
        const recommendations = {
            poverty_index: `
                <p><strong>1. Social Protection Programs</strong></p>
                <ul>
                    <li>Implement targeted cash transfer programs for the most vulnerable households, 
                    particularly female-headed households, elderly living alone, and persons with disabilities</li>
                    <li>Establish a social registry to identify and enroll beneficiaries, ensuring 
                    transparency and targeting accuracy</li>
                    <li>Develop conditional cash transfer programs linked to education and health 
                    service utilization to create positive incentives</li>
                    <li>Create food security programs including school feeding and community grain 
                    banks for vulnerable populations</li>
                </ul>
                
                <p><strong>2. Economic Empowerment Initiatives</strong></p>
                <ul>
                    <li>Launch public works programs to provide temporary employment while building 
                    essential infrastructure (roads, water systems, community facilities)</li>
                    <li>Establish microfinance institutions offering small loans, savings products, 
                    and financial literacy training for low-income entrepreneurs</li>
                    <li>Promote value chain development in agriculture, connecting small-scale farmers 
                    to markets and improving their returns through cooperatives</li>
                    <li>Support youth and women's economic empowerment through skills training, 
                    mentorship programs, and business incubation services</li>
                </ul>
                
                <p><strong>3. Entrepreneurship & Job Creation</strong></p>
                <ul>
                    <li>Develop vocational training centers offering market-relevant skills in 
                    construction, agribusiness, hospitality, and digital technology</li>
                    <li>Create business incubation hubs with low-cost workspace, mentorship, and 
                    access to markets and finance</li>
                    <li>Facilitate partnerships between local businesses and educational institutions 
                    for apprenticeship programs</li>
                    <li>Promote local procurement policies to support small businesses and create 
                    employment opportunities within the community</li>
                </ul>
            `,
            education_access: `
                <p><strong>1. Infrastructure Development</strong></p>
                <ul>
                    <li>Construct new schools in underserved areas and upgrade existing facilities 
                    with proper classrooms, libraries, laboratories, and computer rooms</li>
                    <li>Build access roads and provide safe transportation (bicycles, school buses) 
                    to reduce distance barriers and ensure student safety</li>
                    <li>Ensure all schools have adequate sanitation facilities (separate for boys/girls), 
                    clean water, and electricity for lighting and digital learning</li>
                    <li>Create boarding facilities for secondary schools to accommodate students from 
                    remote areas with long commutes</li>
                </ul>
                
                <p><strong>2. Quality Improvement Programs</strong></p>
                <ul>
                    <li>Recruit and train qualified teachers, addressing both quantity (teacher-student 
                    ratios) and quality (subject competency, pedagogical skills)</li>
                    <li>Provide continuous professional development for teachers through in-service 
                    training, peer learning, and digital resources</li>
                    <li>Develop localized curricula incorporating relevant local knowledge, languages, 
                    and vocational skills alongside standard subjects</li>
                    <li>Supply adequate learning materials including textbooks, stationery, and 
                    technology devices (tablets, projectors) for digital learning</li>
                </ul>
                
                <p><strong>3. Access & Equity Measures</strong></p>
                <ul>
                    <li>Establish scholarship programs for vulnerable children including orphans, 
                    children with disabilities, and those from poorest households</li>
                    <li>Implement gender-sensitive policies addressing barriers to girls' education 
                    including sanitary facilities, safety measures, and menstrual hygiene management</li>
                    <li>Create adult literacy and numeracy programs for parents, improving their 
                    ability to support children's education</li>
                    <li>Develop flexible learning models including evening classes and mobile schools 
                    for pastoralist and migrant communities</li>
                </ul>
                
                <p><strong>4. Technology Integration</strong></p>
                <ul>
                    <li>Invest in digital learning infrastructure including computer labs, internet 
                    connectivity, and educational software</li>
                    <li>Provide tablets or laptops for students and teachers, loaded with interactive 
                    educational content and e-books</li>
                    <li>Establish community technology hubs offering digital skills training for 
                    students and community members</li>
                    <li>Develop online and offline educational content accessible via mobile phones 
                    and radios for distance learning</li>
                </ul>
            `,
            health_vulnerability: `
                <p><strong>1. Infrastructure Expansion</strong></p>
                <ul>
                    <li>Construct new health facilities (hospitals, health centers, dispensaries) 
                    strategically located to reduce travel distances and improve accessibility</li>
                    <li>Equip facilities with essential medical equipment, diagnostic tools, and 
                    adequate drug supplies meeting national essential medicines list</li>
                    <li>Establish ambulance services and emergency transport systems for critical 
                    cases and maternal health emergencies</li>
                    <li>Improve infrastructure including reliable electricity (solar power), clean 
                    water, sanitation, and waste management systems at all health facilities</li>
                </ul>
                
                <p><strong>2. Human Resources</strong></p>
                <ul>
                    <li>Recruit and deploy qualified healthcare workers including doctors, nurses, 
                    clinical officers, and laboratory technicians to underserved areas</li>
                    <li>Train and deploy community health workers (CHWs) providing primary care, 
                    health education, and referral services at village level</li>
                    <li>Provide continuous medical education and skills upgrading for healthcare 
                    workers, especially in maternal and child health</li>
                    <li>Implement performance-based incentives and retention allowances to keep 
                    qualified staff in rural and remote areas</li>
                </ul>
                
                <p><strong>3. Preventive Care Programs</strong></p>
                <ul>
                    <li>Strengthen immunization programs ensuring high coverage for children under 
                    five and expanding to include new vaccines</li>
                    <li>Implement nutrition programs including growth monitoring, micronutrient 
                    supplementation, and therapeutic feeding for malnourished children</li>
                    <li>Conduct community health education campaigns on hygiene, sanitation, 
                    nutrition, maternal health, and disease prevention</li>
                    <li>Establish maternal and child health clinics providing antenatal care, 
                    delivery services, postnatal care, and family planning</li>
                </ul>
                
                <p><strong>4. Health Financing</strong></p>
                <ul>
                    <li>Expand health insurance coverage through National Health Insurance Fund 
                    (NHIF), making premiums affordable for low-income households</li>
                    <li>Provide free or subsidized services for vulnerable populations including 
                    pregnant women, children under five, elderly, and persons with disabilities</li>
                    <li>Establish health savings schemes and community health funds enabling 
                    financial protection against catastrophic health expenses</li>
                    <li>Implement user fee removal or waiver systems for essential health services 
                    in poverty-stricken areas</li>
                </ul>
            `,
            water_access: `
                <p><strong>1. Infrastructure Development</strong></p>
                <ul>
                    <li>Drill and equip boreholes with submersible pumps and power systems (solar, 
                    grid, or wind-powered) in strategic locations serving multiple communities</li>
                    <li>Construct piped water systems connecting communities to reliable water 
                    sources including dams, rivers, and water treatment plants</li>
                    <li>Build rainwater harvesting systems including rooftop collection systems, 
                    storage tanks, and check dams for surface water retention</li>
                    <li>Install water treatment facilities ensuring safe drinking water quality 
                    meeting national standards and reducing waterborne diseases</li>
                </ul>
                
                <p><strong>2. Water Management</strong></p>
                <ul>
                    <li>Establish Water Resource Users Associations (WRUAs) for sustainable 
                    management of water sources and conflict resolution</li>
                    <li>Implement water conservation measures including drip irrigation, water 
                    storage systems, and awareness campaigns on efficient water use</li>
                    <li>Develop and enforce water quality monitoring systems testing for 
                    contaminants, pathogens, and chemical safety on regular basis</li>
                    <li>Create water management committees at community level ensuring maintenance, 
                    fee collection, and equitable distribution of water resources</li>
                </ul>
                
                <p><strong>3. Affordable Access</strong></p>
                <ul>
                    <li>Install multiple water access points (taps, kiosks, standpipes) to reduce 
                    walking distances, particularly improving access for women and children</li>
                    <li>Implement progressive tariff structures making basic water affordable while 
                    recovering costs for system maintenance and sustainability</li>
                    <li>Provide subsidies or free water allocations for vulnerable households 
                    including elderly, disabled, and indigent families</li>
                    <li>Establish alternative low-cost water purification methods (ceramic filters, 
                    chlorine tablets) for households without treated water access</li>
                </ul>
                
                <p><strong>4. Community Empowerment</strong></p>
                <ul>
                    <li>Train community members in water system maintenance, repair, and management 
                    ensuring sustainability and local ownership</li>
                    <li>Develop income-generating activities around water projects (water kiosks, 
                    irrigation schemes) creating employment while improving access</li>
                    <li>Promote gender equity in water management ensuring women's participation 
                    in decision-making bodies and technical roles</li>
                    <li>Create awareness programs on hygiene practices including handwashing, 
                    safe water handling, and sanitation to maximize health benefits</li>
                </ul>
            `,
            housing_quality: `
                <p><strong>1. Affordable Housing Programs</strong></p>
                <ul>
                    <li>Develop government-sponsored affordable housing units meeting minimum 
                    standards at subsidized rates with flexible payment plans for low-income families</li>
                    <li>Establish housing cooperatives enabling collective ownership, reducing costs 
                    through bulk purchasing and shared infrastructure development</li>
                    <li>Provide housing subsidies and grants for vulnerable families including 
                    elderly, persons with disabilities, and female-headed households</li>
                    <li>Promote self-help housing schemes supporting communities to construct their 
                    own homes with technical assistance and material support</li>
                </ul>
                
                <p><strong>2. Informal Settlement Upgrading</strong></p>
                <ul>
                    <li>Regularize land tenure and provide titles or certificates of occupancy 
                    for informal settlement residents, enabling access to finance and security</li>
                    <li>Upgrade existing informal settlements by improving road infrastructure, 
                    drainage, water, sanitation, and electricity services</li>
                    <li>Construct public facilities including health centers, schools, and market 
                    spaces improving overall quality of life in informal settlements</li>
                    <li>Implement incremental upgrading programs allowing gradual home improvements 
                    as household income increases, ensuring affordability</li>
                </ul>
                
                <p><strong>3. Infrastructure Development</strong></p>
                <ul>
                    <li>Extend electricity grid to underserved areas and promote alternative energy 
                    sources (solar panels, biogas) for off-grid communities</li>
                    <li>Develop comprehensive sanitation infrastructure including sewerage systems, 
                    septic tanks, and improved pit latrines preventing environmental contamination</li>
                    <li>Improve road networks and footpaths connecting housing areas to employment 
                    centers, schools, and essential services</li>
                    <li>Install street lighting enhancing security and enabling safer movement 
                    during evening hours, particularly important for women and girls</li>
                </ul>
                
                <p><strong>4. Housing Finance & Support</strong></p>
                <ul>
                    <li>Establish microfinance programs offering housing loans with low interest 
                    rates and flexible repayment terms suitable for low-income borrowers</li>
                    <li>Create savings schemes enabling gradual accumulation of funds for home 
                    purchase, construction, or improvement</li>
                    <li>Provide technical assistance and training in construction techniques, 
                    materials selection, and building standards for owner-builders</li>
                    <li>Promote use of cost-effective and locally available building materials 
                    (compressed earth blocks, bamboo, treated timber) reducing construction costs</li>
                </ul>
            `
        };
        
        return recommendations[indicator] || `
            <p><strong>Focus on improving this indicator through targeted interventions.</strong></p>
            <ul>
                <li>Conduct detailed needs assessment to identify specific gaps and barriers</li>
                <li>Develop evidence-based intervention programs addressing identified challenges</li>
                <li>Engage community stakeholders in planning and implementation</li>
                <li>Monitor and evaluate progress to ensure effectiveness</li>
            </ul>
        `;
    }

    updateMethodology() {
        const activeCount = this.calculation.active_layers.length;
        const totalIndicators = Object.keys(this.breakdown).length;
        
        const methodology = `
            <div class="methodology-section">
                <h3>📐 Calculation Methodology</h3>
                <p>
                    The poverty index calculation employs a scientifically validated weighted average approach 
                    that combines multiple socio-economic indicators to provide a comprehensive, multi-dimensional 
                    assessment of poverty levels. This methodology ensures that indicators which are more 
                    critical or reliable in measuring poverty contribute proportionally more to the final score.
                </p>
                
                <p><strong>Step 1: Data Collection & Validation</strong></p>
                <ul>
                    <li><strong>Primary Sources:</strong> Indicators are collected from multiple authoritative 
                    sources including national census data, household surveys, and administrative records from 
                    government agencies.</li>
                    <li><strong>Secondary Sources:</strong> Complementary data from satellite imagery, remote 
                    sensing, and community assessments provides additional validation and spatial context.</li>
                    <li><strong>Data Quality Checks:</strong> All data undergoes rigorous validation including 
                    outlier detection, consistency checks, and cross-referencing with multiple sources to ensure 
                    accuracy and reliability.</li>
                </ul>
                
                <p><strong>Step 2: Normalization Process</strong></p>
                <ul>
                    <li>Raw scores from different indicators are normalized to a standardized 0-100 scale 
                    ensuring comparability across diverse metrics.</li>
                    <li>This normalization accounts for varying measurement units and scales, allowing 
                    meaningful aggregation of indicators measured in different ways.</li>
                    <li>Normalization algorithms handle edge cases including missing data, extreme values, 
                    and non-linear relationships between raw data and poverty outcomes.</li>
                </ul>
                
                <p><strong>Step 3: Weight Assignment</strong></p>
                <ul>
                    <li>Each indicator receives a weight based on its theoretical and empirical importance 
                    in measuring poverty, derived from international best practices and local context.</li>
                    <li>Weights also reflect data quality and reliability - indicators with more robust 
                    and frequently updated data receive higher weights.</li>
                    <li>Weights sum to 100%, ensuring interpretability and preventing artificial inflation 
                    or deflation of scores.</li>
                </ul>
                
                <p><strong>Step 4: Dynamic Activation</strong></p>
                <ul>
                    <li>Indicators are activated or deactivated based on data availability, reliability, 
                    and relevance to the specific location or time period.</li>
                    <li>Only active indicators (${activeCount} of ${totalIndicators}) contribute to the 
                    final calculation, ensuring accuracy when complete data is unavailable.</li>
                    <li>This dynamic approach maintains reliability even with missing data, preventing 
                    the exclusion of entire areas from assessment.</li>
                </ul>
                
                <p><strong>Step 5: Aggregation Formula</strong></p>
                <div style="background: var(--panel-bg); color: var(--text-primary); padding: 20px; border-radius: 8px; margin: 15px 0; 
                         border-left: 4px solid var(--primary-color);">
                    <p><strong>Mathematical Formula:</strong></p>
                    <p style="font-family: 'Courier New', monospace; font-size: 1.1em; margin: 10px 0;">
                        Poverty Index = Σ(Indicator_Score_i × Weight_i) / Σ(Active_Weights)
                    </p>
                    <p style="font-family: 'Courier New', monospace; margin: 10px 0;">
                        Where:<br>
                        • Indicator_Score_i = Normalized score for indicator i<br>
                        • Weight_i = Weight assigned to indicator i<br>
                        • Active_Weights = Sum of weights for all active indicators<br>
                        • i ranges over all active indicators
                    </p>
                    <p style="margin-top: 10px; color: var(--text-secondary); font-size: 0.9em;">
                        <em>This formula ensures that the final poverty index is a proportional weighted 
                        average, maintaining sensitivity to all contributing factors while respecting 
                        their relative importance.</em>
                    </p>
                </div>
                
                <p><strong>Step 6: Confidence Scoring</strong></p>
                <ul>
                    <li>The confidence score is calculated as the proportion of indicators with reliable 
                    data: Confidence = (Active Indicators / Total Indicators) × 100%</li>
                    <li>A confidence score of 80% or higher indicates robust data coverage and high 
                    reliability of the assessment.</li>
                    <li>Lower confidence scores signal areas where additional data collection could 
                    improve assessment quality and accuracy.</li>
                </ul>
            </div>
            
            <div class="methodology-section">
                <h3>📊 Data Sources</h3>
                <p>
                    The assessment draws on multiple authoritative data sources ensuring comprehensiveness, 
                    accuracy, and triangulation of information. Each source contributes unique insights 
                    that, when combined, provide a holistic understanding of poverty.
                </p>
                <ul>
                    <li><strong>Kenya National Bureau of Statistics (KNBS):</strong> Official census data, 
                    household surveys including Kenya Integrated Household Budget Survey (KIHBS), and 
                    demographic surveys providing nationally representative poverty statistics.</li>
                    <li><strong>County Government Records:</strong> Administrative data from county 
                    governments including health facility records, school enrollment data, water coverage 
                    statistics, and housing registries.</li>
                    <li><strong>Ministry of Health:</strong> Health facility data, immunization records, 
                    maternal health statistics, and disease surveillance information.</li>
                    <li><strong>Ministry of Education:</strong> School enrollment data, teacher deployment 
                    records, infrastructure assessments, and performance metrics.</li>
                    <li><strong>Water Sector Agencies:</strong> Water coverage mapping, infrastructure 
                    inventories, and service delivery records from county water departments and utilities.</li>
                    <li><strong>Community Surveys:</strong> Participatory rural appraisals, community 
                    needs assessments, and household interviews conducted by civil society organizations 
                    and development partners.</li>
                    <li><strong>Satellite & Remote Sensing Data:</strong> Night-time lights data from 
                    NASA Black Marble, land use classification from Sentinel satellites, and population 
                    density mapping providing spatial poverty patterns.</li>
                    <li><strong>Mobile Network Data:</strong> Anonymized mobility and connectivity data 
                    providing insights into economic activity and accessibility patterns.</li>
                </ul>
            </div>
            
            <div class="methodology-section">
                <h3>🔍 Quality Assurance Framework</h3>
                <p>
                    Rigorous quality assurance processes ensure that all data meets high standards before 
                    being used in calculations, maintaining the integrity and credibility of the poverty 
                    assessment.
                </p>
                
                <p><strong>Data Validation:</strong></p>
                <ul>
                    <li>Automated checks for completeness, consistency, and range validation ensuring 
                    data falls within expected parameters</li>
                    <li>Cross-validation against multiple sources to identify discrepancies and 
                    outliers that may indicate errors</li>
                    <li>Temporal consistency checks comparing current data with historical trends 
                    to detect anomalies</li>
                </ul>
                
                <p><strong>Data Cleaning:</strong></p>
                <ul>
                    <li>Removal of duplicate records, incomplete entries, and obviously erroneous 
                    values identified through statistical analysis</li>
                    <li>Imputation techniques for missing values where appropriate, using established 
                    statistical methods and clearly documented assumptions</li>
                    <li>Outlier treatment using robust statistical methods, distinguishing between 
                    legitimate extreme values and data errors</li>
                </ul>
                
                <p><strong>Data Verification:</strong></p>
                <ul>
                    <li>Source verification ensuring data originates from credible and authoritative 
                    institutions with established data collection protocols</li>
                    <li>Field validation through spot checks and ground-truthing exercises comparing 
                    administrative data with observed reality</li>
                    <li>Peer review and expert validation involving poverty measurement experts and 
                    local stakeholders familiar with the context</li>
                </ul>
                
                <p><strong>Transparency & Documentation:</strong></p>
                <ul>
                    <li>Complete documentation of all data sources, collection methods, and processing 
                    procedures in metadata</li>
                    <li>Clear specification of assumptions, limitations, and methodological choices 
                    affecting results interpretation</li>
                    <li>Public availability of methodology documentation enabling peer review and 
                    replication of results</li>
                </ul>
            </div>
            
            <div class="methodology-section">
                <h3>🌍 Alignment with Global Standards</h3>
                <p>
                    This methodology aligns with internationally recognized poverty measurement approaches 
                    including the United Nations Sustainable Development Goals (SDGs), the World Bank's 
                    Multidimensional Poverty Index (MPI), and the Alkire-Foster counting methodology.
                </p>
                <ul>
                    <li><strong>SDG Goal 1:</strong> End poverty in all its forms everywhere - indicators 
                    directly measure dimensions relevant to SDG 1 targets and indicators</li>
                    <li><strong>Multidimensional Poverty:</strong> Goes beyond income to capture multiple 
                    dimensions of deprivation including education, health, and living standards</li>
                    <li><strong>Participation & Transparency:</strong> Involves communities in data 
                    collection and ensures transparent methodology for accountability</li>
                    <li><strong>Regular Updates:</strong> Designed for regular refresh enabling monitoring 
                    of progress over time and evaluation of interventions</li>
                </ul>
            </div>
        `;
        
        const methodologyElement = document.getElementById('methodology');
        if (methodologyElement) {
            methodologyElement.innerHTML = methodology;
        }
    }

    createVisualizations() {
        this.createPovertyChart();
        this.createIndicatorChart();
        this.createContributionChart();
        this.createWeightChart();
    }

    createPovertyChart() {
        const ctx = document.getElementById('povertyChart');
        if (!ctx) return;

        const data = [
            this.calculation.poverty_index,
            100 - this.calculation.poverty_index
        ];

        this.charts.poverty = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Poverty Index', 'Non-Poverty'],
                datasets: [{
                    data: data,
                    backgroundColor: [
                        this.getSeverityColor(this.calculation.poverty_index),
                        '#e9ecef'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: `Poverty Index: ${this.calculation.poverty_index.toFixed(1)}%`
                    }
                }
            }
        });
    }

    createIndicatorChart() {
        const ctx = document.getElementById('indicatorChart');
        if (!ctx) return;

        const labels = [];
        const data = [];

        Object.entries(this.breakdown).forEach(([indicator, info]) => {
            if (info.is_active) {
                labels.push(this.formatIndicatorName(indicator));
                data.push(info.adjusted_value);
            }
        });

        this.charts.indicator = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Indicator Score (%)',
                    data: data,
                    backgroundColor: labels.map((_, i) => 
                        `hsl(${220 + i * 30}, 70%, 60%)`
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    createContributionChart() {
        const ctx = document.getElementById('contributionChart');
        if (!ctx) return;

        const labels = [];
        const data = [];

        Object.entries(this.breakdown).forEach(([indicator, info]) => {
            if (info.is_active) {
                labels.push(this.formatIndicatorName(indicator));
                data.push(info.contribution);
            }
        });

        this.charts.contribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: data.map((_, i) => 
                        `hsl(${120 + i * 60}, 70%, 50%)`
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createWeightChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;

        const labels = [];
        const data = [];

        Object.entries(this.breakdown).forEach(([indicator, info]) => {
            labels.push(this.formatIndicatorName(indicator));
            data.push(parseFloat(info.weight_percentage.replace('%', '')));
        });

        this.charts.weight = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (%)',
                    data: data,
                    backgroundColor: 'rgba(46, 139, 87, 0.7)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    calculateConfidence() {
        const activeCount = this.calculation.active_layers.length;
        const totalIndicators = Object.keys(this.breakdown).length;
        return (activeCount / totalIndicators) * 100;
    }

    getSeverityLevel(score) {
        if (score >= 70) return { label: 'Critical', color: '#d73027' };
        if (score >= 50) return { label: 'High', color: '#fc8d59' };
        if (score >= 30) return { label: 'Moderate', color: '#fee08b' };
        return { label: 'Low', color: '#91cf60' };
    }

    getSeverityColor(score) {
        return this.getSeverityLevel(score).color;
    }

    formatIndicatorName(indicator) {
        const names = {
            poverty_index: 'Poverty Index',
            education_access: 'Education Access',
            health_vulnerability: 'Health Vulnerability',
            water_access: 'Water Access',
            housing_quality: 'Housing Quality',
            employment_rate: 'Employment Rate'
        };
        return names[indicator] || indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    updateReportDates() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Update footer date if element exists
        const footerDateElement = document.getElementById('reportFooterDate');
        if (footerDateElement) {
            footerDateElement.textContent = dateStr;
        }
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('reportContent').style.display = 'block';
    }

    showError(message) {
        const loadingState = document.getElementById('loadingState');
        if (!loadingState) return;
        
        loadingState.innerHTML = `
            <div style="text-align: center; padding: 40px; max-width: 600px; margin: 0 auto;">
                <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
                <h2 style="color: var(--primary-color); margin-bottom: 15px;">No Data Available</h2>
                <p style="color: var(--text-primary); font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px;">
                    ${message}
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="window.location.href='/poverty-map.html'" 
                            style="padding: 12px 24px; font-size: 1rem;">
                        🗺️ Go to Poverty Map
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.href='/'" 
                            style="padding: 12px 24px; font-size: 1rem;">
                        🏠 Return to Dashboard
                    </button>
                </div>
                <div style="margin-top: 30px; padding: 20px; background: var(--bg-secondary); border-radius: 8px; text-align: left;">
                    <h3 style="margin: 0 0 10px 0; color: var(--primary-color); font-size: 1rem;">How to generate a report:</h3>
                    <ol style="margin: 0; padding-left: 20px; color: var(--text-primary); line-height: 1.8;">
                        <li>Navigate to the <strong>Poverty Map</strong> page</li>
                        <li>Click on any area or location marker on the map</li>
                        <li>Click <strong>"View Full Detailed Report"</strong> or <strong>"Calculation Breakdown"</strong> in the popup</li>
                        <li>The detailed report will open automatically with all data</li>
                    </ol>
                </div>
            </div>
        `;
    }
}

// PDF Download Function
// This function generates professional PDF reports with consistent formatting
// Works identically for both training data clusters and searched locations
function downloadPDFReport() {
    console.log('📥 Generating PDF report...');
    
    // Ensure report content is visible and ready
    const reportContent = document.getElementById('reportContent');
    if (!reportContent) {
        console.error('❌ Report content not found');
        alert('Report content not ready. Please wait for the report to load.');
        return;
    }
    
    // Check if report has actual content
    const hasContent = reportContent.innerHTML && reportContent.innerHTML.trim().length > 0;
    if (!hasContent) {
        console.error('❌ Report content is empty');
        alert('Report content is empty. Please wait for the report to fully load.');
        return;
    }
    
    // Ensure report is fully generated before PDF creation
    if (!window.reportGenerator || !window.reportGenerator.calculation) {
        console.warn('⚠️ Report not fully generated, waiting...');
        setTimeout(() => downloadPDFReport(), 500);
        return;
    }
    
    // Ensure report content has dimensions (not hidden or zero size)
    const rect = reportContent.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        console.warn('⚠️ Report content has zero dimensions, forcing visibility...');
        reportContent.style.display = 'block';
        reportContent.style.visibility = 'visible';
        reportContent.style.opacity = '1';
        reportContent.style.width = '100%';
        reportContent.style.height = 'auto';
        reportContent.style.position = 'static';
        reportContent.style.transform = 'none';
    }
    
    // Hide buttons and non-essential elements before generating PDF
    const buttons = document.querySelectorAll('.print-only-hidden, .report-actions, .header');
    const originalDisplays = [];
    buttons.forEach(btn => {
        if (btn) {
            originalDisplays.push({ element: btn, display: btn.style.display });
            btn.style.display = 'none';
            btn.style.visibility = 'hidden';
        }
    });
    
    // Hide the main page header
    const header = document.querySelector('.header');
    if (header && !originalDisplays.find(d => d.element === header)) {
        originalDisplays.push({ element: header, display: header.style.display });
        header.style.display = 'none';
        header.style.visibility = 'hidden';
    }
    
    document.body.classList.add('pdf-print-mode');
    
    // Ensure report content is visible and starts at top
    reportContent.style.display = 'block';
    reportContent.style.visibility = 'visible';
    reportContent.style.opacity = '1';
    reportContent.style.marginTop = '0';
    reportContent.style.paddingTop = '0';
    reportContent.style.width = '100%';
    reportContent.style.maxWidth = '100%';
    reportContent.style.position = 'static';
    reportContent.style.transform = 'none';
    
    // For mobile, ensure content is properly formatted for PDF (use desktop width)
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Set a professional width for PDF generation (A4 width in pixels at 96 DPI)
        reportContent.style.minWidth = '1200px';
        reportContent.style.maxWidth = '1200px';
        reportContent.style.width = '1200px';
        reportContent.style.margin = '0 auto';
        reportContent.style.overflow = 'visible';
        reportContent.style.padding = '30px 40px';
        
        // Ensure all sections have proper spacing
        const allSections = reportContent.querySelectorAll('.report-section');
        allSections.forEach(section => {
            section.style.width = '100%';
            section.style.maxWidth = '100%';
            section.style.boxSizing = 'border-box';
        });
        
        // Ensure tables are properly sized
        const allTables = reportContent.querySelectorAll('table');
        allTables.forEach(table => {
            table.style.width = '100%';
            table.style.maxWidth = '100%';
            table.style.tableLayout = 'auto';
        });
        
        // Ensure cards and grids are properly formatted
        const allGrids = reportContent.querySelectorAll('.summary-grid, .visualization-grid, .overview-content');
        allGrids.forEach(grid => {
            grid.style.width = '100%';
            grid.style.maxWidth = '100%';
        });
    }
    
    // Scroll to top to ensure we capture from the beginning
    window.scrollTo(0, 0);
    reportContent.scrollIntoView({ behavior: 'instant', block: 'start' });
    
    // Apply export-specific styling tweaks
    reportContent.classList.add('pdf-export-mode');
    
    // Capture section break state and enforce deterministic breaks
    const sections = Array.from(reportContent.querySelectorAll('.report-section'));
    const sectionBreakStates = sections.map(section => ({
        before: section.style.pageBreakBefore || '',
        after: section.style.pageBreakAfter || '',
        inside: section.style.pageBreakInside || ''
    }));
    sections.forEach((section, index) => {
        // First section should NOT force a page break - it should start on page 1
        section.style.pageBreakBefore = index === 0 ? 'auto' : 'always';
        section.style.pageBreakAfter = 'avoid';
        section.style.pageBreakInside = 'avoid';
    });
    
    // Ensure report header starts at the top
    const reportHeader = reportContent.querySelector('.report-header');
    if (reportHeader) {
        reportHeader.style.pageBreakBefore = 'auto';
        reportHeader.style.pageBreakAfter = 'avoid';
        reportHeader.style.pageBreakInside = 'avoid';
        reportHeader.style.marginTop = '0';
        reportHeader.style.paddingTop = '0';
    }
    
    const restoreSectionBreaks = () => {
        sections.forEach((section, index) => {
            const state = sectionBreakStates[index];
            section.style.pageBreakBefore = state.before;
            section.style.pageBreakAfter = state.after;
            section.style.pageBreakInside = state.inside;
        });
    };
    
    const finalize = () => {
        originalDisplays.forEach(item => {
            if (item.element) {
                item.element.style.display = item.display;
                item.element.style.visibility = '';
            }
        });
        
        // Restore mobile styles if on mobile
        if (isMobile) {
            reportContent.style.minWidth = '';
            reportContent.style.maxWidth = '';
            reportContent.style.width = '';
            reportContent.style.margin = '';
            reportContent.style.padding = '';
            
            // Restore section styles
            const allSections = reportContent.querySelectorAll('.report-section');
            allSections.forEach(section => {
                section.style.width = '';
                section.style.maxWidth = '';
                section.style.boxSizing = '';
            });
            
            // Restore table styles
            const allTables = reportContent.querySelectorAll('table');
            allTables.forEach(table => {
                table.style.width = '';
                table.style.maxWidth = '';
                table.style.tableLayout = '';
            });
            
            // Restore grid styles
            const allGrids = reportContent.querySelectorAll('.summary-grid, .visualization-grid, .overview-content');
            allGrids.forEach(grid => {
                grid.style.width = '';
                grid.style.maxWidth = '';
            });
        }
        
        reportContent.classList.remove('pdf-export-mode');
        restoreSectionBreaks();
        document.body.classList.remove('pdf-print-mode');
    };
    
    // Delay to ensure layout changes take effect before PDF generation
    // Longer delay for mobile to ensure proper rendering
    const delay = isMobile ? 300 : 100;
    setTimeout(() => {
        generatePDF();
    }, delay);
    
    function generatePDF() {

        // Use html2pdf library with optimized settings for professional PDFs
        if (typeof html2pdf !== 'undefined') {
            // Get location name safely for filename
            const locationName = (window.reportGenerator?.locationData?.name || 
                                  window.reportGenerator?.locationData?.location_name || 
                                  'area').replace(/[^a-z0-9]/gi, '-').toLowerCase();
            
            // Optimized PDF generation options with professional formatting
            // Same settings for both training data and searched locations
            const opt = {
            margin: [15, 15, 15, 15], // Top, Right, Bottom, Left margins in mm
            filename: `poverty-report-${locationName}-${Date.now()}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 0.95
            },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false, // Disable logging for cleaner output
                backgroundColor: '#ffffff',
                removeContainer: false, // Keep container for better mobile support
                letterRendering: true,
                allowTaint: false,
                // Use professional width for PDF (A4 width ~1200px at 96 DPI)
                windowWidth: 1200,
                windowHeight: Math.max(reportContent.scrollHeight || 1800, 1800),
                width: 1200, // Fixed professional width
                height: reportContent.scrollHeight || 1800, // Use actual content height
                x: 0, // Start from left
                y: 0, // Start from top
                scrollX: 0, // No horizontal scroll
                scrollY: 0, // No vertical scroll
                onclone: function(clonedDoc) {
                    // Apply professional PDF styling to cloned document
                    const clonedContent = clonedDoc.getElementById('reportContent');
                    if (clonedContent) {
                        // Set professional container width
                        clonedContent.style.display = 'block';
                        clonedContent.style.visibility = 'visible';
                        clonedContent.style.opacity = '1';
                        clonedContent.style.width = '1200px';
                        clonedContent.style.maxWidth = '1200px';
                        clonedContent.style.margin = '0 auto';
                        clonedContent.style.padding = '30px 40px';
                        clonedContent.style.backgroundColor = '#ffffff';
                        clonedContent.style.boxSizing = 'border-box';
                        
                        // Ensure all sections are properly formatted
                        const sections = clonedContent.querySelectorAll('.report-section');
                        sections.forEach(section => {
                            section.style.width = '100%';
                            section.style.maxWidth = '100%';
                            section.style.boxSizing = 'border-box';
                            section.style.pageBreakInside = 'avoid';
                        });
                        
                        // Format report header
                        const reportHeader = clonedContent.querySelector('.report-header');
                        if (reportHeader) {
                            reportHeader.style.width = '100%';
                            reportHeader.style.maxWidth = '100%';
                            reportHeader.style.boxSizing = 'border-box';
                        }
                        
                        // Format tables for professional appearance
                        const tables = clonedContent.querySelectorAll('table');
                        tables.forEach(table => {
                            table.style.width = '100%';
                            table.style.maxWidth = '100%';
                            table.style.tableLayout = 'auto';
                            table.style.wordWrap = 'break-word';
                            table.style.overflowWrap = 'break-word';
                        });
                        
                        // Format table cells
                        const cells = clonedContent.querySelectorAll('td, th');
                        cells.forEach(cell => {
                            cell.style.wordWrap = 'break-word';
                            cell.style.overflowWrap = 'break-word';
                            cell.style.whiteSpace = 'normal';
                        });
                        
                        // Format grids and cards
                        const grids = clonedContent.querySelectorAll('.summary-grid, .visualization-grid, .overview-content');
                        grids.forEach(grid => {
                            grid.style.width = '100%';
                            grid.style.maxWidth = '100%';
                            grid.style.boxSizing = 'border-box';
                        });
                        
                        // Format cards
                        const cards = clonedContent.querySelectorAll('.summary-card, .analysis-card, .recommendation-card, .viz-card, .overview-card');
                        cards.forEach(card => {
                            card.style.width = '100%';
                            card.style.maxWidth = '100%';
                            card.style.boxSizing = 'border-box';
                        });
                        
                        // Format charts and images
                        const charts = clonedContent.querySelectorAll('canvas, img');
                        charts.forEach(chart => {
                            chart.style.maxWidth = '100%';
                            chart.style.height = 'auto';
                            chart.style.boxSizing = 'border-box';
                        });
                        
                        // Ensure all text elements are visible and properly formatted
                        const allElements = clonedContent.querySelectorAll('*');
                        allElements.forEach(el => {
                            if (el.style.display === 'none') {
                                el.style.display = '';
                            }
                            if (el.style.visibility === 'hidden') {
                                el.style.visibility = 'visible';
                            }
                            if (el.style.opacity === '0') {
                                el.style.opacity = '1';
                            }
                            // Ensure text wrapping
                            if (el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'DIV' || 
                                el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' ||
                                el.tagName === 'H4' || el.tagName === 'H5' || el.tagName === 'H6' ||
                                el.tagName === 'LI' || el.tagName === 'TD' || el.tagName === 'TH') {
                                el.style.wordWrap = 'break-word';
                                el.style.overflowWrap = 'break-word';
                                el.style.whiteSpace = 'normal';
                            }
                        });
                    }
                },
                ignoreElements: function(element) {
                    // Explicitly ignore hidden elements that might cause blank space
                    return element.classList.contains('header') ||
                           element.id === 'loadingState' ||
                           element.classList.contains('print-only-hidden') ||
                           element.classList.contains('report-actions') ||
                           element.style.display === 'none' ||
                           element.style.visibility === 'hidden';
                }
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true,
                precision: 16,
                putOnlyUsedFonts: true
            },
            pagebreak: { 
                mode: ['css', 'legacy'],
                before: ['.report-section:not(:first-child)'], // Only break before sections after the first one
                avoid: [
                    '.report-header',              // Report header should stay together
                    '.report-section h2',          // Section headers
                    'h2 + *',                      // Content after section headers
                    '.summary-grid',               // Summary cards
                    '.summary-card',               // Individual summary cards
                    '.breakdown-content',          // Breakdown container
                    '.breakdown-intro',            // Breakdown intro
                    '.breakdown-table-container',  // Table containers
                    '.breakdown-table-detailed',   // Tables
                    '.visualization-grid',         // Chart containers
                    '.viz-card',                   // Individual charts
                    '.analysis-content',           // Analysis container
                    '.analysis-card',              // Analysis cards
                    '.recommendations-content',    // Recommendations container
                    '.recommendation-card',        // Recommendation cards
                    '.methodology-content',        // Methodology container
                    '.methodology-section',        // Methodology sections
                    '.overview-content',           // Overview content
                    '.overview-card',              // Overview cards
                    'table',                       // All tables
                    'canvas',                      // All charts
                    'img',                         // All images
                    '.report-footer'               // Footer
                ]
            }
        };
            
        html2pdf().set(opt).from(reportContent).save().then(() => {
                console.log('✅ PDF generated successfully');
                
                // Dispatch notification event
                const locationName = (window.reportGenerator?.locationData?.name || 
                                    window.reportGenerator?.locationData?.location_name || 
                                    'Area Report');
                document.dispatchEvent(new CustomEvent('reportDownloaded', {
                    detail: {
                        id: Date.now(),
                        type: locationName,
                        format: 'pdf'
                    }
                }));
                
                // Also show notification directly if system is available
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification(
                        '📥 Report Downloaded',
                        'success',
                        `${locationName} (PDF) has been downloaded successfully`,
                        4000
                    );
                }
                
                finalize();
            }).catch(err => {
                console.error('❌ PDF generation error:', err);
                alert('PDF generation failed. Please try again or use the print function.');
                finalize();
            });
        } else {
            // Fallback: Print dialog (same formatting as PDF)
            console.warn('⚠️ html2pdf not available, using print dialog');
            window.print();
            // Restore buttons after print dialog closes
            setTimeout(() => {
                finalize();
            }, 1000);
        }
    }
}

// Initialize when DOM is ready and scripts are loaded
function initializeReportGenerator() {
    // Wait for required dependencies
    if (typeof DynamicPovertyCalculator === 'undefined') {
        console.log('⏳ Waiting for DynamicPovertyCalculator...');
        setTimeout(initializeReportGenerator, 500);
        return;
    }

    // Initialize the report generator
    try {
        window.reportGenerator = new AreaReportGenerator();
    } catch (error) {
        console.error('❌ Error initializing report generator:', error);
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="color: #dc3545;">⚠️ Initialization Error</h2>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                        🔄 Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReportGenerator);
} else {
    // DOM already ready
    initializeReportGenerator();
}

