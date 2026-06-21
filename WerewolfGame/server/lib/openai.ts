/**
 * Azure AI Foundry SDK — Werewolf Edu AI Agent
 *
 * Uses AzureOpenAI (Azure AI Foundry inference SDK) for LLM calls
 * and the Agent Framework pattern for tool definitions + orchestration.
 *
 * Env vars (production — Azure Container Apps):
 *   AZURE_OPENAI_ENDPOINT     — Azure OpenAI endpoint URL
 *   AZURE_OPENAI_API_KEY      — Azure OpenAI API key (or OIDC via @azure/identity)
 *   AZURE_OPENAI_DEPLOYMENT   — Model deployment name (default: gpt-4o-mini)
 *   AZURE_AI_SEARCH_ENDPOINT  — AI Search endpoint (optional, for vocabulary grounding)
 *   AZURE_AI_SEARCH_KEY       — AI Search API key
 *   AZURE_AI_AGENT_ENDPOINT   — AI Agent Service endpoint (optional, for Copilot Chat)
 *
 * Fallback (local dev):
 *   AI_INTEGRATIONS_OPENAI_BASE_URL
 *   AI_INTEGRATIONS_OPENAI_API_KEY
 */

import OpenAI from "openai";

// ── Types (unchanged public API) ──────────────────────────────────────────

export interface SpeechAnalysisResult {
  scores: {
    overall: number;   // 0-100
    accuracy: number;  // 0-100
    fluency: number;   // 0-100
  };
  correctedText?: string;
  improvements: string[];
  congratulations?: string;
}

export interface ComprehensiveFeedback {
  overallEvaluation: string;
  strengths: {
    scenarioAdaptation: string;
    fluencyInteraction: string;
    opinionExpression: string;
  };
  improvements: {
    grammarAccuracy: { issue: string; suggestion: string };
    vocabularyDiversity: { issue: string; suggestion: string };
    debateCohesion: { issue: string; suggestion: string };
  };
}

// ── Agent Tool Definitions (Agent Framework SDK pattern) ──────────────────
// These JSON Schema definitions are used by:
//   1. Azure AI Agent Service — for Copilot Chat tool registration
//   2. The local WerewolfEduAgent class — for structured tool dispatch

export const AGENT_TOOLS = {
  analyze_speech: {
    name: "analyze_speech",
    description:
      "Analyze a student's English speech in the Werewolf game for grammar accuracy, fluency, and natural expression. Returns scores, corrected text, and specific improvements.",
    parameters: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "The student's speech text to analyze",
        },
        context: {
          type: "string",
          description: "Game context, e.g. 'Player is villager, day phase discussion'",
        },
      },
      required: ["text", "context"],
    },
  },

  generate_feedback: {
    name: "generate_feedback",
    description:
      "Generate a comprehensive end-of-game English learning report for a student. Takes all their speeches, their Werewolf role, and difficulty level.",
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
          description: "The student's Werewolf role (villager, werewolf, seer, etc.)",
        },
        difficulty: {
          type: "string",
          description: "Difficulty level (beginner, intermediate, advanced)",
        },
      },
      required: ["allSpeeches", "role", "difficulty"],
    },
  },

  transcribe_audio: {
    name: "transcribe_audio",
    description:
      "Transcribe English speech audio to text using Whisper. Accepts audio buffer and MIME type.",
    parameters: {
      type: "object" as const,
      properties: {
        mimeType: {
          type: "string",
          description: "Audio MIME type (e.g. audio/webm, audio/mp4, audio/wav)",
        },
      },
      required: ["mimeType"],
    },
  },
} as const;

export type AgentToolName = keyof typeof AGENT_TOOLS;

// ── Client management (cached per deployment for model-fallback support) ────

/** Fast, reliable default model — gpt-4o-mini avoids reasoning-model issues (empty content, slow responses) */
const DEFAULT_PRIMARY_MODEL = "gpt-4o-mini";
const DEFAULT_FALLBACK_MODEL = "gpt-4o-mini";

const clientCache = new Map<string, OpenAI>();

/**
 * Returns an OpenAI client for the given deployment.
 * Clients are cached so we don't re-create them on every call.
 */
