const axios = require('axios');

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_BASE_URL = 'https://google.serper.dev';

/**
 * Fetch latest agricultural news using Serper API
 * @returns {Promise<Array>} Array of news articles
 */
const getAgriculturalNews = async () => {
    try {
        const response = await axios.post(
            `${SERPER_BASE_URL}/news`,
            {
                q: "indian agriculture farming news",
                num: 10,
                gl: "in", // India
                hl: "en"
            },
            {
                headers: {
                    'X-API-KEY': SERPER_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Transform Serper response to match our frontend format
        const news = response.data.news || [];
        return news.map(article => ({
            title: article.title,
            snippet: article.snippet,
            link: article.link,
            source: article.source,
            date: article.date,
            imageUrl: article.imageUrl
        }));
    } catch (error) {
        console.error('Serper API Error (News):', error.response?.data || error.message);
        throw new Error('Failed to fetch agricultural news');
    }
};

/**
 * Get farm insights based on location and crops
 * @param {string} location - Location of the farm
 * @param {Array<string>} crops - List of crops grown
 * @returns {Promise<Array>} Array of relevant insights
 */
const getFarmInsights = async (location, crops) => {
    try {
        const cropsQuery = crops.join(' ');
        const query = `${location} ${cropsQuery} farming tips best practices`;

        const response = await axios.post(
            `${SERPER_BASE_URL}/search`,
            {
                q: query,
                num: 5,
                gl: "in",
                hl: "en"
            },
            {
                headers: {
                    'X-API-KEY': SERPER_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const results = response.data.organic || [];
        return results.map(result => ({
            title: result.title,
            snippet: result.snippet,
            link: result.link
        }));
    } catch (error) {
        console.error('Serper API Error (Insights):', error.response?.data || error.message);
        throw new Error('Failed to fetch farm insights');
    }
};

module.exports = { getAgriculturalNews, getFarmInsights };
