const promptFn = require('../prompts/chat.prompt');
const { searchSimilar } = require('../../services/ragService');

module.exports = {
    execute: async (data, userPrompt) => {
        // RAG: Chatbot knowledge base
        const chatContext = await searchSimilar(userPrompt || data?.message, 'chatbot_knowledge');
        const contextText = chatContext.map(c => `[Info: ${c.text}]`).join('\n');

        return {
            prompt: promptFn({ data, userPrompt, context: contextText }),
            model: "meta-llama/llama-4-maverick-17b-128e-instruct", // User Preferred Model
            responseParams: { json: false }
        };
    }
};
