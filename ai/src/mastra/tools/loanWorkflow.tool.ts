import { createTool } from "@mastra/core";
import { z } from "zod";
import axios from "axios";

/**
 * Tool to submit a loan application directly to the backend
 * This tool:
 * - Sends loan data to the backend
 * - Gets eligibility, fraud risk, and saves to database
 * - Returns formatted response
 */
export const loanWorkflowTool = createTool({
    id: "submit-loan-application",
    description: "Submit a complete loan application to the backend. This checks eligibility, calculates fraud risk, and saves the application to the database. Returns the application status and details.",
    inputSchema: z.object({
        userId: z.string().describe("Firebase UID of the authenticated user"),
        cropType: z.string().describe("Type of crop being cultivated (e.g., Wheat, Rice, Corn)"),
        loanPurpose: z.string().describe("Purpose of the loan: crop-cultivation, equipment-purchase, or land-improvement"),
        requestedAmount: z.coerce.number().describe("Amount requested by farmer in rupees (number only)"),
        tenureYears: z.coerce.number().describe("Loan repayment period in years (1-10)")
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        loanId: z.string().optional(),
        status: z.string().optional(),
        fraudRiskScore: z.number().optional(),
        fraudRiskLevel: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const { userId, cropType, loanPurpose, requestedAmount, tenureYears } = context;

        try {
            // Convert tenure from years to months
            const tenureMonths = tenureYears * 12;

            // Prepare loan payload for backend
            const loanPayload = {
                farmerUid: userId,
                cropType: cropType,
                loanPurpose: loanPurpose,
                requestedAmount: requestedAmount,
                tenureMonths: tenureMonths,
            };

            console.log('[Loan Tool] Submitting loan to backend:', loanPayload);

            // Call the backend loan endpoint directly
            const response = await axios.post(
                'http://localhost:5000/loan/apply',
                loanPayload,
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = response.data;
            console.log('[Loan Tool] Backend response:', result);

            if (result.success) {
                // Format success message
                const riskEmoji = result.fraudRiskLevel === 'LOW' ? '🟢' : 
                                  result.fraudRiskLevel === 'MEDIUM' ? '🟡' : '🔴';
                
                let message = `✅ **Loan Application Submitted Successfully!**\n\n`;
                message += `📋 **Application ID:** ${result.id}\n`;
                message += `💰 **Requested Amount:** ₹${requestedAmount.toLocaleString('en-IN')}\n`;
                message += `📅 **Tenure:** ${tenureYears} year(s)\n`;
                message += `🌾 **Crop:** ${cropType}\n`;
                message += `🎯 **Purpose:** ${loanPurpose}\n\n`;
                message += `${riskEmoji} **Fraud Risk Score:** ${result.fraudRiskScore}/100 (${result.fraudRiskLevel})\n`;
                message += `📊 **Status:** ${result.status}\n\n`;
                
                if (result.fraudRiskLevel === 'LOW') {
                    message += `🎉 Great news! Your application has a low risk score and will be processed quickly.\n`;
                } else if (result.fraudRiskLevel === 'MEDIUM') {
                    message += `⏳ Your application is under review. An admin will verify your details.\n`;
                } else {
                    message += `⚠️ Your application requires additional verification.\n`;
                }
                
                message += `\n📝 **Next Steps:**\n`;
                message += `1. Keep your Aadhaar card ready\n`;
                message += `2. Prepare land ownership documents (7/12 extract)\n`;
                message += `3. Have your bank account details handy\n`;
                message += `4. An officer will contact you within 2-3 business days`;

                return {
                    success: true,
                    message,
                    loanId: result.id,
                    status: result.status,
                    fraudRiskScore: result.fraudRiskScore,
                    fraudRiskLevel: result.fraudRiskLevel,
                };
            } else {
                return {
                    success: false,
                    message: `❌ Loan application failed: ${result.message || 'Unknown error'}`,
                };
            }
        } catch (error: any) {
            console.error('[Loan Tool] Error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    message: "❌ Unable to submit loan application. The server is not available. Please try again later."
                };
            }

            if (error.response?.status === 429) {
                return {
                    success: false,
                    message: "❌ Too many requests. Please wait a moment and try again."
                };
            }

            return {
                success: false,
                message: `❌ Failed to submit loan application: ${error.response?.data?.message || error.message || 'Unknown error'}`
            };
        }
    },
});