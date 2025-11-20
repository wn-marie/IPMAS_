# 📋 ML Pipeline Execution Order

## ✅ Correct Execution Sequence

### **Option 1: Automatic (Recommended for First Time)**

Run **only** `ml_pipeline.py` - it will do everything automatically:

```bash
python datasets/scripts/ml_pipeline.py
```

This will:
1. ✅ Load raw data
2. ✅ Create features
3. ✅ Train models (80/20 split)
4. ✅ Generate visualizations
5. ✅ Save best model

**Note**: Preprocessing is skipped by default (`use_preprocessed=False`)

---

### **Option 2: Manual Step-by-Step (Recommended if you want control)**

#### **Step 1: Run Preprocessing** ⭐ **RUN THIS FIRST**
```bash
python datasets/scripts/preprocessing.py
```

**What it does:**
- Cleans all raw datasets
- Handles missing values
- Removes outliers
- Saves cleaned data to `datasets/processed/`

**Time**: 2-5 minutes

---

#### **Step 2: Run ML Pipeline**
```bash
python datasets/scripts/ml_pipeline.py
```

Or if you want it to use the preprocessed data:
```python
# Edit ml_pipeline.py, line 736, change:
results, splits = pipeline.run_full_pipeline(use_preprocessed=True)
```

**What it does:**
- Loads cleaned data (or raw if preprocessing skipped)
- Creates features from all datasets
- Splits data 80% train / 20% test
- Trains models (Random Forest, Gradient Boosting, XGBoost, LightGBM)
- Compares model performance
- **Automatically generates visualizations**
- Saves best model

**Time**: 5-15 minutes

---

#### **Step 3: Visualizations** ⚠️ **DON'T RUN SEPARATELY**

**`visualizations.py` is automatically called by `ml_pipeline.py`** - you don't need to run it manually!

However, if you want to regenerate visualizations after training:
```python
from visualizations import ModelVisualizer

# Load your results and data first
# Then create visualizations
visualizer = ModelVisualizer()
visualizer.create_full_report(results, X_test, y_test, feature_names)
```

---

## 🎯 Recommended Workflow

### **For First Time Users:**

```bash
# Just run this one command:
python datasets/scripts/ml_pipeline.py
```

### **For Better Results (After First Run):**

```bash
# Step 1: Clean your data first
python datasets/scripts/preprocessing.py

# Step 2: Train models with cleaned data
# (Edit ml_pipeline.py line 736: use_preprocessed=True)
python datasets/scripts/ml_pipeline.py
```

---

## 📁 Output Files You'll Get

After running, you'll find:

### From Preprocessing:
- `datasets/processed/dhs_household_clean.csv`
- `datasets/processed/dhs_individual_clean.csv`
- `datasets/processed/faostat_*_clean.csv`
- `datasets/processed/knbs_*_clean.csv`

### From ML Pipeline:
- `datasets/processed/ml_features.csv` - Feature matrix
- `datasets/processed/models/*_model.pkl` - Trained models
- `datasets/processed/models/feature_names.txt` - Feature list

### From Visualizations (auto-generated):
- `datasets/processed/visualizations/model_comparison.png`
- `datasets/processed/visualizations/*_predictions_vs_actual.png`
- `datasets/processed/visualizations/*_residuals.png`
- `datasets/processed/visualizations/*_feature_importance.png`
- `datasets/processed/visualizations/*_error_by_range.png`

---

## ⚡ Quick Start (TL;DR)

**Just run this:**
```bash
python datasets/scripts/ml_pipeline.py
```

That's it! Everything else happens automatically.

---

## 🔄 When to Re-run

- **Preprocessing**: Only if you add new raw data or want to re-clean existing data
- **ML Pipeline**: Every time you want to retrain models (e.g., with new features)
- **Visualizations**: Automatically generated, no need to re-run separately

---

## ❓ FAQ

**Q: Do I need to run preprocessing first?**  
A: No, but it helps. The pipeline works with raw data too, but cleaned data gives better results.

**Q: Can I skip visualizations?**  
A: Yes, they're optional. The pipeline will skip them if matplotlib isn't installed.

**Q: How long does everything take?**  
A: Preprocessing: 2-5 min, ML Training: 5-15 min, Total: ~10-20 minutes

**Q: What if I get errors?**  
A: Check `TROUBLESHOOTING.md` for solutions to common issues.
