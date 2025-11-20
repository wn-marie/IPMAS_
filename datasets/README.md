# IPMAS Datasets Directory

This directory contains all datasets for the IPMAS system.

## 📁 Directory Structure

```
datasets/
├── raw/                    # Original, unprocessed datasets
│   ├── dhs/               # DHS (Demographic and Health Surveys) data
│   ├── faostat/           # FAOSTAT food security data
│   ├── worldbank/         # World Bank data
│   ├── knbs/              # Kenya National Bureau of Statistics data
│   └── other/             # Other datasets (OpenStreetMap, satellite, etc.)
│
├── processed/             # Cleaned and transformed data ready for import
│   ├── households/        # Processed household data
│   ├── indicators/        # Processed poverty indicators
│   ├── food_security/    # Processed food security data
│   └── geographic/       # Processed geographic/GPS data
│
├── scripts/              # Data processing and import scripts
│   ├── clean/            # Data cleaning scripts
│   ├── transform/        # Data transformation scripts
│   └── import/           # Database import scripts
│
├── imported/             # Successfully imported data (backup copies)
│
├── backup/               # Manual backups
│
└── README.md            # This file
```

## 📊 Dataset Types

### Primary Datasets

1. **DHS Data** (`raw/dhs/`)
   - Household Recode (HR) files
   - Individual Recode (IR) files
   - GPS datasets
   - Form: CSV, SPSS, Stata files

2. **FAOSTAT Data** (`raw/faostat/`)
   - Food security indicators
   - Agricultural production data
   - Nutrition statistics
   - Form: CSV, Excel, JSON

3. **World Bank Data** (`raw/worldbank/`)
   - Poverty and inequality indicators
   - Human development indices
   - Form: CSV, Excel

4. **KNBS Data** (`raw/knbs/`)
   - Kenya Integrated Household Budget Survey (KIHBS)
   - Census data
   - Economic surveys
   - Form: CSV, Excel, PDF

### Additional Datasets

5. **Other Sources** (`raw/other/`)
   - OpenStreetMap data
   - Satellite data (Landsat, Sentinel-2)
   - Climate data (CHIRPS, WorldClim)
   - Form: Various formats

## 🔄 Data Processing Workflow

1. **Raw Data** → Place original downloaded files in `raw/` subdirectories
2. **Processing** → Run cleaning/transformation scripts from `scripts/`
3. **Processed Data** → Cleaned data saved in `processed/` subdirectories
4. **Import** → Import processed data into PostgreSQL using import scripts
5. **Backup** → Keep imported copies in `imported/` for reference

## 📝 Naming Conventions

### Raw Data Files
- Format: `SOURCE_YEAR_TYPE_VERSION.ext`
- Example: `DHS_2014_HR_v1.csv` or `FAOSTAT_2023_FOOD_SECURITY.xlsx`

### Processed Data Files
- Format: `SOURCE_YEAR_TYPE_PROCESSED.ext`
- Example: `DHS_2014_HR_PROCESSED.csv`

### Script Files
- Format: `PROCESS_SOURCE_TYPE.js` or `IMPORT_SOURCE_TYPE.js`
- Example: `clean_dhs_household.js` or `import_faostat.js`

## 🔒 Data Security & Privacy

- **Sensitive Data**: Ensure proper handling of personally identifiable information (PII)
- **Access Control**: Limit access to raw data files
- **Anonymization**: Remove or anonymize PII before processing
- **Compliance**: Follow data use agreements from data sources

## ✅ Data Checklist

Before processing any dataset:

- [ ] Verify data source and version
- [ ] Check data license/terms of use
- [ ] Review data documentation
- [ ] Inspect data quality (missing values, outliers)
- [ ] Document any data modifications
- [ ] Backup raw data files

## 🚀 Quick Start

1. **Download your datasets** from:
   - DHS: https://dhsprogram.com/
   - FAOSTAT: https://www.fao.org/faostat/
   - World Bank: https://data.worldbank.org/
   - KNBS: https://www.knbs.or.ke/

2. **Place raw files** in appropriate `raw/` subdirectory

3. **Run processing scripts** from `scripts/` to clean and transform

4. **Import to PostgreSQL** using the import scripts

5. **Verify import** in your database

## 📚 Related Documentation

- See `../DATASETS_AND_INTEGRATION_GUIDE.md` for detailed dataset access instructions
- See PostgreSQL schema in the integration guide for table structure
- Check `../backend/src/config/postgis.js` for database configuration

## 🛠️ Data Processing Scripts

Processing scripts will be added to `scripts/` directory. These will:
- Parse CSV/Excel files
- Clean and validate data
- Standardize formats
- Geocode locations
- Prepare data for PostgreSQL import

## 📞 Support

For questions about data integration, refer to:
- `DATASETS_AND_INTEGRATION_GUIDE.md`
- Database schema documentation
- Backend API documentation

---

**Last Updated:** 2024
**Maintainer:** IPMAS Development Team

