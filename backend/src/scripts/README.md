# Database Scripts

Scripts for database seeding, maintenance, and data management.

---

## 📋 Available Scripts

### `enable-postgis.js`
**Purpose**: Enable PostGIS and PostGIS Topology extensions in PostgreSQL database

**Usage**:
```bash
# From project root
node backend/src/scripts/enable-postgis.js

# Or from backend directory
cd backend
node src/scripts/enable-postgis.js
```

**What it does**:
- Connects to PostgreSQL database using environment variables
- Creates PostGIS extension if not exists
- Creates PostGIS Topology extension if not exists
- Verifies installation and displays version

**When to run**:
- After creating a new database on Render
- If PostGIS extensions are missing
- As part of initial database setup

**Environment Variables Required**:
- `DATABASE_URL` OR
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**Example Output**:
```
🔌 Connecting to database...
✅ Connected to database

📦 Enabling PostGIS extension...
✅ PostGIS extension enabled
📦 Enabling PostGIS Topology extension...
✅ PostGIS Topology extension enabled

🔍 Verifying PostGIS installation...
✅ PostGIS version: 3.4.0 USE_GEOS=1 USE_PROJ=1

📋 Installed PostGIS extensions:
   - postgis: 3.4.0
   - postgis_topology: 3.4.0

✅ PostGIS setup complete!
🎉 Your database is ready for geospatial operations.
```

---

### `seed-locations.js`

Seeds the database with named locations from `frontend/public/data/sample-data.js`.

**Usage:**
```bash
cd backend
node src/scripts/seed-locations.js
```

**What it does:**
- Loads location data from sample-data.js
- Checks for existing locations (by name and county)
- Updates existing locations or inserts new ones
- Handles both PostgreSQL and mock mode

**Requirements:**
- PostgreSQL database with PostGIS enabled
- `DATABASE_URL` or `DB_*` variables in `.env`
- Sample data file at `frontend/public/data/sample-data.js`

**Output:**
```
✅ Database connection established (PostgreSQL)
🌱 Seeding locations...
✅ Inserted: Karen, Nairobi
✅ Updated: Nakuru Town, Nakuru
...
🎉 Seeding completed! 30 locations processed
```

---

### `check-real-data.js`

Checks which locations have real database data.

**Usage:**
```bash
cd backend
node src/scripts/check-real-data.js
```

**What it does:**
- Connects to database
- Lists all locations grouped by county
- Shows poverty index for each location
- Provides summary statistics

**Output:**
```
📊 Total locations in database: 1705

📍 Locations with REAL DATABASE DATA:

🏛️  Nairobi (58 locations):
   ✅ Cluster 1635 | Poverty: 5.50%
   ✅ Cluster 1636 | Poverty: 26.70%
   ...
```

---

### `update-karen-data.js`

Updates Karen's data in the database with corrected values.

**Usage:**
```bash
cd backend
node src/scripts/update-karen-data.js
```

**What it does:**
- Updates Karen, Nairobi with:
  - poverty_index: 10.5%
  - education_access: 96.5%
  - health_vulnerability: 8.2%
  - water_access: 98.2%
  - employment_rate: 94.5%
  - housing_quality: 92.3%

**Use case:**
- Correcting data for specific locations
- Template for updating other locations

---

### `insert-sample-payments.js`

Inserts sample payment records for testing.

**Usage:**
```bash
cd backend
node src/scripts/insert-sample-payments.js
```

**See also:** `README-sample-payments.md` for details.

---

## 🔧 Common Tasks

### Seed Database with Named Locations

```bash
cd backend
node src/scripts/seed-locations.js
```

### Check Database Status

```bash
cd backend
node src/scripts/check-real-data.js
```

### Update Specific Location

1. Edit `update-karen-data.js` with your location data
2. Run: `node src/scripts/update-karen-data.js`

---

## ⚠️ Troubleshooting

### Error: "Database is running in MOCK MODE"

**Solution:**
1. Check `.env` file has `DATABASE_URL` or `DB_*` variables
2. Verify PostgreSQL is running
3. Test connection: `psql -h localhost -U your_user -d ipmas_db`

### Error: "Cannot find module '../../frontend/public/data/sample-data'"

**Solution:**
- Ensure you're running from `backend/` directory
- Verify `frontend/public/data/sample-data.js` exists

### Error: "inconsistent types deduced for parameter"

**Solution:**
- Scripts use explicit type casting (`::DECIMAL`)
- Ensure PostgreSQL version supports this syntax

---

## 📝 Script Development

### Creating New Scripts

1. Use existing scripts as templates
2. Load environment variables: `require('dotenv').config()`
3. Initialize database: `await dbService.initialize()`
4. Check for mock mode: `if (!dbService.pool) { ... }`
5. Handle errors gracefully
6. Close connections: `await dbService.close()`

### Best Practices

- Always check database connection before queries
- Use explicit type casting for numeric values
- Provide clear error messages
- Log progress for long-running operations
- Handle both PostgreSQL and mock mode

---

## 📚 Related Documentation

- **[Backend README](../README.md)** - Backend overview
- **[Database Setup](../README.md#database-setup)** - Database configuration

---

**Last Updated**: January 2025

