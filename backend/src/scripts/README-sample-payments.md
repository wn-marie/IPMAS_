# Sample Payment Records

This directory contains scripts to insert sample payment records for testing the upgrade/payment system.

## Option 1: Using SQL File (Recommended)

1. Connect to your PostgreSQL database:
   ```bash
   psql -U postgres -d ipmas_db
   ```

2. Run the SQL file:
   ```sql
   \i src/scripts/sample-payments.sql
   ```

   Or copy and paste the contents of `sample-payments.sql` into your PostgreSQL client.

## Option 2: Using Node.js Script

1. Make sure your `.env` file has the correct `DATABASE_URL`

2. Run the script:
   ```bash
   cd backend
   node src/scripts/insert-sample-payments.js
   ```

## Sample Payment Data

### M-Pesa Transaction Codes (for testing):
- `QL8X9K2M1N` - 50,000 KES - test1@example.com
- `AB3C4D5E6F` - 50,000 KES - test2@example.com
- `GH7I8J9K0L` - 50,000 KES - test3@example.com

### PayPal Emails (for testing):
- `paypal1@example.com` - 50,000 KES
- `paypal2@example.com` - 50,000 KES

All payments are set to:
- Status: `pending`
- Verified: `false`
- Amount: `50,000 KES`

## Testing

After inserting the sample payments:

1. Go to the upgrade page
2. Fill in the form
3. Select "M-Pesa" and enter one of the transaction codes above
4. Submit - the payment should be verified and premium activated

Or for PayPal:
1. Select "PayPal" and enter one of the PayPal emails above
2. Submit - the payment will be stored and can be verified later

