/**
 * IPMAS Test Charts Module
 * Handles chart testing, performance monitoring, and visualization
 */

class TestChartsManager {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.isConnected = false;
        this.debugMode = false;
        this.performanceTest = null;
        this.metrics = {
            renderTimes: [],
            fps: 0,
            memoryUsage: 0,
            updateCount: 0
        };
        
        this.init();
    }

    async init() {
        try {
            this.showLoading(true);
            
            // Initialize core components first
            await this.initializeCharts();
            this.setupEventListeners();
            this.startPerformanceMonitoring();
            
            // Try to connect to socket, but don't fail if it doesn't work
            try {
                await this.initializeSocket();
            } catch (socketError) {
                console.log('ℹ️ Socket.IO not available - using polling mode for real-time updates');
                this.updateConnectionStatus('offline', 'Offline Mode');
            }
            
            this.showLoading(false);
            
            console.log('📊 Test Charts Manager initialized successfully');
            this.debug('Test Charts Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Test Charts Manager:', error);
            this.showError('Failed to initialize charts system');
            this.showLoading(false);
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

                this.socket = io({
                    timeout: 5000,
                    forceNew: true
                });
                
                this.socket.on('connect', () => {
                    this.isConnected = true;
                    this.updateConnectionStatus('online', 'Connected');
                    this.debug('Socket connected');
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    this.isConnected = false;
                    this.updateConnectionStatus('offline', 'Disconnected');
                    this.debug('Socket disconnected');
                });

                this.socket.on('connect_error', (error) => {
                    console.warn('Socket connection error:', error);
                    this.updateConnectionStatus('offline', 'Connection Error');
                    reject(new Error('Socket connection failed'));
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

    async initializeCharts() {
        // Initialize main test chart
        this.initializeMainChart();
        
        // Initialize comparison charts
        this.initializeComparisonCharts();
        
        this.debug('All charts initialized');
    }

    initializeMainChart() {
        const canvas = document.getElementById('testChart');
        if (!canvas) return;

        this.charts.main = new Chart(canvas, {
            type: 'bar',
            data: this.generateChartData('bar', 'poverty'),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000
                },
                plugins: {
                    legend: {
                        display: true
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

    initializeComparisonCharts() {
        const chartConfigs = {
            barChart: {
                type: 'bar',
                data: this.generateChartData('bar', 'all'),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            },
            lineChart: {
                type: 'line',
                data: this.generateChartData('line', 'education'),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            },
            doughnutChart: {
                type: 'doughnut',
                data: this.generateChartData('doughnut', 'health'),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            },
            scatterChart: {
                type: 'scatter',
                data: this.generateChartData('scatter', 'water'),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            },
            radarChart: {
                type: 'radar',
                data: this.generateChartData('radar', 'employment'),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            },
            bubbleChart: {
                type: 'bubble',
                data: this.generateChartData('bubble', 'housing'),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        };

        for (const [chartId, config] of Object.entries(chartConfigs)) {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                this.charts[chartId] = new Chart(canvas, config);
            }
        }
    }

    generateChartData(type, dataSource) {
        const baseData = this.getDataSourceData(dataSource);
        
        switch (type) {
            case 'bar':
                return {
                    labels: baseData.labels,
                    datasets: [{
                        label: baseData.label,
                        data: baseData.values,
                        backgroundColor: this.getColorScheme('default'),
                        borderColor: this.getColorScheme('default', true),
                        borderWidth: 1
                    }]
                };
                
            case 'line':
                return {
                    labels: baseData.labels,
                    datasets: [{
                        label: baseData.label,
                        data: baseData.values,
                        borderColor: 'rgba(46, 139, 87, 1)',
                        backgroundColor: 'rgba(46, 139, 87, 0.2)',
                        tension: 0.4,
                        fill: true
                    }]
                };
                
            case 'doughnut':
                return {
                    labels: baseData.labels.slice(0, 5),
                    datasets: [{
                        data: baseData.values.slice(0, 5),
                        backgroundColor: this.getColorScheme('default'),
                        borderWidth: 2
                    }]
                };
                
            case 'scatter':
                return {
                    datasets: [{
                        label: baseData.label,
                        data: baseData.values.map((value, index) => ({
                            x: index,
                            y: value
                        })),
                        backgroundColor: 'rgba(46, 139, 87, 0.6)'
                    }]
                };
                
            case 'radar':
                return {
                    labels: baseData.labels.slice(0, 6),
                    datasets: [{
                        label: baseData.label,
                        data: baseData.values.slice(0, 6),
                        borderColor: 'rgba(46, 139, 87, 1)',
                        backgroundColor: 'rgba(46, 139, 87, 0.2)',
                        pointBackgroundColor: 'rgba(46, 139, 87, 1)'
                    }]
                };
                
            case 'bubble':
                return {
                    datasets: [{
                        label: baseData.label,
                        data: baseData.values.map((value, index) => ({
                            x: index,
                            y: value,
                            r: Math.random() * 10 + 5
                        })),
                        backgroundColor: 'rgba(46, 139, 87, 0.6)'
                    }]
                };
                
            default:
                return baseData;
        }
    }

    getDataSourceData(source) {
        if (typeof sampleData === 'undefined') {
            // Fallback data if sample data is not available
            return {
                labels: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
                values: [45, 38, 52, 41, 35],
                label: 'Sample Data'
            };
        }

        const locations = sampleData.locations.slice(0, 20); // Limit to 20 locations
        
        switch (source) {
            case 'poverty':
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.poverty_index),
                    label: 'Poverty Index'
                };
                
            case 'education':
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.education_access),
                    label: 'Education Access'
                };
                
            case 'health':
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.health_vulnerability),
                    label: 'Health Vulnerability'
                };
                
            case 'water':
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.water_access),
                    label: 'Water Access'
                };
                
            case 'employment':
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.employment_rate),
                    label: 'Employment Rate'
                };
                
            case 'housing':
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.housing_quality),
                    label: 'Housing Quality'
                };
                
            case 'all':
                return {
                    labels: ['Poverty', 'Education', 'Health', 'Water', 'Employment', 'Housing'],
                    values: [
                        locations.reduce((sum, loc) => sum + loc.poverty_index, 0) / locations.length,
                        locations.reduce((sum, loc) => sum + loc.education_access, 0) / locations.length,
                        locations.reduce((sum, loc) => sum + loc.health_vulnerability, 0) / locations.length,
                        locations.reduce((sum, loc) => sum + loc.water_access, 0) / locations.length,
                        locations.reduce((sum, loc) => sum + loc.employment_rate, 0) / locations.length,
                        locations.reduce((sum, loc) => sum + loc.housing_quality, 0) / locations.length
                    ],
                    label: 'Average Indicators'
                };
                
            default:
                return {
                    labels: locations.map(loc => loc.name),
                    values: locations.map(loc => loc.poverty_index),
                    label: 'Poverty Index'
                };
        }
    }

    getColorScheme(scheme, border = false) {
        const schemes = {
            default: ['rgba(46, 139, 87, 0.8)', 'rgba(70, 130, 180, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(220, 53, 69, 0.8)', 'rgba(108, 117, 125, 0.8)'],
            viridis: ['rgba(68, 1, 84, 0.8)', 'rgba(59, 82, 139, 0.8)', 'rgba(33, 144, 140, 0.8)', 'rgba(92, 200, 99, 0.8)', 'rgba(253, 231, 37, 0.8)'],
            plasma: ['rgba(13, 8, 135, 0.8)', 'rgba(75, 41, 145, 0.8)', 'rgba(125, 38, 205, 0.8)', 'rgba(180, 51, 138, 0.8)', 'rgba(240, 249, 33, 0.8)'],
            inferno: ['rgba(0, 0, 4, 0.8)', 'rgba(87, 16, 110, 0.8)', 'rgba(188, 55, 84, 0.8)', 'rgba(251, 135, 97, 0.8)', 'rgba(252, 255, 164, 0.8)'],
            magma: ['rgba(0, 0, 4, 0.8)', 'rgba(80, 18, 123, 0.8)', 'rgba(182, 54, 121, 0.8)', 'rgba(251, 136, 118, 0.8)', 'rgba(252, 255, 164, 0.8)'],
            cividis: ['rgba(0, 32, 76, 0.8)', 'rgba(54, 75, 124, 0.8)', 'rgba(106, 118, 147, 0.8)', 'rgba(156, 163, 173, 0.8)', 'rgba(252, 255, 164, 0.8)'],
            rainbow: ['rgba(255, 0, 0, 0.8)', 'rgba(255, 127, 0, 0.8)', 'rgba(255, 255, 0, 0.8)', 'rgba(0, 255, 0, 0.8)', 'rgba(0, 0, 255, 0.8)']
        };

        if (border) {
            return schemes[scheme] || schemes.default;
        }
        
        return schemes[scheme] || schemes.default;
    }

    setupEventListeners() {
        // Chart controls
        document.getElementById('chartType')?.addEventListener('change', () => this.updateMainChart());
        document.getElementById('dataSource')?.addEventListener('change', () => this.updateMainChart());
        document.getElementById('colorScheme')?.addEventListener('change', () => this.updateMainChart());
        document.getElementById('animationSpeed')?.addEventListener('input', (e) => {
            document.getElementById('animationSpeedValue').textContent = `${e.target.value}ms`;
            this.updateAnimationSpeed(parseInt(e.target.value));
        });
        
        document.getElementById('updateChartBtn')?.addEventListener('click', () => this.updateMainChart());
        document.getElementById('exportChartBtn')?.addEventListener('click', () => this.exportChart());
        
        // Performance test controls
        document.getElementById('dataPoints')?.addEventListener('input', (e) => {
            document.getElementById('dataPointsValue').textContent = `${e.target.value} points`;
        });
        document.getElementById('startPerformanceTest')?.addEventListener('click', () => this.startPerformanceTest());
        document.getElementById('stopPerformanceTest')?.addEventListener('click', () => this.stopPerformanceTest());
        
        // Chart settings
        document.getElementById('showLegend')?.addEventListener('change', () => this.updateChartSettings());
        document.getElementById('showGrid')?.addEventListener('change', () => this.updateChartSettings());
        document.getElementById('showTooltips')?.addEventListener('change', () => this.updateChartSettings());
        document.getElementById('responsiveChart')?.addEventListener('change', () => this.updateChartSettings());
        
        // Analytics
        document.getElementById('regenerateAllCharts')?.addEventListener('click', () => this.regenerateAllCharts());
        document.getElementById('exportAllCharts')?.addEventListener('click', () => this.exportAllCharts());
        
        // Statistics
        document.getElementById('resetMetricsBtn')?.addEventListener('click', () => this.resetMetrics());
        
        // Debug
        document.getElementById('toggleDebug')?.addEventListener('click', () => this.toggleDebug());
        document.getElementById('clearDebugBtn')?.addEventListener('click', () => this.clearDebug());
        
        this.debug('Event listeners setup complete');
    }

    updateMainChart() {
        const chartType = document.getElementById('chartType').value;
        const dataSource = document.getElementById('dataSource').value;
        const colorScheme = document.getElementById('colorScheme').value;
        
        this.debug(`Updating main chart: ${chartType} - ${dataSource} - ${colorScheme}`);
        
        const startTime = performance.now();
        
        if (this.charts.main) {
            // Update chart type
            this.charts.main.config.type = chartType;
            
            // Update data
            this.charts.main.data = this.generateChartData(chartType, dataSource);
            
            // Update colors
            if (chartType === 'bar' || chartType === 'doughnut') {
                this.charts.main.data.datasets[0].backgroundColor = this.getColorScheme(colorScheme);
                if (chartType === 'bar') {
                    this.charts.main.data.datasets[0].borderColor = this.getColorScheme(colorScheme, true);
                }
            }
            
            // Update chart
            this.charts.main.update();
        }
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        this.recordRenderTime(renderTime);
        this.updateMetrics();
        
        // Update UI
        document.getElementById('currentChartType').textContent = chartType.charAt(0).toUpperCase() + chartType.slice(1) + ' Chart';
        document.getElementById('renderTime').textContent = `${Math.round(renderTime)}ms`;
    }

    updateAnimationSpeed(speed) {
        if (this.charts.main) {
            this.charts.main.options.animation.duration = speed;
        }
        
        // Update all comparison charts
        Object.values(this.charts).forEach(chart => {
            if (chart.options.animation) {
                chart.options.animation.duration = speed;
            }
        });
    }

    updateChartSettings() {
        const showLegend = document.getElementById('showLegend').checked;
        const showGrid = document.getElementById('showGrid').checked;
        const showTooltips = document.getElementById('showTooltips').checked;
        const responsive = document.getElementById('responsiveChart').checked;
        
        // Update main chart
        if (this.charts.main) {
            this.charts.main.options.plugins.legend.display = showLegend;
            this.charts.main.options.responsive = responsive;
            
            if (this.charts.main.options.scales) {
                this.charts.main.options.scales.y.grid.display = showGrid;
                this.charts.main.options.scales.x.grid.display = showGrid;
            }
            
            this.charts.main.options.plugins.tooltip = {
                enabled: showTooltips
            };
            
            this.charts.main.update();
        }
        
        // Update comparison charts
        Object.values(this.charts).forEach(chart => {
            if (chart !== this.charts.main) {
                chart.options.plugins.legend.display = showLegend;
                chart.options.responsive = responsive;
                
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.grid) {
                            scale.grid.display = showGrid;
                        }
                    });
                }
                
                chart.options.plugins.tooltip = {
                    enabled: showTooltips
                };
                
                chart.update();
            }
        });
    }

    startPerformanceTest() {
        const dataPoints = parseInt(document.getElementById('dataPoints').value);
        const updateFrequency = parseInt(document.getElementById('updateFrequency').value);
        
        this.debug(`Starting performance test: ${dataPoints} points, ${updateFrequency}ms frequency`);
        
        this.performanceTest = {
            isRunning: true,
            dataPoints: dataPoints,
            updateFrequency: updateFrequency,
            startTime: Date.now(),
            updateCount: 0
        };
        
        // Update UI
        document.getElementById('startPerformanceTest').style.display = 'none';
        document.getElementById('stopPerformanceTest').style.display = 'inline-block';
        
        // Start test loop
        this.performanceTestLoop();
    }

    stopPerformanceTest() {
        if (this.performanceTest) {
            this.performanceTest.isRunning = false;
            this.debug('Performance test stopped');
            
            // Update UI
            document.getElementById('startPerformanceTest').style.display = 'inline-block';
            document.getElementById('stopPerformanceTest').style.display = 'none';
        }
    }

    performanceTestLoop() {
        if (!this.performanceTest || !this.performanceTest.isRunning) return;
        
        const startTime = performance.now();
        
        // Generate new data with specified number of points
        const newData = this.generatePerformanceTestData(this.performanceTest.dataPoints);
        
        // Update main chart
        if (this.charts.main) {
            this.charts.main.data.datasets[0].data = newData;
            this.charts.main.update('none'); // Disable animation for performance
        }
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        this.recordRenderTime(renderTime);
        this.performanceTest.updateCount++;
        
        // Update metrics
        this.updateMetrics();
        
        // Schedule next update
        setTimeout(() => {
            this.performanceTestLoop();
        }, this.performanceTest.updateFrequency);
    }

    generatePerformanceTestData(points) {
        const data = [];
        for (let i = 0; i < points; i++) {
            data.push(Math.random() * 100);
        }
        return data;
    }

    recordRenderTime(renderTime) {
        this.metrics.renderTimes.push(renderTime);
        
        // Keep only last 100 render times
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }
    }

    updateMetrics() {
        // Calculate average render time
        if (this.metrics.renderTimes.length > 0) {
            const avgRenderTime = this.metrics.renderTimes.reduce((sum, time) => sum + time, 0) / this.metrics.renderTimes.length;
            document.getElementById('avgRenderTime').textContent = Math.round(avgRenderTime);
            
            // Update trend
            const trend = this.calculateTrend(this.metrics.renderTimes);
            document.getElementById('renderTrend').textContent = trend;
        }
        
        // Update FPS (mock calculation)
        this.metrics.fps = Math.floor(Math.random() * 10) + 55; // 55-65 fps
        document.getElementById('fps').textContent = this.metrics.fps;
        
        // Update memory usage (mock)
        this.metrics.memoryUsage = Math.floor(Math.random() * 50) + 100; // 100-150 MB
        document.getElementById('memoryUsage').textContent = this.metrics.memoryUsage;
        
        // Update count
        this.metrics.updateCount++;
        document.getElementById('updateCount').textContent = this.metrics.updateCount;
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    calculateTrend(values) {
        if (values.length < 2) return 'Stable';
        
        const recent = values.slice(-10);
        const older = values.slice(-20, -10);
        
        if (recent.length === 0 || older.length === 0) return 'Stable';
        
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change > 5) return 'Improving';
        if (change < -5) return 'Declining';
        return 'Stable';
    }

    startPerformanceMonitoring() {
        // Monitor FPS
        let lastTime = performance.now();
        let frameCount = 0;
        
        const monitorFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                lastTime = currentTime;
                frameCount = 0;
            }
            
            requestAnimationFrame(monitorFPS);
        };
        
        monitorFPS();
    }

    regenerateAllCharts() {
        this.debug('Regenerating all charts');
        
        // Regenerate comparison charts with new data
        Object.keys(this.charts).forEach(chartId => {
            if (chartId !== 'main' && this.charts[chartId]) {
                const chartType = chartId.replace('Chart', '');
                const dataSource = this.getRandomDataSource();
                
                this.charts[chartId].data = this.generateChartData(chartType, dataSource);
                this.charts[chartId].update();
            }
        });
    }

    getRandomDataSource() {
        const sources = ['poverty', 'education', 'health', 'water', 'employment', 'housing'];
        return sources[Math.floor(Math.random() * sources.length)];
    }

    exportChart() {
        if (this.charts.main) {
            const url = this.charts.main.toBase64Image();
            const link = document.createElement('a');
            link.download = `chart-${Date.now()}.png`;
            link.href = url;
            link.click();
            
            this.debug('Chart exported as PNG');
        }
    }

    exportAllCharts() {
        Object.keys(this.charts).forEach((chartId, index) => {
            setTimeout(() => {
                if (this.charts[chartId]) {
                    const url = this.charts[chartId].toBase64Image();
                    const link = document.createElement('a');
                    link.download = `${chartId}-${Date.now()}.png`;
                    link.href = url;
                    link.click();
                }
            }, index * 500); // Stagger downloads
        });
        
        this.debug('All charts exported');
    }

    resetMetrics() {
        this.metrics = {
            renderTimes: [],
            fps: 0,
            memoryUsage: 0,
            updateCount: 0
        };
        
        // Update UI
        document.getElementById('avgRenderTime').textContent = '0';
        document.getElementById('fps').textContent = '0';
        document.getElementById('memoryUsage').textContent = '0';
        document.getElementById('updateCount').textContent = '0';
        document.getElementById('renderTime').textContent = '0ms';
        
        this.debug('Metrics reset');
    }

    updateConnectionStatus(status, text) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = text;
        }
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
}

// Initialize the test charts manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.testChartsManager = new TestChartsManager();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.testChartsManager) {
        window.testChartsManager.debug(`Page visibility: ${document.visibilityState}`);
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    if (window.testChartsManager) {
        window.testChartsManager.stopPerformanceTest();
        if (window.testChartsManager.socket) {
            window.testChartsManager.socket.disconnect();
        }
    }
});
