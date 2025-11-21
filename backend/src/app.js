const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import middleware
const {
    generalRateLimit,
    apiRateLimit,
    corsMiddleware,
    helmetMiddleware,
    securityHeaders,
    sanitizeInput,
    requestLogger,
    errorHandler,
    socketSecurity,
    inputValidation,
    handleValidationErrors
} = require('./middleware/security');

const {
    responseTimeMonitor,
    cacheMiddleware,
    queryOptimization,
    pagination,
    compressionMiddleware,
    memoryCleanup,
    connectionOptimization,
    performanceMonitor,
    healthCheck,
    getPerformanceMetrics,
    setupClustering
} = require('./middleware/performance');

// Import memory monitoring
const {
    memoryMonitor,
    memoryMonitoringMiddleware,
    memoryDebugEndpoint,
    emergencyCleanupEndpoint
} = require('./middleware/memoryMonitor');

// Import memory profiler
const MemoryProfiler = require('./utils/memoryProfiler');

// Import routes
const locationRoutes = require('./routes/location');
const analyticsRoutes = require('./routes/analytics');
const unifiedDataRoutes = require('./routes/unifiedData');
const feedbackRoutes = require('./routes/feedback');
const reportsRoutes = require('./routes/reports');
const legacyRoutes = require('./routes/legacy');
const questionnaireRoutes = require('./routes/questionnaire');
const upgradeRoutes = require('./routes/upgrade');
const authRoutes = require('./routes/auth');
const userDataRoutes = require('./routes/user-data');

// Import services
const dbService = require('./config/postgis');
const redisService = require('./services/redis');
const backgroundTasks = require('./services/backgroundTasks');
const DataEnrichmentService = require('./services/dataEnrichment');

const app = express();
const server = http.createServer(app);

// Initialize performance monitoring
performanceMonitor.start();

// Initialize memory monitoring
memoryMonitor.start();

// Initialize memory profiler
const memoryProfiler = new MemoryProfiler();

// Setup clustering if enabled
setupClustering();

// Socket.IO setup with security
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            // Allow requests with no origin
            if (!origin) return callback(null, true);
            
            const allowedOrigins = [
                process.env.CLIENT_URL || "http://localhost:3000",
                "http://localhost:3000",
                "http://localhost:3001"
            ];
            
            // In development, allow local network IPs with any port
            if (process.env.NODE_ENV !== 'production') {
                // Allow localhost with any port
                if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
                    return callback(null, true);
                }
                
                // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) with any port
                const localNetworkPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
                if (localNetworkPattern.test(origin)) {
                    return callback(null, true);
                }
            }
            
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"]
    }
});

// Apply socket security middleware
socketSecurity(io);

// Initialize data enrichment service
const dataEnrichmentService = new DataEnrichmentService(io);

// Security middleware
app.use(helmetMiddleware);

// Handle OPTIONS preflight requests explicitly
app.options('*', corsMiddleware);

// Apply CORS middleware
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(sanitizeInput);

// Performance middleware
app.use(compressionMiddleware);
app.use(responseTimeMonitor);
app.use(queryOptimization);
app.use(connectionOptimization);
app.use(memoryCleanup);

