/**
 * IPMAS - Sample Data for Development
 * Comprehensive sample data for all Kenyan locations
 */

window.sampleData = {
    locations: [
        // Nairobi County - Central Areas
        {
            name: 'Nairobi Central',
            lat: -1.2921,
            lng: 36.8219,
            county: 'Nairobi',
            ward: 'Central',
            poverty_index: 45.2,
            education_access: 75.8,
            health_vulnerability: 38.5,
            water_access: 68.4,
            employment_rate: 72.1,
            housing_quality: 58.3,
            population: 4250000,
            area_km2: 696.1,
            gdp_per_capita: 3250,
            literacy_rate: 85.2,
            life_expectancy: 68.5
        },
        {
            name: 'Kibera',
            lat: -1.3197,
            lng: 36.7806,
            county: 'Nairobi',
            ward: 'Kibera',
            poverty_index: 78.9,
            education_access: 45.2,
            health_vulnerability: 82.1,
            water_access: 35.6,
            employment_rate: 38.7,
            housing_quality: 25.4,
            population: 250000,
            area_km2: 2.5,
            gdp_per_capita: 850,
            literacy_rate: 65.8,
            life_expectancy: 55.2
        },
        {
            name: 'Mathare',
            lat: -1.2847,
            lng: 36.8458,
            county: 'Nairobi',
            ward: 'Mathare',
            poverty_index: 82.3,
            education_access: 42.1,
            health_vulnerability: 85.2,
            water_access: 28.9,
            employment_rate: 35.2,
            housing_quality: 22.1,
            population: 500000,
            area_km2: 3.0,
            gdp_per_capita: 780,
            literacy_rate: 62.3,
            life_expectancy: 53.8
        },
        {
            name: 'Eastleigh',
            lat: -1.2739,
            lng: 36.8478,
            county: 'Nairobi',
            ward: 'Eastleigh',
            poverty_index: 52.1,
            education_access: 68.3,
            health_vulnerability: 48.7,
            water_access: 61.2,
            employment_rate: 64.8,
            housing_quality: 45.6,
            population: 120000,
            area_km2: 1.8,
            gdp_per_capita: 2100,
            literacy_rate: 78.5,
            life_expectancy: 62.3
        },
        {
            name: 'Westlands',
            lat: -1.2667,
            lng: 36.8000,
            county: 'Nairobi',
            ward: 'Westlands',
            poverty_index: 28.4,
            education_access: 89.2,
            health_vulnerability: 22.3,
            water_access: 92.1,
            employment_rate: 85.7,
            housing_quality: 78.9,
            population: 85000,
            area_km2: 4.2,
            gdp_per_capita: 4500,
            literacy_rate: 92.8,
            life_expectancy: 72.1
        },
        {
            name: 'Karen',
            lat: -1.3197,
            lng: 36.7185,
            county: 'Nairobi',
            ward: 'Karen',
            sub_county: 'Lang\'ata',
            poverty_index: 10.5,  // Very low poverty - affluent area (updated from 18.5%)
            education_access: 96.5,  // Excellent education access
            health_vulnerability: 8.2,  // Very low health vulnerability
            water_access: 98.2,  // Excellent water access
            employment_rate: 94.5,  // High employment rate
            housing_quality: 92.3,  // Excellent housing quality
            population: 120000,
            area_km2: 12.5,
            gdp_per_capita: 8500,  // High GDP per capita
            literacy_rate: 97.8,  // Very high literacy
            life_expectancy: 78.5  // High life expectancy
        },

        // Mombasa County
        {
            name: 'Mombasa Central',
            lat: -4.0435,
            lng: 39.6682,
            county: 'Mombasa',
            ward: 'Mvita',
            poverty_index: 38.7,
            education_access: 72.1,
            health_vulnerability: 41.3,
            water_access: 71.5,
            employment_rate: 68.9,
            housing_quality: 62.8,
            population: 1200000,
            area_km2: 294.7,
            gdp_per_capita: 2800,
            literacy_rate: 82.5,
            life_expectancy: 65.8
        },
        {
            name: 'Likoni',
            lat: -4.0833,
            lng: 39.6667,
            county: 'Mombasa',
            ward: 'Likoni',
            poverty_index: 65.4,
            education_access: 58.3,
            health_vulnerability: 68.7,
            water_access: 52.1,
            employment_rate: 55.6,
            housing_quality: 45.2,
            population: 180000,
            area_km2: 15.2,
            gdp_per_capita: 1200,
            literacy_rate: 71.2,
            life_expectancy: 58.9
        },
        {
            name: 'Changamwe',
            lat: -4.0167,
            lng: 39.6333,
            county: 'Mombasa',
            ward: 'Changamwe',
            poverty_index: 58.9,
            education_access: 61.7,
            health_vulnerability: 62.4,
            water_access: 58.9,
            employment_rate: 59.3,
            housing_quality: 48.7,
            population: 95000,
            area_km2: 12.8,
            gdp_per_capita: 1450,
            literacy_rate: 74.6,
            life_expectancy: 60.2
        },

        // Kisumu County
        {
            name: 'Kisumu Central',
            lat: -0.0917,
            lng: 34.7680,
            county: 'Kisumu',
            ward: 'Kisumu Central',
            poverty_index: 52.3,
            education_access: 65.3,
            health_vulnerability: 58.9,
            water_access: 61.2,
            employment_rate: 59.8,
            housing_quality: 48.7,
            population: 397957,
            area_km2: 2085.9,
            gdp_per_capita: 1850,
            literacy_rate: 76.8,
            life_expectancy: 63.5
        },
        {
            name: 'Kondele',
            lat: -0.0833,
            lng: 34.7500,
            county: 'Kisumu',
            ward: 'Kondele',
            poverty_index: 68.7,
            education_access: 52.4,
            health_vulnerability: 71.3,
            water_access: 48.9,
            employment_rate: 46.2,
            housing_quality: 38.5,
            population: 45000,
            area_km2: 3.5,
            gdp_per_capita: 980,
            literacy_rate: 68.2,
            life_expectancy: 56.8
        },
        {
            name: 'Mamboleo',
            lat: -0.1000,
            lng: 34.8000,
            county: 'Kisumu',
            ward: 'Mamboleo',
            poverty_index: 59.2,
            education_access: 58.7,
            health_vulnerability: 64.1,
            water_access: 54.3,
            employment_rate: 52.8,
            housing_quality: 43.9,
            population: 32000,
            area_km2: 4.2,
            gdp_per_capita: 1150,
            literacy_rate: 72.5,
            life_expectancy: 59.1
        },

        // Nakuru County
        {
            name: 'Nakuru Town',
            lat: -0.3072,
            lng: 36.0800,
            county: 'Nakuru',
            ward: 'Nakuru Town East',
            poverty_index: 41.8,
            education_access: 69.5,
            health_vulnerability: 44.2,
            water_access: 66.7,
            employment_rate: 64.3,
            housing_quality: 56.1,
            population: 570674,
            area_km2: 7495.1,
            gdp_per_capita: 2200,
            literacy_rate: 81.2,
            life_expectancy: 66.8
        },
        {
            name: 'Naivasha',
            lat: -0.7167,
            lng: 36.4333,
            county: 'Nakuru',
            ward: 'Naivasha',
            poverty_index: 38.2,
            education_access: 71.8,
            health_vulnerability: 39.6,
            water_access: 69.4,
            employment_rate: 67.5,
            housing_quality: 59.8,
            population: 198000,
            area_km2: 1950.8,
            gdp_per_capita: 2400,
            literacy_rate: 83.7,
            life_expectancy: 68.2
        },

        // Additional Counties
        {
            name: 'Eldoret',
            lat: 0.5143,
            lng: 35.2697,
            county: 'Uasin Gishu',
            ward: 'Eldoret Central',
            poverty_index: 35.6,
            education_access: 74.2,
            health_vulnerability: 36.8,
            water_access: 72.3,
            employment_rate: 71.5,
            housing_quality: 65.4,
            population: 475716,
            area_km2: 2955.3,
            gdp_per_capita: 2600,
            literacy_rate: 84.1,
            life_expectancy: 67.9
        },
        {
            name: 'Thika',
            lat: -1.0500,
            lng: 37.0833,
            county: 'Kiambu',
            ward: 'Thika Town',
            poverty_index: 42.3,
            education_access: 68.9,
            health_vulnerability: 45.7,
            water_access: 64.2,
            employment_rate: 66.8,
            housing_quality: 52.3,
            population: 279429,
            area_km2: 2536.2,
            gdp_per_capita: 2100,
            literacy_rate: 79.6,
            life_expectancy: 65.4
        },
        {
            name: 'Meru',
            lat: 0.0500,
            lng: 37.6500,
            county: 'Meru',
            ward: 'Meru Central',
            poverty_index: 48.7,
            education_access: 62.4,
            health_vulnerability: 52.1,
            water_access: 58.9,
            employment_rate: 58.2,
            housing_quality: 47.8,
            population: 1545714,
            area_km2: 6930.1,
            gdp_per_capita: 1650,
            literacy_rate: 75.3,
            life_expectancy: 62.1
        },
        {
            name: 'Kakamega',
            lat: 0.2833,
            lng: 34.7500,
            county: 'Kakamega',
            ward: 'Kakamega Central',
            poverty_index: 54.2,
            education_access: 59.8,
            health_vulnerability: 61.3,
            water_access: 52.7,
            employment_rate: 51.6,
            housing_quality: 41.2,
            population: 1867579,
            area_km2: 3033.8,
            gdp_per_capita: 1200,
            literacy_rate: 72.8,
            life_expectancy: 59.7
        }
    ],

    // Poverty indicators by county
    countyStats: {
        'Nairobi': {
            total_population: 4397073,
            poverty_rate: 45.2,
            gdp_per_capita: 3250,
            literacy_rate: 85.2,
            unemployment_rate: 12.5,
            housing_quality_index: 58.3,
            water_access: 68.4,
            electricity_access: 89.7,
            internet_penetration: 78.2
        },
        'Mombasa': {
            total_population: 1208333,
            poverty_rate: 38.7,
            gdp_per_capita: 2800,
            literacy_rate: 82.5,
            unemployment_rate: 15.2,
            housing_quality_index: 62.8,
            water_access: 71.5,
            electricity_access: 85.3,
            internet_penetration: 72.8
        },
        'Kisumu': {
            total_population: 1132990,
            poverty_rate: 52.3,
            gdp_per_capita: 1850,
            literacy_rate: 76.8,
            unemployment_rate: 18.7,
            housing_quality_index: 48.7,
            water_access: 61.2,
            electricity_access: 72.4,
            internet_penetration: 65.1
        },
        'Nakuru': {
            total_population: 2162203,
            poverty_rate: 41.8,
            gdp_per_capita: 2200,
            literacy_rate: 81.2,
            unemployment_rate: 14.3,
            housing_quality_index: 56.1,
            water_access: 66.7,
            electricity_access: 78.9,
            internet_penetration: 69.5
        },
        'Uasin Gishu': {
            total_population: 1163186,
            poverty_rate: 35.6,
            gdp_per_capita: 2600,
            literacy_rate: 84.1,
            unemployment_rate: 11.8,
            housing_quality_index: 65.4,
            water_access: 72.3,
            electricity_access: 82.1,
            internet_penetration: 74.3
        }
    },

    // Time series data for trends
    timeSeriesData: {
        poverty_trends: {
            '2019': { national: 45.2, nairobi: 42.1, mombasa: 38.7, kisumu: 48.9, nakuru: 41.8 },
            '2020': { national: 44.8, nairobi: 41.7, mombasa: 38.3, kisumu: 48.5, nakuru: 41.4 },
            '2021': { national: 44.2, nairobi: 41.1, mombasa: 37.9, kisumu: 48.1, nakuru: 40.8 },
            '2022': { national: 43.5, nairobi: 40.4, mombasa: 37.2, kisumu: 47.6, nakuru: 40.1 },
            '2023': { national: 42.8, nairobi: 39.7, mombasa: 36.5, kisumu: 47.1, nakuru: 39.4 }
        },
        education_trends: {
            '2019': { national: 68.5, nairobi: 75.8, mombasa: 72.1, kisumu: 65.3, nakuru: 69.5 },
            '2020': { national: 69.2, nairobi: 76.5, mombasa: 72.8, kisumu: 66.0, nakuru: 70.2 },
            '2021': { national: 69.8, nairobi: 77.1, mombasa: 73.4, kisumu: 66.6, nakuru: 70.8 },
            '2022': { national: 70.5, nairobi: 77.8, mombasa: 74.1, kisumu: 67.3, nakuru: 71.5 },
            '2023': { national: 71.2, nairobi: 78.5, mombasa: 74.8, kisumu: 68.0, nakuru: 72.2 }
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
        total_investment: 450000000, // 450M KES
        lives_impacted: 15420000, // 15.42M people
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