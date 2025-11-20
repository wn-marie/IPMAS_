/**
 * IPMAS Interactive Drill-Down Visualization
 * Enables hierarchical navigation from Country → County → Sub-County → Ward
 */

class DrillDownVisualization {
    constructor() {
        this.currentLevel = 'country'; // country, county, subcounty, ward
        this.currentSelection = null;
        this.breadcrumb = [];
        this.init();
    }

    init() {
        console.log('📊 Drill-Down Visualization initializing...');
        this.createBreadcrumbUI();
        this.setupMapClickHandlers();
        console.log('✅ Drill-Down Visualization initialized');
    }

    createBreadcrumbUI() {
        // Skip on specific pages
        if (window.location.pathname.includes('poverty-models')) {
            return;
        }

        const mapHeader = document.querySelector('.map-header');
        if (!mapHeader) return;

        // Check if breadcrumb already exists
        if (document.getElementById('drillDownBreadcrumb')) {
            return;
        }

        const breadcrumbContainer = document.createElement('div');
        breadcrumbContainer.id = 'drillDownBreadcrumb';
        breadcrumbContainer.style.cssText = `
            margin: 15px 0;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        `;
        breadcrumbContainer.innerHTML = `
            <span style="font-weight: 600; color: #495057;">Location:</span>
            <div id="breadcrumbItems" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="breadcrumb-item active" data-level="country" onclick="window.drillDownVis.navigateToLevel('country')" 
                    style="padding: 6px 12px; background: var(--primary-color); color: white; border-radius: 4px; cursor: pointer;">
                    Kenya
                </span>
            </div>
            <button class="btn btn-sm btn-secondary" id="resetDrillDown" style="margin-left: auto;">
                🏠 Reset View
            </button>
        `;

        mapHeader.appendChild(breadcrumbContainer);

        // Reset button handler
        document.getElementById('resetDrillDown')?.addEventListener('click', () => {
            this.resetToCountry();
        });
    }

    navigateToLevel(level, selection = null) {
        console.log(`📍 Navigating to ${level} level`, selection);
        
        this.currentLevel = level;
        this.currentSelection = selection;
        
        // Update breadcrumb
        this.updateBreadcrumb();
        
        // Update map view
        this.updateMapView(level, selection);
        
        // Update statistics and charts
        this.updateStatistics(level, selection);
    }

    updateBreadcrumb() {
        const breadcrumbItems = document.getElementById('breadcrumbItems');
        if (!breadcrumbItems) return;

        const items = ['<span class="breadcrumb-item active" data-level="country" onclick="window.drillDownVis.navigateToLevel(\'country\')" style="padding: 6px 12px; background: var(--primary-color); color: white; border-radius: 4px; cursor: pointer;">Kenya</span>'];

        if (this.currentLevel === 'county' && this.currentSelection) {
            items.push(`<span class="breadcrumb-item" style="padding: 6px 12px; background: #6c757d; color: white; border-radius: 4px; cursor: pointer;">›</span>`);
            items.push(`<span class="breadcrumb-item active" data-level="county" onclick="window.drillDownVis.navigateToLevel(\'county\', '${this.currentSelection}')" style="padding: 6px 12px; background: var(--primary-color); color: white; border-radius: 4px; cursor: pointer;">${this.currentSelection}</span>`);
        }

        breadcrumbItems.innerHTML = items.join('');
    }

    setupMapClickHandlers() {
        // This integrates with main.js map handlers
        // Map markers will call handleCountyClick, handleSubCountyClick, etc.
    }

    handleMapClick(e) {
        // Handle map clicks for drill-down
        // This can be used for area selection
        return false; // Let main handler also process it
    }

    updateMapView(level, selection) {
        if (!window.ipmasApp || !window.ipmasApp.map) return;

        // Filter map markers based on level and selection
        window.ipmasApp.map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker && layer.locationData) {
                const location = layer.locationData;
                let shouldShow = false;

                if (level === 'country') {
                    shouldShow = true; // Show all
                } else if (level === 'county' && selection) {
                    shouldShow = location.county === selection;
                } else if (level === 'subcounty' && selection) {
                    shouldShow = location.sub_county === selection;
                } else if (level === 'ward' && selection) {
                    shouldShow = location.ward === selection;
                }

                if (shouldShow) {
                    if (!window.ipmasApp.map.hasLayer(layer)) {
                        window.ipmasApp.map.addLayer(layer);
                    }
                } else {
                    if (window.ipmasApp.map.hasLayer(layer)) {
                        window.ipmasApp.map.removeLayer(layer);
                    }
                }
            }
        });

        // Zoom to appropriate level
        if (selection) {
            this.zoomToSelection(selection);
        }
    }

    zoomToSelection(selection) {
        // Get bounds for selected area
        if (window.ipmasApp && window.ipmasApp.map) {
            const bounds = [];
            
            window.ipmasApp.map.eachLayer(layer => {
                if (layer instanceof L.CircleMarker && layer.locationData) {
                    const location = layer.locationData;
                    if (location.county === selection || location.sub_county === selection || location.ward === selection) {
                        bounds.push([location.lat, location.lng]);
                    }
                }
            });

            if (bounds.length > 0) {
                window.ipmasApp.map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }

    updateStatistics(level, selection) {
        // Update statistics section with filtered data
        if (window.advancedFilters) {
            // Apply filters based on drill-down level
            const filters = window.advancedFilters.getActiveFilters();
            
            if (level === 'county' && selection) {
                // Add county filter
                const select = document.getElementById('countyMultiSelect');
                if (select) {
                    // Clear existing selections
                    Array.from(select.options).forEach(opt => opt.selected = false);
                    // Select the current county
                    const option = Array.from(select.options).find(opt => opt.text === selection);
                    if (option) option.selected = true;
                    window.advancedFilters.applyAllFilters();
                }
            }
        }
    }

    resetToCountry() {
        this.navigateToLevel('country');
        
        // Reset map view to show all of Kenya
        if (window.ipmasApp && window.ipmasApp.map) {
            window.ipmasApp.map.setView([-1.2921, 36.8219], 6);
        }
        
        console.log('🏠 Reset to country view');
    }

    // Method called when county is clicked on map or selected
    handleCountyClick(countyName) {
        this.navigateToLevel('county', countyName);
    }

    handleSubCountyClick(subCountyName) {
        this.navigateToLevel('subcounty', subCountyName);
    }

    handleWardClick(wardName) {
        this.navigateToLevel('ward', wardName);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.location.pathname.includes('poverty-models')) {
            window.drillDownVis = new DrillDownVisualization();
        }
    });
} else {
    if (!window.location.pathname.includes('poverty-models')) {
        window.drillDownVis = new DrillDownVisualization();
    }
}

