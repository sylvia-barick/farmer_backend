/**
 * Policy Summary Strategy
 * Analyzes insurance policy documents using Llama 4 Maverick VLM
 */

const policyAnalysisPrompt = require('../prompts/policyAnalysis');

module.exports = {
    execute: async (data) => {
        const { policyText } = data;

        if (!policyText || policyText.trim().length === 0) {
            throw new Error('Policy text is required for analysis');
        }

        const prompt = policyAnalysisPrompt(policyText);

        return {
            prompt,
            model: "meta-llama/llama-4-maverick-17b-128e-instruct", // VLM for document analysis
            responseParams: { json: false }
        };
    }
};
