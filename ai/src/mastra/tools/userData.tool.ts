import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

export const userDataTool = createTool({
    id: "fetch-user-data",
    description: "Fetch user profile and farm data from backend/Firebase",
    inputSchema: z.object({
        userId: z.string().describe("User ID to fetch data for"),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        farmerName: z.string().optional(),
        farmLocation: z.object({
            lat: z.number(),
            lng: z.number()
        }).optional(),
        acres: z.number().optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const { userId } = context;

        try {
            const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
            
            // Fetch user profile and farm data
            const response = await axios.get(`${backendUrl}/api/user/${userId}/profile`);
            
            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.message || "Failed to fetch user data",
                };
            }

            const userData = response.data.data;
            
            return {
                success: true,
                farmerName: userData.farmerName,
                farmLocation: userData.farmLocation,
                acres: userData.acres,
            };
        } catch (error: any) {
            console.error("User data fetch error:", error);
            
            return {
                success: false,
                error: error?.response?.data?.message || error?.message || "Failed to fetch user data",
            };
        }
    },
});
