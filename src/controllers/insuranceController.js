const groqService = require('../services/groqService');
const InsuranceClaim = require('../models/insuranceModel');
const { predictInsuranceEligibility } = require('../services/eligibilityService');
const { calculateInsuranceFraudRisk } = require('../services/fraudDetectionService');

const createClaim = async (req, res) => {
    try {
        const data = req.body;
        const files = req.files; // Multer files if uploaded (array from upload.any())

        console.log('[Insurance Claim] Received data:', data);
        console.log('[Insurance Claim] Received files:', files);

        // Prepare image data if document/photo was uploaded
        let imageBase64 = null;
        if (files && files.length > 0) {
            // upload.any() stores files in array, find the first one
            const file = files[0];
            const buffer = file.buffer;
            imageBase64 = `data:${file.mimetype};base64,${buffer.toString('base64')}`;
            console.log(`[Insurance Claim] File attached: ${file.originalname}, size: ${buffer.length} bytes`);
        }

        // Use Llama 4 Maverick 17B 180E Instruct VLM for document analysis
        const analysisPrompt = `You are an expert insurance claims adjuster analyzing an agricultural insurance claim.

Policy Details:
- Provider: ${data.provider}
- UIN: ${data.uin}
- Policy Number: ${data.policyNumber}

Task: Analyze the provided insurance document/damage photo and determine:
1. Authenticity Score (0-100): How authentic does the document/claim appear?
2. Damage Confidence (0-100): Confidence level that actual crop damage occurred
3. Damage Prediction: Brief description of the damage detected
4. Recommendation: Should this claim be "Approved", "Under Review", or "Rejected"?

Provide your analysis in JSON format:
{
  "authenticity_score": <number>,
  "damage_confidence": <number>,
  "damage_prediction": "<description>",
  "recommendation": "<status>",
  "reasoning": "<brief explanation>"
}`;

        let aiValidation;
        try {
            // Use Llama 4 Maverick VLM model for vision analysis
            const aiResponse = await groqService.getGroqAnalysis(
                analysisPrompt,
                "meta-llama/llama-4-maverick-17b-128e-instruct",
                imageBase64
            );

            // Parse AI response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiValidation = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("AI response not in expected format");
            }
        } catch (aiError) {
            console.error("AI Analysis Error:", aiError);
            // Fallback to basic validation if AI fails
            aiValidation = {
                authenticity_score: 75,
                damage_confidence: 70,
                damage_prediction: "Unable to analyze - manual review required",
                recommendation: "Under Review",
                reasoning: "AI analysis unavailable"
            };
        }

        // Prepare claim data with proper field mapping
        const claimData = {
            firebaseUid: data.firebaseUid || data.uid || data.userId,
            provider: data.provider || 'Unknown Provider',
            uin: data.uin,
            policyNumber: data.policyNumber,
            claimAmount: data.claimAmount ? Number(data.claimAmount) : 0,
            authenticityScore: aiValidation.authenticity_score,
            damageConfidence: aiValidation.damage_confidence,
            damagePrediction: aiValidation.damage_prediction,
            status: data.status || aiValidation.recommendation || 'Under Review',
            aiReasoning: aiValidation.reasoning
        };

        // Try to fetch user data if Firebase UID is provided (optional)
        if (claimData.firebaseUid) {
            try {
                const User = require('../models/userModel');
                const user = await User.findOne({ firebaseUid: claimData.firebaseUid });
                if (user) {
                    claimData.userId = user._id; // Store MongoDB ObjectId reference
                    claimData.farmerName = user.name || 'Unknown Farmer'; // Store farmer name
                }
            } catch (userError) {
                console.warn('[Insurance Controller] Could not fetch user data:', userError.message);
                // Continue without user reference
            }
        }

        // Predict eligibility based on claim characteristics
        const eligibilityPrediction = await predictInsuranceEligibility({
            claimAmount: claimData.claimAmount,
            authenticityScore: claimData.authenticityScore,
            damageConfidence: claimData.damageConfidence,
            provider: claimData.provider
        });

        // Calculate fraud risk for insurance claim
        const fraudAnalysis = await calculateInsuranceFraudRisk({
            claimAmount: claimData.claimAmount,
            authenticityScore: claimData.authenticityScore,
            damageConfidence: claimData.damageConfidence,
            provider: claimData.provider,
            damagePrediction: claimData.damagePrediction
        });

        const newClaim = new InsuranceClaim({
            ...claimData,
            fraudRiskScore: fraudAnalysis.fraudRiskScore,
            fraudReason: fraudAnalysis.reasoning,
            fraudRiskLevel: fraudAnalysis.riskLevel,
            eligibilityScore: eligibilityPrediction.eligibilityScore,
            eligibilityReasoning: eligibilityPrediction.eligibilityReasoning,
            predictedEligible: eligibilityPrediction.predictedEligible,
            featureVector: eligibilityPrediction.featureVector
        });

        const savedClaim = await newClaim.save();

        console.log('[Insurance Controller] Claim saved successfully:', savedClaim._id);

        res.json({
            success: true,
            result: aiValidation,
            claimRecord: savedClaim,
            fraudRiskScore: fraudAnalysis.fraudRiskScore,
            fraudRiskLevel: fraudAnalysis.riskLevel,
            fraudReasoning: fraudAnalysis.reasoning,
            requiresManualReview: fraudAnalysis.requiresManualReview,
            eligibilityScore: eligibilityPrediction.eligibilityScore,
            predictedEligible: eligibilityPrediction.predictedEligible,
            eligibilityReasoning: eligibilityPrediction.eligibilityReasoning,
            message: "Claim analyzed and saved using Llama 4 Maverick VLM"
        });
    } catch (error) {
        console.error("Insurance Controller Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getClaimsByUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const claims = await InsuranceClaim.find({ userId: uid }).sort({ submissionDate: -1 });
        res.json({ success: true, claims });
    } catch (error) {
        console.error("Fetch Claims Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteClaim = async (req, res) => {
    try {
        const { id } = req.params;
        await InsuranceClaim.findByIdAndDelete(id);
        res.json({ success: true, message: "Claim deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllClaims = async (req, res) => {
    try {
        const claims = await InsuranceClaim.find().sort({ submissionDate: -1 });
        res.json({ success: true, claims });
    } catch (error) {
        console.error("Fetch All Claims Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedClaim = await InsuranceClaim.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedClaim) {
            return res.status(404).json({ success: false, message: "Claim not found" });
        }

        res.json({ success: true, result: updatedClaim });
    } catch (error) {
        console.error("Update Claim Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const predictInsuranceEligibilityEndpoint = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch the claim
        const claim = await InsuranceClaim.findById(id);
        if (!claim) {
            return res.status(404).json({ success: false, message: "Claim not found" });
        }

        // Predict eligibility
        const prediction = await predictInsuranceEligibility({
            claimAmount: claim.claimAmount,
            authenticityScore: claim.authenticityScore,
            damageConfidence: claim.damageConfidence,
            provider: claim.provider
        });

        // Update the claim with prediction results
        const updatedClaim = await InsuranceClaim.findByIdAndUpdate(
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
            claim: updatedClaim,
            prediction
        });
    } catch (error) {
        console.error("Error predicting eligibility:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    createClaim, 
    getClaimsByUser, 
    deleteClaim, 
    getAllClaims, 
    updateClaimStatus,
    predictInsuranceEligibilityEndpoint
};
