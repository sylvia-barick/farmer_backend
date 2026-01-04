import { createTool } from "@mastra/core";
import { z } from "zod";
import axios from "axios";

export const loanEligibilityTool = createTool({
    id: "check-loan-eligibility-tool",
    description: "Calculate loan eligibility for farmers based on land size and crop type",
    inputSchema: z.object({
        farmerName: z.string().describe("Farmer's full name"),
        farmLocation: z.object({
            lat: z.coerce.number(),
            lng: z.coerce.number()
        }).optional().describe("Farm GPS coordinates"),
        cropType: z.string().describe("Type of crop being cultivated"),
        acres: z.coerce.number().describe("Land size in acres"),
        loanPurpose: z.string().describe("Purpose of the loan (e.g., seeds, equipment)"),
        requestedAmount: z.coerce.number().describe("Amount requested by farmer"),
        tenureMonths: z.coerce.number().describe("Loan repayment period in months")
    }),
    outputSchema: z.object({
        eligible: z.boolean(),
        estimatedAmount: z.number(),
        reason: z.string(),
        requirements: z.array(z.string()),
        fraudRiskScore: z.number().describe("Risk score 0-100"),
    }),
    execute: async ({ context }) => {
        const { acres, requestedAmount, tenureMonths, cropType, loanPurpose } = context;

        // Basic eligibility: minimum 1 acre
        const eligible = acres >= 1;
        const baseAmountPerAcre = 50_000;

        // Calculate fraud risk based on realistic factors
        let fraudScore = 15; // Base score
        
        // Factor 1: Loan-to-Land Ratio (25 points max)
        if (requestedAmount > 0) {
            const loanPerAcre = requestedAmount / acres;
            if (loanPerAcre > 500000) fraudScore += 20; // Disproportionate request
            else if (loanPerAcre > 300000) fraudScore += 10;
            else if (loanPerAcre > 100000) fraudScore += 5;
        }
        
        // Factor 2: Tenure Consistency (15 points max)
        if (tenureMonths < 6) fraudScore += 10; // Too short
        else if (tenureMonths > 84) fraudScore += 5; // Too long
        
        // Factor 3: Purpose Validation (20 points max)
        const validPurposes = ['crop-cultivation', 'equipment-purchase', 'land-improvement'];
        if (!validPurposes.includes(loanPurpose.toLowerCase())) {
            fraudScore += 15;
        }
        
        // Add slight randomization to simulate real-world variation
        fraudScore += Math.floor(Math.random() * 10);
        fraudScore = Math.min(fraudScore, 100);

        const estimatedAmount = eligible
            ? Math.min(Math.floor(acres * baseAmountPerAcre), requestedAmount)
            : 0;

        return {
            eligible,
            estimatedAmount,
            fraudRiskScore: fraudScore,
            reason: eligible
                ? `You are eligible for a loan up to ₹${estimatedAmount.toLocaleString("en-IN")}. Fraud risk assessment: ${fraudScore}/100 (${fraudScore < 30 ? 'Low Risk' : fraudScore < 60 ? 'Medium Risk' : 'High Risk'})`
                : "Minimum land requirement is 1 acre for loan eligibility",
            requirements: eligible
                ? [
                    "Aadhaar card",
                    "Land ownership documents (7/12 extract)",
                    "Bank account details",
                    "Crop details and sowing certificate",
                ]
                : [],
        };
    },
});
