/**
 * IPMAS - Integrated Poverty Mapping & Analysis System
 * Main Client-Side JavaScript
 */

class IPMASApp {
    constructor() {
        this.map = null; // Main map instance (if any, for other pages)
        this.dashboardMap = null; // Specific map instance for the dashboard
        this.socket = null;
        this.charts = {};
        this.currentLocation = null;
        this.userLocationMarker = null; // Marker for user's current location
        this.userLocationCircle = null; // Circle showing 2km radius around user location
        this.isConnected = false;
        this.debugMode = false;
        this.selectedIndicators = ['poverty_index']; // Default selected indicators
        this.povertyCalculator = null;
        this.dynamicCalculator = null; // Dynamic poverty calculator instance
        this.processedLocations = []; // Store API fetched locations
        this.userProfile = null;
        this.userPreferences = {
            language: 'en',
            timezone: 'Africa/Nairobi',
            dateFormat: 'DD/MM/YYYY',
            mapStyle: 'default',
            autoRefresh: 0
        };
        this.mapStyleLayer = null;
        this.pendingMapStyle = null;
        
        // Real-time functionality
        this.isRealtimeEnabled = false;
        this.realtimeInterval = null;
        this.refreshInterval = 30000; // 30 seconds default
        this.povertyLayer = null;
        this.dataEndpoint = '/api/v1/analytics/poverty/all'; // Use new endpoint for all poverty data

        // Expose dashboard helper globally for fallback report opening
        window.getActiveLayersForDashboard = this.getActiveLayersForDashboard.bind(this);
        
        // Global search functionality
        this.searchMarker = null;
        this.searchResults = [];
        this.geocodingEndpoint = '/api/v1/analytics/geocoding/search';
        
        // Location focus for dashboard
        this.focusCircle = null;
        this.hasUserSelectedArea = false;
        
        // Global connection status object (shared across pages)
        window.connectionStatus = {
            mode: 'offline',
            label: 'Offline Mode',
            reasonCode: 'init',
            reasonMessage: 'Initializing...',
            lastChecked: null
        };

        this.init();
    }

