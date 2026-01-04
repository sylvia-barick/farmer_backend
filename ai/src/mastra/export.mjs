// This file simply re-exports the mastra instance from the built output
// We're importing from a specific location in the built bundle where mastra is defined

// Import the entire built output
const indexUrl = new URL('../../.mastra/output/index.mjs', import.meta.url);

// Parse and extract just the mastra instance without running the server code
// by dynamically importing and immediately extracting what we need
const importMastra = async () => {
  // We need to prevent the server from starting, but the built index.mjs
  // starts a server at the top level. The best approach is to extract
  // the mastra instance definition and re-create it here.
  
  // For now, we'll just re-export from the source since we can't avoid the TS issue
  // The solution is to run Mastra separately as its own service
  throw new Error('Cannot import Mastra directly due to TypeScript/ESM limitations. Please run Mastra as a separate service using "npm run dev" in the ai/ directory.');
};

export const mastra = await importMastra();

export const mastra = new Mastra({
  workflows: {
    diseaseWorkflow,
    weatherWorkflow,
    loanWorkflow,
    loanApplicationWorkflow,
    loanEligibilityWorkflow,
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
    enabled: false,
  },
  observability: {
    default: { enabled: true },
  },
});
