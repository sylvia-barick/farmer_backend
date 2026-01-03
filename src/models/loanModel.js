const mongoose = require('mongoose');

const LoanApplicationSchema = new mongoose.Schema({
    farmerUid: {
        type: String, // Changed from ObjectId to String to match Frontend payload
        required: true,
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
        required: false,
        default: 5
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
    blockchainTxHash: {
        type: String,
        default: null
    },
    smartContractAddress: {
        type: String,
        default: null
    },
    tokenId: {
        type: String,
        default: null
    },
    disbursedAmount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'loanApplication' });

module.exports = mongoose.model('LoanApplication', LoanApplicationSchema);
