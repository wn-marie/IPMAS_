# Data Processing Scripts

This directory contains scripts for processing and importing datasets into PostgreSQL.

## 📁 Script Categories

### Cleaning Scripts (`clean/`)
Scripts that clean and validate raw data:
- Remove duplicates
- Handle missing values
- Validate data types
- Standardize formats

### Transformation Scripts (`transform/`)
Scripts that transform cleaned data:
- Format conversions
- Geocoding
- Calculations
- Aggregations

### Import Scripts (`import/`)
Scripts that import processed data into PostgreSQL:
- CSV to PostgreSQL
- Batch inserts
- Relationship creation
- Index creation

## 🔄 Processing Pipeline

```
Raw Data → Clean → Transform → Import → Database
```

## 🚀 Example Usage

```bash
# Clean DHS data
node scripts/clean/clean_dhs_household.js

# Transform data
node scripts/transform/transform_indicators.js

# Import to PostgreSQL
node scripts/import/import_poverty_indicators.js
```

## 📝 Script Template

When creating new scripts, follow this template:

```javascript
/**
 * Script Name
 * Description of what the script does
 * 
 * Usage: node scripts/[category]/script_name.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_PATH = path.join(__dirname, '../../processed/...');
const OUTPUT_PATH = path.join(__dirname, '../../processed/...');

// Main processing function
async function processData() {
    try {
        // Read input
        // Process data
        // Write output
        console.log('✅ Processing complete');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    processData();
}

module.exports = { processData };
```

## 📚 Database Connection

Scripts will use the database configuration from:
`../../backend/src/config/postgis.js`

Ensure your database is configured before running import scripts.

