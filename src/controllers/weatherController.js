const tomorrowService = require('../services/tomorrowService');

const getWeather = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ success: false, message: 'Latitude and Longitude required' });
        }

        const weatherData = await tomorrowService.getWeatherForecast(lat, lon);
        res.json({ success: true, data: weatherData });
    } catch (error) {
        console.error('Weather Controller Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getWeather };
