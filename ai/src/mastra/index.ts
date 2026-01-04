// src/mastra/index.ts (or src/index.ts depending on your layout)
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";

// Import from your AI barrel
import {
  farmerAssistantAgent,
  // diseaseWorkflow,
  // weatherWorkflow,
} from "./agents/farmerAssistant.agent";
import { loanWorkflow, loanApplicationWorkflow } from "./workflows/loan.workflow";
import { loanEligibilityWorkflow } from "./workflows/loanEligibility.workflow";
import { insuranceWorkflow } from "./workflows/insurance.workflow";
import { weatherWorkflow } from "./workflows/weather.workflow";
import { diseaseWorkflow } from "./workflows/disease.workflow";
export const mastra = new Mastra({
  workflows: {
    diseaseWorkflow,
    weatherWorkflow,
    loanWorkflow, // Full application workflow (for backward compatibility)
    loanApplicationWorkflow, // Same as loanWorkflow
    loanEligibilityWorkflow, // Check eligibility only
    insuranceWorkflow,
  },
  agents: {
    farmerAssistantAgent,
  },
  storage: new LibSQLStore({
    url: ":memory:",
  }),

  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    enabled: false, // if you're on a version where OTEL telemetry is deprecated
  },
  observability: {
    default: { enabled: true },
  },
});