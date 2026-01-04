const mongoose = require('mongoose');

const InsuranceClaimSchema = new mongoose.Schema({
    // Firebase UID (string) - primary identifier from authentication
    firebaseUid: {
        type: String,
        required: false,
        index: true
    },
    // MongoDB ObjectId reference (optional, for users who exist in User collection)
    userId: {
        type: String,
        required: false,
        index: true
    },
    farmerName: {
        type: String,
        required: false
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
    fraudRiskScore: {
        type: Number,
        default: 0
    },
    fraudReason: {
        type: String,
        default: null
    },
    fraudRiskLevel: {
        type: String,
        enum: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'EXTREME_RISK'],
        default: 'LOW_RISK'
    },
    claimAmount: {
        type: Number,
        default: 0
    }, // Claim amount in rupees
    submissionDate: {
        type: Date,
        default: Date.now
    },
    // Eligibility prediction fields
    eligibilityScore: {
        type: Number,
        default: null // 0-100 confidence score for eligibility
    },
    eligibilityReasoning: {
        type: String,
        default: null // Explanation for the eligibility decision
    },
    predictedEligible: {
        type: Boolean,
        default: null // true/false based on confidence threshold
    },
    // Vector embeddings for similarity-based prediction
    featureVector: {
        type: [Number],
        default: null // Array of numeric features for ML prediction
    }
}, { timestamps: true });

module.exports = mongoose.model('InsuranceClaim', InsuranceClaimSchema);