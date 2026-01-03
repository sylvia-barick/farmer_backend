const axios = require('axios');

const getWeatherForecast = async (lat, lon) => {
    const API_KEY = process.env.TOMORROW_API_KEY;

    if (!API_KEY) {
        console.warn('[Weather] No TOMORROW_API_KEY found, using mock data');
        return generateMockWeather();
    }

    try {
        console.log(`[Weather] Fetching forecast for ${lat}, ${lon}`);

        // Tomorrow.io v4 API - Timelines endpoint for multi-day forecast
        const response = await axios.get(
            `https://api.tomorrow.io/v4/timelines`,
            {
                params: {
                    location: `${lat},${lon}`,
                    fields: ['temperatureAvg', 'temperatureMax', 'temperatureMin', 'cloudCover', 'precipitationProbability', 'rainIntensityAvg', 'humidityAvg'],
                    timesteps: ['1d'],
                    units: 'metric',
                    apikey: API_KEY
                },
                timeout: 10000
            }
        );

        console.log('[Weather] Tomorrow.io response received');
        return response.data;
    } catch (error) {
        console.error('[Weather] Tomorrow.io API Error:', error.response?.data || error.message);

        // Return fallback mock data so dashboard still works
        console.warn('[Weather] Returning mock weather data as fallback');
        return generateMockWeather();
    }
};

const generateMockWeather = () => {
    const timelines = {
        daily: Array(7).fill(null).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            return {
                time: date.toISOString(),
                values: {
                    temperatureAvg: 25 + Math.floor(Math.random() * 10),
                    temperatureMax: 30 + Math.floor(Math.random() * 5),
                    temperatureMin: 20 + Math.floor(Math.random() * 5),
                    cloudCover: Math.floor(Math.random() * 100),
                    precipitationProbability: Math.floor(Math.random() * 60),
                    rainIntensityAvg: Math.random() * 2,
                    humidityAvg: 50 + Math.floor(Math.random() * 30)
                }
            };
        })
    };
    return { timelines };
};

module.exports = { getWeatherForecast };
