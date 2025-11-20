/**
 * IPMAS Advanced Filtering System
 * Provides multi-criteria filtering, search, and filter presets
 */

class AdvancedFilters {
    constructor() {
        this.activeFilters = {
            counties: [],
            severity: [],
            povertyRange: { min: 0, max: 100 },
            educationRange: { min: 0, max: 100 },
            healthRange: { min: 0, max: 100 },
            waterRange: { min: 0, max: 100 },
            housingRange: { min: 0, max: 100 },
            searchTerm: ''
        };
        this.savedPresets = this.loadPresets();
        this.filteredData = [];
        
        this.init();
    }

    init() {
        console.log('🔍 Advanced Filters initializing...');
        this.createFilterUI();
        this.setupEventListeners();
        console.log('✅ Advanced Filters initialized');
    }

    createFilterUI() {
        // Find where to insert the filter panel (check poverty-map sidebar first, then regular sidebar)
        const sidebar = document.querySelector('.poverty-sidebar') || 
                       document.querySelector('.sidebar') || 
                       document.querySelector('aside');
        if (!sidebar) return;

        // Check if filter panel already exists
        if (document.getElementById('advancedFilterPanel')) {
            return;
        }

        const filterPanel = document.createElement('div');
        filterPanel.id = 'advancedFilterPanel';
        filterPanel.className = 'sidebar-section';
        filterPanel.innerHTML = `
            <div class="filter-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>🔍 Advanced Filters</h3>
                <button class="btn btn-sm btn-secondary" id="toggleFilters" style="padding: 4px 8px;">
                    <span id="toggleFiltersIcon">▼</span>
                </button>
            </div>
            
            <div id="filterContent" style="display: block;">
                <!-- Search -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">Search Location</label>
                    <input type="text" id="locationSearch" class="form-control" placeholder="Search by name, county, ward...">
                    <small class="form-text text-muted">Search across all location fields</small>
                </div>

                <!-- County Dropdown -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">County</label>
                    <select id="countyDropdown" class="form-control">
                        <option value="">-- Select a County --</option>
                        ${this.getCountyOptions()}
                    </select>
                    <small class="form-text text-muted">Select a county to filter</small>
                </div>

                <!-- Severity Levels -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">Poverty Severity</label>
                    <div class="checkbox-group" style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; width: 100%;">
                            <input type="checkbox" id="severity-critical" value="critical" style="width: 18px; height: 18px; flex-shrink: 0;">
                            <span style="color: #d73027;">Critical (70-100%)</span>
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; width: 100%;">
                            <input type="checkbox" id="severity-high" value="high" style="width: 18px; height: 18px; flex-shrink: 0;">
                            <span style="color: #fc8d59;">High (50-70%)</span>
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; width: 100%;">
                            <input type="checkbox" id="severity-moderate" value="moderate" style="width: 18px; height: 18px; flex-shrink: 0;">
                            <span style="color: #fee08b;">Moderate (30-50%)</span>
                        </label>
                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; width: 100%;">
                            <input type="checkbox" id="severity-low" value="low" style="width: 18px; height: 18px; flex-shrink: 0;">
                            <span style="color: #91cf60;">Low (0-30%)</span>
                        </label>
                    </div>
                </div>

                <!-- Range Filters -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">Poverty Index Range</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <input type="number" id="povertyMin" class="form-control" min="0" max="100" value="0" placeholder="Min">
                        <input type="number" id="povertyMax" class="form-control" min="0" max="100" value="100" placeholder="Max">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">Education Access Range (%)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <input type="number" id="educationMin" class="form-control" min="0" max="100" value="0" placeholder="Min">
                        <input type="number" id="educationMax" class="form-control" min="0" max="100" value="100" placeholder="Max">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label class="form-label">Health Vulnerability Range (%)</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <input type="number" id="healthMin" class="form-control" min="0" max="100" value="0" placeholder="Min">
                        <input type="number" id="healthMax" class="form-control" min="0" max="100" value="100" placeholder="Max">
                    </div>
                </div>

                <!-- Filter Actions -->
                <div class="filter-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <button class="btn btn-primary" id="applyFilters" style="width: 100%; margin-bottom: 10px;">
                        Apply Filters
                    </button>
                    <button class="btn btn-secondary" id="clearFilters" style="width: 100%; margin-bottom: 10px;">
                        Clear All
                    </button>
                    <button class="btn btn-outline-primary" id="saveFilterPreset" style="width: 100%; margin-bottom: 10px;">
                        💾 Save Filter Preset
                    </button>
                    <select id="loadFilterPreset" class="form-control" style="margin-bottom: 10px;">
                        <option value="">Load Saved Preset...</option>
                    </select>
                    <button class="btn btn-outline-danger" id="deletePreset" style="width: 100%;">
                        Delete Selected Preset
                    </button>
                </div>

                <!-- Filter Summary -->
                <div id="filterSummary" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 0.85rem;">
                    <strong>Active Filters:</strong> None
                </div>
            </div>
        `;

        // Insert after Poverty Severity Legend section (find section with "Poverty Severity" heading that has .legend class)
        const sections = sidebar.querySelectorAll('.sidebar-section');
        let povertySeverityLegendSection = null;
        
        // Find the Poverty Severity Legend section (the one with .legend class, not the one in advanced filters)
        for (let section of sections) {
            const heading = section.querySelector('h3');
            if (heading && heading.textContent.toLowerCase().includes('poverty severity')) {
                // Check if it has the .legend class (the visual legend, not the filter checkboxes)
                if (section.querySelector('.legend')) {
                    povertySeverityLegendSection = section;
                    break;
                }
            }
        }
        
        if (povertySeverityLegendSection && povertySeverityLegendSection.nextSibling) {
            // Insert after Poverty Severity Legend section
            sidebar.insertBefore(filterPanel, povertySeverityLegendSection.nextSibling);
        } else if (povertySeverityLegendSection) {
            // If Poverty Severity Legend is the last child, append after it
            sidebar.appendChild(filterPanel);
        } else {
            // Fallback: Insert after Layer Controls if Poverty Severity Legend not found
            let layerControlsSection = null;
            for (let section of sections) {
                const heading = section.querySelector('h3');
                if (heading && heading.textContent.toLowerCase().includes('layer controls')) {
                    layerControlsSection = section;
                    break;
                }
            }
            if (layerControlsSection && layerControlsSection.nextSibling) {
                sidebar.insertBefore(filterPanel, layerControlsSection.nextSibling);
            } else if (layerControlsSection) {
                sidebar.appendChild(filterPanel);
            } else {
                const firstSection = sidebar.querySelector('.sidebar-section');
                if (firstSection) {
                    sidebar.insertBefore(filterPanel, firstSection);
                } else {
                    sidebar.insertBefore(filterPanel, sidebar.firstChild);
                }
            }
        }

        // Setup toggle functionality
        document.getElementById('toggleFilters')?.addEventListener('click', () => {
            const content = document.getElementById('filterContent');
            const icon = document.getElementById('toggleFiltersIcon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });
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
        return counties.map(county => `<option value="${county}">${county}</option>`).join('');
    }

    setupEventListeners() {
        // Apply filters
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyAllFilters());
        
        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => this.clearAllFilters());
        
        // Save/Load presets
        document.getElementById('saveFilterPreset')?.addEventListener('click', () => this.savePreset());
        document.getElementById('loadFilterPreset')?.addEventListener('change', (e) => {
            if (e.target.value) this.loadPreset(e.target.value);
        });
        document.getElementById('deletePreset')?.addEventListener('click', () => this.deletePreset());
        
        // Real-time search
        document.getElementById('locationSearch')?.addEventListener('input', (e) => {
            this.activeFilters.searchTerm = e.target.value.toLowerCase();
            this.applyAllFilters();
        });
        
        // County dropdown
        document.getElementById('countyDropdown')?.addEventListener('change', () => {
            this.applyAllFilters();
        });
        
        // Range filters
        ['poverty', 'education', 'health'].forEach(indicator => {
            document.getElementById(`${indicator}Min`)?.addEventListener('change', () => this.applyAllFilters());
            document.getElementById(`${indicator}Max`)?.addEventListener('change', () => this.applyAllFilters());
        });
        
        // Severity checkboxes
        ['critical', 'high', 'moderate', 'low'].forEach(severity => {
            document.getElementById(`severity-${severity}`)?.addEventListener('change', () => this.applyAllFilters());
        });
        
        // Update preset dropdown
        this.updatePresetDropdown();
    }

    applyAllFilters() {
        // Collect all filter values
        const countyDropdown = document.getElementById('countyDropdown');
        const selectedCounty = countyDropdown?.value || '';
        
        const filters = {
            searchTerm: document.getElementById('locationSearch')?.value.toLowerCase() || '',
            counties: selectedCounty ? [selectedCounty] : [],
            severity: [],
            povertyRange: {
                min: parseFloat(document.getElementById('povertyMin')?.value) || 0,
                max: parseFloat(document.getElementById('povertyMax')?.value) || 100
            },
            educationRange: {
                min: parseFloat(document.getElementById('educationMin')?.value) || 0,
                max: parseFloat(document.getElementById('educationMax')?.value) || 100
            },
            healthRange: {
                min: parseFloat(document.getElementById('healthMin')?.value) || 0,
                max: parseFloat(document.getElementById('healthMax')?.value) || 100
            }
        };

        // Get selected severity levels
        ['critical', 'high', 'moderate', 'low'].forEach(severity => {
            if (document.getElementById(`severity-${severity}`)?.checked) {
                filters.severity.push(severity);
            }
        });

        this.activeFilters = filters;
        
        // Apply filters to data
        this.filterData();
        
        // Update filter summary
        this.updateFilterSummary();
        
        // Emit filter event for other components
        this.notifyFilterChange();
        
        console.log('🔍 Filters applied:', filters);
    }

    filterData() {
        // Get data source (from main app or sample data)
        let dataSource = [];
        
        if (window.ipmasApp && window.ipmasApp.locations) {
            dataSource = window.ipmasApp.locations;
        } else if (typeof sampleData !== 'undefined' && sampleData.locations) {
            dataSource = sampleData.locations;
        }

        this.filteredData = dataSource.filter(location => {
            // Search filter
            if (this.activeFilters.searchTerm) {
                const searchable = `${location.name || ''} ${location.county || ''} ${location.ward || ''}`.toLowerCase();
                if (!searchable.includes(this.activeFilters.searchTerm)) {
                    return false;
                }
            }

            // County filter (single selection)
            if (this.activeFilters.counties.length > 0) {
                if (location.county !== this.activeFilters.counties[0]) {
                    return false;
                }
            }

            // Severity filter
            if (this.activeFilters.severity.length > 0) {
                const severity = this.getSeverityLevel(location.poverty_index || 0);
                if (!this.activeFilters.severity.includes(severity)) {
                    return false;
                }
            }

            // Range filters
            const poverty = location.poverty_index || 0;
            if (poverty < this.activeFilters.povertyRange.min || poverty > this.activeFilters.povertyRange.max) {
                return false;
            }

            const education = location.education_access || 0;
            if (education < this.activeFilters.educationRange.min || education > this.activeFilters.educationRange.max) {
                return false;
            }

            const health = location.health_vulnerability || 0;
            if (health < this.activeFilters.healthRange.min || health > this.activeFilters.healthRange.max) {
                return false;
            }

            return true;
        });

        // Update map markers if available
        this.updateMapMarkers();

        // Update statistics
        this.updateFilteredStatistics();
        
        console.log(`✅ Filtered ${this.filteredData.length} locations from ${dataSource.length} total`);
    }

    getSeverityLevel(povertyIndex) {
        if (povertyIndex >= 70) return 'critical';
        if (povertyIndex >= 50) return 'high';
        if (povertyIndex >= 30) return 'moderate';
        return 'low';
    }

    updateMapMarkers() {
        // Priority 1: Use poverty-map.js applyAdvancedFilters method (for poverty-map page)
        if (window.povertyMapSystem && window.povertyMapSystem.applyAdvancedFilters) {
            window.povertyMapSystem.applyAdvancedFilters(this.filteredData);
            console.log('✅ Updated map using povertyMapSystem.applyAdvancedFilters');
            return;
        }
        
        // Priority 2: Use main.js applyAdvancedFilters method (for dashboard)
        if (window.ipmasApp && window.ipmasApp.applyAdvancedFilters) {
            window.ipmasApp.applyAdvancedFilters(this.filteredData, this.activeFilters);
            console.log('✅ Updated map using ipmasApp.applyAdvancedFilters');
            return;
        }
        
        // Priority 3: Use applyCustomFilters method
        if (window.ipmasApp && window.ipmasApp.applyCustomFilters) {
            window.ipmasApp.applyCustomFilters(this.filteredData);
            console.log('✅ Updated map using ipmasApp.applyCustomFilters');
            return;
        }
        
        console.log('⚠️ No map integration found for advanced filters - map may not update');
    }

    updateFilteredStatistics() {
        // Update UI with filtered results count
        const summary = document.getElementById('filterSummary');
        if (summary) {
            const totalSources = window.ipmasApp?.locations?.length || 
                                (typeof sampleData !== 'undefined' ? sampleData.locations?.length : 0);
            summary.innerHTML = `
                <strong>Active Filters:</strong> ${this.getActiveFiltersCount()} filters<br>
                <strong>Results:</strong> ${this.filteredData.length} of ${totalSources} locations
            `;
        }
    }

    getActiveFiltersCount() {
        let count = 0;
        if (this.activeFilters.searchTerm) count++;
        if (this.activeFilters.counties.length > 0) count++;
        if (this.activeFilters.severity.length > 0) count++;
        if (this.activeFilters.povertyRange.min > 0 || this.activeFilters.povertyRange.max < 100) count++;
        if (this.activeFilters.educationRange.min > 0 || this.activeFilters.educationRange.max < 100) count++;
        if (this.activeFilters.healthRange.min > 0 || this.activeFilters.healthRange.max < 100) count++;
        return count;
    }

    updateFilterSummary() {
        const filters = [];
        if (this.activeFilters.searchTerm) filters.push(`Search: "${this.activeFilters.searchTerm}"`);
        if (this.activeFilters.counties.length > 0) filters.push(`County: ${this.activeFilters.counties[0]}`);
        if (this.activeFilters.severity.length > 0) filters.push(`${this.activeFilters.severity.length} severity levels`);
        if (this.activeFilters.povertyRange.min > 0 || this.activeFilters.povertyRange.max < 100) {
            filters.push(`Poverty: ${this.activeFilters.povertyRange.min}-${this.activeFilters.povertyRange.max}%`);
        }

        const summary = document.getElementById('filterSummary');
        if (summary) {
            summary.innerHTML = `<strong>Active Filters:</strong> ${filters.length > 0 ? filters.join(', ') : 'None'}<br>
                <strong>Results:</strong> ${this.filteredData.length} locations`;
        }
    }

    clearAllFilters() {
        // Reset all filter inputs
        document.getElementById('locationSearch').value = '';
        const countyDropdown = document.getElementById('countyDropdown');
        if (countyDropdown) countyDropdown.value = '';
        document.getElementById('povertyMin').value = 0;
        document.getElementById('povertyMax').value = 100;
        document.getElementById('educationMin').value = 0;
        document.getElementById('educationMax').value = 100;
        document.getElementById('healthMin').value = 0;
        document.getElementById('healthMax').value = 100;
        
        ['critical', 'high', 'moderate', 'low'].forEach(severity => {
            document.getElementById(`severity-${severity}`).checked = false;
        });

        this.activeFilters = {
            counties: [],
            severity: [],
            povertyRange: { min: 0, max: 100 },
            educationRange: { min: 0, max: 100 },
            healthRange: { min: 0, max: 100 },
            searchTerm: ''
        };

        this.applyAllFilters();
    }


    savePreset() {
        const name = prompt('Enter a name for this filter preset:');
        if (!name) return;

        const preset = {
            id: Date.now(),
            name: name,
            filters: JSON.parse(JSON.stringify(this.activeFilters)),
            createdAt: new Date().toISOString()
        };

        this.savedPresets.push(preset);
        this.savePresetsToStorage();
        this.updatePresetDropdown();
        
        alert(`Filter preset "${name}" saved successfully!`);
    }

    loadPreset(presetId) {
        const preset = this.savedPresets.find(p => p.id.toString() === presetId.toString());
        if (!preset) return;

        // Restore filter values
        this.restoreFiltersFromPreset(preset.filters);
        this.applyAllFilters();
        
        console.log(`✅ Loaded preset: ${preset.name}`);
    }

    restoreFiltersFromPreset(filters) {
        if (filters.searchTerm) document.getElementById('locationSearch').value = filters.searchTerm;
        
        const countyDropdown = document.getElementById('countyDropdown');
        if (countyDropdown && filters.counties && filters.counties.length > 0) {
            // Use the first selected county (for backward compatibility with old presets)
            countyDropdown.value = filters.counties[0] || '';
        }

        if (filters.povertyRange) {
            document.getElementById('povertyMin').value = filters.povertyRange.min;
            document.getElementById('povertyMax').value = filters.povertyRange.max;
        }
        if (filters.educationRange) {
            document.getElementById('educationMin').value = filters.educationRange.min;
            document.getElementById('educationMax').value = filters.educationRange.max;
        }
        if (filters.healthRange) {
            document.getElementById('healthMin').value = filters.healthRange.min;
            document.getElementById('healthMax').value = filters.healthRange.max;
        }

        if (filters.severity) {
            filters.severity.forEach(severity => {
                document.getElementById(`severity-${severity}`).checked = true;
            });
        }
    }

    deletePreset() {
        const select = document.getElementById('loadFilterPreset');
        const presetId = select.value;
        if (!presetId) {
            alert('Please select a preset to delete');
            return;
        }

        if (confirm('Are you sure you want to delete this preset?')) {
            this.savedPresets = this.savedPresets.filter(p => p.id.toString() !== presetId.toString());
            this.savePresetsToStorage();
            this.updatePresetDropdown();
            select.value = '';
            alert('Preset deleted successfully');
        }
    }

    updatePresetDropdown() {
        const select = document.getElementById('loadFilterPreset');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Load Saved Preset...</option>';
        
        this.savedPresets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = `${preset.name} (${new Date(preset.createdAt).toLocaleDateString()})`;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }

    loadPresets() {
        try {
            const stored = localStorage.getItem('ipmas_filter_presets');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading presets:', error);
            return [];
        }
    }

    savePresetsToStorage() {
        try {
            localStorage.setItem('ipmas_filter_presets', JSON.stringify(this.savedPresets));
        } catch (error) {
            console.error('Error saving presets:', error);
        }
    }

    notifyFilterChange() {
        // Emit custom event for other components
        const event = new CustomEvent('filtersChanged', {
            detail: { filters: this.activeFilters, filteredData: this.filteredData }
        });
        document.dispatchEvent(event);
    }

    // Public method to get filtered data
    getFilteredData() {
        return this.filteredData;
    }

    // Public method to get active filters
    getActiveFilters() {
        return this.activeFilters;
    }
}

// Initialize when DOM is ready - ONLY on poverty-map page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Only initialize on poverty-map page, not on dashboard or other pages
        if (window.location.pathname.includes('poverty-map')) {
            window.advancedFilters = new AdvancedFilters();
        }
    });
} else {
    // Only initialize on poverty-map page, not on dashboard or other pages
    if (window.location.pathname.includes('poverty-map')) {
        window.advancedFilters = new AdvancedFilters();
    }
}

