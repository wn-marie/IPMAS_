#!/usr/bin/env python3
"""
Import DHS Training Data to PostgreSQL

This script imports real DHS training data into PostgreSQL geospatial_data table.
It reads GPS coordinates from shapefile, merges with household data, and aggregates
to cluster level for mapping.

Usage: python datasets/scripts/import/import_dhs_to_postgresql.py
"""

import sys
import os
import json
from pathlib import Path
import geopandas as gpd
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Load environment variables from backend/.env
BACKEND_DIR = Path(__file__).parent.parent.parent.parent / 'backend'
load_dotenv(BACKEND_DIR / '.env')

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')

# Paths
BASE_DIR = Path(__file__).parent.parent.parent.parent
SHAPEFILE_PATH = BASE_DIR / 'datasets' / 'raw' / 'dhs' / 'KEGE8AFL' / 'KEGE8AFL.shp'
DHS_HOUSEHOLD_PATH = BASE_DIR / 'datasets' / 'processed' / 'dhs_household_clean.csv'

print('Starting DHS data import to PostgreSQL...')
print(f'Shapefile: {SHAPEFILE_PATH}')
print(f'Household data: {DHS_HOUSEHOLD_PATH}')

def read_gps_shapefile():
    """Step 1: Read GPS shapefile"""
    print('\nStep 1: Reading GPS shapefile...')
    
    try:
        gdf = gpd.read_file(str(SHAPEFILE_PATH))
        
        # Extract relevant columns
        gps_data = gdf[['DHSCLUST', 'ADM1NAME', 'LATNUM', 'LONGNUM', 'URBAN_RURA']].to_dict('records')
        
        print(f'Loaded {len(gps_data)} GPS clusters')
        return gps_data
    except Exception as e:
        print(f'Error reading GPS shapefile: {e}')
        raise

def read_household_data():
    """Step 2: Read household data and calculate cluster-level aggregates"""
    print('\nStep 2: Reading household data...')
    
    try:
        df = pd.read_csv(str(DHS_HOUSEHOLD_PATH), low_memory=False)
        
        # Convert numeric columns to float
        numeric_cols = ['hv271', 'hv009', 'hv012', 'hv013', 'hv206', 'hv207', 'hv208', 'hv210', 'hv212']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Group by hv001 (cluster) and calculate aggregates
        cluster_data = df.groupby('hv001').agg({
            'hv271': 'mean',  # Wealth index (use mean as proxy for poverty)
            'hv009': 'mean',  # Household size
            'hv012': 'mean',  # De jure members
            'hv013': 'mean',  # De facto members
            'hv201': lambda x: x.value_counts().index[0] if len(x.value_counts()) > 0 else 'unknown',  # Water source
            'hv201b': lambda x: x.value_counts().index[0] if len(x.value_counts()) > 0 else 'no',  # Water sufficient
            'hv205': lambda x: x.value_counts().index[0] if len(x.value_counts()) > 0 else 'unknown',  # Toilet type
            'hv206': 'mean',  # Has electricity
            'hv207': 'mean',  # Has radio
            'hv208': 'mean',  # Has television
            'hv210': 'mean',  # Has bicycle
            'hv212': 'mean',  # Has car
            'hv024': lambda x: x.value_counts().index[0] if len(x.value_counts()) > 0 else 'unknown',  # County
            'hv025': lambda x: x.value_counts().index[0] if len(x.value_counts()) > 0 else 'unknown',  # Urban/Rural
        }).reset_index()
        
        cluster_data.columns = ['hv001', 'wealth_index', 'household_size', 'de_jure_members', 'de_facto_members',
                               'water_source', 'water_sufficient', 'toilet_type', 'has_electricity', 'has_radio',
                               'has_tv', 'has_bicycle', 'has_car', 'county', 'urban_rural']
        
        # Convert to records
        records = cluster_data.to_dict('records')
        
        print(f'Loaded {len(records)} household clusters')
        return records
    except Exception as e:
        print(f'Error reading household data: {e}')
        raise

