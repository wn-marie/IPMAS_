# 🚀 START HERE - Quick Guide

## ✅ Simplest Way (Recommended)

**Just run this one command:**

```bash
python datasets/scripts/ml_pipeline.py
```

That's it! This will:
- ✅ Load all your datasets
- ✅ Create features automatically
- ✅ Train models with 80/20 split
- ✅ Generate visualizations
- ✅ Save the best model

**Time**: ~10-20 minutes depending on data size

---

## 📋 Step-by-Step (If You Want More Control)

### **1️⃣ First: Clean Your Data (Optional but Recommended)**

```bash
python datasets/scripts/preprocessing.py
```

This cleans your raw datasets and saves them to `datasets/processed/`

**Time**: 2-5 minutes

---

### **2️⃣ Then: Train Models**

```bash
python datasets/scripts/ml_pipeline.py
```

**If you ran preprocessing**, edit `ml_pipeline.py` line 736:
```python
# Change this:
results, splits = pipeline.run_full_pipeline(use_preprocessed=False)

# To this:
results, splits = pipeline.run_full_pipeline(use_preprocessed=True)
```

This trains all models and saves the best one.

**Time**: 5-15 minutes

---

### **3️⃣ Visualizations: DON'T RUN MANUALLY**

Visualizations are **automatically generated** by `ml_pipeline.py` - no need to run `visualizations.py` separately!

Check `datasets/processed/visualizations/` after training completes.

---

## 🎯 Summary

**For beginners**: Run `ml_pipeline.py` only  
**For better results**: Run `preprocessing.py` first, then `ml_pipeline.py` with `use_preprocessed=True`  
**Visualizations**: Auto-generated, don't run separately

---

## 📂 Check Your Results

After running, check:
- Models: `datasets/processed/models/`
- Visualizations: `datasets/processed/visualizations/`
- Features: `datasets/processed/ml_features.csv`

---

## ❓ Having Issues?

See `TROUBLESHOOTING.md` for common problems and solutions.
