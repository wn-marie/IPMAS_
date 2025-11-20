"""
IPMAS2 Machine Learning Pipeline for Poverty Prediction
========================================================
This script provides a complete ML pipeline for predicting poverty using:
- DHS (Demographic and Health Surveys) data
- FAOSTAT (Food Security) data
- KNBS (Kenya Census) data
- World Bank indicators

Model Selection Rationale:
- Random Forest / Gradient Boosting: Best for tabular mixed data, handles non-linear relationships
- XGBoost/LightGBM: State-of-the-art for structured data, handles missing values well
- Neural Networks: Can be used if enough data is available after aggregation

Train/Test Split: 80% train, 20% test (as requested)
"""

import pandas as pd
import numpy as np
import os
import sys
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Fix Windows encoding issues with emojis
import io
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass  # If can't fix, continue without emojis

# Try to import advanced ML libraries
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("⚠️ XGBoost not available. Install with: pip install xgboost")

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    print("⚠️ LightGBM not available. Install with: pip install lightgbm")

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

class PovertyMLPipeline:
    """
    Complete ML pipeline for poverty prediction
    """
    
    def __init__(self, raw_data_path='datasets/raw', processed_data_path='datasets/processed'):
        self.raw_data_path = Path(raw_data_path)
        self.processed_data_path = Path(processed_data_path)
        self.models = {}
        self.scalers = {}
        self.label_encoders = {}
        self.feature_names = []
        
        # Create processed directory if it doesn't exist
        self.processed_data_path.mkdir(parents=True, exist_ok=True)
        
    def load_dhs_data(self):
        """
        Load and combine DHS household and individual recode data
        """
        print("📊 Loading DHS data...")
        
        # First check for processed CSV files (preferred)
        processed_household = self.processed_data_path / 'dhs_household_clean.csv'
        processed_individual = self.processed_data_path / 'dhs_individual_clean.csv'
        
        household_data = None
        individual_data = None
        
        if processed_household.exists():
            try:
                print(f"   Reading processed household data from {processed_household.name}...")
                household_data = pd.read_csv(processed_household, low_memory=False)
                print(f"✅ Loaded processed household data: {household_data.shape}")
                return {'household': household_data, 'individual': None, 'gps': None}
            except Exception as e:
                print(f"   ⚠️ Could not load processed household data: {e}")
        
        # Fallback to raw DHS data
        dhs_path = self.raw_data_path / 'dhs'
        
        if not dhs_path.exists():
            print("   ⚠️ DHS directory not found and no processed CSV found")
            return {'household': None, 'individual': None, 'gps': None}
        
        # Load household recode (HR)
        hr_files = list(dhs_path.glob('**/KEHR8CFL.DTA'))
        pr_files = list(dhs_path.glob('**/KEPR8CFL.DTA'))
        
        household_data = None
        individual_data = None
        
        if hr_files:
            try:
                print(f"   Reading household recode from {hr_files[0].name}...")
                # Try to read with chunks if file is large
                try:
                    household_data = pd.read_stata(hr_files[0], chunksize=None)
                    print(f"✅ Loaded household recode: {household_data.shape}")
                except Exception as e1:
                    print(f"   ⚠️ Full read failed: {e1}")
                    print("   Trying with limited columns...")
                    # Try reading just first few columns as fallback
                    try:
                        household_data = pd.read_stata(hr_files[0], columns=None)
                        print(f"✅ Loaded household recode (limited): {household_data.shape}")
                    except:
                        raise e1
            except ImportError as e:
                print(f"   ⚠️ Missing dependency: {e}")
                print("   Install pyreadstat: pip install pyreadstat")
            except Exception as e:
                print(f"   ⚠️ Could not load household recode: {e}")
                print("   File may be corrupted or in wrong format")
                
        if pr_files:
            try:
                print(f"   Reading individual recode from {pr_files[0].name}...")
                individual_data = pd.read_stata(pr_files[0])
                print(f"✅ Loaded individual recode: {individual_data.shape}")
            except ImportError as e:
                print(f"   ⚠️ Missing dependency: {e}")
            except Exception as e:
                print(f"   ⚠️ Could not load individual recode: {e}")
                
        # Load GPS data (shapefile)
        gps_shp = dhs_path / 'KEGE8AFL' / 'KEGE8AFL.shp'
        gps_data = None
        
        if gps_shp.exists():
            try:
                import geopandas as gpd
                print(f"   Reading GPS shapefile...")
                gps_data = gpd.read_file(gps_shp)
                print(f"✅ Loaded GPS data: {gps_data.shape}")
            except ImportError:
                print("   ⚠️ geopandas not installed: pip install geopandas")
            except Exception as e:
                print(f"   ⚠️ Could not load GPS shapefile: {e}")
        else:
            print("   ℹ️ GPS shapefile not found (optional)")
        
        return {
            'household': household_data,
            'individual': individual_data,
            'gps': gps_data
        }
    
    def load_faostat_data(self):
        """
        Load FAOSTAT food security data
        """
        print("📊 Loading FAOSTAT data...")
        faostat_path = self.raw_data_path / 'faostat'
        
        food_security_file = faostat_path / 'FAOSTAT_data_food_security and nutrition.csv'
        apparent_intake_file = faostat_path / 'FAOSTAT_data_en_Apparent_intake.csv'
        
        data = {}
        
        if food_security_file.exists():
            try:
                df = pd.read_csv(food_security_file)
                print(f"✅ Loaded food security data: {df.shape}")
                data['food_security'] = df
            except Exception as e:
                print(f"⚠️ Error loading food security data: {e}")
                
        if apparent_intake_file.exists():
            try:
                df = pd.read_csv(apparent_intake_file)
                print(f"✅ Loaded apparent intake data: {df.shape}")
                data['apparent_intake'] = df
            except Exception as e:
                print(f"⚠️ Error loading apparent intake data: {e}")
        
        return data
    
    def load_knbs_data(self):
        """
        Load KNBS census data
        """
        print("📊 Loading KNBS census data...")
        knbs_path = self.raw_data_path / 'knbs'
        
        census_files = list(knbs_path.glob('*.csv'))
        data = {}
        
        for file in census_files:
            try:
                # Try different encodings for CSV files (some may not be UTF-8)
                encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
                df = None
                
                for encoding in encodings:
                    try:
                        # Skip header rows and get actual data
                        df = pd.read_csv(file, skiprows=2, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                
                if df is None:
                    print(f"⚠️ Could not read {file.name} with any encoding")
                    continue
                
                name = file.stem
                data[name] = df
                print(f"✅ Loaded {name}: {df.shape}")
            except Exception as e:
                print(f"⚠️ Error loading {file.name}: {e}")
        
        return data
    
    def load_worldbank_data(self):
        """
        Load World Bank indicator data
        """
        print("📊 Loading World Bank data...")
        wb_path = self.raw_data_path / 'worldbank'
        
        wb_file = wb_path / 'API_KEN_DS2_en_csv_v2_10588_worldbank.csv'
        
        if wb_file.exists():
            try:
                # Skip metadata rows
                df = pd.read_csv(wb_file, skiprows=4)
                print(f"✅ Loaded World Bank data: {df.shape}")
                return df
            except Exception as e:
                print(f"⚠️ Error loading World Bank data: {e}")
        
        return None
    
    def create_features(self, dhs_data, faostat_data, knbs_data, wb_data):
        """
        Enhanced feature engineering: Combine all datasets and create ML-ready features
        """
        print("\n🔧 Creating features (Enhanced)...")
        
        all_features = []
        
        # Start with DHS household data as base (has wealth index)
        if dhs_data['household'] is not None:
            hh_df = dhs_data['household'].copy()
            print(f"   Processing DHS household data: {hh_df.shape}")
            
            # Extract key features from DHS
            # IMPORTANT: Exclude hv270 (target) and hv271 (leakage) from features
            exclude_cols = ['hv270', 'hv271', 'hv271a', 'poverty_index']
            
            # Get all numeric columns first (more comprehensive)
            numeric_cols = hh_df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Remove excluded columns
            numeric_cols = [col for col in numeric_cols if col not in exclude_cols]
            
            # Also get specific poverty-related indicators (excluding wealth index)
            feature_cols = []
            
            # Education indicators (head of household education)
            edu_patterns = ['hv106', 'hv107', 'v106', 'v107', 'education']
            for pattern in edu_patterns:
                edu_cols = [col for col in numeric_cols if pattern in col.lower()]
                feature_cols.extend(edu_cols)
            
            # Household composition and demographics
            comp_patterns = ['hv009', 'hv012', 'hv013', 'hv014', 'hv015', 'household', 'member']
            for pattern in comp_patterns:
                comp_cols = [col for col in numeric_cols if pattern in col.lower()]
                feature_cols.extend(comp_cols)
            
            # Housing characteristics
            housing_patterns = ['hv201', 'hv204', 'hv213', 'hv214', 'hv215', 'hv216', 'hv218', 'housing', 'roof', 'wall', 'floor']
            for pattern in housing_patterns:
                housing_cols = [col for col in numeric_cols if pattern in col.lower()]
                feature_cols.extend(housing_cols)
            
            # Water and sanitation
            water_patterns = ['hv201', 'hv202', 'hv204', 'hv205', 'hv225', 'hv230a', 'water', 'toilet', 'sanitation']
            for pattern in water_patterns:
                water_cols = [col for col in numeric_cols if pattern in col.lower()]
                feature_cols.extend(water_cols)
            
            # Assets and ownership
            asset_patterns = ['hv206', 'hv207', 'hv208', 'hv210', 'hv211', 'hv212', 'hv221', 'hv243', 'hv244', 'hv245', 'asset', 'radio', 'tv', 'refrigerator', 'bicycle', 'car', 'mobile']
            for pattern in asset_patterns:
                asset_cols = [col for col in numeric_cols if pattern in col.lower()]
                feature_cols.extend(asset_cols)
            
            # Health and nutrition
            health_patterns = ['hv234', 'sh69a', 'health', 'nutrition', 'iodized', 'mosquito']
            for pattern in health_patterns:
                health_cols = [col for col in numeric_cols if pattern in col.lower()]
                feature_cols.extend(health_cols)
            
            # Remove duplicates and excluded columns
            feature_cols = list(set(feature_cols))
            feature_cols = [col for col in feature_cols if col not in exclude_cols]
            
            # If we still have too few features, add more numeric columns
            if len(feature_cols) < 30:
                # Add more numeric columns (excluding leakage)
                remaining_numeric = [col for col in numeric_cols if col not in feature_cols and col not in exclude_cols]
                feature_cols.extend(remaining_numeric[:50])  # Add up to 50 more
            
            # Remove duplicates again
            feature_cols = list(set(feature_cols))
            feature_cols = [col for col in feature_cols if col not in exclude_cols]
            
            # Select available columns
            available_cols = [col for col in feature_cols if col in hh_df.columns]
            
            # Final check: ensure we have enough features
            if len(available_cols) < 20:
                # Fallback: use all numeric columns except excluded
                available_cols = [col for col in numeric_cols if col not in exclude_cols and col in hh_df.columns]
                available_cols = available_cols[:100]  # Limit to avoid memory issues
            
            print(f"      Selected {len(available_cols)} DHS feature columns (excluding hv270/hv271)")
            
            # Create base feature dataset
            if available_cols:
                dhs_features = hh_df[available_cols].copy()
            else:
                print("      ⚠️ No DHS features found, creating basic features...")
                dhs_features = pd.DataFrame({
                    'household_size': np.random.randint(1, 10, len(hh_df)),
                    'education_level': np.random.randint(0, 5, len(hh_df)),
                })
            
            # Add created features
            all_features.append(dhs_features)
            
            # Merge with GPS data if available
            if dhs_data['gps'] is not None:
                try:
                    gps = dhs_data['gps'].copy()
                    gps_cols = ['LATNUM', 'LONGNUM', 'URBAN_RURA']
                    available_gps = [col for col in gps_cols if col in gps.columns]
                    if available_gps:
                        # Merge by cluster ID if available
                        if 'DHSCLUST' in gps.columns and 'v001' in hh_df.columns:
                            gps_features = gps[['DHSCLUST'] + available_gps].rename(columns={'DHSCLUST': 'v001'})
                            dhs_features = dhs_features.merge(gps_features, on='v001', how='left')
                            print(f"      Added GPS features: {available_gps}")
                except Exception as e:
                    print(f"      ⚠️ Could not merge GPS data: {e}")
        
        # Extract features from DHS individual recode (if available)
        if dhs_data['individual'] is not None:
            print(f"   Processing DHS individual data: {dhs_data['individual'].shape}")
            ind_df = dhs_data['individual']
            
            # Aggregate individual-level data to household level
            # Common aggregation keys: v001 (cluster), v002 (household number)
            agg_key = None
            for key in ['v001', 'v002', 'hhid', 'household']:
                if key in ind_df.columns:
                    agg_key = key
                    break
            
            if agg_key:
                # Aggregate by household
                ind_numeric = ind_df.select_dtypes(include=[np.number]).columns[:20]  # Limit columns
                ind_agg = ind_df.groupby(agg_key)[ind_numeric].agg(['mean', 'max', 'min'])
                ind_agg.columns = [f'ind_{col[0]}_{col[1]}' for col in ind_agg.columns]
                all_features.append(ind_agg)
                print(f"      Created {len(ind_agg.columns)} aggregated individual features")
        
        # Add FAOSTAT features (food security at county/region level)
        if faostat_data:
            print("   Processing FAOSTAT data...")
            for name, df in faostat_data.items():
                if df is not None and 'Value' in df.columns:
                    # Aggregate by Area (county) if available
                    if 'Area' in df.columns:
                        faostat_agg = df.groupby('Area')['Value'].agg(['mean', 'sum', 'max'])
                        faostat_agg.columns = [f'faostat_{name}_{col}' for col in faostat_agg.columns]
                        all_features.append(faostat_agg)
                        print(f"      Added FAOSTAT features from {name}")
        
        # Add KNBS Census features
        if knbs_data:
            print("   Processing KNBS Census data...")
            for name, df in knbs_data.items():
                if df is not None:
                    # Find county column
                    county_col = None
                    for col in df.columns:
                        if 'county' in str(col).lower():
                            county_col = col
                            break
                    
                    if county_col:
                        numeric_cols = df.select_dtypes(include=[np.number]).columns[:10]  # Limit
                        if len(numeric_cols) > 0:
                            census_agg = df.groupby(county_col)[numeric_cols].agg('mean')
                            census_agg.columns = [f'census_{name}_{col}' for col in census_agg.columns]
                            all_features.append(census_agg)
                            print(f"      Added Census features from {name}")
        
        # Combine all features
        if all_features:
            print("\n   Combining all feature sets...")
            # Start with DHS as base
            X = all_features[0].copy()
            
            # Merge other features
            for i, feature_set in enumerate(all_features[1:], 1):
                try:
                    # Try to merge on common keys (county, cluster, etc.)
                    merge_key = None
                    for key in ['County', 'county', 'v001', 'DHSCLUST', 'Area']:
                        if key in X.columns and key in feature_set.index:
                            merge_key = key
                            feature_set = feature_set.reset_index()
                            break
                    
                    if merge_key:
                        X = X.merge(feature_set, left_on=merge_key, right_on=merge_key, how='left')
                    else:
                        # If no common key, try to merge by index
                        if len(X) == len(feature_set):
                            feature_set = feature_set.reset_index(drop=True)
                            X = pd.concat([X, feature_set], axis=1)
                except Exception as e:
                    print(f"      ⚠️ Could not merge feature set {i}: {e}")
        else:
            # Fallback: create synthetic features
            print("   ⚠️ No data available. Creating synthetic features for demonstration...")
            n_samples = 1000
            X = pd.DataFrame({
                'household_size': np.random.randint(1, 10, n_samples),
                'education_level': np.random.randint(0, 5, n_samples),
                'water_access': np.random.randint(0, 2, n_samples),
                'sanitation': np.random.randint(0, 2, n_samples),
                'housing_quality': np.random.randint(0, 5, n_samples),
                'income_estimate': np.random.normal(50000, 20000, n_samples),
            })
        
        # Advanced feature engineering
        print("\n   Creating derived features...")
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        
        # Create ratio features
        if 'household_size' in X.columns and len(numeric_cols) > 1:
            for col in numeric_cols[:3]:  # Limit to avoid too many features
                if col != 'household_size':
                    col_sum = X[col].sum()
                    if pd.notna(col_sum) and col_sum > 0:
                        X[f'{col}_per_person'] = X[col] / (X['household_size'] + 1)
        
        # Create interaction features (select top features only)
        top_numeric = numeric_cols[:5]
        if len(top_numeric) >= 2:
            for i, col1 in enumerate(top_numeric[:-1]):
                for col2 in top_numeric[i+1:]:
                    if col1 != col2:
                        X[f'{col1}_x_{col2}'] = X[col1] * X[col2]
        
        # Create polynomial features (for key features only)
        key_feature = None
        for col in ['wealth', 'education', 'income']:
            matching = [c for c in X.columns if col in str(c).lower()]
            if matching:
                key_feature = matching[0]
                break
        
        if key_feature:
            X[f'{key_feature}_squared'] = X[key_feature] ** 2
        
        # Handle missing values - first convert categoricals to numeric, then fill
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        categorical_cols = X.select_dtypes(include=['category', 'object']).columns
        
        # Convert categorical columns to numeric first, drop if can't convert
        cols_to_drop = []
        for col in list(categorical_cols):
            try:
                converted = pd.to_numeric(X[col], errors='coerce')
                # Check if conversion worked
                all_na = converted.isna().all() if hasattr(converted, 'isna') else len(converted) == 0
                if all_na:
                    cols_to_drop.append(col)
                else:
                    X[col] = converted
            except:
                cols_to_drop.append(col)
        
        # Drop columns that couldn't be converted
        if cols_to_drop:
            X = X.drop(columns=cols_to_drop)
            print(f"      Dropped {len(cols_to_drop)} non-numeric columns")
        
        # Refresh numeric cols after conversion
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        
        # Fill all numeric columns with median
        if len(numeric_cols) > 0:
            X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].median())
        
        # Remove infinite values
        X[numeric_cols] = X[numeric_cols].replace([np.inf, -np.inf], np.nan)
        X[numeric_cols] = X[numeric_cols].fillna(X[numeric_cols].median())
        
        # Create target variable using ACTUAL DHS wealth quintile (hv270)
        # This prevents data leakage - hv270 is a real DHS poverty measure, not derived
        if 'poverty_index' not in X.columns:
            # Check for actual DHS wealth quintile (hv270) - this is REAL poverty data
            wealth_quintile_col = None
            for col in X.columns:
                if 'hv270' in str(col).lower() and col != 'hv271':  # Use quintile, not continuous index
                    wealth_quintile_col = col
                    break
            
            if wealth_quintile_col is None:
                # Try to find it in the original DHS data
                if dhs_data['household'] is not None:
                    hh_df = dhs_data['household']
                    if 'hv270' in hh_df.columns:
                        # Map hv270 to X dataframe if possible
                        if 'v001' in X.columns and 'v001' in hh_df.columns:
                            quintile_map = hh_df.set_index('v001')['hv270'].to_dict()
                            X['hv270'] = X['v001'].map(quintile_map)
                            wealth_quintile_col = 'hv270'
                        elif len(X) == len(hh_df):
                            X['hv270'] = hh_df['hv270'].values
                            wealth_quintile_col = 'hv270'
            
            if wealth_quintile_col and wealth_quintile_col in X.columns:
                # Convert DHS wealth quintile to poverty score (0-100)
                # hv270 values: 'poorest'=1, 'poorer'=2, 'middle'=3, 'richer'=4, 'richest'=5
                # Or as strings: 'poorest', 'poorer', 'middle', 'richer', 'richest'
                quintile_map = {
                    'poorest': 90,   # Highest poverty (80-100)
                    'poorer': 70,    # High poverty (60-80)
                    'middle': 50,    # Moderate poverty (40-60)
                    'richer': 30,    # Low poverty (20-40)
                    'richest': 10    # Lowest poverty (0-20)
                }
                
                # Also handle numeric values (1-5)
                if X[wealth_quintile_col].dtype in [np.number, 'int64', 'float64']:
                    # Convert numeric 1-5 to poverty scores
                    X['poverty_index'] = X[wealth_quintile_col].map({
                        1: 90, 2: 70, 3: 50, 4: 30, 5: 10
                    }).fillna(50)  # Default to middle if unknown
                else:
                    # Convert string categories to poverty scores
                    X['poverty_index'] = X[wealth_quintile_col].map(quintile_map).fillna(50)
                
                # Remove wealth quintile and hv271 from features to prevent leakage
                if wealth_quintile_col in X.columns:
                    X = X.drop(columns=[wealth_quintile_col])
                leakage_cols = [col for col in X.columns if 'hv271' in str(col).lower()]
                if leakage_cols:
                    X = X.drop(columns=leakage_cols)
                    print(f"      ✅ Using ACTUAL DHS wealth quintile (hv270) as poverty target")
                    print(f"      ✅ Removed {wealth_quintile_col} and {leakage_cols} from features to prevent data leakage")
                else:
                    print(f"      ✅ Using ACTUAL DHS wealth quintile (hv270) as poverty target")
                    print(f"      ✅ Removed {wealth_quintile_col} from features to prevent data leakage")
            else:
                # Fallback: create synthetic poverty index (but warn about it)
                print("      ⚠️ WARNING: No actual DHS wealth quintile (hv270) found!")
                print("      ⚠️ Creating synthetic poverty index - this will cause data leakage")
                print("      ⚠️ Model accuracy will be artificially high (R² ≈ 1.0)")
                
                wealth_col = None
                for col in X.columns:
                    if 'wealth' in str(col).lower() or 'hv271' in str(col).lower():
                        wealth_col = col
                        break
                
                if wealth_col:
                    # Convert wealth index to poverty index (inverse relationship)
                    wealth_normalized = (X[wealth_col] - X[wealth_col].min()) / (X[wealth_col].max() - X[wealth_col].min() + 1e-6)
                    X['poverty_index'] = (1 - wealth_normalized) * 100
                    print(f"      ⚠️ Derived poverty_index from {wealth_col} - THIS IS DATA LEAKAGE")
                else:
                    # Create synthetic poverty index based on multiple features
                    if len(numeric_cols) > 0:
                        # Use weighted combination of features
                        weights = np.random.random(len(numeric_cols[:5]))
                        weights = weights / weights.sum()
                        X['poverty_index'] = 0
                        for i, col in enumerate(numeric_cols[:5]):
                            col_norm = (X[col] - X[col].min()) / (X[col].max() - X[col].min() + 1e-6)
                            X['poverty_index'] += weights[i] * (1 - col_norm) * 100
                    else:
                        X['poverty_index'] = np.random.uniform(0, 100, len(X))
        
        # Final cleanup: remove constant columns and ensure all numeric
        constant_cols = [col for col in X.columns if X[col].nunique() <= 1]
        if constant_cols:
            X = X.drop(columns=constant_cols)
            print(f"      Removed {len(constant_cols)} constant columns")
        
        # Ensure all remaining columns are numeric (required for ML)
        final_numeric_cols = X.select_dtypes(include=[np.number]).columns
        non_numeric_cols = [col for col in X.columns if col not in final_numeric_cols]
        if non_numeric_cols:
            print(f"      Dropping {len(non_numeric_cols)} non-numeric columns: {non_numeric_cols[:5]}...")
            X = X[final_numeric_cols]
        
        print(f"✅ Created feature matrix: {X.shape[0]} samples, {X.shape[1]-1} features (all numeric)")
        
        return X
    
    def prepare_train_test_split(self, features_df, test_size=0.2, random_state=42):
        """
        Prepare 80/20 train-test split
        """
        print(f"\n📊 Preparing train-test split (80% train, {int(test_size*100)}% test)...")
        
        # Separate features and target
        if 'poverty_index' in features_df.columns:
            y = features_df['poverty_index']
            X = features_df.drop('poverty_index', axis=1)
            
            # IMPORTANT: Remove hv271 (wealth index) from features to prevent data leakage
            # if poverty_index was derived from it
            leakage_cols = [col for col in X.columns if 'hv271' in str(col).lower() and 'hv270' not in str(col).lower()]
            if leakage_cols:
                print(f"      ⚠️ Removing potential leakage columns: {leakage_cols}")
                X = X.drop(columns=leakage_cols)
        else:
            raise ValueError("Target variable 'poverty_index' not found")
        
        # Remove any remaining non-numeric columns
        X = X.select_dtypes(include=[np.number])
        
        # Handle infinite values
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(X.median())
        
        # Split into train and test (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, shuffle=True
        )
        
        print(f"   Training set: {X_train.shape[0]} samples, {X_train.shape[1]} features")
        print(f"   Test set: {X_test.shape[0]} samples, {X_test.shape[1]} features")
        
        # Save feature names
        self.feature_names = X_train.columns.tolist()
        
        return X_train, X_test, y_train, y_test
    
    def train_models(self, X_train, X_test, y_train, y_test):
        """
        Train multiple ML models and compare performance
        """
        print("\n🤖 Training ML models...")
        
        results = {}
        
        # 1. Random Forest
        print("   Training Random Forest...")
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train, y_train)
        rf_pred = rf_model.predict(X_test)
        
        results['Random Forest'] = {
            'model': rf_model,
            'mse': mean_squared_error(y_test, rf_pred),
            'mae': mean_absolute_error(y_test, rf_pred),
            'r2': r2_score(y_test, rf_pred),
            'predictions': rf_pred
        }
        print(f"      R² Score: {results['Random Forest']['r2']:.4f}")
        
        # 2. Gradient Boosting
        print("   Training Gradient Boosting...")
        gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        gb_model.fit(X_train, y_train)
        gb_pred = gb_model.predict(X_test)
        
        results['Gradient Boosting'] = {
            'model': gb_model,
            'mse': mean_squared_error(y_test, gb_pred),
            'mae': mean_absolute_error(y_test, gb_pred),
            'r2': r2_score(y_test, gb_pred),
            'predictions': gb_pred
        }
        print(f"      R² Score: {results['Gradient Boosting']['r2']:.4f}")
        
        # 3. XGBoost (if available)
        if XGBOOST_AVAILABLE:
            print("   Training XGBoost...")
            xgb_model = xgb.XGBRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1
            )
            xgb_model.fit(X_train, y_train)
            xgb_pred = xgb_model.predict(X_test)
            
            results['XGBoost'] = {
                'model': xgb_model,
                'mse': mean_squared_error(y_test, xgb_pred),
                'mae': mean_absolute_error(y_test, xgb_pred),
                'r2': r2_score(y_test, xgb_pred),
                'predictions': xgb_pred
            }
            print(f"      R² Score: {results['XGBoost']['r2']:.4f}")
        
        # 4. LightGBM (if available)
        if LIGHTGBM_AVAILABLE:
            print("   Training LightGBM...")
            lgb_model = lgb.LGBMRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                verbose=-1
            )
            lgb_model.fit(X_train, y_train)
            lgb_pred = lgb_model.predict(X_test)
            
            results['LightGBM'] = {
                'model': lgb_model,
                'mse': mean_squared_error(y_test, lgb_pred),
                'mae': mean_absolute_error(y_test, lgb_pred),
                'r2': r2_score(y_test, lgb_pred),
                'predictions': lgb_pred
            }
            print(f"      R² Score: {results['LightGBM']['r2']:.4f}")
        
        self.models = results
        
        return results
    
    def print_model_comparison(self, results):
        """
        Print comparison of all trained models
        """
        print("\n" + "="*70)
        print("📊 MODEL COMPARISON RESULTS")
        print("="*70)
        print(f"{'Model':<20} {'R² Score':<15} {'MSE':<15} {'MAE':<15}")
        print("-"*70)
        
        for model_name, metrics in results.items():
            print(f"{model_name:<20} {metrics['r2']:<15.4f} {metrics['mse']:<15.2f} {metrics['mae']:<15.2f}")
        
        print("="*70)
        
        # Find best model
        best_model = max(results.items(), key=lambda x: x[1]['r2'])
        print(f"\n🏆 Best Model: {best_model[0]} (R² = {best_model[1]['r2']:.4f})")
    
    def save_model(self, model_name='best', save_path=None):
        """
        Save all trained models for deployment
        """
        if not self.models:
            print("⚠️ No models trained yet")
            return
        
        # Find best model
        best_model = max(self.models.items(), key=lambda x: x[1]['r2'])
        
        if save_path is None:
            save_path = self.processed_data_path / 'models'
        save_path = Path(save_path)
        save_path.mkdir(parents=True, exist_ok=True)
        
        # Save all models (using joblib or pickle)
        try:
            import joblib
            saved_models = []
            
            # Save all models
            for model_name, model_data in self.models.items():
                model_file = save_path / f'{model_name.replace(" ", "_").lower()}_model.pkl'
                joblib.dump(model_data['model'], model_file)
                saved_models.append(model_name)
                print(f"✅ Saved {model_name} model to {model_file}")
            
            # Save feature names
            feature_file = save_path / 'feature_names.txt'
            with open(feature_file, 'w') as f:
                f.write('\n'.join(self.feature_names))
            print(f"✅ Saved feature names to {feature_file}")
            
            print(f"\n🏆 Best model: {best_model[0]} (R² = {best_model[1]['r2']:.4f})")
            print(f"📦 Total models saved: {len(saved_models)} ({', '.join(saved_models)})")
            
        except ImportError:
            print("⚠️ joblib not available. Install with: pip install joblib")
            # Fallback to pickle
            import pickle
            saved_models = []
            
            for model_name, model_data in self.models.items():
                model_file = save_path / f'{model_name.replace(" ", "_").lower()}_model.pkl'
                with open(model_file, 'wb') as f:
                    pickle.dump(model_data['model'], f)
                saved_models.append(model_name)
                print(f"✅ Saved {model_name} model using pickle to {model_file}")
            
            feature_file = save_path / 'feature_names.txt'
            with open(feature_file, 'w') as f:
                f.write('\n'.join(self.feature_names))
            print(f"✅ Saved feature names to {feature_file}")
    
    def run_full_pipeline(self, use_preprocessed=False):
        """
        Run the complete ML pipeline with preprocessing and visualizations
        
        Args:
            use_preprocessed: If True, run preprocessing first (default: False to skip if issues)
        """
        print("="*70)
        print("🚀 IPMAS2 MACHINE LEARNING PIPELINE")
        print("="*70)
        
        # Step 1: Preprocess data (optional)
        if use_preprocessed:
            print("\n📋 Step 1: Data Preprocessing...")
            try:
                # Import from same directory
                script_dir = Path(__file__).parent
                if str(script_dir) not in sys.path:
                    sys.path.insert(0, str(script_dir))
                from preprocessing import DataPreprocessor
                preprocessor = DataPreprocessor(
                    raw_path=str(self.raw_data_path),
                    processed_path=str(self.processed_data_path)
                )
                processed_files = preprocessor.process_all_datasets()
                print("✅ Data preprocessing completed")
            except ImportError as e:
                print(f"⚠️ Preprocessing module not found: {e}")
                print("   Continuing with raw data...")
            except Exception as e:
                print(f"⚠️ Preprocessing error: {e}")
                print("   Continuing with raw data...")
                import traceback
                traceback.print_exc()
        else:
            print("\n📋 Step 1: Data Preprocessing...")
            print("   ℹ️ Skipping preprocessing (use_preprocessed=False)")
            print("   Set use_preprocessed=True to enable preprocessing")
        
        # Step 2: Load all datasets
        print("\n📊 Step 2: Loading datasets...")
        dhs_data = self.load_dhs_data()
        faostat_data = self.load_faostat_data()
        knbs_data = self.load_knbs_data()
        wb_data = self.load_worldbank_data()
        
        # Step 3: Create features
        print("\n🔧 Step 3: Feature Engineering...")
        features_df = self.create_features(dhs_data, faostat_data, knbs_data, wb_data)
        
        # Save processed features
        features_file = self.processed_data_path / 'ml_features.csv'
        features_df.to_csv(features_file, index=False)
        print(f"\n✅ Saved processed features to {features_file}")
        
        # Step 4: Prepare train-test split (80/20)
        print("\n📊 Step 4: Train-Test Split (80/20)...")
        X_train, X_test, y_train, y_test = self.prepare_train_test_split(features_df, test_size=0.2)
        
        # Step 5: Train models
        print("\n🤖 Step 5: Training Models...")
        results = self.train_models(X_train, X_test, y_train, y_test)
        
        # Step 6: Print comparison
        self.print_model_comparison(results)
        
        # Step 7: Create visualizations
        print("\n📈 Step 6: Creating Visualizations...")
        try:
            # Import from same directory
            script_dir = Path(__file__).parent
            if str(script_dir) not in sys.path:
                sys.path.insert(0, str(script_dir))
            from visualizations import ModelVisualizer
            visualizer = ModelVisualizer(output_dir=str(self.processed_data_path / 'visualizations'))
            visualizer.create_full_report(
                results, 
                X_test, 
                y_test, 
                self.feature_names
            )
            print("✅ Visualizations created successfully")
        except ImportError as e:
            print(f"⚠️ Visualization module not found: {e}")
            print("   Install matplotlib and seaborn: pip install matplotlib seaborn")
        except Exception as e:
            print(f"⚠️ Visualization error: {e}")
            print("   Skipping visualizations...")
            import traceback
            traceback.print_exc()
        
        # Step 8: Save best model
        print("\n💾 Step 7: Saving Best Model...")
        self.save_model()
        
        print("\n" + "="*70)
        print("✅ PIPELINE COMPLETED SUCCESSFULLY!")
        print("="*70)
        
        return results, (X_train, X_test, y_train, y_test)


if __name__ == '__main__':
    # Initialize pipeline
    pipeline = PovertyMLPipeline()
    
    # Run full pipeline
    # Set use_preprocessed=True to use cleaned data from preprocessing.py
    # Set use_preprocessed=False to use raw data directly (faster, but less optimal)
    try:
        results, splits = pipeline.run_full_pipeline(use_preprocessed=False)
        try:
            print("\n🎉 Pipeline execution completed!")
        except UnicodeEncodeError:
            print("\n[SUCCESS] Pipeline execution completed!")
    except KeyboardInterrupt:
        try:
            print("\n⚠️ Pipeline interrupted by user")
        except UnicodeEncodeError:
            print("\n[WARNING] Pipeline interrupted by user")
    except Exception as e:
        try:
            print(f"\n❌ Pipeline error: {e}")
        except UnicodeEncodeError:
            print(f"\n[ERROR] Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Tips:")
        print("   - Check that all datasets are in datasets/raw/")
        print("   - Verify dependencies are installed: pip install -r datasets/scripts/requirements_ml.txt")
        print("   - Try running without preprocessing: use_preprocessed=False")
