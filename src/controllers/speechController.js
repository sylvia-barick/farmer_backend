const { transcribeAudio, transcribeBase64Audio } = require('../services/speechService');

/**
 * Transcribe audio file to text using Whisper
 * @route POST /api/speech/transcribe
 */
const transcribeAudioFile = async (req, res) => {
    try {
        const { language } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No audio file provided'
            });
        }
        
        console.log(`[Speech Controller] Received audio file: ${file.originalname}, size: ${file.size} bytes`);
        
        const result = await transcribeAudio(file.buffer, file.originalname, language);
        
        return res.json({
            success: true,
            text: result.text,
            language: result.language,
            duration: result.duration
        });
    } catch (error) {
        console.error('[Speech Controller] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to transcribe audio'
        });
    }
};

/**
 * Transcribe base64 encoded audio to text using Whisper
 * @route POST /api/speech/transcribe-base64
 */
const transcribeBase64 = async (req, res) => {
    try {
        const { audio, mimeType, language } = req.body;
        
        if (!audio) {
            return res.status(400).json({
                success: false,
                message: 'No audio data provided'
            });
        }
        
        console.log(`[Speech Controller] Received base64 audio, mimeType: ${mimeType}`);
        
        const result = await transcribeBase64Audio(audio, mimeType || 'audio/webm', language);
        
        return res.json({
            success: true,
            text: result.text,
            language: result.language,
            duration: result.duration
        });
    } catch (error) {
        console.error('[Speech Controller] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to transcribe audio'
        });
    }
};

module.exports = {
    transcribeAudioFile,
    transcribeBase64
};
