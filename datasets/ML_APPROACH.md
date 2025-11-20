# IPMAS2 Machine Learning Approach for Poverty Prediction

## 📊 Dataset Overview

You have collected comprehensive datasets from multiple sources:

### 1. **DHS (Demographic and Health Surveys)**
- **Household Recode (HR)**: `KEHR8CFL.DTA` - Household-level indicators
- **Individual Recode (PR)**: `KEPR8CFL.DTA` - Individual-level health data
- **GPS Data**: `KEGE8AFL.shp` - Geographic coordinates for survey clusters
- **Key Variables**: Wealth index, education, health, water, sanitation, housing

### 2. **FAOSTAT (Food Security)**
- Food security indicators
- Dietary energy supply
- Apparent food intake
- **Key Variables**: Food insecurity prevalence, dietary adequacy

### 3. **KNBS (Kenya Census 2019)**
- Population by county/sub-county
- Household density
- Urban/rural distribution
- **Key Variables**: Population, households, density by administrative units

### 4. **World Bank Indicators**
- Various economic and social indicators
- Time series data (1960-2024)
- **Key Variables**: Development indicators, economic metrics

---

## 🤖 Machine Learning Model Selection

### **Recommended Approach: Ensemble of Tree-Based Models**

Based on your data characteristics (tabular, mixed types, hierarchical structure), we recommend:

#### **Primary Models:**

1. **XGBoost (eXtreme Gradient Boosting)** ⭐ **RECOMMENDED**
   - ✅ Excellent for tabular data
   - ✅ Handles missing values well
   - ✅ Handles non-linear relationships
   - ✅ Provides feature importance
   - ✅ Fast training and prediction
   - ✅ Works well with mixed data types

2. **LightGBM (Light Gradient Boosting Machine)** ⭐ **RECOMMENDED**
   - ✅ Fastest training speed
   - ✅ Lower memory usage
   - ✅ Excellent for large datasets
   - ✅ Better accuracy with categorical features
   - ✅ Good for production deployment

3. **Random Forest**
   - ✅ Robust baseline
   - ✅ Less prone to overfitting
   - ✅ Easy to interpret
   - ✅ Works well out-of-the-box

4. **Gradient Boosting**
   - ✅ Good sequential learning
   - ✅ Handles complex patterns
   - ⚠️ Slower than XGBoost/LightGBM

#### **Alternative Models (if needed):**

5. **Neural Networks**
   - Use if: Large dataset after aggregation, complex non-linear patterns
   - Requires: More data, longer training time
   - Framework: TensorFlow/Keras or PyTorch

6. **Spatial Regression Models**
   - Use if: Strong geographic clustering observed
   - Models: Spatial Autoregressive (SAR), Geographically Weighted Regression (GWR)

---

## 📈 Train/Test Split: 80/20

As you requested:
- **80% Training**: Used to train models
- **20% Testing**: Used for final evaluation (unseen data)

### Why 80/20?
- Standard practice for medium to large datasets
- Provides sufficient training data while maintaining robust test set
- Good balance between model learning and validation

### Implementation:
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

---

## 🔧 Feature Engineering Strategy

### Step 1: Extract Features from Each Dataset

#### From DHS:
- Wealth index (primary target proxy)
- Education indicators (years of schooling, literacy)
- Health indicators (access to healthcare, vaccination)
- Water and sanitation (source, type)
- Housing characteristics (materials, rooms, assets)
- Household composition (size, age structure)

#### From FAOSTAT:
- Food insecurity prevalence (by county/region)
- Dietary energy supply adequacy
- Share of food expenditure
- Food price indices

#### From KNBS Census:
- Population density
- Household size
- Urban/rural classification
- Age demographics
- Education attainment (county level)

#### From World Bank:
- GDP per capita (proxy for economic development)
- Employment rates
- Education expenditure
- Health expenditure

### Step 2: Geographic Integration
- Merge all datasets by:
  - County code/name
  - Sub-county/ward (if available)
  - GPS coordinates (for point-level predictions)

### Step 3: Feature Creation
- **Aggregate** county-level indicators
- **Calculate** ratios and percentages
- **Create** interaction features (e.g., education × income)
- **Normalize** continuous variables
- **Encode** categorical variables

### Step 4: Handle Missing Data
- **Imputation**: Use median/mode for missing values
- **Indicator variables**: Mark missing data locations
- **Domain-specific**: Use dataset-specific defaults

---

## 📊 Model Evaluation Metrics

We'll evaluate models using:

1. **R² Score (Coefficient of Determination)**
   - Measures proportion of variance explained
   - Range: 0 to 1 (higher is better)
   - Target: R² > 0.7 for good model

