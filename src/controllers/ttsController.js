/**
 * Text-to-Speech Controller for KisaanSathi
 * Uses ElevenLabs with Google TTS fallback
 */

const { textToSpeechBase64, getVoices, getSubscriptionInfo, VOICE_IDS } = require('../services/ttsService');

/**
 * Convert text to speech
 * @route POST /api/tts/synthesize
 */
const synthesizeSpeech = async (req, res) => {
    try {
        const { text, language, voiceId, voiceType } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        // Select voice based on voiceType or use provided voiceId
        let selectedVoiceId = voiceId;
        if (!selectedVoiceId && voiceType) {
            selectedVoiceId = VOICE_IDS[voiceType] || VOICE_IDS.default;
        }

        console.log(`[TTS Controller] Synthesizing: "${text.substring(0, 50)}...", lang: ${language}`);

        const result = await textToSpeechBase64(text, {
            voiceId: selectedVoiceId,
            language: language || 'hi'
        });

        return res.json(result);
    } catch (error) {
        console.error('[TTS Controller] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to synthesize speech'
        });
    }
};

/**
 * Get available voices
 * @route GET /api/tts/voices
 */
const listVoices = async (req, res) => {
    try {
        const voices = await getVoices();
        
        // Filter to show only relevant voices
        const relevantVoices = voices.map(v => ({
            voice_id: v.voice_id,
            name: v.name,
            category: v.category,
            labels: v.labels,
            preview_url: v.preview_url
        }));

        return res.json({
            success: true,
            voices: relevantVoices,
            recommended: VOICE_IDS
        });
    } catch (error) {
        console.error('[TTS Controller] Error fetching voices:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get subscription/quota info
 * @route GET /api/tts/quota
 */
const getQuota = async (req, res) => {
    try {
        const info = await getSubscriptionInfo();
        
        if (!info) {
            return res.status(500).json({
                success: false,
                message: 'Could not fetch quota info'
            });
        }

        return res.json({
            success: true,
            characterCount: info.character_count,
            characterLimit: info.character_limit,
            remainingCharacters: info.character_limit - info.character_count,
            tier: info.tier
        });
    } catch (error) {
        console.error('[TTS Controller] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    synthesizeSpeech,
    listVoices,
    getQuota
};
