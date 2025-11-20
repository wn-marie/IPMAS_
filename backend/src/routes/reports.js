const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');
const reportGenerator = require('../services/reportGenerator');

// Generate a new report
router.post('/generate', async (req, res) => {
    try {
        const { type, format, location, filters = {} } = req.body;
        
        // Validate required fields
        if (!type || !format) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Report type and format are required'
            });
        }

        // Validate report type
        const validTypes = ['Comprehensive', 'Poverty Analysis', 'Education Report', 'Health Report', 'Infrastructure Report'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Invalid report type',
                message: `Report type must be one of: ${validTypes.join(', ')}`
            });
        }

        // Validate format
        const validFormats = ['pdf', 'xlsx'];
        if (!validFormats.includes(format)) {
            return res.status(400).json({
                error: 'Invalid format',
                message: `Format must be one of: ${validFormats.join(', ')}`
            });
        }

        const reportData = {
            type,
            format,
            location: location || null,
            filters,
            generated_at: new Date().toISOString()
        };

        const report = await reportGenerator.generateReport(reportData);
        
        res.status(201).json({
            success: true,
            message: 'Report generated successfully',
            report: {
                id: report.id,
                type: type,
                format: format,
                location: location,
                file_path: report.file_path,
                size: report.size,
                generated_at: report.generated_at,
                download_url: `/api/v1/reports/download/${report.id}`
            }
        });
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            error: 'Generation failed',
            message: 'Unable to generate report'
        });
    }
});

// Download a generated report
router.get('/download/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        
        // Get report metadata
        const report = reportGenerator.getReportById(reportId);
        
        if (!report) {
            return res.status(404).json({
                error: 'Report not found',
                message: `Report with ID ${reportId} does not exist`
            });
        }
        
        // Check if file exists
        const fs = require('fs');
        const path = require('path');
        
        // Ensure absolute path
        const absolutePath = path.isAbsolute(report.file_path) 
            ? report.file_path 
            : path.resolve(report.file_path);
        
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({
                error: 'Report file not found',
                message: 'The report file has been deleted or moved'
            });
        }
        
        // Set appropriate headers based on format
        const contentTypeMap = {
            'pdf': 'application/pdf',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        
        const contentType = contentTypeMap[report.format] || 'application/octet-stream';
        const disposition = 'attachment'; // Both PDF and Excel should be downloaded
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${report.filename}"`);
        
        // Send file (Express sendFile requires absolute path)
        res.sendFile(absolutePath);
    } catch (error) {
        console.error('Report download error:', error);
        res.status(500).json({
            error: 'Download failed',
            message: 'Unable to download report'
        });
    }
});

// Get report history
router.get('/history', async (req, res) => {
    try {
        const { format, dateFrom, dateTo, limit = 20 } = req.query;
        
        // Get all reports from report generator
        let reports = reportGenerator.getAllReports(parseInt(limit) || 50);
        
        // Apply filters
        if (format) {
            reports = reports.filter(r => r.format === format);
        }
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            reports = reports.filter(r => new Date(r.generated_at) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            reports = reports.filter(r => new Date(r.generated_at) <= toDate);
        }
        
        res.json({
            success: true,
            count: reports.length,
            filters: {
                format: format || null,
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
                limit: parseInt(limit) || 20
            },
            reports: reports
        });
    } catch (error) {
        console.error('Report history error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'Unable to retrieve report history'
        });
    }
});

// Schedule a recurring report
router.post('/schedule', async (req, res) => {
    try {
        const { frequency, format, recipients, options = {} } = req.body;
        
        if (!frequency || !format || !recipients) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Frequency, format, and recipients are required'
            });
        }

        // Validate frequency
        const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
        if (!validFrequencies.includes(frequency)) {
            return res.status(400).json({
                error: 'Invalid frequency',
                message: `Frequency must be one of: ${validFrequencies.join(', ')}`
            });
        }

        // Validate format
        const validFormats = ['pdf', 'xlsx'];
        if (!validFormats.includes(format)) {
            return res.status(400).json({
                error: 'Invalid format',
                message: `Format must be one of: ${validFormats.join(', ')}`
            });
        }

        const scheduleData = {
            frequency,
            format,
            recipients: Array.isArray(recipients) ? recipients : [recipients],
            options,
            status: 'active',
            next_run: this.calculateNextRun(frequency),
            created_at: new Date().toISOString()
        };

        // In a real implementation, this would save to the database
        res.status(201).json({
            success: true,
            message: 'Report scheduled successfully',
            schedule: {
                id: Date.now(),
                ...scheduleData
            }
        });
    } catch (error) {
        console.error('Report scheduling error:', error);
        res.status(500).json({
            error: 'Scheduling failed',
            message: 'Unable to schedule report'
        });
    }
});

// Delete a report
router.delete('/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const result = reportGenerator.deleteReport(reportId);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Deletion failed',
                message: result.message
            });
        }
    } catch (error) {
        console.error('Report deletion error:', error);
        res.status(500).json({
            error: 'Deletion failed',
            message: 'Unable to delete report'
        });
    }
});

// Get scheduled reports
router.get('/scheduled', async (req, res) => {
    try {
        const { status, limit = 20 } = req.query;
        
        const filters = {
            status: status || null,
            limit: parseInt(limit)
        };

        const scheduledReports = await dbService.getScheduledReports(filters);
        
        res.json({
            success: true,
            count: scheduledReports.length,
            filters: filters,
            scheduled_reports: scheduledReports
        });
    } catch (error) {
        console.error('Scheduled reports error:', error);
        res.status(500).json({
            error: 'Retrieval failed',
            message: 'Unable to retrieve scheduled reports'
        });
    }
});

// Helper function to calculate next run time
function calculateNextRun(frequency) {
    const now = new Date();
    switch (frequency) {
        case 'daily':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'weekly':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'monthly':
            return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        case 'quarterly':
            return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        default:
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
}

module.exports = router;
