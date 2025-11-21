/**
 * Security Middleware for IPMAS
 * Comprehensive security measures and input validation
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const validator = require('validator');

// Rate limiting configurations
const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // More restrictive for API endpoints
    message: {
        error: 'API rate limit exceeded',
        message: 'Too many API requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://ipmas.kenya.gov',
            'https://www.ipmas.kenya.gov',
            'https://ipmas-backend.onrender.com',
            process.env.CORS_ORIGIN || 'https://ipmas-backend.onrender.com'
        ].filter(Boolean); // Remove any undefined values
        
        // In development/non-production, allow local network IPs and localhost with any port
        if (process.env.NODE_ENV !== 'production') {
            // Allow localhost with any port
            if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
                console.log(`✅ CORS: Allowed localhost origin: ${origin}`);
                return callback(null, true);
            }
            
            // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) with any port
            const localNetworkPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
            if (localNetworkPattern.test(origin)) {
                console.log(`✅ CORS: Allowed local network origin: ${origin}`);
                return callback(null, true);
            }
        }
        
        if (allowedOrigins.includes(origin)) {
            console.log(`✅ CORS: Allowed origin: ${origin}`);
            callback(null, true);
        } else {
            console.warn(`❌ CORS: Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400 // 24 hours
};

const corsMiddleware = cors(corsOptions);

// Helmet configuration for security headers
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdn.socket.io"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://unpkg.com", "https://nominatim.openstreetmap.org", "https://cdn.jsdelivr.net", "https://cdn.socket.io", "https://ipmas-backend.onrender.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Additional security headers
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize string inputs
    const sanitizeObject = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove potentially dangerous characters
                obj[key] = validator.escape(obj[key]);
                // Trim whitespace
                obj[key] = obj[key].trim();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    };

    if (req.body) {
        sanitizeObject(req.body);
    }
    if (req.query) {
        sanitizeObject(req.query);
    }
    if (req.params) {
        sanitizeObject(req.params);
    }

    next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request details
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
    
    // Log response details when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Handle different types of errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing authentication',
            timestamp: new Date().toISOString()
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid Data Type',
            message: 'Invalid data format provided',
            timestamp: new Date().toISOString()
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Socket.IO security middleware
const socketSecurity = (io) => {
    io.use((socket, next) => {
        // Validate socket connection
        const origin = socket.handshake.headers.origin;
        
        if (process.env.NODE_ENV === 'production') {
            const allowedOrigins = [
                'https://ipmas.kenya.gov',
                'https://www.ipmas.kenya.gov'
            ];
            
            if (!allowedOrigins.includes(origin)) {
                return next(new Error('Origin not allowed'));
            }
        }

        // Rate limiting for socket connections
        const clientId = socket.handshake.address;
        // In a real implementation, you would implement rate limiting here
        
        next();
    });

    // Handle socket errors
    io.on('connection', (socket) => {
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });
};

// Input validation middleware
const inputValidation = {
    // Validate coordinates
    validateCoordinates: (req, res, next) => {
        const { lat, lng } = req.params;
        
        if (lat !== undefined && lng !== undefined) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            
            if (isNaN(latitude) || isNaN(longitude)) {
                return res.status(400).json({
                    error: 'Invalid coordinates',
                    message: 'Latitude and longitude must be valid numbers'
                });
            }
            
            if (latitude < -90 || latitude > 90) {
                return res.status(400).json({
                    error: 'Invalid latitude',
                    message: 'Latitude must be between -90 and 90 degrees'
                });
            }
            
            if (longitude < -180 || longitude > 180) {
                return res.status(400).json({
                    error: 'Invalid longitude',
                    message: 'Longitude must be between -180 and 180 degrees'
                });
            }
            
            req.params.lat = latitude;
            req.params.lng = longitude;
        }
        
        next();
    },

    // Validate pagination parameters
    validatePagination: (req, res, next) => {
        const { page, limit } = req.query;
        
        if (page !== undefined) {
            const pageNum = parseInt(page);
            if (isNaN(pageNum) || pageNum < 1) {
                return res.status(400).json({
                    error: 'Invalid page number',
                    message: 'Page must be a positive integer'
                });
            }
            req.query.page = pageNum;
        }
        
        if (limit !== undefined) {
            const limitNum = parseInt(limit);
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    error: 'Invalid limit',
                    message: 'Limit must be between 1 and 100'
                });
            }
            req.query.limit = limitNum;
        }
        
        next();
    },

    // Validate report parameters
    validateReportParams: (req, res, next) => {
        const { type, format } = req.body;
        
        const validTypes = ['Comprehensive', 'Poverty Analysis', 'Education Report', 'Health Report', 'Infrastructure Report'];
        const validFormats = ['pdf', 'html', 'json', 'xlsx'];
        
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Invalid report type',
                message: `Report type must be one of: ${validTypes.join(', ')}`
            });
        }
        
        if (format && !validFormats.includes(format)) {
            return res.status(400).json({
                error: 'Invalid format',
                message: `Format must be one of: ${validFormats.join(', ')}`
            });
        }
        
        next();
    }
};

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    // This middleware can be extended to handle more specific validation errors
    next();
};

module.exports = {
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
};