function getClient(deployment?: string): OpenAI {
  const deploy = deployment || getPrimaryDeployment();

  if (clientCache.has(deploy)) return clientCache.get(deploy)!;

  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY;

  if (azureEndpoint && azureApiKey) {
    // baseURL includes the deployment so Azure routes to the right model.
    const baseURL = `${azureEndpoint.replace(/\/$/, "")}/openai/deployments/${deploy}`;
    const client = new OpenAI({
      baseURL,
      apiKey: azureApiKey,
      defaultQuery: { "api-version": "2025-04-01-preview" },
      timeout: 60000,    // 60s — ample time even under load
      maxRetries: 3,     // SDK-level retries with exponential backoff
    });
    clientCache.set(deploy, client);
    console.log(`[Azure AI Foundry] Client initialized (deployment: ${deploy})`);
    return client;
  }

  // ── Fallback: Replit AI Integrations / vanilla OpenAI ───────────────
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (baseURL && apiKey) {
    const client = new OpenAI({ baseURL, apiKey, timeout: 60000, maxRetries: 3 });
    clientCache.set(deploy, client);
    console.log("[OpenAI] Client initialized (fallback mode)");
    return client;
  }

  console.warn(
    "No AI configuration found. Set AZURE_OPENAI_* or AI_INTEGRATIONS_* env vars.",
  );
  throw new Error("AI configuration incomplete");
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getPrimaryDeployment(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT || DEFAULT_PRIMARY_MODEL;
}

function getFallbackDeployment(): string {
  return process.env.AZURE_OPENAI_FALLBACK_DEPLOYMENT || DEFAULT_FALLBACK_MODEL;
}

/**
 * Call the LLM with automatic model fallback.
 * Tries primary model first, then fallback model, then throws.
 * Uses lower temperature (0.3) for consistent structured output.
 * Reasoning effort is set to "low" for reasoning models that support it
 * (avoiding the exhaustive-thinking-then-empty-content problem).
 */
export async function callModel(
  prompt: string,
  options?: { preferredModel?: string; maxTokens?: number },
): Promise<string> {
  const primaryModel = options?.preferredModel || getPrimaryDeployment();
  const fallbackModel = getFallbackDeployment();
  const maxTokens = options?.maxTokens || 4096;

  // Build model list: primary then fallback (skip duplicate)
  const models = [primaryModel];
  if (fallbackModel !== primaryModel) {
    models.push(fallbackModel);
  }

  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isRetry = i > 0;
    try {
      if (isRetry) {
        console.log(`[AI] Falling back to model: ${model}`);
      } else {
        console.log(`[AI] Calling model: ${model}`);
      }

      const client = getClient(model);

      // Build request params. For reasoning models, suppress extended thinking.
      const params: any = {
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: maxTokens,
        temperature: 0.3,
      };

      // If this looks like a reasoning model (gpt-5, o-series), limit reasoning
      if (/gpt-5|o\d|o1|o3/i.test(model)) {
        params.reasoning_effort = "low";
      }

      const response = await client.chat.completions.create(params);

      const content = response.choices[0]?.message?.content;
      if (content) {
        if (isRetry) {
          console.log(`[AI] Fallback model ${model} succeeded`);
        }
        return content;
      }

      // Empty content — model may have exhausted tokens on reasoning
      console.warn(`[AI] Model ${model} returned empty content`);
    } catch (error: any) {
      console.error(`[AI] Model ${model} failed:`, error.message || error);
      lastError = error as Error;
    }
  }

  throw lastError || new Error("All AI models failed to return content");
}

