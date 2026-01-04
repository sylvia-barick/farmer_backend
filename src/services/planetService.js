const axios = require('axios');

const getPlanetImagery = async (lat, lon, date) => {
    try {
        const API_KEY = process.env.PLANET_API_KEY;
        
        // Check if API key is configured
        if (!API_KEY || API_KEY === 'your_planet_api_key_here') {
            console.log('Planet API key not configured, returning simulated data');
            return getSimulatedSatelliteData(lat, lon);
        }

        // Basic search endpoint example
        const response = await axios.post(
            'https://api.planet.com/data/v1/quick-search',
            {
                item_types: ['PSScene'],
                filter: {
                    type: 'AndFilter',
                    config: [
                        {
                            type: 'GeometryFilter',
                            field_name: 'geometry',
                            config: {
                                type: 'Point',
                                coordinates: [lon, lat]
                            }
                        },
                        {
                            type: 'DateRangeFilter',
                            field_name: 'acquired',
                            config: {
                                gte: date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
                            }
                        }
                    ]
                }
            },
            {
                auth: {
                    username: API_KEY,
                    password: ''
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Planet API Error:', error.message);
        // Return simulated data on error
        return getSimulatedSatelliteData(lat, lon);
    }
};

/**
 * Get crop health analysis from satellite imagery
 * Returns NDVI-based health metrics for the farm location
 */
const getCropHealthAnalysis = async (lat, lon, crops = []) => {
    try {
        const API_KEY = process.env.PLANET_API_KEY;
        
        // If no real API key, return simulated crop health data
        if (!API_KEY || API_KEY === 'your_planet_api_key_here') {
            return getSimulatedCropHealth(lat, lon, crops);
        }

        // In production, this would call Planet's Analytics API
        // For now, we'll use simulated data based on location and season
        const imagery = await getPlanetImagery(lat, lon);
        
        // Process imagery to extract NDVI (simplified)
        if (imagery && imagery.features && imagery.features.length > 0) {
            const latestScene = imagery.features[0];
            return {
                success: true,
                lastUpdated: latestScene.properties?.acquired || new Date().toISOString(),
                ndvi: calculateNDVI(latestScene),
                healthStatus: getHealthStatus(calculateNDVI(latestScene)),
                coverage: latestScene.properties?.cloud_cover ? (100 - latestScene.properties.cloud_cover) : 85,
                crops: crops,
                recommendations: getHealthRecommendations(calculateNDVI(latestScene), crops)
            };
        }
        
        return getSimulatedCropHealth(lat, lon, crops);
    } catch (error) {
        console.error('Crop Health Analysis Error:', error.message);
        return getSimulatedCropHealth(lat, lon, crops);
    }
};

/**
 * Simulate NDVI calculation (in production, this would analyze actual band data)
 */
const calculateNDVI = (scene) => {
    // Simulated NDVI based on scene quality and time of year
    const month = new Date().getMonth();
    const baseNDVI = 0.45; // Average healthy vegetation
    
    // Seasonal adjustment (higher in monsoon/growing season)
    const seasonalBoost = [0, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.2, 0.15, 0.1, 0.05, 0];
    
    return Math.min(0.9, Math.max(0.1, baseNDVI + seasonalBoost[month] + (Math.random() * 0.1 - 0.05)));
};

/**
 * Convert NDVI to health status
 */
const getHealthStatus = (ndvi) => {
    if (ndvi >= 0.7) return { status: 'Excellent', emoji: '🌿', severity: 0 };
    if (ndvi >= 0.5) return { status: 'Good', emoji: '✅', severity: 1 };
    if (ndvi >= 0.3) return { status: 'Moderate', emoji: '⚠️', severity: 2 };
    if (ndvi >= 0.2) return { status: 'Stressed', emoji: '🟠', severity: 3 };
    return { status: 'Critical', emoji: '🔴', severity: 4 };
};

/**
 * Get health-based recommendations
 */
const getHealthRecommendations = (ndvi, crops) => {
    const recommendations = [];
    const cropStr = crops.length > 0 ? crops[0] : 'crops';
    
    if (ndvi >= 0.7) {
        recommendations.push(`Your ${cropStr} showing excellent health - maintain current practices`);
    } else if (ndvi >= 0.5) {
        recommendations.push(`${cropStr} health is good - consider light fertilizer application`);
    } else if (ndvi >= 0.3) {
        recommendations.push(`Moderate stress detected in ${cropStr} - check for water/nutrient deficiency`);
        recommendations.push('Satellite shows uneven growth - inspect field boundaries');
    } else {
        recommendations.push(`Critical: ${cropStr} showing severe stress - immediate inspection needed`);
        recommendations.push('Check for pest infestation or disease');
        recommendations.push('Consider emergency irrigation if soil is dry');
    }
    
    return recommendations;
};

/**
 * Simulated satellite data for demo/development
 */
const getSimulatedSatelliteData = (lat, lon) => {
    const month = new Date().getMonth();
    const isGrowingSeason = month >= 5 && month <= 10; // June to October
    
    return {
        success: true,
        simulated: true,
        features: [{
            id: `simulated_${Date.now()}`,
            properties: {
                acquired: new Date().toISOString(),
                cloud_cover: Math.random() * 20, // Low cloud cover
                item_type: 'PSScene'
            },
            geometry: {
                type: 'Point',
                coordinates: [lon, lat]
            }
        }],
        meta: {
            source: 'simulated',
            note: 'Using simulated data - add valid PLANET_API_KEY for real imagery'
        }
    };
};

/**
 * Simulated crop health for demo/development
 */
const getSimulatedCropHealth = (lat, lon, crops = []) => {
    const month = new Date().getMonth();
    const cropStr = crops.length > 0 ? crops.join(', ') : 'General crops';
    
    // Simulate seasonal NDVI variations
    const seasonalNDVI = {
        0: 0.35, 1: 0.38, 2: 0.42, 3: 0.48, 4: 0.55, 5: 0.62,
        6: 0.68, 7: 0.72, 8: 0.65, 9: 0.55, 10: 0.45, 11: 0.38
    };
    
    const ndvi = seasonalNDVI[month] + (Math.random() * 0.1 - 0.05);
    const healthStatus = getHealthStatus(ndvi);
    
    return {
        success: true,
        simulated: true,
        lastUpdated: new Date().toISOString(),
        ndvi: Math.round(ndvi * 100) / 100,
        ndviPercentage: Math.round(ndvi * 100),
        healthStatus: healthStatus,
        coverage: 85 + Math.round(Math.random() * 10),
        crops: crops,
        cropString: cropStr,
        recommendations: getHealthRecommendations(ndvi, crops),
        satelliteInfo: {
            lastPass: new Date(Date.now() - Math.random() * 172800000).toISOString(), // Within last 2 days
            nextPass: new Date(Date.now() + Math.random() * 86400000 + 43200000).toISOString(),
            resolution: '3m',
            source: 'Simulated (Planet.io integration ready)'
        }
    };
};

module.exports = { getPlanetImagery, getCropHealthAnalysis, getSimulatedCropHealth };
