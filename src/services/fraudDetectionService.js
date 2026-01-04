const groqService = require('./groqService');

/**
 * Enhanced Fraud Detection Service
 * Multi-factor analysis using AI and heuristics
 */

const FRAUD_THRESHOLDS = {
    EXTREME_RISK: 80,      // > 80: Likely fraud
    HIGH_RISK: 60,         // 60-80: High risk, manual review
    MEDIUM_RISK: 40,       // 40-60: Medium risk, proceed with caution
    LOW_RISK: 20,          // < 20: Low risk
};

/**
 * Calculate fraud risk score using multiple factors
 */
const calculateLoanFraudRisk = async (loanData) => {
    try {
        let totalScore = 0;
        const riskFactors = [];

        // Factor 1: Loan Amount vs Land Size Ratio (25 points max)
        const amountRatio = calculateLoanAmountRisk(loanData);
        totalScore += amountRatio.score;
        riskFactors.push(amountRatio.factor);

        // Factor 2: Tenure Consistency (15 points max)
        const tenureRisk = calculateTenureRisk(loanData);
        totalScore += tenureRisk.score;
        riskFactors.push(tenureRisk.factor);

        // Factor 3: Loan Purpose Validation (20 points max)
        const purposeRisk = calculatePurposeRisk(loanData);
        totalScore += purposeRisk.score;
        riskFactors.push(purposeRisk.factor);

        // Factor 4: Farmer Profile Consistency (15 points max)
        const profileRisk = calculateProfileRisk(loanData);
        totalScore += profileRisk.score;
        riskFactors.push(profileRisk.factor);

        // Factor 5: AI-based Document/Data Analysis (25 points max)
        const aiRisk = await analyzeWithAI(loanData);
        totalScore += aiRisk.score;
        riskFactors.push(aiRisk.factor);

        // Generate detailed reasoning
        const reasoning = generateFraudReasoning(totalScore, riskFactors);

        return {
            fraudRiskScore: Math.min(totalScore, 100),
            riskLevel: getRiskLevel(totalScore),
            riskFactors,
            reasoning,
            requiresManualReview: totalScore > FRAUD_THRESHOLDS.HIGH_RISK
        };
    } catch (error) {
        console.error('Error in fraud detection:', error);
        // Return safe default on error
        return {
            fraudRiskScore: 50,
            riskLevel: 'MEDIUM_RISK',
            riskFactors: [{ category: 'Error', description: 'Analysis unavailable, proceed with caution' }],
            reasoning: 'Fraud detection service error - manual review recommended',
            requiresManualReview: true
        };
    }
};

/**
 * Factor 1: Loan Amount vs Land Size (25 points max)
 * Detects if someone is asking for disproportionately large loan
 */
const calculateLoanAmountRisk = (data) => {
    let score = 0;
    let description = '';

    if (!data.acres || !data.requestedAmount) {
        return { score: 0, factor: { category: 'Loan-to-Land Ratio', description: 'Insufficient data' } };
    }

    const loanPerAcre = data.requestedAmount / data.acres;

    // Normal agricultural loans: ₹50,000 to ₹400,000 per acre
    if (loanPerAcre < 30000) {
        score = 0;
        description = 'Loan amount is very conservative relative to land size - LOW RISK';
    } else if (loanPerAcre <= 50000) {
        score = 2;
        description = 'Loan amount is below standard rates - LOW RISK';
    } else if (loanPerAcre <= 200000) {
        score = 5;
        description = 'Loan amount within normal agricultural loan range - NORMAL';
    } else if (loanPerAcre <= 400000) {
        score = 12;
        description = 'Loan amount is at higher end of agricultural loans - MEDIUM RISK';
    } else if (loanPerAcre <= 600000) {
        score = 18;
        description = 'Loan amount significantly exceeds typical agricultural loans - HIGH RISK';
    } else {
        score = 25;
        description = `Extreme loan request (₹${loanPerAcre.toLocaleString('en-IN')}/acre) - FRAUD INDICATOR`;
    }

    return {
        score,
        factor: {
            category: 'Loan-to-Land Ratio',
            description,
            details: `₹${loanPerAcre.toLocaleString('en-IN')} per acre`
        }
    };
};

/**
 * Factor 2: Tenure Consistency (15 points max)
 * Detects if tenure is unusually short or long
 */
