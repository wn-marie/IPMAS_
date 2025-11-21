# 🌍 IPMAS - Integrated Poverty Mapping & Analysis System

[Pitch Deck](https://www.canva.com/design/DAG4hiBJ_4I/HBYqz1_TlzY2ftYP1l8hAQ/edit)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue.svg)](https://www.postgresql.org/)

**IPMAS** is a comprehensive, production-ready platform for poverty mapping, analysis, and prediction using machine learning. Built with real Kenyan household data, it provides data-driven insights to support policy decisions, resource allocation, and targeted interventions.

## 🚀 Live Demo

**Backend API**: [https://ipmas-backend.onrender.com](https://ipmas-backend.onrender.com)

- **Health Check**: [https://ipmas-backend.onrender.com/health](https://ipmas-backend.onrender.com/health)
- **API Info**: [https://ipmas-backend.onrender.com/api/info](https://ipmas-backend.onrender.com/api/info)
- **Analytics Endpoint**: [https://ipmas-backend.onrender.com/api/v1/analytics/poverty/all](https://ipmas-backend.onrender.com/api/v1/analytics/poverty/all)

---

## ⚡ Quick Start

```bash
# Install Node.js dependencies
npm run install:all

# Install Python dependencies (for ML features)
pip install -r requirements.txt

# Configure environment
cp backend/env backend/.env
# Edit backend/.env with your database credentials

# Build frontend (required before first start)
cd frontend && npm run build && cd ..

# Start the application
# Option 1: Start both (recommended for development)
npm run dev

# Option 2: Start separately
# Terminal 1: Backend
npm run start:backend

# Terminal 2: Frontend  
npm run start:frontend

# Access
# Frontend: http://localhost:3000 (or http://YOUR_IP:3000 for network access)
# Backend API: http://localhost:3001 (or http://YOUR_IP:3001 for network access)
```

> **Detailed Setup**: See [Installation Guide](#installation) below or [Backend README](backend/README.md) for database setup.

---

## 🎯 Overview

IPMAS combines interactive mapping, machine learning predictions, questionnaires, and comprehensive reporting in a single platform. The system uses real Kenyan household data (37,911 households) to provide accurate poverty analysis and predictions.

### Key Capabilities

- **Interactive Mapping**: Visualize poverty hotspots with real-time data
- **Machine Learning**: AI-powered predictions with 85% confidence
- **Questionnaire System**: Collect and analyze field data
- **Analytics Dashboard**: Real-time statistics and trend analysis
- **Report Generation**: Comprehensive reports in multiple formats
- **Real-Time Updates**: Socket.IO-powered data enrichment

---

## 🎯 Sustainable Development Goals (SDGs)

**SDG1: No Poverty** - IPMAS directly contributes to SDG1 by providing data-driven tools for poverty mapping, analysis, and prediction. The system enables policymakers, NGOs, and organizations to identify poverty hotspots, allocate resources effectively, and track progress toward poverty reduction goals.

---

## ✨ Key Features

### 🗺️ Interactive Mapping
- Real-time poverty index visualization
- Location-aware heuristics for known areas
- Smart data sourcing (heuristics → database → nearby → defaults)
- Dynamic indicator toggling and filtering

### 🤖 Machine Learning
- **Trained Models**: Random Forest, XGBoost, LightGBM
- **Data**: 37,911 real Kenyan households
- **Accuracy**: 85% confidence
- **Speed**: <0.5 seconds per prediction

### 📊 Analytics & Reporting
- Real-time statistics dashboard
- Custom report generation (PDF, HTML, JSON, XLSX)
- Historical data tracking
- Export capabilities

### 🔄 Real-Time Features
- Socket.IO-powered data enrichment
- Live score updates when new data arrives
- Fallback data streaming for missing locations

> **Note**: Final poverty score represents **POVERTY LEVEL** (low = affluent, high = poor). See [Data Source Priority](#data-source-priority) below.

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with PostGIS (1,700+ locations across 47 counties)
- **Real-time**: Socket.IO
- **ML**: Python 3.8+ with scikit-learn, XGBoost, LightGBM

### Frontend
- **Core**: Vanilla JavaScript (ES6+)
- **Mapping**: Leaflet.js
- **Charts**: Chart.js
- **Styling**: Modern CSS with CSS Variables

> **Detailed Stack**: See [Backend README](backend/README.md) and [Frontend README](frontend/README.md)

---

## 📦 Installation

### Prerequisites

- **Node.js**: >= 18.0.0
- **PostgreSQL**: >= 13.0 (with PostGIS extension)
- **Python**: >= 3.8 (for ML features)
- **npm** or **yarn**

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd IPMAS
npm run install:all
```

### Step 2: Install Python Dependencies

```bash
# Install Python dependencies for ML features
pip install -r requirements.txt

# Or if using Python 3 specifically:
pip3 install -r requirements.txt

# For virtual environment (recommended):
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

> **Note**: Python dependencies are required for machine learning predictions. See [requirements.txt](requirements.txt) for the complete list of packages.

### Step 3: Database Setup

```bash
# Create PostgreSQL database
createdb ipmas_db

# Enable PostGIS
psql ipmas_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
\q
```

### Step 4: Configure Environment

```bash
cp backend/env backend/.env
# Edit backend/.env with your database credentials
```

### Step 5: Seed Database (Optional)

```bash
cd backend
node src/scripts/seed-locations.js
```

### Step 6: Start Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

> **Detailed Setup**: See [Backend README](backend/README.md#database-setup) for complete database configuration.

---

## 🚀 Usage

### Starting the Application

```bash
npm start              # Both frontend and backend
npm run start:backend  # Backend only (port 3001)
npm run start:frontend # Frontend only (port 3000)
```

### Using the Dashboard

1. **Open Dashboard**: http://localhost:3000
2. **Explore Map**: Click locations to view poverty data
3. **Toggle Indicators**: Use layer controls to adjust calculations
4. **Generate Reports**: Create custom reports from location popups
5. **Submit Questionnaires**: Collect field data via sidebar

> **Detailed Usage**: See [Frontend README](frontend/README.md#usage) for complete feature guide.

---

## 📊 Data Source Priority

The system uses an intelligent priority system:

1. **Heuristics** → Known affluent/poor areas (Karen, Kibera, etc.)
2. **Database** → Real data from PostgreSQL (1,700+ locations across 47 counties)
3. **Nearby Locations** → Closest location within 10km
4. **Real-Time Enrichment** → Socket.IO requests missing data
5. **Fallback Stream** → Nearby location options
6. **Defaults** → Generic values (last resort)

### Poverty Score Interpretation

**Important**: Final score = **POVERTY LEVEL** (not quality of life)
- **Low (10-35%)** = Low Poverty = Affluent ✅
- **High (70-90%)** = High Poverty = Poor ⚠️

**Examples:**
- Karen (affluent): ~10-15%
- Kibera (poor): ~80-85%

> **Detailed Documentation**: See [Backend README](backend/README.md#data-source-priority) for complete data flow.

---

## 📚 Documentation

### Main Documentation
- **[Backend README](backend/README.md)** - API, services, database setup, ML integration
- **[Frontend README](frontend/README.md)** - Features, scripts, UI components
- **[Datasets README](datasets/README.md)** - Data sources, ML models, training

### Specialized Guides
- **[Backend Scripts](backend/src/scripts/README.md)** - Database seeding, data updates
- **[Backend Services](backend/src/services/README.md)** - Service architecture, data enrichment
- **[ML Documentation](datasets/scripts/README.md)** - Model training, evaluation

### Additional Resources
- **[API Reference](docs/README.md)** - Complete API documentation
- **[AI Integration](docs/ai-integration.md)** - ML model integration guide

---

## 🏗️ Project Structure

```
IPMAS/
├── backend/          # Backend API (see backend/README.md)
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # Business logic
│   │   └── scripts/  # Database scripts
├── frontend/         # Frontend app (see frontend/README.md)
│   └── public/
│       ├── scripts/  # JavaScript modules
│       └── styles/   # CSS files
├── datasets/         # ML models & data (see datasets/README.md)
└── docs/             # Additional documentation
```

> **Detailed Structure**: See [Backend README](backend/README.md#project-structure) and [Frontend README](frontend/README.md#project-structure)

---

## 🤖 Machine Learning

### Quick Info
- **Models**: Random Forest, XGBoost, LightGBM
- **Training Data**: 37,911 Kenyan households
- **Features**: 90 engineered features
- **Accuracy**: 85% confidence

### Model Location
```
datasets/processed/models/
├── lightgbm_model.pkl
└── feature_names.txt
```

> **Detailed ML Guide**: See [Datasets README](datasets/README.md) and [ML Scripts README](datasets/scripts/README.md)

---

## 🔐 Authentication & Subscription

- User registration and login
- Session management
- Subscription system (5,000 KES = 30 days)
- Payment integration (M-Pesa, PayPal, Card)
- Premium features and API access

> **Detailed Auth Guide**: See [Backend README](backend/README.md#authentication)

---

## 🧪 Testing

```bash
npm test              # All tests
npm run test:backend # Backend tests
npm run test:frontend # Frontend tests
```

---

## 🚢 Deployment

```bash
# Production build
npm run build

# Docker deployment
docker-compose up -d
```

> **Detailed Deployment**: See [Backend README](backend/README.md#deployment)

---

## 📞 Contact & Support

- **Email**: mw270761@gmail.com
- **Phone**: +254 718731762
- **Documentation**: See `/docs` directory
- **Support**: Standard response within 2 business days

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

Built with real Kenyan household data from:
- **DHS** (Demographic and Health Surveys)
- **FAOSTAT** (Food Security Indicators)
- **KNBS** (Kenya National Bureau of Statistics)
- **World Bank** (Development Indicators)

**For Kenya, by Kenya, with Kenya** 🇰🇪

---

## 🎯 Quick Links

- **[Backend Documentation](backend/README.md)** - Complete backend guide
- **[Frontend Documentation](frontend/README.md)** - Complete frontend guide
- **[ML Documentation](datasets/README.md)** - Machine learning guide
- **[API Reference](docs/README.md)** - API endpoints
- **[Pitch Deck](https://www.canva.com/design/DAG4hiBJ_4I/HBYqz1_TlzY2ftYP1l8hAQ/edit)** - Project presentation

---

**Status**: 🟢 **PRODUCTION READY**

**Version**: 1.0.0

**Last Updated**: January 2025

---

*Empowering communities through data-driven insights* ✨