    /**
     * Get active layers from dashboard toggles (fallback for opening report when openFullReport is unavailable)
     */
    getActiveLayersForDashboard() {
        const layerCheckboxes = {
            poverty_index: document.getElementById('povertyLayer')?.checked,
            education_access: document.getElementById('educationLayer')?.checked,
            health_vulnerability: document.getElementById('healthLayer')?.checked,
            water_access: document.getElementById('waterLayer')?.checked,
            housing_quality: document.getElementById('shelterLayer')?.checked
        };

        const active = Object.entries(layerCheckboxes)
            .filter(([, checked]) => !!checked)
            .map(([name]) => name);

        return active.length > 0 ? active : ['poverty_index'];
    }
    async init() {
        try {
            this.applyStoredUserProfile();
            this.showLoading(true);
            
            // Initialize connection status
            this.updateConnectionStatus('offline', 'Offline Mode', {
                code: 'init',
                message: 'Initializing system...'
            });
            
            // Initialize core components first (don't require socket connection)
            await this.initializeCharts();
            await this.initializeDashboardMap();
            
            // ============================================
            // Clear any existing markers immediately after map initialization
            // This ensures map starts blank (no training data visible)
            // ============================================
            if (this.dashboardMap) {
                setTimeout(() => {
                    this.dashboardMap.eachLayer((layer) => {
                        // Remove CircleMarkers, Markers, and Circles (but keep base tile layers)
                        if ((layer instanceof L.CircleMarker || layer instanceof L.Marker || (layer instanceof L.Circle && !(layer instanceof L.TileLayer))) &&
                            (!layer.options || !layer.options.isSearchMarker)) {
                            try {
                                this.dashboardMap.removeLayer(layer);
                            } catch (e) {
                                // Ignore errors if layer already removed
                            }
                        }
                    });
                    // Clear all layer groups
                    if (this.dashboardMapLayers) {
                        Object.values(this.dashboardMapLayers).forEach(layerGroup => {
                            layerGroup.clearLayers();
                        });
                    }
                }, 300);
            }
            // ============================================
            
            this.initializeDynamicCalculator(); // Initialize dynamic poverty calculator
            this.setupEventListeners();
            this.loadSampleData();
            
            // Listen for advanced filter changes
            document.addEventListener('filtersChanged', (e) => {
                if (e.detail && e.detail.filteredData) {
                    this.applyAdvancedFilters(e.detail.filteredData, e.detail.filters);
                }
            });
            
            // Try to connect to socket, but don't fail if it doesn't work
            try {
                await this.initializeSocket();
            } catch (socketError) {
                console.log('ℹ️ Socket.IO not available - using polling mode for real-time updates');
                this.updateConnectionStatus('offline', 'Offline Mode', {
                    code: 'socket_unavailable',
                    message: socketError?.message || 'Realtime channel not available'
                });
            }
            
            this.showLoading(false);
            
            console.log('🌍 IPMAS System initialized successfully');
            this.debug('System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize IPMAS:', error);
            console.error('Error details:', error.message, error.stack);
            this.showError(`Failed to initialize system: ${error.message}`);
            this.showLoading(false);
            this.updateConnectionStatus('offline', 'Offline Mode', {
                code: 'init_error',
                message: error?.message || 'Initialization error'
            });
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        console.error(message);
        alert(`Error: ${message}`);
    }

    debug(message) {
        if (this.debugMode) {
            const debugContent = document.getElementById('debugContent');
            if (debugContent) {
                const timestamp = new Date().toLocaleTimeString();
                debugContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
                debugContent.scrollTop = debugContent.scrollHeight;
            }
        }
    }

    async initializeSocket() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Socket.IO is available
                if (typeof io === 'undefined') {
                    reject(new Error('Socket.IO library not available - using polling mode'));
                    return;
                }

                // Get Socket.IO URL from config
                const socketUrl = window.API_CONFIG?.getSocketUrl?.() || window.API_CONFIG?.SOCKET_URL || 'http://localhost:3001';
                
                console.log(`🔌 Connecting to Socket.IO server at: ${socketUrl}`);
                
                this.socket = io(socketUrl, {
                    timeout: 5000,
                    forceNew: true,
                    transports: ['websocket', 'polling'] // Try WebSocket first, fallback to polling
                });
                
                this.socket.on('connect', () => {
                    this.isConnected = true;
                    console.log('✅ Socket.IO connected successfully');
                    console.log(`   Socket ID: ${this.socket.id}`);
                    console.log(`   Server URL: ${socketUrl}`);
                    this.updateConnectionStatus('online', 'Online', {
                        code: 'socket_connected',
                        message: 'Realtime channel connected'
                    });
                    this.debug('Socket connected');
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    this.isConnected = false;
                    console.log('⚠️ Socket.IO disconnected');
                    this.updateConnectionStatus('offline', 'Disconnected', {
                        code: 'socket_disconnected',
                        message: 'Realtime channel disconnected'
                    });
                    this.debug('Socket disconnected');
                });

                this.socket.on('connect_error', (error) => {
                    console.warn('Socket connection error:', error);
                    this.updateConnectionStatus('offline', 'Connection Error', {
                        code: 'socket_error',
                        message: error?.message || 'Socket connection error'
                    });
                    reject(new Error('Socket connection failed'));
                });

                this.socket.on('system-status', (data) => {
                    this.updateSystemStatus(data);
                });

                this.socket.on('location-data', (data) => {
                    this.handleLocationUpdate(data);
                });

                this.socket.on('filter-data', (data) => {
                    this.handleFilterUpdate(data);
                });

                this.socket.on('simulation-results', (data) => {
                    this.handleSimulationResults(data);
                });

                this.socket.on('chat-message', (data) => {
                    this.handleChatMessage(data);
                });

                // Listen for real-time poverty data updates
                this.socket.on('poverty-data-updated', (data) => {
                    console.log('📊 Real-time poverty data update received:', data);
                    this.handlePovertyDataUpdate(data);
                });

                this.socket.on('poverty-data-error', (error) => {
                    console.error('❌ Poverty data update error:', error);
                    this.showNotification('Failed to update poverty data: ' + error.error, 'error');
                });

                // ============================================
                // Real-time Data Enrichment Listeners
                // ============================================
                
                // Listen for enriched data
                this.socket.on('data-enriched', (data) => {
                    console.log('✅ Data enriched via Socket.IO:', data);
                    this.handleDataEnrichment(data);
                });

                // Listen for enrichment errors
                this.socket.on('data-enrichment-error', (error) => {
                    console.warn('⚠️ Data enrichment error:', error);
                    // Fallback to local heuristics or defaults
                });

                // Listen for fallback data stream
                this.socket.on('fallback-data-stream', (data) => {
                    console.log(`📊 Fallback data received (${data.fallback.index}/${data.fallback.total}):`, data);
                    this.handleFallbackData(data);
                });

                // Listen for fallback data errors
                this.socket.on('fallback-data-error', (error) => {
                    console.warn('⚠️ Fallback data error:', error);
                });

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Socket connection timeout'));
                    }
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });
    }

    async initializeMap() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Leaflet is available
                if (typeof L === 'undefined') {
                    console.log('ℹ️ Leaflet.js not available - skipping map initialization');
                    this.debug('Leaflet not loaded - running in non-map mode');
                    return; // Skip map initialization
                }

                // Check if map container exists
                const mapElement = document.getElementById('map');
                if (!mapElement) {
                    console.log('ℹ️ No map container found - skipping map initialization');
                    this.debug('No map container - running in non-map mode');
                    return; // Skip map initialization
                }

                console.log('🌍 Initializing map...');
                this.debug('Starting map initialization');

                // Initialize Leaflet map
                this.map = L.map('map').setView([-0.0236, 37.9062], 7); // Kenya center

                // Add OpenStreetMap tiles
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.map);

                // Add Kenya boundary (simplified)
                const kenyaBounds = [
                    [-4.7, 33.9],
                    [5.5, 41.9]
                ];
                this.map.setMaxBounds(kenyaBounds);
                this.map.setMinZoom(6);

                // Add click handler
                this.map.on('click', (e) => {
                    this.handleMapClick(e);
                });

                // Add map load event
                this.map.whenReady(() => {
                    console.log('✅ Map loaded successfully');
                    this.debug('Map initialized and ready');
                });

                this.debug('Map initialized');
                resolve();
            } catch (error) {
                console.error('❌ Map initialization failed:', error);
                this.debug(`Map initialization failed: ${error.message}`);
                reject(error);
            }
        });
    }

    async initializeCharts() {
        // Skip dashboard chart initialization on specific pages
        if (window.location.pathname.includes('poverty-models') || 
            window.location.pathname.includes('projects.html')) {
            console.log('ℹ️ Skipping dashboard charts - on poverty-models/projects page');
            return;
        }

        console.log('📊 Initializing dashboard charts with unified data...');
        
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available - skipping chart initialization');
            return;
        }

        // Use unified data source
        const chartData = this.getUnifiedVisualizationData();
        
        // Wait for DOM to be ready
        setTimeout(() => {
            this.createSAEChart(chartData);
            this.createConsumptionChart(chartData);
            this.createPredictionsChart(chartData);
            this.createImpactChart(chartData);
            
            console.log('✅ Dashboard charts initialized with unified data');
        }, 100);
    }

    // Unified data source for all visualizations
    getUnifiedVisualizationData() {
        // Prioritize processedLocations (from API) over sampleData
        if (this.processedLocations && this.processedLocations.length > 0) {
            return this.processDataForCharts(this.processedLocations);
        }
        
        // Fallback to sampleData if available
        if (typeof sampleData !== 'undefined' && sampleData.locations) {
            return this.processDataForCharts(sampleData.locations);
        }
        
        // Last resort: fallback data if nothing available
        return {
            countyData: {
                'Nairobi': { poverty_index: [45.2, 47.1, 43.8], education_access: [78.5, 79.2, 77.8] },
                'Mombasa': { poverty_index: [38.7, 40.1, 37.3], education_access: [71.2, 72.5, 69.9] },
                'Kisumu': { poverty_index: [52.3, 54.1, 50.5], education_access: [64.8, 66.2, 63.4] },
                'Nakuru': { poverty_index: [41.8, 43.2, 40.4], education_access: [69.7, 70.8, 68.6] },
                'Eldoret': { poverty_index: [39.5, 41.0, 38.0], education_access: [72.1, 73.4, 70.8] },
                'Meru': { poverty_index: [48.7, 50.2, 47.2], education_access: [66.4, 67.8, 65.0] }
            },
            severityCounts: { critical: 12, high: 18, moderate: 25, low: 15 },
            locations: [
                { poverty_index: 45.2, education_access: 78.5, health_vulnerability: 68.3 },
                { poverty_index: 38.7, education_access: 71.2, health_vulnerability: 74.5 },
                { poverty_index: 52.3, education_access: 64.8, health_vulnerability: 58.2 },
                { poverty_index: 41.8, education_access: 69.7, health_vulnerability: 66.1 },
                { poverty_index: 39.5, education_access: 72.1, health_vulnerability: 70.3 }
            ]
        };
    }

    processDataForCharts(locations) {
        const countyData = {};
        const severityCounts = { critical: 0, high: 0, moderate: 0, low: 0 };
        const timeSeriesData = [];
        
        locations.forEach(location => {
            // Group by county
            if (!countyData[location.county]) {
                countyData[location.county] = {
                    poverty_index: [],
                    education_access: [],
                    health_vulnerability: [],
                    water_access: [],
                    employment_rate: [],
                    housing_quality: []
                };
            }
            
            countyData[location.county].poverty_index.push(location.poverty_index);
            countyData[location.county].education_access.push(location.education_access);
            countyData[location.county].health_vulnerability.push(location.health_vulnerability);
            countyData[location.county].water_access.push(location.water_access);
            countyData[location.county].employment_rate.push(location.employment_rate);
            countyData[location.county].housing_quality.push(location.housing_quality);
            
            // Count by severity
            if (location.poverty_index >= 70) severityCounts.critical++;
            else if (location.poverty_index >= 50) severityCounts.high++;
            else if (location.poverty_index >= 30) severityCounts.moderate++;
            else severityCounts.low++;
            
            // Create time series data (simulate historical data)
            timeSeriesData.push({
                month: '2023-' + String(Math.floor(Math.random() * 12) + 1).padStart(2, '0'),
                poverty: location.poverty_index,
                education: location.education_access,
                health: location.health_vulnerability
            });
        });

        return {
            countyData,
            severityCounts,
            locations,
            timeSeriesData
        };
    }

    createSAEChart(data) {
        // Skip if on poverty-models page (it has its own charts)
        if (window.location.pathname.includes('poverty-models')) {
            return;
        }
        
        const canvas = document.getElementById('saeChart');
        if (!canvas) {
            console.warn('SAE chart canvas not found');
            return;
        }

        const counties = Object.keys(data.countyData);
        const avgPoverty = counties.map(county => {
            const values = data.countyData[county].poverty_index;
            if (!values || values.length === 0) return 0;
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        const ctx = canvas.getContext('2d');
        
        if (this.charts.saeChart) {
            this.charts.saeChart.destroy();
        }
        
        this.charts.saeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: counties.slice(0, 6),
                datasets: [{
                    label: 'SAE Poverty Estimates',
                    data: avgPoverty.slice(0, 6),
                    borderColor: 'rgba(46, 139, 87, 1)',
                    backgroundColor: 'rgba(46, 139, 87, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Poverty Index (%)'
                        }
                    }
                }
            }
        });
        
        console.log('SAE chart created successfully');
    }

    createConsumptionChart(data) {
        // Skip if on poverty-models page (it has its own charts)
        if (window.location.pathname.includes('poverty-models')) {
            return;
        }
        
        const canvas = document.getElementById('consumptionChart');
        if (!canvas) {
            console.warn('Consumption chart canvas not found');
            return;
        }

        const scatterData = data.locations.map(location => ({
            x: location.poverty_index,
            y: location.education_access
        }));

        const ctx = canvas.getContext('2d');
        
        if (this.charts.consumptionChart) {
            this.charts.consumptionChart.destroy();
        }
        
        this.charts.consumptionChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Consumption vs Education',
                    data: scatterData,
                    backgroundColor: 'rgba(70, 130, 180, 0.6)',
                    borderColor: 'rgba(70, 130, 180, 1)',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Poverty Index (%)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Education Access (%)'
                        }
                    }
                }
            }
        });
        
        console.log('Consumption chart created successfully');
    }

    createPredictionsChart(data) {
        const canvas = document.getElementById('predictionsChart');
        if (!canvas) {
            console.warn('Predictions chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        if (this.charts.predictionsChart) {
            this.charts.predictionsChart.destroy();
        }
        
        this.charts.predictionsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Critical', 'High', 'Moderate', 'Low'],
                datasets: [{
                    label: 'Predicted Poverty Distribution',
                    data: [
                        data.severityCounts.critical,
                        data.severityCounts.high,
                        data.severityCounts.moderate,
                        data.severityCounts.low
                    ],
                    backgroundColor: [
                        '#d73027',
                        '#fc8d59',
                        '#fee08b',
                        '#91cf60'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Locations'
                        }
                    }
                }
            }
        });
        
        console.log('Predictions chart created successfully');
    }

    createImpactChart(data) {
        const canvas = document.getElementById('impactChart');
        if (!canvas) {
            console.warn('Impact chart canvas not found');
            return;
        }

        const counties = Object.keys(data.countyData);
        const avgHealth = counties.map(county => {
            const values = data.countyData[county].health_vulnerability;
            if (!values || values.length === 0) return 0;
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        const ctx = canvas.getContext('2d');
        
        if (this.charts.impactChart) {
            this.charts.impactChart.destroy();
        }
        
        this.charts.impactChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: counties.slice(0, 4),
                datasets: [{
                    data: avgHealth.slice(0, 4),
                    backgroundColor: [
                        'rgba(220, 53, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(23, 162, 184, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        console.log('Impact chart created successfully');
    }

    generateInsights() {
        const insightType = document.getElementById('insightType')?.value || 'trends';
        const generateBtn = document.getElementById('generateInsights');
        
        if (!generateBtn) return;
        
        // Show loading state
        const originalText = generateBtn.textContent;
        generateBtn.textContent = '🔄 Generating...';
        generateBtn.disabled = true;
        
        console.log(`🤖 Generating ${insightType} insights...`);
        
        // Simulate AI processing time
        setTimeout(() => {
            try {
                this.processInsightType(insightType);
                this.showInsightSuccess(insightType);
            } catch (error) {
                console.error('Error generating insights:', error);
                this.showInsightError(error.message);
            } finally {
                // Reset button state
                generateBtn.textContent = originalText;
                generateBtn.disabled = false;
            }
        }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5 seconds
    }

    processInsightType(insightType) {
        switch (insightType) {
            case 'trends':
                this.generateTrendAnalysis();
                break;
            case 'predictions':
                this.generatePredictions();
                break;
            case 'recommendations':
                this.generateRecommendations();
                break;
            case 'comparisons':
                this.generateRegionalComparisons();
                break;
            default:
                throw new Error('Unknown insight type');
        }
    }

    generateTrendAnalysis() {
        console.log('📈 Generating trend analysis...');
        
        // Update charts with trend data
        if (this.charts.saeChart) {
            const trendData = this.generateTrendData();
            this.charts.saeChart.data.datasets[0].data = trendData.values;
            this.charts.saeChart.data.labels = trendData.labels;
            this.charts.saeChart.update();
        }
        
        // Update other charts with trend insights
        this.updateChartsWithTrends();
        
        console.log('✅ Trend analysis complete');
    }

    generatePredictions() {
        console.log('🔮 Generating predictions...');
        
        // Generate prediction data
        const predictionData = this.generatePredictionData();
        
        // Update prediction chart
        if (this.charts.predictionsChart) {
            this.charts.predictionsChart.data.datasets[0].data = predictionData.severityCounts;
            this.charts.predictionsChart.update();
        }
        
        // Update other charts with predictions
        this.updateChartsWithPredictions(predictionData);
        
        console.log('✅ Predictions generated');
    }

    generateRecommendations() {
        console.log('💡 Generating recommendations...');
        
        // Generate recommendation insights
        const recommendations = this.generateRecommendationData();
        
        // Update charts to show recommended interventions
        this.updateChartsWithRecommendations(recommendations);
        
        console.log('✅ Recommendations generated');
    }

    generateRegionalComparisons() {
        console.log('🗺️ Generating regional comparisons...');
        
        // Generate comparison data
        const comparisonData = this.generateComparisonData();
        
        // Update charts with regional data
        this.updateChartsWithComparisons(comparisonData);
        
        console.log('✅ Regional comparisons complete');
    }

    generateTrendData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const baseValues = [45, 47, 44, 46, 48, 45];
        
        return {
            labels: months,
            values: baseValues.map(val => val + (Math.random() - 0.5) * 10)
        };
    }

    generatePredictionData() {
        return {
            severityCounts: [
                Math.floor(Math.random() * 20) + 5,  // Critical
                Math.floor(Math.random() * 30) + 10, // High
                Math.floor(Math.random() * 40) + 15, // Moderate
                Math.floor(Math.random() * 25) + 8   // Low
            ]
        };
    }

    generateRecommendationData() {
        return {
            interventions: [
                { type: 'Education', priority: 'High', impact: 85 },
                { type: 'Healthcare', priority: 'Medium', impact: 72 },
                { type: 'Water Access', priority: 'High', impact: 78 },
                { type: 'Employment', priority: 'Medium', impact: 65 }
            ]
        };
    }

    generateComparisonData() {
        return {
            regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
            povertyRates: [42, 38, 52, 41],
            educationRates: [78, 72, 65, 70],
            healthRates: [68, 71, 58, 66]
        };
    }

    updateChartsWithTrends() {
        // Update consumption chart with trend data
        if (this.charts.consumptionChart) {
            const trendPoints = this.generateTrendScatterData();
            this.charts.consumptionChart.data.datasets[0].data = trendPoints;
            this.charts.consumptionChart.update();
        }
    }

    updateChartsWithPredictions(predictionData) {
        // Update impact chart with prediction insights
        if (this.charts.impactChart) {
            const impactData = predictionData.severityCounts.map(count => count * 1.2);
            this.charts.impactChart.data.datasets[0].data = impactData;
            this.charts.impactChart.update();
        }
    }

    updateChartsWithRecommendations(recommendations) {
        // Update SAE chart with recommendation priorities
        if (this.charts.saeChart) {
            const priorityData = recommendations.interventions.map(rec => rec.impact);
            this.charts.saeChart.data.datasets[0].data = priorityData;
            this.charts.saeChart.data.labels = recommendations.interventions.map(rec => rec.type);
            this.charts.saeChart.update();
        }
    }

    updateChartsWithComparisons(comparisonData) {
        // Update all charts with regional comparison data
        if (this.charts.saeChart) {
            this.charts.saeChart.data.datasets[0].data = comparisonData.povertyRates;
            this.charts.saeChart.data.labels = comparisonData.regions;
            this.charts.saeChart.update();
        }
        
        if (this.charts.consumptionChart) {
            const comparisonPoints = comparisonData.regions.map((region, index) => ({
                x: comparisonData.povertyRates[index],
                y: comparisonData.educationRates[index]
            }));
            this.charts.consumptionChart.data.datasets[0].data = comparisonPoints;
            this.charts.consumptionChart.update();
        }
    }

    generateTrendScatterData() {
        const points = [];
        for (let i = 0; i < 20; i++) {
            points.push({
                x: 30 + Math.random() * 40,
                y: 50 + Math.random() * 30
            });
        }
        return points;
    }

    showInsightSuccess(insightType) {
        const insightLabels = {
            'trends': 'Trend Analysis',
            'predictions': 'Predictions',
            'recommendations': 'Recommendations',
            'comparisons': 'Regional Comparisons'
        };
        
        this.showNotification(
            `✅ ${insightLabels[insightType]} generated successfully!`,
            'success'
        );
    }

    showInsightError(message) {
        this.showNotification(
            `❌ Error generating insights: ${message}`,
            'error'
        );
    }

    setupSelectedAreaAnalytics() {
        // Skip on specific pages that have their own analytics
        if (window.location.pathname.includes('poverty-models') || 
            window.location.pathname.includes('projects.html')) {
            return;
        }
        
        // Initialize selected area state
        this.selectedArea = null;
        this.selectedIndicators = new Set(['poverty', 'education', 'health']); // Default selected indicators
        
        // Setup refresh button - match actual HTML ID
        const refreshBtn = document.getElementById('refreshStatsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshSelectedAreaData();
            });
        }
        
        // Setup area selection (simulate clicking on map areas)
        this.setupAreaSelection();
        
        console.log('✅ Selected Area Analytics initialized');
    }

    setupIndicatorCheckboxes() {
        const indicators = ['poverty', 'education', 'health', 'shelter'];
        
        indicators.forEach(indicator => {
            const checkbox = document.getElementById(`${indicator}Select`);
            if (checkbox) {
                // Set initial state
                checkbox.checked = this.selectedIndicators.has(indicator);
                this.updateIndicatorCard(indicator, checkbox.checked);
                
                // Add event listener
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.selectedIndicators.add(indicator);
                    } else {
                        this.selectedIndicators.delete(indicator);
                    }
                    this.updateIndicatorCard(indicator, e.target.checked);
                    this.updateLayerVisibility();
                });
            }
        });
    }

    setupAreaSelection() {
        // Add area selection buttons to the stats section
        this.addAreaSelectionDemo();
    }

    addAreaSelectionDemo() {
        // Add comprehensive area selection to the stats section
        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            const areaSelector = document.createElement('div');
            areaSelector.className = 'area-selector';
            areaSelector.innerHTML = `
                <div class="area-selector-card">
                    <h5 class="area-selector-title">Select Analysis Area</h5>
                    
                    <div class="area-selector-group">
                        <label class="area-selector-label" for="countySelector">Counties:</label>
                        <select id="countySelector" class="area-selector-select">
                            <option value="">-- Select a County --</option>
                            <option value="baringo">Baringo</option>
                            <option value="bomet">Bomet</option>
                            <option value="bungoma">Bungoma</option>
                            <option value="busia">Busia</option>
                            <option value="elgeyo-marakwet">Elgeyo Marakwet</option>
                            <option value="embu">Embu</option>
                            <option value="garissa">Garissa</option>
                            <option value="homa-bay">Homa Bay</option>
                            <option value="isiolo">Isiolo</option>
                            <option value="kajiado">Kajiado</option>
                            <option value="kakamega">Kakamega</option>
                            <option value="kericho">Kericho</option>
                            <option value="kiambu">Kiambu</option>
                            <option value="kilifi">Kilifi</option>
                            <option value="kirinyaga">Kirinyaga</option>
                            <option value="kisii">Kisii</option>
                            <option value="kisumu">Kisumu</option>
                            <option value="kitui">Kitui</option>
                            <option value="kwale">Kwale</option>
                            <option value="laikipia">Laikipia</option>
                            <option value="lamu">Lamu</option>
                            <option value="machakos">Machakos</option>
                            <option value="makueni">Makueni</option>
                            <option value="mandera">Mandera</option>
                            <option value="marsabit">Marsabit</option>
                            <option value="meru">Meru</option>
                            <option value="migori">Migori</option>
                            <option value="mombasa">Mombasa</option>
                            <option value="muranga">Murang'a</option>
                            <option value="nairobi">Nairobi</option>
                            <option value="nakuru">Nakuru</option>
                            <option value="nandi">Nandi</option>
                            <option value="narok">Narok</option>
                            <option value="nyamira">Nyamira</option>
                            <option value="nyandarua">Nyandarua</option>
                            <option value="nyeri">Nyeri</option>
                            <option value="samburu">Samburu</option>
                            <option value="siaya">Siaya</option>
                            <option value="taita-taveta">Taita Taveta</option>
                            <option value="tana-river">Tana River</option>
                            <option value="tharaka-nithi">Tharaka Nithi</option>
                            <option value="trans-nzoia">Trans Nzoia</option>
                            <option value="turkana">Turkana</option>
                            <option value="uasin-gishu">Uasin Gishu</option>
                            <option value="vihiga">Vihiga</option>
                            <option value="wajir">Wajir</option>
                            <option value="west-pokot">West Pokot</option>
                        </select>
                    </div>
                    
                    <div class="area-selector-group">
                        <label class="area-selector-label" for="regionSelector">Regions:</label>
                        <select id="regionSelector" class="area-selector-select">
                            <option value="">-- Select a Region --</option>
                            <option value="central">Central Region</option>
                            <option value="coast">Coast Region</option>
                            <option value="eastern">Eastern Region</option>
                            <option value="nairobi">Nairobi</option>
                            <option value="north-eastern">North Eastern</option>
                            <option value="nyanza">Nyanza Region</option>
                            <option value="rift-valley">Rift Valley</option>
                            <option value="western">Western Region</option>
                        </select>
                    </div>
                    
                    <div class="area-selector-group">
                        <label class="area-selector-label" for="specialAreaSelector">Special Areas:</label>
                        <select id="specialAreaSelector" class="area-selector-select">
                            <option value="">-- Select a Special Area --</option>
                            <option value="arid">Arid Lands</option>
                            <option value="border">Border Areas</option>
                            <option value="rural">Rural Areas</option>
                            <option value="slums">Urban Slums</option>
                        </select>
                    </div>
                    
                    <div class="area-selector-note">
                        <strong>Note:</strong> In production, this would integrate with interactive maps and administrative boundaries.
                    </div>
                </div>
            `;
            
            // Insert after the stats header
            const statsHeader = statsSection.querySelector('.stats-header');
            if (statsHeader) {
                statsSection.insertBefore(areaSelector, statsHeader.nextSibling);
            }
            
            // Add event listener to county dropdown
            const countySelector = areaSelector.querySelector('#countySelector');
            if (countySelector) {
                countySelector.addEventListener('change', (e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue) {
                        this.selectArea(selectedValue, 'county');
                    }
                });
            }
            
            // Add event listener to region dropdown
            const regionSelector = areaSelector.querySelector('#regionSelector');
            if (regionSelector) {
                regionSelector.addEventListener('change', (e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue) {
                        this.selectArea(selectedValue, 'region');
                    }
                });
            }
            
            // Add event listener to special area dropdown
            const specialAreaSelector = areaSelector.querySelector('#specialAreaSelector');
            if (specialAreaSelector) {
                specialAreaSelector.addEventListener('change', (e) => {
                    const selectedValue = e.target.value;
                    if (selectedValue) {
                        this.selectArea(selectedValue, 'special');
                    }
                });
            }
        }
    }

    selectArea(areaName, areaType = 'county') {
        console.log(`📍 Selecting ${areaType}: ${areaName}`);
        
        // Update selected area
        this.selectedArea = { name: areaName, type: areaType };
        this.hasUserSelectedArea = true;
        
        // Generate area-specific data based on type
        const areaData = this.generateAreaData(areaName, areaType);
        
        // Update indicator cards with new data
        this.updateIndicatorCards(areaData);
        
        // Update last updated timestamp
        this.updateLastUpdated();
        
        // Show selection feedback
        this.showAreaSelectionFeedback(areaName, areaType);
        
        console.log(`✅ ${areaType} ${areaName} selected with data:`, areaData);
    }

    showAreaSelectionFeedback(areaName, areaType) {
        const typeLabels = {
            county: 'County',
            region: 'Region',
            special: 'Special Area'
        };

        const formattedType = typeLabels[areaType] || 'Area';
        const formattedName = (areaName || 'Unknown')
            .toString()
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());

        this.showNotification(`Analytics updated for ${formattedType}: ${formattedName}`, 'info', 3500);
    }

    showNotification(message, type = 'info', duration = 4000) {
        if (!document || !document.body) {
            document.addEventListener('DOMContentLoaded', () => {
                this.showNotification(message, type, duration);
            }, { once: true });
            return;
        }

        const containerId = 'dashboardNotificationContainer';
        let container = document.getElementById(containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 340px;
                max-height: 400px;
                overflow-y: auto;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const palette = {
            info: { bg: '#3182CE', icon: 'ℹ️' },
            success: { bg: '#2F855A', icon: '✅' },
            warning: { bg: '#D69E2E', icon: '⚠️' },
            error: { bg: '#E53E3E', icon: '❌' }
        };

        const { bg, icon } = palette[type] || palette.info;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${bg};
            color: #fff;
            padding: 14px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            pointer-events: auto;
            cursor: pointer;
            opacity: 0;
            transform: translateY(-6px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;

        notification.innerHTML = `
            <span style="font-size: 1.2rem;">${icon}</span>
            <div style="flex: 1; font-size: 0.95rem; line-height: 1.35;">
                ${message}
            </div>
        `;

        container.appendChild(notification);

        // Enforce a reasonable limit
        const maxNotifications = 4;
        while (container.children.length > maxNotifications) {
            container.removeChild(container.firstChild);
        }

        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        const removeNotification = () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-6px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 200);
        };

        notification.addEventListener('click', removeNotification);
        setTimeout(removeNotification, duration);
    }

    generateAreaData(areaInput, areaType) {
        // Support callers passing either (name, type) or a selectedArea object
        let areaName = areaInput;
        let resolvedType = areaType;

        if (typeof areaInput === 'object' && areaInput !== null) {
            areaName = areaInput.name;
            resolvedType = areaInput.type;
        }

        // When no user-supplied metrics are available, default to zeroed indicators.
        // This ensures dashboards show 0% until real data is captured for the area.
        const zeroMetrics = { poverty: 0, education: 0, health: 0, shelter: 0 };

        // If we ever start persisting actual metrics, prefer them over the zero defaults.
        if (this.areaMetrics && resolvedType && areaName) {
            const savedType = this.areaMetrics[resolvedType];
            if (savedType && savedType[areaName]) {
                const stored = savedType[areaName];
                return {
                    poverty: Number(stored.poverty) || 0,
                    education: Number(stored.education) || 0,
                    health: Number(stored.health) || 0,
                    shelter: Number(stored.shelter) || 0
                };
            }
        }

        if (areaName) {
            return this.generateDeterministicAreaMetrics(areaName, resolvedType);
        }

        return zeroMetrics;
    }

    calculateStringHash(value) {
        if (!value) return 0;
        let hash = 0;
        const str = value.toString().toLowerCase();
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    normalizeMetric(hash, min, max, offset = 0) {
        const span = max - min;
        const normalized = (Math.sin(hash + offset) + 1) / 2; // 0 to 1
        return parseFloat((min + normalized * span).toFixed(1));
    }

    generateDeterministicAreaMetrics(areaName, areaType) {
        const zeroMetrics = { poverty: 0, education: 0, health: 0, shelter: 0 };
        if (!areaName) return zeroMetrics;

        const hash = this.calculateStringHash(`${areaType || 'generic'}:${areaName}`);

        return {
            poverty: this.normalizeMetric(hash, 25, 75, 0),
            education: this.normalizeMetric(hash, 40, 92, Math.PI / 4),
            health: this.normalizeMetric(hash, 35, 88, Math.PI / 2),
            shelter: this.normalizeMetric(hash, 30, 85, (3 * Math.PI) / 4)
        };
    }

    updateIndicatorCards(areaData) {
        const indicators = [
            { id: 'povertyMetric', label: 'Poverty Index', value: areaData.poverty },
            { id: 'educationMetric', label: 'Education Access', value: areaData.education },
            { id: 'healthMetric', label: 'Health Vulnerability', value: areaData.health },
            { id: 'shelterMetric', label: 'Shelter Quality Index', value: areaData.shelter }
        ];
        
        indicators.forEach(indicator => {
            const valueElement = document.getElementById(indicator.id);
            if (valueElement) {
                valueElement.textContent = indicator.value.toFixed(1);
            }
        });
    }

    updateIndicatorCard(indicator, isSelected) {
        const card = document.getElementById(`${indicator}Card`);
        if (card) {
            if (isSelected) {
                card.style.borderColor = 'var(--primary-color)';
                card.style.backgroundColor = '#f0fff4';
            } else {
                card.style.borderColor = '#e9ecef';
                card.style.backgroundColor = 'white';
            }
        }
    }

    updateLayerVisibility() {
        // Update map layers based on selected indicators
        console.log('🔄 Updating layer visibility for indicators:', Array.from(this.selectedIndicators));
        
        // In a real implementation, this would update the map layers
        // For now, we'll just log the changes
        this.selectedIndicators.forEach(indicator => {
            console.log(`✅ ${indicator} layer is active`);
        });
    }

    refreshSelectedAreaData() {
        if (!this.selectedArea) {
            this.showNotification('Please select an area first', 'warning');
            return;
        }
        
        console.log(`🔄 Refreshing data for area: ${this.selectedArea}`);
        
        // Show loading state
        const refreshBtn = document.getElementById('refreshStatsBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.textContent;
            refreshBtn.textContent = '🔄 Refreshing...';
            refreshBtn.disabled = true;
            
            // Simulate data refresh
            setTimeout(() => {
                const areaData = this.generateAreaData(this.selectedArea);
                this.updateIndicatorCards(areaData);
                this.updateLastUpdated();
                
                refreshBtn.textContent = originalText;
                refreshBtn.disabled = false;
                
                this.showNotification('Area data refreshed successfully', 'success');
            }, 1000);
        }
    }

    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            lastUpdatedElement.textContent = timeString;
        }
    }

    syncWithPovertyMap() {
        // Store reference to dashboard app for poverty map to access
        window.dashboardApp = this;
        
        // Listen for data updates from poverty map
        window.addEventListener('povertyMapDataUpdate', (event) => {
            console.log('📊 Received data update from poverty map');
            this.updateDashboardCharts();
        });
        
        console.log('✅ Dashboard synced with poverty map');
    }

    // Method to trigger data sync
    triggerDataSync() {
        // Update dashboard charts
        this.updateDashboardCharts();
        
        // Notify poverty map if it exists
        if (window.povertyMapSystem) {
            window.povertyMapSystem.updateChartsFromDashboard();
        }
        
        console.log('🔄 Data sync triggered');
    }

    // Update dashboard charts with unified data
    updateDashboardCharts() {
        const chartData = this.getUnifiedVisualizationData();
        
        // Update SAE Chart (County Comparison)
        if (this.charts.saeChart) {
            const counties = Object.keys(chartData.countyData);
            const avgPoverty = counties.map(county => {
                const values = chartData.countyData[county].poverty_index;
                return values.reduce((sum, val) => sum + val, 0) / values.length;
            });
            
            this.charts.saeChart.data.labels = counties.slice(0, 6);
            this.charts.saeChart.data.datasets[0].data = avgPoverty.slice(0, 6);
            this.charts.saeChart.update();
        }
        
        // Update Consumption Chart (Poverty vs Education Correlation)
        if (this.charts.consumptionChart) {
            const scatterData = chartData.locations.map(location => ({
                x: location.poverty_index,
                y: location.education_access
            }));
            
            this.charts.consumptionChart.data.datasets[0].data = scatterData;
            this.charts.consumptionChart.update();
        }
        
        // Update Predictions Chart (Severity Distribution)
        if (this.charts.predictionsChart) {
            this.charts.predictionsChart.data.datasets[0].data = [
                chartData.severityCounts.critical,
                chartData.severityCounts.high,
                chartData.severityCounts.moderate,
                chartData.severityCounts.low
            ];
            this.charts.predictionsChart.update();
        }
        
        // Update Impact Chart (Health Vulnerability by County)
        if (this.charts.impactChart) {
            const counties = Object.keys(chartData.countyData);
            const avgHealth = counties.map(county => {
                const values = chartData.countyData[county].health_vulnerability || 
                              chartData.countyData[county].education_access; // Fallback
                return values.reduce((sum, val) => sum + val, 0) / values.length;
            });
            
            this.charts.impactChart.data.labels = counties.slice(0, 4);
            this.charts.impactChart.data.datasets[0].data = avgHealth.slice(0, 4);
            this.charts.impactChart.update();
        }
        
        console.log('✅ Dashboard charts updated with unified data');
    }

    initializeDynamicCalculator() {
        // Skip on pages that don't need dynamic calculator
        if (window.location.pathname.includes('poverty-models') || 
            window.location.pathname.includes('projects.html')) {
            return;
        }
        
        if (typeof DynamicPovertyCalculator !== 'undefined') {
            this.dynamicCalculator = new DynamicPovertyCalculator();
            console.log('✅ Dynamic Poverty Calculator initialized');
            this.debug('Dynamic poverty calculator initialized');
        } else {
            console.warn('⚠️ DynamicPovertyCalculator not available - dynamic layer calculation disabled');
        }
    }

    async initializeDashboardMap() {
        // Skip on specific pages that don't need the map
        if (window.location.pathname.includes('poverty-models') || 
            window.location.pathname.includes('projects.html')) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                // Check if Leaflet is available
                if (typeof L === 'undefined') {
                    console.log('ℹ️ Leaflet.js not available - skipping dashboard map initialization');
                    this.debug('Leaflet not loaded - running in non-map mode');
                    resolve();
                    return;
                }

                // Check if dashboard map container exists
                const mapElement = document.getElementById('dashboard-map');
                if (!mapElement) {
                    console.log('ℹ️ No dashboard map container found - skipping map initialization');
                    this.debug('No dashboard map container - running in non-map mode');
                    resolve();
                    return;
                }

                console.log('🗺️ Initializing dashboard map...');
                this.debug('Starting dashboard map initialization');

                // Initialize Leaflet map with Kenya focus
                this.dashboardMap = L.map('dashboard-map').setView([-1.2921, 36.8219], 6);
                
                // Apply user-selected map style
                this.applyMapStyle(this.userPreferences?.mapStyle || this.pendingMapStyle || 'default');
                if (this.pendingMapStyle && this.pendingMapStyle !== (this.userPreferences?.mapStyle)) {
                    const control = document.getElementById('mapStyleControl');
                    if (control) control.value = this.pendingMapStyle;
                    this.userPreferences.mapStyle = this.pendingMapStyle;
                    this.pendingMapStyle = null;
                }

                // Add map controls
                L.control.scale({
                    position: 'bottomright',
                    metric: true,
                    imperial: false
                }).addTo(this.dashboardMap);

                // Add click handler
                this.dashboardMap.on('click', (e) => {
                    this.handleDashboardMapClick(e);
                });

                // Add map load event
                this.dashboardMap.whenReady(() => {
                    console.log('✅ Dashboard map loaded successfully');
                    this.debug('Dashboard map initialized and ready');
                    
                    // Setup control panel after map is ready
                    setTimeout(() => {
                        this.setupDashboardMapControls();
                    }, 100);
                });

                // Initialize map layers
                this.dashboardMapLayers = {
                    poverty: L.layerGroup(),
                    education: L.layerGroup(),
                    health: L.layerGroup(),
                    water: L.layerGroup()
                };

                // Add all layers to map
                Object.values(this.dashboardMapLayers).forEach(layer => {
                    this.dashboardMap.addLayer(layer);
                });

                // ============================================
                // Clear any existing markers/layers on startup
                // This ensures map starts blank (no training data visible)
                // ============================================
                this.dashboardMap.whenReady(() => {
                    setTimeout(() => {
                        this.dashboardMap.eachLayer((layer) => {
                            // Remove CircleMarkers, Markers, and Circles (but keep base tile layers)
                            if ((layer instanceof L.CircleMarker || layer instanceof L.Marker || (layer instanceof L.Circle && !(layer instanceof L.TileLayer))) &&
                                (!layer.options || !layer.options.isSearchMarker)) {
                                try {
                                    this.dashboardMap.removeLayer(layer);
                                } catch (e) {
                                    // Ignore errors if layer already removed
                                }
                            }
                        });
                        // Also clear all layer groups
                        if (this.dashboardMapLayers) {
                            Object.values(this.dashboardMapLayers).forEach(layerGroup => {
                                layerGroup.clearLayers();
                            });
                        }
                    }, 300);
                });
                // ============================================

                this.debug('Dashboard map initialized');
                resolve();
                
            } catch (error) {
                console.error('❌ Dashboard map initialization failed:', error);
                this.debug(`Dashboard map initialization failed: ${error.message}`);
                reject(error);
            }
        });
    }

    setupEventListeners() {
        // Layer controls
        // Initialize sync flag
        this._syncingCheckboxes = false;
        
        // Initial sync: sync desktop to mobile on page load
        this.syncLayerCheckboxes();
        
        // Desktop layer checkboxes
        document.getElementById('povertyLayer')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('povertyLayer', 'povertyLayerMobile', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('educationLayer')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('educationLayer', 'educationLayerMobile', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('healthLayer')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('healthLayer', 'healthLayerMobile', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('waterLayer')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('waterLayer', 'waterLayerMobile', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('shelterLayer')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('shelterLayer', 'shelterLayerMobile', e.target.checked);
                this.updateMapLayers();
            }
        });
        
        // Mobile layer checkboxes
        document.getElementById('povertyLayerMobile')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('povertyLayerMobile', 'povertyLayer', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('educationLayerMobile')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('educationLayerMobile', 'educationLayer', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('healthLayerMobile')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('healthLayerMobile', 'healthLayer', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('waterLayerMobile')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('waterLayerMobile', 'waterLayer', e.target.checked);
                this.updateMapLayers();
            }
        });
        document.getElementById('shelterLayerMobile')?.addEventListener('change', (e) => {
            if (!this._syncingCheckboxes) {
                this.syncCheckboxPair('shelterLayerMobile', 'shelterLayer', e.target.checked);
                this.updateMapLayers();
            }
        });
        
        // Questionnaire button
        const questionnaireBtn = document.getElementById('questionnaireBtn');
        if (questionnaireBtn) {
            questionnaireBtn.addEventListener('click', () => this.showQuestionnaire());
        }

        // Generate Insights button
        const generateInsightsBtn = document.getElementById('generateInsights');
        if (generateInsightsBtn) {
            generateInsightsBtn.addEventListener('click', () => {
                this.generateInsights();
            });
        }

        // Selected Area Analytics functionality
        this.setupSelectedAreaAnalytics();
        
        // Sync data with poverty map if available
        this.syncWithPovertyMap();

        // Filter controls
        document.getElementById('severityFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('countyFilter')?.addEventListener('change', () => this.applyFilters());

        // Map controls
        // Dashboard map control panel handlers
        this.setupDashboardMapControls();
        
        // Legacy handlers (if they exist)
        document.getElementById('resetViewBtn')?.addEventListener('click', () => this.resetMapView());
        document.getElementById('locateBtn')?.addEventListener('click', () => this.locateUser());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());

        // Search functionality moved to dedicated poverty map page

        // Intervention simulator
        document.getElementById('interventionScale')?.addEventListener('input', (e) => {
            document.getElementById('scaleValue').textContent = e.target.value;
        });
        document.getElementById('interventionDuration')?.addEventListener('input', (e) => {
            document.getElementById('durationValue').textContent = e.target.value;
        });
        document.getElementById('runSimulationBtn')?.addEventListener('click', () => this.runSimulation());

        // Chart controls
        document.getElementById('chartType')?.addEventListener('change', () => this.updateChartType());
        document.getElementById('updateChartBtn')?.addEventListener('click', () => this.updateCharts());

        // Statistics
        document.getElementById('refreshStatsBtn')?.addEventListener('click', () => this.refreshStatistics());

        // Debug console
        document.getElementById('toggleDebug')?.addEventListener('click', () => this.toggleDebug());
        document.getElementById('clearDebugBtn')?.addEventListener('click', () => this.clearDebug());

        // Fullscreen
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => this.toggleFullscreen());

        // Real-time controls
        document.getElementById('toggleRealtimeBtn')?.addEventListener('click', () => this.toggleRealtimeUpdates());
        document.getElementById('refreshInterval')?.addEventListener('change', (e) => {
            this.refreshInterval = parseInt(e.target.value) * 1000;
            if (this.isRealtimeEnabled) {
                this.stopRealtimeUpdates();
                this.startRealtimeUpdates();
            }
        });

        document.addEventListener('profileUpdated', (event) => {
            if (event?.detail?.profile) {
                this.updateGlobalProfileDisplay(event.detail.profile);
            }
        });

        document.addEventListener('preferencesUpdated', (event) => {
            if (event?.detail?.preferences) {
                this.applyPreferenceChanges(event.detail.preferences);
            }
        });

        const mapStyleControl = document.getElementById('mapStyleControl');
        if (mapStyleControl) {
            mapStyleControl.value = this.userPreferences?.mapStyle || 'default';
            mapStyleControl.addEventListener('change', (event) => {
                const value = event.target.value;
                this.applyMapStyle(value);
                if (window.settingsManager) {
                    window.settingsManager.userData.preferences.mapStyle = value;
                    window.settingsManager.saveUserData();
                } else {
                    this.userPreferences.mapStyle = value;
                    const saved = JSON.parse(localStorage.getItem('ipmas_user_data') || '{}');
                    if (saved) {
                        saved.preferences = { ...(saved.preferences || {}), mapStyle: value };
                        localStorage.setItem('ipmas_user_data', JSON.stringify(saved));
                    }
                }
            });
        }
 
         this.debug('Event listeners setup complete');
     }

    handleDashboardMapClick(e) {
        // Support drill-down navigation if available
        if (window.drillDownVis && window.drillDownVis.handleMapClick) {
            // Let drill-down handle it first
            const handled = window.drillDownVis.handleMapClick(e);
            if (handled) return;
        }
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);
        
        console.log(`🗺️ Map clicked at: ${lat}, ${lng}`);
        
        // Create popup with coordinates
        const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div class="map-popup">
                    <h4>Location Details</h4>
                    <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
                    <p><strong>Click to explore this area</strong></p>
                </div>
            `)
            .openOn(this.dashboardMap);
    }

    // ============================================
    // COMMENTED OUT: DHS Training Data Markers Rendering
    // This method renders all training data markers on the dashboard map
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    updateMapLayers() {
        if (!this.dashboardMap || !this.dashboardMapLayers) return;

        // Clear all layers first
        Object.values(this.dashboardMapLayers).forEach(layer => {
            layer.clearLayers();
        });

        // Add sample markers based on enabled layers
        if (typeof sampleData !== 'undefined' && sampleData.locations) {
            sampleData.locations.forEach(location => {
                const marker = L.circleMarker([location.lat, location.lng], {
                    radius: 8,
                    fillColor: this.getSeverityColor(location.poverty_index),
                    color: '#000',
                    weight: 1,
                    opacity: 0.7,
                    fillOpacity: 0.6
                });

                // Show popup with location info and drill-down option
                const popupContent = `
                    <div class="poverty-popup">
                        <h3>${location.name}</h3>
                        <p><strong>County:</strong> ${location.county}</p>
                        <p><strong>Ward:</strong> ${location.ward}</p>
                        <p><strong>Poverty Index:</strong> ${location.poverty_index}%</p>
                        <p><strong>Education Access:</strong> ${location.education_access}%</p>
                        <p><strong>Health Vulnerability:</strong> ${location.health_vulnerability}%</p>
                        <p><strong>Water Access:</strong> ${location.water_access}%</p>
                        ${window.drillDownVis ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                                <button class="btn btn-sm btn-primary" onclick="window.drillDownVis.handleCountyClick('${location.county}'); window.ipmasApp.dashboardMap.closePopup();" style="width: 100%;">
                                    🔍 Focus on ${location.county} County
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
                marker.bindPopup(popupContent);

                // Add to appropriate layer based on poverty index
                if (location.poverty_index >= 70) {
                    this.dashboardMapLayers.poverty.addLayer(marker);
                } else if (location.poverty_index >= 50) {
                    this.dashboardMapLayers.health.addLayer(marker);
                } else if (location.poverty_index >= 30) {
                    this.dashboardMapLayers.education.addLayer(marker);
                } else {
                    this.dashboardMapLayers.water.addLayer(marker);
                }
            });
        }
    }
    */
    // ============================================
    // Placeholder to prevent errors - clear layers but don't add markers
    updateMapLayers() {
        if (!this.dashboardMap || !this.dashboardMapLayers) return;

        // Clear all layers first
        Object.values(this.dashboardMapLayers).forEach(layer => {
            layer.clearLayers();
        });

        // ============================================
        // COMMENTED OUT: Training data markers rendering
        // Markers will only appear for user-searched locations
        // ============================================
    }

    getSeverityColor(povertyIndex) {
        if (povertyIndex >= 70) return '#d73027'; // Critical - Red
        if (povertyIndex >= 50) return '#fc8d59'; // High - Orange
        if (povertyIndex >= 30) return '#fee08b'; // Moderate - Yellow
        return '#91cf60'; // Low - Green
    }

    async loadSampleData(retryCount = 0) {
        // Skip on pages that don't need sample data
        if (window.location.pathname.includes('poverty-models') || 
            window.location.pathname.includes('projects.html')) {
            return;
        }
        
        // Try to fetch real data from API first
        console.log('📊 Loading poverty data...');
        
        try {
            // Use backend API endpoint for poverty data
            const apiUrl = window.API_CONFIG 
                ? window.API_CONFIG.getApiUrl('/api/v1/analytics/poverty/all')
                : 'http://localhost:3001/api/v1/analytics/poverty/all';
            
            console.log(`Fetching from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const apiData = await response.json();
                console.log(`✅ API data loaded: ${apiData.features?.length || 0} locations`);
                
                // Process API data for dashboard
                if (apiData.features && apiData.features.length > 0) {
                    // Convert GeoJSON features to locations array
                    const locations = apiData.features.map(feature => ({
                        lat: feature.geometry.coordinates[1],
                        lng: feature.geometry.coordinates[0],
                        name: feature.properties.name,
                        county: feature.properties.county,
                        ward: feature.properties.ward,
                        poverty_index: parseFloat(feature.properties.poverty_index) || 0,
                        education_access: parseFloat(feature.properties.education_access) || 0,
                        health_vulnerability: parseFloat(feature.properties.health_vulnerability) || 0,
                        water_access: parseFloat(feature.properties.water_access) || 0,
                        housing_quality: parseFloat(feature.properties.housing_quality) || 0
                    }));
                    
                    // Store processed locations
                    this.processedLocations = locations;
                    console.log(`📊 Dashboard: Loaded ${locations.length} locations from API`);
                    console.log(`📊 Dashboard: Sample locations:`, locations.slice(0, 3).map(l => `${l.name}: ${l.poverty_index}`));
                    
                    // ============================================
                    // COMMENTED OUT: DHS Training Data Markers
                    // Uncomment below to restore training data markers on map
                    // ============================================
                    // Add markers to map
                    // this.addMarkersFromLocations(locations);
                    // ============================================
                    this.updateMapLayers();
                    this.updateStatistics();
                    
                    // Update severity distribution display
                    this.updateSeverityDistribution(locations);
                    
                    this.debug('Poverty data loaded from API');
                    return;
                }
            }
            
            throw new Error(`API returned ${response.status}`);
        } catch (error) {
            console.warn('⚠️ API unavailable, trying sample data:', error.message);
        }
        
        // Fallback: Load sample data from sample-data.js
        console.log('📊 Loading sample data...');
        
        // Wait a bit for sample data to load if it's not immediately available
        if (typeof sampleData === 'undefined') {
            if (retryCount < 5) { // Max 5 retries (0.5 second total)
                console.log(`⏳ Waiting for sample data to load... (attempt ${retryCount + 1})`);
                setTimeout(() => {
                    this.loadSampleData(retryCount + 1);
                }, 100);
                return;
            } else {
                console.warn('⚠️ Sample data not available - continuing without it');
                this.debug('Sample data not loaded - check sample-data.js');
                return;
            }
        }
        
        if (sampleData && sampleData.locations) {
            console.log(`✅ Sample data loaded: ${sampleData.locations.length} locations`);
            this.processedLocations = sampleData.locations;
            // ============================================
            // COMMENTED OUT: DHS Training Data Markers
            // Uncomment below to restore training data markers on map
            // ============================================
            // this.addSampleMarkers();
            // ============================================
            // ============================================
            // COMMENTED OUT: DHS Training Data Rendering
            // Uncomment below to restore training data visualization
            // ============================================
            // this.updateMapLayers(); // Update dashboard map layers
            // ============================================
            this.updateStatistics();
            this.debug('Sample data loaded');
        } else {
            console.warn('⚠️ Sample data not available');
            this.debug('Sample data not loaded - check sample-data.js');
        }
    }
    
    // ============================================
    // COMMENTED OUT: DHS Training Data Markers
    // This method adds individual markers for each DHS training data location
    // Uncomment entire method below to restore training data markers on map
    // ============================================
    /*
    addMarkersFromLocations(locations) {
        console.log(`📍 Adding ${locations.length} markers from data...`);
        
        // Use dashboardMap if on dashboard page
        const mapToUse = this.dashboardMap || this.map;
        
        if (!mapToUse) {
            console.warn('⚠️ Map not initialized');
            return;
        }

        try {
            let markersAdded = 0;
            
            locations.forEach((location, index) => {
                try {
                    const marker = L.circleMarker([location.lat, location.lng], {
                        radius: this.calculateMarkerSize(location.poverty_index),
                        fillColor: this.getColorForPoverty(location.poverty_index),
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // Calculate severity from poverty index
                    const severity = this.getSeverityLevel(location.poverty_index);
                    
                    const popupContent = `
                        <div class="popup-content">
                            <h3>Poverty Analysis</h3>
                            <p><strong>Location:</strong> ${location.name}</p>
                            <p><strong>County:</strong> ${location.county || 'Unknown'}</p>
                            <p><strong>Poverty Index:</strong> ${location.poverty_index.toFixed(1)}%</p>
                            <p><strong>Severity:</strong> ${severity}</p>
                            ${location.education_access ? `<p><strong>Education:</strong> ${location.education_access.toFixed(2)}%</p>` : ''}
                            ${location.health_vulnerability ? `<p><strong>Health:</strong> ${location.health_vulnerability.toFixed(2)}%</p>` : ''}
                            ${location.water_access ? `<p><strong>Water:</strong> ${location.water_access.toFixed(2)}%</p>` : ''}
                            ${location.housing_quality ? `<p><strong>Housing:</strong> ${location.housing_quality.toFixed(2)}%</p>` : ''}
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);

                    // Store location data with marker
                    marker.locationData = location;

                    marker.addTo(mapToUse);
                    markersAdded++;
                } catch (error) {
                    console.error(`Error adding marker ${index}:`, error);
                }
            });

            console.log(`✅ Added ${markersAdded} markers successfully`);
            this.debug(`Added ${markersAdded} markers to map`);
        } catch (error) {
            console.error('Error adding markers:', error);
            this.debug('Marker addition failed');
        }
    }
    */
    // ============================================

    // ============================================
    // COMMENTED OUT: DHS Training Data Markers
    // This method adds sample/training data markers to the map
    // Uncomment entire method below to restore training data markers on map
    // ============================================
    /*
    addSampleMarkers() {
        console.log('📍 Adding sample markers...');
        
        if (typeof sampleData === 'undefined') {
            console.warn('⚠️ Sample data not available');
            return;
        }
        
        if (!this.map) {
            console.warn('⚠️ Map not initialized');
            return;
        }

        try {
            let markersAdded = 0;
            
            sampleData.locations.forEach((location, index) => {
                try {
                    const marker = L.circleMarker([location.lat, location.lng], {
                        radius: this.calculateMarkerSize(location.poverty_index),
                        fillColor: this.getColorForPoverty(location.poverty_index),
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(this.map);

                    marker.bindPopup(`
                        <div class="popup-content">
                            <h3>${location.name}</h3>
                            <p><strong>County:</strong> ${location.county}</p>
                            <p><strong>Poverty Index:</strong> ${location.poverty_index}%</p>
                            <p><strong>Education Access:</strong> ${location.education_access}%</p>
                            <p><strong>Health Vulnerability:</strong> ${location.health_vulnerability}%</p>
                            <p><strong>Water Access:</strong> ${location.water_access}%</p>
                            <p><strong>Employment Rate:</strong> ${location.employment_rate}%</p>
                            <p><strong>Housing Quality:</strong> ${location.housing_quality}%</p>
                        </div>
                    `);

                    // Store location data with marker
                    marker.locationData = location;
                    markersAdded++;
                    
                } catch (markerError) {
                    console.error(`❌ Failed to add marker for ${location.name}:`, markerError);
                }
            });

            console.log(`✅ Added ${markersAdded} markers to map`);
            this.debug(`Added ${markersAdded} markers to map`);
            
        } catch (error) {
            console.error('❌ Failed to add sample markers:', error);
            this.debug(`Failed to add sample markers: ${error.message}`);
        }
    }
    */
    // ============================================

    calculateMarkerSize(povertyIndex) {
        return Math.max(5, Math.min(20, povertyIndex / 5));
    }

    getColorForPoverty(povertyIndex) {
        // Use same colors and thresholds as Poverty Map page for consistency
        if (povertyIndex >= 70) return '#d73027'; // Critical - Red
        if (povertyIndex >= 50) return '#fc8d59'; // High - Orange
        if (povertyIndex >= 30) return '#fee08b'; // Moderate - Yellow
        return '#91cf60'; // Low - Green
    }

    handleMapClick(e) {
        const { lat, lng } = e.latlng;
        this.currentLocation = { lat, lng };
        
        // Join location room for real-time collaboration
        if (this.socket && this.isConnected) {
            this.socket.emit('join-location', { lat, lng });
        }

        // Update statistics for clicked location
        this.updateLocationStatistics(lat, lng);
        
        this.debug(`Map clicked at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }

    updateMapLayers() {
        // Update the dynamic poverty calculator with active layers
        if (this.dynamicCalculator) {
            this.dynamicCalculator.updateActiveLayers();
            
            // Prioritize processedLocations (from API) over sampleData
            const locationsToUse = this.processedLocations && this.processedLocations.length > 0
                ? this.processedLocations
                : (typeof sampleData !== 'undefined' && sampleData.locations ? sampleData.locations : []);
            
            // Recalculate all locations with new layer configuration
            if (locationsToUse && locationsToUse.length > 0) {
                const recalculatedLocations = this.dynamicCalculator.recalculateAllLocations(locationsToUse);
                
                // ============================================
                // COMMENTED OUT: DHS Training Data Rendering
                // Uncomment below to restore training data visualization
                // ============================================
                // Update map markers with new calculated poverty indices
                // this.updateMapMarkersWithRecalculatedData(recalculatedLocations);
                // ============================================
                
                // Update statistics display
                const stats = this.dynamicCalculator.getSummaryStatistics(locationsToUse);
                this.updateStatisticsDisplay(stats);
                
                console.log('✅ Poverty indices recalculated with active layers:', Array.from(this.dynamicCalculator.activeLayers));
            }
        }
        
        // Legacy code for backwards compatibility
        // Check both mobile and desktop, prefer desktop if available
        const povertyLayer = (document.getElementById('povertyLayer') || document.getElementById('povertyLayerMobile'))?.checked;
        const educationLayer = (document.getElementById('educationLayer') || document.getElementById('educationLayerMobile'))?.checked;
        const healthLayer = (document.getElementById('healthLayer') || document.getElementById('healthLayerMobile'))?.checked;
        const waterLayer = (document.getElementById('waterLayer') || document.getElementById('waterLayerMobile'))?.checked;
        const shelterLayer = (document.getElementById('shelterLayer') || document.getElementById('shelterLayerMobile'))?.checked;
        
        this.selectedIndicators = [];
        if (povertyLayer) this.selectedIndicators.push('poverty_index');
        if (educationLayer) this.selectedIndicators.push('education_access');
        if (healthLayer) this.selectedIndicators.push('health_vulnerability');
        if (waterLayer) this.selectedIndicators.push('water_access');
        if (shelterLayer) this.selectedIndicators.push('housing_quality');
        
        if (this.selectedIndicators.length === 0) {
            this.selectedIndicators = ['poverty_index'];
        }
        
        const layers = {
            poverty: povertyLayer,
            education: educationLayer,
            health: healthLayer,
            water: waterLayer,
            shelter: shelterLayer
        };

        this.debug('Map layers updated:', layers);
        console.log('Updated selected indicators:', this.selectedIndicators);
        
        // Update all searched location popups when layers change
        if (window.searchedLocationUpdaters && window.searchedLocationUpdaters.length > 0) {
            setTimeout(() => {
                window.searchedLocationUpdaters.forEach(updater => {
                    try {
                        updater();
                    } catch (error) {
                        console.warn('Error updating searched location popup after layer change:', error);
                    }
                });
            }, 100);
        }
        
        if (this.socket && this.isConnected) {
            this.socket.emit('filter-update', { layers, selectedIndicators: this.selectedIndicators });
        }
    }
    
    syncCheckboxPair(sourceId, targetId, checkedValue) {
        // Sync a single checkbox pair - from source to target
        // Use a flag to prevent circular syncing
        if (this._syncingCheckboxes) return;
        
        const targetCheckbox = document.getElementById(targetId);
        if (targetCheckbox && targetCheckbox.checked !== checkedValue) {
            this._syncingCheckboxes = true;
            targetCheckbox.checked = checkedValue;
            // Reset the flag after sync completes
            setTimeout(() => {
                this._syncingCheckboxes = false;
            }, 10);
        }
    }
    
    syncLayerCheckboxes() {
        // Initial sync on page load - sync desktop to mobile
        // This is only called during initialization, not during user interaction
        const layerPairs = [
            { desktop: 'povertyLayer', mobile: 'povertyLayerMobile' },
            { desktop: 'educationLayer', mobile: 'educationLayerMobile' },
            { desktop: 'healthLayer', mobile: 'healthLayerMobile' },
            { desktop: 'waterLayer', mobile: 'waterLayerMobile' },
            { desktop: 'shelterLayer', mobile: 'shelterLayerMobile' }
        ];
        
        layerPairs.forEach(({ desktop, mobile }) => {
            const desktopCheckbox = document.getElementById(desktop);
            const mobileCheckbox = document.getElementById(mobile);
            
            // Sync desktop to mobile (if both exist)
            if (desktopCheckbox && mobileCheckbox) {
                mobileCheckbox.checked = desktopCheckbox.checked;
            }
        });
    }
    
    async calculateDynamicPovertyIndex(locationData) {
        try {
            const response = await fetch('/api/v1/questionnaire/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location_data: locationData,
                    selected_indicators: this.selectedIndicators
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to calculate poverty index');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update the location data with new poverty index
                this.currentLocation.poverty_index = result.data.poverty_index;
                this.currentLocation.poverty_level = result.data.poverty_level;
                this.currentLocation.confidence_score = result.data.confidence_score;
                
                // Update UI with new values
                this.updateLocationDisplay();
                this.updateAnalyticsDisplay(result.data);
            }
            
        } catch (error) {
            console.error('Error calculating dynamic poverty index:', error);
            this.showError('Failed to calculate poverty index');
        }
    }
    
    updateMapVisualization() {
        // Update map markers and colors based on selected indicators
        if (this.map && window.sampleData) {
            window.sampleData.locations.forEach(location => {
                this.updateLocationMarker(location);
            });
        }
    }
    
    updateLocationMarker(location) {
        // Update marker color and popup based on selected indicators
        console.log('Updating marker for:', location.name, 'with indicators:', this.selectedIndicators);
    }
    
    showQuestionnaire() {
        if (window.questionnaireSystem) {
            window.questionnaireSystem.show(
                (result) => this.handleQuestionnaireComplete(result),
                () => this.handleQuestionnaireCancel()
            );
        } else {
            this.showError('Questionnaire system not available');
        }
    }
    
    async handleQuestionnaireComplete(result) {
        try {
            console.log('Questionnaire completed:', result);
            
            // Check if result is valid
            if (!result) {
                throw new Error('No result received from questionnaire');
            }
            
            // Handle both direct data and wrapped response
            const locationData = result.data || result;
            
            if (!locationData) {
                throw new Error('No location data in result');
            }
            
            // Check if we have the required fields
            if (!locationData.location_name) {
                throw new Error('Location name is missing');
            }
            
            // Get poverty level - handle both object and string formats
            let povertyLevelText = 'Unknown';
            if (locationData.poverty_level) {
                if (typeof locationData.poverty_level === 'string') {
                    povertyLevelText = locationData.poverty_level;
                } else if (locationData.poverty_level.level) {
                    povertyLevelText = locationData.poverty_level.level;
                } else if (locationData.poverty_level.label) {
                    povertyLevelText = locationData.poverty_level.label;
                }
            }
            
            // Get poverty index
            const povertyIndex = locationData.poverty_index || locationData.povertyIndex || 'N/A';
            
            // Add to sample data
            if (window.sampleData && window.sampleData.locations) {
                window.sampleData.locations.push(locationData);
            }
            
            // Add marker to map (only if we have coordinates)
            if (locationData.lat || locationData.latitude || locationData.lng || locationData.longitude) {
                this.addLocationMarker(locationData);
            } else {
                console.warn('Location data missing coordinates, marker not added to map');
            }
            
            // Show success message
            this.showNotification(
                `Poverty index calculated for ${locationData.location_name}: ${povertyIndex}% (${povertyLevelText})`,
                'success',
                5000
            );
            
            // Update analytics display
            this.updateAnalyticsDisplay(locationData);
            
        } catch (error) {
            console.error('Error handling questionnaire completion:', error);
            console.error('Result received:', result);
            this.showError(`Failed to process questionnaire results: ${error.message || 'Unknown error'}`);
        }
    }
    
    handleQuestionnaireCancel() {
        console.log('Questionnaire cancelled');
    }
    
    addLocationMarker(locationData) {
        if (!this.map) return;
        
        // Get coordinates
        const lat = locationData.lat || locationData.latitude;
        const lng = locationData.lng || locationData.longitude;
        
        if (!lat || !lng) {
            console.warn('Cannot add marker: missing coordinates', locationData);
            return;
        }
        
        // Get poverty level text
        let povertyLevelText = 'Unknown';
        if (locationData.poverty_level) {
            if (typeof locationData.poverty_level === 'string') {
                povertyLevelText = locationData.poverty_level;
            } else if (locationData.poverty_level.level) {
                povertyLevelText = locationData.poverty_level.level;
            } else if (locationData.poverty_level.label) {
                povertyLevelText = locationData.poverty_level.label;
            }
        }
        
        // Get poverty index
        const povertyIndex = locationData.poverty_index || locationData.povertyIndex || 'N/A';
        const confidenceScore = locationData.confidence_score || locationData.confidenceScore || 'N/A';
        
        // Create marker for new location
        const marker = L.marker([lat, lng])
            .addTo(this.map)
            .bindPopup(`
                <div class="popup-content">
                    <h3>${locationData.location_name || 'Unknown Location'}</h3>
                    <p><strong>Poverty Index:</strong> ${povertyIndex}%</p>
                    <p><strong>Level:</strong> ${povertyLevelText}</p>
                    <p><strong>Confidence:</strong> ${confidenceScore}%</p>
                </div>
            `);
            
        // Store reference for later updates
        if (!this.locationMarkers) {
            this.locationMarkers = new Map();
        }
        this.locationMarkers.set(locationData.location_name, marker);
    }
    
    updateAnalyticsDisplay(data) {
        if (!data) return;
        
        // Update analytics charts and displays with new data
        if (data.breakdown && typeof data.breakdown === 'object') {
            Object.entries(data.breakdown).forEach(([indicator, info]) => {
                if (info && typeof info === 'object') {
                    const element = document.getElementById(`${indicator}Metric`);
                    if (element && info.adjusted_value !== undefined) {
                        element.textContent = Number(info.adjusted_value).toFixed(1);
                    }
                }
            });
        }
        
        // Update poverty level display
        const povertyLevelElement = document.getElementById('povertyLevel');
        if (povertyLevelElement && data.poverty_level) {
            let levelText = 'Unknown';
            let category = 'unknown';
            
            if (typeof data.poverty_level === 'string') {
                levelText = data.poverty_level;
            } else if (data.poverty_level.level) {
                levelText = data.poverty_level.level;
            }
            
            if (data.poverty_level.category) {
                category = data.poverty_level.category;
            } else if (data.poverty_level.level) {
                category = data.poverty_level.level.toLowerCase().replace(/\s+/g, '-');
            }
            
            povertyLevelElement.textContent = levelText;
            povertyLevelElement.className = `poverty-level ${category}`;
        }
        
        // Update confidence score
        const confidenceElement = document.getElementById('confidenceScore');
        if (confidenceElement && data.confidence_score !== undefined) {
            confidenceElement.textContent = `${data.confidence_score}%`;
        }
        
        // Update recommendations
        if (data.recommendations && data.recommendations.length > 0) {
            this.updateRecommendations(data.recommendations);
        }
    }
    
    updateRecommendations(recommendations) {
        const recommendationsContainer = document.getElementById('recommendationsContainer');
        if (!recommendationsContainer) return;
        
        let html = '<h4>Recommendations</h4>';
        recommendations.forEach(rec => {
            html += `
                <div class="recommendation-item ${rec.priority}">
                    <h5>${rec.indicator.replace('_', ' ').toUpperCase()}</h5>
                    <p>${rec.recommendation}</p>
                    <small>${rec.impact}</small>
                </div>
            `;
        });
        
        recommendationsContainer.innerHTML = html;
    }

    applyFilters() {
        // Use advanced filters if available, otherwise use basic filters
        if (window.advancedFilters && window.advancedFilters.getFilteredData) {
            const filteredData = window.advancedFilters.getFilteredData();
            const activeFilters = window.advancedFilters.getActiveFilters();
            this.applyAdvancedFilters(filteredData, activeFilters);
            return;
        }

        // Fallback to basic filters
        const filters = {
            severity: document.getElementById('severityFilter')?.value,
            county: document.getElementById('countyFilter')?.value
        };

        this.debug('Filters applied:', filters);
        
        // Apply filters to map markers
        if (this.map) {
            this.map.eachLayer(layer => {
                if (layer instanceof L.CircleMarker && layer.locationData) {
                    const location = layer.locationData;
                    let show = true;

                    if (filters.severity) {
                        const severity = this.getSeverityLevel(location.poverty_index);
                        show = show && severity === filters.severity;
                    }

                    if (filters.county) {
                        show = show && location.county === filters.county;
                    }

                    if (show) {
                        if (!this.map.hasLayer(layer)) {
                            this.map.addLayer(layer);
                        }
                    } else {
                        if (this.map.hasLayer(layer)) {
                            this.map.removeLayer(layer);
                        }
                    }
                }
            });
        }

        // Emit filter update
        if (this.socket && this.isConnected) {
            this.socket.emit('filter-update', filters);
        }
    }

    applyCustomFilters(filteredData) {
        // Method called by advanced filters to update map
        this.applyAdvancedFilters(filteredData, window.advancedFilters?.getActiveFilters() || {});
    }

    applyAdvancedFilters(filteredData, activeFilters) {
        if (!this.map) return;

        // Create a Set of filtered location IDs for quick lookup
        const filteredIds = new Set(filteredData.map(loc => loc.id || `${loc.lat}_${loc.lng}`));

        // Update map markers
        this.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker && layer.locationData) {
                const location = layer.locationData;
                const locationId = location.id || `${location.lat}_${location.lng}`;
                const shouldShow = filteredIds.has(locationId);

                if (shouldShow) {
                    if (!this.map.hasLayer(layer)) {
                        this.map.addLayer(layer);
                    }
                } else {
                    if (this.map.hasLayer(layer)) {
                        this.map.removeLayer(layer);
                    }
                }
            }
        });

        // Update statistics with filtered data
        this.updateFilteredStatistics(filteredData);

        this.debug('Advanced filters applied:', activeFilters);
    }

    updateFilteredStatistics(filteredData) {
        if (!filteredData || filteredData.length === 0) return;

        // Update total locations count if element exists
        const totalLoc = document.getElementById('totalLocations');
        if (totalLoc) {
            totalLoc.textContent = `${filteredData.length} locations`;
        }

        // Recalculate statistics based on filtered data
        if (this.charts && this.charts.saeChart) {
            // Update charts with filtered data
            // This will be enhanced when we have the data processing ready
        }
    }

    getSeverityLevel(povertyIndex) {
        if (povertyIndex >= 70) return 'critical';
        if (povertyIndex >= 50) return 'high';
        if (povertyIndex >= 30) return 'moderate';
        return 'low';
    }

    setupDashboardMapControls() {
        // Get the map instance (dashboard or main)
        const mapInstance = this.dashboardMap || this.map;
        if (!mapInstance) return;

        // Control panel toggle - use a function to ensure it's set up
        const setupControlPanelToggle = () => {
            const controlPanelToggle = document.getElementById('controlPanelToggle');
            const controlPanelContent = document.getElementById('controlPanelContent');
            const controlPanel = document.getElementById('mapControlPanel');

            console.log('🔧 Setting up control panel toggle:', {
                toggle: !!controlPanelToggle,
                content: !!controlPanelContent,
                panel: !!controlPanel
            });

            if (controlPanelToggle && controlPanelContent) {
                // Check if already set up (avoid duplicate listeners)
                if (controlPanelToggle.dataset.listenerAttached === 'true') {
                    console.log('⚠️ Listener already attached, skipping');
                    return true;
                }
                
                // Mark as attached
                controlPanelToggle.dataset.listenerAttached = 'true';
                
                // Add event listener
                controlPanelToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('🔘 Toggle button clicked');
                    
                    // Toggle collapsed class on both elements
                    controlPanelContent.classList.toggle('collapsed');
                    if (controlPanel) {
                        controlPanel.classList.toggle('collapsed');
                    }
                    
                    // Update icon rotation
                    const toggleIcon = controlPanelToggle.querySelector('.toggle-icon');
                    if (toggleIcon) {
                        if (controlPanelContent.classList.contains('collapsed')) {
                            toggleIcon.style.transform = 'rotate(-180deg)';
                            console.log('✅ Panel collapsed');
                        } else {
                            toggleIcon.style.transform = 'rotate(0deg)';
                            console.log('✅ Panel expanded');
                        }
                    }
                });
                console.log('✅ Control panel toggle event listener attached');
                return true;
            } else {
                console.warn('⚠️ Control panel elements not found, retrying...');
                return false;
            }
        };

        // Try to set up immediately
        if (!setupControlPanelToggle()) {
            // If elements not ready, try again after a short delay
            setTimeout(() => {
                if (!setupControlPanelToggle()) {
                    // Last attempt after DOM is fully loaded
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', setupControlPanelToggle);
                    } else {
                        setTimeout(setupControlPanelToggle, 500);
                    }
                }
            }, 200);
        }

        // Zoom In
        const zoomInBtn = document.getElementById('zoomInBtn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                mapInstance.zoomIn();
            });
        }

        // Zoom Out
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                mapInstance.zoomOut();
            });
        }

        // Reset View (for dashboard map)
        const resetViewBtn = document.getElementById('resetViewBtn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                if (this.dashboardMap) {
                    this.dashboardMap.setView([-1.2921, 36.8219], 6);
                } else if (this.map) {
                    this.map.setView([-1.2921, 36.8219], 6);
                }
            });
        }

        // Locate User
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                this.locateUser();
            });
        }

        // Toggle Layers
        const toggleLayersBtn = document.getElementById('toggleLayersBtn');
        if (toggleLayersBtn) {
            toggleLayersBtn.addEventListener('click', () => {
                // Toggle all layer checkboxes if they exist
                const layerCheckboxes = document.querySelectorAll('input[type="checkbox"][id*="Layer"]');
                if (layerCheckboxes.length > 0) {
                    const allChecked = Array.from(layerCheckboxes).every(cb => cb.checked);
                    layerCheckboxes.forEach(cb => {
                        cb.checked = !allChecked;
                        cb.dispatchEvent(new Event('change'));
                    });
                } else {
                    // Fallback: call toggleMapLayers if available
                    if (typeof toggleMapLayers === 'function') {
                        toggleMapLayers();
                    }
                }
            });
        }

        // Legend is now always visible in control panel, no toggle needed
    }

    resetMapView() {
        const mapInstance = this.dashboardMap || this.map;
        if (mapInstance) {
            mapInstance.setView([-1.2921, 36.8219], 6);
            this.debug('Map view reset');
        }
    }

    locateUser() {
        const mapInstance = this.dashboardMap || this.map;
        if (!mapInstance) {
            alert('Map is not ready yet. Please wait a moment and try again.');
            return;
        }

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser. Please use a modern browser.');
            return;
        }

        // Show loading indicator
        const locateBtn = document.getElementById('locateBtn');
        if (locateBtn) {
            locateBtn.disabled = true;
            const originalText = locateBtn.innerHTML;
            locateBtn.innerHTML = '<span class="control-icon">⏳</span><span class="control-label">Locating...</span>';
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds timeout
            maximumAge: 0 // Don't use cached position
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Validate coordinates (should be in Kenya roughly)
                if (latitude < -5 || latitude > 5 || longitude < 33 || longitude > 42) {
                    console.warn('Location outside Kenya bounds, but proceeding anyway');
                }
                
                // Zoom level 15 shows approximately 2km radius
                const zoomLevel = 15;
                
                // Center map on user location with smooth animation, zoomed to ~2km radius
                mapInstance.flyTo([latitude, longitude], zoomLevel, {
                    duration: 1.5,
                    easeLinearity: 0.25
                });
                
                this.currentLocation = { lat: latitude, lng: longitude };
                this.debug(`✅ Located user at ${latitude}, ${longitude}`);
                
                // Add 2km radius circle around the location
                if (this.userLocationCircle) {
                    mapInstance.removeLayer(this.userLocationCircle);
                }
                
                this.userLocationCircle = L.circle([latitude, longitude], {
                    radius: 2000, // 2km in meters
                    color: '#2196F3',
                    fillColor: '#2196F3',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                }).addTo(mapInstance);
                
                // Get location name using reverse geocoding
                let locationName = 'Your Location';
                let locationAddress = {};
                try {
                    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
                    const reverseResponse = await fetch(reverseUrl);
                    if (reverseResponse.ok) {
                        const reverseData = await reverseResponse.json();
                        locationName = reverseData.display_name || locationName;
                        locationAddress = reverseData.address || {};
                    }
                } catch (reverseError) {
                    console.warn('Reverse geocoding failed:', reverseError);
                }
                
                // Remove existing user location marker
                if (this.userLocationMarker) {
                    mapInstance.removeLayer(this.userLocationMarker);
                }
                
                // Create user location marker with blue pin
                const userIcon = L.divIcon({
                    className: 'user-location-marker',
                    html: '<div style="background: #2196F3; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });
                
                // Prepare location data for analysis
                const locationData = {
                    name: locationName,
                    lat: latitude,
                    lng: longitude,
                    county: locationAddress.county || locationAddress.state || '',
                    sub_county: locationAddress.municipality || locationAddress.city || locationAddress.town || '',
                    ward: locationAddress.suburb || locationAddress.neighbourhood || '',
                    village: locationAddress.village || locationAddress.hamlet || '',
                    // Default values - will be calculated
                    poverty_index: 50,
                    education_access: 60,
                    health_vulnerability: 50,
                    water_access: 70,
                    housing_quality: 60
                };
                
                // Create marker with click handler for analysis
                this.userLocationMarker = L.marker([latitude, longitude], { 
                    icon: userIcon,
                    title: 'Your Location - Click for Analysis',
                    zIndexOffset: 1000
                })
                .addTo(mapInstance)
                .on('click', async () => {
                    // Show analysis for this location
                    await this.showLocationAnalysis(locationData);
                })
                .bindPopup(`
                    <div style="min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #2196F3;">📍 Your Location</h4>
                        <p style="margin: 4px 0; font-size: 12px;"><strong>${locationName}</strong></p>
                        <p style="margin: 4px 0; font-size: 11px; font-family: monospace; color: #666;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #2196F3; font-weight: 600;">👆 Click marker for analysis</p>
                    </div>
                `)
                .openPopup();

                // Reset button
                if (locateBtn) {
                    locateBtn.disabled = false;
                    locateBtn.innerHTML = originalText;
                }
            },
            (error) => {
                let errorMessage = 'Unable to get your location. ';
                let showInstructions = false;
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Location access was denied.\n\n';
                        errorMessage += 'To enable location access:\n';
                        errorMessage += '1. Click the lock/padlock icon in your browser address bar\n';
                        errorMessage += '2. Find "Location" in permissions\n';
                        errorMessage += '3. Change it to "Allow"\n';
                        errorMessage += '4. Refresh the page and try again\n\n';
                        errorMessage += 'Alternatively, you can search for your location using the search box above the map.';
                        showInstructions = true;
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable. Please check your device\'s location settings.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'The request to get your location timed out. Please try again.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred. Please ensure location services are enabled.';
                        break;
                }
                
                this.debug('❌ Geolocation error:', error.code, error.message);
                
                // Show dialog with instructions
                if (showInstructions && confirm(errorMessage + '\n\nWould you like to center the map on Nairobi, Kenya instead?')) {
                    // Fallback: Center on Nairobi
                    const nairobiCoords = [-1.2921, 36.8219];
                    mapInstance.flyTo(nairobiCoords, 12, {
                        duration: 1.5,
                        easeLinearity: 0.25
                    });
                    
                    // Add marker at Nairobi
                    if (this.userLocationMarker) {
                        mapInstance.removeLayer(this.userLocationMarker);
                    }
                    
                    const defaultIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: '<div style="background: #2196F3; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    this.userLocationMarker = L.marker(nairobiCoords, { 
                        icon: defaultIcon,
                        title: 'Default Location (Nairobi)',
                        zIndexOffset: 1000
                    })
                    .addTo(mapInstance)
                    .bindPopup(`
                        <div style="min-width: 150px;">
                            <h4 style="margin: 0 0 8px 0; font-size: 14px;">📍 Default Location</h4>
                            <p style="margin: 4px 0; font-size: 12px;">Nairobi, Kenya</p>
                            <p style="margin: 4px 0; font-size: 11px; font-family: monospace; color: #666;">${nairobiCoords[0].toFixed(6)}, ${nairobiCoords[1].toFixed(6)}</p>
                        </div>
                    `)
                    .openPopup();
                } else if (!showInstructions) {
                    alert(errorMessage);
                }
                
                // Reset button
                if (locateBtn) {
                    locateBtn.disabled = false;
                    locateBtn.innerHTML = '<span class="control-icon">📍</span><span class="control-label">My Location</span>';
                }
            },
            options
        );
    }

    async showLocationAnalysis(locationData) {
        console.log('📍 Showing analysis for location:', locationData);
        
        try {
            // Calculate poverty index using DynamicPovertyCalculator
            if (!this.dynamicCalculator) {
                if (typeof DynamicPovertyCalculator !== 'undefined') {
                    this.dynamicCalculator = new DynamicPovertyCalculator();
                } else {
                    console.error('DynamicPovertyCalculator not available');
                    alert('Analysis calculator not available. Please refresh the page.');
                    return;
                }
            }
            
            // Ensure calculator uses current active layers before calculation
            try {
                this.dynamicCalculator.updateActiveLayers();
                console.log('✅ Active layers before calculation:', Array.from(this.dynamicCalculator.activeLayers));
            } catch (e) {
                console.warn('Could not update active layers:', e?.message || e);
            }

            // Calculate poverty index with current active layers
            const calculation = this.dynamicCalculator.calculateLocationPovertyIndex(locationData);
            const povertyIndex = calculation.poverty_index;
            const level = this.dynamicCalculator.getPovertyLevel(povertyIndex);
            
            // Update location data with calculated values
            locationData.poverty_index = povertyIndex;
            locationData.calculated_poverty_index = povertyIndex;
            locationData.calculation_breakdown = calculation.breakdown;
            locationData.confidence = calculation.confidence_score || 85;
            
            // Format location name
            const formatLocationName = (loc) => {
                const parts = [];
                if (loc.village) parts.push(loc.village);
                if (loc.ward) parts.push(loc.ward);
                if (loc.sub_county) parts.push(loc.sub_county);
                if (loc.county) parts.push(loc.county);
                return parts.length > 0 ? parts.join(', ') : loc.name || 'Unknown Location';
            };
            
            const locationName = formatLocationName(locationData);
            
            // Create popup content with analysis
            const popupContent = `
                <div class="popup-content poverty-popup" style="min-width: auto; max-width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word;">
                    <h3 style="margin: 0 0 12px 0; color: var(--primary-color); word-wrap: break-word; overflow-wrap: break-word; line-height: 1.4;">📍 ${locationName}</h3>
                    
                    <div style="background: ${level.color}15; padding: 12px; border-radius: 8px; border-left: 4px solid ${level.color}; margin-bottom: 12px; word-wrap: break-word; overflow-wrap: break-word;">
                        <p style="margin: 0; font-size: 1.2rem; font-weight: bold; color: ${level.color}; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.3;">
                            ${povertyIndex.toFixed(1)}% Poverty Index
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #666; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.4;">
                            ${level.level} | Confidence: ${locationData.confidence}%
                        </p>
                    </div>
                    
                    ${locationData.calculation_breakdown ? `
                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; font-weight: bold; color: var(--primary-color); word-wrap: break-word; overflow-wrap: break-word;">📊 Calculation Breakdown</summary>
                            <div style="margin-top: 8px; max-height: 200px; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                                <table style="width: 100%; font-size: 0.85em; border-collapse: collapse; word-wrap: break-word; overflow-wrap: break-word;">
                                    <thead>
                                        <tr style="background-color: #f0f0f0;">
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word; min-width: 60px;">Factor</th>
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word; min-width: 50px;">Weight</th>
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word; min-width: 50px;">Score</th>
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word; min-width: 70px;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${Object.entries(locationData.calculation_breakdown).map(([indicator, data]) => 
                                            `<tr style="background-color: ${data.is_active ? '#e8f5e9' : '#ffebee'};">
                                                <td style="padding: 4px; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word;">${this.formatIndicatorName(indicator)}</td>
                                                <td style="padding: 4px; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word;">${data.weight_percentage}</td>
                                                <td style="padding: 4px; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word;">${data.adjusted_value.toFixed(1)}%</td>
                                                <td style="padding: 4px; border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word;">${data.is_active ? '✓ Included' : '✗ Excluded'}</td>
                                            </tr>`
                                        ).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    ` : ''}
                    
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
                        <a href="/area-report.html" 
                           onclick="event.preventDefault(); if (typeof openFullReport === 'function') { openFullReport(${JSON.stringify(locationData).replace(/"/g, '&quot;')}); } else { var data = ${JSON.stringify(locationData).replace(/"/g, '&quot;')}; if (typeof data === 'string') data = JSON.parse(data); var activeLayers = (typeof getActiveLayersForDashboard === 'function') ? getActiveLayersForDashboard() : (typeof getActiveLayers === 'function' ? getActiveLayers() : ['poverty_index']); data._activeLayers = activeLayers; sessionStorage.setItem('areaReportData', JSON.stringify(data)); window.location.href='/area-report.html'; } return false;" 
                           style="display: inline-block; padding: 8px 16px; background: var(--primary-color); color: white; text-decoration: none; border-radius: 4px; font-size: 0.9rem; font-weight: 600; text-align: center; width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; line-height: 1.4;">
                            📄 View Full Report
                        </a>
                    </div>
                    
                    <p style="margin: 8px 0 0 0; font-size: 0.75rem; color: #999; text-align: center; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.3;">
                        Coordinates: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}
                    </p>
                </div>
            `;
            
            // Update marker popup with analysis
            if (this.userLocationMarker) {
                this.userLocationMarker.setPopupContent(popupContent);
                this.userLocationMarker.openPopup();
            }
            
        } catch (error) {
            console.error('Error showing location analysis:', error);
            alert(`Error analyzing location: ${error.message}`);
        }
    }
    
    formatIndicatorName(indicator) {
        const names = {
            'education_access': 'Education Access',
            'health_vulnerability': 'Health Vulnerability',
            'water_access': 'Water Access',
            'housing_quality': 'Housing Quality',
            'employment_rate': 'Employment Rate',
            'food_security': 'Food Security',
            'infrastructure_access': 'Infrastructure Access'
        };
        return names[indicator] || indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    exportData() {
        if (typeof sampleData === 'undefined') return;

        const dataStr = JSON.stringify(sampleData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ipmas-data.json';
        link.click();
        
        URL.revokeObjectURL(url);
        this.debug('Data exported');
    }

    runSimulation() {
        if (!this.currentLocation) {
            alert('Please click on the map to select a location first');
            return;
        }

        const simulationData = {
            type: document.getElementById('interventionType').value,
            scale: parseInt(document.getElementById('interventionScale').value),
            duration: parseInt(document.getElementById('interventionDuration').value),
            lat: this.currentLocation.lat,
            lng: this.currentLocation.lng
        };

        this.debug('Running simulation:', simulationData);

        if (this.socket && this.isConnected) {
            this.socket.emit('intervention-simulation', simulationData);
        } else {
            // Fallback simulation
            this.handleSimulationResults(this.mockSimulation(simulationData));
        }
    }

    mockSimulation(data) {
        return {
            id: Date.now(),
            type: data.type,
            impact: {
                poverty_reduction: Math.random() * 30 + 10,
                cost_estimate: data.scale * data.duration * 1000,
                success_probability: Math.random() * 0.4 + 0.6
            },
            recommendations: [
                'Conduct community needs assessment',
                'Establish monitoring framework',
                'Engage local stakeholders'
            ]
        };
    }

    updateChartType() {
        const chartType = document.getElementById('chartType').value;
        this.debug('Chart type changed to:', chartType);
        
        // Update all charts to new type
        Object.values(this.charts).forEach(chart => {
            chart.config.type = chartType;
            chart.update();
        });
    }

    updateCharts() {
        // Refresh chart data
        Object.values(this.charts).forEach(chart => {
            chart.update();
        });
        this.debug('Charts updated');
    }

    refreshStatistics() {
        this.updateStatistics();
        this.debug('Statistics refreshed');
    }

    updateStatistics() {
        // Prioritize processedLocations (from API) over sampleData
        const locations = this.processedLocations && this.processedLocations.length > 0 
            ? this.processedLocations 
            : (typeof sampleData !== 'undefined' && sampleData.locations ? sampleData.locations : []);
        
        if (!locations || locations.length === 0) return;

        const totalLocations = locations.length;
        const avgPoverty = locations.reduce((sum, loc) => sum + (loc.poverty_index || 0), 0) / totalLocations;
        const avgEducation = locations.reduce((sum, loc) => sum + (loc.education_access || 0), 0) / totalLocations;
        const avgHealth = locations.reduce((sum, loc) => sum + (loc.health_vulnerability || 0), 0) / totalLocations;
        const avgWater = locations.reduce((sum, loc) => sum + (loc.water_access || 0), 0) / totalLocations;

        // Update DOM elements with null checks
        const totalLocationsEl = document.getElementById('totalLocations');
        if (totalLocationsEl) totalLocationsEl.textContent = totalLocations;
        
        const avgPovertyIndexEl = document.getElementById('avgPovertyIndex');
        if (avgPovertyIndexEl) avgPovertyIndexEl.textContent = avgPoverty.toFixed(1);
        
        const waterMetricEl = document.getElementById('waterMetric');
        if (waterMetricEl) waterMetricEl.textContent = avgWater.toFixed(1);
        
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) lastUpdatedEl.textContent = new Date().toLocaleTimeString();
    }

    // ============================================
    // COMMENTED OUT: DHS Training Data Recalculated Markers
    // This method renders training data markers with recalculated values
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    updateMapMarkersWithRecalculatedData(recalculatedLocations) {
        // Update map markers with recalculated poverty indices
        if (!this.dashboardMap || !recalculatedLocations) return;

        // Clear existing markers
        if (this.dashboardMapLayers) {
            Object.values(this.dashboardMapLayers).forEach(layer => {
                layer.clearLayers();
            });
        }

        // Add updated markers with new poverty indices
        recalculatedLocations.forEach(location => {
            const povertyIndex = location.calculated_poverty_index || location.poverty_index;
            const level = this.dynamicCalculator ? this.dynamicCalculator.getPovertyLevel(povertyIndex) : this.getSeverityLevelData(povertyIndex);

            const marker = L.circleMarker([location.lat, location.lng], {
                radius: this.calculateMarkerSize(povertyIndex),
                fillColor: level.color,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <div class="popup-content">
                    <h3>${location.name || location.location_name}</h3>
                    <p><strong>County:</strong> ${location.county}</p>
                    <p><strong>Calculated Poverty Score:</strong> ${povertyIndex}%</p>
                    <p><strong>Level:</strong> ${level.level}</p>
                    ${location.confidence ? `<p><strong>Confidence:</strong> ${location.confidence}%</p>` : ''}
                    ${location.calculation_breakdown ? `
                        <details style="margin-top: 10px;">
                            <summary style="cursor: pointer; font-weight: bold;">📊 Calculation Breakdown</summary>
                            <div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">
                                <table style="width: 100%; font-size: 0.85em; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #f0f0f0;">
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd;">Factor</th>
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd;">Weight</th>
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd;">Score</th>
                                            <th style="padding: 4px; text-align: left; border: 1px solid #ddd;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${Object.entries(location.calculation_breakdown).map(([indicator, data]) => 
                                            `<tr style="background-color: ${data.is_active ? '#e8f5e9' : '#ffebee'};">
                                                <td style="padding: 4px; border: 1px solid #ddd;">${this.formatIndicatorName(indicator)}</td>
                                                <td style="padding: 4px; border: 1px solid #ddd;">${data.weight_percentage}</td>
                                                <td style="padding: 4px; border: 1px solid #ddd;">${data.adjusted_value.toFixed(1)}%</td>
                                                <td style="padding: 4px; border: 1px solid #ddd;">${data.is_active ? '✓ Included' : '✗ Excluded'}</td>
                                            </tr>`
                                        ).join('')}
                                    </tbody>
                                </table>
                                <p style="margin-top: 8px; font-size: 0.8em; color: #666;">
                                    <strong>Formula:</strong> Poverty Score = Σ(Weight × Score)<br>
                                    <em>Only checked layers contribute to the score</em>
                                </p>
                                <a href="/area-report.html" onclick="event.preventDefault(); if (typeof openFullReport === 'function') { openFullReport(${JSON.stringify(location).replace(/"/g, '&quot;')}); } else { var data = ${JSON.stringify(location).replace(/"/g, '&quot;')}; if (typeof data === 'string') data = JSON.parse(data); var activeLayers = (typeof getActiveLayersForDashboard === 'function') ? getActiveLayersForDashboard() : (typeof getActiveLayers === 'function' ? getActiveLayers() : ['poverty_index']); data._activeLayers = activeLayers; sessionStorage.setItem('areaReportData', JSON.stringify(data)); window.location.href='/area-report.html'; } return false;" 
                                   style="display: inline-block; background: var(--primary-color); color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 10px; text-align: center; width: 100%; font-size: 0.9em;">
                                    📄 View Full Detailed Report
                                </a>
                            </div>
                        </details>
                    ` : ''}
                </div>
            `);

            // Add to appropriate layer
            if (povertyIndex >= 70) {
                this.dashboardMapLayers.poverty.addLayer(marker);
            } else if (povertyIndex >= 50) {
                this.dashboardMapLayers.health.addLayer(marker);
            } else if (povertyIndex >= 30) {
                this.dashboardMapLayers.education.addLayer(marker);
            } else {
                this.dashboardMapLayers.water.addLayer(marker);
            }
        });
    }
    */
    // ============================================
    // Placeholder to prevent errors
    updateMapMarkersWithRecalculatedData(recalculatedLocations) {
        if (!this.dashboardMap || !recalculatedLocations) return;

        // Clear existing markers but don't add training data
        if (this.dashboardMapLayers) {
            Object.values(this.dashboardMapLayers).forEach(layer => {
                layer.clearLayers();
            });
        }

        // ============================================
        // COMMENTED OUT: Training data markers rendering
        // Markers will only appear for user-searched locations
        // ============================================
    }

    updateStatisticsDisplay(stats) {
        // Update statistics display with new calculated data
        if (!stats) return;

        // Update basic statistics
        const statsEl = document.getElementById('dynamicStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Average Poverty Index:</span>
                    <span class="stat-value">${stats.average_poverty_index}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Active Layers:</span>
                    <span class="stat-value">${stats.active_layers.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Critical Areas:</span>
                    <span class="stat-value">${stats.poverty_distribution.critical}</span>
                </div>
            `;
        }

        // Update dashboard severity distribution
        const dashboardCritical = document.getElementById('dashboardCritical');
        const dashboardHigh = document.getElementById('dashboardHigh');
        const dashboardModerate = document.getElementById('dashboardModerate');
        const dashboardLow = document.getElementById('dashboardLow');

        if (dashboardCritical) dashboardCritical.textContent = stats.poverty_distribution.critical;
        if (dashboardHigh) dashboardHigh.textContent = stats.poverty_distribution.high;
        if (dashboardModerate) dashboardModerate.textContent = stats.poverty_distribution.moderate;
        if (dashboardLow) dashboardLow.textContent = stats.poverty_distribution.low;
    }
    
    updateSeverityDistribution(locations) {
        // Calculate severity counts from locations array
        const distribution = {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0
        };
        
        locations.forEach(location => {
            const povertyIndex = location.poverty_index || 0;
            if (povertyIndex >= 70) distribution.critical++;
            else if (povertyIndex >= 50) distribution.high++;
            else if (povertyIndex >= 30) distribution.moderate++;
            else distribution.low++;
        });
        
        // Update dashboard severity distribution
        const dashboardCritical = document.getElementById('dashboardCritical');
        const dashboardHigh = document.getElementById('dashboardHigh');
        const dashboardModerate = document.getElementById('dashboardModerate');
        const dashboardLow = document.getElementById('dashboardLow');

        if (dashboardCritical) dashboardCritical.textContent = distribution.critical;
        if (dashboardHigh) dashboardHigh.textContent = distribution.high;
        if (dashboardModerate) dashboardModerate.textContent = distribution.moderate;
        if (dashboardLow) dashboardLow.textContent = distribution.low;
    }

    formatIndicatorName(indicator) {
        return indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getSeverityLevelData(povertyIndex) {
        if (povertyIndex >= 70) {
            return { level: 'Critical', color: '#d73027' };
        } else if (povertyIndex >= 50) {
            return { level: 'High', color: '#fc8d59' };
        } else if (povertyIndex >= 30) {
            return { level: 'Moderate', color: '#fee08b' };
        } else {
            return { level: 'Low', color: '#91cf60' };
        }
    }

    updateLocationStatistics(lat, lng) {
        // Find nearest location in sample data
        let nearestLocation = null;
        let minDistance = Infinity;

        if (typeof sampleData !== 'undefined') {
            sampleData.locations.forEach(location => {
                const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestLocation = location;
                }
            });
        }

        if (nearestLocation) {
            const povertyMetricEl = document.getElementById('povertyMetric');
            if (povertyMetricEl) povertyMetricEl.textContent = nearestLocation.poverty_index.toFixed(1);
            
            const educationMetricEl = document.getElementById('educationMetric');
            if (educationMetricEl) educationMetricEl.textContent = nearestLocation.education_access.toFixed(1);
            
            const healthMetricEl = document.getElementById('healthMetric');
            if (healthMetricEl) healthMetricEl.textContent = nearestLocation.health_vulnerability.toFixed(1);
            
            const waterMetricEl = document.getElementById('waterMetric');
            if (waterMetricEl) waterMetricEl.textContent = nearestLocation.water_access.toFixed(1);
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    updateConnectionStatus(status, text, reason = {}) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = text;
        }

        // Update global connection status object
        try {
            window.connectionStatus = {
                mode: status === 'online' ? 'online' : 'offline',
                label: text,
                reasonCode: reason.code || null,
                reasonMessage: reason.message || null,
                lastChecked: new Date().toISOString()
            };

            // Notify listeners (e.g., Settings page) about status change
            document.dispatchEvent(new CustomEvent('connectionStatusChanged', {
                detail: window.connectionStatus
            }));
        } catch (e) {
            // Ignore failures updating global status
        }
    }

    updateSystemStatus(data) {
        // Safely update status elements if they exist
        const serverStatusEl = document.getElementById('serverStatus');
        if (serverStatusEl) {
            serverStatusEl.textContent = `Server: ${data.status}`;
        }
        
        const clientCountEl = document.getElementById('clientCount');
        if (clientCountEl) {
            clientCountEl.textContent = `Clients: ${data.connectedClients || 0}`;
        }
        
        // Log status for debugging (optional)
        if (this.debugMode) {
            this.debug('System status update:', data);
        }
    }

    handleLocationUpdate(data) {
        this.debug('Location update received:', data);
        // Handle real-time location updates
    }

    handleFilterUpdate(data) {
        this.debug('Filter update received:', data);
        // Handle real-time filter updates
    }

    handleSimulationResults(data) {
        this.debug('Simulation results received:', data);
        
        // Display results in a modal or notification
        const message = `
            Simulation Results:
            Type: ${data.type}
            Poverty Reduction: ${data.impact.poverty_reduction.toFixed(1)}%
            Cost Estimate: $${data.impact.cost_estimate.toLocaleString()}
            Success Probability: ${(data.impact.success_probability * 100).toFixed(1)}%
        `;
        
        alert(message);
    }

    handleChatMessage(data) {
        this.debug('Chat message received:', data);
        // Handle chat messages
    }

    handlePovertyDataUpdate(data) {
        this.debug('Poverty data update received:', data);
        
        // Update processed locations if they exist
        if (this.processedLocations && Array.isArray(this.processedLocations)) {
            const index = this.processedLocations.findIndex(
                loc => loc.name === data.name && loc.county === data.county
            );
            
            if (index !== -1) {
                // Update existing location
                this.processedLocations[index] = {
                    ...this.processedLocations[index],
                    poverty_index: data.poverty_index || this.processedLocations[index].poverty_index,
                    education_access: data.education_access || this.processedLocations[index].education_access,
                    health_vulnerability: data.health_vulnerability || this.processedLocations[index].health_vulnerability,
                    water_access: data.water_access || this.processedLocations[index].water_access,
                    employment_rate: data.employment_rate || this.processedLocations[index].employment_rate,
                    housing_quality: data.housing_quality || this.processedLocations[index].housing_quality
                };
            } else {
                // Add new location
                this.processedLocations.push({
                    name: data.name,
                    county: data.county,
                    lat: data.lat,
                    lng: data.lng,
                    poverty_index: data.poverty_index || 0,
                    education_access: data.education_access || 0,
                    health_vulnerability: data.health_vulnerability || 0,
                    water_access: data.water_access || 0,
                    employment_rate: data.employment_rate || 0,
                    housing_quality: data.housing_quality || 0
                });
            }
        }
        
        // Update map markers if dashboard map exists
        if (this.dashboardMap && data.lat && data.lng) {
            this.updateMapWithLocation(data);
        }
        
        // Update charts and statistics
        this.updateStatistics();
        
        // Show notification
        if (this.showNotification) {
            this.showNotification(
                `Poverty data updated for ${data.name}, ${data.county}`,
                'success'
            );
        }
    }

    /**
     * Handle real-time data enrichment from Socket.IO
     */
    handleDataEnrichment(data) {
        const { location, data: enrichedData, timestamp } = data;
        
        console.log('📊 Processing enriched data for:', location.name);
        
        // Update location data if it matches current search
        if (window.dashboardSearchMarker && window.dashboardSearchMarker.locationData) {
            const searchData = window.dashboardSearchMarker.locationData;
            if (Math.abs(searchData.lat - location.lat) < 0.001 && 
                Math.abs(searchData.lng - location.lng) < 0.001) {
                
                // Merge enriched data
                Object.assign(searchData, enrichedData);
                searchData.enriched = true;
                searchData.enrichedAt = timestamp;
                
                // Recalculate if popup is open
                if (window.dashboardSearchMarker.recalculatePopup) {
                    const recalc = window.dashboardSearchMarker.recalculatePopup();
                    window.dashboardSearchMarker.setPopupContent(recalc.popupContent);
                    if (window.dashboardSearchMarker.isPopupOpen && window.dashboardSearchMarker.isPopupOpen()) {
                        window.dashboardSearchMarker.openPopup();
                    }
                }
                
                console.log('✅ Updated search location with enriched data');
                if (this.showNotification) {
                    this.showNotification(`Data enriched for ${location.name}`, 'success');
                }
            }
        }
        
        // Update processed locations
        if (this.processedLocations && Array.isArray(this.processedLocations)) {
            const index = this.processedLocations.findIndex(
                loc => Math.abs(loc.lat - location.lat) < 0.001 && 
                       Math.abs(loc.lng - location.lng) < 0.001
            );
            if (index !== -1) {
                this.processedLocations[index] = { ...this.processedLocations[index], ...enrichedData };
            }
        }
    }

    /**
     * Handle fallback data stream from Socket.IO
     */
    handleFallbackData(data) {
        const { location, fallback } = data;
        
        // Store fallback options for user selection
        if (!this.fallbackDataOptions) {
            this.fallbackDataOptions = new Map();
        }
        
        const key = `${location.lat}_${location.lng}`;
        if (!this.fallbackDataOptions.has(key)) {
            this.fallbackDataOptions.set(key, []);
        }
        
        this.fallbackDataOptions.get(key).push(fallback);
        
        // If this is the last fallback option, offer user choice
        if (fallback.index === fallback.total) {
            console.log(`📊 All fallback options received (${fallback.total} total)`);
            // Could show UI to let user select which nearby location to use
        }
    }

    /**
     * Request real-time data enrichment for a location
     */
    requestDataEnrichment(locationData) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot request enrichment');
            return;
        }
        
        console.log('📊 Requesting data enrichment for:', locationData.name || 'Unknown');
        this.socket.emit('request-data-enrichment', locationData);
        
        // Also subscribe for future updates
        this.socket.emit('subscribe-location-enrichment', locationData);
    }

    /**
     * Request fallback data stream
     */
    requestFallbackData(locationData) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ Socket not connected, cannot request fallback data');
            return;
        }
        
        console.log('🔄 Requesting fallback data for:', locationData.name || 'Unknown');
        this.socket.emit('request-fallback-data', locationData);
    }

    updateMapWithLocation(locationData) {
        if (!this.dashboardMap || !locationData.lat || !locationData.lng) return;
        
        // Remove existing marker for this location if it exists
        this.dashboardMap.eachLayer((layer) => {
            if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
                const lat = layer.getLatLng ? layer.getLatLng().lat : layer.latlng?.lat;
                const lng = layer.getLatLng ? layer.getLatLng().lng : layer.latlng?.lng;
                
                if (Math.abs(lat - locationData.lat) < 0.001 && 
                    Math.abs(lng - locationData.lng) < 0.001) {
                    this.dashboardMap.removeLayer(layer);
                }
            }
        });
        
        // Add or update marker with new data
        const povertyIndex = locationData.poverty_index || 0;
        const color = this.getSeverityColor(povertyIndex);
        
        const marker = L.circleMarker([locationData.lat, locationData.lng], {
            radius: 8,
            fillColor: color,
            color: '#000',
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7
        });
        
        marker.bindPopup(`
            <div class="poverty-popup">
                <h3>${locationData.name}</h3>
                <p><strong>County:</strong> ${locationData.county}</p>
                <p><strong>Poverty Index:</strong> ${locationData.poverty_index || 0}%</p>
                <p><strong>Education Access:</strong> ${locationData.education_access || 0}%</p>
                <p><strong>Water Access:</strong> ${locationData.water_access || 0}%</p>
                <p><em>Updated: ${new Date().toLocaleString()}</em></p>
            </div>
        `);
        
        marker.addTo(this.dashboardMap);
    }

    toggleDebug() {
        this.debugMode = !this.debugMode;
        const console = document.getElementById('debugConsole');
        if (console) {
            console.style.display = this.debugMode ? 'block' : 'none';
        }
        this.debug('Debug console toggled');
    }

    clearDebug() {
        const debugContent = document.getElementById('debugContent');
        if (debugContent) {
            debugContent.innerHTML = '';
        }
        this.debug('Debug console cleared');
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
        this.debug('Fullscreen toggled');
    }

    // Real-time functionality methods
    toggleRealtimeUpdates() {
        if (this.isRealtimeEnabled) {
            this.stopRealtimeUpdates();
        } else {
            this.startRealtimeUpdates();
        }
    }

    startRealtimeUpdates() {
        this.isRealtimeEnabled = true;
        this.realtimeInterval = setInterval(() => {
            this.fetchRealtimeData();
        }, this.refreshInterval);

        const btn = document.getElementById('toggleRealtimeBtn');
        if (btn) {
            btn.textContent = '⏹️ Disable Real-Time Updates';
            btn.classList.add('btn-danger');
            btn.classList.remove('btn-primary');
        }

        // Initial data fetch
        this.fetchRealtimeData();
        
        console.log(`✅ Real-time updates started (${this.refreshInterval/1000}s interval)`);
        this.debug(`Real-time updates started (${this.refreshInterval/1000}s interval)`);
    }

    stopRealtimeUpdates() {
        this.isRealtimeEnabled = false;
        if (this.realtimeInterval) {
            clearInterval(this.realtimeInterval);
            this.realtimeInterval = null;
        }

        const btn = document.getElementById('toggleRealtimeBtn');
        if (btn) {
            btn.textContent = '🔄 Enable Real-Time Updates';
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-danger');
        }

        console.log('⏹️ Real-time updates stopped');
        this.debug('Real-time updates stopped');
    }

    async fetchRealtimeData() {
        try {
            console.log('📡 Fetching real-time poverty data...');
            
            // Try to fetch from API first, fallback to sample data
            let data;
            try {
                const response = await fetch(this.dataEndpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    data = await response.json();
                    console.log('✅ Real-time data fetched from API');
                } else {
                    throw new Error(`API request failed: ${response.status}`);
                }
            } catch (error) {
                console.warn('⚠️ API unavailable, using sample data:', error.message);
                // Fallback to sample data
                if (typeof sampleData !== 'undefined' && sampleData.locations) {
                    data = {
                        type: "FeatureCollection",
                        features: sampleData.locations.map(location => ({
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: [location.lng, location.lat]
                            },
                            properties: {
                                name: location.name,
                                county: location.county,
                                ward: location.ward,
                                poverty_index: location.poverty_index,
                                education_access: location.education_access,
                                health_vulnerability: location.health_vulnerability,
                                water_access: location.water_access,
                                housing_quality: location.housing_quality,
                                population: location.population,
                                last_updated: new Date().toISOString()
                            }
                        }))
                    };
                } else {
                    console.error('❌ No sample data available');
                    return;
                }
            }

            // Update the map layer
            this.updateRealtimePovertyLayer(data);
            
            // Update refresh status
            this.updateRefreshStatus();
            
        } catch (error) {
            console.error('❌ Failed to fetch real-time data:', error);
            this.debug(`Failed to fetch real-time data: ${error.message}`);
        }
    }

    // ============================================
    // COMMENTED OUT: DHS Training Data Real-Time Rendering
    // This method renders training data in real-time updates
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    updateRealtimePovertyLayer(data) {
        if (!this.map || !data.features) return;

        // Remove existing poverty layer
        if (this.povertyLayer) {
            this.map.removeLayer(this.povertyLayer);
        }

        // Create new poverty layer with real-time data
        this.povertyLayer = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                const poverty = feature.properties.poverty_index;
                return L.circleMarker(latlng, {
                    radius: this.calculateMarkerSize(poverty),
                    fillColor: this.getColorForPoverty(poverty),
                    color: '#000',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                });
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                layer.bindPopup(`
                    <div class="popup-content">
                        <h3>${props.name}</h3>
                        <p><strong>County:</strong> ${props.county}</p>
                        <p><strong>Ward:</strong> ${props.ward}</p>
                        <p><strong>Poverty Index:</strong> ${props.poverty_index}%</p>
                        <p><strong>Education Access:</strong> ${props.education_access}%</p>
                        <p><strong>Health Vulnerability:</strong> ${props.health_vulnerability}%</p>
                        <p><strong>Water Access:</strong> ${props.water_access}%</p>
                        <p><strong>Housing Quality:</strong> ${props.housing_quality}%</p>
                        <p><strong>Population:</strong> ${props.population?.toLocaleString() || 'N/A'}</p>
                        <p><strong>Last Updated:</strong> ${new Date(props.last_updated).toLocaleString()}</p>
                    </div>
                `);
                layer.properties = props;
            }
        }).addTo(this.map);

        console.log(`✅ Updated poverty layer with ${data.features.length} locations`);
        this.debug(`Updated poverty layer with ${data.features.length} locations`);
    }
    */
    // ============================================
    // Placeholder to prevent errors
    updateRealtimePovertyLayer(data) {
        if (!this.map || !data.features) return;

        // Remove existing poverty layer
        if (this.povertyLayer) {
            this.map.removeLayer(this.povertyLayer);
        }

        // ============================================
        // COMMENTED OUT: Training data rendering
        // Real-time updates will not show training data markers
        // ============================================
    }

    updateRefreshStatus() {
        const statusElement = document.getElementById('refreshStatus');
        if (statusElement) {
            const now = new Date();
            statusElement.textContent = `Last update: ${now.toLocaleTimeString()}`;
        }
    }

    // Global search functionality
    setupSearchListeners() {
        const searchInput = document.getElementById('locationSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput) return;

        // Search on Enter key or after typing delay
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                this.hideSearchResults();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300); // 300ms delay
        });

        // Search on Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    this.performSearch(query);
                }
            } else if (e.key === 'Escape') {
                this.hideSearchResults();
                searchInput.blur();
            }
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        });
    }

    async performSearch(query) {
        try {
            console.log('🔍 Searching for:', query);
            this.showSearchLoading(true);
            
            // Track search usage
            if (window.usageTracker) {
                window.usageTracker.trackSearch();
            }
            
            // Check if query looks like coordinates
            if (this.isCoordinateQuery(query)) {
                await this.searchByCoordinates(query);
                return;
            }
            
            // Use Nominatim for geocoding
            const results = await this.searchWithNominatim(query);
            
            if (results && results.length > 0) {
                this.displaySearchResults(results);
            } else {
                this.showNoResults();
            }
            
        } catch (error) {
            console.error('Search error:', error);
            // Provide more helpful error messages
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Unable to connect to search service. Please check your internet connection or ensure the backend server is running.';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'Cross-origin request blocked. Please check backend CORS configuration.';
            }
            this.showSearchError(errorMessage);
        } finally {
            this.showSearchLoading(false);
        }
    }

    isCoordinateQuery(query) {
        // Check for coordinate patterns: "lat, lng", "lat lng", "lat,lng"
        const coordPattern = /^-?\d+\.?\d*[,\s]+-?\d+\.?\d*$/;
        return coordPattern.test(query.trim());
    }

    async searchByCoordinates(query) {
        const coords = query.split(/[,\s]+/).map(coord => parseFloat(coord.trim()));
        
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            throw new Error('Invalid coordinates format. Use: latitude, longitude');
        }
        
        const [lat, lng] = coords;
        
        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new Error('Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180');
        }
        
        const result = {
            lat: lat,
            lng: lng,
            display_name: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            type: 'coordinates'
        };
        
        this.goToLocation(result);
        this.hideSearchResults();
    }

    async searchWithNominatim(query) {
        // Try backend API first
        try {
            const apiUrl = window.API_CONFIG 
                ? window.API_CONFIG.getApiUrl(this.geocodingEndpoint)
                : `http://localhost:3001${this.geocodingEndpoint}`;
            
            const url = new URL(apiUrl);
            url.searchParams.set('q', query);
            url.searchParams.set('limit', '10');
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (backendError) {
            console.warn('Backend geocoding failed, falling back to Nominatim:', backendError);
            // Fallback to direct Nominatim API if backend is unavailable
            const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
            nominatimUrl.searchParams.set('q', query);
            nominatimUrl.searchParams.set('format', 'json');
            nominatimUrl.searchParams.set('limit', '10');
            nominatimUrl.searchParams.set('addressdetails', '1');
            nominatimUrl.searchParams.set('extratags', '1');
            
            const response = await fetch(nominatimUrl.toString(), {
                method: 'GET',
                headers: {
                    'User-Agent': 'IPMAS-System/1.0 (https://ipmas.kenya.gov)',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Geocoding service error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            // Transform Nominatim response to match expected format
            return data.map(item => ({
                lat: item.lat,
                lon: item.lon,
                display_name: item.display_name,
                type: item.type || item.class,
                address: item.address
            }));
        }
    }

    displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
        
        searchResults.innerHTML = '';
        
        results.slice(0, 8).forEach((result, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'search-result';
            
            const displayName = this.escapeHtml(result.display_name);
            const type = this.escapeHtml(this.getLocationType(result));
            const hierarchy = this.formatLocationHierarchy(result);
            const coordinates = this.formatCoordinates(result.lat, result.lon);
            
            wrapper.innerHTML = `
                <div class="search-result-item" role="option" tabindex="0" data-index="${index}">
                    <div class="search-result-content">
                        <div class="search-result-name">${displayName}</div>
                        <div class="search-result-details">
                            <span class="search-result-type">${type}</span>
                            ${hierarchy ? `<span class="search-result-hierarchy">${hierarchy}</span>` : ''}
                        </div>
                    </div>
                    <div class="search-result-meta">
                        <div class="search-result-coords">${coordinates}</div>
                        <div class="search-result-icon" aria-hidden="true">↗</div>
                    </div>
                </div>
            `;
            
            const interactiveRow = wrapper.querySelector('.search-result-item');
            interactiveRow.addEventListener('click', () => {
                this.goToLocation(result);
                this.hideSearchResults();
            });
            
            interactiveRow.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.goToLocation(result);
                    this.hideSearchResults();
                }
            });
            
            searchResults.appendChild(wrapper);
        });
        
        searchResults.style.display = 'block';
    }

    getLocationType(result) {
        if (result.type) return result.type;
        if (result.class) return result.class;
        if (result.category) return result.category;
        return 'Location';
    }

    formatCoordinates(lat, lon) {
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        
        const safeLat = Number.isFinite(parsedLat) ? parsedLat.toFixed(4) : '0.0000';
        const safeLon = Number.isFinite(parsedLon) ? parsedLon.toFixed(4) : '0.0000';
        
        return `${safeLat}, ${safeLon}`;
    }

    formatLocationHierarchy(result) {
        if (!result || !result.address) return '';
        
        const address = result.address;
        const hierarchyCandidates = [
            address.neighbourhood,
            address.suburb,
            address.village || address.hamlet,
            address.town || address.city || address.municipality,
            address.county || address.state_district,
            address.state || address.region,
            address.country
        ];
        
        const uniqueParts = [];
        hierarchyCandidates.forEach(part => {
            if (!part) return;
            const trimmed = part.toString().trim();
            if (!trimmed) return;
            if (!uniqueParts.includes(trimmed)) {
                uniqueParts.push(trimmed);
            }
        });
        
        if (!uniqueParts.length) return '';
        
        return uniqueParts
            .slice(0, 4)
            .map(part => this.escapeHtml(part))
            .join(' • ');
    }

    async goToLocation(result) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Remove previous search marker
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
        }
        
        // Pan to location
        this.map.setView([lat, lng], 15);
        
        // Add marker
        this.searchMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'search-marker',
                html: '<div class="search-marker-icon">📍</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            })
        }).addTo(this.map);
        
        // Show popup
        const popupContent = this.createLocationPopup(result);
        this.searchMarker.bindPopup(popupContent).openPopup();
        
        console.log('📍 Navigated to:', result.display_name);
    }

    createLocationPopup(result) {
        const name = this.escapeHtml(result.display_name);
        const coords = `${parseFloat(result.lat).toFixed(6)}, ${parseFloat(result.lon).toFixed(6)}`;
        const type = this.getLocationType(result);
        
        let details = '';
        if (result.address) {
            const addr = result.address;
            if (addr.city || addr.town || addr.village) details += `<br><strong>City:</strong> ${addr.city || addr.town || addr.village}`;
            if (addr.state || addr.county) details += `<br><strong>State/County:</strong> ${addr.state || addr.county}`;
            if (addr.country) details += `<br><strong>Country:</strong> ${addr.country}`;
        }
        
        return `
            <div class="search-popup">
                <h4>${name}</h4>
                <p><strong>Type:</strong> ${type}</p>
                <p><strong>Coordinates:</strong> ${coords}</p>
                ${details}
            </div>
        `;
    }

    showSearchLoading(show) {
        const searchInput = document.getElementById('locationSearch');
        if (!searchInput) return;
        
        if (show) {
            searchInput.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23666\' d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z\'/%3E%3C/svg%3E")';
            searchInput.style.backgroundRepeat = 'no-repeat';
            searchInput.style.backgroundPosition = 'right 10px center';
            searchInput.style.backgroundSize = '16px 16px';
        } else {
            searchInput.style.backgroundImage = 'none';
        }
    }

    showNoResults() {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
        
        searchResults.innerHTML = '<div class="search-no-results">No locations found</div>';
        searchResults.style.display = 'block';
    }

    showSearchError(message) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
        
        searchResults.innerHTML = `<div class="search-error">Error: ${this.escapeHtml(message)}</div>`;
        searchResults.style.display = 'block';
    }

    hideSearchResults() {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.style.display = 'none';
            searchResults.innerHTML = '';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    applyStoredUserProfile() {
        try {
            const saved = localStorage.getItem('ipmas_user_data');
            if (!saved) return;
            const data = JSON.parse(saved);
            if (data) {
                if (data.profile) {
                    this.userProfile = data.profile;
                    this.updateGlobalProfileDisplay(data.profile);
                }
                if (data.preferences) {
                    this.applyPreferenceChanges(data.preferences);
                }
            }
         } catch (error) {
             console.warn('Unable to load stored user profile:', error);
         }
     }

    updateGlobalProfileDisplay(profile) {
        if (!profile) return;
        this.userProfile = profile;
        
        // Only update avatar if user is actually authenticated
        // But prioritize subscription manager's user data over localStorage profile
        const subscriptionManager = window.subscriptionManager;
        const isAuthenticated = subscriptionManager && subscriptionManager.currentUser;
        
        if (isAuthenticated) {
            // If subscription manager has user data, use that instead of localStorage profile
            // This prevents showing hardcoded "JD" from localStorage
            const actualUser = subscriptionManager.currentUser;
            if (actualUser && (actualUser.username || actualUser.email)) {
                // Subscription manager will handle avatar display with actual user data
                // Don't override it with localStorage profile data
                // Just update other profile displays
            } else {
                // Fallback: use profile data if subscription manager doesn't have user data yet
                const initials = this.generateInitials(profile.fullName || profile.email || '');
                document.querySelectorAll('.user-avatar').forEach(avatar => {
                    avatar.textContent = initials;
                    avatar.setAttribute('title', profile.fullName || profile.email || '');
                });
            }
        } else {
            // User is not authenticated, let subscription manager show "Sign up"
            // Don't update avatar - subscription manager will handle it
        }

        // Always update other profile displays (name, email, etc.)
        document.querySelectorAll('[data-user-name]').forEach(el => {
            el.textContent = profile.fullName || '';
        });

        document.querySelectorAll('[data-user-email]').forEach(el => {
            el.textContent = profile.email || '';
        });
    }

    applyPreferenceChanges(preferences) {
        if (!preferences) return;
        this.userPreferences = { ...this.userPreferences, ...preferences };
        if (preferences.mapStyle) {
            this.applyMapStyle(preferences.mapStyle);
        }
        if (preferences.theme && window.themeManager && typeof window.themeManager.setTheme === 'function') {
            window.themeManager.setTheme(preferences.theme);
        }
        if (preferences.autoRefresh && this.isRealtimeEnabled) {
            this.refreshInterval = parseInt(preferences.autoRefresh, 10) * 1000;
            this.stopRealtimeUpdates();
            this.startRealtimeUpdates();
        }
    }

    applyMapStyle(style) {
        const selectedStyle = style || this.userPreferences.mapStyle || 'default';
        if (!this.dashboardMap) {
            this.pendingMapStyle = selectedStyle;
            return;
        }

        const { url, options } = this.getTileLayerConfig(selectedStyle);
        if (!url) return;

        if (this.mapStyleLayer) {
            this.dashboardMap.removeLayer(this.mapStyleLayer);
        }

        this.mapStyleLayer = L.tileLayer(url, options);
        this.mapStyleLayer.addTo(this.dashboardMap);
        this.currentMapStyle = selectedStyle;
    }

    getTileLayerConfig(style) {
        switch (style) {
            case 'satellite':
                return {
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    options: {
                        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                        maxZoom: 19
                    }
                };
            case 'terrain':
                return {
                    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                    options: {
                        attribution: 'Map data: © OpenStreetMap contributors, SRTM | Style: © OpenTopoMap (CC-BY-SA)',
                        maxZoom: 17
                    }
                };
            case 'default':
            default:
                return {
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    options: {
                        attribution: '© OpenStreetMap contributors',
                        maxZoom: 18
                    }
                };
        }
    }

    generateInitials(name) {
        if (!name) return 'Sign in';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'Sign in';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ipmasApp = new IPMASApp();
});

