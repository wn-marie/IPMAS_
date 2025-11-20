#!/usr/bin/env python3
"""
Generate Sample Locations from ML Features for Mock Database
This script samples the trained ML features and generates realistic mock locations
for display on the map without needing a full PostgreSQL database.

Usage: python datasets/scripts/import/generate_mock_from_ml_features.py
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent.parent.parent
ML_FEATURES_PATH = BASE_DIR / 'datasets' / 'processed' / 'ml_features.csv'
SHAPEFILE_PATH = BASE_DIR / 'datasets' / 'raw' / 'dhs' / 'KEGE8AFL' / 'KEGE8AFL.shp'
OUTPUT_PATH = BASE_DIR / 'frontend' / 'public' / 'data' / 'sample-data-enhanced.js'

# Kenya bounding box for random GPS generation (fallback)
KENYA_BBOX = {
    'lat_min': -4.69,
    'lat_max': 5.51,
    'lng_min': 33.92,
    'lng_max': 41.92
}

# Kenyan counties for diversity
KENYAN_COUNTIES = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Machakos', 'Meru',
    'Kakamega', 'Uasin Gishu', 'Kiambu', 'Kericho', 'Nyeri', 'Kisii',
    'Kilifi', 'Garissa', 'Mandera', 'Marsabit', 'Isiolo', 'Kitui',
    'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 'Busia',
    'Bungoma', 'Siaya', 'Homa Bay', 'Migori', 'Narok', 'Kajiado', 'Taita Taveta'
]

def load_gps_data():
    """Load GPS data from shapefile"""
    print('Loading GPS data from shapefile...')
    try:
        import geopandas as gpd
        gdf = gpd.read_file(str(SHAPEFILE_PATH))
        gps_data = gdf[['DHSCLUST', 'ADM1NAME', 'LATNUM', 'LONGNUM']].to_dict('records')
        print(f'Loaded {len(gps_data)} GPS clusters')
        return gps_data
    except Exception as e:
        print(f'Error loading GPS shapefile: {e}')
        print('Will use random coordinates as fallback')
        return None

def load_ml_features():
    """Load ML features CSV"""
    print('Loading ML features...')
    try:
        df = pd.read_csv(ML_FEATURES_PATH)
        print(f'Loaded {len(df)} rows with {len(df.columns)} features')
        return df
    except Exception as e:
        print(f'Error loading ML features: {e}')
        sys.exit(1)

def generate_sample_locations(df, num_samples=100, gps_data=None):
    """Generate sample locations from ML features"""
    print(f'\nGenerating {num_samples} sample locations...')
    
    # Sample random rows
    sample_df = df.sample(n=min(num_samples, len(df)), random_state=42)
    
    # Create GPS lookup map if available
    gps_map = None
    if gps_data:
        gps_map = {}
        for gps in gps_data:
            cluster_id = gps.get('DHSCLUST')
            if cluster_id is not None:
                gps_map[cluster_id] = gps
    
    locations = []
    
    for idx, row in sample_df.iterrows():
        # Extract poverty index
        poverty_index = row['poverty_index']
        
        # Try to get real GPS coordinates if available
        lat, lng, county = None, None, None
        
        if gps_map:
            # Try to match by index or sample random GPS
            sample_gps = np.random.choice(list(gps_map.values()))
            lat = float(sample_gps['LATNUM'])
            lng = float(sample_gps['LONGNUM'])
            county = sample_gps.get('ADM1NAME', 'Kenya')
        
        # Fallback to random GPS within Kenya
        if lat is None or lng is None:
            lat = np.random.uniform(KENYA_BBOX['lat_min'], KENYA_BBOX['lat_max'])
            lng = np.random.uniform(KENYA_BBOX['lng_min'], KENYA_BBOX['lng_max'])
            county = np.random.choice(KENYAN_COUNTIES)
        
        # Derive other indicators from poverty index and features
        household_size = row.get('hv009', 4)
        education_access = max(20, min(95, 100 - poverty_index + np.random.uniform(-10, 10)))
        health_vulnerability = max(10, min(90, poverty_index + np.random.uniform(-5, 5)))
        water_access = max(30, min(95, 100 - poverty_index * 0.8 + np.random.uniform(-5, 5)))
        employment_rate = max(30, min(90, 100 - poverty_index * 0.7 + np.random.uniform(-5, 5)))
        housing_quality = max(20, min(85, 100 - poverty_index * 0.9 + np.random.uniform(-10, 10)))
        
        location = {
            'name': f'Cluster {idx}',
            'lat': round(lat, 4),
            'lng': round(lng, 4),
            'county': county,
            'ward': f'Ward {idx % 20 + 1}',
            'poverty_index': round(poverty_index, 1),
            'education_access': round(education_access, 1),
            'health_vulnerability': round(health_vulnerability, 1),
            'water_access': round(water_access, 1),
            'employment_rate': round(employment_rate, 1),
            'housing_quality': round(housing_quality, 1),
            'population': np.random.randint(10000, 500000),
            'area_km2': round(np.random.uniform(10, 500), 1)
        }
        
        locations.append(location)
    
    print(f'Generated {len(locations)} locations')
    return locations

def write_js_file(locations):
    """Write locations to JS file"""
    print(f'\nWriting to {OUTPUT_PATH}...')
    
    # Generate JS content
    js_content = '''/**
 * IPMAS - Enhanced Sample Data from ML Features
 * Generated from trained 80/20 split data
 */

window.sampleData = {
    locations: [\n'''
    
    for loc in locations:
        # Escape apostrophes in names to prevent JS syntax errors
        name = loc['name'].replace("'", "\\'")
        county = loc['county'].replace("'", "\\'")
        ward = loc['ward'].replace("'", "\\'")
        
        js_content += f'''        {{
            name: '{name}',
            lat: {loc['lat']},
            lng: {loc['lng']},
            county: '{county}',
            ward: '{ward}',
            poverty_index: {loc['poverty_index']},
            education_access: {loc['education_access']},
            health_vulnerability: {loc['health_vulnerability']},
            water_access: {loc['water_access']},
            employment_rate: {loc['employment_rate']},
            housing_quality: {loc['housing_quality']},
            population: {loc['population']},
            area_km2: {loc['area_km2']}
        }},\n'''
    
    js_content += '''    ],

    // Poverty indicators by county
    countyStats: {
        poverty_index: {
            nairobi: 45.2, mombasa: 52.3, kisumu: 68.7, nakuru: 41.8
        },
        education_access: {
            nairobi: 75.8, mombasa: 65.3, kisumu: 52.4, nakuru: 69.5
        }
    },

    // AI insights and predictions
    aiInsights: {
        predictions: {
            poverty_reduction_6_months: 8.5,
            education_improvement_12_months: 12.3,
            health_vulnerability_reduction: 6.7,
            water_access_improvement: 15.2,
            employment_increase: 9.8
        },
        recommendations: [
            'Focus infrastructure development in informal settlements',
            'Increase investment in vocational training programs',
            'Improve water and sanitation systems in high-poverty areas',
            'Enhance healthcare accessibility in rural counties',
            'Promote digital literacy and internet connectivity'
        ],
        risk_factors: [
            'Climate change impacts on agriculture',
            'Population growth outpacing infrastructure',
            'Youth unemployment crisis',
            'Urban-rural development gap',
            'Healthcare system capacity constraints'
        ]
    },

    // Project impact data
    projectImpacts: {
        completed_projects: 25,
        ongoing_projects: 12,
        planned_projects: 8,
        total_investment: 450000000,
        lives_impacted: 15420000,
        jobs_created: 890,
        houses_improved: 2340,
        water_points_installed: 89,
        students_supported: 1567,
        clinics_established: 12,
        roads_built_km: 45,
        schools_built: 8
    }
};

// Export for Node.js environments if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.sampleData;
}
'''
    
    # Write file
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        f.write(js_content)
    
    print(f'Wrote {len(locations)} locations to {OUTPUT_PATH}')

def main():
    """Main execution"""
    print('Generating Enhanced Sample Data from ML Features\n')
    
    # Load GPS data first (optional)
    gps_data = load_gps_data()
    
    # Load ML features
    df = load_ml_features()
    
    # Generate 200 sample locations with real GPS if available
    locations = generate_sample_locations(df, num_samples=200, gps_data=gps_data)
    
    # Write to JS file
    write_js_file(locations)
    
    print('\nComplete! Enhanced sample data generated.')
    print('\nNext steps:')
    print('1. Refresh your browser')
    print('2. Check the map - you should see many more locations!')
    print(f'3. You now have {len(locations)} locations instead of 20')

if __name__ == '__main__':
    main()

