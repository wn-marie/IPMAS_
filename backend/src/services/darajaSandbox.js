/**
 * Daraja Sandbox Service (Demo Only)
 * Provides a lightweight wrapper around the Safaricom Daraja sandbox.
 * Falls back to simulated responses when credentials are not configured.
 */

const DEFAULT_BASE_URL = 'https://sandbox.safaricom.co.ke';

function formatTimestamp(date = new Date()) {
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
    const year = tzDate.getFullYear();
    const month = String(tzDate.getMonth() + 1).padStart(2, '0');
    const day = String(tzDate.getDate()).padStart(2, '0');
    const hours = String(tzDate.getHours()).padStart(2, '0');
    const minutes = String(tzDate.getMinutes()).padStart(2, '0');
    const seconds = String(tzDate.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

async function getAccessToken() {
    const consumerKey = process.env.DARAJA_SANDBOX_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_SANDBOX_CONSUMER_SECRET;
    const baseUrl = process.env.DARAJA_SANDBOX_BASE_URL || DEFAULT_BASE_URL;

    if (!consumerKey || !consumerSecret) {
        return null;
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${credentials}`
        }
    });

    if (!response.ok) {
        throw new Error(`Daraja token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function simulateStkPush({
    phoneNumber,
    amount = 1,
    accountReference = 'IPMAS',
    description = 'IPMAS Premium Demo'
}) {
    const baseUrl = process.env.DARAJA_SANDBOX_BASE_URL || DEFAULT_BASE_URL;
    const shortCode = process.env.DARAJA_SANDBOX_SHORTCODE;
    const passKey = process.env.DARAJA_SANDBOX_PASSKEY;
    const callbackUrl = process.env.DARAJA_SANDBOX_CALLBACK_URL || 'https://example.com/daraja/callback';

    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '').replace(/^0/, '254');

    if (!shortCode || !passKey) {
        return {
            mode: 'simulation',
            status: 'SIMULATED',
            checkoutRequestId: `SIM-${Date.now()}`,
            merchantRequestId: `SIMMER-${Date.now()}`,
            payload: {
                message: 'Daraja sandbox credentials not configured. Returning simulated response.',
                amount,
                accountReference,
                description
            }
        };
    }

    try {
        const accessToken = await getAccessToken();

        if (!accessToken) {
            return {
                mode: 'simulation',
                status: 'SIMULATED',
                checkoutRequestId: `SIM-${Date.now()}`,
                merchantRequestId: `SIMMER-${Date.now()}`,
                payload: {
                    message: 'Daraja sandbox token unavailable. Returning simulated response.',
                    amount,
                    accountReference,
                    description
                }
            };
        }

        const timestamp = formatTimestamp();
        const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

        const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                BusinessShortCode: shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: normalizedPhone,
                PartyB: shortCode,
                PhoneNumber: normalizedPhone,
                CallBackURL: callbackUrl,
                AccountReference: accountReference,
                TransactionDesc: description
            })
        });

        const payload = await response.json();

        return {
            mode: 'daraja',
            status: payload.ResponseCode === '0' ? 'REQUEST_ACCEPTED' : 'REQUEST_REJECTED',
            checkoutRequestId: payload.CheckoutRequestID || null,
            merchantRequestId: payload.MerchantRequestID || null,
            payload
        };
    } catch (error) {
        return {
            mode: 'daraja',
            status: 'ERROR',
            checkoutRequestId: null,
            merchantRequestId: null,
            payload: {
                message: 'Daraja sandbox request failed',
                error: error.message,
                amount,
                accountReference,
                description
            }
        };
    }
}

module.exports = {
    simulateStkPush
};

