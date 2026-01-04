const axios = require('axios');

// Mastra server configuration
const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || 'http://localhost:4111';

// Simple request queue to prevent rate limiting
// Limits concurrent requests to Groq API through Mastra
class RequestQueue {
    constructor(maxConcurrent = 2, requestsPerMinute = 20) {
        this.maxConcurrent = maxConcurrent;
        this.requestsPerMinute = requestsPerMinute;
        this.activeRequests = 0;
        this.queue = [];
        this.requestTimestamps = [];
        this.lastRateLimit = null;
    }

    async execute(fn, retries = 5) {
        // Check if we're in rate limit recovery
        if (this.lastRateLimit && Date.now() - this.lastRateLimit < 60000) {
            const waitTime = 60000 - (Date.now() - this.lastRateLimit);
            console.log(`[Queue] Rate limit recovery, waiting ${Math.round(waitTime)}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.lastRateLimit = null;
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject, retries, attempt: 0 });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
            return;
        }

        // Rate limiting check
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
        
        if (this.requestTimestamps.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimestamps[0];
            const waitTime = 60000 - (now - oldestRequest) + 100;
            console.log(`[Queue] Rate limit threshold reached, waiting ${Math.round(waitTime)}ms...`);
            
            setTimeout(() => this.processQueue(), waitTime);
            return;
        }

        const { fn, resolve, reject, retries, attempt } = this.queue.shift();
        this.activeRequests++;
        this.requestTimestamps.push(now);

        try {
            const result = await fn();
            this.activeRequests--;
            resolve(result);
        } catch (error) {
            this.activeRequests--;
            
            const isRateLimit = error.response?.status === 429 || 
                error.message?.includes('rate limit') ||
                error.message?.includes('Rate limit') ||
                error.response?.data?.error?.includes('rate');
            
            const isRetryable = isRateLimit || 
                error.response?.status === 503 || 
                error.response?.status === 504 ||
                error.code === 'ECONNABORTED' ||
                error.message?.includes('timeout');

            if (isRetryable && attempt < retries) {
                // Exponential backoff
                const backoffTime = Math.min(2000 * Math.pow(2, attempt), 32000) + Math.random() * 1000;
                console.log(`[Queue] Retrying request (${attempt + 1}/${retries}) after ${Math.round(backoffTime)}ms due to: ${isRateLimit ? 'rate limit' : 'timeout/error'}`);
                
                if (isRateLimit) {
                    this.lastRateLimit = Date.now();
                }

                setTimeout(() => {
                    this.queue.unshift({ fn, resolve, reject, retries, attempt: attempt + 1 });
                    this.processQueue();
                }, backoffTime);
            } else {
                reject(error);
            }
        }

        // Continue processing queue
        setImmediate(() => this.processQueue());
    }
}

// Global request queue instance
const requestQueue = new RequestQueue(2, 20); // 2 concurrent, 20 per minute max

/**
 * Handle chat interactions with the Mastra Farmer Assistant Agent via HTTP
 * @route POST /api/mastra/chat
 */
const chatWithAgent = async (req, res) => {
    try {
        const { message, userId, threadId, lang = 'en' } = req.body;

        // Validate required fields
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID (Firebase UID) is required'
            });
        }

        console.log(`[Mastra Chat] User: ${userId}, Message: ${message.substring(0, 50)}...`);

        // Generate or use existing thread ID
        // Validate that threadId matches userId to prevent thread mismatch errors
        let conversationThreadId = threadId;
        
        if (threadId) {
            // Check if threadId belongs to this user
            const threadUserId = threadId.split('-')[1]; // Extract userId from "farmer-{userId}-{timestamp}"
            if (threadUserId !== userId) {
                console.log(`[Mastra Chat] Thread mismatch detected: thread user=${threadUserId}, current user=${userId}. Creating new thread.`);
                conversationThreadId = `farmer-${userId}-${Date.now()}`;
            }
        } else {
            conversationThreadId = `farmer-${userId}-${Date.now()}`;
        }

        // Use request queue to prevent rate limiting
        const response = await requestQueue.execute(async () => {
            return await axios.post(`${MASTRA_SERVER_URL}/api/agents/farmerAssistantAgent/generate`, {
                messages: [
                    {
                        role: 'system',
                        content: `Current user's Firebase UID is: ${userId}. Use this as the userId when calling tools that require it.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                threadId: conversationThreadId,
                resourceId: userId
            }, {
                timeout: 90000, // 90 second timeout for agent with potential tool calls
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }, 5); // 5 retries for chat

        // Extract the text response
        let agentResponse = response.data?.text || response.data?.message || response.data?.response || 'I apologize, but I could not process your request at this time.';

        // Clean up response - remove any tool call syntax that leaked through
        agentResponse = agentResponse.replace(/<function=[^>]+>.*?<function>/gs, '');
        agentResponse = agentResponse.replace(/<function[^>]*>/g, '');
        agentResponse = agentResponse.replace(/{"farmerName":[^}]+}/g, '');
        
