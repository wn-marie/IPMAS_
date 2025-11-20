# ML Pipeline Troubleshooting Guide

## Common Errors and Solutions

### Error: "Could not load household recode" or "Missing dependency"

**Problem**: Can't read Stata files (.DTA)

**Solution**: Install pyreadstat
```bash
pip install pyreadstat
```

### Error: "geopandas not installed"

**Problem**: Can't read shapefiles (.shp)

**Solution**: Install geopandas (optional - only needed for GPS data)
```bash
pip install geopandas
```

### Error: "Module not found" or ImportError

**Problem**: Python can't find preprocessing or visualizations modules

**Solution**: Make sure you're running from the project root:
```bash
cd C:\Users\Admin\Desktop\IPMAS2
python datasets/scripts/ml_pipeline.py
```

### Error: Pipeline hangs or takes too long

**Possible Causes**:
1. Large DHS files taking time to read
2. Memory issues with large datasets
3. Processing too many features

**Solutions**:
1. **Be patient** - Large Stata files can take 1-5 minutes to load
2. **Reduce features**: Edit `ml_pipeline.py` line 242, change `[:50]` to `[:20]`
3. **Skip preprocessing**: Already done by default (`use_preprocessed=False`)
4. **Process in chunks**: If memory issues, process datasets separately

### Error: "Out of Memory" or MemoryError

**Solutions**:
1. Close other applications
2. Reduce feature count in `create_features()` method
3. Process one dataset at a time
4. Use smaller sample size for testing

### Error: "No data available" or "Creating synthetic features"

**Problem**: Datasets not found or in wrong location

**Solution**: 
1. Verify datasets are in `datasets/raw/`:
   - `datasets/raw/dhs/`
   - `datasets/raw/faostat/`
   - `datasets/raw/knbs/`
   - `datasets/raw/worldbank/`
2. Check file names match expected patterns
3. Verify files are not corrupted

### Error: "Target variable 'poverty_index' not found"

**Problem**: No poverty index created from data

**Solution**: 
1. The pipeline will create synthetic poverty index if wealth index not found
2. Check if DHS wealth index columns exist (hv271, hv270, etc.)
3. Verify data has at least some numeric columns

### Error: Visualization errors

**Problem**: matplotlib/seaborn issues

**Solution**: Install visualization libraries
```bash
pip install matplotlib seaborn
```

Or skip visualizations - they're optional

### Pipeline runs but produces poor results

**Possible Causes**:
1. Synthetic data (no real DHS data loaded)
2. Missing key features
3. Data quality issues

**Solutions**:
1. Verify DHS data is actually loading (check console output)
2. Review feature engineering output
3. Check that wealth index or poverty indicators are present
4. Inspect `datasets/processed/ml_features.csv` to see what features were created

## Quick Fix Commands

```bash
# Install all dependencies
pip install pandas numpy scikit-learn xgboost lightgbm matplotlib seaborn pyreadstat

# Run without preprocessing
python datasets/scripts/ml_pipeline.py

# Check if files exist
python -c "from pathlib import Path; print(list(Path('datasets/raw').rglob('*')))"
```

## Getting Help

If errors persist:
1. Copy the full error message
2. Check which step failed (Step 1-7 in output)
3. Verify file paths and dependencies
4. Try running preprocessing separately: `python datasets/scripts/preprocessing.py`
