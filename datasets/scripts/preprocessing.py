"""
IPMAS2 Data Preprocessing Pipeline
==================================
Cleans and prepares raw datasets for machine learning
Handles: missing values, outliers, data types, normalization
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

class DataPreprocessor:
    """
    Comprehensive data preprocessing for poverty prediction datasets
    """
    
    def __init__(self, raw_path='datasets/raw', processed_path='datasets/processed'):
        self.raw_path = Path(raw_path)
        self.processed_path = Path(processed_path)
        self.processed_path.mkdir(parents=True, exist_ok=True)
        
    def clean_dhs_data(self, df):
        """
        Clean DHS household/individual recode data
        """
        print("   Cleaning DHS data...")
        df_clean = df.copy()
        
        # Replace special missing value codes (common in DHS)
        # DHS uses codes like 996, 997, 998, 999 for missing/not applicable
        for col in df_clean.select_dtypes(include=[np.number]).columns:
            df_clean[col] = df_clean[col].replace([996, 997, 998, 999], np.nan)
            # Also replace very high values that might be codes
            if df_clean[col].max() > 10000:
                df_clean[col] = df_clean[col].replace([df_clean[col].max()], np.nan)
        
        # Remove columns with too many missing values (>80%)
        missing_threshold = 0.8
        cols_to_drop = []
        for col in df_clean.columns:
            if df_clean[col].isna().sum() / len(df_clean) > missing_threshold:
                cols_to_drop.append(col)
        
        if cols_to_drop:
            print(f"      Dropped {len(cols_to_drop)} columns with >80% missing values")
            df_clean = df_clean.drop(columns=cols_to_drop)
        
        # Handle infinite values
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        df_clean[numeric_cols] = df_clean[numeric_cols].replace([np.inf, -np.inf], np.nan)
        
        # Remove duplicate rows
        initial_rows = len(df_clean)
        df_clean = df_clean.drop_duplicates()
        if len(df_clean) < initial_rows:
            print(f"      Removed {initial_rows - len(df_clean)} duplicate rows")
        
        print(f"      Cleaned shape: {df_clean.shape}")
        return df_clean
    
    def clean_census_data(self, df):
        """
        Clean KNBS census data (CSV format)
        """
        print("   Cleaning Census data...")
        df_clean = df.copy()
        
        # Remove rows that are entirely empty
        df_clean = df_clean.dropna(how='all')
        
        # Clean column names (remove extra spaces, special chars)
        df_clean.columns = df_clean.columns.str.strip().str.replace('\n', ' ')
        
        # Find actual header row (often census data has metadata rows)
        # Look for row with "County" or "County Name"
        header_idx = None
        for idx, row in df_clean.iterrows():
            row_str = ' '.join(row.astype(str)).lower()
            if 'county' in row_str and ('name' in row_str or 'code' in row_str):
                header_idx = idx
                break
        
        if header_idx is not None and header_idx > 0:
            # Use that row as header
            new_header = df_clean.iloc[header_idx]
            df_clean = df_clean.iloc[header_idx + 1:]
            df_clean.columns = new_header
            df_clean = df_clean.reset_index(drop=True)
        
        # Convert numeric columns (handle comma-separated numbers)
        for col in df_clean.columns:
            if df_clean[col].dtype == 'object':
                # Try to convert to numeric
                try:
                    # Remove commas and convert
                    df_clean[col] = df_clean[col].astype(str).str.replace(',', '')
                    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                except:
                    pass
        
        # Remove columns that are entirely non-numeric or empty
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            print("      ⚠️ No numeric columns found, may need manual inspection")
        else:
            df_clean = df_clean[[col for col in df_clean.columns if col in numeric_cols or df_clean[col].dtype == 'object']]
        
        print(f"      Cleaned shape: {df_clean.shape}")
        return df_clean
    
    def clean_faostat_data(self, df):
        """
        Clean FAOSTAT data
        """
        print("   Cleaning FAOSTAT data...")
        df_clean = df.copy()
        
        # FAOSTAT often has metadata columns we don't need
        # Keep: Area, Year, Value, Unit
        essential_cols = ['Area', 'Year', 'Value', 'Unit', 'Item', 'Element']
        available_cols = [col for col in essential_cols if col in df_clean.columns]
        
        if available_cols:
            # Pivot data if needed (Year columns)
            # Check if Year is a column or if years are columns
            if 'Year' in df_clean.columns:
                # Data is already in long format
                df_clean = df_clean[available_cols + [col for col in df_clean.columns if col not in available_cols]]
            else:
                # Years might be columns - keep as is for now
                pass
        
        # Filter for Kenya only
        if 'Area' in df_clean.columns:
            kenya_mask = df_clean['Area'].str.contains('Kenya', case=False, na=False)
            if kenya_mask.any():
                df_clean = df_clean[kenya_mask]
        
        # Convert Value to numeric
        if 'Value' in df_clean.columns:
            df_clean['Value'] = pd.to_numeric(df_clean['Value'], errors='coerce')
        
        print(f"      Cleaned shape: {df_clean.shape}")
        return df_clean
    
    def clean_worldbank_data(self, df):
        """
        Clean World Bank data
        """
        print("   Cleaning World Bank data...")
        df_clean = df.copy()
        
        # World Bank data has years as columns
        # Keep: Country Name, Indicator Name, Indicator Code, and year columns
        id_cols = ['Country Name', 'Country Code', 'Indicator Name', 'Indicator Code']
        available_id_cols = [col for col in id_cols if col in df_clean.columns]
        
        # Filter for Kenya
        if 'Country Name' in df_clean.columns:
            df_clean = df_clean[df_clean['Country Name'] == 'Kenya']
        
        # Year columns are numeric - identify them
        year_cols = [col for col in df_clean.columns if str(col).isdigit() and int(col) >= 1960 and int(col) <= 2030]
        
        # Melt to long format
        if year_cols and available_id_cols:
            df_clean = df_clean.melt(
                id_vars=available_id_cols,
                value_vars=year_cols,
                var_name='Year',
                value_name='Value'
            )
            df_clean['Year'] = pd.to_numeric(df_clean['Year'], errors='coerce')
            df_clean['Value'] = pd.to_numeric(df_clean['Value'], errors='coerce')
        
        print(f"      Cleaned shape: {df_clean.shape}")
        return df_clean
    
    def handle_outliers(self, df, method='iqr', threshold=3):
        """
        Handle outliers in numeric columns
        Methods: 'iqr' (interquartile range), 'zscore' (z-score), 'clip'
        """
        print("   Handling outliers...")
        df_clean = df.copy()
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        
        outliers_handled = 0
        
        for col in numeric_cols:
            if method == 'iqr':
                Q1 = df_clean[col].quantile(0.25)
                Q3 = df_clean[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                # Clip outliers
                before = df_clean[col].count()
                df_clean[col] = df_clean[col].clip(lower=lower_bound, upper=upper_bound)
                outliers_handled += before - df_clean[col].count()
                
            elif method == 'zscore':
                z_scores = np.abs((df_clean[col] - df_clean[col].mean()) / df_clean[col].std())
                df_clean.loc[z_scores > threshold, col] = np.nan
                
            elif method == 'clip':
                # Clip to percentiles
                lower = df_clean[col].quantile(0.01)
                upper = df_clean[col].quantile(0.99)
                df_clean[col] = df_clean[col].clip(lower=lower, upper=upper)
        
        if outliers_handled > 0:
            print(f"      Handled {outliers_handled} outlier values")
        
        return df_clean
    
    def impute_missing_values(self, df, strategy='median'):
        """
        Impute missing values
        Strategies: 'mean', 'median', 'mode', 'forward_fill', 'zero'
        """
        print("   Imputing missing values...")
        df_clean = df.copy()
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        categorical_cols = df_clean.select_dtypes(include=['object']).columns
        
        missing_before = df_clean.isna().sum().sum()
        
        # Numeric columns
        if strategy == 'median':
            df_clean[numeric_cols] = df_clean[numeric_cols].fillna(df_clean[numeric_cols].median())
        elif strategy == 'mean':
            df_clean[numeric_cols] = df_clean[numeric_cols].fillna(df_clean[numeric_cols].mean())
        elif strategy == 'zero':
            df_clean[numeric_cols] = df_clean[numeric_cols].fillna(0)
        elif strategy == 'forward_fill':
            df_clean[numeric_cols] = df_clean[numeric_cols].fillna(method='ffill')
        
        # Categorical columns
        df_clean[categorical_cols] = df_clean[categorical_cols].fillna('Unknown')
        
        missing_after = df_clean.isna().sum().sum()
        if missing_before > 0:
            print(f"      Imputed {missing_before - missing_after} missing values")
        
        return df_clean
    
    def standardize_numeric_features(self, df, method='standard'):
        """
        Standardize/normalize numeric features
        Methods: 'standard' (z-score), 'minmax' (0-1), 'robust'
        """
        print("   Standardizing numeric features...")
        df_clean = df.copy()
        numeric_cols = df_clean.select_dtypes(include=[np.number]).columns
        
        if method == 'standard':
            # Z-score normalization
            df_clean[numeric_cols] = (df_clean[numeric_cols] - df_clean[numeric_cols].mean()) / df_clean[numeric_cols].std()
        elif method == 'minmax':
            # Min-max scaling (0-1)
            df_clean[numeric_cols] = (df_clean[numeric_cols] - df_clean[numeric_cols].min()) / (df_clean[numeric_cols].max() - df_clean[numeric_cols].min())
        elif method == 'robust':
            # Robust scaling (using median and IQR)
            median = df_clean[numeric_cols].median()
            iqr = df_clean[numeric_cols].quantile(0.75) - df_clean[numeric_cols].quantile(0.25)
            df_clean[numeric_cols] = (df_clean[numeric_cols] - median) / iqr
        
        return df_clean
    
    def process_all_datasets(self):
        """
        Process all datasets in the raw folder
        """
        print("="*70)
        print("🧹 DATA PREPROCESSING PIPELINE")
        print("="*70)
        
        processed_files = {}
        
        # Process DHS data
        dhs_path = self.raw_path / 'dhs'
        if dhs_path.exists():
            print("\n📊 Processing DHS data...")
            
            # Household recode
            hr_files = list(dhs_path.glob('**/KEHR8CFL.DTA'))
            if hr_files:
                try:
                    df = pd.read_stata(hr_files[0])
                    df_clean = self.clean_dhs_data(df)
                    df_clean = self.handle_outliers(df_clean)
                    df_clean = self.impute_missing_values(df_clean)
                    
                    output_file = self.processed_path / 'dhs_household_clean.csv'
                    df_clean.to_csv(output_file, index=False)
                    processed_files['dhs_household'] = output_file
                    print(f"   ✅ Saved to {output_file}")
                except Exception as e:
                    print(f"   ⚠️ Error processing household recode: {e}")
            
            # Individual recode
            pr_files = list(dhs_path.glob('**/KEPR8CFL.DTA'))
            if pr_files:
                try:
                    df = pd.read_stata(pr_files[0])
                    df_clean = self.clean_dhs_data(df)
                    df_clean = self.handle_outliers(df_clean)
                    df_clean = self.impute_missing_values(df_clean)
                    
                    output_file = self.processed_path / 'dhs_individual_clean.csv'
                    df_clean.to_csv(output_file, index=False)
                    processed_files['dhs_individual'] = output_file
                    print(f"   ✅ Saved to {output_file}")
                except Exception as e:
                    print(f"   ⚠️ Error processing individual recode: {e}")
        
        # Process FAOSTAT data
        faostat_path = self.raw_path / 'faostat'
        if faostat_path.exists():
            print("\n📊 Processing FAOSTAT data...")
            
            csv_files = list(faostat_path.glob('*.csv'))
            for csv_file in csv_files:
                try:
                    df = pd.read_csv(csv_file, encoding='utf-8')
                    df_clean = self.clean_faostat_data(df)
                    df_clean = self.impute_missing_values(df_clean)
                    
                    output_file = self.processed_path / f'faostat_{csv_file.stem}_clean.csv'
                    df_clean.to_csv(output_file, index=False)
                    processed_files[f'faostat_{csv_file.stem}'] = output_file
                    print(f"   ✅ Saved to {output_file}")
                except Exception as e:
                    print(f"   ⚠️ Error processing {csv_file.name}: {e}")
        
        # Process KNBS Census data
        knbs_path = self.raw_path / 'knbs'
        if knbs_path.exists():
            print("\n📊 Processing KNBS Census data...")
            
            csv_files = list(knbs_path.glob('*.csv'))
            for csv_file in csv_files:
                try:
                    df = pd.read_csv(csv_file, encoding='utf-8')
                    df_clean = self.clean_census_data(df)
                    df_clean = self.impute_missing_values(df_clean)
                    
                    output_file = self.processed_path / f'knbs_{csv_file.stem}_clean.csv'
                    df_clean.to_csv(output_file, index=False)
                    processed_files[f'knbs_{csv_file.stem}'] = output_file
                    print(f"   ✅ Saved to {output_file}")
                except Exception as e:
                    print(f"   ⚠️ Error processing {csv_file.name}: {e}")
        
        # Process World Bank data
        wb_path = self.raw_path / 'worldbank'
        if wb_path.exists():
            print("\n📊 Processing World Bank data...")
            
            csv_files = list(wb_path.glob('*.csv'))
            for csv_file in csv_files:
                try:
                    df = pd.read_csv(csv_file, skiprows=4, encoding='utf-8')
                    df_clean = self.clean_worldbank_data(df)
                    df_clean = self.impute_missing_values(df_clean)
                    
                    output_file = self.processed_path / f'worldbank_{csv_file.stem}_clean.csv'
                    df_clean.to_csv(output_file, index=False)
                    processed_files[f'worldbank_{csv_file.stem}'] = output_file
                    print(f"   ✅ Saved to {output_file}")
                except Exception as e:
                    print(f"   ⚠️ Error processing {csv_file.name}: {e}")
        
        print("\n" + "="*70)
        print(f"✅ Preprocessing complete! Processed {len(processed_files)} datasets")
        print("="*70)
        
        return processed_files


if __name__ == '__main__':
    preprocessor = DataPreprocessor()
    processed_files = preprocessor.process_all_datasets()