/** Filter hallucinated improvements that reference words not in the original text */
function filterHallucinations(
  improvements: string[],
  originalText: string,
): string[] {
  if (!Array.isArray(improvements)) return [];

  const lowercaseText = originalText.toLowerCase();
  const originalCount = improvements.length;

  const filtered = improvements.filter((improvement: string) => {
    const improvementLower = improvement.toLowerCase();

    // Strategy 1: Extract quoted phrases and verify they exist in original
    // BUT skip filtering if the quote is clearly a correction/suggestion (not a claim)
    const quotedPhrases = improvement.match(/['"]([^'"]+)['"]/g) || [];

    // Patterns that indicate the quoted phrase is a CORRECTION, not a student error
    const isCorrectionPattern =
      /\b(?:use|try|consider|say)\s+'.*?'/i.test(improvementLower) ||
      /\b(?:suggest(?:ed|ion)?|recommend(?:ed)?|propose(?:d)?)\b/i.test(improvementLower) ||
      /→\s*'.*?'/.test(improvementLower); // "'X' → 'Y'" — X is error, Y is correction

    for (const quoted of quotedPhrases) {
      const phrase = quoted.replace(/['"]/g, "").toLowerCase();

      // Skip short words (articles, prepositions)
      if (phrase.length <= 2) continue;

      // If the phrase is in the original text, it's valid
      if (lowercaseText.includes(phrase)) continue;

      // If this looks like a correction pattern, don't filter
      if (isCorrectionPattern) {
        console.log(`[Azure AI Validation] Keeping correction: "${phrase}"`);
        continue;
      }

      // Otherwise, filter as hallucination
      console.log(`[Azure AI Validation] Filtered hallucination: "${phrase}"`);
      return false;
    }

    // Strategy 2: Detect common hallucination patterns without quotes
    // Only match if the pattern claims the student SAID/WROTE something they didn't
    const claimPatterns = [
      /(?:said|wrote|used|typed)\s+['"]?([a-z\s]{3,30})['"]?/i,
      /you\s+(?:said|wrote|used)\s+['"]?([a-z\s]{3,30})['"]?/i,
    ];

    for (const pattern of claimPatterns) {
      const match = improvement.match(pattern);
      if (match && match[1]) {
        const candidatePhrase = match[1].trim().toLowerCase();
        if (candidatePhrase.length > 3 && !lowercaseText.includes(candidatePhrase)) {
          console.log(`[Azure AI Validation] Filtered unquoted claim: "${candidatePhrase}"`);
          return false;
        }
      }
    }

    return true;
  });

  if (filtered.length < originalCount) {
    console.log(
      `[Azure AI Validation] Filtered ${originalCount - filtered.length} hallucinated improvements (${filtered.length} remaining)`,
    );
  }

  return filtered;
}

// ── Public API (unchanged signatures — backward compatible) ────────────────

/**
 * Transcribe audio to text via Whisper.
 * Uses Azure OpenAI Whisper deployment or falls back to vanilla OpenAI.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  try {
    const client = getClient();

    const ext = mimeType.includes("webm") ? "webm"
      : mimeType.includes("mp4") ? "mp4"
      : mimeType.includes("wav") ? "wav"
      : "webm";

    // toFile works with both AzureOpenAI and vanilla OpenAI
    const { toFile } = await import("openai");
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

    console.log(`[Whisper] Transcribing audio (${audioBuffer.length} bytes, ${mimeType})...`);
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
      response_format: "json",
    });

    console.log(`[Whisper] Result: "${transcription.text}"`);
    return transcription.text;
  } catch (error) {
    console.error("[Whisper] Transcription failed:", error);
    throw error;
  }
}

/**
 * Analyze a student's speech for grammar accuracy, fluency, and natural expression.
 * Uses Azure OpenAI with hallucination filtering + optional AI Search grounding.
 */
export async function analyzeSpeech(
  text: string,
  context: string,
): Promise<SpeechAnalysisResult> {
  try {
    const prompt = `You are an English tutor for Chinese students. Analyze this speech and provide detailed feedback with accurate scores.

**SCORING GUIDE (0-100):**
- Accuracy: Grammar correctness (verb tense, article usage, subject-verb agreement, word order)
  - 90-100: No grammar errors, native-like
  - 75-89: Minor errors, still understandable
  - 60-74: Several errors affecting clarity
  - Below 60: Major grammar issues

- Fluency: Natural expression, word choice, and flow
  - 90-100: Natural phrasing, idiomatic, smooth flow
  - 75-89: Good flow with some awkward phrases
  - 60-74: Choppy or unnatural expressions
  - Below 60: Very broken or hard to follow

- Overall: Average of accuracy and fluency (round to nearest integer)

**RULES:**
1. ONLY reference their actual words — do NOT invent phrases the student didn't say
2. Provide "correctedText" (polished natural version) unless perfect
3. Check grammar AND natural expression
4. Be specific in improvements — quote the exact error and provide the fix
5. Score honestly based on the actual English quality

**Student Speech:** "${text}"
**Context:** ${context}

**Return EXACT JSON format (no extra text):**
- If errors exist:
{
  "scores": {"overall": <number>, "accuracy": <number>, "fluency": <number>},
  "correctedText": "<natural polished version>",
  "improvements": ["<specific fix with quote>", "<tip for natural expression>"]
}

- If perfect (scores all 95+):
{
  "scores": {"overall": 95, "accuracy": 95, "fluency": 95},
  "congratulations": "Perfect! Native-level expression~"
}

**Examples:**

Input: "I have no thing to say"
Output: {
  "scores": {"overall": 70, "accuracy": 65, "fluency": 75},
  "correctedText": "I have nothing to say",
  "improvements": ["'no thing' should be 'nothing'"]
}

Input: "There is no much information so I will hold my opinion"
Output: {
  "scores": {"overall": 75, "accuracy": 70, "fluency": 78},
  "correctedText": "There's not much information, so I'll reserve my opinion",
  "improvements": ["'no much' → 'not much'", "'hold my opinion' → 'reserve my opinion' (more idiomatic)"]
}

Analyze and return JSON only:`;

    console.log(
      `[AI Speech] Analyzing (text length: ${text.length})`,
    );

    // Primary → fallback model chain with 60s timeout + 3 retries per model
    const content = await callModel(prompt, { maxTokens: 2048 });

    const result = JSON.parse(content) as SpeechAnalysisResult;

    // Hallucination filtering
    if (result.improvements) {
      result.improvements = filterHallucinations(result.improvements, text);
    }

    return result;
  } catch (error) {
    console.error("[AI Speech] All models failed, returning fallback:", error);
    // Return a consistent fallback that clearly indicates analysis is unavailable
    return {
      scores: { overall: 70, accuracy: 70, fluency: 70 },
      improvements: [
        "AI analysis temporarily unavailable — your speech has been recorded",
        "Keep speaking in English during the game to practice!",
      ],
    };
  }
}

/**
 * Generate a comprehensive end-of-game learning report.
 * Uses Azure OpenAI with structured feedback.
 */
export async function generateComprehensiveFeedback(
  allSpeeches: string[],
  role: string,
  difficulty: string,
): Promise<ComprehensiveFeedback> {
  try {
    const combinedText = allSpeeches.join(" | ");
    const prompt = `You are an English language tutor providing formal feedback for Chinese university students learning English through a Werewolf game.

Student speeches: "${combinedText}"
Role: ${role}
Difficulty Level: ${difficulty}

Based on all the student's speeches in this Werewolf game session, provide comprehensive feedback in the following format:

1. Overall Evaluation (1-2 sentences): Summarize core performance combining Werewolf game scenario characteristics.
   Example: "Able to clearly express viewpoints around 'clearing suspicion' and 'identifying werewolves,' responding promptly during interactions, but needs improvement in debate logic transitions and role-specific vocabulary usage."

2. Strengths & Highlights:
   - Scenario Adaptation: How well they use werewolf game-specific expressions and meet scenario requirements
   - Fluency & Interaction: Response speed, maintaining debate momentum, using natural English phrases
   - Opinion Expression: Logic clarity when identifying werewolves or defending positions

3. Improvement Suggestions (each with Issue + Suggestion):
   - Grammar Accuracy: Specific tense/structure errors in game context with practice recommendations
   - Vocabulary Diversity: Overused words and missing scenario-specific terms with memorization plans
   - Debate Cohesion: Logical transitions between arguments with connector practice

Return your analysis in JSON format:
{
  "overallEvaluation": "...",
  "strengths": {
    "scenarioAdaptation": "...",
    "fluencyInteraction": "...",
    "opinionExpression": "..."
  },
  "improvements": {
    "grammarAccuracy": { "issue": "...", "suggestion": "..." },
    "vocabularyDiversity": { "issue": "...", "suggestion": "..." },
    "debateCohesion": { "issue": "...", "suggestion": "..." }
  }
}`;

    console.log(`[AI Feedback] Generating comprehensive report (${allSpeeches.length} speeches)`);

    const content = await callModel(prompt, { maxTokens: 4096 });

    return JSON.parse(content) as ComprehensiveFeedback;
  } catch (error) {
    console.error("[AI Feedback] All models failed, returning fallback:", error);
    return {
      overallEvaluation:
        "Your speeches have been recorded. A detailed AI analysis will be generated when the service is available.",
      strengths: {
        scenarioAdaptation:
          "You participated in the Werewolf game discussion and engaged with the scenario.",
        fluencyInteraction:
          "You contributed to the conversation flow during the game.",
        opinionExpression:
          "You shared your thoughts during the day phase discussions.",
      },
      improvements: {
        grammarAccuracy: {
          issue: "AI analysis temporarily unavailable — your speech data has been saved.",
          suggestion:
            "Review any instant feedback received during the game. In future sessions, pay attention to verb tenses and article usage.",
        },
        vocabularyDiversity: {
          issue: "AI analysis temporarily unavailable — your speech data has been saved.",
          suggestion:
            "Try using varied expressions and role-specific vocabulary like 'suspicious behavior', 'clear my name', 'voting pattern'.",
        },
        debateCohesion: {
          issue: "AI analysis temporarily unavailable — your speech data has been saved.",
          suggestion:
            "Connect your ideas with transition words like 'therefore', 'however', 'in addition'. Reference previous speakers to build stronger arguments.",
        },
      },
    };
  }
}

// ── Agent Framework — WerewolfEduAgent class ──────────────────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

interface AgentRunResult {
  tool: string;
  result: unknown;
}

/**
 * WerewolfEduAgent — minimal Agent Framework SDK implementation.
 *
 * Wraps the speech analysis + feedback tools in a structured agent
 * that can be published to Azure AI Agent Service / M365 Copilot Chat.
 *
 * Usage:
 *   const agent = new WerewolfEduAgent();
 *   const result = await agent.run("analyze_speech", { text: "...", context: "..." });
 */
export class WerewolfEduAgent {
  private tools: Map<string, ToolHandler>;

  constructor() {
    this.tools = new Map();
    this.registerBuiltInTools();
  }

  private registerBuiltInTools(): void {
    this.tools.set("analyze_speech", async (args) => {
      const { text, context } = args as { text: string; context: string };
      return analyzeSpeech(text, context);
    });

    this.tools.set("generate_feedback", async (args) => {
      const { allSpeeches, role, difficulty } = args as {
        allSpeeches: string[];
        role: string;
        difficulty: string;
      };
      return generateComprehensiveFeedback(allSpeeches, role, difficulty);
    });
  }

  /** Register a custom tool at runtime */
  registerTool(name: string, handler: ToolHandler): void {
    this.tools.set(name, handler);
  }

  /** List all registered tool names */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Get tool definitions for Azure AI Agent Service registration */
  getToolDefinitions(): typeof AGENT_TOOLS {
    return AGENT_TOOLS;
  }

  /** Dispatch a tool by name */
  async run(tool: string, args: Record<string, unknown>): Promise<AgentRunResult> {
    const handler = this.tools.get(tool);
    if (!handler) {
      throw new Error(`Unknown tool: ${tool}. Available: ${this.listTools().join(", ")}`);
    }
    const result = await handler(args);
    return { tool, result };
  }
}

// ── Agent singleton ────────────────────────────────────────────────────────

let agentInstance: WerewolfEduAgent | null = null;

export function getAgent(): WerewolfEduAgent {
  if (!agentInstance) {
    agentInstance = new WerewolfEduAgent();
    console.log("[Azure AI Agent] WerewolfEduAgent initialized");
  }
  return agentInstance;
}

// ── Agent registration status (set at startup) ──────────────────────────────

interface AgentRegistrationStatus {
  registered: boolean;
  agentId?: string;
  method: "azure-ai-agent-service" | "declarative-manifest" | "none";
  hubEndpoint?: string;
  error?: string;
  registeredAt?: string;
}

let agentRegistrationStatus: AgentRegistrationStatus = {
  registered: false,
  method: "none",
};

export function getAgentRegistrationStatus(): Readonly<AgentRegistrationStatus> {
  return agentRegistrationStatus;
}

// ── Copilot Chat publishing config (declarative) ───────────────────────────

/**
 * Returns the publishing configuration for M365 Copilot Chat.
 * Called by the agent registration endpoint at startup.
 *
 * Uses Azure AI Agent Service when AZURE_AI_AGENT_ENDPOINT is set,
 * otherwise returns the declarative manifest for manual publishing.
 */
export function getCopilotChatPublishConfig(): {
  method: "azure-ai-agent-service" | "declarative-manifest";
  agentServiceEndpoint?: string;
  tools: typeof AGENT_TOOLS;
  agentName: string;
  agentDescription: string;
} {
  const agentServiceEndpoint = process.env.AZURE_AI_AGENT_ENDPOINT;

  return {
    method: agentServiceEndpoint
      ? "azure-ai-agent-service"
      : "declarative-manifest",
    agentServiceEndpoint: agentServiceEndpoint || undefined,
    tools: AGENT_TOOLS,
    agentName: "werewolf-edu-agent",
    agentDescription:
      "English language tutor agent for the Werewolf educational game. Analyzes student speech for grammar and fluency, and generates comprehensive learning reports.",
  };
}

// ── Agent instructions (shared between publish-agent.ts and runtime) ───────

const AGENT_INSTRUCTIONS = [
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
].join("\n");

// ── Agent registration ─────────────────────────────────────────────────────

/**
 * Register the WerewolfEdu agent with Azure AI Agent Service.
 *
 * Called at server startup. Registers the agent's tool definitions
 * (analyze_speech, generate_feedback) so M365 Copilot Chat can
 * discover and invoke them.
 *
 * Registration is retried up to 3 times with exponential backoff
 * for transient Azure API issues. Failures are non-fatal — the
 * game server continues to work via its REST + WebSocket API —
 * but Copilot Chat integration will be unavailable.
 *
 * @returns Registration status with agent ID on success
 */
export async function registerAgentWithFoundry(): Promise<AgentRegistrationStatus> {
  const endpoint = process.env.AZURE_AI_AGENT_ENDPOINT;

  if (!endpoint) {
    console.log("");
    console.log("┌─────────────────────────────────────────────────────────────┐");
    console.log("│  ⚠️  M365 Copilot Chat publishing SKIPPED                   │");
    console.log("│                                                             │");
    console.log("│  AZURE_AI_AGENT_ENDPOINT is not set.                        │");
    console.log("│  The agent will NOT be discoverable in Copilot Chat.       │");
    console.log("│                                                             │");
    console.log("│  To publish, set the env var and restart:                   │");
    console.log("│    AZURE_AI_AGENT_ENDPOINT=https://<hub>.<region>.api.ml.azure.com │");
    console.log("│                                                             │");
    console.log("│  Or run the publish script manually:                        │");
    console.log("│    npx tsx azure/publish-agent.ts                           │");
    console.log("└─────────────────────────────────────────────────────────────┘");
    console.log("");

    agentRegistrationStatus = {
      registered: false,
      method: "declarative-manifest",
      error: "AZURE_AI_AGENT_ENDPOINT not set",
    };
    return agentRegistrationStatus;
  }

  console.log("");
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  📡 Registering agent with Azure AI Agent Service...        │");
  console.log(`│  Hub: ${endpoint.padEnd(48).substring(0, 48)} │`);
  console.log("└─────────────────────────────────────────────────────────────┘");

  const modelDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Dynamic import — @azure/ai-projects may not be installed everywhere
      const { AIProjectClient } = await import("@azure/ai-projects");
      const { DefaultAzureCredential } = await import("@azure/identity");

      const credential = new DefaultAzureCredential();
      const client = new AIProjectClient(endpoint, credential);

      console.log(`  [Attempt ${attempt}/${maxRetries}] Creating agent "${AGENT_CONFIG.name}"...`);

      const agent = await client.agents.createAgent(modelDeployment, {
        name: AGENT_CONFIG.name,
        description: AGENT_CONFIG.description,
        instructions: AGENT_INSTRUCTIONS,
        tools: [
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
        ],
        metadata: {
          displayName: AGENT_CONFIG.displayName,
          publisher: "WerewolfEdu",
          version: "1.0.0",
          tags: AGENT_CONFIG.tags.join(", "),
          copilotChatEnabled: "true",
          category: "Education",
        },
      });

      const agentId: string = (agent as any).id || "unknown";

      console.log("├─────────────────────────────────────────────────────────────┤");
      console.log("│  ✅ Agent REGISTERED with Azure AI Agent Service            │");
      console.log(`│  Agent ID : ${agentId.padEnd(45)} │`);
      console.log(`│  Model    : ${modelDeployment.padEnd(45)} │`);
      console.log(`│  Tools    : analyze_speech, generate_feedback               │`);
      console.log("│                                                             │");
      console.log("│  Discoverable in M365 Copilot Chat as:                      │");
      console.log("│    \"Werewolf Edu Tutor\"                                    │");
      console.log("└─────────────────────────────────────────────────────────────┘");
      console.log("");

      agentRegistrationStatus = {
        registered: true,
        agentId,
        method: "azure-ai-agent-service",
        hubEndpoint: endpoint,
        registeredAt: new Date().toISOString(),
      };
      return agentRegistrationStatus;
    } catch (error: any) {
      lastError = error as Error;

      // Categorize the error for better diagnostics
      const statusCode = error?.statusCode || error?.status;
      const isAuthError =
        statusCode === 401 || statusCode === 403 ||
        error?.code === "AuthenticationFailed" ||
        error?.message?.includes("credential");

      const isNotFound =
        statusCode === 404 ||
        error?.message?.includes("not found");

      const isTransient =
        statusCode === 429 || statusCode >= 500 ||
        error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT" ||
        error?.message?.includes("timeout");

      if (attempt < maxRetries && isTransient) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`  ⚠️  Attempt ${attempt} failed (transient), retrying in ${delay / 1000}s...`);
        console.warn(`     ${error.message || error}`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Terminal failure — log prominently
      console.error("├─────────────────────────────────────────────────────────────┤");
      console.error("│  ❌ Agent registration FAILED                               │");
      if (isAuthError) {
        console.error("│                                                             │");
        console.error("│  Authentication error — check:                              │");
        console.error("│  1. Managed Identity is enabled on the Container App        │");
        console.error("│  2. RBAC role 'Azure AI Developer' assigned to the identity │");
        console.error("│  3. AZURE_TENANT_ID is set (if using service principal)     │");
      } else if (isNotFound) {
        console.error("│                                                             │");
        console.error("│  Hub not found — check AZURE_AI_AGENT_ENDPOINT is correct   │");
      } else {
        console.error(`│  ${(error.message || String(error)).substring(0, 48).padEnd(48)} │`);
      }
      console.error("│                                                             │");
      console.error("│  Agent will NOT be available in M365 Copilot Chat.         │");
      console.error("│  The game server continues to work via its own API.        │");
      console.error("│                                                             │");
      console.error("│  Fix the issue and restart, or run:                         │");
      console.error("│    npx tsx azure/publish-agent.ts                           │");
      console.error("└─────────────────────────────────────────────────────────────┘");
      console.error("");

      break; // Non-transient error → stop retrying
    }
  }

  agentRegistrationStatus = {
    registered: false,
    method: "azure-ai-agent-service",
    hubEndpoint: endpoint,
    error: lastError?.message || "Unknown error",
  };
  return agentRegistrationStatus;
}

// ── Agent identity (used by both server and publish script) ─────────────────

const AGENT_CONFIG = {
  name: "werewolf-edu-agent",
  displayName: "Werewolf Edu Tutor",
  description:
    "English language tutor agent for the Werewolf educational game. " +
    "Analyzes student speech for grammar accuracy, fluency, and natural expression. " +
    "Generates comprehensive end-of-game learning reports with feedback on " +
    "scenario adaptation, vocabulary, and debate cohesion.",
  tags: ["education", "english-learning", "werewolf-game", "language-tutor"],
} as const;
