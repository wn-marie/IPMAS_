# Backend Documentation

Complete guide to the IPMAS backend API, services, database setup, and configuration.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Services](#services)
- [Real-Time Features](#real-time-features)
- [Data Source Priority](#data-source-priority)
- [Machine Learning Integration](#machine-learning-integration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)

---

## 🎯 Overview

The IPMAS backend is a Node.js/Express.js REST API that provides:
- Geospatial data management (PostgreSQL + PostGIS)
- Machine learning predictions (Python integration)
- Real-time data enrichment (Socket.IO)
- User authentication and subscriptions
- Report generation
- Questionnaire processing

---

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13.0 (with PostGIS extension)
- Python >= 3.8 (for ML features)
- Redis >= 6.0 (optional, for caching)

### Install Dependencies

```bash
cd backend
npm install
```

---

## ⚙️ Configuration

### Environment Variables

Create `backend/.env` from `backend/env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ipmas_db
DB_USER=ipmas_user
DB_PASSWORD=your_password
# Or use DATABASE_URL
DATABASE_URL=postgresql://user:password@localhost:5432/ipmas_db

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security Configuration
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:3000

# API Configuration
API_VERSION=v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# External Services
MAPBOX_API_KEY=your_mapbox_key_here
OPENSTREETMAP_API_URL=https://api.openstreetmap.org
```

---

## 🗄️ Database Setup

### Step 1: Create Database

```bash
createdb ipmas_db
```

### Step 2: Enable PostGIS

```bash
psql ipmas_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
\q
```

### Step 3: Initialize Schema

Tables are automatically created on first run. The schema includes:
- `geospatial_data` - Location data with PostGIS geometry
- `users` - User accounts
- `sessions` - User sessions
- `subscriptions` - Subscription records
- `payments` - Payment transactions
- `reports` - Generated reports

### Step 4: Seed Location Data

```bash
node src/scripts/seed-locations.js
```

This adds named locations (Karen, Nakuru Town, etc.) to your database.

**Note**: Your database may already contain 1,700+ cluster locations (DHS data) across Kenya's 47 counties. The seeding script adds named locations for easier searching.

### Check Database Status

```bash
node src/scripts/check-real-data.js
```

Shows all locations in your database with real poverty data.

---

## 📚 API Documentation

### Base URL

```
http://localhost:3001/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "John Doe",
  "organizationName": "Organization Name"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Verify Session
```http
GET /api/v1/auth/session
Authorization: Bearer <session_token>
```

### Location Endpoints

#### Search Locations
```http
GET /api/v1/location/search?query=Karen
```

#### Get Location by Coordinates
```http
GET /api/v1/location/:lat/:lng
```

#### Get Nearby Locations
```http
GET /api/v1/location/radius/:lat/:lng?radius=10&limit=50
```

### Analytics Endpoints

#### ML Prediction
```http
POST /api/v1/analytics/ml-predict
Content-Type: application/json

{
  "householdData": {
    "hv271": 50000,
    "hv009": 5,
    "hv012": 2,
    "hv013": 2
  }
}
```

#### ML Status
```http
GET /api/v1/analytics/ml-status
```

#### ML Smoke Test
```http
POST /api/v1/analytics/ml-smoke
Content-Type: application/json

{
  "householdData": {
    "hv271": 500,
    "hv009": 5,
    "education_years": 7,
    "water_access": 70,
    "electricity": 1
  }
}
```

### Questionnaire Endpoints

#### Process Questionnaire
```http
POST /api/v1/questionnaire/process
Content-Type: application/json

{
  "location_name": "Kasarani",
  "responses": {
    "water_source": "piped_water",
    "sanitation": "flush_toilet",
    "housing": "permanent"
  }
}
```

### Unified Data Endpoints

#### Get Unified Location Data
```http
GET /api/v1/unified-data/location/:lat/:lng?includePredictions=true&includeHistory=true
```

**Note**: Returns 404 if location not found (expected behavior). Frontend automatically falls back to nearby locations.

### Report Endpoints

#### Generate Report
```http
POST /api/v1/reports/generate
Content-Type: application/json

{
  "type": "Comprehensive",
  "format": "pdf",
  "location": "Kasarani",
  "filters": {}
}
```

### Subscription Endpoints

#### Create Payment
```http
POST /api/v1/upgrade
Content-Type: application/json

{
  "email": "user@example.com",
  "subscriptionAmount": 5000,
  "paymentMethod": "mpesa",
  "mpesaTransactionCode": "ABC123XYZ"
}
```

### Health & Status

#### Health Check
```http
GET /health
```

#### System Status
```http
GET /status
```

---

## 🔧 Services

### Core Services

- **`povertyIndexCalculator.js`** - Dynamic poverty index calculations
- **`mlPredictor.js`** - Machine learning predictions
- **`dataEnrichment.js`** - Real-time data enrichment via Socket.IO
- **`reportGenerator.js`** - Report generation (PDF, HTML, JSON, XLSX)
- **`darajaSandbox.js`** - M-Pesa payment integration
- **`backgroundTasks.js`** - Background job processing
- **`redis.js`** - Redis caching (optional)

> **Detailed Service Documentation**: See [Services README](src/services/README.md)

---

## 🔄 Real-Time Features

### Socket.IO Integration

The backend includes Socket.IO for real-time data updates:

#### Events Emitted

- `poverty-data-updated` - When location data is updated
- `data-enriched` - When data enrichment completes
- `fallback-data-stream` - Streams nearby location options
- `data-enrichment-error` - Enrichment errors
- `fallback-data-error` - Fallback errors

#### Events Received

- `poverty-data-update` - Client updates location data
- `subscribe-poverty-updates` - Subscribe to location updates
- `unsubscribe-poverty-updates` - Unsubscribe from updates
- `request-data-enrichment` - Request data enrichment
- `subscribe-location-enrichment` - Subscribe to location enrichment
- `request-fallback-data` - Request fallback data stream

### Data Enrichment Service

The `DataEnrichmentService` provides:
- **Automatic Enrichment**: Fills missing indicators from nearby locations
- **Caching**: 5-minute TTL for enrichment results
- **Fallback Streaming**: Streams nearby location options
- **Subscription Management**: Clients can subscribe to location updates

---

## 📊 Data Source Priority

The system uses an intelligent priority system for location data:

1. **Heuristics** (Known Areas): Well-known affluent/poor areas use predefined accurate data
2. **Database** (Real Data): Exact or partial name matches from PostgreSQL
3. **Nearby Locations**: Closest location within 10km radius
4. **Real-Time Enrichment**: Socket.IO requests missing data
5. **Fallback Data Stream**: Streams nearby location options
6. **Defaults**: Generic values (last resort)

### Poverty Score Interpretation

**Important**: Final score = **POVERTY LEVEL** (not quality of life)
- **Low (10-35%)** = Low Poverty = Affluent ✅
- **High (70-90%)** = High Poverty = Poor ⚠️

**Examples:**
- Karen (affluent): ~10-15%
- Kibera (poor): ~80-85%

---

## 🤖 Machine Learning Integration

### Model Location

Place trained models at:
```
backend/datasets/processed/models/
├── lightgbm_model.pkl
└── feature_names.txt
```

### ML Status Endpoint

Check ML model status:
```bash
curl http://localhost:3001/api/v1/analytics/ml-status
```

### ML Smoke Test

Test ML predictions:
```bash
curl -X POST http://localhost:3001/api/v1/analytics/ml-smoke \
  -H "Content-Type: application/json" \
  -d '{"householdData":{"hv271":500,"hv009":5}}'
```

> **Detailed ML Guide**: See [Datasets README](../datasets/README.md) and [ML Scripts README](../datasets/scripts/README.md)

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.js              # Main application entry
│   ├── config/
│   │   └── postgis.js      # Database configuration
│   ├── routes/             # API routes
│   │   ├── auth.js
│   │   ├── analytics.js
│   │   ├── location.js
│   │   ├── questionnaire.js
│   │   └── ...
│   ├── services/           # Business logic
│   │   ├── povertyIndexCalculator.js
│   │   ├── mlPredictor.js
│   │   ├── dataEnrichment.js
│   │   └── ...
│   ├── middleware/         # Custom middleware
│   │   ├── security.js
│   │   ├── performance.js
│   │   └── memoryMonitor.js
│   ├── scripts/            # Database scripts
│   │   ├── seed-locations.js
│   │   ├── check-real-data.js
│   │   └── ...
│   └── utils/              # Utility functions
├── datasets/               # ML models
│   └── processed/
│       └── models/
├── tests/                  # Backend tests
└── package.json
```

---

## 💻 Development

### Start Development Server

```bash
npm run dev
# Or
npm start
```

### Run Tests

```bash
npm test
```

### Code Style

```bash
npm run lint
npm run lint:fix
```

---

## 🚢 Deployment

### Production Build

```bash
NODE_ENV=production npm start
```

### Docker Deployment

```bash
docker-compose up -d
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Enable HTTPS
5. Configure CORS for production domain
6. Set up monitoring and logging

### Performance Optimization

- Enable Redis caching
- Use CDN for static assets
- Enable compression
- Optimize database queries
- Monitor memory usage

---

## 📝 Additional Resources

- **[Database Scripts](src/scripts/README.md)** - Database seeding and maintenance
- **[Services Documentation](src/services/README.md)** - Service architecture
- **[Main README](../README.md)** - Project overview

---

**Last Updated**: January 2025