2. **Mean Squared Error (MSE)**
   - Average squared difference
   - Lower is better
   - Sensitive to outliers

3. **Mean Absolute Error (MAE)**
   - Average absolute difference
   - Lower is better
   - More interpretable (in poverty index units)

4. **Feature Importance**
   - Which features contribute most to predictions
   - Helps identify key poverty drivers

---

## 🚀 Usage Instructions

### 1. Install Dependencies

```bash
pip install -r datasets/scripts/requirements_ml.txt
```

### 2. Run the ML Pipeline

```bash
python datasets/scripts/ml_pipeline.py
```

### 3. Pipeline Output

The pipeline will:
- ✅ Load all datasets
- ✅ Extract and combine features
- ✅ Create train/test split (80/20)
- ✅ Train multiple models
- ✅ Compare model performance
- ✅ Save the best model for deployment

### 4. Expected Output

```
🚀 IPMAS2 MACHINE LEARNING PIPELINE
======================================================================
📊 Loading DHS data...
✅ Loaded household recode: (5000, 250)
📊 Loading FAOSTAT data...
✅ Loaded food security data: (200, 15)
...
🔧 Creating features...
✅ Created feature matrix: (5000, 45)
📊 Preparing train-test split (80% train, 20% test)...
   Training set: 4000 samples, 45 features
   Test set: 1000 samples, 45 features

🤖 Training ML models...
   Training Random Forest...
      R² Score: 0.7234
   Training Gradient Boosting...
      R² Score: 0.7856
   Training XGBoost...
      R² Score: 0.8123
   Training LightGBM...
      R² Score: 0.8098

======================================================================
📊 MODEL COMPARISON RESULTS
======================================================================
Model               R² Score        MSE             MAE
----------------------------------------------------------------------
Random Forest       0.7234          245.67          12.34
Gradient Boosting   0.7856          198.45          10.23
XGBoost             0.8123          175.32          9.45
LightGBM            0.8098          178.21          9.67
======================================================================

🏆 Best Model: XGBoost (R² = 0.8123)
✅ Saved best model to datasets/processed/models/xgboost_model.pkl
✅ Pipeline completed successfully!
```

---

## 🔄 Next Steps

### After Initial Training:

1. **Feature Selection**
   - Remove low-importance features
   - Focus on high-impact indicators

2. **Hyperparameter Tuning**
   - Use GridSearchCV or RandomizedSearchCV
   - Optimize model parameters for best performance

3. **Cross-Validation**
   - Use k-fold cross-validation (k=5 or k=10)
   - Ensure model generalizes well

4. **Model Interpretation**
   - Analyze feature importance
   - Identify key poverty drivers
   - Create visualizations

5. **Production Integration**
   - Deploy model to backend API
   - Create prediction endpoints
   - Update frontend to use ML predictions

---

## 📝 Model Performance Expectations

### Realistic Targets:

- **R² Score**: 0.65 - 0.85
  - 0.65-0.70: Fair (acceptable for complex social data)
  - 0.70-0.80: Good (strong predictive power)
  - 0.80+: Excellent (may indicate overfitting, validate carefully)

- **MAE**: 5-15 points on poverty index scale (0-100)
  - Depends on data quality and feature completeness
  - Lower is better

### Factors Affecting Performance:

- ✅ **Data Quality**: Complete, accurate datasets
- ✅ **Feature Engineering**: Well-chosen, meaningful features
- ✅ **Data Size**: More samples = better generalization
- ✅ **Target Definition**: Clear, consistent poverty measure

---

## 🎯 Why Tree-Based Models?

### Advantages for Poverty Prediction:

1. **Handles Mixed Data Types**
   - Numeric (income, age)
   - Categorical (region, education level)
   - Binary (water access, sanitation)

2. **Non-Linear Relationships**
   - Poverty has complex, non-linear drivers
   - Tree models capture interactions naturally

3. **Missing Value Handling**
   - XGBoost/LightGBM handle missing values
   - No need for extensive imputation

4. **Feature Importance**
   - Understand what drives poverty
   - Policy insights

5. **Fast Prediction**
   - Real-time predictions possible
   - Efficient for production use

6. **Interpretability**
   - Random Forest: Feature importance
   - XGBoost: SHAP values available

---

## 📚 References

- XGBoost: https://xgboost.readthedocs.io/
- LightGBM: https://lightgbm.readthedocs.io/
- Scikit-learn: https://scikit-learn.org/
- DHS Data Guide: https://dhsprogram.com/

---

## ❓ Questions?

For issues or questions:
1. Check dataset structure matches expected format
2. Verify all dependencies are installed
3. Review error messages in pipeline output
4. Check data quality and completeness
