/**
 * IPMAS2 - Poverty Mapping System
 * Advanced poverty visualization with hotspot analysis and regional mapping
 */

class PovertyMapSystem {
    constructor() {
        this.map = null;
        this.povertyData = null;
        this.processedLocations = []; // Store API locations like dashboard
        this.hotspotLayers = [];
        this.choroplethLayer = null;
        this.mlPredictionLayer = null; // ML predictions GeoJSON layer
        this.mlPredictions = []; // Store ML predictions for overlay
        this.currentFilters = {
            severity: 'all',
            region: 'all',
            layer: 'hotspots'
        };
        this.dynamicCalculator = null; // Dynamic poverty calculator
        
        this.init();
    }

    async init() {
        try {
            this.showLoading(true);
            this.updateConnectionStatus('offline', 'Offline Mode');
            
            // Initialize dynamic calculator
            this.initializeDynamicCalculator();
            
            // Initialize map
            await this.initializeMap();
            
            // ============================================
            // Clear any existing markers/layers on startup
            // This ensures map starts blank (no training data visible)
            // ============================================
            if (this.map) {
                this.clearMapLayers();
                // Also clear any existing layers that might be on the map
                // Wait a bit to ensure map is fully loaded
                setTimeout(() => {
                    this.map.eachLayer((layer) => {
                        // Remove CircleMarkers, Markers, and Circles (but keep base tile layers)
                        if ((layer instanceof L.CircleMarker || layer instanceof L.Marker || (layer instanceof L.Circle && !(layer instanceof L.TileLayer))) &&
                            (!layer.options || !layer.options.isSearchMarker)) {
                            try {
                                this.map.removeLayer(layer);
                            } catch (e) {
                                // Ignore errors if layer already removed
                            }
                        }
                    });
                    // Clear hotspot layers array
                    this.hotspotLayers = [];
                }, 300);
            }
            // ============================================
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load poverty data
            await this.loadPovertyData();
            
            // Initialize charts with mock data
            this.initializeCharts();
            
            this.showLoading(false);
            console.log('🗺️ Poverty Map System initialized successfully');
            this.debug('Poverty Map System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Poverty Map System:', error);
            this.showError('Failed to initialize poverty mapping system');
            this.showLoading(false);
        }
    }

    initializeDynamicCalculator() {
        if (typeof DynamicPovertyCalculator !== 'undefined') {
            this.dynamicCalculator = new DynamicPovertyCalculator();
            console.log('✅ Dynamic Poverty Calculator initialized');
            this.debug('Dynamic poverty calculator initialized');
        } else {
            console.warn('⚠️ DynamicPovertyCalculator not available - dynamic layer calculation disabled');
        }
    }

    async initializeMap() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Leaflet is available
                if (typeof L === 'undefined') {
                    console.log('ℹ️ Leaflet.js not available - skipping map initialization');
                    this.debug('Leaflet not loaded - running in non-map mode');
                    resolve();
                    return;
                }

                // Check if map container exists
                const mapElement = document.getElementById('poverty-map');
                if (!mapElement) {
                    console.log('ℹ️ No map container found - skipping map initialization');
                    this.debug('No map container - running in non-map mode');
                    resolve();
                    return;
                }

                console.log('🗺️ Initializing poverty map...');
                this.debug('Starting poverty map initialization');

                // Initialize Leaflet map with Kenya focus
                this.map = L.map('poverty-map').setView([-1.2921, 36.8219], 6);
                console.log('🗺️ Map created:', this.map);
                
                // Add OpenStreetMap tiles
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(this.map);

                // Add map controls
                this.addMapControls();
                
