const express = require('express');
const router = express.Router();
const dbService = require('../config/postgis');
const validator = require('validator');

function sanitizeString(value) {
    return validator.escape(validator.trim(value || ''));
}

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const sanitizedEmail = sanitizeString(email).toLowerCase();
        
        if (!validator.isEmail(sanitizedEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Verify user credentials
        const user = await dbService.verifyUser(sanitizedEmail, password);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check subscription status
        const subscriptionStatus = await dbService.checkSubscriptionStatus(sanitizedEmail);

        // Create session
        const session = await dbService.createSession(sanitizedEmail, 30);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                email: user.email,
                username: user.username,
                organizationName: user.organizationName
            },
            session: {
                token: session.session_token,
                expiresAt: session.expires_at
            },
            subscription: subscriptionStatus
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during login',
            message: error.message
        });
    }
});

// Register endpoint (optional - for new users)
router.post('/register', async (req, res) => {
    try {
        const { email, password, username, organizationName } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        const sanitizedEmail = sanitizeString(email).toLowerCase();
        
        if (!validator.isEmail(sanitizedEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Create user
        const user = await dbService.createUser(
            sanitizedEmail,
            password,
            username ? sanitizeString(username) : null,
            organizationName ? sanitizeString(organizationName) : null
        );

        res.json({
            success: true,
            message: 'User registered successfully',
            user: {
                email: user.email,
                username: user.username,
                organizationName: user.organization_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during registration',
            message: error.message
        });
    }
});

// Check session endpoint
router.get('/session', async (req, res) => {
    try {
        const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                           req.cookies?.session_token ||
                           req.query.token;

        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                error: 'No session token provided'
            });
        }

        const session = await dbService.verifySession(sessionToken);

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        // Get subscription status
        const subscriptionStatus = await dbService.checkSubscriptionStatus(session.email);

        res.json({
            success: true,
            user: {
                email: session.email,
                userId: session.userId,
                username: session.username,
                organizationName: session.organizationName
            },
            subscription: subscriptionStatus
        });
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during session check',
            message: error.message
        });
    }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        const sessionToken = req.headers.authorization?.replace('Bearer ', '') || 
                           req.cookies?.session_token ||
                           req.body.token;

        if (sessionToken) {
            await dbService.deleteSession(sessionToken);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during logout',
            message: error.message
        });
    }
});

// Get subscription status endpoint
router.get('/subscription/:email', async (req, res) => {
    try {
        const email = sanitizeString(req.params.email).toLowerCase();

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        const subscriptionStatus = await dbService.checkSubscriptionStatus(email);

        res.json({
            success: true,
            subscription: subscriptionStatus
        });
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

module.exports = router;

