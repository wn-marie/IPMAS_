# Backend Services

Documentation for backend services and business logic.

---

## 📋 Available Services

### `povertyIndexCalculator.js`

Dynamic poverty index calculation service.

**Features:**
- Weighted indicator calculations
- Dynamic weight adjustment
- Confidence scoring
- Recommendations generation

**Usage:**
```javascript
const calculator = require('./services/povertyIndexCalculator');
const result = calculator.calculatePovertyIndex(data, selectedIndicators);
```

---

### `mlPredictor.js`

Machine learning prediction service.

**Features:**
- Python ML model integration
- LightGBM, XGBoost, Random Forest support
- Heuristic fallback
- Model status monitoring

**Usage:**
```javascript
const predictor = require('./services/mlPredictor');
const prediction = await predictor.predict(householdData, locationData);
```

**Model Location:**
```
backend/datasets/processed/models/
├── lightgbm_model.pkl
└── feature_names.txt
```

---

### `dataEnrichment.js`

Real-time data enrichment service via Socket.IO.

**Features:**
- Enriches missing indicators from nearby locations
- Caching (5-minute TTL)
- Fallback data streaming
- Subscription management

**Usage:**
```javascript
const enrichmentService = new DataEnrichmentService(io);
await enrichmentService.requestEnrichment(locationData, socketId);
await enrichmentService.streamFallbackData(locationData, socketId);
```

**Events:**
- `data-enriched` - Enrichment completed
- `fallback-data-stream` - Fallback data available
- `data-enrichment-error` - Enrichment failed

---

### `reportGenerator.js`

Report generation service.

**Features:**
- Multiple formats (PDF, HTML, JSON, XLSX)
- Custom templates
- Chart generation
- Export capabilities

**Usage:**
```javascript
const generator = require('./services/reportGenerator');
const report = await generator.generateReport(config);
```

---

### `darajaSandbox.js`

M-Pesa payment integration (Daraja API).

**Features:**
- Payment processing
- Transaction verification
- Sandbox and production support

---

### `backgroundTasks.js`

Background job processing service.

**Features:**
- Scheduled tasks
- Async processing
- Error handling
- Retry logic

---

### `redis.js`

Redis caching service (optional).

**Features:**
- Cache management
- TTL configuration
- Cache invalidation

---

## 🔄 Service Architecture

### Data Flow

```
Request → Route → Service → Database/External API → Response
```

### Error Handling

All services include:
- Try-catch error handling
- Graceful degradation
- Logging
- Error responses

---

## 📝 Service Development

### Creating New Services

1. Create file in `src/services/`
2. Export class or functions
3. Add error handling
4. Add logging
5. Document usage
6. Add tests

### Best Practices

- Single responsibility principle
- Clear function names
- Comprehensive error handling
- Logging for debugging
- Document parameters and return values

---

## 📚 Related Documentation

- **[Backend README](../README.md)** - Backend overview
- **[API Documentation](../README.md#api-documentation)** - API endpoints

---

**Last Updated**: January 2025