const calculateTenureRisk = (data) => {
    let score = 0;
    let description = '';

    if (!data.tenureMonths) {
        return { score: 0, factor: { category: 'Tenure Analysis', description: 'No tenure specified' } };
    }

    // Typical agricultural loans: 12-60 months
    if (data.tenureMonths < 6) {
        score = 15;
        description = 'Suspiciously short tenure - RED FLAG (Quick money scheme indicator)';
    } else if (data.tenureMonths < 12) {
        score = 8;
        description = 'Tenure below typical 12-month minimum - MEDIUM RISK';
    } else if (data.tenureMonths <= 60) {
        score = 2;
        description = 'Tenure within normal agricultural loan range - NORMAL';
    } else if (data.tenureMonths <= 84) {
        score = 5;
        description = 'Tenure is longer than typical but acceptable - LOW RISK';
    } else {
        score = 10;
        description = 'Unusually long tenure requested - MEDIUM RISK';
    }

    return {
        score,
        factor: {
            category: 'Tenure Analysis',
            description,
            details: `${data.tenureMonths} months`
        }
    };
};

/**
 * Factor 3: Loan Purpose Validation (20 points max)
 * Checks if purpose matches farmer's crop type
 */
const calculatePurposeRisk = (data) => {
    let score = 0;
    let description = '';

    const validPurposes = [
        'Seeds',
        'Fertilizers',
        'Pesticides',
        'Equipment',
        'Irrigation',
        'Land-Preparation',
        'Harvesting',
        'Storage',
        'Marketing',
        'General-Agriculture'
    ];

    if (!data.loanPurpose) {
        score = 15;
        description = 'No loan purpose specified - MEDIUM RISK';
    } else if (!validPurposes.includes(data.loanPurpose)) {
        score = 20;
        description = `Invalid loan purpose "${data.loanPurpose}" - HIGH RISK (Possible fraud)`;
    } else if (data.cropType && isCropPurposeMismatch(data.cropType, data.loanPurpose)) {
        score = 12;
        description = 'Loan purpose may not match stated crop type - MEDIUM RISK';
    } else {
        score = 2;
        description = 'Loan purpose is valid and appropriate - NORMAL';
    }

    return {
        score,
        factor: {
            category: 'Purpose Validation',
            description,
            details: data.loanPurpose || 'Not specified'
        }
    };
};

/**
 * Factor 4: Farmer Profile Consistency (15 points max)
 * Checks if farmer data is complete and consistent
 */
const calculateProfileRisk = (data) => {
    let score = 0;
    let missingFields = [];

    // Check for missing critical fields
    if (!data.farmerName || data.farmerName === 'Farmer' || data.farmerName === 'Unknown') {
        missingFields.push('Farmer Name');
        score += 8;
    }

    if (!data.acres && !data.landSize) {
        missingFields.push('Land Size');
        score += 4;
    }

    if (!data.cropType || data.cropType === 'General') {
        missingFields.push('Specific Crop Type');
        score += 3;
    }

    if (!data.farmLocation || (!data.farmLocation.lat && !data.farmLocation.lng)) {
        missingFields.push('Farm Location');
        score += 0; // Optional but helpful
    }

    let description;
    if (missingFields.length === 0) {
        score = 0;
        description = 'Farmer profile is complete and detailed - LOW RISK';
    } else if (missingFields.length <= 2) {
        description = `Missing fields: ${missingFields.join(', ')} - MEDIUM RISK`;
    } else {
        description = `Multiple missing fields: ${missingFields.join(', ')} - HIGH RISK (Incomplete application)`;
    }

    return {
        score: Math.min(score, 15),
        factor: {
            category: 'Profile Consistency',
            description,
            details: missingFields.length > 0 ? missingFields : 'All fields complete'
        }
    };
};

/**
 * Factor 5: AI-based Analysis (25 points max)
 * Uses Groq AI to detect fraud patterns
 */
const analyzeWithAI = async (data) => {
    try {
        const prompt = `You are a fraud detection expert analyzing agricultural loan applications. Analyze this loan application for fraud indicators:

Application Details:
- Farmer Name: ${data.farmerName || 'Unknown'}
- Requested Amount: ₹${data.requestedAmount?.toLocaleString('en-IN') || 'N/A'}
- Land Size: ${data.acres || data.landSize || 'N/A'} acres
- Crop Type: ${data.cropType || 'Not specified'}
- Loan Purpose: ${data.loanPurpose || 'Not specified'}
- Tenure: ${data.tenureMonths || 'N/A'} months

Based on your expertise, provide a fraud risk assessment as JSON:
{
  "fraud_score": <0-25 risk score>,
  "risk_indicators": ["indicator1", "indicator2", ...],
  "red_flags": ["flag1", "flag2", ...],
  "assessment": "<brief assessment>",
  "confidence": <0-100 confidence level>
}

Be strict but fair. Common fraud patterns:
- Requesting disproportionate amounts
- Vague or mismatched loan purposes
- Suspicious tenure periods
- Incomplete farmer information`;

        const response = await groqService.getGroqAnalysis(prompt, 'llama-3.1-8b-instant');
        
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            return {
                score: Math.min(analysis.fraud_score || 0, 25),
                factor: {
                    category: 'AI Analysis',
                    description: analysis.assessment || 'Analysis complete',
                    redFlags: analysis.red_flags || [],
                    indicators: analysis.risk_indicators || [],
                    confidence: analysis.confidence || 0
                }
            };
        }

        return {
            score: 0,
            factor: {
                category: 'AI Analysis',
                description: 'Unable to parse AI response, assuming low risk'
            }
        };
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return {
            score: 3, // Slight penalty for analysis failure
            factor: {
                category: 'AI Analysis',
                description: 'AI analysis unavailable - manual review recommended'
            }
        };
    }
};

