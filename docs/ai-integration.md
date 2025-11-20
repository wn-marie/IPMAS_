## AI Integration in IPMAS

IPMAS (Integrated Poverty Mapping & Analysis System) embeds several AI and machine-learning driven capabilities to deliver insight-rich workflows for analysts. This note summarises where and how those features plug into the product.

### 1. Dynamic Poverty Scoring
- **Component:** `frontend/public/scripts/dynamic-poverty-calculator.js`
- **What it does:** Calculates a poverty index for any location on demand, using a weighted-sum model that adapts to the user’s active data layers (poverty, education, health, water, housing).
- **How it works:** Each indicator carries a dynamic weight; the calculator normalises the active weights and produces:
  - `poverty_index` – the final AI score.
  - `breakdown` – contribution of every indicator (including inverted health risk).
  - `confidence` – the more indicators selected, the higher the confidence.
- **Explainability:** Generates top-contributor attribution, narrative highlights, and “what-if” scenarios (priority improvements vs. regression risks) that surface directly inside the calculation breakdown modal.
- **Why it matters:** Analysts can instantly see how toggling indicators shifts poverty outcomes and audit the calculation via the generated breakdown.

### 2. Machine-Learning Predictions
- **Endpoint:** `GET/POST /api/v1/analytics/ml-predict`
- **Front-end hooks:** 
  - Dashboard search (`frontend/public/index.html`) automatically calls the ML endpoint when a user selects a location.
  - Poverty map (`frontend/public/scripts/poverty-map.js`) exposes a “🤖 Get ML Prediction” button in each location popup.
- **What it returns:** Predicted poverty index, confidence level, and model metadata; results are displayed in map popups and cached for overlays.
- **Fallback logic:** When the API fails, the UI falls back to heuristic estimates and communicates the error state.

### 3. Analytical Insight Engine
- **Location:** `generatePredictions`, `generateTrendAnalysis`, `generateRecommendations`, and related helpers inside `frontend/public/scripts/main.js`.
- **Purpose:** Simulates AI-assisted insights (trend projections, severity forecasts, recommended interventions, regional comparisons) to populate dashboard charts.
- **Usage:** Triggered via the “AI-Powered Insights” controls on the dashboard. Each mode updates charts with algorithmically generated datasets and in some cases drives downstream widgets (e.g., intervention success estimates).

### 4. AI in Area Reports & Dashboards
- **Dynamic reports:** `frontend/public/scripts/area-report.js` reuses the `DynamicPovertyCalculator` to compute poverty indices per area, merge them with ML predictions, and surface layered breakdowns inside the “Calculation Breakdown” modal.
- **Dashboard stats:** `frontend/public/scripts/main.js` keeps a deterministic model for demo data, but when real datasets are present (`processedLocations`), averages, hotspots, and overlays flow directly from AI outputs.
- **ML validation:** Predictions are compared against known indicators and recorded for later visualisation; mismatches are highlighted in UI messaging.

### 5. User Workflow Touchpoints
- **Search & focus:** Selecting a search result auto-generates an ML prediction, ensuring every ad-hoc lookup comes with intelligent context.
- **Map overlays:** ML results are saved to dedicated layers so teams can visualise predicted hotspots and compare them with ground-truth metrics.
- **Breakdown modal:** When users inspect a location, the AI-generated breakdown explains the contribution of each active indicator, aiding transparency and trust.

### 6. Extensibility
- **Architecture:** All AI hooks live behind well-defined interfaces (`DynamicPovertyCalculator`, ML endpoint helpers). This separation allows the backend model to evolve (new indicators, re-trained ML models) without breaking UI contracts.
- **Opt-in controls:** Analysts can toggle indicators, refresh predictions, or compare timeframes, making the AI features interactive rather than static outputs.

### 7. Enhancement Roadmap for AI-Powered Insights
- **Explainability modes:** Extend the existing breakdown modal with richer attribution layers (e.g., SHAP-style factor contributions) and counterfactual narratives so analysts understand why poverty scores change under different indicator mixes.
- **Confidence diagnostics:** Pair the current confidence output with supporting metadata—model drift checks, sampling density, and indicator completeness—and surface the diagnostics via UI badges to flag low-trust predictions.
- **Temporal intelligence:** Enhance `generateTrendAnalysis` to include anomaly detection, forecast bands, and interactive “what-if” sliders that let users stress-test interventions or climate impacts before implementation.
- **Cohort and equity insights:** Introduce segmentation controls that compare predictions across demographic cohorts, highlighting disparity alerts when vulnerable groups diverge significantly from baselines.
- **Human feedback loop:** Add a field feedback mechanism within the “AI-Powered Insights” panel so practitioners can submit ground-truth corrections, feeding a pipeline for heuristic updates or model retraining.
- **Insight automation:** Build a narrative generator that synthesises hotspots, emerging risks, and recommended interventions into policy-ready briefs using outputs from `generateRecommendations` plus external benchmarks.
- **Cross-model comparison:** Allow analysts to juxtapose heuristic, ML, and ensemble outputs (including residual plots and disagreement markers) to validate trust before operational deployment.
- **Alerting & collaboration:** Provide subscription-based alerts for threshold breaches and integrate notifications with collaboration tools (email, Teams) so teams can respond quickly with AI-backed context.

---

**Key Takeaway:** IPMAS weaves AI throughout the analysis journey—from dynamic poverty computation through predictive modelling to actionable dashboard insights—while keeping calculations transparent and controllable by the end user. This seamless integration empowers organisations to move from raw data to policy-ready intelligence with minimal friction.

