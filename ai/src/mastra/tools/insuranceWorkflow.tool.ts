import { createTool } from "@mastra/core";
import { z } from "zod";
import axios from "axios";

/**
 * Tool to submit an insurance claim directly to the backend
 * This tool:
 * - Sends claim data to the backend
 * - Gets claim guidance and validation
 * - Saves to database
 * - Returns formatted response
 */
export const insuranceWorkflowTool = createTool({
    id: "submit-insurance-claim",
    description: "Submit an insurance claim for crop damage or loss. This validates the claim, saves it to the database, and returns the claim status with next steps.",
    inputSchema: z.object({
        userId: z.string().describe("Firebase UID of the authenticated user"),
        provider: z.string().describe("Insurance provider name (e.g., AIC, IFFCO Tokio, Bajaj Allianz, HDFC ERGO, Tata AIG)"),
        uin: z.string().optional().describe("Universal Insurance Number (UIN)"),
        policyNumber: z.string().optional().describe("Policy number"),
        claimAmount: z.coerce.number().optional().describe("Amount being claimed in rupees"),
        crop: z.string().optional().describe("Type of crop affected"),
        damageReason: z.string().optional().describe("Reason for damage (drought, flood, pest, disease, etc.)")
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        claimId: z.string().optional(),
        status: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const { userId, provider, uin, policyNumber, claimAmount, crop, damageReason } = context;

        try {
            // Prepare claim payload for backend
            const claimPayload = {
                firebaseUid: userId,
                provider: provider,
                uin: uin || "",
                policyNumber: policyNumber || "",
                claimAmount: claimAmount || 0,
                crop: crop || "General",
                damageReason: damageReason || "Crop damage",
                status: "PENDING"
            };

            console.log('[Insurance Tool] Submitting claim to backend:', claimPayload);

            // Call the backend insurance endpoint directly
            const response = await axios.post(
                'http://localhost:5000/insurance/create',
                claimPayload,
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = response.data;
            console.log('[Insurance Tool] Backend response:', result);

            if (result.success || result._id || result.id) {
                const claimId = result._id || result.id || result.claimId || 'PENDING';
                
                let message = `✅ **Insurance Claim Submitted Successfully!**\n\n`;
                message += `📋 **Claim ID:** ${claimId}\n`;
                message += `🏢 **Provider:** ${provider}\n`;
                if (uin) message += `🔢 **UIN:** ${uin}\n`;
                if (policyNumber) message += `📄 **Policy Number:** ${policyNumber}\n`;
                if (claimAmount) message += `💰 **Claim Amount:** ₹${claimAmount.toLocaleString('en-IN')}\n`;
                if (crop) message += `🌾 **Crop:** ${crop}\n`;
                message += `📊 **Status:** PENDING\n\n`;
                
                message += `📝 **Required Documents:**\n`;
                message += `1. Aadhaar card\n`;
                message += `2. Land ownership document (7/12 extract)\n`;
                message += `3. Crop photographs showing damage\n`;
                message += `4. Bank account details\n\n`;
                
                message += `📋 **Next Steps:**\n`;
                message += `1. Report crop loss within 72 hours\n`;
                message += `2. Contact insurance company toll-free number\n`;
                message += `3. Submit required documents\n`;
                message += `4. Wait for field inspection by insurance surveyor\n`;
                message += `5. Claim settlement within 30-45 days`;

                return {
                    success: true,
                    message,
                    claimId,
                    status: "PENDING",
                };
            } else {
                return {
                    success: false,
                    message: `❌ Insurance claim failed: ${result.message || 'Unknown error'}`,
                };
            }
        } catch (error: any) {
            console.error('[Insurance Tool] Error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    message: "❌ Unable to submit insurance claim. The server is not available. Please try again later."
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
                message: `❌ Failed to submit insurance claim: ${error.response?.data?.message || error.message || 'Unknown error'}`
            };
        }
    },
});
