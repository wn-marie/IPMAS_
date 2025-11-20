# Frontend Documentation

Complete guide to the IPMAS frontend application, features, scripts, and UI components.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Features](#features)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Usage](#usage)
- [Configuration](#configuration)
- [Development](#development)

---

## 🎯 Overview

The IPMAS frontend is a single-page application built with vanilla JavaScript, providing:
- Interactive mapping with Leaflet.js
- Real-time poverty visualization
- Dynamic indicator toggling
- Questionnaire system
- Report generation
- User authentication and subscriptions
- Real-time data updates via Socket.IO

---

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Install Dependencies

```bash
cd frontend
npm install
```

---

## ✨ Features

### 🗺️ Interactive Mapping

- **Real-time Visualization**: Poverty index displayed on map markers
- **Location Search**: Search by name or coordinates
- **Layer Controls**: Toggle indicators (Poverty Index, Education, Health, Water, Housing)
- **Dynamic Calculation**: Recalculates scores based on active indicators
- **Location Popups**: Detailed information with calculation breakdown

### 📊 Dashboard

- **Statistics Panel**: Real-time statistics and trends
- **Chart Visualizations**: Chart.js-powered charts
- **Filter Controls**: Filter by county, severity, indicators
- **Export Capabilities**: Export data in multiple formats

### 📝 Questionnaire System

- **Dynamic Forms**: Collect field data
- **Poverty Calculation**: Instant poverty index calculation
- **Recommendations**: AI-powered recommendations
- **Confidence Scoring**: Calculation confidence levels

### 📄 Report Generation

- **Multiple Formats**: PDF, HTML, JSON, XLSX
- **Custom Reports**: Generate from location popups
- **Global Reports**: Organization-wide report management
- **Scheduled Reports**: Schedule future report generation

### 👤 User Management

- **Authentication**: Register/login system
- **Settings**: User preferences and account management
- **Subscriptions**: Manage subscriptions and payments
- **Usage Tracking**: Track trial usage and limits

### 🔄 Real-Time Updates

- **Socket.IO Integration**: Real-time data updates
- **Data Enrichment**: Automatic data enrichment for missing indicators
- **Live Score Updates**: Scores refresh when new data arrives
- **Connection Status**: Monitor Socket.IO connection

---

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html              # Main dashboard
│   ├── area-report.html        # Detailed reports
│   ├── settings.html           # User settings
│   ├── upgrade.html            # Subscription page
│   ├── global-reports.html     # Global reports
│   ├── poverty-models.html     # Poverty models demo
│   ├── scripts/                # JavaScript modules
│   │   ├── main.js             # Main application logic
│   │   ├── poverty-map.js      # Map functionality
│   │   ├── dynamic-poverty-calculator.js  # Poverty calculations
│   │   ├── location-heuristics.js         # Location heuristics
│   │   ├── questionnaire.js    # Questionnaire system
│   │   ├── subscription.js     # User management
│   │   ├── global-reports.js   # Report generation
│   │   └── ...
│   ├── styles/                 # CSS files
│   │   ├── main.css            # Main styles
│   │   ├── area-report.css     # Report styles
│   │   └── upgrade-admin.css   # Admin styles
│   └── data/                   # Sample data
│       ├── sample-data.js
│       └── sample-data-enhanced.js
├── src/                        # Source files (if using build system)
└── package.json
```

---

## 📜 Scripts

### Core Scripts

- **`main.js`** - Main application logic, Socket.IO integration, dashboard initialization
- **`poverty-map.js`** - Map rendering, marker management, location search
- **`dynamic-poverty-calculator.js`** - Dynamic poverty index calculations with indicator weighting
- **`location-heuristics.js`** - Location-aware heuristics for known affluent/poor areas

### Feature Scripts

- **`questionnaire.js`** - Questionnaire form handling and processing
- **`subscription.js`** - User authentication and subscription management
- **`global-reports.js`** - Report generation and management
- **`data-export.js`** - Data export functionality
- **`settings.js`** - User settings and preferences
- **`usage-tracker.js`** - Trial usage tracking and limits

### UI Scripts

- **`theme-manager.js`** - Theme management (dark mode, colors)
- **`notifications.js`** - Notification system
- **`sharing.js`** - Share functionality
- **`dashboard-customization.js`** - Dashboard customization

---

## 🚀 Usage

### Starting the Frontend

```bash
cd frontend
npm start
# Or from root
npm run start:frontend
```

Access at: http://localhost:3000

### Using the Dashboard

1. **Open Dashboard**: Navigate to http://localhost:3000
2. **Explore Map**: Click on locations to view poverty data
3. **Toggle Indicators**: Use layer controls to adjust calculations
4. **Search Locations**: Use search bar to find specific locations
5. **Generate Reports**: Click "View Full Detailed Report" in location popup
6. **Submit Questionnaire**: Use sidebar to collect field data

### Global Reports

Access at `/global-reports.html`:

- **Report Configuration**: Select type, format, location, filters
- **Report History**: View recently generated reports
- **Scheduled Reports**: Schedule future report generation
- **Report Statistics**: View usage statistics
- **Report Analytics**: Charts and trends

### Poverty Models

Access at `/poverty-models.html`:

- **Small-Area Estimation (SAE)**: Bayesian estimation
- **Consumption-Based Estimation**: Based on consumption patterns
- **Multidimensional Poverty Index (MPI)**: Multi-dimensional analysis
- **Predictive Models**: ML-based predictions
- **Model Comparison**: Compare different models

### User Settings

Access at `/settings.html`:

- **User Profile**: Name, email, organization
- **Account Security**: Password, data governance
- **Notifications**: Email, SMS alerts
- **System Preferences**: Language, timezone, theme
- **Connection Status**: Socket.IO connection monitoring
- **API Access**: API key management

---

## ⚙️ Configuration

### API Configuration

Edit `public/scripts/config.js`:

```javascript
window.API_CONFIG = {
    BASE_URL: 'http://localhost:3001',
    SOCKET_URL: 'http://localhost:3001',
    VERSION: 'v1',
    ENDPOINTS: {
        ANALYTICS: '/api/v1/analytics',
        LOCATION: '/api/v1/location',
        REPORTS: '/api/v1/reports',
        QUESTIONNAIRE: '/api/v1/questionnaire',
        FEEDBACK: '/api/v1/feedback',
        UNIFIED_DATA: '/api/v1/unified-data'
    },
    getApiUrl: function(endpoint) {
        return `${this.BASE_URL}${endpoint}`;
    },
    getSocketUrl: function() {
        return this.SOCKET_URL;
    }
};
```

---

## 🔄 Real-Time Features

### Socket.IO Integration

The frontend automatically connects to Socket.IO on load:

```javascript
// Connection status in browser console
✅ Socket.IO connected successfully
   Socket ID: <socket-id>
   Server URL: http://localhost:3001
```

### Data Enrichment

When data is incomplete, the system automatically:
1. Requests enrichment via Socket.IO
2. Receives enriched data
3. Updates location popup
4. Recalculates scores

### Fallback Data Streaming

When direct data is unavailable:
1. Requests fallback data stream
2. Receives nearby location options
3. Displays options to user
4. Uses selected option for calculation

---

## 📊 Data Source Priority

The frontend follows this priority for location data:

1. **Heuristics** → Known affluent/poor areas (Karen, Kibera, etc.)
2. **Database** → Real data from API (exact/partial name match)
3. **Nearby Locations** → Closest location within 10km
4. **Real-Time Enrichment** → Socket.IO requests missing data
5. **Fallback Stream** → Nearby location options
6. **Defaults** → Generic values (last resort)

### Checking Data Source

In browser console, look for:
```
✅ Using real data from API: {source: "exact_name_match"}
📊 Data source: exact_name_match
```

Or in UI popup:
- **No badge** = Real database data
- **"NEARBY (X km)" badge** = Nearby location data
- **"ESTIMATED" badge** = Defaults or heuristics

---

## 💻 Development

### Development Mode

```bash
npm run dev
```

### Code Style

Follow existing code style:
- ES6+ JavaScript
- Modular architecture
- Clear function names
- Comprehensive comments

### Adding New Features

1. Create feature branch
2. Add script to `public/scripts/`
3. Include script in HTML
4. Test thoroughly
5. Update documentation

---

## 🧪 Testing

### Manual Testing

1. Open browser DevTools (F12)
2. Check console for errors
3. Test all features
4. Verify Socket.IO connection
5. Test data enrichment

### Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari

---

## 📝 Additional Resources

- **[Main README](../README.md)** - Project overview
- **[Backend README](../backend/README.md)** - Backend API documentation

---

**Last Updated**: January 2025

