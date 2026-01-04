import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { loanEligibilityTool } from "../tools/loanEligibility.tool";
import { userDataTool } from "../tools/userData.tool";

/* -------------------- Step 0: Fetch User Data -------------------- */

const fetchUserDataStep = createStep({
    id: "fetch-user-data-eligibility",
    inputSchema: z.object({
        userId: z.string(),
        cropType: z.string(),
        loanPurpose: z.string(),
        requestedAmount: z.number(),
        tenureYears: z.number(),
    }),
    outputSchema: z.object({
        userData: userDataTool.outputSchema,
        formData: z.object({
            cropType: z.string(),
            loanPurpose: z.string(),
            requestedAmount: z.number(),
            tenureMonths: z.number(),
        }),
    }),
    execute: async ({ inputData }) => {
        const userData = await userDataTool.execute({
            context: {
                userId: inputData.userId,
            },
        } as any);

        if (!userData.success) {
            throw new Error(userData.error || "Failed to fetch user data");
        }

        return {
            userData,
            formData: {
                cropType: inputData.cropType,
                loanPurpose: inputData.loanPurpose,
                requestedAmount: inputData.requestedAmount,
                tenureMonths: inputData.tenureYears * 12,
            },
        };
    },
});

/* -------------------- Step 1: Check Eligibility Only -------------------- */

const checkEligibilityOnlyStep = createStep({
    id: "check-loan-eligibility-only",
    inputSchema: z.object({
        userData: userDataTool.outputSchema,
        formData: z.object({
            cropType: z.string(),
            loanPurpose: z.string(),
            requestedAmount: z.number(),
            tenureMonths: z.number(),
        }),
    }),
    outputSchema: z.object({
        eligible: z.boolean(),
        estimatedAmount: z.number(),
        reason: z.string(),
        requirements: z.array(z.string()),
        fraudRiskScore: z.number(),
        farmerName: z.string(),
        acres: z.number(),
    }),
    execute: async ({ inputData }) => {
        const { userData, formData } = inputData;

        const eligibility = await loanEligibilityTool.execute({
            context: {
                farmerName: userData.farmerName!,
                farmLocation: userData.farmLocation,
                cropType: formData.cropType,
                acres: userData.acres!,
                loanPurpose: formData.loanPurpose,
                requestedAmount: formData.requestedAmount,
                tenureMonths: formData.tenureMonths,
            },
        } as any);

        return {
            ...eligibility,
            farmerName: userData.farmerName!,
            acres: userData.acres!,
        };
    },
});

/* -------------------- Step 2: Format Eligibility Response -------------------- */

const formatEligibilityResponseStep = createStep({
    id: "format-eligibility-response",
    inputSchema: z.object({
        eligible: z.boolean(),
        estimatedAmount: z.number(),
        reason: z.string(),
        requirements: z.array(z.string()),
        fraudRiskScore: z.number(),
        farmerName: z.string(),
        acres: z.number(),
    }),
    outputSchema: z.object({
        message: z.string(),
        eligible: z.boolean(),
        estimatedAmount: z.number(),
        fraudRiskScore: z.number(),
        requirements: z.array(z.string()),
    }),
    execute: async ({ inputData }) => {
        const { eligible, estimatedAmount, reason, requirements, fraudRiskScore, farmerName } = inputData;

        let message = `📊 **Loan Eligibility Check for ${farmerName}**\n\n`;
        
        if (eligible) {
            message += `✅ **Good News!** You are eligible for a loan!\n\n`;
            message += `💰 **Estimated Loan Amount:** ₹${estimatedAmount.toLocaleString("en-IN")}\n`;
            message += `📈 **Fraud Risk Score:** ${fraudRiskScore}/100 `;
            
            if (fraudRiskScore < 30) {
                message += `(Low Risk - Auto-approval likely)\n`;
            } else if (fraudRiskScore < 60) {
                message += `(Medium Risk - Manual review required)\n`;
            } else {
                message += `(High Risk - Additional verification needed)\n`;
            }
            
            message += `\n📋 **Required Documents:**\n`;
            requirements.forEach((req, idx) => {
                message += `  ${idx + 1}. ${req}\n`;
            });
            
            message += `\n💡 To proceed with the application, please provide all the required documents.`;
        } else {
            message += `❌ **Unfortunately, you are not eligible at this time.**\n\n`;
            message += `📝 **Reason:** ${reason}\n\n`;
            message += `💡 **Tip:** Ensure you meet the minimum land requirement (1 acre) and have all necessary documentation.`;
        }

        return {
            message,
            eligible,
            estimatedAmount,
            fraudRiskScore,
            requirements,
        };
    },
});

/* -------------------- Workflow: Check Eligibility Only -------------------- */

export const loanEligibilityWorkflow = createWorkflow({
    id: "loan-eligibility-check-workflow",
    inputSchema: z.object({
        // From Firebase Auth (frontend gets this from currentUser.uid)
        userId: z.string().describe("Firebase UID of authenticated user"),
        
        // Loan-specific form inputs (user fills these in the form)
        cropType: z.string().describe("Selected crop from dropdown"),
        loanPurpose: z.string().describe("Purpose: Crop Cultivation, Equipment Purchase, Land Improvement, Livestock Purchase, Working Capital"),
        requestedAmount: z.number().describe("Loan amount requested in INR"),
        tenureYears: z.number().describe("Loan tenure in years: 1, 2, 3, 5, or 7"),
        
        // Note: farmerName, farmLocation, and acres are automatically fetched from backend via userDataTool
    }),
    outputSchema: z.object({
        message: z.string(),
        eligible: z.boolean(),
        estimatedAmount: z.number(),
        fraudRiskScore: z.number(),
        requirements: z.array(z.string()),
    }),
})
    .then(fetchUserDataStep)
    .then(checkEligibilityOnlyStep)
    .then(formatEligibilityResponseStep)
    .commit();
