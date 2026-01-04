/**
 * ElevenLabs Text-to-Speech Service for KisaanSathi
 * Supports multilingual speech synthesis (Hindi, English, Hinglish)
 * Falls back to Google TTS if ElevenLabs fails
 */

const googleTTS = require('google-tts-api');

// ElevenLabs API configuration
// Set your API key in .env file as ELEVENLABS_API_KEY
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Check if ElevenLabs is configured
const isElevenLabsConfigured = !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.startsWith('sk_');

if (!isElevenLabsConfigured) {
    console.log('[TTS Service] ⚠️ ElevenLabs API key not configured. Using Google TTS only.');
    console.log('[TTS Service] Set ELEVENLABS_API_KEY in .env to enable premium TTS.');
} else {
    console.log('[TTS Service] ✅ ElevenLabs configured');
}

// Recommended voices for Hindi/Hinglish (ElevenLabs multilingual voices)
const VOICE_IDS = {
    female: 'EXAVITQu4vr4xnSDxMaL', // Sarah - clear, friendly
    male: 'pNInz6obpgDQGcFmaJgB', // Adam - warm, professional
    default: 'EXAVITQu4vr4xnSDxMaL'
};

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @returns {Promise<Buffer>} Audio buffer (MP3)
 */
async function elevenLabsTTS(text, options = {}) {
    const {
        voiceId = VOICE_IDS.default,
        stability = 0.65,
        similarityBoost = 0.75,
        style = 0.45,
        speakerBoost = true
    } = options;

    console.log(`[TTS Service] ElevenLabs: Converting "${text.substring(0, 50)}..."`);

    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2', // Best for Hindi-English
            voice_settings: {
                stability: stability,
                similarity_boost: similarityBoost,
                style: style,
                use_speaker_boost: speakerBoost
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS Service] ElevenLabs audio generated, size: ${audioBuffer.byteLength} bytes`);
    
    return Buffer.from(audioBuffer);
}

/**
 * Convert text to speech and return as base64 (ElevenLabs with Google fallback)
 * @param {string} text - Text to convert
 * @param {Object} options - TTS options
 * @returns {Promise<{audio: string, format: string, source: string}>}
 */
async function textToSpeechBase64(text, options = {}) {
    // Try ElevenLabs if configured
    if (isElevenLabsConfigured) {
        try {
            const audioBuffer = await elevenLabsTTS(text, options);
            const base64Audio = audioBuffer.toString('base64');
            
            return {
                success: true,
                audio: `data:audio/mpeg;base64,${base64Audio}`,
                format: 'audio/mpeg',
                source: 'elevenlabs',
                size: audioBuffer.length
            };
        } catch (error) {
            console.error('[TTS Service] ElevenLabs failed, using Google TTS fallback:', error.message);
        }
    }
    
    // Fallback to Google TTS
    const lang = options.language === 'en' ? 'en' : 'hi';
    const url = getTTSUrl(text, lang);
    
    if (url) {
        return {
            success: true,
            audio: url,
            format: 'audio/mpeg',
            source: 'google',
            isUrl: true
        };
    }
    
    return {
        success: false,
        error: 'TTS service unavailable'
    };
}

/**
 * Generate a TTS URL using Google TTS (fallback)
 * @param {string} text - Text to convert
 * @param {string} lang - Language code ('hi' or 'en')
 * @returns {string|null} Audio URL
 */
const getTTSUrl = (text, lang = 'hi') => {
    try {
        if (!text) return null;

        // Clean text for TTS (remove markdown, emojis)
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
            .replace(/[📋💰🌾🛡️🌤️✅❌🔄🙏]/g, '') // Remove emojis
            .substring(0, 500); // Limit length

        const url = googleTTS.getAudioUrl(cleanText, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
        });

        return url;
    } catch (error) {
        console.error('[TTS Service] Google TTS error:', error.message);
        return null;
    }
};

/**
 * Get available ElevenLabs voices
 * @returns {Promise<Array>} List of available voices
 */
async function getVoices() {
    try {
        const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.status}`);
        }

        const data = await response.json();
        return data.voices || [];
    } catch (error) {
        console.error('[TTS Service] Error fetching voices:', error.message);
        return [];
    }
}

/**
 * Get ElevenLabs subscription info (character quota)
 * @returns {Promise<Object>} Subscription info
 */
async function getSubscriptionInfo() {
    try {
        const response = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch subscription: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[TTS Service] Error fetching subscription:', error.message);
        return null;
    }
}

module.exports = { 
    getTTSUrl, 
    textToSpeechBase64,
    elevenLabsTTS,
    getVoices,
    getSubscriptionInfo,
    VOICE_IDS 
};
