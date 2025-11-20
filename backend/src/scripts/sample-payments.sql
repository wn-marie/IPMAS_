-- Sample Payment Records for Testing
-- Run this SQL script in your PostgreSQL database to insert 5 sample payments

-- Premium subscription: 5,000 KES = 30 days
-- Different amounts for testing subscription duration calculation

-- Sample M-Pesa Payments (3 records with different amounts)
INSERT INTO payments (
    payment_method,
    transaction_code,
    amount,
    currency,
    status,
    verified,
    contact_email,
    contact_phone,
    organization_name,
    created_at,
    updated_at
) VALUES
(
    'M-Pesa',
    'QL8X9K2M1N',
    5000.00,  -- 30 days (1 month)
    'KES',
    'pending',
    FALSE,
    'test1@example.com',
    '254712345678',
    'Sample Organization 1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'M-Pesa',
    'AB3C4D5E6F',
    10000.00,  -- 60 days (2 months)
    'KES',
    'pending',
    FALSE,
    'test2@example.com',
    '254723456789',
    'Sample Organization 2',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'M-Pesa',
    'GH7I8J9K0L',
    15000.00,  -- 90 days (3 months)
    'KES',
    'pending',
    FALSE,
    'test3@example.com',
    '254734567890',
    'Sample Organization 3',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Sample PayPal Payments (2 records with different amounts)
INSERT INTO payments (
    payment_method,
    paypal_email,
    amount,
    currency,
    status,
    verified,
    contact_email,
    contact_phone,
    organization_name,
    created_at,
    updated_at
) VALUES
(
    'PayPal',
    'paypal1@example.com',
    5000.00,  -- 30 days (1 month)
    'KES',
    'pending',
    FALSE,
    'paypal1@example.com',
    '254745678901',
    'PayPal Organization 1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'PayPal',
    'paypal2@example.com',
    20000.00,  -- 120 days (4 months)
    'KES',
    'pending',
    FALSE,
    'paypal2@example.com',
    '254756789012',
    'PayPal Organization 2',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verify the insertions
SELECT 
    id,
    payment_method,
    transaction_code,
    paypal_email,
    amount,
    status,
    verified,
    contact_email,
    organization_name,
    created_at
FROM payments
WHERE payment_method IN ('M-Pesa', 'PayPal')
ORDER BY created_at DESC
LIMIT 5;

