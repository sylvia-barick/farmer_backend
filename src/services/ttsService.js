const googleTTS = require('google-tts-api');

/**
 * Generate a TTS URL for the given text and language.
 * Default language to Hindi ('hi') as requested.
 */
const getTTSUrl = (text, lang = 'hi') => {
    try {
        if (!text) return null;

        // Google TTS has a 200 character limit per request for the free API
        // For longer text, we'd need to split it, but for a chatbot response, we often keep it concise.
        const url = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
        });

        return url;
    } catch (error) {
        console.error('TTS Generation Error:', error);
        return null;
    }
};

module.exports = { getTTSUrl };
