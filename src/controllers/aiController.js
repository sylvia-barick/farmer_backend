const groqService = require('../services/groqService');
const strategies = require('../ai/strategies');
const { storeDocument } = require('../services/ragService');
const ttsService = require('../services/ttsService');

const DEFAULT_MODEL = "llama3-70b-8192";
const FALLBACK_MODEL = "llama3-8b-8192";

const analyzeCrop = async (req, res) => {
    const { type, data, prompt: userPrompt, lang = 'hi' } = req.body;
    console.log(`[AI Controller] Received request: Type=${type}, Lang=${lang}`);

    try {
        // 1. Handle Feedback
        if (type === 'feedback') {
            // ... existing feedback logic ...
            if (data.originalPrompt && data.userRating) {
                const feedbackText = `Q: ${data.originalPrompt} | Rating: ${data.userRating}/5`;
                await storeDocument(`FB_${Date.now()}`, feedbackText, { rating: data.userRating }, 'feedback');
                return res.json({ success: true, message: "Feedback recorded." });
            }
            return res.status(400).json({ success: false, message: "Invalid feedback data" });
        }

        // 2. Select Strategy
        const strategy = strategies[type];
        if (!strategy) {
            return res.status(400).json({ success: false, message: `Unknown task type: ${type}` });
        }

        // 3. Execute Strategy
        const { prompt, model, image, responseParams } = await strategy.execute(data, userPrompt);

        // 4. Call AI Model
        let analysis;
        try {
            analysis = await groqService.getGroqAnalysis(prompt, model || DEFAULT_MODEL, image);
        } catch (err) {
            console.warn(`[AI Controller] Primary model failed, trying fallback...`, err.message);
            analysis = await groqService.getGroqAnalysis(prompt, FALLBACK_MODEL, image);
        }

        // 5. Generate TTS (if text interaction)
        let ttsUrl = null;
        if (type === 'chat' || type === 'disease' || type === 'farm-summary') {
            // Generate TTS for the first 200 chars (limitation of free API)
            ttsUrl = ttsService.getTTSUrl(analysis.substring(0, 200), lang);
        }

        return res.json({ success: true, analysis, ttsUrl });

    } catch (error) {
        console.error("AI Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { analyzeCrop };

