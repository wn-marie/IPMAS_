/**
 * Script to insert sample payment records for testing
 * Run with: node src/scripts/insert-sample-payments.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:your_password_here@localhost:5432/ipmas_db'
});

// Premium subscription: 5,000 KES = 30 days base
// Different amounts for testing subscription duration calculation

const samplePayments = [
    {
        payment_method: 'M-Pesa',
        transaction_code: 'QL8X9K2M1N',
        amount: 5000.00,  // 30 days (1 month)
        currency: 'KES',
        status: 'pending',
        verified: false,
        contact_email: 'test1@example.com',
        contact_phone: '254712345678',
        organization_name: 'Sample Organization 1'
    },
    {
        payment_method: 'M-Pesa',
        transaction_code: 'AB3C4D5E6F',
        amount: 10000.00,  // 60 days (2 months)
        currency: 'KES',
        status: 'pending',
        verified: false,
        contact_email: 'test2@example.com',
        contact_phone: '254723456789',
        organization_name: 'Sample Organization 2'
    },
    {
        payment_method: 'M-Pesa',
        transaction_code: 'GH7I8J9K0L',
        amount: 15000.00,  // 90 days (3 months)
        currency: 'KES',
        status: 'pending',
        verified: false,
        contact_email: 'test3@example.com',
        contact_phone: '254734567890',
        organization_name: 'Sample Organization 3'
    },
    {
        payment_method: 'PayPal',
        paypal_email: 'paypal1@example.com',
        amount: 5000.00,  // 30 days (1 month)
        currency: 'KES',
        status: 'pending',
        verified: false,
        contact_email: 'paypal1@example.com',
        contact_phone: '254745678901',
        organization_name: 'PayPal Organization 1'
    },
    {
        payment_method: 'PayPal',
        paypal_email: 'paypal2@example.com',
        amount: 20000.00,  // 120 days (4 months)
        currency: 'KES',
        status: 'pending',
        verified: false,
        contact_email: 'paypal2@example.com',
        contact_phone: '254756789012',
        organization_name: 'PayPal Organization 2'
    }
];

async function insertSamplePayments() {
    try {
        console.log('Connecting to database...');
        
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Check if payments table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'payments'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Payments table does not exist. Please run the backend server first to create tables.');
            process.exit(1);
        }

        console.log(`\nInserting ${samplePayments.length} sample payment records...\n`);

        for (const payment of samplePayments) {
            const insertQuery = `
                INSERT INTO payments (
                    payment_method,
                    transaction_code,
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
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING
                RETURNING id, transaction_code, paypal_email, amount
            `;

            const values = [
                payment.payment_method,
                payment.transaction_code || null,
                payment.paypal_email || null,
                payment.amount,
                payment.currency,
                payment.status,
                payment.verified,
                payment.contact_email,
                payment.contact_phone,
                payment.organization_name
            ];

            try {
                const result = await pool.query(insertQuery, values);
                if (result.rows.length > 0) {
                    const inserted = result.rows[0];
                    const identifier = inserted.transaction_code || inserted.paypal_email;
                    console.log(`✅ Inserted payment: ${payment.payment_method} - ${identifier} (ID: ${inserted.id})`);
                } else {
                    console.log(`⚠️ Payment already exists: ${payment.payment_method} - ${payment.transaction_code || payment.paypal_email}`);
                }
            } catch (error) {
                console.error(`❌ Error inserting payment ${payment.transaction_code || payment.paypal_email}:`, error.message);
            }
        }

        console.log('\n✅ Sample payments inserted successfully!');
        console.log('\nSample M-Pesa Transaction Codes:');
        console.log('  - QL8X9K2M1N (5,000 KES = 30 days)');
        console.log('  - AB3C4D5E6F (10,000 KES = 60 days)');
        console.log('  - GH7I8J9K0L (15,000 KES = 90 days)');
        console.log('\nSample PayPal Emails:');
        console.log('  - paypal1@example.com (5,000 KES = 30 days)');
        console.log('  - paypal2@example.com (20,000 KES = 120 days)');
        console.log('\nNote: Subscription duration is calculated as: (Amount Paid / 5,000) × 30 days');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\n⚠️ Could not connect to database. Please check:');
            console.error('  1. PostgreSQL is running');
            console.error('  2. DATABASE_URL in .env file is correct');
            console.error('  3. Database credentials are valid');
        }
    } finally {
        await pool.end();
    }
}

// Run the script
insertSamplePayments();

