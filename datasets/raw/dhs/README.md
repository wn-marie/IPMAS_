# DHS (Demographic and Health Surveys) Data

Place your DHS datasets in this directory.

## 📊 Expected Files

### Household Recode (HR)
- Format: CSV, SPSS, or Stata files
- Naming: `KDHS_YYYY_HR.*` or `DHS_YYYY_HR.*`
- Contains: Household-level indicators

### Individual Recode (IR)
- Format: CSV, SPSS, or Stata files
- Naming: `KDHS_YYYY_IR.*` or `DHS_YYYY_IR.*`
- Contains: Individual-level health data

### GPS Datasets
- Format: CSV, Shapefile
- Naming: `KDHS_YYYY_GPS.*`
- Contains: Geographic coordinates for survey clusters
- **Note:** GPS data may require special permission from DHS Program

## 📥 How to Download

1. Visit https://dhsprogram.com/
2. Register for free account
3. Navigate to "Data" → "Available Datasets"
4. Search for "Kenya" DHS surveys
5. Request access and download

## 🔍 Key Variables

Look for these variables in your DHS datasets:
- Household ID
- Cluster number
- GPS coordinates (latitude, longitude)
- Wealth index/wealth quintile
- Education indicators
- Health indicators
- Water and sanitation
- Housing characteristics

## ⚠️ Important Notes

- GPS coordinates may be displaced for privacy (typically 0-5km random offset)
- Some variables require recoding
- Review DHS variable dictionary for field meanings
- Ensure compliance with DHS data use agreement

