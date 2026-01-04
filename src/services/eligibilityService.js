const LoanApplication = require('../models/loanModel');
const InsuranceClaim = require('../models/insuranceModel');

/**
 * Calculate vector embeddings from structured data
 * Converts loan/insurance features into numeric vectors for similarity comparison
 */
const createFeatureVector = (data, type = 'loan') => {
    if (type === 'loan') {
        return [
            data.requestedAmount ? Math.min(data.requestedAmount / 1000000, 10) : 0, // Normalize by millions
            data.tenureMonths ? data.tenureMonths / 12 : 1, // Normalize tenure in years
            data.acres ? Math.min(data.acres / 100, 10) : 0, // Land size normalized
            data.fraudRiskScore ? (100 - data.fraudRiskScore) / 100 : 0.5, // Inverse fraud score (0-1)
            data.cropType ? hashString(data.cropType) % 10 : 0, // Crop type as numeric
            data.loanPurpose ? hashString(data.loanPurpose) % 10 : 0, // Purpose as numeric
        ];
    } else if (type === 'insurance') {
        return [
            data.claimAmount ? Math.min(data.claimAmount / 500000, 10) : 0,
            data.authenticityScore ? data.authenticityScore / 100 : 0.5,
            data.damageConfidence ? data.damageConfidence / 100 : 0.5,
            data.provider ? hashString(data.provider) % 10 : 0,
            0, // Placeholder for future fields
            0, // Placeholder for future fields
        ];
    }
    return [];
};

/**
 * Simple hash function to convert strings to numbers
 */
