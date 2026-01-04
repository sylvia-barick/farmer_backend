const express = require('express');
const router = express.Router();
const multer = require('multer');
const speechController = require('../controllers/speechController');

// Configure multer for audio file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB max (Whisper limit)
    },
    fileFilter: (req, file, cb) => {
        // Accept common audio formats
        const allowedMimes = [
            'audio/webm',
            'audio/wav',
            'audio/mp3',
            'audio/mpeg',
            'audio/ogg',
            'audio/flac',
            'audio/m4a',
            'audio/mp4'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`));
        }
    }
});

// POST /api/speech/transcribe - Transcribe audio file
router.post('/transcribe', upload.single('audio'), speechController.transcribeAudioFile);

// POST /api/speech/transcribe-base64 - Transcribe base64 encoded audio
router.post('/transcribe-base64', speechController.transcribeBase64);

module.exports = router;
