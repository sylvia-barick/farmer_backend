const mongoose = require('mongoose');
const LoanApplication = require('../models/loanModel');
const InsuranceClaim = require('../models/insuranceModel');

const seedData = {
  loans: [
    {
      "farmerName": "Rajesh Kumar",
      "firebaseUid": "demo_rajesh_001",
      "cropType": "Rice",
      "loanPurpose": "Seeds",
      "requestedAmount": 150000,
      "tenureMonths": 12,
      "acres": 5,
      "landSize": 5,
      "farmLocation": {
        "lat": 28.7041,
        "lng": 77.1025
      },
      "status": "APPROVED",
      "fraudRiskScore": 15,
      "fraudReason": "Conservative loan request. Farmer profile complete. Low fraud risk indicators.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 85,
      "predictedEligible": true,
      "eligibilityReasoning": "Strong eligibility. Similar approved loan profile. Reasonable loan-to-land ratio.",
      "featureVector": [0.15, 1.0, 0.05, 0.85, 3, 7],
      "disbursedAmount": 150000,
      "createdAt": "2024-12-20T10:00:00Z"
    },
    {
      "farmerName": "Sunita Devi",
      "firebaseUid": "demo_sunita_002",
      "cropType": "Wheat",
      "loanPurpose": "Fertilizers",
      "requestedAmount": 120000,
      "tenureMonths": 18,
      "acres": 4,
      "landSize": 4,
      "farmLocation": {
        "lat": 29.0588,
        "lng": 77.7846
      },
      "status": "APPROVED",
      "fraudRiskScore": 22,
      "fraudReason": "Moderate loan request. Profile consistent. No major red flags detected.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 78,
      "predictedEligible": true,
      "eligibilityReasoning": "Good eligibility match. Historical approval pattern matches.",
      "featureVector": [0.12, 1.5, 0.04, 0.78, 5, 4],
      "disbursedAmount": 120000,
      "createdAt": "2024-12-19T14:30:00Z"
    },
    {
      "farmerName": "Amit Patel",
      "firebaseUid": "demo_amit_003",
      "cropType": "Cotton",
      "loanPurpose": "Equipment",
      "requestedAmount": 350000,
      "tenureMonths": 24,
      "acres": 8,
      "landSize": 8,
      "farmLocation": {
        "lat": 21.1458,
        "lng": 79.0882
      },
      "status": "APPROVED",
      "fraudRiskScore": 28,
      "fraudReason": "Substantial equipment investment. Loan-to-land ratio within agricultural norms. Profile verified.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 72,
      "predictedEligible": true,
      "eligibilityReasoning": "Moderate-to-good match. Consistent with approved equipment loans.",
      "featureVector": [0.35, 2.0, 0.08, 0.72, 2, 6],
      "disbursedAmount": 350000,
      "createdAt": "2024-12-18T09:15:00Z"
    },
    {
      "farmerName": "Vikram Singh",
      "firebaseUid": "demo_vikram_004",
      "cropType": "Sugarcane",
      "loanPurpose": "Irrigation",
      "requestedAmount": 500000,
      "tenureMonths": 36,
      "acres": 10,
      "landSize": 10,
      "farmLocation": {
        "lat": 27.1767,
        "lng": 78.0081
      },
      "status": "APPROVED",
      "fraudRiskScore": 35,
      "fraudReason": "Major irrigation project. Large loan but justified by land size. Tenure reasonable for capital investment.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 68,
      "predictedEligible": true,
      "eligibilityReasoning": "Acceptable eligibility. Matches approved large-scale irrigation loans.",
      "featureVector": [0.5, 3.0, 0.1, 0.65, 8, 2],
      "disbursedAmount": 500000,
      "createdAt": "2024-12-17T11:45:00Z"
    },
    {
      "farmerName": "Meera Reddy",
      "firebaseUid": "demo_meera_005",
      "cropType": "Corn",
      "loanPurpose": "Seeds",
      "requestedAmount": 85000,
      "tenureMonths": 12,
      "acres": 3,
      "landSize": 3,
      "farmLocation": {
        "lat": 17.3850,
        "lng": 78.4867
      },
      "status": "APPROVED",
      "fraudRiskScore": 18,
      "fraudReason": "Small conservative loan. Complete farmer profile. Standard agricultural loan pattern.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 82,
      "predictedEligible": true,
      "eligibilityReasoning": "Strong eligibility. Conservative approach. Similar to many approved small loans.",
      "featureVector": [0.085, 1.0, 0.03, 0.82, 4, 7],
      "disbursedAmount": 85000,
      "createdAt": "2024-12-16T13:20:00Z"
    },
    {
      "farmerName": "Priya Sharma",
      "firebaseUid": "demo_priya_006",
      "cropType": "Rice",
      "loanPurpose": "Pesticides",
      "requestedAmount": 95000,
      "tenureMonths": 9,
      "acres": 4,
      "landSize": 4,
      "farmLocation": {
        "lat": 26.9124,
        "lng": 75.7873
      },
      "status": "APPROVED",
      "fraudRiskScore": 25,
      "fraudReason": "Crop maintenance loan. Reasonable tenure. No suspicious patterns.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 75,
      "predictedEligible": true,
      "eligibilityReasoning": "Good match to approved crop maintenance loans.",
      "featureVector": [0.095, 0.75, 0.04, 0.75, 3, 5],
      "disbursedAmount": 95000,
      "createdAt": "2024-12-15T15:00:00Z"
    },
    {
      "farmerName": "Anuj Verma",
      "firebaseUid": "demo_anuj_007",
      "cropType": "General",
      "loanPurpose": "Invalid-Purpose",
      "requestedAmount": 800000,
      "tenureMonths": 6,
      "acres": 2,
      "landSize": 2,
      "farmLocation": {
        "lat": 28.7041,
        "lng": 77.1025
      },
      "status": "REJECTED",
      "fraudRiskScore": 78,
      "fraudReason": "EXTREME FRAUD RISK - Invalid loan purpose detected. Extremely short tenure (6 months). Disproportionate loan amount (₹400k/acre). Multiple red flags indicate possible fraud scheme.",
      "fraudRiskLevel": "HIGH_RISK",
      "eligibilityScore": 12,
      "predictedEligible": false,
      "eligibilityReasoning": "Poor eligibility. Fraud indicators present. Rejected due to high risk profile.",
      "featureVector": [0.8, 0.5, 0.02, 0.22, 1, 1],
      "createdAt": "2024-12-14T08:30:00Z"
    },
    {
      "farmerName": "Harsh Pandey",
      "firebaseUid": "demo_harsh_008",
      "cropType": "Unknown",
      "loanPurpose": "Unknown",
      "requestedAmount": 950000,
      "tenureMonths": 4,
      "acres": 1,
      "landSize": 1,
      "farmLocation": {
        "lat": 25.2820,
        "lng": 75.8111
      },
      "status": "REJECTED",
      "fraudRiskScore": 92,
      "fraudReason": "EXTREME FRAUD RISK - Extremely short tenure (4 months). Astronomical loan-to-land ratio (₹950k/acre). Vague crop and purpose. Missing critical farmer details. AI analysis flags suspicious pattern.",
      "fraudRiskLevel": "EXTREME_RISK",
      "eligibilityScore": 5,
      "predictedEligible": false,
      "eligibilityReasoning": "Extremely poor eligibility. Clear fraud indicators. Automatic rejection recommended.",
      "featureVector": [0.95, 0.33, 0.01, 0.08, 0, 0],
      "createdAt": "2024-12-13T10:45:00Z"
    },
    {
      "farmerName": "Deepak Yadav",
      "firebaseUid": "demo_deepak_009",
      "cropType": "Sugarcane",
      "loanPurpose": "Land-Preparation",
      "requestedAmount": 280000,
      "tenureMonths": 20,
      "acres": 6,
      "landSize": 6,
      "farmLocation": {
        "lat": 26.4124,
        "lng": 74.6347
      },
      "status": "REJECTED",
      "fraudRiskScore": 65,
      "fraudReason": "High fraud risk detected. Moderate loan-to-land ratio but tenure mismatch. Land preparation purpose inconsistent with crop type. Profile has gaps.",
      "fraudRiskLevel": "HIGH_RISK",
      "eligibilityScore": 32,
      "predictedEligible": false,
      "eligibilityReasoning": "Low eligibility. Similar to rejected mismatched purpose loans.",
      "featureVector": [0.28, 1.67, 0.06, 0.35, 8, 3],
      "createdAt": "2024-12-12T12:00:00Z"
    },
    {
      "farmerName": "Rajesh Gupta",
      "firebaseUid": "demo_rajesh_010",
      "cropType": "Rice",
      "loanPurpose": "Harvesting",
      "requestedAmount": 110000,
      "tenureMonths": 15,
      "acres": 5,
      "landSize": 5,
      "farmLocation": {
        "lat": 28.7041,
        "lng": 77.1025
      },
      "status": "PENDING",
      "fraudRiskScore": 32,
      "fraudReason": "Moderate risk profile. Reasonable loan amount but purpose validation needed. Tenure acceptable.",
      "fraudRiskLevel": "MEDIUM_RISK",
      "eligibilityScore": 55,
      "predictedEligible": true,
      "eligibilityReasoning": "Borderline eligibility. Manual review recommended before approval.",
      "featureVector": [0.11, 1.25, 0.05, 0.68, 3, 8],
      "createdAt": "2024-12-21T09:00:00Z"
    }
  ],
  insurance: [
    {
      "farmerName": "Rajesh Kumar",
      "firebaseUid": "demo_rajesh_001",
      "provider": "Pradhan Mantri Fasal Bima",
      "uin": "UIN-PMFBY-001",
      "policyNumber": "PMF-2024-001",
      "claimAmount": 75000,
      "authenticityScore": 92,
      "damageConfidence": 88,
      "damagePrediction": "Moderate crop damage detected. Hail damage on 40% of field.",
      "status": "Approved",
      "fraudRiskScore": 12,
      "fraudReason": "Valid claim with strong document authenticity. Damage evidence clear and consistent.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 89,
      "predictedEligible": true,
      "eligibilityReasoning": "Strong claim eligibility. High authenticity and damage confidence.",
      "featureVector": [0.15, 0.92, 0.88, 2, 0, 0],
      "submissionDate": "2024-12-15T10:00:00Z"
    },
    {
      "farmerName": "Sunita Devi",
      "firebaseUid": "demo_sunita_002",
      "provider": "Weather Based Crop Insurance",
      "uin": "UIN-WBCIS-001",
      "policyNumber": "WBC-2024-002",
      "claimAmount": 45000,
      "authenticityScore": 78,
      "damageConfidence": 72,
      "damagePrediction": "Drought-related crop stress detected. Yield reduction estimated.",
      "status": "Approved",
      "fraudRiskScore": 28,
      "fraudReason": "Acceptable claim with moderate document quality. Weather data supports claim.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 72,
      "predictedEligible": true,
      "eligibilityReasoning": "Moderate-to-good eligibility. Weather-indexed claim verified.",
      "featureVector": [0.09, 0.78, 0.72, 3, 0, 0],
      "submissionDate": "2024-12-14T14:30:00Z"
    },
    {
      "farmerName": "Amit Patel",
      "firebaseUid": "demo_amit_003",
      "provider": "Unified Package",
      "uin": "UIN-UP-001",
      "policyNumber": "UP-2024-003",
      "claimAmount": 120000,
      "authenticityScore": 85,
      "damageConfidence": 82,
      "damagePrediction": "Pest infestation damage. 60% field affected. Clear photographic evidence.",
      "status": "Approved",
      "fraudRiskScore": 22,
      "fraudReason": "Valid claim. Good document quality. Damage assessment consistent.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 81,
      "predictedEligible": true,
      "eligibilityReasoning": "Good claim eligibility. Consistent damage evidence.",
      "featureVector": [0.24, 0.85, 0.82, 4, 0, 0],
      "submissionDate": "2024-12-13T11:15:00Z"
    },
    {
      "farmerName": "Vikram Singh",
      "firebaseUid": "demo_vikram_004",
      "provider": "Modified National Agriculture Insurance Scheme",
      "uin": "UIN-MNAIS-001",
      "policyNumber": "MNAIS-2024-004",
      "claimAmount": 95000,
      "authenticityScore": 88,
      "damageConfidence": 85,
      "damagePrediction": "Waterlogging damage. Crop loss approximately 50%.",
      "status": "Approved",
      "fraudRiskScore": 18,
      "fraudReason": "Strong claim authenticity. Clear damage evidence. Valid provider.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 86,
      "predictedEligible": true,
      "eligibilityReasoning": "Strong eligibility. Similar to approved major loss claims.",
      "featureVector": [0.19, 0.88, 0.85, 5, 0, 0],
      "submissionDate": "2024-12-12T09:45:00Z"
    },
    {
      "farmerName": "Meera Reddy",
      "firebaseUid": "demo_meera_005",
      "provider": "Coconut Palm Insurance",
      "uin": "UIN-CPI-001",
      "policyNumber": "CPI-2024-005",
      "claimAmount": 35000,
      "authenticityScore": 92,
      "damageConfidence": 90,
      "damagePrediction": "Storm damage to coconut trees. 8 trees severely damaged, 12 moderately damaged.",
      "status": "Approved",
      "fraudRiskScore": 15,
      "fraudReason": "Excellent document quality. Damage assessment verified. No fraud indicators.",
      "fraudRiskLevel": "LOW_RISK",
      "eligibilityScore": 88,
      "predictedEligible": true,
      "eligibilityReasoning": "Excellent claim eligibility. Strong evidence.",
      "featureVector": [0.07, 0.92, 0.9, 6, 0, 0],
      "submissionDate": "2024-12-11T13:30:00Z"
    },
    {
      "farmerName": "Anuj Verma",
      "firebaseUid": "demo_anuj_007",
      "provider": "Unknown Provider",
      "uin": "INVALID-UIN",
      "policyNumber": "FAKE-2024-006",
      "claimAmount": 500000,
      "authenticityScore": 22,
      "damageConfidence": 15,
      "damagePrediction": "Unable to verify damage. Document appears forged.",
      "status": "Rejected",
      "fraudRiskScore": 88,
      "fraudReason": "EXTREME FRAUD RISK - Invalid insurance provider. Document authenticity very low (22%). Damage confidence negligible (15%). Claim amount suspiciously high. Multiple forgery indicators detected.",
      "fraudRiskLevel": "EXTREME_RISK",
      "eligibilityScore": 8,
      "predictedEligible": false,
      "eligibilityReasoning": "Extreme fraud indicators. Automatic rejection. Report to authorities.",
      "featureVector": [1.0, 0.22, 0.15, 9, 0, 0],
      "submissionDate": "2024-12-10T08:00:00Z"
    },
    {
      "farmerName": "Harsh Pandey",
      "firebaseUid": "demo_harsh_008",
      "provider": "Pradhan Mantri Fasal Bima",
      "uin": "UIN-PMFBY-002",
      "policyNumber": "PMF-2024-007",
      "claimAmount": 280000,
      "authenticityScore": 35,
      "damageConfidence": 28,
      "damagePrediction": "Claim documentation suspicious. Photos appear doctored.",
      "status": "Rejected",
      "fraudRiskScore": 82,
      "fraudReason": "HIGH FRAUD RISK - Low document authenticity (35%). Very low damage confidence (28%). Claim amount extremely high relative to typical claims. Photographic evidence appears manipulated. Clear fraud pattern.",
      "fraudRiskLevel": "HIGH_RISK",
      "eligibilityScore": 15,
      "predictedEligible": false,
      "eligibilityReasoning": "Low eligibility. Fraud indicators present. Rejected.",
      "featureVector": [0.56, 0.35, 0.28, 2, 0, 0],
      "submissionDate": "2024-12-09T10:30:00Z"
    },
    {
      "farmerName": "Deepak Yadav",
      "firebaseUid": "demo_deepak_009",
      "provider": "Weather Based Crop Insurance",
      "uin": "UIN-WBCIS-002",
      "policyNumber": "WBC-2024-008",
      "claimAmount": 62000,
      "authenticityScore": 68,
      "damageConfidence": 55,
      "damagePrediction": "Weather data shows rainfall, but visual damage evidence unclear.",
      "status": "Rejected",
      "fraudRiskScore": 58,
      "fraudReason": "MEDIUM FRAUD RISK - Moderate document authenticity. Damage confidence is borderline. Weather data supports partial claim but visual evidence lacks. Requires additional verification.",
      "fraudRiskLevel": "MEDIUM_RISK",
      "eligibilityScore": 45,
      "predictedEligible": false,
      "eligibilityReasoning": "Borderline eligibility. Insufficient evidence. Additional documentation required.",
      "featureVector": [0.124, 0.68, 0.55, 3, 0, 0],
      "submissionDate": "2024-12-08T15:00:00Z"
    },
    {
      "farmerName": "Priya Sharma",
      "firebaseUid": "demo_priya_006",
      "provider": "Unified Package",
      "uin": "UIN-UP-002",
      "policyNumber": "UP-2024-009",
      "claimAmount": 58000,
      "authenticityScore": 81,
      "damageConfidence": 79,
      "damagePrediction": "Fungal disease outbreak. 45% crop affected.",
      "status": "Under Review",
      "fraudRiskScore": 35,
      "fraudReason": "Moderate fraud risk. Good document authenticity but disease diagnosis needs verification by agricultural expert.",
      "fraudRiskLevel": "MEDIUM_RISK",
      "eligibilityScore": 68,
      "predictedEligible": true,
      "eligibilityReasoning": "Borderline eligibility. Manual review recommended. Awaiting expert assessment.",
      "featureVector": [0.116, 0.81, 0.79, 4, 0, 0],
      "submissionDate": "2024-12-20T12:00:00Z"
    },
    {
      "farmerName": "Rajesh Gupta",
      "firebaseUid": "demo_rajesh_010",
      "provider": "Pradhan Mantri Fasal Bima",
      "uin": "UIN-PMFBY-003",
      "policyNumber": "PMF-2024-010",
      "claimAmount": 82000,
      "authenticityScore": 75,
      "damageConfidence": 71,
      "damagePrediction": "Preliminary damage assessment. Hail impact confirmed.",
      "status": "Under Review",
      "fraudRiskScore": 42,
      "fraudReason": "Moderate fraud risk. Document quality acceptable but damage assessment needs field verification.",
      "fraudRiskLevel": "MEDIUM_RISK",
      "eligibilityScore": 62,
      "predictedEligible": true,
      "eligibilityReasoning": "Moderate eligibility. Pending field verification of damage.",
      "featureVector": [0.164, 0.75, 0.71, 2, 0, 0],
      "submissionDate": "2024-12-21T10:30:00Z"
    }
  ]
};

async function seed() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI or MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(mongoUri);

    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await LoanApplication.deleteMany({});
    await InsuranceClaim.deleteMany({});
    console.log('✓ Cleared existing data');

    // Insert loan data
    const loans = await LoanApplication.insertMany(seedData.loans);
    console.log(`✓ Inserted ${loans.length} loan records`);

    // Insert insurance data
    const insurance = await InsuranceClaim.insertMany(seedData.insurance);
    console.log(`✓ Inserted ${insurance.length} insurance records`);

    console.log('\n📊 Seed Data Summary:');
    console.log('=====================================');
    console.log('Loans:');
    console.log('  - APPROVED: 6');
    console.log('  - REJECTED: 2');
    console.log('  - PENDING: 2');
    console.log('\nInsurance:');
    console.log('  - Approved: 5');
    console.log('  - Rejected: 2');
    console.log('  - Pending: 3');
    console.log('\n✅ Seed data inserted successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