def calculate_poverty_indicators(gps_data, household_data):
    """Step 3: Transform and calculate poverty indicators"""
    print('\nStep 3: Calculating poverty indicators...')
    
    # Create lookup map
    household_map = {row['hv001']: row for row in household_data}
    
    locations = []
    
    for gps in gps_data:
        cluster_id = gps['DHSCLUST']
        household = household_map.get(cluster_id)
        
        if not household or pd.isna(gps.get('LATNUM')) or pd.isna(gps.get('LONGNUM')):
            continue  # Skip if no household data or no GPS
        
        # Calculate poverty index from wealth index
        # Wealth index ranges from ~-200,000 to +150,000
        # Convert to 0-100 poverty scale (higher = poorer)
        wealth_index = household.get('wealth_index', 0)
        if pd.isna(wealth_index):
            wealth_index = 0
        
        poverty_index = max(0, min(100, 100 - ((wealth_index + 100000) / 3000)))
        
        # Calculate derived indicators (normalize to 0-100)
        household_size = household.get('household_size', 0) if not pd.isna(household.get('household_size', 0)) else 0
        education_access = min(100, household_size * 10 + 50)
        
        has_electricity = household.get('has_electricity', 0) if not pd.isna(household.get('has_electricity', 0)) else 0
        health_vulnerability = max(0, 100 - has_electricity * 100)
        
        water_sufficient = household.get('water_sufficient', 'no')
        water_access = 100 if water_sufficient == 'yes' else 50
        
        has_car = household.get('has_car', 0) if not pd.isna(household.get('has_car', 0)) else 0
        employment_rate = min(100, has_car * 50 + 50)
        
        has_radio = household.get('has_radio', 0) if not pd.isna(household.get('has_radio', 0)) else 0
        has_tv = household.get('has_tv', 0) if not pd.isna(household.get('has_tv', 0)) else 0
        housing_quality = min(100, has_electricity * 30 + has_radio * 20 + has_tv * 50)
        
        locations.append({
            'name': f"Cluster {int(cluster_id)}",
            'county': household.get('county', 'Unknown'),
            'latitude': float(gps['LATNUM']),
            'longitude': float(gps['LONGNUM']),
            'poverty_index': round(poverty_index, 1),
            'education_access': round(education_access, 1),
            'health_vulnerability': round(health_vulnerability, 1),
            'water_access': water_access,
            'employment_rate': employment_rate,
            'housing_quality': housing_quality
        })
    
    print(f'Created {len(locations)} location records')
    return locations

def import_to_postgresql(locations):
    """Step 4: Import to PostgreSQL"""
    print('\nStep 4: Importing to PostgreSQL...')
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print('Connected to PostgreSQL')
        
        BATCH_SIZE = 100
        inserted = 0
        
        for i in range(0, len(locations), BATCH_SIZE):
            batch = locations[i:i + BATCH_SIZE]
            
            try:
                cur.execute('BEGIN')
                
                for loc in batch:
                    query = """
                        INSERT INTO geospatial_data (
                            name, county, longitude, latitude,
                            poverty_index, education_access, health_vulnerability,
                            water_access, housing_quality, employment_rate,
                            location_text
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_Point(%s, %s), 4326))
                    """
                    
                    cur.execute(query, [
                        loc['name'],
                        loc['county'],
                        loc['longitude'],
                        loc['latitude'],
                        loc['poverty_index'],
                        loc['education_access'],
                        loc['health_vulnerability'],
                        loc['water_access'],
                        loc['housing_quality'],
                        loc['employment_rate'],
                        loc['longitude'],
                        loc['latitude']
                    ])
                
                cur.execute('COMMIT')
                inserted += len(batch)
                
                if inserted % 500 == 0:
                    print(f'   Imported {inserted}/{len(locations)} records...')
            
            except Exception as e:
                cur.execute('ROLLBACK')
                print(f'   Error in batch: {e}')
        
        print(f'Successfully imported {inserted} locations into geospatial_data table')
        
        # Verify import
        cur.execute('SELECT COUNT(*) as count FROM geospatial_data')
        count = cur.fetchone()[0]
        print(f'Total records in database: {count}')
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f'Import failed: {e}')
        raise

def main():
    """Main execution"""
    try:
        # Step 1: Read GPS data
        gps_data = read_gps_shapefile()
        
        # Step 2: Read household data
        household_data = read_household_data()
        
        # Step 3: Calculate poverty indicators
        locations = calculate_poverty_indicators(gps_data, household_data)
        
        # Step 4: Import to PostgreSQL
        import_to_postgresql(locations)
        
        print('\nImport completed successfully!')
        print('\nNext steps:')
        print('1. Restart your backend server')
        print('2. Open frontend and check the map')
        print('3. You should see real DHS data clusters!')
        
    except Exception as e:
        print(f'Import failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()

