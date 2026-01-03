const promptFn = require('../prompts/farmSummary.prompt');

module.exports = {
    execute: async (data) => {
        return {
            prompt: promptFn({ data }),
            model: "meta-llama/llama-4-maverick-17b-128e-instruct", // User preferred model
            responseParams: { json: false }
        };
    }
};