const hashString = (str) => {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (vec1, vec2) => {
    if (!vec1 || !vec2 || vec1.length === 0 || vec2.length === 0) return 0;
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
};

/**
 * Predict loan eligibility based on historical data
 * Uses vector similarity to approved/rejected loans to calculate confidence
 */
const predictLoanEligibility = async (loanData) => {
    try {
        // Create feature vector for the new loan
        const newVector = createFeatureVector(loanData, 'loan');

        // Fetch approved and rejected loans as training data
        const approvedLoans = await LoanApplication.find({ 
            status: 'APPROVED',
            featureVector: { $exists: true, $ne: null }
        }).limit(50);

        const rejectedLoans = await LoanApplication.find({ 
            status: 'REJECTED',
            featureVector: { $exists: true, $ne: null }
        }).limit(50);

        // Calculate similarity scores
        const approvedSimilarities = approvedLoans.map(loan => 
            cosineSimilarity(newVector, loan.featureVector)
        );

        const rejectedSimilarities = rejectedLoans.map(loan => 
            cosineSimilarity(newVector, loan.featureVector)
        );

        // Calculate average similarities
        const avgApprovedSimilarity = approvedSimilarities.length > 0 
            ? approvedSimilarities.reduce((a, b) => a + b, 0) / approvedSimilarities.length 
            : 0;

        const avgRejectedSimilarity = rejectedSimilarities.length > 0 
            ? rejectedSimilarities.reduce((a, b) => a + b, 0) / rejectedSimilarities.length 
            : 0;

        // Calculate eligibility score (0-100)
        // Weight factors: fraud risk is critical
        const fraudPenalty = loanData.fraudRiskScore ? (loanData.fraudRiskScore * 0.3) : 0;
        const similarityScore = avgApprovedSimilarity * 100;
        let eligibilityScore = similarityScore - fraudPenalty;

        // Add bonus for reasonable loan amount relative to land size
        if (loanData.acres && loanData.requestedAmount) {
            const loanPerAcre = loanData.requestedAmount / loanData.acres;
            if (loanPerAcre > 50000 && loanPerAcre < 500000) {
                eligibilityScore += 10;
            }
        }

        eligibilityScore = Math.max(0, Math.min(100, eligibilityScore));

        // Determine eligibility (threshold: 50)
        const predictedEligible = eligibilityScore >= 50;

        // Generate reasoning
        const reasoning = generateLoanReasoning(
            eligibilityScore,
            avgApprovedSimilarity,
            avgRejectedSimilarity,
            loanData.fraudRiskScore,
            approvedLoans.length,
            rejectedLoans.length
        );

        return {
            eligibilityScore: Math.round(eligibilityScore * 10) / 10,
            predictedEligible,
            eligibilityReasoning: reasoning,
            featureVector: newVector,
            avgApprovedSimilarity: Math.round(avgApprovedSimilarity * 100) / 100,
            avgRejectedSimilarity: Math.round(avgRejectedSimilarity * 100) / 100
        };
    } catch (error) {
        console.error('Error predicting loan eligibility:', error);
        return {
            eligibilityScore: 50,
            predictedEligible: false,
            eligibilityReasoning: 'Unable to predict eligibility at this time',
            featureVector: createFeatureVector(loanData, 'loan')
        };
    }
};

/**
 * Predict insurance eligibility based on historical data
 */
const predictInsuranceEligibility = async (claimData) => {
    try {
        // Create feature vector for the new claim
        const newVector = createFeatureVector(claimData, 'insurance');

        // Fetch approved and rejected claims as training data
        const approvedClaims = await InsuranceClaim.find({ 
            status: 'Approved',
            featureVector: { $exists: true, $ne: null }
        }).limit(50);

        const rejectedClaims = await InsuranceClaim.find({ 
            status: 'Rejected',
            featureVector: { $exists: true, $ne: null }
        }).limit(50);

        // Calculate similarity scores
        const approvedSimilarities = approvedClaims.map(claim => 
            cosineSimilarity(newVector, claim.featureVector)
        );

        const rejectedSimilarities = rejectedClaims.map(claim => 
            cosineSimilarity(newVector, claim.featureVector)
        );

        // Calculate average similarities
        const avgApprovedSimilarity = approvedSimilarities.length > 0 
            ? approvedSimilarities.reduce((a, b) => a + b, 0) / approvedSimilarities.length 
            : 0;

        const avgRejectedSimilarity = rejectedSimilarities.length > 0 
            ? rejectedSimilarities.reduce((a, b) => a + b, 0) / rejectedSimilarities.length 
            : 0;

        // Calculate eligibility score (0-100)
        let eligibilityScore = avgApprovedSimilarity * 100;

        // Weight authenticity and damage confidence heavily
        if (claimData.authenticityScore) {
            eligibilityScore += (claimData.authenticityScore * 0.2);
        }
        if (claimData.damageConfidence) {
            eligibilityScore += (claimData.damageConfidence * 0.2);
        }

        eligibilityScore = Math.max(0, Math.min(100, eligibilityScore));

        // Determine eligibility (threshold: 60 due to stricter insurance requirements)
        const predictedEligible = eligibilityScore >= 60;

        // Generate reasoning
        const reasoning = generateInsuranceReasoning(
            eligibilityScore,
            avgApprovedSimilarity,
            avgRejectedSimilarity,
            claimData.authenticityScore,
            claimData.damageConfidence,
            approvedClaims.length,
            rejectedClaims.length
        );

        return {
            eligibilityScore: Math.round(eligibilityScore * 10) / 10,
            predictedEligible,
            eligibilityReasoning: reasoning,
            featureVector: newVector,
            avgApprovedSimilarity: Math.round(avgApprovedSimilarity * 100) / 100,
            avgRejectedSimilarity: Math.round(avgRejectedSimilarity * 100) / 100
        };
    } catch (error) {
        console.error('Error predicting insurance eligibility:', error);
        return {
            eligibilityScore: 50,
            predictedEligible: false,
            eligibilityReasoning: 'Unable to predict eligibility at this time',
            featureVector: createFeatureVector(claimData, 'insurance')
        };
    }
};

/**
 * Generate human-readable reasoning for loan eligibility
 */
const generateLoanReasoning = (score, approvedSim, rejectedSim, fraudRisk, numApproved, numRejected) => {
    let reasoning = '';

    if (score >= 80) {
        reasoning = 'Strong eligibility profile. ';
    } else if (score >= 60) {
        reasoning = 'Moderate eligibility. ';
    } else if (score >= 40) {
        reasoning = 'Borderline eligibility. ';
    } else {
        reasoning = 'Low eligibility risk detected. ';
    }

    if (fraudRisk > 50) {
        reasoning += 'Fraud risk is elevated. ';
    }

    reasoning += `Based on similarity to ${numApproved} approved loans (${Math.round(approvedSim * 100)}% match) `;
    reasoning += `and ${numRejected} rejected loans (${Math.round(rejectedSim * 100)}% match). `;
    reasoning += `Recommend admin review before final decision.`;

    return reasoning;
};

/**
 * Generate human-readable reasoning for insurance eligibility
 */
const generateInsuranceReasoning = (score, approvedSim, rejectedSim, authenticity, damage, numApproved, numRejected) => {
    let reasoning = '';

    if (score >= 80) {
        reasoning = 'Strong claim eligibility. ';
    } else if (score >= 65) {
        reasoning = 'Moderate claim eligibility. ';
    } else if (score >= 50) {
        reasoning = 'Borderline claim eligibility. ';
    } else {
        reasoning = 'Low claim eligibility. ';
    }

    if (authenticity && authenticity < 50) {
        reasoning += 'Document authenticity concern. ';
    }

    if (damage && damage < 50) {
        reasoning += 'Damage evidence is insufficient. ';
    }

    reasoning += `Compared against ${numApproved} approved claims (${Math.round(approvedSim * 100)}% match) `;
    reasoning += `and ${numRejected} rejected claims (${Math.round(rejectedSim * 100)}% match). `;
    reasoning += `Review supporting documentation carefully.`;

    return reasoning;
};

module.exports = {
    predictLoanEligibility,
    predictInsuranceEligibility,
    createFeatureVector,
    cosineSimilarity
};
