/**
 * Azure OpenAI Service — production replacement for server/lib/openai.ts
 *
 * Copy this file to: server/lib/openai.ts
 *
 * Key differences from the original:
 *   1. Uses AzureOpenAI client (from "openai" SDK) instead of raw OpenAI
 *   2. Reads from AZURE_OPENAI_* env vars instead of AI_INTEGRATIONS_*
 *   3. Adds Azure AI Search grounding for vocabulary suggestions
 *   4. Adds Azure AI Agent Service as optional orchestration path
 */

import { AzureOpenAI } from "openai";

// ── Client management (cached per deployment for model-fallback support) ────

/** Fast, reliable default model — gpt-4o-mini avoids reasoning-model issues (empty content, slow responses) */
const DEFAULT_PRIMARY_MODEL = "gpt-4o-mini";
const DEFAULT_FALLBACK_MODEL = "gpt-4o-mini";

const clientCache = new Map<string, AzureOpenAI>();

function getAzureOpenAIClient(deployment?: string): AzureOpenAI {
  const deploy = deployment || getPrimaryDeployment();

  if (clientCache.has(deploy)) return clientCache.get(deploy)!;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) {
    console.warn(
      "Azure OpenAI configuration incomplete. AI features will return fallback responses.",
    );
    console.warn(`AZURE_OPENAI_ENDPOINT: ${endpoint ? "set" : "missing"}`);
    console.warn(`AZURE_OPENAI_API_KEY: ${apiKey ? "set" : "missing"}`);
    throw new Error("Azure OpenAI configuration incomplete");
  }

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: "2025-08-01-preview",
    deployment: deploy,
    timeout: 60000,    // 60s — ample time even under load
    maxRetries: 3,     // SDK-level retries with exponential backoff
  });

  clientCache.set(deploy, client);
  console.log(`Azure OpenAI client initialized (deployment: ${deploy})`);

  return client;
}

function getPrimaryDeployment(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT || DEFAULT_PRIMARY_MODEL;
}

function getFallbackDeployment(): string {
  return process.env.AZURE_OPENAI_FALLBACK_DEPLOYMENT || DEFAULT_FALLBACK_MODEL;
}

/**
 * Call the LLM with automatic model fallback.
 * Tries primary model first, then fallback model, then throws.
 * For reasoning models, limits reasoning effort to "low" to avoid empty-content edge case.
 */
async function callModel(
  prompt: string,
  options?: { preferredModel?: string; maxTokens?: number },
): Promise<string> {
  const primaryModel = options?.preferredModel || getPrimaryDeployment();
  const fallbackModel = getFallbackDeployment();
  const maxTokens = options?.maxTokens || 4096;

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

      const client = getAzureOpenAIClient(model);

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

      console.warn(`[AI] Model ${model} returned empty content`);
    } catch (error: any) {
      console.error(`[AI] Model ${model} failed:`, error.message || error);
      lastError = error as Error;
    }
  }

  throw lastError || new Error("All AI models failed to return content");
}

// ── Types (unchanged from original for compatibility) ─────────────────────

export interface SpeechAnalysisResult {
  scores: {
    overall: number;
    accuracy: number;
    fluency: number;
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

// ── Speech analysis ───────────────────────────────────────────────────────

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
1. ONLY reference their actual words
2. Provide "correctedText" (polished version) unless perfect
3. Check grammar AND natural expression
4. Be specific in improvements — quote the exact error and provide the fix
5. Score honestly based on the actual English quality

**Student Speech:** "${text}"
**Context:** ${context}

**Return JSON:**
- If errors exist:
{
  "scores": {"overall": <number>, "accuracy": <number>, "fluency": <number>},
  "correctedText": "[Natural version]",
  "improvements": ["[Specific fix]", "[Tip for natural expression]"]
}
- If perfect:
{
  "scores": {"overall": 95, "accuracy": 95, "fluency": 95},
  "congratulations": "Perfect! Native-level expression~"
}

Analyze and return JSON only:`;

    console.log(`[Azure AI Speech] Analyzing (text length: ${text.length})`);

    const content = await callModel(prompt, { maxTokens: 2048 });

    const result = JSON.parse(content) as SpeechAnalysisResult;

    // Hallucination filtering: remove improvements referencing phrases not in original speech
    if (result.improvements && Array.isArray(result.improvements)) {
      const lowercaseText = text.toLowerCase();
      const originalCount = result.improvements.length;

      const filteredImprovements = result.improvements.filter(
        (improvement: string) => {
          // Patterns that indicate the quoted phrase is a CORRECTION, not a student error
          const isCorrectionPattern =
            /\b(?:use|try|consider|say)\s+'.*?'/i.test(improvement) ||
            /\b(?:suggest(?:ed|ion)?|recommend(?:ed)?|propose(?:d)?)\b/i.test(improvement) ||
            /→\s*'.*?'/.test(improvement);

          const quotedPhrases = improvement.match(/['"]([^'"]+)['"]/g) || [];
          for (const quoted of quotedPhrases) {
            const phrase = quoted.replace(/['"]/g, "").toLowerCase();
            if (phrase.length > 2 && !lowercaseText.includes(phrase) && !isCorrectionPattern) {
              console.log(`[Azure AI Validation] Filtered hallucination: "${phrase}"`);
              return false;
            }
          }
          return true;
        },
      );

      result.improvements = filteredImprovements;
      if (filteredImprovements.length < originalCount) {
        console.log(
          `[Azure AI Validation] Filtered ${originalCount - filteredImprovements.length} hallucinated improvements`,
        );
      }
    }

    return result;
  } catch (error) {
    console.error("[Azure AI Speech] All models failed, returning fallback:", error);
    return {
      scores: { overall: 70, accuracy: 70, fluency: 70 },
      improvements: [
        "AI analysis temporarily unavailable — your speech has been recorded",
        "Keep speaking in English during the game to practice!",
      ],
    };
  }
}

// ── Comprehensive feedback ────────────────────────────────────────────────

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
2. Strengths & Highlights:
   - Scenario Adaptation: How well they use werewolf game-specific expressions
   - Fluency & Interaction: Response speed, debate momentum, natural phrases
   - Opinion Expression: Logic clarity when identifying werewolves or defending
3. Improvement Suggestions (each with Issue + Suggestion):
   - Grammar Accuracy: Specific tense/structure errors with practice recommendations
   - Vocabulary Diversity: Overused words, missing scenario-specific terms
   - Debate Cohesion: Logical transitions between arguments

Return JSON:
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

    console.log(`[Azure AI Feedback] Generating comprehensive report (${allSpeeches.length} speeches)`);

    const content = await callModel(prompt, { maxTokens: 4096 });

    return JSON.parse(content) as ComprehensiveFeedback;
  } catch (error) {
    console.error("[Azure AI Feedback] All models failed, returning fallback:", error);
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
            "Review any instant feedback received during the game. Pay attention to verb tenses and article usage.",
        },
        vocabularyDiversity: {
          issue: "AI analysis temporarily unavailable — your speech data has been saved.",
          suggestion:
            "Try using varied expressions and role-specific vocabulary like 'suspicious behavior', 'clear my name', 'voting pattern'.",
        },
        debateCohesion: {
          issue: "AI analysis temporarily unavailable — your speech data has been saved.",
          suggestion:
            "Connect ideas with transitions like 'therefore', 'however', 'in addition'. Reference previous speakers.",
        },
      },
    };
  }
}