// Manual test function for debugging
function testSelectedAreaAnalytics() {
    console.log('🧪 Testing Selected Area Analytics...');
    
    if (window.ipmasApp) {
        // Test area selection
        window.ipmasApp.selectArea('nairobi');
        
        // Test refresh
        setTimeout(() => {
            window.ipmasApp.refreshSelectedAreaData();
        }, 2000);
        
        console.log('✅ Test completed - check console for results');
    } else {
        console.error('❌ IPMAS app not available');
    }
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.ipmasApp) {
        window.ipmasApp.debug(`Page visibility: ${document.visibilityState}`);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.ipmasApp && window.ipmasApp.map) {
        setTimeout(() => {
            window.ipmasApp.map.invalidateSize();
        }, 100);
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    if (window.ipmasApp && window.ipmasApp.socket) {
        window.ipmasApp.socket.disconnect();
    }
});

// Map Control Functions
function resetMapView() {
    if (window.ipmasApp && window.ipmasApp.dashboardMap) {
        window.ipmasApp.dashboardMap.setView([-1.2921, 36.8219], 6);
    }
}

function toggleMapLayers() {
    if (window.ipmasApp) {
        // Toggle all layer checkboxes (both desktop and mobile)
        const layerCheckboxes = [
            { desktop: 'povertyLayer', mobile: 'povertyLayerMobile' },
            { desktop: 'educationLayer', mobile: 'educationLayerMobile' },
            { desktop: 'healthLayer', mobile: 'healthLayerMobile' },
            { desktop: 'waterLayer', mobile: 'waterLayerMobile' },
            { desktop: 'shelterLayer', mobile: 'shelterLayerMobile' }
        ];
        
        layerCheckboxes.forEach(({ desktop, mobile }) => {
            // Prefer desktop checkbox if available, otherwise use mobile
            const checkbox = document.getElementById(desktop) || document.getElementById(mobile);
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
            }
        });
        
        // Update map layers (this will sync both checkboxes)
        window.ipmasApp.updateMapLayers();
    }
}

