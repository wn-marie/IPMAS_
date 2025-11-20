/**
 * IPMAS Dashboard Customization System
 * Allows users to customize dashboard layout, widgets, and KPIs
 */

class DashboardCustomization {
    constructor() {
        this.customLayout = this.loadCustomLayout();
        this.availableWidgets = [
            { id: 'poverty-map', name: 'Poverty Map', icon: '🗺️', default: true },
            { id: 'poverty-stats', name: 'Poverty Statistics', icon: '📊', default: true },
            { id: 'education-stats', name: 'Education Access', icon: '🎓', default: false },
            { id: 'health-stats', name: 'Health Vulnerability', icon: '🏥', default: false },
            { id: 'water-stats', name: 'Water Access', icon: '💧', default: false },
            { id: 'trends-chart', name: 'Trends Chart', icon: '📈', default: true },
            { id: 'comparison-chart', name: 'Comparison Chart', icon: '📊', default: false },
            { id: 'recent-activity', name: 'Recent Activity', icon: '🕐', default: false }
        ];
        this.favoriteKPIs = this.loadFavoriteKPIs();
        this.init();
    }

    init() {
        console.log('🎨 Dashboard Customization initializing...');
        
        // Only initialize on dashboard page
        if (window.location.pathname.includes('poverty-models')) {
            return;
        }

        this.createCustomizationUI();
        this.setupEventListeners();
        this.applyCustomLayout();
        console.log('✅ Dashboard Customization initialized');
    }

