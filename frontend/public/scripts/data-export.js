/**
 * IPMAS Data Export System
 * Enables exporting filtered data to CSV, Excel, JSON, and PDF formats
 */

class DataExporter {
    constructor() {
        this.exportFormats = ['csv', 'excel', 'json', 'pdf'];
        this.init();
    }

    init() {
        console.log('📤 Data Exporter initializing...');
        // Wait a bit for DOM to be ready, especially if called early
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.createExportUI(), 100);
            });
        } else {
            setTimeout(() => this.createExportUI(), 100);
        }
        console.log('✅ Data Exporter initialized');
    }

    createExportUI() {
        // Add export button to dashboard if not on poverty-models page
        if (window.location.pathname.includes('poverty-models')) {
            return;
        }

        // Find a good place to add export controls
        const statsHeader = document.querySelector('.stats-header');
        if (!statsHeader) return;

        // Find the export controls container
        const exportControlsContainer = document.getElementById('exportControls');
        if (!exportControlsContainer) {
            console.warn('⚠️ exportControls container not found');
            return;
        }

        // Check if export controls have already been created (has content)
        if (exportControlsContainer.innerHTML.trim().length > 0) {
            console.log('ℹ️ Export controls already exist');
            return;
        }

        console.log('✅ Creating export controls UI');
        exportControlsContainer.className = 'export-controls';
        exportControlsContainer.innerHTML = `
            <div class="export-controls-group">
                <label class="export-label">Export:</label>
                <select id="exportFormat" class="export-format-select">
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                </select>
                <button class="btn btn-primary btn-sm export-btn" id="exportDataBtn" title="Export filtered data">
                    📥 Selected
                </button>
            </div>
            <span class="export-info" id="exportInfo">Ready</span>
        `;

        // Add event listeners
        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportData('selected');
        });

        // Update export info when filters change
        document.addEventListener('filtersChanged', () => {
            this.updateExportInfo();
        });

        // Initialize export info
        this.updateExportInfo();
    }

    updateExportInfo() {
        const info = document.getElementById('exportInfo');
        if (!info) return;

        let dataCount = 0;
        if (window.advancedFilters && window.advancedFilters.getFilteredData) {
            dataCount = window.advancedFilters.getFilteredData().length;
        } else if (typeof sampleData !== 'undefined' && sampleData.locations) {
            dataCount = sampleData.locations.length;
        }

        if (dataCount > 0) {
            info.textContent = `${dataCount} ready`;
        } else {
            info.textContent = 'Ready';
        }
    }

    async exportData(scope = 'selected') {
        const format = document.getElementById('exportFormat')?.value || 'csv';
        console.log(`📤 Exporting data (${scope}) as ${format.toUpperCase()}...`);

        // Check trial limit and track export
        if (window.usageTracker) {
            const canExport = window.usageTracker.checkAndTrack('export', () => {
                // Export is allowed, continue with export
            });
            
            if (!canExport) {
                // Trial limit reached, redirect will happen in checkAndTrack
                return;
            }
        }

        try {
            // Get data to export
            let dataToExport = [];
            
            if (scope === 'selected' && window.advancedFilters && window.advancedFilters.getFilteredData) {
                dataToExport = window.advancedFilters.getFilteredData();
            } else {
                // Export all data
                if (window.ipmasApp && window.ipmasApp.locations) {
                    dataToExport = window.ipmasApp.locations;
                } else if (typeof sampleData !== 'undefined' && sampleData.locations) {
                    dataToExport = sampleData.locations;
                } else {
                    alert('No data available to export');
                    return;
                }
            }

            if (dataToExport.length === 0) {
                alert('No data to export. Please adjust your filters.');
                return;
            }

            // Show loading
            this.showExportLoading(true);

            // Export based on format
            switch (format.toLowerCase()) {
                case 'csv':
                    this.exportToCSV(dataToExport);
                    break;
                case 'excel':
                    this.exportToExcel(dataToExport);
                    break;
                case 'json':
                    this.exportToJSON(dataToExport);
                    break;
                case 'pdf':
                    await this.exportToPDF(dataToExport);
                    break;
                default:
                    alert('Unsupported export format');
            }

            this.showExportLoading(false);
            console.log(`✅ Exported ${dataToExport.length} records as ${format.toUpperCase()}`);
            
        } catch (error) {
            console.error('Export error:', error);
            alert(`Error exporting data: ${error.message}`);
            this.showExportLoading(false);
        }
    }

    exportToCSV(data) {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        // Prepare CSV headers
        const headers = [
            'Location Name', 'County', 'Ward', 'Latitude', 'Longitude',
            'Poverty Index', 'Education Access', 'Health Vulnerability',
            'Water Access', 'Housing Quality', 'Employment Rate', 'Population'
        ];

        // Create CSV rows
        const rows = data.map(location => [
            location.name || '',
            location.county || '',
            location.ward || '',
            location.lat || '',
            location.lng || '',
            location.poverty_index || 0,
            location.education_access || 0,
            location.health_vulnerability || 0,
            location.water_access || 0,
            location.housing_quality || 0,
            location.employment_rate || 0,
            location.population || 0
        ]);

        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // Escape commas and quotes in cell values
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(','))
        ].join('\n');

        // Create and trigger download
        this.downloadFile(csvContent, `ipmas_data_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }

    exportToExcel(data) {
        // For Excel export, we'll create a CSV that Excel can open
        // (True Excel format would require a library like xlsx.js)
        console.log('📊 Excel export (using CSV format compatible with Excel)...');
        this.exportToCSV(data);
        
        // Future: Use xlsx library for proper Excel format
        // This would require adding: <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    }

    exportToJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `ipmas_data_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }

    async exportToPDF(data) {
        // PDF export - create a formatted report
        const pdfContent = this.generatePDFContent(data);
        
        // For basic PDF, we'll use browser print functionality
        // Future: Use jsPDF library for proper PDF generation
        const printWindow = window.open('', '_blank');
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        printWindow.print();
        
        console.log('📄 PDF export initiated (using print dialog)');
    }

    generatePDFContent(data) {
        const date = new Date().toLocaleString();
        const totalRecords = data.length;
        
        // Calculate summary statistics
        const avgPoverty = data.reduce((sum, loc) => sum + (loc.poverty_index || 0), 0) / data.length;
        const avgEducation = data.reduce((sum, loc) => sum + (loc.education_access || 0), 0) / data.length;
        const avgHealth = data.reduce((sum, loc) => sum + (loc.health_vulnerability || 0), 0) / data.length;

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>IPMAS Data Export</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #2E8B57; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #2E8B57; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>IPMAS Poverty Data Export</h1>
                <p><strong>Export Date:</strong> ${date}</p>
                <p><strong>Total Records:</strong> ${totalRecords}</p>
                
                <div class="summary">
                    <h3>Summary Statistics</h3>
                    <p>Average Poverty Index: ${avgPoverty.toFixed(2)}%</p>
                    <p>Average Education Access: ${avgEducation.toFixed(2)}%</p>
                    <p>Average Health Vulnerability: ${avgHealth.toFixed(2)}%</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>County</th>
                            <th>Ward</th>
                            <th>Poverty Index</th>
                            <th>Education</th>
                            <th>Health</th>
                            <th>Water</th>
                            <th>Population</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.slice(0, 100).forEach(location => {
            html += `
                <tr>
                    <td>${location.name || 'N/A'}</td>
                    <td>${location.county || 'N/A'}</td>
                    <td>${location.ward || 'N/A'}</td>
                    <td>${(location.poverty_index || 0).toFixed(2)}%</td>
                    <td>${(location.education_access || 0).toFixed(2)}%</td>
                    <td>${(location.health_vulnerability || 0).toFixed(2)}%</td>
                    <td>${(location.water_access || 0).toFixed(2)}%</td>
                    <td>${location.population || 'N/A'}</td>
                </tr>
            `;
        });

        if (data.length > 100) {
            html += `
                <tr>
                    <td colspan="8" style="text-align: center; font-style: italic;">
                        ... and ${data.length - 100} more records (exported data contains all records)
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
                <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
                    Generated by IPMAS - Integrated Poverty Mapping & Analysis System
                </p>
            </body>
            </html>
        `;

        return html;
    }

    downloadFile(content, filename, mimeType) {
        // Track download usage
        if (window.usageTracker) {
            window.usageTracker.trackDownload();
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`✅ File downloaded: ${filename}`);
    }

    showExportLoading(show) {
        const btn = document.getElementById('exportDataBtn');
        
        if (btn) {
            btn.disabled = show;
            btn.textContent = show ? '⏳ Exporting...' : '📥 Selected';
        }
    }
}

// Initialize when DOM is ready
function initializeDataExporter() {
    if (window.dataExporter) return; // Already initialized
    
    // Wait for stats-header to be available
    const checkForStatsHeader = setInterval(() => {
        const statsHeader = document.querySelector('.stats-header');
        const exportControls = document.getElementById('exportControls');
        if (statsHeader && exportControls) {
            clearInterval(checkForStatsHeader);
            window.dataExporter = new DataExporter();
        }
    }, 100);
    
    // Stop checking after 5 seconds
    setTimeout(() => {
        clearInterval(checkForStatsHeader);
        if (!window.dataExporter) {
            window.dataExporter = new DataExporter();
        }
    }, 5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDataExporter);
} else {
    initializeDataExporter();
}

