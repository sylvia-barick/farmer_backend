const LoanApplication = require('../models/loanModel');
const User = require('../models/userModel');
const { predictLoanEligibility } = require('../services/eligibilityService');
const { calculateLoanFraudRisk } = require('../services/fraudDetectionService');

// --- Helper Functions ---

const calculateFraudRisk = async (data) => {
    // Use enhanced fraud detection service
    const fraudAnalysis = await calculateLoanFraudRisk(data);
    return fraudAnalysis;
};


const submitLoan = async (req, res) => {
    try {
        const data = req.body;
        console.log("Received Loan Application:", data);

        // Prepare loan data with proper field mapping
        const loanData = {
            firebaseUid: data.farmerUid || data.firebaseUid, // Accept both field names
            cropType: data.cropType,
            loanPurpose: data.loanPurpose,
            requestedAmount: data.requestedAmount,
            tenureMonths: data.tenureMonths,
            acres: data.acres || data.landSize, // Use acres if provided, otherwise landSize
            landSize: data.landSize || data.acres
        };

        // Try to fetch user data if Firebase UID is provided
        if (loanData.firebaseUid) {
            try {
                const user = await User.findOne({ firebaseUid: loanData.firebaseUid });
                if (user) {
                    loanData.farmerUid = user._id; // Store MongoDB ObjectId reference
                    loanData.farmerName = user.name || 'Unknown';
                    loanData.acres = loanData.acres || user.landSizeAcres;
                    loanData.landSize = loanData.landSize || user.landSizeAcres;
                    if (user.location && user.location.latitude && user.location.longitude) {
                        loanData.farmLocation = {
                            lat: user.location.latitude,
                            lng: user.location.longitude
                        };
                    }
                }
            } catch (userError) {
                console.warn('Could not fetch user data:', userError.message);
                // Continue without user data
            }
        }

        // Set default values if still missing
        if (!loanData.farmerName) {
            loanData.farmerName = 'Farmer'; // Default fallback
        }
        if (!loanData.acres && !loanData.landSize) {
            loanData.acres = 5; // Default fallback
            loanData.landSize = 5;
        }

        // 1. Calculate Fraud Risk
        const fraudAnalysis = await calculateFraudRisk(loanData);
        console.log(`Fraud Risk Analysis:`, fraudAnalysis);

        // 2. Predict Eligibility
        const eligibilityPrediction = await predictLoanEligibility({
            ...loanData,
            fraudRiskScore: fraudAnalysis.fraudRiskScore
        });
        console.log('Eligibility Prediction:', eligibilityPrediction);

        const status = 'PENDING';

        const newLoan = new LoanApplication({
            ...loanData,
            fraudRiskScore: fraudAnalysis.fraudRiskScore,
            fraudReason: fraudAnalysis.reasoning,
            fraudRiskLevel: fraudAnalysis.riskLevel,
            fraudRiskFactors: fraudAnalysis.riskFactors,
            eligibilityScore: eligibilityPrediction.eligibilityScore,
            eligibilityReasoning: eligibilityPrediction.eligibilityReasoning,
            predictedEligible: eligibilityPrediction.predictedEligible,
            featureVector: eligibilityPrediction.featureVector,
            status: status
        });

        await newLoan.save();

        console.log("Loan Application Saved:", newLoan._id);

        res.json({
            success: true,
            id: newLoan._id,
            message: "Loan submitted for admin review.",
            status: status,
            fraudRiskScore: fraudAnalysis.fraudRiskScore,
            fraudRiskLevel: fraudAnalysis.riskLevel,
            fraudReasoning: fraudAnalysis.reasoning,
            requiresManualReview: fraudAnalysis.requiresManualReview,
            eligibilityScore: eligibilityPrediction.eligibilityScore,
            predictedEligible: eligibilityPrediction.predictedEligible,
            eligibilityReasoning: eligibilityPrediction.eligibilityReasoning
        });
    } catch (error) {
        console.error("Loan Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const submitCropSelection = async (req, res) => {
    res.json({ success: true, message: "Crop selected" });
};

const getAllLoans = async (req, res) => {
    try {
        const loans = await LoanApplication.find().sort({ createdAt: -1 });
        res.json({ success: true, loans });
    } catch (error) {
        console.error("Error fetching loans:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getUserLoans = async (req, res) => {
    try {
        const { uid } = req.params;
        console.log(`[getUserLoans] Fetching loans for UID: ${uid}`);
        
        // Search by both firebaseUid and MongoDB ObjectId
        const loans = await LoanApplication.find({
            $or: [
                { firebaseUid: uid },
                { farmerUid: uid }
            ]
        }).sort({ createdAt: -1 });
        
        console.log(`[getUserLoans] Found ${loans.length} loans for UID: ${uid}`);
        if (loans.length === 0) {
            // Debug: Show what UIDs exist in DB
            const sampleLoans = await LoanApplication.find({}).select('firebaseUid farmerUid').limit(5);
            console.log('[getUserLoans] Sample UIDs in database:', sampleLoans.map(l => ({ firebaseUid: l.firebaseUid, farmerUid: l.farmerUid })));
        }
        
        res.json({ success: true, loans });
    } catch (error) {
        console.error("Error fetching user loans:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateLoanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        let updateData = { status };

        if (status === 'APPROVED') {
            const existingLoan = await LoanApplication.findById(id);
            if (existingLoan) {
                // Disburse Amount Logic
                updateData.disbursedAmount = existingLoan.requestedAmount;
                console.log(`Loan Approved. Disbursed: ₹${existingLoan.requestedAmount}`);
            }
        }

        const updatedLoan = await LoanApplication.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedLoan) return res.status(404).json({ success: false, message: "Loan not found" });
        res.json({ success: true, loan: updatedLoan });
    } catch (error) {
        console.error("Error updating loan status:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}


const deleteLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedLoan = await LoanApplication.findByIdAndDelete(id);
        if (!deletedLoan) return res.status(404).json({ success: false, message: "Loan not found" });
        res.json({ success: true, message: "Loan deleted successfully" });
    } catch (error) {
        console.error("Error deleting loan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const predictLoanEligibilityEndpoint = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch the loan
        const loan = await LoanApplication.findById(id);
        if (!loan) {
            return res.status(404).json({ success: false, message: "Loan not found" });
        }

        // Predict eligibility
        const prediction = await predictLoanEligibility({
            requestedAmount: loan.requestedAmount,
            tenureMonths: loan.tenureMonths,
            acres: loan.acres || loan.landSize,
            fraudRiskScore: loan.fraudRiskScore,
            cropType: loan.cropType,
            loanPurpose: loan.loanPurpose
        });

        // Update the loan with prediction results
        const updatedLoan = await LoanApplication.findByIdAndUpdate(
            id,
            {
                eligibilityScore: prediction.eligibilityScore,
                eligibilityReasoning: prediction.eligibilityReasoning,
                predictedEligible: prediction.predictedEligible,
                featureVector: prediction.featureVector
            },
            { new: true }
        );

        res.json({
            success: true,
            loan: updatedLoan,
            prediction
        });
    } catch (error) {
        console.error("Error predicting eligibility:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    submitLoan, 
    submitCropSelection, 
    getAllLoans, 
    getUserLoans, 
    updateLoanStatus, 
    deleteLoan,
    predictLoanEligibilityEndpoint
};
