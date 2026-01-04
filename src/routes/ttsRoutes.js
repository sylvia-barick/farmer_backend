/**
 * Text-to-Speech Routes for KisaanSathi
 */

const express = require('express');
const router = express.Router();
const { synthesizeSpeech, listVoices, getQuota } = require('../controllers/ttsController');

// POST /api/tts/synthesize - Convert text to speech
router.post('/synthesize', synthesizeSpeech);

// GET /api/tts/voices - List available voices
router.get('/voices', listVoices);

// GET /api/tts/quota - Get character quota/usage
router.get('/quota', getQuota);

module.exports = router;
