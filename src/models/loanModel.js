const mongoose = require('mongoose');

const LoanApplicationSchema = new mongoose.Schema({
    farmerUid: {
        type: String, // Changed from ObjectId to String to match Frontend payload
        required: false,
        index: true
    },
    firebaseUid: {
        type: String,
        required: false,
        index: true
    },
    farmerName: {
        type: String,
        required: false,
        default: 'Farmer'
    },
    farmLocation: {
        lat: Number,
        lng: Number
    },
    cropType: {
        type: String,
        required: false,
        default: 'General'
    },
    acres: {
        type: Number,
        required: false // Making optional, can be derived from landSize
    },
    landSize: {
        type: Number,
        required: false
    },
    loanPurpose: {
        type: String,
        required: false,
        default: 'Agriculture'
    },
    requestedAmount: {
        type: Number,
        required: true
    },
    tenureMonths: {
        type: Number,
        required: false,
        default: 12
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'],
        default: 'PENDING'
    },
    aiAssessment: {
        type: Object,
        default: null
    },
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
    fraudRiskFactors: {
        type: Array,
        default: null
    },
    disbursedAmount: {
        type: Number,
        default: 0
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
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'loanApplication' });

module.exports = mongoose.model('LoanApplication', LoanApplicationSchema);
