const axios = require('axios');

/**
 * Weather Service using Open-Meteo API (FREE, No API Key Required, REAL DATA)
 * Docs: https://open-meteo.com/en/docs
 */
const getWeatherForecast = async (lat, lon) => {
    try {
        console.log(`[Weather] Fetching 7-day forecast for ${lat}, ${lon} from Open-Meteo`);

        // Open-Meteo API - Free, no API key, real weather data
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast`,
            {
                params: {
                    latitude: lat,
                    longitude: lon,
                    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,weathercode,windspeed_10m_max',
                    current_weather: true,
                    timezone: 'Asia/Kolkata',
                    forecast_days: 7
                },
                timeout: 10000
            }
        );

        console.log('[Weather] Open-Meteo response received');

        // Transform Open-Meteo format to our expected format
        const data = response.data;
        const daily = data.daily;

        const timelines = {
            daily: daily.time.map((date, i) => ({
                time: date,
                values: {
                    temperatureAvg: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2),
                    temperatureMax: daily.temperature_2m_max[i],
                    temperatureMin: daily.temperature_2m_min[i],
                    cloudCover: getCloudCoverFromWeatherCode(daily.weathercode[i]),
                    precipitationProbability: daily.precipitation_sum[i] > 0 ? 70 : 10,
                    rainIntensityAvg: daily.rain_sum[i] || 0,
                    windSpeed: daily.windspeed_10m_max[i],
                    weatherCode: daily.weathercode[i],
                    condition: getConditionFromWeatherCode(daily.weathercode[i])
                }
            }))
        };

        // Add current weather
        if (data.current_weather) {
            timelines.current = {
                temperature: data.current_weather.temperature,
                windSpeed: data.current_weather.windspeed,
                weatherCode: data.current_weather.weathercode,
                isDay: data.current_weather.is_day
            };
        }

        return { timelines };
    } catch (error) {
        console.error('[Weather] Open-Meteo API Error:', error.message);
        throw new Error('Failed to fetch weather data: ' + error.message);
    }
};

// Convert WMO weather codes to cloud cover percentage
const getCloudCoverFromWeatherCode = (code) => {
    if (code <= 1) return 10;  // Clear
    if (code <= 3) return 40;  // Partly cloudy
    if (code <= 48) return 80; // Foggy/Cloudy
    return 90; // Rainy/Stormy
};

// Convert WMO weather codes to readable conditions
const getConditionFromWeatherCode = (code) => {
    if (code === 0) return 'Clear Sky';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 55) return 'Drizzle';
    if (code <= 65) return 'Rainy';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Rain Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
};

module.exports = { getWeatherForecast };