                this.debug('Poverty map initialized successfully');
                resolve();
                
            } catch (error) {
                console.error('Map initialization error:', error);
                reject(error);
            }
        });
    }

    addMapControls() {
        // Add scale control
        L.control.scale({
            position: 'bottomright',
            metric: true,
            imperial: false
        }).addTo(this.map);

        // Disable default zoom controls (using custom control panel instead)
        // Leaflet zoom controls are disabled via CSS
    }

    setupEventListeners() {
        // Filter controls
        const severityFilter = document.getElementById('severityFilter');
        const regionFilter = document.getElementById('regionFilter');

        if (severityFilter) {
            severityFilter.addEventListener('change', (e) => {
                this.currentFilters.severity = e.target.value;
                this.applyFilters();
                this.showFilterFeedback('severity', e.target.value);
            });
        }

        if (regionFilter) {
            regionFilter.addEventListener('change', (e) => {
                this.currentFilters.region = e.target.value;
                this.applyFilters();
                this.showFilterFeedback('region', e.target.value);
            });
        }

        // Add real-time search for region filter
        if (regionFilter) {
            regionFilter.addEventListener('input', (e) => {
                // Debounce the input for better performance
                clearTimeout(this.regionSearchTimeout);
                this.regionSearchTimeout = setTimeout(() => {
                    this.currentFilters.region = e.target.value;
                    this.applyFilters();
                }, 300);
            });
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'r':
                        e.preventDefault();
                        this.resetFilters();
                        break;
                    case 'f':
                        e.preventDefault();
                        severityFilter?.focus();
                        break;
                }
            }
        });

        this.debug('Poverty map event listeners setup complete');
    }

    showFilterFeedback(type, value) {
        const feedbackEl = document.getElementById('filterFeedback');
        if (feedbackEl) {
            const message = value === 'all' 
                ? `${type} filter cleared` 
                : `${type} filter set to: ${value}`;
            feedbackEl.textContent = message;
            feedbackEl.style.display = 'block';
            setTimeout(() => {
                feedbackEl.style.display = 'none';
            }, 2000);
        }
    }

    resetFilters() {
        this.currentFilters = {
            severity: 'all',
            region: 'all',
            layer: 'hotspots'
        };
        
        // Reset form elements
        const severityFilter = document.getElementById('severityFilter');
        const regionFilter = document.getElementById('regionFilter');
        
        if (severityFilter) severityFilter.value = 'all';
        if (regionFilter) regionFilter.value = 'all';
        
        this.applyFilters();
        console.log('🔄 All filters reset');
    }

    updateQuickStats() {
        if (!this.povertyData) return;

        const totalLocations = this.povertyData.hotspots.reduce((sum, hotspot) => sum + hotspot.region_count, 0);
        const criticalAreas = this.povertyData.hotspots.filter(h => h.severity === 'critical').reduce((sum, hotspot) => sum + hotspot.region_count, 0);
        const avgPovertyIndex = this.povertyData.hotspots.reduce((sum, hotspot) => sum + hotspot.average_poverty_score, 0) / this.povertyData.hotspots.length;

        const totalLocationsEl = document.getElementById('totalLocations');
        const criticalAreasEl = document.getElementById('criticalAreas');
        const avgPovertyIndexEl = document.getElementById('avgPovertyIndex');

        if (totalLocationsEl) totalLocationsEl.textContent = totalLocations;
        if (criticalAreasEl) criticalAreasEl.textContent = criticalAreas;
        if (avgPovertyIndexEl) avgPovertyIndexEl.textContent = avgPovertyIndex.toFixed(1);
    }

    async loadPovertyData() {
        console.log('📊 Loading poverty data...');
        
        try {
            // Try to fetch from API first
            const apiUrl = window.API_CONFIG 
                ? window.API_CONFIG.getApiUrl('/api/v1/analytics/poverty/all')
                : 'http://localhost:3001/api/v1/analytics/poverty/all';
            
            console.log(`Fetching from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const apiData = await response.json();
                console.log(`✅ API data loaded: ${apiData.features?.length || 0} locations`);
                
                // Convert GeoJSON features to locations array (like dashboard)
                if (apiData.features && apiData.features.length > 0) {
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
                    console.log(`📊 Poverty Map: Loaded ${locations.length} locations from API`);
                    console.log(`📊 Poverty Map: Sample locations:`, locations.slice(0, 3).map(l => `${l.name}: ${l.poverty_index}`));
                    
                    // ============================================
                    // COMMENTED OUT: DHS Training Data Markers
                    // Uncomment below to restore training data markers on map
                    // ============================================
                    // Add markers to map
                    // this.addMarkersFromLocations(locations);
                    // ============================================
                    this.updateQuickStats();
                    this.debug('Poverty data loaded from API');
                    return;
                }
            } else {
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.warn('⚠️ API unavailable, trying sample data:', error.message);
            
            // Fallback to sample data if available
            if (typeof sampleData !== 'undefined' && sampleData.locations) {
                console.log(`Using sample data: ${sampleData.locations.length} locations`);
                this.processedLocations = sampleData.locations;
                // ============================================
                // COMMENTED OUT: DHS Training Data Markers
                // Uncomment below to restore training data markers on map
                // ============================================
                // this.addMarkersFromLocations(sampleData.locations);
                // ============================================
                this.updateQuickStats();
                this.debug('Poverty data loaded from sample data');
            } else {
                // Last resort: generate fallback data
                console.warn('No sample data available, generating fallback data');
                this.povertyData = this.generateFallbackData();
                // ============================================
                // COMMENTED OUT: DHS Training Data Rendering
                // Uncomment below to restore training data visualization on map
                // ============================================
                // this.renderPovertyMap();
                // ============================================
                this.debug('Using fallback poverty data');
            }
        }
    }
    
    convertGeoJSONToHotspots(geoJson) {
        // Convert GeoJSON FeatureCollection to hotspot format (with clusters by severity)
        const severityGroups = {
            critical: [],
            high: [],
            moderate: [],
            low: []
        };

        if (geoJson.features && geoJson.features.length > 0) {
            geoJson.features.forEach(feature => {
                const props = feature.properties;
                const poverty = parseFloat(props.poverty_index) || 0;
                const severity = this.getSeverityFromScore(poverty);
                
                const point = {
                    geometry: {
                        coordinates: feature.geometry.coordinates
                    },
                    properties: {
                        name: props.name,
                        county: props.county,
                        ward: props.ward,
                        poverty_index: poverty,
                        education_access: props.education_access,
                        health_vulnerability: props.health_vulnerability,
                        water_access: props.water_access,
                        housing_quality: props.housing_quality,
                        severity: severity
                    }
                };
                
                severityGroups[severity].push(point);
            });
        }

        // Create hotspots for each severity level (matching processSampleData format)
        const hotspots = [];
        Object.keys(severityGroups).forEach(severity => {
            if (severityGroups[severity].length > 0) {
                hotspots.push({
                    severity: severity,
                    average_poverty_score: this.calculateAverageScore(severityGroups[severity]),
                    region_count: severityGroups[severity].length,
                    cluster: severityGroups[severity]
                });
            }
        });

        return {
            hotspots: hotspots,
            severityGroups: severityGroups,
            total: geoJson.features ? geoJson.features.length : 0
        };
    }

    processSampleData(locations) {
        // Process sample data into hotspot format
        const hotspots = [];
        const severityGroups = {
            critical: [],
            high: [],
            moderate: [],
            low: []
        };

        locations.forEach(location => {
            const severity = this.getSeverityFromScore(location.poverty_index);
            severityGroups[severity].push({
                geometry: {
                    coordinates: [location.lng, location.lat]
                },
                properties: {
                    name: location.name,
                    county: location.county,
                    ward: location.ward,
                    poverty_index: location.poverty_index,
                    severity: severity
                }
            });
        });

        // Create hotspots for each severity level
        Object.keys(severityGroups).forEach(severity => {
            if (severityGroups[severity].length > 0) {
                hotspots.push({
                    severity: severity,
                    average_poverty_score: this.calculateAverageScore(severityGroups[severity]),
                    region_count: severityGroups[severity].length,
                    cluster: severityGroups[severity]
                });
            }
        });

        return { hotspots };
    }

    // ============================================
    // COMMENTED OUT: DHS Training Data Markers
    // This method adds individual markers for each DHS training data location
    // Uncomment entire method below to restore training data markers on map
    // ============================================
    /*
    addMarkersFromLocations(locations) {
        console.log(`📍 Adding ${locations.length} markers from data...`);
        
        if (!this.map) {
            console.warn('⚠️ Map not initialized');
            return;
        }

        try {
            let markersAdded = 0;
            
            locations.forEach((location, index) => {
                try {
                    const marker = L.circleMarker([location.lat, location.lng], {
                        radius: this.calculateMarkerSize(location.poverty_index),
                        fillColor: this.getSeverityColorFromIndex(location.poverty_index),
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // Calculate severity from poverty index
                    const severity = this.getSeverityFromScore(location.poverty_index);
                    
                    // Format location with hierarchical structure
                    const formattedMarkerLocation = formatLocationName(location);
                    
                    const popupContent = `
                        <div class="popup-content">
                            <h3>Poverty Analysis</h3>
                            <p><strong>Location:</strong> ${formattedMarkerLocation}</p>
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

                    marker.addTo(this.map);
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

    calculateMarkerSize(povertyIndex) {
        // Same logic as main.js
        if (povertyIndex >= 70) return 12;
        if (povertyIndex >= 50) return 10;
        if (povertyIndex >= 30) return 8;
        return 6;
    }

    getSeverityColorFromIndex(povertyIndex) {
        // Same colors as dashboard
        if (povertyIndex >= 70) return '#d73027'; // Critical - Red
        if (povertyIndex >= 50) return '#fc8d59'; // High - Orange
        if (povertyIndex >= 30) return '#fee08b'; // Moderate - Yellow
        return '#91cf60'; // Low - Green
    }

    getSeverityFromScore(score) {
        if (score >= 70) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 30) return 'moderate';
        return 'low';
    }

    calculateAverageScore(cluster) {
        const total = cluster.reduce((sum, point) => sum + point.properties.poverty_index, 0);
        return total / cluster.length;
    }

    generateFallbackData() {
        // Generate sample hotspot data for demonstration
        return {
            hotspots: [
                {
                    severity: 'critical',
                    average_poverty_score: 75.2,
                    region_count: 5,
                    cluster: [
                        { geometry: { coordinates: [36.8219, -1.2921] }, properties: { name: 'Nairobi Central', poverty_index: 75 } },
                        { geometry: { coordinates: [36.8000, -1.3000] }, properties: { name: 'Eastleigh', poverty_index: 78 } }
                    ]
                },
                {
                    severity: 'high',
                    average_poverty_score: 60.5,
                    region_count: 8,
                    cluster: [
                        { geometry: { coordinates: [36.7000, -1.2000] }, properties: { name: 'Kibera', poverty_index: 65 } },
                        { geometry: { coordinates: [36.9000, -1.4000] }, properties: { name: 'Mathare', poverty_index: 58 } }
                    ]
                }
            ]
        };
    }

    // ============================================
    // COMMENTED OUT: DHS Training Data Rendering
    // This method renders all DHS training data clusters/hotspots on the map
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    renderPovertyMap() {
        console.log('🎨 Rendering poverty map...');
        console.log('🗺️ Map exists:', !!this.map);
        console.log('📊 Data exists:', !!this.povertyData);
        
        if (!this.map) {
            console.log('❌ Cannot render: map not initialized');
            this.showLoading(false);
            return;
        }

        if (!this.povertyData) {
            console.log('❌ Cannot render: data not loaded');
            this.showLoading(false);
            return;
        }

        // Clear existing layers
        this.clearMapLayers();

        // Always use hotspot layers for real API data
        // Dynamic calculator can be used for sample data if needed
        this.renderHotspotLayers();

        // Hide loading overlay after rendering completes
        this.showLoading(false);
        this.debug('Poverty map rendered successfully');
    }
    */
    // ============================================

    // ============================================
    // COMMENTED OUT: DHS Training Data Dynamic Rendering
    // This method renders dynamic markers for training data locations
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    renderDynamicPovertyMap() {
        // Update active layers from checkboxes
        if (this.dynamicCalculator) {
            this.dynamicCalculator.updateActiveLayers();
            
            // Recalculate all locations
            const recalculatedLocations = this.dynamicCalculator.recalculateAllLocations(sampleData.locations);
            
            // Render markers with new calculated scores
            recalculatedLocations.forEach(location => {
                const povertyScore = location.calculated_poverty_index || location.poverty_index;
                const level = this.dynamicCalculator.getPovertyLevel(povertyScore);

                const marker = L.circleMarker([location.lat, location.lng], {
                    radius: this.calculateMarkerSize(povertyScore),
                    fillColor: level.color,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                // Format location with hierarchical structure
                const formattedLocation = formatLocationName(location);
                
                marker.bindPopup(`
                    <div class="poverty-popup">
                        <h3>${location.name || location.location_name}</h3>
                        <p><strong>Location:</strong> ${formattedLocation}</p>
                        <p><strong>Calculated Poverty Score:</strong> ${povertyScore}%</p>
                        <p><strong>Level:</strong> ${level.level}</p>
                        ${location.confidence ? `<p><strong>Confidence:</strong> ${location.confidence}%</p>` : ''}
                        ${location.calculation_breakdown ? `
                            <button onclick="showLocationBreakdown(${JSON.stringify(location).replace(/"/g, '&quot;')})" 
                                    style="background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 12px; width: 100%; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                📊 Calculation Breakdown
                            </button>
                        ` : ''}
                    </div>
                `, { 
                    maxWidth: 300,
                    className: 'custom-popup'
                });

                this.hotspotLayers.push(marker);
                marker.addTo(this.map);
            });

            // Update statistics
            this.updateDynamicStatistics(recalculatedLocations);
        }
    }
    */
    // ============================================

    clearMapLayers() {
        this.hotspotLayers.forEach(layer => this.map.removeLayer(layer));
        this.hotspotLayers = [];
        
        if (this.choroplethLayer) {
            this.map.removeLayer(this.choroplethLayer);
            this.choroplethLayer = null;
        }
        
        if (this.mlPredictionLayer) {
            this.map.removeLayer(this.mlPredictionLayer);
            this.mlPredictionLayer = null;
        }
    }

    // ============================================
    // COMMENTED OUT: DHS Training Data Hotspot Rendering
    // This method renders all DHS clusters/hotspots on the map
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    renderHotspotLayers() {
        let filteredCount = 0;
        let totalCount = 0;

        this.povertyData.hotspots.forEach(hotspot => {
            totalCount += hotspot.cluster.length;
            
            // Apply severity filter
            if (this.currentFilters.severity !== 'all' && 
                hotspot.severity !== this.currentFilters.severity) {
                return;
            }

            // Apply region filter
            if (this.currentFilters.region !== 'all') {
                const hasRegionMatch = hotspot.cluster.some(point => 
                    point.properties.county && 
                    point.properties.county.toLowerCase().includes(this.currentFilters.region.toLowerCase())
                );
                if (!hasRegionMatch) return;
            }

            const color = this.getSeverityColor(hotspot.severity);
            
            hotspot.cluster.forEach(point => {
                // Additional region filtering at point level
                if (this.currentFilters.region !== 'all' && 
                    point.properties.county && 
                    !point.properties.county.toLowerCase().includes(this.currentFilters.region.toLowerCase())) {
                    return;
                }

                // Use individual location's poverty_index for proper color and size
                const locationPovertyIndex = point.properties.poverty_index || 0;
                const locationSeverity = this.getSeverityFromScore(locationPovertyIndex);
                const locationColor = this.getSeverityColor(locationSeverity);

                const circle = L.circleMarker([point.geometry.coordinates[1], point.geometry.coordinates[0]], {
                    radius: this.calculateMarkerSize(locationPovertyIndex),
                    fillColor: locationColor,
                    color: '#000',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                }).addTo(this.map);

                // Create location object from GeoJSON properties for formatting
                const pointLocation = {
                    name: point.properties.name || 'Unknown',
                    county: point.properties.county || '',
                    sub_county: point.properties.sub_county || point.properties.subcounty || '',
                    ward: point.properties.ward || '',
                    village: point.properties.village || ''
                };
                const formattedPointLocation = formatLocationName(pointLocation);
                
                circle.bindPopup(`
                    <div class="poverty-popup">
                        <h3>Poverty Analysis</h3>
                        <p><strong>Location:</strong> ${formattedPointLocation}</p>
                        <p><strong>Poverty Index:</strong> ${locationPovertyIndex.toFixed(1)}%</p>
                        <p><strong>Severity:</strong> ${locationSeverity}</p>
                        ${point.properties.education_access ? `<p><strong>Education:</strong> ${point.properties.education_access}%</p>` : ''}
                        ${point.properties.health_vulnerability ? `<p><strong>Health:</strong> ${point.properties.health_vulnerability}%</p>` : ''}
                        ${point.properties.water_access ? `<p><strong>Water:</strong> ${point.properties.water_access}%</p>` : ''}
                    </div>
                `);

                this.hotspotLayers.push(circle);
                filteredCount++;
            });
        });

        // Update stats with filtered results
        this.updateFilteredStats(filteredCount, totalCount);
        console.log(`🎯 Rendered ${filteredCount} markers (${totalCount} total)`);
    }
    */
    // ============================================

    // ============================================
    // COMMENTED OUT: DHS Training Data Choropleth Rendering
    // This method renders choropleth layer from training data
    // Uncomment entire method below to restore training data visualization
    // ============================================
    /*
    async renderChoroplethLayer() {
        try {
            // For now, create a simple choropleth from sample data
            const regions = this.createRegionalData();
            
            this.choroplethLayer = L.geoJSON(regions, {
                style: (feature) => {
                    const povertyScore = feature.properties.poverty_index || 0;
                    return {
                        fillColor: this.getColorForScore(povertyScore),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    // Format location from GeoJSON feature properties
                    const featureLocation = {
                        name: feature.properties.name || '',
                        county: feature.properties.county || '',
                        sub_county: feature.properties.sub_county || feature.properties.subcounty || '',
                        ward: feature.properties.ward || '',
                        village: feature.properties.village || ''
                    };
                    const formattedFeatureLocation = formatLocationName(featureLocation);
                    
                    layer.bindPopup(`
                        <div class="region-popup">
                            <h3>${feature.properties.name}</h3>
                            <p><strong>Location:</strong> ${formattedFeatureLocation}</p>
                            <p>Poverty Index: ${feature.properties.poverty_index}</p>
                            <p>Severity: ${feature.properties.severity}</p>
                            <button onclick="viewRegionDetail('${feature.properties.id}')">
                                View Details
                            </button>
                        </div>
                    `);
                }
            }).addTo(this.map);

        } catch (error) {
            console.error('Error rendering choropleth layer:', error);
        }
    }
    */
    // ============================================

    createRegionalData() {
        // Create GeoJSON from sample data
        const features = [];
        
        if (typeof sampleData !== 'undefined' && sampleData.locations) {
            sampleData.locations.forEach((location, index) => {
                features.push({
                    type: 'Feature',
                    properties: {
                        id: `region_${index}`,
                        name: location.name,
                        county: location.county,
                        poverty_index: location.poverty_index,
                        severity: this.getSeverityFromScore(location.poverty_index)
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [location.lng, location.lat]
                    }
                });
            });
        }

        return {
            type: 'FeatureCollection',
            features: features
        };
    }

    getSeverityColor(severity) {
        const colors = {
            critical: '#d73027',
            high: '#fc8d59',
            moderate: '#fee08b',
            low: '#91cf60'
        };
        return colors[severity] || '#999';
    }

    getColorForScore(score) {
        return score > 70 ? '#d73027' :
               score > 50 ? '#fc8d59' :
               score > 30 ? '#fee08b' :
               '#91cf60';
    }

    applyFilters() {
        console.log('🔍 Applying filters:', this.currentFilters);
        // ============================================
        // COMMENTED OUT: DHS Training Data Rendering
        // Uncomment below to restore training data visualization when filters change
        // ============================================
        // this.renderPovertyMap();
        // ============================================
        this.debug('Filters applied successfully');
    }

    // Method to apply advanced filters from AdvancedFilters component
    applyAdvancedFilters(filteredData) {
        if (!this.map || !filteredData || filteredData.length === 0) {
            console.log('⚠️ Cannot apply advanced filters: missing map or data');
            return;
        }

        console.log(`🔍 Applying advanced filters to ${filteredData.length} locations`);
        
        // Clear existing markers
        this.clearMapLayers();
        
        // Create a Set of filtered location IDs for quick lookup
        const filteredIds = new Set(filteredData.map(loc => {
            return loc.id || `${loc.lat}_${loc.lng}` || `${loc.lat}_${loc.lng}_${loc.name}`;
        }));
        
        // ============================================
        // COMMENTED OUT: DHS Training Data Hotspot Rendering in Filters
        // This section renders training data clusters when applying filters
        // Uncomment below to restore training data rendering when filters are applied
        // ============================================
        /*
        // If we have processed poverty data, filter it
        if (this.povertyData && this.povertyData.hotspots) {
            this.povertyData.hotspots.forEach(hotspot => {
                hotspot.cluster.forEach(point => {
                    const locationId = `${point.geometry.coordinates[1]}_${point.geometry.coordinates[0]}`;
                    const name = point.properties.name || '';
                    
                    // Check if this location is in filtered data
                    let shouldShow = false;
                    for (let filteredLoc of filteredData) {
                        const filteredId = filteredLoc.id || `${filteredLoc.lat}_${filteredLoc.lng}` || `${filteredLoc.lat}_${filteredLoc.lng}_${filteredLoc.name}`;
                        if (filteredId === locationId || 
                            (filteredLoc.name && name && filteredLoc.name.toLowerCase() === name.toLowerCase())) {
                            shouldShow = true;
                            break;
                        }
                    }
                    
                    if (shouldShow) {
                        const color = this.getSeverityColor(hotspot.severity);
                        const circle = L.circleMarker([point.geometry.coordinates[1], point.geometry.coordinates[0]], {
                            radius: this.calculateMarkerSize(hotspot.average_poverty_score),
                            fillColor: color,
                            color: '#000',
                            weight: 1,
                            opacity: 0.8,
                            fillOpacity: 0.7
                        }).addTo(this.map);

                        // Create location object from point properties for formatting
                        const hotspotLocation = {
                            name: point.properties.name || 'Unknown',
                            county: point.properties.county || '',
                            sub_county: point.properties.sub_county || point.properties.subcounty || '',
                            ward: point.properties.ward || '',
                            village: point.properties.village || ''
                        };
                        const formattedHotspotLocation = formatLocationName(hotspotLocation);
                        
                        circle.bindPopup(`
                            <div class="poverty-popup">
                                <h3>Poverty Analysis</h3>
                                <p><strong>Severity:</strong> ${hotspot.severity}</p>
                                <p><strong>Score:</strong> ${hotspot.average_poverty_score.toFixed(2)}</p>
                                <p><strong>Location:</strong> ${formattedHotspotLocation}</p>
                            </div>
                        `);
                        
                        this.hotspotLayers.push(circle);
                    }
                });
            });
        } else {
        */
        // ============================================
        // Only render user-searched/filtered locations (not training data)
        if (true) {
            // If we don't have processed data, work directly with filtered data
            filteredData.forEach(location => {
                const severity = this.getSeverityFromScore(location.poverty_index || 0);
                const color = this.getSeverityColor(severity);
                
                const circle = L.circleMarker([location.lat, location.lng], {
                    radius: this.calculateMarkerSize(location.poverty_index || 0),
                    fillColor: color,
                    color: '#000',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                }).addTo(this.map);

                // Format location with hierarchical structure
                const formattedMLLocation = formatLocationName(location);
                
                // Create popup with ML prediction button
                const popupContent = `
                    <div class="poverty-popup">
                        <h3>${location.name || 'Location'}</h3>
                        <p><strong>Location:</strong> ${formattedMLLocation}</p>
                        <p><strong>Poverty Index:</strong> ${(location.poverty_index || 0).toFixed(1)}%</p>
                        <p><strong>Severity:</strong> ${severity}</p>
                        <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                            <button onclick="window.povertyMapSystem.getMLPrediction({
                                lat: ${location.lat},
                                lng: ${location.lng},
                                county: '${location.county || 'Unknown'}',
                                poverty_index: ${location.poverty_index || 0}
                            })" class="btn-ml-predict" style="
                                width: 100%;
                                padding: 8px;
                                background: var(--primary-color);
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                font-weight: 600;
                                margin-top: 5px;
                            ">
                                🤖 Get ML Prediction
                            </button>
                        </div>
                        <div id="ml-result-${location.id || 'default'}" style="margin-top: 10px;"></div>
                    </div>
                `;
                
                circle.bindPopup(popupContent);
                
                this.hotspotLayers.push(circle);
            });
        }
        
        // Update statistics
        this.updateFilteredStats(filteredData.length, filteredData.length);
        console.log(`✅ Advanced filters applied: ${filteredData.length} markers displayed`);
    }

    switchMapLayer() {
        console.log('🔄 Switching map layer:', this.currentFilters.layer);
        // ============================================
        // COMMENTED OUT: DHS Training Data Rendering
        // Uncomment below to restore training data visualization when layer changes
        // ============================================
        // this.renderPovertyMap();
        // ============================================
        this.debug('Map layer switched successfully');
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        console.error(message);
        // You could add a toast notification here
    }

    async getMLPrediction(locationData) {
        console.log('🤖 Getting ML prediction for:', locationData);
        
        try {
            // Ensure locationData has all required fields
            const fullLocationData = {
                lat: locationData.lat,
                lng: locationData.lng,
                id: locationData.id || `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                county: locationData.county || 'Unknown',
                sub_county: locationData.sub_county || locationData.subcounty || '',
                ward: locationData.ward || '',
                village: locationData.village || '',
                name: locationData.name || locationData.location_name || 'Location',
                poverty_index: locationData.poverty_index || null,
                education_access: locationData.education_access || null,
                health_vulnerability: locationData.health_vulnerability || null,
                water_access: locationData.water_access || null,
                employment_rate: locationData.employment_rate || null,
                housing_quality: locationData.housing_quality || null
            };

            // Call the ML API endpoint with location data for storage
            const response = await fetch('http://localhost:3001/api/v1/analytics/ml-predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    householdData: {
                        hv271: fullLocationData.poverty_index ? (100 - fullLocationData.poverty_index) * 1000 : 50000,
                        hv009: 5,  // Sample household size
                        hv012: 2,  // Sample women count
                        hv013: 2   // Sample men count
                    },
                    locationData: {
                        lat: fullLocationData.lat,
                        lng: fullLocationData.lng,
                        county: fullLocationData.county
                    }
                })
            });

            const result = await response.json();
            
            if (result.success && result.prediction) {
                // Validate prediction against known indicators
                const validation = this.validatePrediction(result.prediction, fullLocationData);
                
                // Store prediction for layer overlay
                this.addPredictionToLayer(result.prediction, fullLocationData, validation);
                
                const predictionDiv = document.getElementById(`ml-result-${fullLocationData.id || 'default'}`);
                if (predictionDiv) {
                    const validationHTML = this.formatValidationHTML(validation);
                    predictionDiv.innerHTML = `
                        <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; border-left: 4px solid #4caf50;">
                            <strong>🤖 ML Prediction:</strong>
                            <p style="margin: 5px 0 0 0; font-size: 1.1rem; font-weight: bold; color: var(--primary-color);">
                                ${result.prediction.poverty_index.toFixed(1)}% poverty
                            </p>
                            <p style="margin: 3px 0 0 0; font-size: 0.85rem; color: #666;">
                                Confidence: ${(result.prediction.confidence * 100).toFixed(0)}% | Model: ${result.prediction.model}
                            </p>
                            ${validationHTML}
                            <p style="margin: 8px 0 0 0; font-size: 0.8rem; color: #4caf50; font-weight: 500;">
                                ✅ Saved to database | ✅ Added to ML Prediction Layer
                            </p>
                        </div>
                    `;
                }
                console.log('✅ ML Prediction:', result.prediction.poverty_index);
                console.log('✅ Validation:', validation);
                console.log('✅ ML Predictions stored:', this.mlPredictions.length);
            } else {
                throw new Error('Invalid prediction result');
            }
        } catch (error) {
            console.error('ML prediction error:', error);
            const predictionDiv = document.getElementById(`ml-result-${locationData.id || 'default'}`);
            if (predictionDiv) {
                predictionDiv.innerHTML = `
                    <div style="background: #ffebee; padding: 10px; border-radius: 5px; border-left: 4px solid #f44336;">
                        <strong>⚠️ Prediction Error</strong>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #666;">
                            Could not get ML prediction. Using fallback heuristic.
                        </p>
                    </div>
                `;
            }
        }
    }

    /**
     * Validate ML prediction against known indicators
     * @param {Object} prediction - ML prediction result
     * @param {Object} locationData - Location data with known indicators
     * @returns {Object} Validation results
     */
    validatePrediction(prediction, locationData) {
        const validation = {
            predicted_value: prediction.poverty_index,
            actual_value: locationData.poverty_index || null,
            difference: null,
            percentage_error: null,
            accuracy_status: 'unknown',
            indicator_comparisons: {}
        };

        // Compare with known poverty_index if available
        if (locationData.poverty_index !== null && locationData.poverty_index !== undefined) {
            validation.difference = Math.abs(prediction.poverty_index - locationData.poverty_index);
            validation.percentage_error = (validation.difference / locationData.poverty_index) * 100;
            
            // Determine accuracy status
            if (validation.difference <= 5) {
                validation.accuracy_status = 'excellent';
            } else if (validation.difference <= 10) {
                validation.accuracy_status = 'good';
            } else if (validation.difference <= 20) {
                validation.accuracy_status = 'moderate';
            } else {
                validation.accuracy_status = 'poor';
            }
        }

        // Compare with other known indicators
        const indicators = ['education_access', 'health_vulnerability', 'water_access', 'employment_rate', 'housing_quality'];
        
        indicators.forEach(indicator => {
            if (locationData[indicator] !== null && locationData[indicator] !== undefined) {
                // Calculate expected correlation (simplified heuristic)
                // Higher education/water/employment should correlate with lower poverty
                const expectedPoverty = this.estimatePovertyFromIndicator(indicator, locationData[indicator]);
                const indicatorError = Math.abs(prediction.poverty_index - expectedPoverty);
                
                validation.indicator_comparisons[indicator] = {
                    actual: locationData[indicator],
                    expected_poverty: expectedPoverty,
                    prediction_error: indicatorError,
                    correlation_valid: indicatorError <= 15
                };
            }
        });

        return validation;
    }

    /**
     * Estimate poverty from a single indicator (simplified heuristic)
     * @param {String} indicator - Indicator name
     * @param {Number} value - Indicator value
     * @returns {Number} Estimated poverty index
     */
    estimatePovertyFromIndicator(indicator, value) {
        // Simplified inverse correlation: higher indicator = lower poverty (generally)
        // This is a heuristic, not a real ML model
        switch (indicator) {
            case 'education_access':
                // Higher education = lower poverty (inverse relationship)
                return Math.max(0, Math.min(100, 100 - value));
            case 'water_access':
                // Higher water access = lower poverty
                return Math.max(0, Math.min(100, 100 - value * 0.8));
            case 'employment_rate':
                // Higher employment = lower poverty
                return Math.max(0, Math.min(100, 100 - value * 0.9));
            case 'health_vulnerability':
                // Higher vulnerability = higher poverty (direct relationship)
                return Math.max(0, Math.min(100, value));
            case 'housing_quality':
                // Higher quality = lower poverty
                return Math.max(0, Math.min(100, 100 - value * 0.7));
            default:
                return 50; // Default estimate
        }
    }

    /**
     * Format validation results as HTML
     * @param {Object} validation - Validation results
     * @returns {String} HTML string
     */
    formatValidationHTML(validation) {
        if (!validation.actual_value) {
            return '<p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #999;">⚠️ No known value for comparison</p>';
        }

        const statusColors = {
            'excellent': '#4caf50',
            'good': '#8bc34a',
            'moderate': '#ff9800',
            'poor': '#f44336'
        };

        const statusLabels = {
            'excellent': 'Excellent',
            'good': 'Good',
            'moderate': 'Moderate',
            'poor': 'Needs Improvement'
        };

        const color = statusColors[validation.accuracy_status] || '#999';
        const label = statusLabels[validation.accuracy_status] || 'Unknown';

        let html = `
            <div style="margin: 8px 0 0 0; padding: 8px; background: #f5f5f5; border-radius: 4px; border-left: 3px solid ${color};">
                <strong style="font-size: 0.85rem; color: #333;">📊 Validation:</strong>
                <p style="margin: 4px 0; font-size: 0.8rem; color: #666;">
                    <strong>Actual:</strong> ${validation.actual_value.toFixed(1)}% | 
                    <strong>Predicted:</strong> ${validation.predicted_value.toFixed(1)}% | 
                    <strong>Difference:</strong> ${validation.difference.toFixed(1)}%
                </p>
                <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: ${color}; font-weight: 500;">
                    Accuracy: ${label} (${validation.percentage_error.toFixed(1)}% error)
                </p>
            </div>
        `;

        // Add indicator comparisons if available
        const validComparisons = Object.entries(validation.indicator_comparisons)
            .filter(([_, data]) => data.correlation_valid === false);
        
        if (validComparisons.length > 0) {
            html += `
                <p style="margin: 5px 0 0 0; font-size: 0.75rem; color: #ff9800;">
                    ⚠️ Some indicator correlations show discrepancies
                </p>
            `;
        }

        return html;
    }

    /**
     * Add prediction to ML prediction layer overlay
     * @param {Object} prediction - ML prediction result
     * @param {Object} locationData - Location data
     * @param {Object} validation - Validation results
     */
    addPredictionToLayer(prediction, locationData, validation) {
        // Ensure map is initialized
        if (!this.map) {
            console.error('⚠️ Map not initialized, cannot add ML prediction layer');
            return;
        }

        // Store prediction data with proper structure
        const predictionData = {
            poverty_index: prediction.poverty_index,
            confidence: prediction.confidence,
            model: prediction.model,
            location: {
                lat: locationData.lat,
                lng: locationData.lng,
                id: locationData.id,
                county: locationData.county || 'Unknown',
                sub_county: locationData.sub_county || locationData.subcounty || '',
                ward: locationData.ward || '',
                village: locationData.village || '',
                name: locationData.name || locationData.location_name || 'Location',
                poverty_index: locationData.poverty_index || null,
                education_access: locationData.education_access || null,
                health_vulnerability: locationData.health_vulnerability || null,
                water_access: locationData.water_access || null,
                employment_rate: locationData.employment_rate || null,
                housing_quality: locationData.housing_quality || null
            },
            validation: validation,
            timestamp: new Date().toISOString()
        };

        // Check if prediction already exists for this location (avoid duplicates)
        const existingIndex = this.mlPredictions.findIndex(p => 
            Math.abs(p.location.lat - locationData.lat) < 0.0001 && 
            Math.abs(p.location.lng - locationData.lng) < 0.0001
        );
        
        if (existingIndex >= 0) {
            // Update existing prediction
            this.mlPredictions[existingIndex] = predictionData;
            console.log('🔄 Updated existing ML prediction for location');
        } else {
            // Add new prediction
            this.mlPredictions.push(predictionData);
            console.log('➕ Added new ML prediction to layer');
        }

        console.log(`📊 Total ML predictions: ${this.mlPredictions.length}`);

        // Update or create the layer
        this.updateMLPredictionLayer();
    }

    /**
     * Update ML prediction GeoJSON layer overlay
     */
    updateMLPredictionLayer() {
        if (!this.map || this.mlPredictions.length === 0) return;

        // Remove existing layer if it exists
        if (this.mlPredictionLayer) {
            this.map.removeLayer(this.mlPredictionLayer);
        }

        // Create GeoJSON features from predictions
        const features = this.mlPredictions.map(pred => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [pred.location.lng, pred.location.lat]
            },
            properties: {
                predicted_poverty: pred.poverty_index,
                actual_poverty: pred.validation.actual_value,
                difference: pred.validation.difference,
                accuracy_status: pred.validation.accuracy_status,
                confidence: pred.confidence,
                model: pred.model,
                county: pred.location.county || '',
                sub_county: pred.location.sub_county || pred.location.subcounty || '',
                ward: pred.location.ward || '',
                timestamp: pred.timestamp
            }
        }));

        const geoJsonData = {
            type: 'FeatureCollection',
            features: features
        };

        // Create GeoJSON layer with custom styling - make markers more visible
        this.mlPredictionLayer = L.geoJSON(geoJsonData, {
            pointToLayer: (feature, latlng) => {
                const props = feature.properties;
                const color = this.getColorForPrediction(props.predicted_poverty, props.accuracy_status);
                
                // Make ML prediction markers MUCH larger and highly visible
                // Use a distinct style to stand out from regular markers
                return L.circleMarker(latlng, {
                    radius: 15, // Very large radius for high visibility
                    fillColor: color,
                    color: '#000', // Black border for contrast
                    weight: 4, // Very thick border
                    opacity: 1,
                    fillOpacity: 0.9, // Very opaque
                    className: 'ml-prediction-marker', // Add class for styling
                    // Add a pulsing animation effect
                    pane: 'markerPane' // Ensure it's on the marker pane
                });
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const formattedLocation = formatLocationName({
                    county: props.county,
                    sub_county: props.sub_county,
                    ward: props.ward
                });

                const popupContent = `
                    <div class="ml-prediction-popup">
                        <h4 style="margin: 0 0 8px 0; color: var(--primary-color);">🤖 ML Prediction</h4>
                        <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Location:</strong> ${formattedLocation}</p>
                        <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Predicted Poverty:</strong> ${props.predicted_poverty.toFixed(1)}%</p>
                        ${props.actual_poverty !== null ? `
                            <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Actual Poverty:</strong> ${props.actual_poverty.toFixed(1)}%</p>
                            <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Difference:</strong> ${props.difference.toFixed(1)}%</p>
                            <p style="margin: 4px 0; font-size: 0.85rem; color: ${this.getAccuracyColor(props.accuracy_status)};">
                                Accuracy: ${props.accuracy_status.charAt(0).toUpperCase() + props.accuracy_status.slice(1)}
                            </p>
                        ` : ''}
                        <p style="margin: 4px 0; font-size: 0.85rem; color: #666;">
                            Confidence: ${(props.confidence * 100).toFixed(0)}% | Model: ${props.model}
                        </p>
                    </div>
                `;

                layer.bindPopup(popupContent);
            }
        }).addTo(this.map);

        // Ensure layer is on top and visible
        if (this.mlPredictionLayer) {
            this.mlPredictionLayer.bringToFront();
            console.log(`✅ ML Prediction layer updated with ${this.mlPredictions.length} predictions`);
            console.log(`📍 ML Prediction markers visible on map`);
            
            // Pan to show predictions if there's only one
            if (this.mlPredictions.length === 1) {
                const firstPred = this.mlPredictions[0];
                this.map.setView([firstPred.location.lat, firstPred.location.lng], 13, {
                    animate: true,
                    duration: 0.5
                });
            }
            
            // Add a visual indicator that ML predictions are active
            console.log(`💡 Tip: Look for colored markers (Blue/Green/Orange/Red) - these are ML predictions`);
        }
    }

    /**
     * Get color for ML prediction marker based on predicted value and accuracy
     * @param {Number} predictedPoverty - Predicted poverty index
     * @param {String} accuracyStatus - Accuracy status
     * @returns {String} Color code
     */
    getColorForPrediction(predictedPoverty, accuracyStatus) {
        // Base color on predicted poverty severity
        let baseColor = this.getSeverityColorFromIndex(predictedPoverty);
        
        // Use distinct colors for ML predictions to make them visible
        // Add a blue tint to distinguish from regular markers
        const mlColors = {
            'excellent': '#2196F3', // Blue for excellent
            'good': '#4CAF50',      // Green for good
            'moderate': '#FF9800',   // Orange for moderate
            'poor': '#F44336',       // Red for poor
            'unknown': '#9E9E9E'     // Gray for unknown
        };
        
        // If we have accuracy status, use it; otherwise use base color with blue tint
        if (accuracyStatus && accuracyStatus !== 'unknown') {
            return mlColors[accuracyStatus] || baseColor;
        }
        
        // Default: Use blue-tinted version of severity color
        return baseColor;
    }

    /**
     * Get color code for accuracy status
     * @param {String} status - Accuracy status
     * @returns {String} Color code
     */
    getAccuracyColor(status) {
        const colors = {
            'excellent': '#4caf50',
            'good': '#8bc34a',
            'moderate': '#ff9800',
            'poor': '#f44336',
            'unknown': '#999'
        };
        return colors[status] || colors.unknown;
    }

    /**
     * Darken a color (simplified)
     * @param {String} color - Color code
     * @param {Number} amount - Amount to darken (0-1)
     * @returns {String} Darkened color
     */
    darkenColor(color, amount) {
        // Simplified - in production, use a proper color manipulation library
        return color; // Placeholder
    }

    /**
     * Lighten a color (simplified)
     * @param {String} color - Color code
     * @param {Number} amount - Amount to lighten (0-1)
     * @returns {String} Lightened color
     */
    lightenColor(color, amount) {
        // Simplified - in production, use a proper color manipulation library
        return color; // Placeholder
    }

    updateConnectionStatus(status, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = text;
        }
    }

    debug(message) {
        if (this.debugMode) {
            console.log(`[PovertyMap] ${message}`);
        }
    }

    calculateMarkerSize(povertyScore) {
        // Calculate marker size based on poverty score
        return Math.max(5, Math.min(20, povertyScore / 5));
    }

    updateFilteredStats(filteredCount, totalCount) {
        // Update the total locations stat to show filtered results
        const totalLocationsEl = document.getElementById('totalLocations');
        if (totalLocationsEl) {
            totalLocationsEl.textContent = `${filteredCount}${totalCount !== filteredCount ? ` of ${totalCount}` : ''}`;
        }

        // Add visual feedback for active filters
        this.updateFilterIndicators();
    }

    updateFilterIndicators() {
        const severityFilter = document.getElementById('severityFilter');
        const regionFilter = document.getElementById('regionFilter');
        
        // Add active class to show which filters are applied
        if (severityFilter) {
            severityFilter.classList.toggle('filter-active', this.currentFilters.severity !== 'all');
        }
        
        if (regionFilter) {
            regionFilter.classList.toggle('filter-active', this.currentFilters.region !== 'all');
        }
    }

    formatIndicatorName(indicator) {
        return indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    initializeCharts() {
        console.log('📊 Initializing charts with unified data...');
        
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available - skipping chart initialization');
            return;
        }

        // Use unified data source (same as dashboard)
        const chartData = this.getUnifiedVisualizationData();
        
        // Wait for DOM to be ready
        setTimeout(() => {
            // Initialize Poverty Distribution Chart (matches dashboard Predictions Chart)
            this.createPovertyDistributionChart(chartData);
            
            // Initialize County Comparison Chart (matches dashboard SAE Chart)
            this.createCountyComparisonChart(chartData);
            
            // Initialize Indicators Correlation Chart (matches dashboard Consumption Chart)
            this.createIndicatorsCorrelationChart(chartData);
            
            console.log('✅ Poverty map charts initialized with unified data');
        }, 100);
    }

    // Unified data source (same as dashboard)
    getUnifiedVisualizationData() {
        if (typeof sampleData !== 'undefined' && sampleData.locations) {
            return this.processDataForCharts(sampleData.locations);
        }
        
        // Fallback data if sample data not available
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
        });

        return {
            countyData,
            severityCounts,
            locations
        };
    }

    createPovertyDistributionChart(data) {
        const canvas = document.getElementById('povertyDistributionChart');
        if (!canvas) {
            console.warn('Poverty distribution chart canvas not found');
            return;
        }

        console.log('Creating poverty distribution chart with data:', data.severityCounts);
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.povertyDistributionChart) {
            this.povertyDistributionChart.destroy();
        }
        
        this.povertyDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critical (70+)', 'High (50-70)', 'Moderate (30-50)', 'Low (0-30)'],
                datasets: [{
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
        
        console.log('Poverty distribution chart created successfully');
    }

    createCountyComparisonChart(data) {
        const canvas = document.getElementById('countyComparisonChart');
        if (!canvas) {
            console.warn('County comparison chart canvas not found');
            return;
        }

        const counties = Object.keys(data.countyData);
        const avgPoverty = counties.map(county => {
            const values = data.countyData[county].poverty_index;
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        console.log('Creating county comparison chart with counties:', counties.slice(0, 6));
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.countyComparisonChart) {
            this.countyComparisonChart.destroy();
        }
        
        this.countyComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: counties.slice(0, 6), // Show top 6 counties
                datasets: [{
                    label: 'Avg Poverty Index',
                    data: avgPoverty.slice(0, 6),
                    backgroundColor: 'rgba(46, 139, 87, 0.8)',
                    borderColor: 'rgba(46, 139, 87, 1)',
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
                        max: 100
                    }
                }
            }
        });
        
        console.log('County comparison chart created successfully');
    }

    createIndicatorsCorrelationChart(data) {
        const canvas = document.getElementById('indicatorsCorrelationChart');
        if (!canvas) {
            console.warn('Indicators correlation chart canvas not found');
            return;
        }

        // Create scatter plot showing correlation between poverty index and education access
        const scatterData = data.locations.map(location => ({
            x: location.poverty_index,
            y: location.education_access
        }));

        console.log('Creating correlation chart with', scatterData.length, 'data points');
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.indicatorsCorrelationChart) {
            this.indicatorsCorrelationChart.destroy();
        }
        
        this.indicatorsCorrelationChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Poverty vs Education',
                    data: scatterData,
                    backgroundColor: 'rgba(70, 130, 180, 0.6)',
                    borderColor: 'rgba(70, 130, 180, 1)',
                    borderWidth: 1,
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
                            text: 'Poverty Index'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Education Access %'
                        }
                    }
                }
            }
        });
        
        console.log('Indicators correlation chart created successfully');
    }

    updateDynamicStatistics(locations) {
        if (!this.dynamicCalculator || !locations) return;

        const stats = this.dynamicCalculator.getSummaryStatistics(locations);
        
        // Update basic statistics display
        const totalLocations = document.getElementById('totalLocations');
        const criticalAreas = document.getElementById('criticalAreas');
        const avgPovertyIndex = document.getElementById('avgPovertyIndex');
        const activeLayersCount = document.getElementById('activeLayersCount');
        const confidenceScore = document.getElementById('confidenceScore');
        const scoreRange = document.getElementById('scoreRange');
        const dynamicStatsDiv = document.getElementById('dynamicStats');

        if (totalLocations) totalLocations.textContent = stats.total_locations;
        if (criticalAreas) criticalAreas.textContent = stats.poverty_distribution.critical;
        if (avgPovertyIndex) avgPovertyIndex.textContent = stats.average_poverty_index + '%';

        // Update poverty severity distribution
        const severeCritical = document.getElementById('severeCritical');
        const severeHigh = document.getElementById('severeHigh');
        const severeModerate = document.getElementById('severeModerate');
        const severeLow = document.getElementById('severeLow');

        if (severeCritical) severeCritical.textContent = stats.poverty_distribution.critical;
        if (severeHigh) severeHigh.textContent = stats.poverty_distribution.high;
        if (severeModerate) severeModerate.textContent = stats.poverty_distribution.moderate;
        if (severeLow) severeLow.textContent = stats.poverty_distribution.low;

        // Update dynamic statistics
        if (activeLayersCount) activeLayersCount.textContent = stats.active_layers.length;
        if (confidenceScore) confidenceScore.textContent = stats.active_layers.length * 20 + '%';
        if (scoreRange) scoreRange.textContent = `${stats.min_poverty_index}-${stats.max_poverty_index}`;

        // Show dynamic stats if layers are active
        if (dynamicStatsDiv) {
            dynamicStatsDiv.style.display = 'block';
        }
    }
}

// Global functions for HTML interactions
function refreshMap() {
    if (window.povertyMapSystem) {
        window.povertyMapSystem.loadPovertyData();
    }
}

function resetMapView() {
    if (window.povertyMapSystem && window.povertyMapSystem.map) {
        window.povertyMapSystem.map.setView([-1.2921, 36.8219], 6);
    }
}

function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    if (!document.fullscreenElement) {
        mapContainer.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function viewRegionDetail(regionId) {
    console.log('Viewing region details for:', regionId);
    // You can implement region detail view here
}

function updateDynamicLayers() {
    console.log('🔄 Updating dynamic layers...');
    if (window.povertyMapSystem) {
        // Re-render the map with updated layer configuration
        // ============================================
        // COMMENTED OUT: DHS Training Data Rendering
        // Uncomment below to restore training data visualization
        // ============================================
        // window.povertyMapSystem.renderPovertyMap();
        // ============================================
        console.log('✅ Map updated with new layer configuration');
    }
}

function resetMapFilters() {
    console.log('🔄 Resetting map filters...');
    if (window.povertyMapSystem) {
        window.povertyMapSystem.resetFilters();
    }
}

function initializeChartsManually() {
    console.log('🔧 Manually initializing charts...');
    if (window.povertyMapSystem) {
        window.povertyMapSystem.initializeCharts();
    } else {
        console.error('Poverty map system not available');
    }
}

// Method to update charts from dashboard data
function updateChartsFromDashboard() {
    if (window.povertyMapSystem && window.dashboardApp) {
        const chartData = window.dashboardApp.getUnifiedVisualizationData();
        
        // Update poverty map charts with dashboard data
        if (window.povertyMapSystem.povertyDistributionChart) {
            window.povertyMapSystem.povertyDistributionChart.data.datasets[0].data = [
                chartData.severityCounts.critical,
                chartData.severityCounts.high,
                chartData.severityCounts.moderate,
                chartData.severityCounts.low
            ];
            window.povertyMapSystem.povertyDistributionChart.update();
        }
        
        if (window.povertyMapSystem.countyComparisonChart) {
            const counties = Object.keys(chartData.countyData);
            const avgPoverty = counties.map(county => {
                const values = chartData.countyData[county].poverty_index;
                return values.reduce((sum, val) => sum + val, 0) / values.length;
            });
            
            window.povertyMapSystem.countyComparisonChart.data.labels = counties.slice(0, 6);
            window.povertyMapSystem.countyComparisonChart.data.datasets[0].data = avgPoverty.slice(0, 6);
            window.povertyMapSystem.countyComparisonChart.update();
        }
        
        if (window.povertyMapSystem.indicatorsCorrelationChart) {
            const scatterData = chartData.locations.map(location => ({
                x: location.poverty_index,
                y: location.education_access
            }));
            
            window.povertyMapSystem.indicatorsCorrelationChart.data.datasets[0].data = scatterData;
            window.povertyMapSystem.indicatorsCorrelationChart.update();
        }
        
        console.log('✅ Poverty map charts updated from dashboard data');
    }
}

// Method to sync data between dashboard and poverty map
function syncVisualizationData() {
    console.log('🔄 Syncing visualization data...');
    
    if (window.dashboardApp) {
        window.dashboardApp.triggerDataSync();
    }
    
    if (window.povertyMapSystem) {
        updateChartsFromDashboard();
    }
    
    console.log('✅ Data sync completed');
}

// Store current location data for breakdown
let currentLocationData = null;

// Calculation Breakdown Modal Functions
function showCalculationBreakdown() {
    const modal = document.getElementById('breakdownModal');
    const contentDiv = document.getElementById('breakdownContent');
    
    if (!modal || !contentDiv) return;

    // Get current calculation data
    const breakdownHTML = generateBreakdownHTML();
    contentDiv.innerHTML = breakdownHTML;

    // Show modal
    modal.style.display = 'flex';
}

function showLocationBreakdown(locationData) {
    const modal = document.getElementById('breakdownModal');
    const contentDiv = document.getElementById('breakdownContent');
    
    if (!modal || !contentDiv) return;

    // Hide header when modal opens
    const header = document.querySelector('.header');
    if (header) {
        header.style.display = 'none';
    }

    // Store location data
    currentLocationData = locationData;

    // Get breakdown for this specific location
    const breakdownHTML = generateLocationBreakdownHTML(locationData);
    contentDiv.innerHTML = breakdownHTML;

    // Show modal
    modal.style.display = 'flex';
}

function generateLocationBreakdownHTML(location) {
    if (!window.povertyMapSystem || !window.povertyMapSystem.dynamicCalculator) {
        return '<p>No calculation data available.</p>';
    }

    const calculator = window.povertyMapSystem.dynamicCalculator;
    const calculation = calculator.calculateLocationPovertyIndex(location);
    const breakdown = calculation.breakdown;
    const explainability = calculation.explainability || {};
    const topContributors = explainability.top_contributors || [];
    const narratives = explainability.narratives || [];
    const priorityAction = explainability.counterfactuals?.priority_action || null;
    const riskAlert = explainability.counterfactuals?.risk_alert || null;

    // Format location with hierarchical structure
    const formattedBreakdownLocation = formatLocationName(location);
    const subCounty = location.sub_county || location.subcounty || null;
    const ward = location.ward || null;
    const village = location.village || null;
    
    // Build administrative hierarchy display
    let adminHierarchy = [];
    if (village) adminHierarchy.push(`<strong>Village:</strong> ${village}`);
    if (ward) adminHierarchy.push(`<strong>Ward:</strong> ${ward}`);
    if (subCounty) adminHierarchy.push(`<strong>Sub-County:</strong> ${subCounty}`);
    if (location.county) adminHierarchy.push(`<strong>County:</strong> ${location.county}`);
    adminHierarchy.push(`<strong>Country:</strong> Kenya`);
    
    let html = `
        <div class="breakdown-section">
            <h4>Location Information</h4>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <p style="margin: 4px 0;"><strong>Location:</strong> ${formattedBreakdownLocation}</p>
                <p style="margin: 4px 0;"><strong>Primary Name:</strong> ${location.name || location.location_name}</p>
                ${adminHierarchy.length > 0 ? `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                        <p style="margin: 4px 0; font-weight: 600;">Administrative Hierarchy:</p>
                        <ul style="margin: 4px 0; padding-left: 20px;">
                            ${adminHierarchy.map(item => `<li style="margin: 2px 0;">${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <p style="margin: 4px 0;"><strong>Calculated Poverty Score:</strong> <span style="font-size: 1.2em; font-weight: bold; color: var(--primary-color);">${calculation.poverty_index.toFixed(1)}%</span></p>
            </div>
        </div>

        <div class="breakdown-section">
            <h4>Calculation Formula</h4>
            <div class="breakdown-formula">
                <strong>Poverty Score = Σ(Layer_Score × Weight) ÷ Total_Weight</strong>
                <br><br>
                <code>
                    Score = (L₁×W₁ + L₂×W₂ + ... + Lₙ×Wₙ) ÷ ΣW
                </code>
            </div>
        </div>

        <div class="breakdown-section">
            <h4>Layer Contributions</h4>
            <table class="breakdown-table">
                <thead>
                    <tr>
                        <th>Layer Name</th>
                        <th>Score</th>
                        <th>Weight</th>
                        <th>Contribution</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Add each layer's contribution
    Object.entries(breakdown).forEach(([indicator, data]) => {
        const layerName = formatIndicatorName(indicator);
        const status = data.is_active ? 'Active' : 'Inactive';
        const statusClass = data.is_active ? 'status-active' : 'status-inactive';
        
        html += `
            <tr>
                <td><strong>${layerName}</strong></td>
                <td>${data.adjusted_value.toFixed(1)}%</td>
                <td>${data.weight_percentage}</td>
                <td>${data.contribution.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>

        <div class="breakdown-section">
            <h4>Top Drivers & Attribution</h4>
            ${topContributors.length > 0 ? `
                <ul style="margin: 0; padding-left: 20px;">
                    ${topContributors.slice(0, 3).map(driver => `
                        <li style="margin-bottom: 6px;">
                            <strong>${driver.label}:</strong> ${driver.share_percentage} of weighted impact (score ${driver.adjusted_value.toFixed(1)}%, weight ${driver.weight_percentage})
                        </li>
                    `).join('')}
                </ul>
            ` : '<p>No active indicators available for attribution.</p>'}
        </div>

        <div class="breakdown-section">
            <h4>Scenario Explorer</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                <div style="background: #f1fff4; border: 1px solid #c8e6c9; padding: 12px; border-radius: 8px;">
                    <div style="font-weight: 600; color: #2e7d32;">Priority Action</div>
                    ${priorityAction ? `
                        <p style="margin: 6px 0;"><strong>${priorityAction.label}</strong></p>
                        <p style="margin: 6px 0; font-size: 0.9rem;">Adjust by ${Math.abs(priorityAction.delta).toFixed(0)} pts → projected score <strong>${priorityAction.poverty_index.toFixed(1)}%</strong></p>
                        <p style="margin: 6px 0; font-size: 0.9rem; color: #2e7d32;">Impact: -${priorityAction.impact.toFixed(1)} points</p>
                    ` : '<p style="margin: 6px 0;">No improvement scenario available.</p>'}
                </div>
                <div style="background: #fff8f1; border: 1px solid #ffe0b2; padding: 12px; border-radius: 8px;">
                    <div style="font-weight: 600; color: #ef6c00;">Risk Alert</div>
                    ${riskAlert ? `
                        <p style="margin: 6px 0;"><strong>${riskAlert.label}</strong></p>
                        <p style="margin: 6px 0; font-size: 0.9rem;">Decline by ${Math.abs(riskAlert.delta).toFixed(0)} pts → projected score <strong>${riskAlert.poverty_index.toFixed(1)}%</strong></p>
                        <p style="margin: 6px 0; font-size: 0.9rem; color: #ef6c00;">Impact: +${riskAlert.impact.toFixed(1)} points</p>
                    ` : '<p style="margin: 6px 0;">No regression scenario detected.</p>'}
                </div>
            </div>
        </div>

        ${narratives.length > 0 ? `
            <div class="breakdown-section">
                <h4>Insight Highlights</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${narratives.map(line => `<li style="margin-bottom: 6px;">${line}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="final-score">
            <div class="final-score-label">Final Calculated Score</div>
            <div class="final-score-value">${calculation.poverty_index}%</div>
            <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 8px;">
                Based on ${calculation.active_layers.length} active layers
            </div>
        </div>

        <div class="breakdown-section" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border-color);">
            <a href="/area-report.html" onclick="event.preventDefault(); openFullReport(${JSON.stringify(location).replace(/"/g, '&quot;')}); return false;" 
               style="display: inline-block; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; text-align: center; width: 100%; margin-top: 15px;">
                📄 View Full Detailed Report
            </a>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; text-align: center;">
                Get comprehensive insights, charts, and downloadable PDF report
            </p>
        </div>
    `;

    return html;
}

// Open full detailed report page
function openFullReport(locationData) {
    // Store location data in sessionStorage for the report page
    sessionStorage.setItem('areaReportData', JSON.stringify(locationData));
    // Navigate to report page
    window.location.href = '/area-report.html';
}

function closeCalculationBreakdown() {
    const modal = document.getElementById('breakdownModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = 'fadeIn 0.3s ease-in-out';
            currentLocationData = null;
            
            // Restore header visibility
            const header = document.querySelector('.header');
            if (header) {
                header.style.display = '';
            }
        }, 300);
    }
}

function generateBreakdownHTML() {
    if (!window.povertyMapSystem || !window.povertyMapSystem.dynamicCalculator) {
        return '<p>No calculation data available. Please ensure layers are configured.</p>';
    }

    const calculator = window.povertyMapSystem.dynamicCalculator;
    const stats = calculator.getSummaryStatistics(sampleData.locations);
    
    // Get breakdown for a representative location
    const sampleLocation = sampleData.locations[0];
    const calculation = calculator.calculateLocationPovertyIndex(sampleLocation);
    const breakdown = calculation.breakdown;

    // Build HTML
    let html = `
        <div class="breakdown-section">
            <h4>Calculation Formula</h4>
            <div class="breakdown-formula">
                <strong>Poverty Score = Σ(Layer_Score × Weight) ÷ Total_Weight</strong>
                <br><br>
                <code>
                    Score = (L₁×W₁ + L₂×W₂ + ... + Lₙ×Wₙ) ÷ ΣW
                </code>
            </div>
        </div>

        <div class="breakdown-section">
            <h4>Active Layers Contribution</h4>
            <table class="breakdown-table">
                <thead>
                    <tr>
                        <th>Layer</th>
                        <th>Status</th>
                        <th>Weight</th>
                        <th>Score</th>
                        <th>Contribution</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Add each layer's contribution
    Object.entries(breakdown).forEach(([indicator, data]) => {
        const layerName = formatIndicatorName(indicator);
        const status = data.is_active ? 'Active' : 'Inactive';
        const statusClass = data.is_active ? 'status-active' : 'status-inactive';
        
        html += `
            <tr>
                <td><strong>${layerName}</strong></td>
                <td class="${statusClass}">${status}</td>
                <td>${data.weight_percentage}</td>
                <td>${data.adjusted_value.toFixed(1)}%</td>
                <td>${data.contribution.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>

        <div class="breakdown-section">
            <h4>Summary Statistics</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;">
                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Total Locations:</strong> ${stats.total_locations}
                </div>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Active Layers:</strong> ${stats.active_layers.length}
                </div>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Confidence Score:</strong> ${stats.average_poverty_index > 0 ? (stats.active_layers.length * 20) : 0}%
                </div>
                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Score Range:</strong> ${stats.min_poverty_index}-${stats.max_poverty_index}
                </div>
            </div>
        </div>

        <div class="final-score">
            <div class="final-score-label">Average Poverty Index</div>
            <div class="final-score-value">${stats.average_poverty_index}%</div>
            <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 8px;">
                ${stats.active_layers.length} active layers contributing to calculation
            </div>
        </div>
    `;

    return html;
}

function downloadCalculationBreakdown() {
    // Hide header when modal opens
    const header = document.querySelector('.header');
    if (header) {
        header.style.display = 'none';
    }
    
    // Show modal with download request form
    const requestDiv = document.createElement('div');
    requestDiv.id = 'downloadRequestModal';
    requestDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 20000; overflow-y: auto; padding: 20px; box-sizing: border-box;';
    requestDiv.innerHTML = `
        <div style="background: var(--panel-bg); color: var(--text-primary); padding: 30px; border-radius: 12px; max-width: 600px; width: 100%; box-shadow: var(--panel-shadow); margin: auto;">
            <h3 style="margin: 0 0 20px 0; color: var(--primary-color); font-size: 1.3rem;">Download Request Form</h3>
            <p style="margin: 0 0 20px 0; color: #666; font-size: 0.95rem;">Please provide your details to request access to this poverty calculation data. Your request will be reviewed and you'll receive a download link via email.</p>
            
            <form id="downloadRequestForm" onsubmit="handleDownloadRequest(event)" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">Full Name *</label>
                    <input type="text" id="requestName" placeholder="Enter your full name" required
                           style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; font-size: 0.95rem; transition: border-color 0.2s; box-sizing: border-box;"
                           onfocus="this.style.borderColor='var(--primary-color)'"
                           onblur="this.style.borderColor='#e9ecef'">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">Email Address *</label>
                    <input type="email" id="requestEmail" placeholder="your.email@example.com" required
                           style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; font-size: 0.95rem; transition: border-color 0.2s; box-sizing: border-box;"
                           onfocus="this.style.borderColor='var(--primary-color)'"
                           onblur="this.style.borderColor='#e9ecef'">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">Organization (Optional)</label>
                    <input type="text" id="requestOrganization" placeholder="Your organization or institution"
                           style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; font-size: 0.95rem; transition: border-color 0.2s; box-sizing: border-box;"
                           onfocus="this.style.borderColor='var(--primary-color)'"
                           onblur="this.style.borderColor='#e9ecef'">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">Purpose of Download *</label>
                    <textarea id="requestPurpose" placeholder="Please explain why you need this data and how you intend to use it (minimum 20 characters)..." required
                              style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; resize: vertical; transition: border-color 0.2s; box-sizing: border-box;"
                              onkeyup="validateDownloadRequest()"
                              onfocus="this.style.borderColor='var(--primary-color)'"
                              onblur="this.style.borderColor='#e9ecef'"></textarea>
                    <div id="purposeError" style="color: #dc3545; font-size: 0.85rem; margin-top: 6px; display: none;"></div>
                </div>
                
                <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                    <p style="margin: 0; font-size: 0.85rem; color: #1976d2; line-height: 1.5;">
                        <strong>📋 Approval Process:</strong> Your request will be reviewed by our administration team. You will receive an email with a secure download link upon approval. This usually takes 1-2 business days.
                    </p>
                </div>
                
                <div id="requestError" style="color: #dc3545; font-size: 0.9rem; padding: 10px; background: #ffebee; border-radius: 6px; display: none;"></div>
                
                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button type="button" onclick="cancelDownloadRequest()" 
                            style="flex: 1; padding: 12px 20px; border: none; border-radius: 8px; background: #e9ecef; cursor: pointer; font-weight: 600; transition: background 0.2s;">
                        Cancel
                    </button>
                    <button type="submit" id="submitRequestBtn" 
                            style="flex: 1; padding: 12px 20px; border: none; border-radius: 8px; background: var(--primary-color); color: white; cursor: pointer; font-weight: 600; transition: background 0.2s;">
                        Submit Request
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(requestDiv);
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('requestName').focus();
    }, 100);
}

// Download request form functions
function validateDownloadRequest() {
    const purpose = document.getElementById('requestPurpose').value.trim();
    const purposeError = document.getElementById('purposeError');
    const minLength = 20;
    
    if (purpose.length >= minLength) {
        purposeError.style.display = 'none';
        return true;
    } else {
        const remaining = minLength - purpose.length;
        purposeError.textContent = `Please enter at least ${minLength} characters (${remaining} more needed)`;
        purposeError.style.display = 'block';
        return false;
    }
}

function cancelDownloadRequest() {
    const modal = document.getElementById('downloadRequestModal');
    if (modal) {
        modal.remove();
    }
}

function handleDownloadRequest(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateDownloadRequest()) {
        return;
    }
    
    // Get form data
    const formData = {
        name: document.getElementById('requestName').value.trim(),
        email: document.getElementById('requestEmail').value.trim(),
        organization: document.getElementById('requestOrganization').value.trim(),
        purpose: document.getElementById('requestPurpose').value.trim(),
        locationData: currentLocationData,
        timestamp: new Date().toISOString(),
        requestId: 'REQ-' + Date.now()
    };
    
    // Show loading state
    const submitBtn = document.getElementById('submitRequestBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    // Simulate API call to submit request
    setTimeout(() => {
        // In production, this would make an API call to submit the request
        console.log('Download request submitted:', formData);
        
        // Store request in localStorage (in production, this would be sent to backend)
        const requests = JSON.parse(localStorage.getItem('downloadRequests') || '[]');
        requests.push(formData);
        localStorage.setItem('downloadRequests', JSON.stringify(requests));
        
        // Show success message
        showRequestSuccess();
    }, 1000);
}

function showRequestSuccess() {
    const modal = document.getElementById('downloadRequestModal');
    if (modal) {
        modal.innerHTML = `
            <div style="background: var(--panel-bg); color: var(--text-primary); padding: 30px; border-radius: 12px; max-width: 600px; width: 100%; box-shadow: var(--panel-shadow); margin: auto; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
                <h3 style="margin: 0 0 16px 0; color: var(--primary-color); font-size: 1.3rem;">Request Submitted Successfully!</h3>
                <p style="margin: 0 0 24px 0; color: #666; line-height: 1.6;">
                    Your download request has been submitted and is pending approval. You will receive an email with a secure download link once your request is approved by our administration team.
                </p>
                <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 0.9rem; color: #2e7d32;">
                        <strong>⏱️ Expected Timeline:</strong> 1-2 business days<br>
                        <strong>📧 Email:</strong> Check your inbox for approval confirmation
                    </p>
                </div>
                <button onclick="closeRequestModal()" 
                        style="padding: 12px 32px; border: none; border-radius: 8px; background: var(--primary-color); color: white; cursor: pointer; font-weight: 600; font-size: 1rem;">
                    Close
                </button>
            </div>
        `;
    }
}

function closeRequestModal() {
    const modal = document.getElementById('downloadRequestModal');
    if (modal) {
        modal.remove();
    }
    
    // Restore header visibility
    const header = document.querySelector('.header');
    if (header) {
        header.style.display = '';
    }
    
    // Also close the breakdown modal
    closeCalculationBreakdown();
}

function generateAndDownloadFile(reason) {
    // Generate download content
    const calculator = window.povertyMapSystem?.dynamicCalculator;
    if (!calculator) {
        alert('No calculation data available.');
        return;
    }

    // Use current location data if available, otherwise use stats
    if (currentLocationData) {
        // Download for specific location
        const calculation = calculator.calculateLocationPovertyIndex(currentLocationData);
        const breakdown = calculation.breakdown;
        const explainability = calculation.explainability || {};
        const topContributors = explainability.top_contributors || [];
        const narratives = explainability.narratives || [];
        const priorityAction = explainability.counterfactuals?.priority_action || null;
        const riskAlert = explainability.counterfactuals?.risk_alert || null;
        const safeFixed = (value, digits = 1) => {
            const num = Number(value);
            return Number.isFinite(num) ? num.toFixed(digits) : Number(0).toFixed(digits);
        };
        
        let content = 'POVERTY CALCULATION BREAKDOWN REPORT\n';
        content += '='.repeat(50) + '\n\n';
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Download Reason: ${reason}\n\n`;
        content += 'LOCATION INFORMATION\n';
        content += '-'.repeat(50) + '\n';
        content += `Name: ${currentLocationData.name || currentLocationData.location_name}\n`;
        content += `County: ${currentLocationData.county || 'N/A'}\n`;
        content += `Calculated Poverty Score: ${calculation.poverty_index}%\n\n`;
        
        content += 'CALCULATION FORMULA\n';
        content += '-'.repeat(50) + '\n';
        content += 'Poverty Score = Σ(Layer_Score × Weight) ÷ Total_Weight\n\n';
        
        content += 'LAYER CONTRIBUTIONS\n';
        content += '-'.repeat(50) + '\n';
        Object.entries(breakdown).forEach(([indicator, data]) => {
            const layerName = formatIndicatorName(indicator);
            content += `${layerName}:\n`;
            content += `  Status: ${data.is_active ? 'Active' : 'Inactive'}\n`;
            content += `  Weight: ${data.weight_percentage}\n`;
            content += `  Score: ${data.adjusted_value.toFixed(1)}%\n`;
            content += `  Contribution: ${data.contribution.toFixed(2)}\n\n`;
        });
        
        content += 'SUMMARY\n';
        content += '-'.repeat(50) + '\n';
        content += `Active Layers: ${calculation.active_layers.length}\n`;
        content += `Confidence Score: ${calculation.confidence}%\n`;
        
        if (topContributors.length || priorityAction || riskAlert) {
            content += '\nEXPLAINABILITY INSIGHTS\n';
            content += '-'.repeat(50) + '\n';
        }

        if (topContributors.length) {
            content += 'Top Contributors:\n';
            topContributors.forEach((driver, idx) => {
                content += `${idx + 1}. ${driver.label} — ${driver.share_percentage} of weighted impact (score ${safeFixed(driver.adjusted_value)}%, weight ${driver.weight_percentage})\n`;
            });
            content += '\n';
        }

        if (priorityAction || riskAlert) {
            content += 'Scenario Sensitivity:\n';
            if (priorityAction) {
                content += `- Priority Action: Improve ${priorityAction.label} by ${Math.abs(priorityAction.delta).toFixed(0)} pts (target ${safeFixed(priorityAction.target_value)}%) ➜ projected score ${safeFixed(priorityAction.poverty_index)}% (impact: -${safeFixed(priorityAction.impact)}).\n`;
            }
            if (riskAlert) {
                content += `- Risk Alert: Prevent a ${Math.abs(riskAlert.delta).toFixed(0)} pt decline in ${riskAlert.label} (threshold ${safeFixed(riskAlert.target_value)}%) ➜ unchecked score ${safeFixed(riskAlert.poverty_index)}% (impact: +${safeFixed(riskAlert.impact)}).\n`;
            }
            content += '\n';
        }

        if (narratives.length) {
            content += 'AI Narratives:\n';
            narratives.forEach(line => {
                content += `- ${line}\n`;
            });
        }
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poverty-calculation-${currentLocationData.name?.replace(/\s+/g, '-') || 'location'}-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        // Download general stats
        const stats = calculator.getSummaryStatistics(sampleData.locations);
        const sampleLocation = sampleData.locations[0];
        const calculation = calculator.calculateLocationPovertyIndex(sampleLocation);
        const breakdown = calculation.breakdown;
        const explainability = calculation.explainability || {};
        const topContributors = explainability.top_contributors || [];
        const narratives = explainability.narratives || [];
        const priorityAction = explainability.counterfactuals?.priority_action || null;
        const riskAlert = explainability.counterfactuals?.risk_alert || null;
        const safeFixed = (value, digits = 1) => {
            const num = Number(value);
            return Number.isFinite(num) ? num.toFixed(digits) : Number(0).toFixed(digits);
        };

        let content = 'POVERTY CALCULATION BREAKDOWN REPORT\n';
        content += '='.repeat(50) + '\n\n';
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Download Reason: ${reason}\n\n`;
        content += 'CALCULATION FORMULA\n';
        content += '-'.repeat(50) + '\n';
        content += 'Poverty Score = Σ(Layer_Score × Weight) ÷ Total_Weight\n\n';
        
        content += 'LAYER CONTRIBUTIONS\n';
        content += '-'.repeat(50) + '\n';
        Object.entries(breakdown).forEach(([indicator, data]) => {
            const layerName = formatIndicatorName(indicator);
            content += `${layerName}:\n`;
            content += `  Status: ${data.is_active ? 'Active' : 'Inactive'}\n`;
            content += `  Weight: ${data.weight_percentage}\n`;
            content += `  Score: ${data.adjusted_value.toFixed(1)}%\n`;
            content += `  Contribution: ${data.contribution.toFixed(2)}\n\n`;
        });

        content += '\nSUMMARY STATISTICS\n';
        content += '-'.repeat(50) + '\n';
        content += `Total Locations: ${stats.total_locations}\n`;
        content += `Active Layers: ${stats.active_layers.length}\n`;
        content += `Average Poverty Index: ${stats.average_poverty_index}%\n`;
        content += `Score Range: ${stats.min_poverty_index}-${stats.max_poverty_index}\n`;
        content += `Confidence Score: ${stats.active_layers.length * 20}%\n\n`;

        content += 'SEVERITY DISTRIBUTION\n';
        content += '-'.repeat(50) + '\n';
        content += `Critical (70+): ${stats.poverty_distribution.critical} regions\n`;
        content += `High (50-70): ${stats.poverty_distribution.high} regions\n`;
        content += `Moderate (30-50): ${stats.poverty_distribution.moderate} regions\n`;
        content += `Low (0-30): ${stats.poverty_distribution.low} regions\n`;

        if (topContributors.length || priorityAction || riskAlert || narratives.length) {
            content += '\nEXPLAINABILITY INSIGHTS (Sample Location)\n';
            content += '-'.repeat(50) + '\n';
        }

        if (topContributors.length) {
            content += 'Top Contributors:\n';
            topContributors.forEach((driver, idx) => {
                content += `${idx + 1}. ${driver.label} — ${driver.share_percentage} of impact (score ${safeFixed(driver.adjusted_value)}%, weight ${driver.weight_percentage})\n`;
            });
            content += '\n';
        }

        if (priorityAction || riskAlert) {
            content += 'Scenario Sensitivity:\n';
            if (priorityAction) {
                content += `- Priority Action: Improve ${priorityAction.label} by ${Math.abs(priorityAction.delta).toFixed(0)} pts (target ${safeFixed(priorityAction.target_value)}%) ➜ projected score ${safeFixed(priorityAction.poverty_index)}% (impact: -${safeFixed(priorityAction.impact)}).\n`;
            }
            if (riskAlert) {
                content += `- Risk Alert: Prevent a ${Math.abs(riskAlert.delta).toFixed(0)} pt decline in ${riskAlert.label} (threshold ${safeFixed(riskAlert.target_value)}%) ➜ unchecked score ${safeFixed(riskAlert.poverty_index)}% (impact: +${safeFixed(riskAlert.impact)}).\n`;
            }
            content += '\n';
        }

        if (narratives.length) {
            content += 'AI Narratives:\n';
            narratives.forEach(line => {
                content += `- ${line}\n`;
            });
        }

        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poverty-calculation-breakdown-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    alert('Calculation breakdown downloaded successfully!');
}

function formatIndicatorName(indicator) {
    return indicator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Formats location name based on administrative hierarchy
 * Reusable function for consistent location formatting across map and reports
 * 
 * @param {Object} locationData - Location object with name, county, sub_county, ward, village
 * @returns {string} Formatted location string with proper suffixes
 */
function formatLocationName(locationData) {
    if (!locationData) return 'Unknown Location, Kenya';
    
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

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('breakdownModal');
    if (event.target === modal) {
        closeCalculationBreakdown();
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.povertyMapSystem = new PovertyMapSystem();
});