/**
 * Insurance Fraud Detection
 */
const calculateInsuranceFraudRisk = async (claimData) => {
    try {
        let totalScore = 0;
        const riskFactors = [];

        // Factor 1: Claim Amount vs Policy (20 points max)
        const claimAmountRisk = calculateClaimAmountRisk(claimData);
        totalScore += claimAmountRisk.score;
        riskFactors.push(claimAmountRisk.factor);

        // Factor 2: Document Quality (20 points max)
        const docQualityRisk = calculateDocumentQualityRisk(claimData);
        totalScore += docQualityRisk.score;
        riskFactors.push(docQualityRisk.factor);

        // Factor 3: Damage Consistency (20 points max)
        const damageRisk = calculateDamageConsistencyRisk(claimData);
        totalScore += damageRisk.score;
        riskFactors.push(damageRisk.factor);

        // Factor 4: Provider Validation (15 points max)
        const providerRisk = calculateProviderValidationRisk(claimData);
        totalScore += providerRisk.score;
        riskFactors.push(providerRisk.factor);

        // Factor 5: AI Claim Analysis (25 points max)
        const aiRisk = await analyzeClaimWithAI(claimData);
        totalScore += aiRisk.score;
        riskFactors.push(aiRisk.factor);

        const reasoning = generateFraudReasoning(totalScore, riskFactors);

        return {
            fraudRiskScore: Math.min(totalScore, 100),
            riskLevel: getRiskLevel(totalScore),
            riskFactors,
            reasoning,
            requiresManualReview: totalScore > FRAUD_THRESHOLDS.HIGH_RISK
        };
    } catch (error) {
        console.error('Insurance fraud detection error:', error);
        return {
            fraudRiskScore: 50,
            riskLevel: 'MEDIUM_RISK',
            riskFactors: [{ category: 'Error', description: 'Analysis unavailable' }],
            reasoning: 'Manual review recommended',
            requiresManualReview: true
        };
    }
};

const calculateClaimAmountRisk = (data) => {
    let score = 0;
    let description = '';

    if (!data.claimAmount) {
        return { score: 0, factor: { category: 'Claim Amount', description: 'No claim amount specified' } };
    }

    // Typical claim amounts for agricultural insurance: ₹10k - ₹500k
    if (data.claimAmount < 5000) {
        score = 2;
        description = 'Very small claim amount - LOW RISK';
    } else if (data.claimAmount <= 100000) {
        score = 3;
        description = 'Claim within typical insurance range - NORMAL';
    } else if (data.claimAmount <= 250000) {
        score = 8;
        description = 'Higher claim amount - requires verification';
    } else if (data.claimAmount <= 500000) {
        score = 15;
        description = 'Large claim amount - MEDIUM RISK (thorough review needed)';
    } else {
        score = 20;
        description = 'Claim amount exceeds typical agricultural insurance limits - HIGH RISK';
    }

    return {
        score,
        factor: {
            category: 'Claim Amount',
            description,
            details: `₹${data.claimAmount.toLocaleString('en-IN')}`
        }
    };
};

const calculateDocumentQualityRisk = (data) => {
    let score = 0;
    let description = '';

    if (!data.authenticityScore) {
        score = 10;
        description = 'No authenticity score - cannot verify document';
    } else if (data.authenticityScore >= 80) {
        score = 2;
        description = 'Document authenticity verified - LOW RISK';
    } else if (data.authenticityScore >= 60) {
        score = 8;
        description = 'Document authenticity uncertain - MEDIUM RISK';
    } else {
        score = 20;
        description = 'Document authenticity questionable - HIGH RISK (Possible forgery)';
    }

    return {
        score,
        factor: {
            category: 'Document Quality',
            description,
            details: `Authenticity: ${data.authenticityScore || 'N/A'}/100`
        }
    };
};

const calculateDamageConsistencyRisk = (data) => {
    let score = 0;
    let description = '';

    if (!data.damageConfidence) {
        score = 15;
        description = 'No damage evidence - cannot verify claim';
    } else if (data.damageConfidence >= 80) {
        score = 2;
        description = 'Damage evidence is clear and consistent - LOW RISK';
    } else if (data.damageConfidence >= 50) {
        score = 10;
        description = 'Damage evidence is unclear - MEDIUM RISK (needs review)';
    } else {
        score = 20;
        description = 'Damage evidence is insufficient or suspicious - HIGH RISK';
    }

    return {
        score,
        factor: {
            category: 'Damage Consistency',
            description,
            details: `Damage confidence: ${data.damageConfidence || 'N/A'}/100`
        }
    };
};

