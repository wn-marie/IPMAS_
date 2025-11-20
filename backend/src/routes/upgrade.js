const express = require('express');
const validator = require('validator');
const router = express.Router();

const dbService = require('../config/postgis');
const darajaSandbox = require('../services/darajaSandbox');

function sanitizeString(value) {
    return validator.escape(validator.trim(value || ''));
}

function sanitizePhone(value) {
    const digits = (value || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
        return `254${digits.slice(1)}`;
    }
    if (digits.startsWith('254')) {
        return digits;
    }
    if (digits.startsWith('1') && digits.length === 9) {
        return `254${digits}`;
    }
    return digits;
}

function mapRequestForResponse(record) {
    if (!record) return null;
    return {
        id: record.id,
        organizationName: record.organizationName,
        contactPerson: record.contactPerson,
        contactEmail: record.contactEmail,
        contactPhone: record.contactPhone,
        paymentMethod: record.paymentMethod,
        planTier: record.planTier,
        notes: record.notes,
        status: record.status,
        source: record.source,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        daraja: record.daraja
    };
}

// Premium subscription configuration
const PREMIUM_CONFIG = {
    BASE_AMOUNT: 5000, // Base monthly subscription amount (KES)
    BASE_DAYS: 30, // Base subscription period (days)
    MIN_AMOUNT: 5000 // Minimum payment amount
};

// Calculate subscription days based on amount paid
function calculateSubscriptionDays(amountPaid, baseAmount, baseDays) {
    if (amountPaid < baseAmount) {
        return 0; // Insufficient payment
    }
    // Calculate how many months/periods the payment covers
    const periods = Math.floor(amountPaid / baseAmount);
    // Return total days
    return periods * baseDays;
}

