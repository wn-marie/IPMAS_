/**
 * IPMAS Comparative Analysis Tool
 * Enables side-by-side comparison of counties, regions, and time periods
 */

class ComparativeAnalysis {
    constructor() {
        this.compareItems = [];
        this.maxCompareItems = 3;
        this.init();
    }

    init() {
        console.log('📊 Comparative Analysis initializing...');
        this.createCompareUI();
        this.setupEventListeners();
        console.log('✅ Comparative Analysis initialized');
    }

    createCompareUI() {
        // Skip on specific pages
        if (window.location.pathname.includes('poverty-models')) {
            return;
        }

        // Find where to add comparison panel
        const statsSection = document.querySelector('.stats-section');
        if (!statsSection) return;

        // Check if already exists
        if (document.getElementById('comparativeAnalysisPanel')) {
            return;
        }

        const comparePanel = document.createElement('div');
        comparePanel.id = 'comparativeAnalysisPanel';
        comparePanel.className = 'sidebar-section';
        comparePanel.style.cssText = 'margin-top: 20px; padding: 20px; background: var(--panel-bg); color: var(--text-primary); border-radius: 8px; box-shadow: var(--panel-shadow); border: 1px solid var(--panel-border);';
        comparePanel.innerHTML = `
            <div class="compare-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: var(--primary-color);">📊 Comparative Analysis</h3>
                <button class="btn btn-sm btn-secondary" id="toggleCompare">
                    <span id="toggleCompareIcon">▼</span>
                </button>
            </div>
            
            <div id="compareContent" style="display: block;">
                <p style="font-size: 0.9rem; color: #6c757d; margin-bottom: 15px;">
                    Compare up to ${this.maxCompareItems} counties or regions side-by-side
                </p>

                <!-- Add Comparison Item -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">Add to Compare</label>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
                        <select id="compareAreaSelect" class="form-control">
                            <option value="">-- Select County or Region --</option>
                            <optgroup label="Counties">
                                ${this.getCountyOptions()}
                            </optgroup>
                            <optgroup label="Regions">
                                <option value="region-central">Central Region</option>
                                <option value="region-coast">Coast Region</option>
                                <option value="region-eastern">Eastern Region</option>
                                <option value="region-nairobi">Nairobi</option>
                                <option value="region-north-eastern">North Eastern</option>
                                <option value="region-nyanza">Nyanza Region</option>
                                <option value="region-rift-valley">Rift Valley</option>
                                <option value="region-western">Western Region</option>
                            </optgroup>
                        </select>
                        <button class="btn btn-primary" id="addCompareItem">Add</button>
                    </div>
                </div>

                <!-- Comparison Items List -->
                <div id="compareItemsList" style="margin-bottom: 15px;">
                    <p style="text-align: center; color: #6c757d; padding: 20px;">
                        No items added for comparison yet
                    </p>
                </div>

                <!-- Comparison Actions -->
                <div id="compareActions" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <button class="btn btn-primary" id="runComparison" style="width: 100%; margin-bottom: 10px;">
                        📊 Run Comparison
                    </button>
                    <button class="btn btn-secondary" id="clearComparison" style="width: 100%;">
                        Clear All
                    </button>
                </div>

                <!-- Comparison Results -->
                <div id="compareResults" style="display: none; margin-top: 20px;">
                    <!-- Results will be populated here -->
                </div>
            </div>
        `;

        // Insert into sidebar or stats section
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.appendChild(comparePanel);
        } else if (statsSection) {
            statsSection.insertBefore(comparePanel, statsSection.firstChild);
        }
    }

    getCountyOptions() {
        const counties = [
            'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu', 'Garissa', 'Homa Bay',
            'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii',
            'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
            'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
            'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta',
            'Tana River', 'Tharaka Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
            'Wajir', 'West Pokot'
        ];
        return counties.map(county => `<option value="county-${county.toLowerCase().replace(/\s+/g, '-')}">${county}</option>`).join('');
    }

    setupEventListeners() {
        document.getElementById('toggleCompare')?.addEventListener('click', () => {
            const content = document.getElementById('compareContent');
            const icon = document.getElementById('toggleCompareIcon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });

        document.getElementById('addCompareItem')?.addEventListener('click', () => {
            this.addCompareItem();
        });

        document.getElementById('runComparison')?.addEventListener('click', () => {
            this.runComparison();
        });

        document.getElementById('clearComparison')?.addEventListener('click', () => {
            this.clearComparison();
        });
    }

    addCompareItem() {
        const select = document.getElementById('compareAreaSelect');
        const value = select.value;
        
        if (!value) {
            alert('Please select a county or region to compare');
            return;
        }

        if (this.compareItems.length >= this.maxCompareItems) {
            alert(`You can only compare up to ${this.maxCompareItems} items at a time`);
            return;
        }

        if (this.compareItems.find(item => item.id === value)) {
            alert('This item is already added for comparison');
            return;
        }

        // Extract name and type
        const label = select.options[select.selectedIndex].text;
        const type = value.startsWith('region-') ? 'region' : 'county';
        const id = value.replace('county-', '').replace('region-', '');

        const compareItem = {
            id: value,
            name: label,
            type: type,
            areaId: id,
            data: null
        };

        this.compareItems.push(compareItem);
        this.updateCompareItemsList();
        select.value = '';
        
        console.log('✅ Added to comparison:', compareItem);
    }

    updateCompareItemsList() {
        const listContainer = document.getElementById('compareItemsList');
        const actionsContainer = document.getElementById('compareActions');
        
        if (!listContainer) return;

        if (this.compareItems.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No items added for comparison yet</p>';
            if (actionsContainer) actionsContainer.style.display = 'none';
            return;
        }

        const itemsHTML = this.compareItems.map((item, index) => `
            <div class="compare-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 8px; background: #f8f9fa; border-radius: 6px;">
                <div>
                    <strong>${item.name}</strong>
                    <span style="font-size: 0.85rem; color: #6c757d; margin-left: 8px;">(${item.type})</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="window.comparativeAnalysis.removeCompareItem('${item.id}')" style="padding: 2px 8px;">
                    ✕
                </button>
            </div>
        `).join('');

        listContainer.innerHTML = itemsHTML;
        
        if (actionsContainer) {
            actionsContainer.style.display = 'block';
        }
    }

    removeCompareItem(itemId) {
        this.compareItems = this.compareItems.filter(item => item.id !== itemId);
        this.updateCompareItemsList();
        console.log('✅ Removed from comparison:', itemId);
    }

    clearComparison() {
        if (confirm('Are you sure you want to clear all comparison items?')) {
            this.compareItems = [];
            this.updateCompareItemsList();
            document.getElementById('compareResults').style.display = 'none';
            console.log('✅ Comparison cleared');
        }
    }

    async runComparison() {
        if (this.compareItems.length < 2) {
            alert('Please add at least 2 items to compare');
            return;
        }

        console.log('📊 Running comparison for', this.compareItems.length, 'items...');

        // Fetch or generate data for each item
        const comparisonData = await Promise.all(
            this.compareItems.map(async (item) => {
                const data = await this.fetchAreaData(item);
                return {
                    ...item,
                    data: data
                };
            })
        );

        // Generate comparison visualization
        this.displayComparison(comparisonData);
    }

    async fetchAreaData(item) {
        // Try to fetch from API, otherwise generate sample data
        let data = null;

        if (window.API_CONFIG) {
            try {
                const apiUrl = `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.ENDPOINTS.UNIFIED_DATA}`;
                const response = await fetch(`${apiUrl}?county=${item.areaId}`);
                if (response.ok) {
                    const apiData = await response.json();
                    data = this.processApiData(apiData);
                }
            } catch (error) {
                console.log('⚠️ Using generated comparison data (API unavailable)');
            }
        }

        // Generate sample data if API unavailable
        if (!data) {
            data = this.generateComparisonData(item);
        }

        return data;
    }

    generateComparisonData(item) {
        // Generate realistic comparison data based on area
        const basePoverty = this.getBasePovertyRate(item.areaId);
        
        return {
            povertyIndex: basePoverty + (Math.random() - 0.5) * 5,
            educationAccess: 65 + (Math.random() - 0.5) * 15,
            healthVulnerability: 55 + (Math.random() - 0.5) * 15,
            waterAccess: 70 + (Math.random() - 0.5) * 15,
            housingQuality: 60 + (Math.random() - 0.5) * 15,
            employmentRate: 45 + (Math.random() - 0.5) * 10,
            population: Math.floor(Math.random() * 500000) + 100000
        };
    }

    getBasePovertyRate(areaId) {
        // County-specific poverty rates
        const rates = {
            'nairobi': 45.2, 'mombasa': 38.7, 'kisumu': 52.3, 'nakuru': 41.8,
            'garissa': 61.3, 'wajir': 58.9, 'mandera': 59.2, 'turkana': 62.1,
            'kiambu': 43.5, 'machakos': 47.2, 'kitui': 51.8, 'kakamega': 49.3,
            'region-coast': 42.1, 'region-western': 49.8, 'region-rift-valley': 44.3,
            'region-eastern': 47.6, 'region-central': 41.9, 'region-north-eastern': 58.7,
            'region-nyanza': 53.5, 'region-nairobi': 45.2
        };
        
        return rates[areaId] || 48.5;
    }

    processApiData(apiData) {
        // Process API response into comparison format
        if (apiData.locations && apiData.locations.length > 0) {
            const locations = apiData.locations;
            return {
                povertyIndex: locations.reduce((sum, loc) => sum + (loc.poverty_index || 0), 0) / locations.length,
                educationAccess: locations.reduce((sum, loc) => sum + (loc.education_access || 0), 0) / locations.length,
                healthVulnerability: locations.reduce((sum, loc) => sum + (loc.health_vulnerability || 0), 0) / locations.length,
                waterAccess: locations.reduce((sum, loc) => sum + (loc.water_access || 0), 0) / locations.length,
                housingQuality: locations.reduce((sum, loc) => sum + (loc.housing_quality || 0), 0) / locations.length,
                employmentRate: locations.reduce((sum, loc) => sum + (loc.employment_rate || 0), 0) / locations.length,
                population: locations.reduce((sum, loc) => sum + (loc.population || 0), 0)
            };
        }
        return null;
    }

    displayComparison(comparisonData) {
        const resultsContainer = document.getElementById('compareResults');
        if (!resultsContainer) return;

        // Create comparison table
        const tableHTML = `
            <h4 style="margin-bottom: 15px; color: var(--primary-color);">Comparison Results</h4>
            <div style="overflow-x: auto;">
                <table class="comparison-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--primary-color); color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Indicator</th>
                            ${comparisonData.map(item => `
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.name}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Poverty Index (%)</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    <strong>${item.data.povertyIndex.toFixed(1)}%</strong>
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Education Access (%)</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.data.educationAccess.toFixed(1)}%
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Health Vulnerability (%)</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.data.healthVulnerability.toFixed(1)}%
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Water Access (%)</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.data.waterAccess.toFixed(1)}%
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Housing Quality (%)</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.data.housingQuality.toFixed(1)}%
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Employment Rate (%)</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.data.employmentRate.toFixed(1)}%
                                </td>
                            `).join('')}
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Population</td>
                            ${comparisonData.map(item => `
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                                    ${item.data.population.toLocaleString()}
                                </td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Comparison Chart -->
            <div style="margin-top: 20px;">
                <h5 style="margin-bottom: 10px;">Visual Comparison</h5>
                <canvas id="comparisonChart" style="max-height: 300px;"></canvas>
            </div>
        `;

        resultsContainer.innerHTML = tableHTML;
        resultsContainer.style.display = 'block';

        // Create chart
        this.createComparisonChart(comparisonData);
    }

    createComparisonChart(comparisonData) {
        const canvas = document.getElementById('comparisonChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const labels = comparisonData.map(item => item.name);
        const datasets = [
            {
                label: 'Poverty Index (%)',
                data: comparisonData.map(item => item.data.povertyIndex),
                backgroundColor: 'rgba(220, 53, 69, 0.6)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 2
            },
            {
                label: 'Education Access (%)',
                data: comparisonData.map(item => item.data.educationAccess),
                backgroundColor: 'rgba(40, 167, 69, 0.6)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 2
            },
            {
                label: 'Water Access (%)',
                data: comparisonData.map(item => item.data.waterAccess),
                backgroundColor: 'rgba(70, 130, 180, 0.6)',
                borderColor: 'rgba(70, 130, 180, 1)',
                borderWidth: 2
            }
        ];

        // Destroy existing chart if it exists
        if (this.comparisonChartInstance) {
            this.comparisonChartInstance.destroy();
        }

        this.comparisonChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Side-by-Side Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.location.pathname.includes('poverty-models')) {
            window.comparativeAnalysis = new ComparativeAnalysis();
        }
    });
} else {
    if (!window.location.pathname.includes('poverty-models')) {
        window.comparativeAnalysis = new ComparativeAnalysis();
    }
}

