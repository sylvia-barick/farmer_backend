import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { loanEligibilityTool } from "../tools/loanEligibility.tool";
import { dbTool } from "../tools/db.tool";
import { userDataTool } from "../tools/userData.tool";

/* -------------------- Step 0: Fetch User Data -------------------- */

const fetchUserDataStep = createStep({
    id: "fetch-user-data",
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
        firebaseUid: z.string(),
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
                tenureMonths: inputData.tenureYears * 12, // Convert years to months
            },
            firebaseUid: inputData.userId, // Pass Firebase UID for backend
        };
    },
});

const checkEligibilityStep = createStep({
    id: "check-loan-eligibility",
    inputSchema: z.object({
        userData: userDataTool.outputSchema,
        formData: z.object({
            cropType: z.string(),
            loanPurpose: z.string(),
            requestedAmount: z.number(),
            tenureMonths: z.number(),
        }),
        firebaseUid: z.string(),
    }),
    outputSchema: z.object({
        eligibility: loanEligibilityTool.outputSchema,
        loanData: z.object({
            firebaseUid: z.string(),
            farmerUid: z.string().optional(),
            farmerName: z.string(),
            farmLocation: z.object({
                lat: z.number(),
                lng: z.number()
            }).optional(),
            cropType: z.string(),
            acres: z.number(),
            loanPurpose: z.string(),
            requestedAmount: z.number(),
            tenureMonths: z.number(),
        }),
    }),
    execute: async ({ inputData }) => {
        const { userData, formData, firebaseUid } = inputData;

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
            eligibility,
            loanData: {
                firebaseUid: firebaseUid,
                farmerName: userData.farmerName!,
                farmLocation: userData.farmLocation,
                cropType: formData.cropType,
                acres: userData.acres!,
                loanPurpose: formData.loanPurpose,
                requestedAmount: formData.requestedAmount,
                tenureMonths: formData.tenureMonths,
            },
        };
    },
});

/* -------------------- Step 2: Persist if Eligible -------------------- */

const persistLoanApplicationStep = createStep({
    id: "persist-loan-application",
    inputSchema: z.object({
        eligibility: loanEligibilityTool.outputSchema,
        loanData: z.object({
            firebaseUid: z.string(),
            farmerUid: z.string().optional(),
            farmerName: z.string(),
            farmLocation: z.object({
                lat: z.number(),
                lng: z.number()
            }).optional(),
            cropType: z.string(),
            acres: z.number(),
            loanPurpose: z.string(),
            requestedAmount: z.number(),
            tenureMonths: z.number(),
        }),
    }),
    outputSchema: z.object({
        eligibility: loanEligibilityTool.outputSchema,
        saved: z.boolean(),
        loanId: z.string().optional(),
    }),
    execute: async ({ inputData }) => {
        const { eligibility, loanData } = inputData;

        if (!eligibility.eligible) {
            return {
                eligibility,
                saved: false,
            };
        }

        // Save to database via controller endpoint
        const dbResult = await dbTool.execute({
            context: {
                collection: "loanApplication",
                data: {
                    farmerUid: loanData.firebaseUid, // Use firebaseUid for database
                    farmerName: loanData.farmerName,
                    farmLocation: loanData.farmLocation,
                    cropType: loanData.cropType,
                    acres: loanData.acres,
                    loanPurpose: loanData.loanPurpose,
                    requestedAmount: loanData.requestedAmount,
                    tenureMonths: loanData.tenureMonths,
                    fraudRiskScore: eligibility.fraudRiskScore,
                    status: eligibility.fraudRiskScore < 30 ? 'APPROVED' : 'PENDING',
                },
            },
        } as any);

        return {
            eligibility,
            saved: dbResult.success,
            loanId: dbResult.id,
        };
    },
});

/* -------------------- Step 3: Format Final Response -------------------- */

const formatResponseStep = createStep({
    id: "format-loan-response",
    inputSchema: z.object({
        eligibility: loanEligibilityTool.outputSchema,
        saved: z.boolean(),
        loanId: z.string().optional(),
    }),
    outputSchema: z.object({
        message: z.string(),
    }),
    execute: async ({ inputData }) => {
        const { eligibility, saved, loanId } = inputData;

        let message = eligibility.reason;

        if (saved && loanId) {
            message += `\n\n✅ Application saved successfully (ID: ${loanId})`;
            if (eligibility.fraudRiskScore < 30) {
                message += `\n🎉 Your loan has been auto-approved! Low risk score detected.`;
            } else {
                message += `\n⏳ Your application is under review.`;
            }
        } else if (!eligibility.eligible) {
            message += `\n\n❌ Unfortunately, you don't meet the minimum requirements.`;
        }

        return { message };
    },
});

/* -------------------- Workflow: Apply for Loan (After Eligibility Check) -------------------- */

export const loanApplicationWorkflow = createWorkflow({
    id: "loan-application-workflow",
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
        loanId: z.string().optional(),
        saved: z.boolean(),
    }),
})
    .then(fetchUserDataStep)
    .then(checkEligibilityStep)
    .then(persistLoanApplicationStep)
    .then(formatResponseStep)
    .commit();

// Export both workflows
export { loanApplicationWorkflow as loanWorkflow };