        // Remove leaked tool call patterns like "loanWorkflowTool {...}"
        agentResponse = agentResponse.replace(/\b(loanWorkflowTool|dbTool|weatherTool|plantDiseaseTool|insuranceGuideTool|cropAdvisoryTool|govtSchemeTool|loanEligibilityTool)\s*\{[^}]*\}/g, '');
        
        // Remove any JSON objects that look like tool calls or responses
        agentResponse = agentResponse.replace(/\{["\']?(userId|message|success|cropType)["\']?\s*:/g, '');
        
        // Clean up multiple newlines
        agentResponse = agentResponse.replace(/\n{3,}/g, '\n\n');
        agentResponse = agentResponse.trim();
        
        if (!agentResponse) {
            agentResponse = 'Processing your request...';
        }

        console.log(`[Mastra Chat] Response generated for user ${userId}`);

        return res.json({
            success: true,
            response: agentResponse,
            threadId: conversationThreadId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Mastra Controller] Error:', error.message);
        if (error.response) {
            console.error('[Mastra Controller] Response data:', error.response.data);
            console.error('[Mastra Controller] Response status:', error.response.status);
        }
        
        // Check if Mastra server is not running
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Mastra service is not available. Please start it with: cd ai && npm run dev',
                error: 'Service Unavailable'
            });
        }

        // Check if rate limit error
        const isRateLimit = error.response?.status === 429 || 
            error.message?.includes('rate limit') ||
            error.message?.includes('Rate limit');

        if (isRateLimit) {
            return res.status(429).json({
                success: false,
                message: 'AI service rate limit exceeded. Groq API quota has been reached. Please try again in a few minutes.',
                error: 'Rate Limited',
                suggestion: 'Upgrade your Groq API plan at https://console.groq.com/billing/overview for higher limits'
            });
        }

        // Check if timeout occurred
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return res.status(504).json({
                success: false,
                message: 'Request timed out. The AI service is taking too long to respond. Please try again in a moment.',
                error: 'Gateway Timeout',
                suggestion: 'If this persists, try restarting the Mastra server or simplifying your request'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to process chat request',
            details: error.response?.data || undefined,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Execute a specific Mastra workflow via HTTP
 * @route POST /api/mastra/workflow
 */
const executeWorkflow = async (req, res) => {
    try {
        const { workflowName, input, userId } = req.body;

        // Validate required fields
        if (!workflowName || !input || !userId) {
            return res.status(400).json({
                success: false,
                message: 'workflowName, input, and userId are required'
            });
        }

        console.log(`[Mastra Workflow] Executing ${workflowName} for user ${userId}`);

        // Use request queue to prevent rate limiting
        const result = await requestQueue.execute(async () => {
            const response = await axios.post(`${MASTRA_SERVER_URL}/api/workflows/${workflowName}/execute`, {
                triggerData: {
                    ...input,
                    userId,
                    timestamp: new Date().toISOString()
                }
            }, {
                timeout: 120000, // 120 second timeout for workflows with tool calls
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        }, 5); // 5 retries for workflows

        console.log(`[Mastra Workflow] ${workflowName} completed for user ${userId}`);

        return res.json({
            success: true,
            result,
            workflowName,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Mastra Workflow] Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Mastra service is not available. Please ensure the Mastra server is running on port 4111.',
                error: 'Service Unavailable'
            });
        }

        // Check if rate limit error
        const isRateLimit = error.response?.status === 429 || 
            error.message?.includes('rate limit') ||
            error.message?.includes('Rate limit');

        if (isRateLimit) {
            return res.status(429).json({
                success: false,
                message: 'AI service rate limit exceeded. This usually means Groq API quota has been reached. Please try again in a few minutes.',
                error: 'Rate Limited',
                suggestion: 'Consider upgrading your Groq API plan at https://console.groq.com/billing/overview'
            });
        }

        // Check if timeout
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return res.status(504).json({
                success: false,
                message: 'Workflow execution timed out. The operation took too long to complete.',
                error: 'Gateway Timeout',
                suggestion: 'Try splitting your request or restarting the Mastra server'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to execute workflow',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get available workflows via HTTP
 * @route GET /api/mastra/workflows
 */
const getWorkflows = async (req, res) => {
    try {
        const response = await axios.get(`${MASTRA_SERVER_URL}/api/workflows`, {
            timeout: 5000
        });

        return res.json({
            success: true,
            workflows: response.data
        });
    } catch (error) {
        console.error('[Mastra Workflows] Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Mastra service is not available. Please ensure the Mastra server is running on port 4111.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve workflows'
        });
    }
};

module.exports = {
    chatWithAgent,
    executeWorkflow,
    getWorkflows
};
