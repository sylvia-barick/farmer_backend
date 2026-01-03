const mongoose = require('mongoose');

const InsuranceClaimSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    provider: {
        type: String,
        required: true
    },
    uin: String,
    policyNumber: String,
    authenticityScore: Number,
    damageConfidence: Number,
    damagePrediction: String,
    status: {
        type: String,
        default: 'Under Review',
        enum: ['Under Review', 'Approved', 'Rejected']
    },
    aiReasoning: String, // AI's explanation for the decision
    claimAmount: String, // Optional, can be added later
    submissionDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('InsuranceClaim', InsuranceClaimSchema);