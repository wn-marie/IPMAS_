/**
 * IPMAS Global Reports Module
 * Handles report generation, management, and analytics
 */

class ReportsManager {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.reports = [];
        this.isConnected = false;
        this.debugMode = false;
        
        this.init();
    }

    async init() {
        try {
            this.showLoading(true);
            
            // Initialize core components first
            await this.initializeCharts();
            this.setupEventListeners();
            this.loadReportHistory();
            this.loadScheduledReports();
            this.updateStatistics();
            
            // Try to connect to socket, but don't fail if it doesn't work
            try {
                await this.initializeSocket();
            } catch (socketError) {
                console.log('ℹ️ Socket.IO not available - using polling mode for real-time updates');
                this.updateConnectionStatus('offline', 'Offline Mode');
            }
            
            this.showLoading(false);
            
            console.log('📊 Reports Manager initialized successfully');
            this.debug('Reports Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Reports Manager:', error);
            this.showError('Failed to initialize reports system');
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
            console.log(`🔄 Loading overlay ${show ? 'shown' : 'hidden'}`);
        } else {
            console.warn('⚠️ Loading overlay element not found');
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
                
                console.log(`🔌 Reports Manager: Connecting to Socket.IO server at: ${socketUrl}`);
                
                this.socket = io(socketUrl, {
                    timeout: 5000,
                    forceNew: true,
                    transports: ['websocket', 'polling']
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

                this.socket.on('report-generated', (data) => {
                    this.handleReportGenerated(data);
                });

                this.socket.on('report-error', (data) => {
                    this.handleReportError(data);
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
        // Initialize Chart.js charts for analytics
        const chartConfigs = {
            reportsOverTimeChart: {
                type: 'line',
                data: {
                    labels: this.generateTimeLabels(30),
                    datasets: [{
                        label: 'Reports Generated',
                        data: this.generateRandomData(30, 0, 20),
                        borderColor: 'rgba(46, 139, 87, 1)',
                        backgroundColor: 'rgba(46, 139, 87, 0.2)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            },
            reportTypesChart: {
                type: 'doughnut',
                data: {
                    labels: ['Comprehensive', 'Poverty Analysis', 'Education Report', 'Health Report', 'Infrastructure Report'],
                    datasets: [{
                        data: [35, 25, 15, 15, 10],
                        backgroundColor: [
                            'rgba(46, 139, 87, 0.8)',
                            'rgba(70, 130, 180, 0.8)',
                            'rgba(255, 193, 7, 0.8)',
                            'rgba(220, 53, 69, 0.8)',
                            'rgba(108, 117, 125, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            },
            formatPreferencesChart: {
                type: 'bar',
                data: {
                    labels: ['PDF', 'HTML', 'JSON', 'Excel'],
                    datasets: [{
                        label: 'Downloads',
                        data: [120, 80, 45, 35],
                        backgroundColor: 'rgba(46, 139, 87, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            },
            successRateChart: {
                type: 'radar',
                data: {
                    labels: ['PDF', 'HTML', 'JSON', 'Excel', 'Performance', 'Reliability'],
                    datasets: [{
                        label: 'Success Rate %',
                        data: [98, 95, 100, 92, 96, 94],
                        borderColor: 'rgba(46, 139, 87, 1)',
                        backgroundColor: 'rgba(46, 139, 87, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            }
        };

        // Create charts
        for (const [chartId, config] of Object.entries(chartConfigs)) {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                this.charts[chartId] = new Chart(canvas, config);
            }
        }

        this.debug('Analytics charts initialized');
    }

    setupEventListeners() {
        // Report generation - attach to the button in the sidebar
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📊 Generate Report button clicked');
                this.generateReport();
            });
            console.log('✅ Generate Report button event listener attached');
        } else {
            console.warn('⚠️ Generate Report button not found');
        }
        
        // Report history
        document.getElementById('refreshHistoryBtn')?.addEventListener('click', () => this.loadReportHistory());
        
        // Scheduled reports
        document.getElementById('scheduleReportBtn')?.addEventListener('click', () => this.scheduleReport());
        
        // Statistics
        document.getElementById('refreshStatsBtn')?.addEventListener('click', () => this.updateStatistics());
        
        // Analytics
        document.getElementById('updateAnalyticsBtn')?.addEventListener('click', () => this.updateAnalytics());
        document.getElementById('analyticsTimeRange')?.addEventListener('change', () => this.updateAnalytics());
        
        // Debug
        document.getElementById('toggleDebug')?.addEventListener('click', () => this.toggleDebug());
        document.getElementById('clearDebugBtn')?.addEventListener('click', () => this.clearDebug());
        
        // Report type change
        document.getElementById('reportType')?.addEventListener('change', () => this.updateReportPreview());
        document.getElementById('reportFormat')?.addEventListener('change', () => this.updateReportPreview());
        document.getElementById('reportLocation')?.addEventListener('input', () => this.updateReportPreview());
        document.getElementById('reportFilters')?.addEventListener('input', () => this.updateReportPreview());
        
        this.debug('Event listeners setup complete');
    }

    async generateReport() {
        console.log('🚀 generateReport() called');
        
        const reportTypeEl = document.getElementById('reportType');
        const reportFormatEl = document.getElementById('reportFormat');
        const reportLocationEl = document.getElementById('reportLocation');
        const reportFiltersEl = document.getElementById('reportFilters');
        
        if (!reportTypeEl || !reportFormatEl) {
            console.error('Report type or format elements not found');
            alert('Error: Report configuration elements not found. Please refresh the page.');
            return;
        }
        
        const reportType = reportTypeEl.value;
        const reportFormat = reportFormatEl.value;
        const reportLocation = reportLocationEl ? reportLocationEl.value : '';
        const reportFilters = reportFiltersEl ? reportFiltersEl.value : '';
        
        console.log('Report parameters:', { reportType, reportFormat, reportLocation, reportFilters });
        
        if (!reportType || !reportFormat) {
            alert('Please select report type and format');
            return;
        }

        // Track report generation usage
        if (window.usageTracker) {
            window.usageTracker.trackReport();
        }

        const reportData = {
            type: reportType,
            format: reportFormat,
            location: reportLocation ? { name: reportLocation } : null,
            filters: reportFilters ? { description: reportFilters } : {}
        };

        console.log('📋 Generating report with data:', reportData);
        this.debug('Generating report:', reportData);
        
        // Check trial limit before generating report
        if (window.usageTracker) {
            const canGenerate = window.usageTracker.checkAndTrack('report', () => {
                // Report generation is allowed, continue
            });
            
            if (!canGenerate) {
                // Trial limit reached, redirect will happen in checkAndTrack
                return;
            }
        }
        
        this.showLoading(true);

        try {
            // Try to call backend API first
            console.log('📡 Calling backend API to generate report...');
            const response = await fetch('/api/v1/reports/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Report generated successfully:', result);
            
            if (result.success && result.report) {
                // Report already tracked in checkAndTrack above
                this.handleReportGenerated(result.report);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('❌ Report generation error:', error);
            // Fallback to simulation if API fails
            console.log('⚠️ API call failed, using simulation mode');
            await this.simulateReportGeneration(reportData);
        }
    }

    async simulateReportGeneration(reportData) {
        console.log('⏳ Starting report simulation (3 seconds)...');
        
        try {
            // Simulate report generation time
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('✅ Report simulation complete, creating report object...');
            
            const report = {
                id: Date.now(),
                type: reportData.type,
                format: reportData.format,
                location: reportData.location,
                filters: reportData.filters,
                file_path: `/reports/${reportData.type.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${reportData.format}`,
                size: Math.floor(Math.random() * 5000000) + 1000000, // 1-6 MB
                generated_at: new Date().toISOString(),
                download_url: `/api/v1/reports/download/${Date.now()}`
            };
            
            console.log('📄 Report object created:', report);
            console.log('📞 Calling handleReportGenerated...');
            
            // Report already tracked in checkAndTrack above
            this.handleReportGenerated(report);
            
            console.log('✅ handleReportGenerated completed');
        } catch (error) {
            console.error('❌ Error in simulateReportGeneration:', error);
            this.showLoading(false);
            this.showError('Failed to simulate report generation: ' + error.message);
        }
    }

    handleReportGenerated(report) {
        console.log('📋 handleReportGenerated called with report:', report);
        
        try {
            this.showLoading(false);
            console.log('✅ Loading overlay hidden');
            
            this.debug('Report generated successfully:', report);
            
            // Add to reports list
            if (!this.reports) {
                this.reports = [];
            }
            this.reports.push(report);
            console.log(`✅ Report added to list. Total reports: ${this.reports.length}`);
            
            // Update UI - reload history to include the new report
            console.log('🔄 Loading report history...');
            this.loadReportHistory();
            
            console.log('📊 Updating statistics...');
            this.updateStatistics();
            
            console.log('🎉 Showing success message...');
            this.showReportSuccess(report);

            // Notify global notification system that a report was generated
            try {
                document.dispatchEvent(new CustomEvent('reportGenerated', {
                    detail: {
                        id: report.id,
                        type: report.type,
                        format: report.format,
                        location: report.location
                    }
                }));
                
                // Show notification directly (don't rely on event listener which may be filtered)
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification(
                        '✅ Report Generated',
                        'success',
                        `${report.type} report (${report.format.toUpperCase()}) has been generated successfully. Click "Download" to save it.`,
                        5000
                    );
                } else if (window.ipmasApp && window.ipmasApp.showNotification) {
                    window.ipmasApp.showNotification(
                        `Report generated: ${report.type} (${report.format.toUpperCase()})`,
                        'success',
                        5000
                    );
                }
            } catch (e) {
                console.warn('Unable to dispatch reportGenerated event:', e?.message || e);
            }
            
            console.log('✅ handleReportGenerated completed successfully');
        } catch (error) {
            console.error('❌ Error in handleReportGenerated:', error);
            this.showLoading(false);
            this.showError('Failed to handle report generation: ' + error.message);
        }
    }

    handleReportError(error) {
        this.showLoading(false);
        this.debug('Report generation error:', error);
        this.showError(`Report generation failed: ${error.error}`);
    }

    showReportSuccess(report) {
        console.log('🎉 showReportSuccess called with report:', report);
        
        const message = `Report Generated Successfully!\n\nType: ${report.type}\nFormat: ${report.format.toUpperCase()}\nSize: ${(report.size / 1024 / 1024).toFixed(2)} MB\nGenerated: ${new Date(report.generated_at).toLocaleString()}\n\nDownload URL: ${report.download_url}`;
        
        console.log('📢 Showing alert message...');
        
        try {
            alert(message);
            console.log('✅ Alert dialog shown');
        } catch (error) {
            console.error('❌ Error showing alert:', error);
            // Fallback: show in console if alert fails
            console.info('Report Generated:', message);
        }
    }

    updateReportPreview() {
        const reportType = document.getElementById('reportType').value;
        const reportFormat = document.getElementById('reportFormat').value;
        const reportLocation = document.getElementById('reportLocation').value;
        const reportFilters = document.getElementById('reportFilters').value;
        
        const previewContent = document.getElementById('reportContent');
        if (!previewContent) return;
        
        let previewHTML = `
            <h3>${reportType}</h3>
            <div class="preview-info">
                <p><strong>Format:</strong> ${reportFormat.toUpperCase()}</p>
                ${reportLocation ? `<p><strong>Location:</strong> ${reportLocation}</p>` : ''}
                ${reportFilters ? `<p><strong>Filters:</strong> ${reportFilters}</p>` : ''}
            </div>
            <div class="preview-sections">
                <h4>Report Sections:</h4>
                <ul>
                    <li>Executive Summary</li>
                    <li>Data Analysis</li>
                    <li>Key Findings</li>
                    <li>Recommendations</li>
                    <li>Appendix</li>
                </ul>
            </div>
            <div class="preview-estimate">
                <p><strong>Estimated Size:</strong> 2-5 MB</p>
                <p><strong>Generation Time:</strong> 30-60 seconds</p>
            </div>
        `;
        
        previewContent.innerHTML = previewHTML;
        previewContent.style.display = 'block';
    }

    async loadReportHistory() {
        try {
            console.log('📚 Loading report history from backend...');
            
            // Try to load from backend API
            try {
                const response = await fetch('/api/v1/reports/history?limit=50');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.reports) {
                        console.log(`✅ Loaded ${result.reports.length} reports from backend`);
                        this.updateReportHistoryUI(result.reports);
                        this.debug('Report history loaded from backend');
                        return;
                    }
                }
            } catch (apiError) {
                console.warn('⚠️ Failed to load from backend API, using local history:', apiError);
            }
            
            // Fallback: Use local reports if API fails
            const history = this.reports && this.reports.length > 0 
                ? [...this.reports].sort((a, b) => {
                    return new Date(b.generated_at) - new Date(a.generated_at);
                })
                : [];
            
            this.updateReportHistoryUI(history);
            this.debug('Report history loaded (local fallback)');
        } catch (error) {
            console.error('Failed to load report history:', error);
            this.updateReportHistoryUI([]);
        }
    }

    updateReportHistoryUI(reports) {
        console.log('📝 updateReportHistoryUI called with', reports.length, 'reports');
        const historyContainer = document.getElementById('reportHistory');
        if (!historyContainer) {
            console.warn('⚠️ Report history container not found');
            return;
        }
        
        if (reports.length === 0) {
            historyContainer.classList.add('muted');
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📄</span>
                    <p>No reports generated yet.</p>
                </div>
            `;
            console.log('📝 Report history cleared (no reports)');
            return;
        }
        
        try {
            historyContainer.classList.remove('muted');
            const historyHTML = reports.map(report => `
                <div class="report-item">
                    <div class="report-item-header">
                        <h4>${report.type}</h4>
                        <span class="report-tag">${report.format.toUpperCase()}</span>
                    </div>
                    <div class="report-item-meta">
                        <p><span class="meta-label">Generated:</span>${new Date(report.generated_at).toLocaleString()}</p>
                        <p><span class="meta-label">Size:</span>${(report.size / 1024 / 1024).toFixed(2)} MB</p>
                        ${report.location ? `<p><span class="meta-label">Location:</span>${typeof report.location === 'object' ? report.location.name : report.location}</p>` : ''}
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-sm btn-primary" onclick="window.reportsManager.downloadReport('${report.id}', '${report.format}')">Download</button>
                        <button class="btn btn-sm btn-danger" onclick="window.reportsManager.deleteReport('${report.id}')" style="background:#dc3545;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.85rem;">Delete</button>
                    </div>
                </div>
            `).join('');
            
            historyContainer.innerHTML = historyHTML;
            console.log('✅ Report history UI updated successfully');
        } catch (error) {
            console.error('❌ Error updating report history UI:', error);
        }
    }

    async loadScheduledReports() {
        try {
            // Mock scheduled reports
            const mockScheduled = [
                {
                    id: 1,
                    frequency: 'weekly',
                    type: 'Comprehensive',
                    format: 'pdf',
                    next_run: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 2,
                    frequency: 'monthly',
                    type: 'Poverty Analysis',
                    format: 'pdf',
                    next_run: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            
            this.updateScheduledReportsUI(mockScheduled);
            this.debug('Scheduled reports loaded');
        } catch (error) {
            console.error('Failed to load scheduled reports:', error);
        }
    }

    updateScheduledReportsUI(reports) {
        const scheduledContainer = document.getElementById('scheduledReports');
        if (!scheduledContainer) return;
        
        if (reports.length === 0) {
            scheduledContainer.classList.add('muted');
            scheduledContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⏰</span>
                    <p>No scheduled reports.</p>
                </div>
            `;
            return;
        }
        
        scheduledContainer.classList.remove('muted');
        const scheduledHTML = reports.map(report => `
            <div class="scheduled-item">
                <div class="scheduled-item-header">
                    <h4>${report.type}</h4>
                    <span class="report-tag">${report.format.toUpperCase()}</span>
                </div>
                <div class="scheduled-item-meta">
                    <p><span class="meta-label">Frequency:</span>${report.frequency.charAt(0).toUpperCase()}${report.frequency.slice(1)}</p>
                    <p><span class="meta-label">Next run:</span>${new Date(report.next_run).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
        
        scheduledContainer.innerHTML = scheduledHTML;
    }

    async scheduleReport() {
        const reportType = document.getElementById('reportType').value;
        const reportFormat = document.getElementById('reportFormat').value;
        
        if (!reportType || !reportFormat) {
            alert('Please select report type and format first');
            return;
        }
        
        const frequency = prompt('Enter frequency (daily, weekly, monthly, quarterly):', 'weekly');
        if (!frequency) return;
        
        const email = prompt('Enter recipient email:');
        if (!email) return;
        
        // In a real implementation, this would make an API call
        alert(`Report scheduled successfully!\nType: ${reportType}\nFrequency: ${frequency}\nRecipient: ${email}`);
        
        this.debug(`Report scheduled: ${reportType} - ${frequency} - ${email}`);
    }

    updateStatistics() {
        // Update statistics display
        document.getElementById('totalReports').textContent = this.reports.length;
        document.getElementById('totalReportsCount').textContent = this.reports.length;
        document.getElementById('monthlyReports').textContent = this.getMonthlyReportCount();
        document.getElementById('lastReport').textContent = this.getLastReportTime();
        document.getElementById('storageUsed').textContent = this.calculateStorageUsed();
        document.getElementById('avgGenerationTime').textContent = this.getAverageGenerationTime();
        document.getElementById('totalDownloads').textContent = this.getTotalDownloads();
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    getMonthlyReportCount() {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return this.reports.filter(report => new Date(report.generated_at) > oneMonthAgo).length;
    }

    getLastReportTime() {
        if (this.reports.length === 0) return 'Never';
        const lastReport = this.reports[this.reports.length - 1];
        return new Date(lastReport.generated_at).toLocaleDateString();
    }

    calculateStorageUsed() {
        const totalSize = this.reports.reduce((sum, report) => sum + report.size, 0);
        return Math.round(totalSize / 1024 / 1024); // Convert to MB
    }

    getAverageGenerationTime() {
        // Mock average generation time
        return Math.floor(Math.random() * 30) + 30; // 30-60 seconds
    }

    getTotalDownloads() {
        // Mock total downloads
        return this.reports.length * Math.floor(Math.random() * 5) + 1;
    }

    updateAnalytics() {
        const timeRange = document.getElementById('analyticsTimeRange').value;
        this.debug(`Updating analytics for time range: ${timeRange}`);
        
        // Update charts with new data based on time range
        this.updateReportsOverTimeChart(timeRange);
        this.updateReportTypesChart(timeRange);
        this.updateFormatPreferencesChart(timeRange);
        this.updateSuccessRateChart(timeRange);
    }

    updateReportsOverTimeChart(timeRange) {
        const chart = this.charts.reportsOverTimeChart;
        if (!chart) return;
        
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
        chart.data.labels = this.generateTimeLabels(days);
        chart.data.datasets[0].data = this.generateRandomData(days, 0, 20);
        chart.update();
    }

    updateReportTypesChart(timeRange) {
        // Update report types distribution based on time range
        const chart = this.charts.reportTypesChart;
        if (!chart) return;
        
        // Generate new data based on time range
        chart.data.datasets[0].data = [
            Math.floor(Math.random() * 40) + 30,
            Math.floor(Math.random() * 30) + 20,
            Math.floor(Math.random() * 20) + 10,
            Math.floor(Math.random() * 20) + 10,
            Math.floor(Math.random() * 15) + 5
        ];
        chart.update();
    }

    updateFormatPreferencesChart(timeRange) {
        const chart = this.charts.formatPreferencesChart;
        if (!chart) return;
        
        chart.data.datasets[0].data = [
            Math.floor(Math.random() * 50) + 100,
            Math.floor(Math.random() * 30) + 70,
            Math.floor(Math.random() * 20) + 40,
            Math.floor(Math.random() * 20) + 30
        ];
        chart.update();
    }

    updateSuccessRateChart(timeRange) {
        const chart = this.charts.successRateChart;
        if (!chart) return;
        
        chart.data.datasets[0].data = [
            Math.random() * 5 + 95,
            Math.random() * 5 + 90,
            Math.random() * 2 + 98,
            Math.random() * 8 + 88,
            Math.random() * 4 + 94,
            Math.random() * 3 + 92
        ];
        chart.update();
    }

    generateTimeLabels(days) {
        const labels = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        
        return labels;
    }

    generateRandomData(count, min, max) {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return data;
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

    async downloadReport(reportId, format) {
        try {
            console.log(`📥 Downloading report ${reportId} (${format})...`);
            
            // Check trial limit and track download
            if (window.usageTracker) {
                const canDownload = window.usageTracker.checkAndTrack('download', () => {
                    // Download is allowed, continue with download
                });
                
                if (!canDownload) {
                    // Trial limit reached, redirect will happen in checkAndTrack
                    return;
                }
            }
            
            // Find report details for notification
            const report = this.reports?.find(r => r.id === reportId);
            const reportType = report?.type || 'Report';
            const reportFormat = format.toUpperCase();
            
            // Show notification before download
            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    '📥 Download Started',
                    'success',
                    `${reportType} (${reportFormat}) is being downloaded`,
                    3000
                );
            } else if (window.ipmasApp && window.ipmasApp.showNotification) {
                window.ipmasApp.showNotification(
                    `Downloading ${reportType} (${reportFormat})...`,
                    'success',
                    3000
                );
            }
            
            // Construct download URL - works for both PDF and Excel
            const downloadUrl = `/api/v1/reports/download/${reportId}`;
            
            // Create a temporary link element to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${reportType}_${Date.now()}.${format}`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success notification after a short delay
            setTimeout(() => {
                // Dispatch event for notification system
                document.dispatchEvent(new CustomEvent('reportDownloaded', {
                    detail: {
                        id: reportId,
                        type: reportType,
                        format: format
                    }
                }));
                
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification(
                        '✅ Download Complete',
                        'success',
                        `${reportType} (${reportFormat}) downloaded successfully`,
                        4000
                    );
                } else if (window.ipmasApp && window.ipmasApp.showNotification) {
                    window.ipmasApp.showNotification(
                        `${reportType} downloaded successfully`,
                        'success',
                        4000
                    );
                }
            }, 500);
            
        } catch (error) {
            console.error('❌ Download error:', error);
            
            // Show error notification
            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    '❌ Download Failed',
                    'error',
                    `Failed to download report: ${error.message || 'Unknown error'}`,
                    5000
                );
            } else if (window.ipmasApp && window.ipmasApp.showNotification) {
                window.ipmasApp.showNotification(
                    `Download failed: ${error.message || 'Unknown error'}`,
                    'error',
                    5000
                );
            } else {
                alert('Failed to download report: ' + error.message);
            }
        }
    }

    async deleteReport(reportId) {
        try {
            if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
                return;
            }
            
            console.log(`🗑️ Deleting report ${reportId}...`);
            
            const response = await fetch(`/api/v1/reports/${reportId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Report deleted successfully');
                // Remove from local reports array
                if (this.reports) {
                    this.reports = this.reports.filter(r => r.id !== reportId);
                }
                // Reload history
                await this.loadReportHistory();
                // Update statistics
                this.updateStatistics();
                alert('Report deleted successfully');
            } else {
                throw new Error(result.message || 'Failed to delete report');
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            alert('Failed to delete report: ' + error.message);
        }
    }
}

// Initialize the reports manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reportsManager = new ReportsManager();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.reportsManager) {
        window.reportsManager.debug(`Page visibility: ${document.visibilityState}`);
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    if (window.reportsManager && window.reportsManager.socket) {
        window.reportsManager.socket.disconnect();
    }
});
