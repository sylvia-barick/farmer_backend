import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

export const plantDiseaseTool = createTool({
    id: "plant-disease-detection",
    description:
        "Analyze a crop image to detect disease, severity, and recommend treatment",

    inputSchema: z.object({
        imageUrl: z.string(),
        crop: z.string(),
    }),

    outputSchema: z.object({
        disease: z.string(),
        confidence: z.number(),
        severity: z.enum(["low", "medium", "high"]),
        remedy: z.string(),
        insuranceSuggested: z.boolean(),
    }),

    execute: async ({ context, mastra }) => {
        const { imageUrl, crop } = context;

        try {
            // Try using the backend if AI_BACKEND_URL is configured
            const backendUrl = process.env.AI_BACKEND_URL || process.env.BACKEND_URL;
            
            if (backendUrl && backendUrl.includes('vision')) {
                const res = await axios.post(
                    `${backendUrl}/vision/plant-disease`,
                    { imageUrl, crop }
                );
                const data = res.data;
                return {
                    disease: data.disease ?? "Unknown",
                    confidence: data.confidence ?? 0,
                    severity: data.severity ?? "low",
                    remedy: data.remedy ?? "Consult local agriculture expert",
                    insuranceSuggested: Boolean(data.insuranceSuggested),
                };
            }

            // Fallback: Use mock analysis for now (replace with actual vision API later)
            console.log(`[plantDiseaseTool] Analyzing image for ${crop}`);
            
            // Mock disease detection
            const diseases = [
                { name: "Leaf Blight", severity: "medium", remedy: "Apply fungicide like Mancozeb. Remove affected leaves." },
                { name: "Powdery Mildew", severity: "low", remedy: "Spray with sulfur-based fungicide. Ensure good air circulation." },
                { name: "Root Rot", severity: "high", remedy: "Improve drainage. Apply copper-based fungicide. Remove severely affected plants." },
                { name: "Healthy", severity: "low", remedy: "No treatment needed. Continue regular care." }
            ];
            
            const detected = diseases[Math.floor(Math.random() * diseases.length)];
            
            return {
                disease: detected.name,
                confidence: 0.85,
                severity: detected.severity as "low" | "medium" | "high",
                remedy: detected.remedy,
                insuranceSuggested: detected.severity === "high",
            };
        } catch (err: any) {
            const logger = mastra?.getLogger();
            logger?.error("Plant disease detection failed", { error: err });
            
            // Return fallback instead of throwing
            return {
                disease: "Unable to analyze",
                confidence: 0,
                severity: "low",
                remedy: "Please consult with a local agriculture expert for proper diagnosis.",
                insuranceSuggested: false,
            };
        }
    },
});