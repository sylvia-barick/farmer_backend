const express = require('express');
const router = express.Router();
const { chatWithAgent, executeWorkflow, getWorkflows } = require('../controllers/mastraController');

// Chat with the Farmer Assistant Agent
router.post('/chat', chatWithAgent);

// Execute a specific workflow
router.post('/workflow', executeWorkflow);

// Get available workflows
router.get('/workflows', getWorkflows);

module.exports = router;
