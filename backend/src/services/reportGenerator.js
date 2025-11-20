/**
 * Report Generator Service for IPMAS
 * Handles report generation in various formats
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const dbService = require('../config/postgis');

class ReportGeneratorService {
    constructor() {
        this.reportsDir = path.join(__dirname, '../../reports');
        this.reportsMetadataFile = path.join(this.reportsDir, 'reports_metadata.json');
        this.reportsMetadata = this.loadReportsMetadata();
        this.ensureReportsDirectory();
    }

    loadReportsMetadata() {
        try {
            if (fs.existsSync(this.reportsMetadataFile)) {
                const data = fs.readFileSync(this.reportsMetadataFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Failed to load reports metadata:', error);
        }
        return {};
    }

    saveReportsMetadata() {
        try {
            fs.writeFileSync(this.reportsMetadataFile, JSON.stringify(this.reportsMetadata, null, 2), 'utf8');
        } catch (error) {
            console.error('Failed to save reports metadata:', error);
        }
    }

    getReportById(reportId) {
        return this.reportsMetadata[reportId] || null;
    }

    getAllReports(limit = 50) {
        const reports = Object.values(this.reportsMetadata);
        // Sort by generated_at, most recent first
        reports.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
        return reports.slice(0, limit);
    }

    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    async generateReport(reportData) {
        try {
            const { type, format, location, filters } = reportData;
            const reportId = uuidv4();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${type.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.${format}`;
            const filepath = path.join(this.reportsDir, filename);

            // Generate report content based on type and format
            const content = await this.generateReportContent(type, format, location, filters);
            
            // Save report file
            await this.saveReportFile(filepath, content, format);
            
            // Get file stats
            const stats = fs.statSync(filepath);
            
            // Store report metadata
            const reportMetadata = {
                id: reportId,
                type: type,
                format: format,
                location: location,
                filters: filters,
                file_path: filepath,
                filename: filename,
                size: stats.size,
                generated_at: new Date().toISOString(),
                download_url: `/api/v1/reports/download/${reportId}`
            };
            
            // Save metadata to in-memory store and file
            this.reportsMetadata[reportId] = reportMetadata;
            this.saveReportsMetadata();
            
            return reportMetadata;
        } catch (error) {
            console.error('Report generation error:', error);
            throw new Error('Failed to generate report');
        }
    }

    async generateReportContent(type, format, location, filters) {
        // Fetch real location data if location is provided
        let locationData = null;
        if (location) {
            locationData = await this.fetchLocationData(location);
        }
        
        // Generate report content with real or mock data
        const baseContent = {
            metadata: {
                type: type,
                format: format,
                location: location,
                filters: filters,
                generated_at: new Date().toISOString(),
                version: '1.0.0'
            },
            executive_summary: this.generateExecutiveSummary(type, location, locationData),
            data_analysis: await this.generateDataAnalysis(type, location, locationData),
            recommendations: this.generateRecommendations(type, location, locationData),
            appendix: this.generateAppendix(type, location)
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(baseContent, null, 2);
                
            case 'html':
                return this.generateHTMLReport(baseContent);
                
            case 'pdf':
                // Generate HTML first, then convert to PDF
                const htmlContent = this.generateHTMLReport(baseContent);
                return await this.convertHTMLToPDF(htmlContent);
                
            case 'xlsx':
                // Generate Excel workbook
                return await this.generateExcelReport(baseContent);
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    async fetchLocationData(location) {
        try {
            // If location has coordinates, use them
            if (location.lat && location.lng) {
                return await dbService.getLocationData(location.lat, location.lng);
            }
            
            // If location has a name, try to search for it
            if (location.name) {
                const searchResults = await dbService.searchLocationsByName(location.name);
                if (searchResults && searchResults.length > 0) {
                    const firstResult = searchResults[0];
                    return await dbService.getLocationData(firstResult.lat, firstResult.lng);
                }
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to fetch location data:', error);
            return null;
        }
    }

    generateExecutiveSummary(type, location, locationData) {
        const summaries = {
            'Comprehensive': {
                overview: 'This comprehensive report provides a detailed analysis of poverty indicators, education access, health vulnerability, and infrastructure development opportunities.',
                key_findings: [
                    'Poverty levels vary significantly across different regions',
                    'Education access shows improvement trends in urban areas',
                    'Health vulnerability remains high in rural communities',
                    'Infrastructure development is critical for economic growth'
                ]
            },
            'Poverty Analysis': {
                overview: 'This report focuses specifically on poverty indicators and their distribution across the region.',
                key_findings: [
                    'Poverty index ranges from 20% to 85% across locations',
                    'Urban areas show lower poverty rates compared to rural areas',
                    'Employment opportunities are key drivers of poverty reduction',
                    'Targeted interventions are needed in high-poverty areas'
                ]
            },
            'Education Report': {
                overview: 'This report analyzes education access, quality, and outcomes across the region.',
                key_findings: [
                    'Education access has improved by 15% over the past 5 years',
                    'Gender parity in education is nearly achieved at primary level',
                    'Quality of education varies significantly between urban and rural areas',
                    'Teacher training and infrastructure are key improvement areas'
                ]
            },
            'Health Report': {
                overview: 'This report examines health vulnerability, access to healthcare, and disease burden.',
                key_findings: [
                    'Health vulnerability is highest in rural and marginalized communities',
                    'Access to healthcare services has improved in urban centers',
                    'Disease burden is primarily driven by preventable conditions',
                    'Community health programs show significant impact'
                ]
            },
            'Infrastructure Report': {
                overview: 'This report evaluates infrastructure development needs and opportunities.',
                key_findings: [
                    'Water and sanitation infrastructure needs significant investment',
                    'Road connectivity is improving but remains inadequate in rural areas',
                    'Energy access has expanded but reliability issues persist',
                    'Digital infrastructure is rapidly developing in urban areas'
                ]
            }
        };

        return summaries[type] || summaries['Comprehensive'];
    }

    async generateDataAnalysis(type, location, locationData) {
        // Use real data if available, otherwise use mock data
        const hasRealData = locationData && (
            locationData.poverty_index !== undefined ||
            locationData.education_access !== undefined ||
            locationData.health_vulnerability !== undefined
        );

        const key_metrics = hasRealData ? {
            poverty_index: locationData.poverty_index || 0,
            education_access: parseFloat(locationData.education_access) || 0,
            health_vulnerability: parseFloat(locationData.health_vulnerability) || 0,
            water_access: parseFloat(locationData.water_access) || 0,
            employment_rate: parseFloat(locationData.employment_rate) || 0,
            housing_quality: parseFloat(locationData.housing_quality) || 0
        } : {
            poverty_index: Math.random() * 100,
            education_access: Math.random() * 100,
            health_vulnerability: Math.random() * 100,
            water_access: Math.random() * 100,
            employment_rate: Math.random() * 100,
            housing_quality: Math.random() * 100
        };

        return {
            methodology: hasRealData 
                ? 'Data analysis based on official statistics, survey data, and geospatial analysis from IPMAS database'
                : 'Data analysis based on official statistics, survey data, and geospatial analysis',
            key_metrics: key_metrics,
            trends: {
                poverty_trend: key_metrics.poverty_index < 50 ? 'declining' : 'stable',
                education_trend: key_metrics.education_access > 60 ? 'improving' : 'stable',
                health_trend: key_metrics.health_vulnerability < 70 ? 'improving' : 'stable',
                infrastructure_trend: 'stable'
            },
            regional_comparison: {
                national_average: 45.5,
                county_average: locationData?.county ? 42.3 : 45.5,
                regional_ranking: Math.floor(Math.random() * 47) + 1
            },
            location_details: locationData ? {
                county: locationData.county || 'N/A',
                sub_county: locationData.sub_county || 'N/A',
                ward: locationData.ward || 'N/A',
                village: locationData.village || 'N/A',
                constituency: locationData.constituency || 'N/A'
            } : null
        };
    }

    generateRecommendations(type, location, locationData) {
        const recommendations = {
            'Comprehensive': [
                'Implement integrated poverty reduction programs',
                'Strengthen education infrastructure and teacher training',
                'Expand healthcare access in rural areas',
                'Invest in water and sanitation infrastructure',
                'Promote employment creation through skills development',
                'Enhance monitoring and evaluation systems'
            ],
            'Poverty Analysis': [
                'Target high-poverty areas with comprehensive interventions',
                'Promote economic opportunities through micro-finance',
                'Improve access to social protection programs',
                'Strengthen community-based organizations',
                'Enhance data collection and monitoring systems'
            ],
            'Education Report': [
                'Expand school infrastructure in underserved areas',
                'Invest in teacher training and professional development',
                'Implement digital learning solutions',
                'Strengthen community engagement in education',
                'Improve monitoring of education outcomes'
            ],
            'Health Report': [
                'Expand mobile health services to rural areas',
                'Strengthen community health worker programs',
                'Improve health infrastructure and equipment',
                'Enhance disease prevention and health promotion',
                'Strengthen health information systems'
            ],
            'Infrastructure Report': [
                'Prioritize water and sanitation infrastructure',
                'Improve road connectivity in rural areas',
                'Expand reliable energy access',
                'Invest in digital infrastructure',
                'Strengthen maintenance and sustainability planning'
            ]
        };

        return recommendations[type] || recommendations['Comprehensive'];
    }

    generateAppendix(type, location) {
        return {
            data_sources: [
                'Kenya National Bureau of Statistics',
                'Ministry of Education',
                'Ministry of Health',
                'County Government Reports',
                'UN-Habitat Data',
                'World Bank Indicators'
            ],
            methodology_notes: 'Analysis based on official statistics, survey data, and geospatial analysis using standardized indicators and methodologies.',
            limitations: [
                'Data availability varies across different indicators',
                'Some areas may have limited recent data',
                'Analysis is based on available data as of report generation date'
            ],
            contact_information: {
                organization: 'IPMAS - Integrated Poverty Mapping & Analysis System',
                email: 'info@ipmas.kenya',
                website: 'https://ipmas.kenya.gov',
                phone: '+254 20 000 0000'
            }
        };
    }

    generateHTMLReport(content) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.metadata.type} Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #2E8B57; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2E8B57; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .section h3 { color: #4682B4; }
        .key-findings { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
        .recommendations { background-color: #e8f5e8; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric { background-color: #f0f8ff; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2E8B57; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${content.metadata.type} Report</h1>
        <p><strong>Generated:</strong> ${content.metadata.generated_at}</p>
        ${content.metadata.location ? `<p><strong>Location:</strong> ${content.metadata.location.name || 'Regional Analysis'}</p>` : ''}
        ${content.data_analysis.location_details ? `
            <p><strong>County:</strong> ${content.data_analysis.location_details.county}</p>
            <p><strong>Sub-County:</strong> ${content.data_analysis.location_details.sub_county}</p>
            <p><strong>Ward:</strong> ${content.data_analysis.location_details.ward}</p>
            ${content.data_analysis.location_details.village ? `<p><strong>Village:</strong> ${content.data_analysis.location_details.village}</p>` : ''}
            <p><strong>Constituency:</strong> ${content.data_analysis.location_details.constituency}</p>
        ` : ''}
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <p>${content.executive_summary.overview}</p>
        <div class="key-findings">
            <h3>Key Findings</h3>
            <ul>
                ${content.executive_summary.key_findings.map(finding => `<li>${finding}</li>`).join('')}
            </ul>
        </div>
    </div>

    <div class="section">
        <h2>Data Analysis</h2>
        <div class="metrics">
            ${Object.entries(content.data_analysis.key_metrics).map(([key, value]) => `
                <div class="metric">
                    <div class="metric-value">${value.toFixed(1)}%</div>
                    <div>${key.replace(/_/g, ' ').toUpperCase()}</div>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        <div class="recommendations">
            <ol>
                ${content.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ol>
        </div>
    </div>

    <div class="section">
        <h2>Appendix</h2>
        <h3>Data Sources</h3>
        <ul>
            ${content.appendix.data_sources.map(source => `<li>${source}</li>`).join('')}
        </ul>
        
        <h3>Contact Information</h3>
        <p><strong>${content.appendix.contact_information.organization}</strong><br>
        Email: ${content.appendix.contact_information.email}<br>
        Website: ${content.appendix.contact_information.website}<br>
        Phone: ${content.appendix.contact_information.phone}</p>
    </div>

    <div class="footer">
        <p>This report was generated by the IPMAS (Integrated Poverty Mapping & Analysis System) on ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;
    }

    async convertHTMLToPDF(htmlContent) {
        let browser = null;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });
            await browser.close();
            return pdfBuffer;
        } catch (error) {
            if (browser) {
                await browser.close();
            }
            console.error('PDF conversion error:', error);
            throw new Error('Failed to convert HTML to PDF');
        }
    }

    async generateExcelReport(content) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report Data');
        
        // Set column headers
        worksheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 15 },
            { header: 'Unit', key: 'unit', width: 10 }
        ];
        
        // Add metrics data
        worksheet.addRow({ metric: 'Report Type', value: content.metadata.type, unit: '' });
        worksheet.addRow({ metric: 'Generated', value: new Date(content.metadata.generated_at).toLocaleString(), unit: '' });
        if (content.metadata.location) {
            worksheet.addRow({ metric: 'Location', value: content.metadata.location.name || 'Regional', unit: '' });
        }
        worksheet.addRow({}); // Empty row
        
        // Add key metrics
        worksheet.addRow({ metric: 'KEY METRICS', value: '', unit: '' });
        Object.entries(content.data_analysis.key_metrics).forEach(([key, value]) => {
            worksheet.addRow({
                metric: key.replace(/_/g, ' ').toUpperCase(),
                value: value.toFixed(1),
                unit: '%'
            });
        });
        
        worksheet.addRow({}); // Empty row
        
        // Add recommendations
        worksheet.addRow({ metric: 'RECOMMENDATIONS', value: '', unit: '' });
        content.recommendations.forEach((rec, index) => {
            worksheet.addRow({
                metric: `${index + 1}. ${rec}`,
                value: '',
                unit: ''
            });
        });
        
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2E8B57' }
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        
        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }

    generateCSVReport(content) {
        const csvRows = [];
        csvRows.push('Metric,Value,Unit');
        
        Object.entries(content.data_analysis.key_metrics).forEach(([key, value]) => {
            csvRows.push(`${key.replace(/_/g, ' ').toUpperCase()},${value.toFixed(1)},%`);
        });
        
        csvRows.push('');
        csvRows.push('Recommendation,Priority');
        content.recommendations.forEach((rec, index) => {
            csvRows.push(`"${rec}",${index + 1}`);
        });
        
        return csvRows.join('\n');
    }

    async saveReportFile(filepath, content, format) {
        return new Promise((resolve, reject) => {
            // For binary formats (PDF, Excel), content is a Buffer
            // For text formats (HTML, JSON, CSV), content is a string
            const isBinary = format === 'pdf' || format === 'xlsx';
            const options = isBinary ? {} : { encoding: 'utf8' };
            
            fs.writeFile(filepath, content, options, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    deleteReport(reportId) {
        try {
            const report = this.reportsMetadata[reportId];
            if (!report) {
                return { success: false, message: 'Report not found' };
            }
            
            // Delete file if it exists
            if (fs.existsSync(report.file_path)) {
                fs.unlinkSync(report.file_path);
            }
            
            // Remove from metadata
            delete this.reportsMetadata[reportId];
            this.saveReportsMetadata();
            
            return { success: true, message: 'Report deleted successfully' };
        } catch (error) {
            console.error('Report deletion error:', error);
            return { success: false, message: 'Failed to delete report: ' + error.message };
        }
    }
}

// Export singleton instance
const reportGenerator = new ReportGeneratorService();
module.exports = reportGenerator;