router.post('/', async (req, res) => {
    try {
        const {
            organizationName,
            contactPerson,
            contactEmail,
            contactPhone,
            paymentMethod,
            paymentDetails,
            subscriptionAmount,
            notes,
            planTier = 'premium'
        } = req.body || {};

        if (!organizationName || !contactPerson || !contactEmail || !contactPhone || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields. Please include organizationName, contactPerson, contactEmail, contactPhone, and paymentMethod.'
            });
        }

        if (!validator.isEmail(contactEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address.'
            });
        }

        // Validate payment details based on method
        if (!paymentDetails) {
            return res.status(400).json({
                success: false,
                error: 'Payment details are required.'
            });
        }

        // Validate subscription amount
        const requestedAmount = parseFloat(subscriptionAmount) || PREMIUM_CONFIG.BASE_AMOUNT;
        if (requestedAmount < PREMIUM_CONFIG.MIN_AMOUNT) {
            return res.status(400).json({
                success: false,
                error: `Minimum subscription amount is ${PREMIUM_CONFIG.MIN_AMOUNT} KES.`
            });
        }

        const sanitizedPayload = {
            organizationName: sanitizeString(organizationName),
            contactPerson: sanitizeString(contactPerson),
            contactEmail: validator.normalizeEmail(contactEmail),
            contactPhone: sanitizePhone(contactPhone),
            paymentMethod: sanitizeString(paymentMethod),
            notes: notes ? validator.escape(notes) : null,
            planTier: sanitizeString(planTier),
            source: 'upgrade-page'
        };

        // Store and verify payment
        let paymentVerification = null;
        let premiumActivated = false;
        let actualAmountPaid = 0;

        if (paymentMethod === 'M-Pesa') {
            const transactionCode = paymentDetails.transactionCode?.trim().toUpperCase();
            if (!transactionCode) {
                return res.status(400).json({
                    success: false,
                    error: 'M-Pesa transaction code is required.'
                });
            }

            // Verify M-Pesa transaction code from database
            // Note: M-Pesa payments should be added to database via webhook or manual entry first
            // We get the actual amount paid from the payment record
            paymentVerification = await dbService.verifyMpesaPayment(transactionCode, requestedAmount);
            
            if (paymentVerification && paymentVerification.verified) {
                actualAmountPaid = paymentVerification.amount;
                
                // Check if full amount was paid
                if (actualAmountPaid < requestedAmount) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient payment. Expected at least ${requestedAmount} KES, received ${actualAmountPaid} KES.`
                    });
                }
                
                premiumActivated = true;
            }
        } else if (paymentMethod === 'PayPal') {
            const paypalEmail = paymentDetails.paypalEmail?.trim().toLowerCase();
            if (!paypalEmail || !validator.isEmail(paypalEmail)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid PayPal email address is required.'
                });
            }

            // Store and verify PayPal payment
            await dbService.savePayment({
                paymentMethod: 'PayPal',
                paypalEmail: paypalEmail,
                amount: requestedAmount,
                contactEmail: sanitizedPayload.contactEmail,
                contactPhone: sanitizedPayload.contactPhone,
                organizationName: sanitizedPayload.organizationName
            });

            paymentVerification = await dbService.verifyPayPalPayment(paypalEmail, requestedAmount);
            
            if (paymentVerification && paymentVerification.verified) {
                actualAmountPaid = paymentVerification.amount;
                
                // Check if full amount was paid
                if (actualAmountPaid < requestedAmount) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient payment. Expected ${requestedAmount} KES, received ${actualAmountPaid} KES.`
                    });
                }
                
                premiumActivated = true;
            }
        } else if (paymentMethod === 'Card') {
            const { cardNumber, cardExpiry, cardCVC, cardName } = paymentDetails;
            if (!cardNumber || !cardExpiry || !cardCVC || !cardName) {
                return res.status(400).json({
                    success: false,
                    error: 'All card details are required.'
                });
            }

            // Verify card payment (in production, this would integrate with payment gateway)
            paymentVerification = await dbService.verifyCardPayment({
                cardNumber: cardNumber.replace(/\s/g, ''),
                cardExpiry,
                cardCVC,
                cardName,
                amount: requestedAmount,
                email: sanitizedPayload.contactEmail
            });
            
            if (paymentVerification && paymentVerification.verified) {
                actualAmountPaid = paymentVerification.amount;
                
                // Check if full amount was paid
                if (actualAmountPaid < requestedAmount) {
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient payment. Expected ${requestedAmount} KES, received ${actualAmountPaid} KES.`
                    });
                }
                
                premiumActivated = true;
            }
        }

        // If payment verified, create subscription
        let subscription = null;
        if (premiumActivated && paymentVerification && paymentVerification.verified) {
            // Calculate subscription duration based on amount paid
            const subscriptionDays = calculateSubscriptionDays(
                actualAmountPaid,
                PREMIUM_CONFIG.BASE_AMOUNT,
                PREMIUM_CONFIG.BASE_DAYS
            );

            if (subscriptionDays === 0) {
                return res.status(400).json({
                    success: false,
                    error: `Payment amount is insufficient. Minimum ${PREMIUM_CONFIG.BASE_AMOUNT} KES required for subscription.`
                });
            }

            // Create subscription record
            subscription = await dbService.createSubscription({
                userEmail: sanitizedPayload.contactEmail,
                username: sanitizedPayload.contactPerson,
                organizationName: sanitizedPayload.organizationName,
                packageName: sanitizedPayload.planTier,
                packageAmount: PREMIUM_CONFIG.BASE_AMOUNT,
                amountPaid: actualAmountPaid,
                subscriptionDays: subscriptionDays,
                paymentId: paymentVerification.id
            });

            // Activate premium
            await dbService.activatePremium(sanitizedPayload.contactEmail, paymentVerification.id);
        }

        // Save upgrade request
        const darajaDemo = paymentMethod === 'M-Pesa' ? await darajaSandbox.simulateStkPush({
            phoneNumber: sanitizedPayload.contactPhone,
            amount: 1,
            accountReference: sanitizedPayload.organizationName.slice(0, 10),
            description: `IPMAS ${sanitizedPayload.planTier} upgrade demo`
        }) : null;

        const savedRequest = await dbService.saveUpgradeRequest({
            ...sanitizedPayload,
            status: premiumActivated ? 'approved' : 'pending_payment',
            daraja: darajaDemo
        });

        return res.status(201).json({
            success: true,
            message: premiumActivated 
                ? `Payment verified! Premium subscription activated for ${subscription?.subscriptionDays || 0} days.` 
                : 'Upgrade request received. Payment verification is pending.',
            data: mapRequestForResponse(savedRequest),
            paymentVerified: premiumActivated,
            premiumActivated: premiumActivated,
            subscription: subscription ? {
                id: subscription.id,
                days: subscription.subscriptionDays,
                dateFrom: subscription.dateFrom,
                dateTo: subscription.dateTo,
                status: subscription.status,
                amountPaid: subscription.amountPaid
            } : null,
            daraja: darajaDemo
        });
    } catch (error) {
        console.error('Failed to save upgrade request:', error);
        return res.status(500).json({
            success: false,
            error: 'Unable to process upgrade request at this time. Please try again later.'
        });
    }
});

function ensureAdminAccess(req, res) {
    const providedToken = req.headers['x-admin-token'] || req.query.adminToken || '';
    const expectedToken = process.env.UPGRADE_ADMIN_TOKEN;

    if (!expectedToken) {
        return null;
    }

    if (!providedToken || providedToken !== expectedToken) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized. Provide a valid admin token.'
        });
        return false;
    }

    return true;
}

router.get('/', async (req, res) => {
    const accessGranted = ensureAdminAccess(req, res);
    if (accessGranted === false) return;

    try {
        const { status, search, limit, offset } = req.query;
        const parsedLimit = Math.min(parseInt(limit || '50', 10), 200);
        const parsedOffset = parseInt(offset || '0', 10);

        const result = await dbService.getUpgradeRequests({
            status,
            search,
            limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
            offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset
        });

        return res.json({
            success: true,
            total: result.total,
            results: result.records.map(mapRequestForResponse)
        });
    } catch (error) {
        console.error('Failed to fetch upgrade requests:', error);
        return res.status(500).json({
            success: false,
            error: 'Unable to load upgrade requests at this time.'
        });
    }
});

router.get('/:id', async (req, res) => {
    const accessGranted = ensureAdminAccess(req, res);
    if (accessGranted === false) return;

    try {
        const request = await dbService.getUpgradeRequestById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Upgrade request not found.'
            });
        }

        return res.json({
            success: true,
            data: mapRequestForResponse(request)
        });
    } catch (error) {
        console.error('Failed to fetch upgrade request:', error);
        return res.status(500).json({
            success: false,
            error: 'Unable to load upgrade request at this time.'
        });
    }
});

// Get subscription status endpoint
router.get('/subscription/:email', async (req, res) => {
    try {
        const email = req.params.email;
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address.'
            });
        }

        const status = await dbService.checkSubscriptionStatus(email);
        
        return res.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('Failed to check subscription status:', error);
        return res.status(500).json({
            success: false,
            error: 'Unable to check subscription status at this time.'
        });
    }
});

module.exports = router;

