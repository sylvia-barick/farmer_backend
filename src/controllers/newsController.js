const serperService = require('../services/serperService');

const getAgriculturalNews = async (req, res) => {
    try {
        const articles = await serperService.getAgriculturalNews();
        res.json({ success: true, articles });
    } catch (error) {
        console.error("News Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getFarmInsights = async (req, res) => {
    try {
        const { location, crops } = req.query;
        const cropList = crops ? crops.split(',') : ['general'];
        const insights = await serperService.getFarmInsights(location || 'India', cropList);
        res.json({ success: true, data: insights });
    } catch (error) {
        console.error('Insights Controller Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getAgriculturalNews, getFarmInsights };
