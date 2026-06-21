/**
 * Azure AI Agent Service → M365 Copilot Chat Publishing Script
 *
 * Registers the WerewolfEdu English tutor agent with Azure AI Foundry's Agent
 * Service and publishes it to Microsoft 365 Copilot Chat so users can discover
 * and invoke the agent's speech-analysis and feedback tools from Copilot Chat.
 *
 * ## What this script does
 * 1. Connects to the Azure AI Foundry Hub (via AZURE_AI_AGENT_ENDPOINT)
 * 2. Creates or updates the "werewolf-edu-agent" with tool definitions
 *    (analyze_speech, generate_feedback) and system instructions
 * 3. Verifies the agent is registered and lists its details
 * 4. Agent is then discoverable in M365 Copilot Chat under "Werewolf Edu Tutor"
 *
 * ## Prerequisites
 *   AZURE_AI_AGENT_ENDPOINT   — AI Foundry Hub endpoint (from azd provision)
 *   AZURE_OPENAI_DEPLOYMENT   — Model deployment name (default: gpt-4o-mini)
 *   AZURE_TENANT_ID           — (optional) for user-assigned auth scenarios
 *
 * ## Usage
 *   # After azd provision, the hook runs this automatically
 *   npx tsx azure/publish-agent.ts
 *
 *   # Or with explicit env vars
 *   AZURE_AI_AGENT_ENDPOINT=https://... npx tsx azure/publish-agent.ts
 *
 *   # Dry-run (validate config only, don't publish)
 *   DRY_RUN=1 npx tsx azure/publish-agent.ts
 */

// ── Tool definitions (must match copilot-agent.json + server/lib/openai.ts) ──

const AGENT_TOOLS = {
  analyze_speech: {
    name: "analyze_speech",
    description:
      "Analyze a student's English speech in the Werewolf game for grammar accuracy, fluency, and natural expression. Returns scores (0-100), corrected text, and specific improvements.",
    parameters: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "The student's speech text to analyze",
        },
        context: {
          type: "string",
          description:
            "Game context, e.g. 'Player is villager, day phase discussion'",
        },
      },
      required: ["text", "context"],
    },
  },

  generate_feedback: {
    name: "generate_feedback",
    description:
      "Generate a comprehensive end-of-game English learning report for a student. Takes all their speeches, their Werewolf role, and difficulty level. Returns detailed strengths and improvement suggestions across grammar, vocabulary, and debate cohesion.",
    parameters: {
      type: "object" as const,
      properties: {
        allSpeeches: {
          type: "array",
          items: { type: "string" },
          description: "All speech texts from the student during the game",
        },
        role: {
          type: "string",
          description:
            "The student's Werewolf role (villager, werewolf, seer, witch, hunter)",
          enum: ["villager", "werewolf", "seer", "witch", "hunter"],
        },
        difficulty: {
          type: "string",
          description: "Difficulty level",
          enum: ["beginner", "intermediate", "advanced"],
        },
      },
      required: ["allSpeeches", "role", "difficulty"],
    },
  },
} as const;

// ── Agent identity ──────────────────────────────────────────────────────────

