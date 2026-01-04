const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

/**
 * Transcribe audio using Groq's Whisper Large V3 Turbo model
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} filename - Original filename with extension
 * @param {string} language - Optional language code (e.g., 'hi' for Hindi, 'en' for English)
 * @returns {Promise<{text: string, language: string}>}
 */
const transcribeAudio = async (audioBuffer, filename, language = null) => {
    try {
        console.log(`[Speech Service] Transcribing audio: ${filename}, size: ${audioBuffer.length} bytes`);
        
        // Create a temporary file (Groq SDK requires file path or File object)
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${filename}`);
        fs.writeFileSync(tempFilePath, audioBuffer);
        
        try {
            // Use Whisper Large V3 Turbo for speech-to-text
            const transcription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "whisper-large-v3-turbo",
                language: language || undefined, // Auto-detect if not specified
                response_format: "verbose_json", // Get detailed response with language info
            });
            
            console.log(`[Speech Service] Transcription successful: "${transcription.text?.substring(0, 50)}..."`);
            
            return {
                text: transcription.text || '',
                language: transcription.language || 'unknown',
                duration: transcription.duration || 0,
                segments: transcription.segments || []
            };
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }
    } catch (error) {
        console.error('[Speech Service] Transcription error:', error.message);
        throw new Error(`Speech transcription failed: ${error.message}`);
    }
};

/**
 * Transcribe audio from base64 string
 * @param {string} base64Audio - Base64 encoded audio data
 * @param {string} mimeType - Audio MIME type (e.g., 'audio/webm', 'audio/wav')
 * @param {string} language - Optional language code
 * @returns {Promise<{text: string, language: string}>}
 */
const transcribeBase64Audio = async (base64Audio, mimeType = 'audio/webm', language = null) => {
    try {
        // Extract base64 data if it includes data URL prefix
        let base64Data = base64Audio;
        if (base64Audio.includes(',')) {
            base64Data = base64Audio.split(',')[1];
        }
        
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(base64Data, 'base64');
        
        // Determine file extension from MIME type
        const extensionMap = {
            'audio/webm': 'webm',
            'audio/wav': 'wav',
            'audio/mp3': 'mp3',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg',
            'audio/flac': 'flac',
            'audio/m4a': 'm4a'
        };
        
        const extension = extensionMap[mimeType] || 'webm';
        const filename = `recording.${extension}`;
        
        return await transcribeAudio(audioBuffer, filename, language);
    } catch (error) {
        console.error('[Speech Service] Base64 transcription error:', error.message);
        throw error;
    }
};

module.exports = {
    transcribeAudio,
    transcribeBase64Audio
};