    createCustomizationUI() {
        // Check if already exists
        if (document.getElementById('dashboardCustomizationPanel')) {
            return;
        }

        // Find where to add customization controls
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const customizationPanel = document.createElement('div');
        customizationPanel.id = 'dashboardCustomizationPanel';
        customizationPanel.className = 'sidebar-section';
        customizationPanel.innerHTML = `
            <div class="customization-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: var(--primary-color);">🎨 Customize Dashboard</h3>
                <button class="btn btn-sm btn-secondary" id="toggleCustomization">
                    <span id="toggleCustomizationIcon">▼</span>
                </button>
            </div>
            
            <div id="customizationContent" style="display: block;">
                <!-- Favorite KPIs -->
                <div class="form-group" style="margin-bottom: 20px;">
                    <label class="form-label" style="font-weight: 600;">⭐ Favorite KPIs</label>
                    <div id="favoriteKPIsList" class="checkbox-group">
                        ${this.getKPIOptions()}
                    </div>
                </div>

                <!-- Widget Management -->
                <div class="form-group" style="margin-bottom: 20px;">
                    <label class="form-label" style="font-weight: 600;">📊 Dashboard Widgets</label>
                    <p style="font-size: 0.85rem; color: #6c757d; margin-bottom: 10px;">
                        Drag to reorder, check/uncheck to show/hide
                    </p>
                    <div id="widgetsList" class="widgets-list">
                        ${this.getWidgetOptions()}
                    </div>
                </div>

                <!-- Color Theme -->
                <div class="form-group" style="margin-bottom: 20px;">
                    <label class="form-label" style="font-weight: 600;">🎨 Color Theme</label>
                    <select id="colorTheme" class="form-control">
                        <option value="default">Default (Green)</option>
                        <option value="blue">Blue</option>
                        <option value="purple">Purple</option>
                        <option value="orange">Orange</option>
                        <option value="dark">Dark Mode</option>
                    </select>
                </div>

                <!-- Actions -->
                <div class="customization-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <button class="btn btn-primary" id="saveCustomization" style="width: 100%; margin-bottom: 10px;">
                        💾 Save Layout
                    </button>
                    <button class="btn btn-secondary" id="resetCustomization" style="width: 100%;">
                        🔄 Reset to Default
                    </button>
                </div>
            </div>
        `;

        sidebar.appendChild(customizationPanel);

        // Toggle functionality
        document.getElementById('toggleCustomization')?.addEventListener('click', () => {
            const content = document.getElementById('customizationContent');
            const icon = document.getElementById('toggleCustomizationIcon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });

        // Initialize theme selector with saved theme
        const themeSelect = document.getElementById('colorTheme');
        if (themeSelect) {
            const currentTheme = window.themeManager?.getCurrentTheme() || this.customLayout.theme || 'default';
            themeSelect.value = currentTheme;
            this.applyTheme(currentTheme);
        }
    }

    getKPIOptions() {
        const kpis = [
            { id: 'total-locations', label: 'Total Locations', default: true },
            { id: 'avg-poverty', label: 'Average Poverty Index', default: true },
            { id: 'poverty-trend', label: 'Poverty Trend', default: false },
            { id: 'education-coverage', label: 'Education Coverage', default: false },
            { id: 'health-status', label: 'Health Status', default: false },
            { id: 'water-coverage', label: 'Water Coverage', default: false }
        ];

        return kpis.map(kpi => `
            <label class="checkbox-label">
                <input type="checkbox" id="kpi-${kpi.id}" ${kpi.default || this.favoriteKPIs.includes(kpi.id) ? 'checked' : ''}
                    onchange="window.dashboardCustomization.toggleKPI('${kpi.id}')">
                <span>${kpi.label}</span>
            </label>
        `).join('');
    }

    getWidgetOptions() {
        return this.availableWidgets.map(widget => `
            <div class="widget-item" data-widget-id="${widget.id}" 
                style="display: flex; align-items: center; padding: 10px; margin-bottom: 8px; background: #f8f9fa; border-radius: 6px;">
                <span style="margin-right: 10px; font-size: 1.2rem;">${widget.icon}</span>
                <span style="flex: 1; font-weight: 500;">${widget.name}</span>
                <label class="switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                    <input type="checkbox" ${widget.default || this.customLayout.visibleWidgets.includes(widget.id) ? 'checked' : ''}
                        onchange="window.dashboardCustomization.toggleWidget('${widget.id}')">
                    <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.4s; border-radius: 24px;"></span>
                </label>
            </div>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('saveCustomization')?.addEventListener('click', () => {
            this.saveCustomization();
        });

        document.getElementById('resetCustomization')?.addEventListener('click', () => {
            if (confirm('Reset dashboard to default layout? This will clear all your customizations.')) {
                this.resetToDefault();
            }
        });

        document.getElementById('colorTheme')?.addEventListener('change', (e) => {
            const selectedTheme = e.target.value;
            this.applyTheme(selectedTheme);
        });
    }

    toggleKPI(kpiId) {
        const checkbox = document.getElementById(`kpi-${kpiId}`);
        if (checkbox.checked) {
            if (!this.favoriteKPIs.includes(kpiId)) {
                this.favoriteKPIs.push(kpiId);
            }
        } else {
            this.favoriteKPIs = this.favoriteKPIs.filter(id => id !== kpiId);
        }
        this.saveFavoriteKPIs();
        console.log('⭐ Favorite KPIs updated:', this.favoriteKPIs);
    }

    toggleWidget(widgetId) {
        const checkbox = document.querySelector(`[data-widget-id="${widgetId}"] input[type="checkbox"]`);
        if (checkbox.checked) {
            if (!this.customLayout.visibleWidgets.includes(widgetId)) {
                this.customLayout.visibleWidgets.push(widgetId);
            }
        } else {
            this.customLayout.visibleWidgets = this.customLayout.visibleWidgets.filter(id => id !== widgetId);
        }
        this.applyCustomLayout();
        console.log('📊 Widget toggled:', widgetId, 'Visible:', this.customLayout.visibleWidgets);
    }

    applyCustomLayout() {
        // Show/hide widgets based on customization
        this.availableWidgets.forEach(widget => {
            const element = document.getElementById(widget.id) || 
                          document.querySelector(`[data-widget="${widget.id}"]`);
            if (element) {
                const isVisible = this.customLayout.visibleWidgets.includes(widget.id) || widget.default;
                element.style.display = isVisible ? '' : 'none';
            }
        });
    }

    applyTheme(theme) {
        if (window.themeManager) {
            window.themeManager.setTheme(theme);
        }
        this.customLayout.theme = theme;
        console.log('🎨 Theme applied:', theme);
    }

    saveCustomization() {
        // Collect current state
        const customization = {
            visibleWidgets: [],
            favoriteKPIs: this.favoriteKPIs,
            theme: document.getElementById('colorTheme')?.value || (window.themeManager?.getCurrentTheme() || 'default'),
            savedAt: new Date().toISOString()
        };

        // Collect visible widgets
        this.availableWidgets.forEach(widget => {
            const checkbox = document.querySelector(`[data-widget-id="${widget.id}"] input[type="checkbox"]`);
            if (checkbox && checkbox.checked) {
                customization.visibleWidgets.push(widget.id);
            }
        });

        this.customLayout = customization;
        this.saveCustomLayoutToStorage();
        
        alert('✅ Dashboard customization saved successfully!');
        console.log('💾 Customization saved:', customization);
    }

    resetToDefault() {
        this.customLayout = {
            visibleWidgets: this.availableWidgets.filter(w => w.default).map(w => w.id),
            favoriteKPIs: ['total-locations', 'avg-poverty'],
            theme: 'default'
        };
        
        // Reset checkboxes
        this.availableWidgets.forEach(widget => {
            const checkbox = document.querySelector(`[data-widget-id="${widget.id}"] input[type="checkbox"]`);
            if (checkbox) {
                checkbox.checked = widget.default;
            }
        });

        const kpiCheckboxes = ['total-locations', 'avg-poverty'];
        kpiCheckboxes.forEach(kpiId => {
            const checkbox = document.getElementById(`kpi-${kpiId}`);
            if (checkbox) checkbox.checked = true;
        });
        document.getElementById('kpi-total-locations').checked = true;
        document.getElementById('kpi-avg-poverty').checked = true;

        this.favoriteKPIs = ['total-locations', 'avg-poverty'];
        document.getElementById('colorTheme').value = 'default';
        
        this.applyTheme('default');
        this.applyCustomLayout();
        this.saveCustomLayoutToStorage();
        this.saveFavoriteKPIs();
        
        alert('🔄 Dashboard reset to default layout');
    }

    loadCustomLayout() {
        try {
            const stored = localStorage.getItem('ipmas_dashboard_layout');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (!parsed.theme) {
                    parsed.theme = window.themeManager?.getCurrentTheme() || 'default';
                }
                return parsed;
            }
            
            // Default layout if nothing stored
            return {
                visibleWidgets: ['poverty-map', 'poverty-stats', 'trends-chart'],
                theme: window.themeManager?.getCurrentTheme() || 'default'
            };
        } catch (error) {
            console.error('Error loading custom layout:', error);
            // Fallback default layout
            return {
                visibleWidgets: ['poverty-map', 'poverty-stats', 'trends-chart'],
                theme: window.themeManager?.getCurrentTheme() || 'default'
            };
        }
    }

    saveCustomLayoutToStorage() {
        try {
            localStorage.setItem('ipmas_dashboard_layout', JSON.stringify(this.customLayout));
        } catch (error) {
            console.error('Error saving custom layout:', error);
        }
    }

    loadFavoriteKPIs() {
        try {
            const stored = localStorage.getItem('ipmas_favorite_kpis');
            return stored ? JSON.parse(stored) : ['total-locations', 'avg-poverty'];
        } catch (error) {
            return ['total-locations', 'avg-poverty'];
        }
    }

    saveFavoriteKPIs() {
        try {
            localStorage.setItem('ipmas_favorite_kpis', JSON.stringify(this.favoriteKPIs));
        } catch (error) {
            console.error('Error saving favorite KPIs:', error);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.location.pathname.includes('poverty-models')) {
            window.dashboardCustomization = new DashboardCustomization();
        }
    });
} else {
    if (!window.location.pathname.includes('poverty-models')) {
        window.dashboardCustomization = new DashboardCustomization();
    }
}