// Memory monitoring middleware
app.use(memoryMonitoringMiddleware);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiRateLimit);
app.use('/', generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/unified-data', unifiedDataRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/questionnaire', questionnaireRoutes);
app.use('/api/v1/upgrade', upgradeRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user-data', userDataRoutes);
app.use('/api', legacyRoutes);

// Enhanced health check endpoint
app.get('/health', healthCheck);

// Performance metrics endpoint
app.get('/metrics', getPerformanceMetrics);

// Memory debugging endpoint
app.get('/memory', memoryDebugEndpoint);

// Emergency memory cleanup endpoint
app.post('/memory/cleanup', emergencyCleanupEndpoint);

// Memory profiler endpoint
app.get('/memory/profile', (req, res) => {
    try {
        const report = memoryProfiler.generateReport();
        res.json({
            success: true,
            ...report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// System status endpoint
app.get('/status', (req, res) => {
    const health = performanceMonitor.getHealthStatus();
    
    // Get memory breakdown
    const memoryBreakdown = memoryProfiler.getMemoryBreakdown();
    
    // Get diagnostic information
    const diagnostics = getDiagnostics(health, memoryBreakdown);
    
    res.json({
        status: health.status,
        timestamp: health.timestamp,
        uptime: health.uptime,
        version: process.env.npm_package_version || '1.0.0',
        memory: {
            ...health.memory,
            breakdown: {
                heapUsed: memoryBreakdown.heapUsed,
                heapTotal: memoryBreakdown.heapTotal,
                external: memoryBreakdown.external,
                arrayBuffers: memoryBreakdown.arrayBuffers
            }
        },
        performance: {
            ...health.performance,
            gcAvailable: !!global.gc
        },
        issues: diagnostics.issues.length > 0 ? diagnostics.issues : health.issues,
        diagnostics: {
            heapSpaces: diagnostics.heapSpaces,
            recommendations: diagnostics.recommendations
        },
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            heapSizeLimit: memoryBreakdown.heapSizeLimit,
            totalPhysicalSize: memoryBreakdown.totalPhysicalSize
        }
    });
});

// API info endpoint (moved to /api/info to allow frontend at root)
app.get('/api/info', (req, res) => {
    res.json({
        name: 'IPMAS API',
        version: '1.0.0',
        description: 'Integrated Poverty Mapping & Analysis System API',
        endpoints: {
            location: '/api/v1/location',
            analytics: '/api/v1/analytics',
            unifiedData: '/api/v1/unified-data',
            feedback: '/api/v1/feedback',
            reports: '/api/v1/reports',
            questionnaire: '/api/v1/questionnaire',
            health: '/health',
            metrics: '/metrics',
            status: '/status',
            apiInfo: '/api/info'
        },
        documentation: process.env.API_DOCS_URL || 'https://github.com/your-org/IPMAS2'
    });
});

// Socket.IO connection handling with enhanced real-time features
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Store client metadata
    socket.clientData = {
        id: socket.id,
        connectedAt: new Date(),
        activeRooms: new Set(),
        lastActivity: new Date()
    };

    // Send initial system status
    socket.emit('system-status', {
        status: 'online',
        connectedClients: io.sockets.sockets.size,
        serverTime: new Date().toISOString()
    });

    // Join location-specific rooms
    socket.on('join-location', (locationData) => {
        const roomName = `location-${locationData.lat}-${locationData.lng}`;
        socket.join(roomName);
        socket.clientData.activeRooms.add(roomName);
        socket.clientData.lastActivity = new Date();
        
        console.log(`Client ${socket.id} joined room: ${roomName}`);
        
        // Send current location data to the client
        socket.emit('location-joined', {
            room: roomName,
            location: locationData,
            participants: getRoomParticipants(io, roomName)
        });
    });

    // Leave location rooms
    socket.on('leave-location', (locationData) => {
        const roomName = `location-${locationData.lat}-${locationData.lng}`;
        socket.leave(roomName);
        socket.clientData.activeRooms.delete(roomName);
        console.log(`Client ${socket.id} left room: ${roomName}`);
    });

    // Handle location updates with enhanced features
    socket.on('location-update', (data) => {
        socket.clientData.lastActivity = new Date();
        
        // Broadcast to all clients in the same location room
        const roomName = `location-${data.lat}-${data.lng}`;
        io.to(roomName).emit('location-data', {
            ...data,
            timestamp: new Date().toISOString(),
            source: socket.id
        });

        // Store location update in database (async)
        storeLocationUpdate(data).catch(err => 
            console.error('Failed to store location update:', err)
        );
    });

    // Handle filter updates with persistence
    socket.on('filter-update', (filterData) => {
        socket.clientData.lastActivity = new Date();
        
        // Broadcast filter changes to all connected clients
        io.emit('filter-data', {
            ...filterData,
            timestamp: new Date().toISOString(),
            source: socket.id
        });

        // Store filter preferences (async)
        storeFilterPreferences(socket.id, filterData).catch(err =>
            console.error('Failed to store filter preferences:', err)
        );
    });

    // Handle intervention simulation with real-time progress
    socket.on('intervention-simulation', (simulationData) => {
        socket.clientData.lastActivity = new Date();
        
        // Send simulation start notification
        socket.emit('simulation-started', {
            id: simulationData.id || Date.now(),
            type: simulationData.type,
            timestamp: new Date().toISOString()
        });

        // Process simulation asynchronously
        processInterventionSimulationAsync(simulationData, socket.id)
            .then(results => {
                // Send results to the requesting client
                socket.emit('simulation-results', {
                    ...results,
                    timestamp: new Date().toISOString()
                });

                // Broadcast to all clients in the same location
                const roomName = `location-${simulationData.lat}-${simulationData.lng}`;
                io.to(roomName).emit('simulation-results', {
                    ...results,
                    timestamp: new Date().toISOString(),
                    source: socket.id
                });
            })
            .catch(error => {
                socket.emit('simulation-error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            });
    });

    // Handle real-time collaboration features
    socket.on('cursor-update', (cursorData) => {
        // Broadcast cursor position to other clients in the same room
        socket.clientData.activeRooms.forEach(roomName => {
            socket.to(roomName).emit('user-cursor', {
                ...cursorData,
                userId: socket.id,
                timestamp: new Date().toISOString()
            });
        });
    });

    // Handle chat messages
    socket.on('chat-message', (messageData) => {
        const roomName = `location-${messageData.lat}-${messageData.lng}`;
        
        const message = {
            id: Date.now(),
            userId: socket.id,
            username: messageData.username || 'Anonymous',
            message: messageData.message,
            timestamp: new Date().toISOString(),
            location: messageData.location
        };

        // Broadcast to all clients in the location room
        io.to(roomName).emit('chat-message', message);

        // Store message in database (async)
        storeChatMessage(message).catch(err =>
            console.error('Failed to store chat message:', err)
        );
    });

    // Handle poverty data updates (real-time notifications)
    socket.on('poverty-data-update', async (locationData) => {
        socket.clientData.lastActivity = new Date();
        
        try {
            // Store updated poverty data in database (async)
            if (locationData.lat && locationData.lng) {
                // Update or insert location data
                // Check if location exists first
                const existing = await dbService.pool.query(
                    `SELECT id FROM geospatial_data WHERE name = $1 AND county = $2 LIMIT 1`,
                    [locationData.name || 'Unknown', locationData.county || 'Unknown']
                );
                
                if (existing.rows.length > 0) {
                    // Update existing location
                    await dbService.pool.query(`
                        UPDATE geospatial_data 
                        SET 
                            latitude = $1,
                            longitude = $2,
                            location_text = ST_SetSRID(ST_Point($2, $1), 4326),
                            poverty_index = $3,
                            education_access = $4,
                            health_vulnerability = $5,
                            water_access = $6,
                            employment_rate = $7,
                            housing_quality = $8,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $9
                    `, [
                        locationData.lat,
                        locationData.lng,
                        locationData.poverty_index || null,
                        locationData.education_access || null,
                        locationData.health_vulnerability || null,
                        locationData.water_access || null,
                        locationData.employment_rate || null,
                        locationData.housing_quality || null,
                        existing.rows[0].id
                    ]);
                } else {
                    // Insert new location
                    await dbService.pool.query(`
                        INSERT INTO geospatial_data (
                            name, county, latitude, longitude, location_text,
                            poverty_index, education_access, health_vulnerability,
                            water_access, employment_rate, housing_quality
                        ) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_Point($4, $3), 4326), $5, $6, $7, $8, $9, $10)
                    `, [
                        locationData.name || 'Unknown',
                        locationData.county || 'Unknown',
                        locationData.lat,
                        locationData.lng,
                        locationData.poverty_index || null,
                        locationData.education_access || null,
                        locationData.health_vulnerability || null,
                        locationData.water_access || null,
                        locationData.employment_rate || null,
                        locationData.housing_quality || null
                    ]);
                }
                
                // Broadcast update to all connected clients
                io.emit('poverty-data-updated', {
                    ...locationData,
                    timestamp: new Date().toISOString(),
                    source: socket.id,
                    action: 'updated'
                });
                
                console.log(`📊 Poverty data updated for ${locationData.name} (${locationData.county})`);
            }
        } catch (error) {
            console.error('Error updating poverty data:', error);
            socket.emit('poverty-data-error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Subscribe to poverty data updates for specific locations
    socket.on('subscribe-poverty-updates', (locationFilter) => {
        const roomName = `poverty-updates-${locationFilter.county || 'all'}`;
        socket.join(roomName);
        socket.clientData.activeRooms.add(roomName);
        console.log(`Client ${socket.id} subscribed to poverty updates: ${roomName}`);
    });
    
    // Unsubscribe from poverty data updates
    socket.on('unsubscribe-poverty-updates', (locationFilter) => {
        const roomName = `poverty-updates-${locationFilter.county || 'all'}`;
        socket.leave(roomName);
        socket.clientData.activeRooms.delete(roomName);
        console.log(`Client ${socket.id} unsubscribed from poverty updates: ${roomName}`);
    });

    // ============================================
    // Real-time Data Enrichment Handlers
    // ============================================
    
    // Request data enrichment for a location
    socket.on('request-data-enrichment', async (locationData) => {
        socket.clientData.lastActivity = new Date();
        console.log(`📊 Data enrichment requested for: ${locationData.name || 'Unknown'} (${locationData.lat}, ${locationData.lng})`);
        
        try {
            // Request enrichment (will emit 'data-enriched' when ready)
            await dataEnrichmentService.requestEnrichment(locationData, socket.id);
        } catch (error) {
            console.error('Error requesting data enrichment:', error);
            socket.emit('data-enrichment-error', {
                location: locationData,
                error: error.message
            });
        }
    });

    // Subscribe to location for real-time updates
    socket.on('subscribe-location-enrichment', (locationData) => {
        socket.clientData.lastActivity = new Date();
        console.log(`📍 Client ${socket.id} subscribed to enrichment for: ${locationData.name || 'Unknown'}`);
        dataEnrichmentService.subscribeToLocation(socket.id, locationData);
    });

    // Unsubscribe from location enrichment
    socket.on('unsubscribe-location-enrichment', (locationData) => {
        socket.clientData.lastActivity = new Date();
        console.log(`📍 Client ${socket.id} unsubscribed from enrichment for: ${locationData.name || 'Unknown'}`);
        dataEnrichmentService.unsubscribeFromLocation(socket.id, locationData);
    });

    // Request fallback data stream
    socket.on('request-fallback-data', async (locationData) => {
        socket.clientData.lastActivity = new Date();
        console.log(`🔄 Fallback data requested for: ${locationData.name || 'Unknown'}`);
        
        try {
            await dataEnrichmentService.streamFallbackData(locationData, socket.id);
        } catch (error) {
            console.error('Error streaming fallback data:', error);
            socket.emit('fallback-data-error', {
                location: locationData,
                error: error.message
            });
        }
    });

    // Handle report generation requests
    socket.on('generate-report', (reportData) => {
        socket.clientData.lastActivity = new Date();
        
        // Send report generation start notification
        socket.emit('report-generation-started', {
            id: reportData.id || Date.now(),
            type: reportData.type,
            timestamp: new Date().toISOString()
        });

        // Process report generation asynchronously
        generateReportAsync(reportData, socket.id)
            .then(report => {
                socket.emit('report-generated', {
                    ...report,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                socket.emit('report-error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            });
    });

    // Handle heartbeat/ping
    socket.on('ping', () => {
        socket.emit('pong', {
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
        });
    });

    // Handle data export requests
    socket.on('export-data', (exportData) => {
        socket.clientData.lastActivity = new Date();
        
        exportDataAsync(exportData, socket.id)
            .then(exportResult => {
                socket.emit('data-exported', {
                    ...exportResult,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                socket.emit('export-error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Clean up client data
        socket.clientData.activeRooms.forEach(roomName => {
            socket.to(roomName).emit('user-disconnected', {
                userId: socket.id,
                timestamp: new Date().toISOString()
            });
        });

        // Broadcast updated client count
        io.emit('system-status', {
            status: 'online',
            connectedClients: io.sockets.sockets.size - 1,
            serverTime: new Date().toISOString()
        });
    });
});

// Helper functions for Socket.IO real-time features
function getRoomParticipants(io, roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);
    if (!room) return [];
    
    return Array.from(room).map(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        return socket ? {
            id: socketId,
            connectedAt: socket.clientData?.connectedAt,
            lastActivity: socket.clientData?.lastActivity
        } : null;
    }).filter(Boolean);
}

// Async helper functions for database operations
async function storeLocationUpdate(data) {
    // In a real implementation, this would store location updates in the database
    console.log('Storing location update:', data);
    // Example: await dbService.storeLocationUpdate(data);
}

async function storeFilterPreferences(socketId, filterData) {
    // Store user filter preferences for persistence
    console.log('Storing filter preferences for', socketId, ':', filterData);
    // Example: await dbService.storeFilterPreferences(socketId, filterData);
}

async function storeChatMessage(message) {
    // Store chat messages in the database
    console.log('Storing chat message:', message);
    // Example: await dbService.storeChatMessage(message);
}

async function processInterventionSimulationAsync(simulationData, socketId) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { type, scale, duration, location } = simulationData;
    
    // Generate mock simulation results
    const results = {
        id: simulationData.id || Date.now(),
        type: type,
        scale: scale,
        duration: duration,
        location: location,
        impact: {
            poverty_reduction: Math.random() * 30 + 10, // 10-40% reduction
            cost_estimate: scale * duration * 1000, // Mock cost calculation
            timeline: duration,
            success_probability: Math.random() * 0.4 + 0.6, // 60-100% success
            side_effects: generateSideEffects(type)
        },
        recommendations: generateRecommendations(type, scale),
        next_steps: generateNextSteps(type),
        confidence_score: Math.random() * 0.3 + 0.7 // 70-100% confidence
    };
    
    return results;
}

async function generateReportAsync(reportData, socketId) {
    // Simulate report generation time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { type, format, location, filters } = reportData;
    
    return {
        id: reportData.id || Date.now(),
        type: type,
        format: format,
        location: location,
        filters: filters,
        file_path: `/reports/${type}_${Date.now()}.${format}`,
        size: Math.floor(Math.random() * 5000000) + 1000000, // 1-6 MB
        generated_at: new Date().toISOString(),
        download_url: `/api/v1/reports/download/${Date.now()}`
    };
}

async function exportDataAsync(exportData, socketId) {
    // Simulate data export time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const { format, filters, location } = exportData;
    
    return {
        id: Date.now(),
        format: format,
        filters: filters,
        location: location,
        file_path: `/exports/data_export_${Date.now()}.${format}`,
        size: Math.floor(Math.random() * 10000000) + 5000000, // 5-15 MB
        record_count: Math.floor(Math.random() * 10000) + 1000,
        generated_at: new Date().toISOString(),
        download_url: `/api/v1/exports/download/${Date.now()}`
    };
}

function generateSideEffects(interventionType) {
    const sideEffects = {
        'education': ['Increased school enrollment', 'Teacher shortage risk', 'Infrastructure strain'],
        'health': ['Improved health outcomes', 'Resource allocation challenges', 'Training needs'],
        'infrastructure': ['Economic development', 'Environmental impact', 'Maintenance costs'],
        'employment': ['Job creation', 'Skill mismatch', 'Market saturation risk']
    };
    
    return sideEffects[interventionType] || ['Positive community impact', 'Resource requirements'];
}

function generateRecommendations(interventionType, scale) {
    const recommendations = {
        'education': [
            'Implement teacher training programs',
            'Establish community learning centers',
            'Develop digital learning resources'
        ],
        'health': [
            'Deploy mobile health units',
            'Train community health workers',
            'Establish health monitoring systems'
        ],
        'infrastructure': [
            'Prioritize water and sanitation',
            'Improve road connectivity',
            'Establish maintenance protocols'
        ],
        'employment': [
            'Create skills development programs',
            'Establish micro-finance opportunities',
            'Develop market linkages'
        ]
    };
    
    return recommendations[interventionType] || ['Monitor implementation progress', 'Engage community stakeholders'];
}

function generateNextSteps(interventionType) {
    return [
        'Conduct detailed feasibility study',
        'Engage local community leaders',
        'Secure funding and resources',
        'Develop implementation timeline',
        'Establish monitoring and evaluation framework'
    ];
}

// Intervention simulation processing
function processInterventionSimulation(data) {
    const { type, scale, duration, location } = data;
    
    // Mock simulation results based on intervention type
    const interventionTypes = {
        education: {
            povertyReduction: scale * duration * 0.1,
            cost: scale * 50000,
            timeline: duration,
            successRate: 0.85
        },
        health: {
            povertyReduction: scale * duration * 0.15,
            cost: scale * 75000,
            timeline: duration,
            successRate: 0.78
        },
        infrastructure: {
            povertyReduction: scale * duration * 0.2,
            cost: scale * 100000,
            timeline: duration,
            successRate: 0.82
        },
        employment: {
            povertyReduction: scale * duration * 0.25,
            cost: scale * 60000,
            timeline: duration,
            successRate: 0.88
        }
    };
    
    const results = interventionTypes[type] || interventionTypes.education;
    
    return {
        ...results,
        recommendations: [
            'Conduct community needs assessment',
            'Establish monitoring framework',
            'Engage local stakeholders',
            'Develop sustainability plan'
        ],
        risks: [
            'Resource constraints',
            'Community resistance',
            'Implementation delays',
            'Maintenance challenges'
        ]
    };
}

// Get granular diagnostics
function getDiagnostics(health, memoryBreakdown) {
    const issues = [];
    
    // Memory diagnostics
    if (health.memory.percentage > 85) {
        issues.push(`Critical memory usage: ${health.memory.percentage.toFixed(1)}%`);
        issues.push('Recommend: Increase heap size or optimize memory usage');
    } else if (health.memory.percentage > 75) {
        issues.push(`Elevated memory usage: ${health.memory.percentage.toFixed(1)}%`);
    }
    
    // Heap space diagnostics
    if (memoryBreakdown.heapSpaces) {
        memoryBreakdown.heapSpaces.forEach(space => {
            const usage = (space.spaceUsedSize / space.spaceSize) * 100;
            if (usage > 85) {
                issues.push(`High usage in ${space.spaceName}: ${usage.toFixed(1)}%`);
            }
        });
    }
    
    // Performance diagnostics
    if (health.performance.averageResponseTime > 500) {
        issues.push(`Slow average response time: ${health.performance.averageResponseTime.toFixed(1)}ms`);
    }
    
    if (health.performance.errorRate > 5) {
        issues.push(`High error rate: ${health.performance.errorRate.toFixed(1)}%`);
    }
    
    if (health.performance.cacheHitRate < 50) {
        issues.push(`Low cache hit rate: ${health.performance.cacheHitRate.toFixed(1)}% - Consider caching more responses`);
    }
    
    return {
        issues: issues,
        heapSpaces: memoryBreakdown.heapSpaces,
        recommendations: memoryProfiler.identifyTopConsumers().recommendations
    };
}

// Initialize services
async function initializeServices() {
    try {
        console.log('Initializing IPMAS services...');
        
        // Initialize database
        await dbService.initialize();

        // Initialize Redis (optional for development)
        try {
            await redisService.initialize();
            console.log('Redis initialized successfully');
        } catch (error) {
            console.log('Redis not available, using in-memory cache');
        }

        // Start background tasks
        backgroundTasks.start();
        console.log('Background tasks started');

    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

// Serve static files from frontend (for production deployment)
const path = require('path');
// Use dist/ folder if it exists (production build), otherwise use public/ (development)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
const frontendPublicPath = path.join(__dirname, '../../frontend/public');
const fs = require('fs');
const frontendPath = fs.existsSync(frontendDistPath) ? frontendDistPath : frontendPublicPath;

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(frontendPath));

// Serve frontend index.html for root route
app.get('/', (req, res, next) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('Error serving index.html:', err);
                next();
            }
        });
    } else {
        console.warn('Frontend index.html not found at:', indexPath);
        next();
    }
});

// Serve index.html for all other non-API routes (SPA routing)
app.get('*', (req, res, next) => {
    // Skip API routes and system endpoints
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/metrics') || req.path.startsWith('/status') || req.path.startsWith('/memory')) {
        return next();
    }
    // Serve frontend index.html for all other routes
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
            if (err) {
                next();
            }
        });
    } else {
        next();
    }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler for API routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `The requested resource ${req.url} was not found`,
        timestamp: new Date().toISOString(),
        available_endpoints: [
            '/api/v1/location',
            '/api/v1/analytics',
            '/api/v1/unified-data',
            '/api/v1/feedback',
            '/api/v1/reports',
            '/api/v1/questionnaire',
            '/health',
            '/metrics',
            '/status'
        ]
    });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, async () => {
        console.log(`🌍 IPMAS API Server starting on port ${PORT}`);
        console.log(`🔗 API Endpoint: http://localhost:${PORT}/api/v1`);
        console.log(`📋 API Info: http://localhost:${PORT}/`);
        console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
        console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
        console.log(`📈 System Status: http://localhost:${PORT}/status`);
        
        await initializeServices();
        console.log('✅ IPMAS API is ready!');
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    // Stop memory monitoring
    memoryMonitor.stop();
    
    // Stop performance monitoring
    performanceMonitor.stop();
    
    // Stop background tasks
    backgroundTasks.stop();
    
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    
    // Stop memory monitoring
    memoryMonitor.stop();
    
    // Stop performance monitoring
    performanceMonitor.stop();
    
    // Stop background tasks
    backgroundTasks.stop();
    
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = { app, server, io };