// Navigation Functions
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function toggleNavDropdown() {
    const dropdown = document.getElementById('navDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        // Close user dropdown if open
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.style.display = 'none';
        }
    }
}

function closeNavDropdown() {
    const dropdown = document.getElementById('navDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function goToSettings() {
    window.location.href = '/settings.html';
}

function goToDashboard() {
    window.location.href = '/';
}

function goToProjects() {
    window.location.href = '/projects.html';
}

function goToPovertyModels() {
    window.location.href = '/poverty-models.html';
}


function viewHistory() {
    // TODO: Implement history view
    console.log('View history clicked');
}

function submitFeedback() {
    // TODO: Implement feedback submission
    console.log('Submit feedback clicked');
}

function logout() {
    // Use subscription manager logout if available
    if (window.subscriptionManager && typeof window.subscriptionManager.logout === 'function') {
        window.subscriptionManager.logout();
    } else {
        // Fallback: clear session and redirect
        localStorage.removeItem('ipmas_session_token');
        document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/';
    }
}

// Global map layer function
function updateMapLayers() {
    // Keep calculator in sync with checkbox state
    try {
        if (window.ipmasApp && window.ipmasApp.dynamicCalculator) {
            window.ipmasApp.dynamicCalculator.updateActiveLayers();
            console.log('🔄 Updated active layers (global):', Array.from(window.ipmasApp.dynamicCalculator.activeLayers));
        }
    } catch (e) {
        console.warn('Active layer sync failed:', e?.message || e);
    }

    // Refresh map layers if handler exists
    if (window.ipmasApp && window.ipmasApp.updateMapLayers) {
        window.ipmasApp.updateMapLayers();
    }
}


// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const avatar = document.getElementById('userAvatar');
    
    if (dropdown && avatar && !avatar.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