const calculateProviderValidationRisk = (data) => {
    const validProviders = [
        'Pradhan Mantri Fasal Bima',
        'Weather Based Crop Insurance',
        'Unified Package',
        'Coconut Palm Insurance',
        'Modified National Agriculture Insurance Scheme'
    ];

    let score = 0;
    let description = '';

    if (!data.provider) {
        score = 15;
        description = 'Provider not specified - HIGH RISK';
    } else if (!validProviders.includes(data.provider)) {
        score = 15;
        description = `Invalid provider "${data.provider}" - FRAUD INDICATOR`;
    } else {
        score = 0;
        description = 'Valid registered insurance provider - NORMAL';
    }

    return {
        score,
        factor: {
            category: 'Provider Validation',
            description,
            details: data.provider || 'Not specified'
        }
    };
};

const analyzeClaimWithAI = async (data) => {
    try {
        const prompt = `Analyze this insurance claim for fraud:

Claim Details:
- Provider: ${data.provider || 'Unknown'}
- Claim Amount: ₹${data.claimAmount?.toLocaleString('en-IN') || 'N/A'}
- Damage Confidence: ${data.damageConfidence || 'N/A'}%
- Authenticity Score: ${data.authenticityScore || 'N/A'}%
- Damage Prediction: ${data.damagePrediction || 'Not available'}

Provide fraud assessment as JSON:
{
  "fraud_score": <0-25>,
  "red_flags": ["flag1", ...],
  "assessment": "<brief>",
  "likelihood": "<high/medium/low>"
}`;

        const response = await groqService.getGroqAnalysis(prompt, 'llama-3.1-8b-instant');
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            return {
                score: Math.min(analysis.fraud_score || 0, 25),
                factor: {
                    category: 'AI Analysis',
                    description: analysis.assessment || 'Analysis complete',
                    redFlags: analysis.red_flags || []
                }
            };
        }

        return {
            score: 0,
            factor: { category: 'AI Analysis', description: 'Analysis available' }
        };
    } catch (error) {
        return {
            score: 2,
            factor: { category: 'AI Analysis', description: 'AI analysis skipped' }
        };
    }
};

/**
 * Helper Functions
 */
const isCropPurposeMismatch = (cropType, purpose) => {
    const cropPurposeMap = {
        'Rice': ['Seeds', 'Fertilizers', 'Irrigation', 'Harvesting', 'Storage'],
        'Wheat': ['Seeds', 'Fertilizers', 'Irrigation', 'Equipment'],
        'Cotton': ['Pesticides', 'Fertilizers', 'Equipment', 'Harvesting'],
        'Sugarcane': ['Seeds', 'Fertilizers', 'Irrigation', 'Equipment'],
        'Corn': ['Seeds', 'Fertilizers', 'Irrigation', 'Equipment']
    };

    const validPurposes = cropPurposeMap[cropType] || [];
    return validPurposes.length > 0 && !validPurposes.includes(purpose);
};

const getRiskLevel = (score) => {
    if (score >= FRAUD_THRESHOLDS.EXTREME_RISK) return 'EXTREME_RISK';
    if (score >= FRAUD_THRESHOLDS.HIGH_RISK) return 'HIGH_RISK';
    if (score >= FRAUD_THRESHOLDS.MEDIUM_RISK) return 'MEDIUM_RISK';
    return 'LOW_RISK';
};

const generateFraudReasoning = (score, riskFactors) => {
    const topFactors = riskFactors
        .sort((a, b) => (b.factor.score || 0) - (a.factor.score || 0))
        .slice(0, 2)
        .map(f => f.factor.description);

    let summary;
    if (score >= FRAUD_THRESHOLDS.EXTREME_RISK) {
        summary = 'EXTREME FRAUD RISK - Immediate manual review required. Application shows multiple fraud indicators.';
    } else if (score >= FRAUD_THRESHOLDS.HIGH_RISK) {
        summary = 'HIGH FRAUD RISK - Detailed review recommended before approval.';
    } else if (score >= FRAUD_THRESHOLDS.MEDIUM_RISK) {
        summary = 'MEDIUM FRAUD RISK - Proceed with caution. Additional verification may be needed.';
    } else {
        summary = 'LOW FRAUD RISK - Application appears legitimate.';
    }

    return `${summary} Key concerns: ${topFactors.join('; ')}`;
};

module.exports = {
    calculateLoanFraudRisk,
    calculateInsuranceFraudRisk,
    FRAUD_THRESHOLDS,
    getRiskLevel
};