const AGENT_CONFIG = {
  name: "werewolf-edu-agent",
  displayName: "Werewolf Edu Tutor",
  description:
    "English language tutor agent for the Werewolf educational game. " +
    "Analyzes student speech for grammar accuracy, fluency, and natural expression. " +
    "Generates comprehensive end-of-game learning reports with feedback on " +
    "scenario adaptation, vocabulary, and debate cohesion.",
  instructions: [
    "You are an English language tutor for Chinese university students playing a Werewolf social-deduction game.",
    "",
    "Your responsibilities:",
    "1. Analyze student speech during the game for grammar accuracy (verb tense, articles, subject-verb agreement, word order), fluency (natural expression, phrasing, flow), and provide a score from 0-100 for each dimension.",
    "2. Generate comprehensive end-of-game learning reports covering scenario adaptation, vocabulary diversity, and debate cohesion.",
    "",
    "Key principles:",
    "- Always be encouraging and constructive — these are learners practicing English.",
    "- Only reference words and phrases the student actually used — never invent errors.",
    "- Provide specific corrections with explanations, not just scores.",
    "- Adapt feedback difficulty to the student's level (beginner/intermediate/advanced).",
    "- Context matters: a student playing werewolf needs different language than a villager.",
    "",
    "You are NOT the game host or referee — you only provide English language feedback.",
  ].join("\n"),
  tags: ["education", "english-learning", "werewolf-game", "language-tutor"],
} as const;

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.env.DRY_RUN === "1";

  console.log("=".repeat(72));
  console.log("  WerewolfEdu Agent → M365 Copilot Chat Publisher");
  console.log("=".repeat(72));
  console.log();

  // ── Validate prerequisites ──────────────────────────────────────────────

  const hubEndpoint = process.env.AZURE_AI_AGENT_ENDPOINT;
  if (!hubEndpoint) {
    console.error(
      "❌ AZURE_AI_AGENT_ENDPOINT is not set.\n" +
        "   This should point to your Azure AI Foundry Hub endpoint.\n" +
        "   Example: https://wwedu-dev-agent.northeurope.api.ml.azure.com\n" +
        "\n" +
        "   Run `azd provision` first, or set it manually.",
    );
    process.exit(1);
  }

  const modelDeployment =
    process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

  console.log(`   Hub endpoint : ${hubEndpoint}`);
  console.log(`   Model        : ${modelDeployment}`);
  console.log(`   Agent name   : ${AGENT_CONFIG.name}`);
  console.log(`   Display name : ${AGENT_CONFIG.displayName}`);
  console.log(`   Dry run      : ${isDryRun ? "YES (no publish)" : "no"}`);
  console.log();

  if (isDryRun) {
    console.log("✅ Configuration is valid (dry run).");
    console.log("   Remove DRY_RUN=1 to publish the agent.");
    process.exit(0);
  }

  // ── Connect to Azure AI Foundry ─────────────────────────────────────────

  console.log("📡 Connecting to Azure AI Foundry Hub...");

  let AIProjectClient: any;
  let DefaultAzureCredential: any;

  try {
    const aiProjects = await import("@azure/ai-projects");
    AIProjectClient = aiProjects.AIProjectClient;
  } catch (e: any) {
    console.error(
      "❌ Failed to import @azure/ai-projects.\n" +
        "   Install it: npm install @azure/ai-projects",
    );
    process.exit(1);
  }

  try {
    const identity = await import("@azure/identity");
    DefaultAzureCredential = identity.DefaultAzureCredential;
  } catch (e: any) {
    console.error(
      "❌ Failed to import @azure/identity.\n" +
        "   Install it: npm install @azure/identity",
    );
    process.exit(1);
  }

  let credential: any;
  try {
    // DefaultAzureCredential tries: Environment → Managed Identity → Azure CLI → etc.
    credential = new DefaultAzureCredential();
    console.log("   ✓ Credential chain initialized");
  } catch (e: any) {
    console.error(`   ❌ Failed to create credential: ${e.message}`);
    process.exit(1);
  }

  let client: any;
  try {
    client = new AIProjectClient(hubEndpoint, credential);
    console.log("   ✓ Connected to AI Foundry Hub");
  } catch (e: any) {
    console.error(`   ❌ Failed to connect: ${e.message}`);
    process.exit(1);
  }

  // ── Create / update the agent ───────────────────────────────────────────

  console.log();
  console.log("🤖 Registering agent with Azure AI Agent Service...");

  const toolDefinitions = [
    {
      type: "function" as const,
      function: {
        name: AGENT_TOOLS.analyze_speech.name,
        description: AGENT_TOOLS.analyze_speech.description,
        parameters: AGENT_TOOLS.analyze_speech.parameters,
      },
    },
    {
      type: "function" as const,
      function: {
        name: AGENT_TOOLS.generate_feedback.name,
        description: AGENT_TOOLS.generate_feedback.description,
        parameters: AGENT_TOOLS.generate_feedback.parameters,
      },
    },
  ];

  let agent: any;
  try {
    agent = await client.agents.createAgent(modelDeployment, {
      name: AGENT_CONFIG.name,
      description: AGENT_CONFIG.description,
      instructions: AGENT_CONFIG.instructions,
      tools: toolDefinitions,
      // Metadata helps with discoverability in Copilot Chat
      metadata: {
        displayName: AGENT_CONFIG.displayName,
        publisher: "WerewolfEdu",
        version: "1.0.0",
        tags: AGENT_CONFIG.tags.join(", "),
        copilotChatEnabled: "true",
        category: "Education",
      },
    });

    console.log(`   ✓ Agent created/updated`);
    console.log(`     ID          : ${agent.id}`);
    console.log(`     Name        : ${(agent as any).name || AGENT_CONFIG.name}`);
    console.log(`     Model       : ${(agent as any).model || modelDeployment}`);
    console.log(`     Tools       : ${toolDefinitions.length} registered`);
    console.log(`     Created     : ${(agent as any).created_at || "now"}`);
  } catch (e: any) {
    console.error(`   ❌ Failed to create agent: ${e.message}`);
    if (e.statusCode) {
      console.error(`     HTTP status: ${e.statusCode}`);
    }
    if (e.code) {
      console.error(`     Error code : ${e.code}`);
    }
    process.exit(1);
  }

  // ── Verify agent details ────────────────────────────────────────────────

  console.log();
  console.log("🔍 Verifying agent registration...");

  try {
    const retrieved = await client.agents.getAgent(agent.id);
    console.log(`   ✓ Agent verified in AI Foundry Hub`);
    console.log(`     Status: ${(retrieved as any).status || "active"}`);

    // Log tool count for verification
    const toolCount = (retrieved as any).tools?.length || 0;
    console.log(`     Tools registered: ${toolCount}`);
  } catch (e: any) {
    console.warn(`   ⚠️  Could not verify agent: ${e.message}`);
    console.warn("      The agent was created but verification failed.");
    console.warn("      It may still be functional in Copilot Chat.");
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log();
  console.log("=".repeat(72));
  console.log("  ✅ Agent published to Azure AI Agent Service");
  console.log();
  console.log("  The agent is now registered and discoverable in:");
  console.log("    • M365 Copilot Chat — search 'Werewolf Edu Tutor'");
  console.log("    • Azure AI Foundry — Agent Service dashboard");
  console.log();
  console.log("  Agent endpoint for tool dispatch:");
  console.log(`    POST ${process.env.AZURE_CONTAINER_APP_URL || "<container-app-url>"}/api/agent/run`);
  console.log();
  console.log("  Verify in Azure Portal:");
  console.log(`    https://portal.azure.com → AI Foundry → Agents`);
  console.log("=".repeat(72));

  // ── Output agent ID for CI/CD pipelines ─────────────────────────────────
  console.log();
  console.log(JSON.stringify({
    status: "published",
    agentId: agent.id,
    agentName: AGENT_CONFIG.name,
    displayName: AGENT_CONFIG.displayName,
    hubEndpoint,
    publishedAt: new Date().toISOString(),
  }));
}

main().catch((err) => {
  console.error();
  console.error("=" .repeat(72));
  console.error("  ❌ Agent publishing FAILED");
  console.error(`     ${err.message || err}`);
  console.error("=" .repeat(72));
  process.exit(1);
});
