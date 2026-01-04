import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

export const dbTool = createTool({
    id: "save-to-database",
    description: "Save structured data to backend database via controller endpoints",
    inputSchema: z.object({
        collection: z.string().describe("Collection/endpoint name (e.g., 'loanApplication', 'insuranceClaim')"),
        data: z.record(z.string(), z.any()).describe("Data to save"),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        id: z.string().optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const { collection, data } = context;

        try {
            const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

            // Map collection names to actual controller endpoints
            // Note: Routes are mounted at /loan, /insurance, /crop in app.js (not /api/...)
            const endpointMap: Record<string, string> = {
                "loanApplication": "/loan/apply",
                "insuranceClaim": "/insurance/create",
                "yieldPrediction": "/crop/addNewCrop",
                "disease_reports": "/api/disease/report",
                "crop_records": "/crop/addNewCrop",
            };

            const endpoint = endpointMap[collection];

            if (!endpoint) {
                throw new Error(`Unknown collection: ${collection}. Available: ${Object.keys(endpointMap).join(', ')}`);
            }

            console.log(`[dbTool] Saving to ${collection} at ${backendUrl}${endpoint}`);
            console.log(`[dbTool] Data:`, JSON.stringify(data, null, 2));

            const response = await axios.post(`${backendUrl}${endpoint}`, data);

            console.log(`[dbTool] Success! Response:`, response.data);

            return {
                success: true,
                id: response.data?.id || response.data?._id || "saved"
            };
        } catch (error: any) {
            console.error("[dbTool] Database tool error:", error?.response?.data || error?.message || error);

            return {
                success: false,
                error: error?.response?.data?.message || error?.message || "Unknown database error",
            };
        }
    },
});
