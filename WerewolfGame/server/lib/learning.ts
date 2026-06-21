/**
 * Learning Content Generator — WerewolfEdu Learning Platform
 *
 * Generates vocabulary lists, grammar drills, role strategy guides, rule Q&A,
 * and personalized mistake review exercises using the existing Azure OpenAI
 * infrastructure (callModel from openai.ts).
 *
 * These functions are shared between:
 *   1. The website learning section (REST API → React pages)
 *   2. The Copilot Studio agent    (HTTP actions → Copilot Chat topics)
 */

import { callModel } from "./openai";
import type { Game, SpeechRecord } from "@shared/schema";
import { roleInfoMap, type GameRole, type DifficultyLevel } from "@shared/schema";
import { buildCacheKey, getCached, setCache } from "./learning-cache";

// ── Types ──────────────────────────────────────────────────────────────────

export interface VocabularyEntry {
  word: string;
  translation: string; // Traditional Chinese translation
  category: string;
  example: string;
  sentenceTranslation?: string; // Traditional Chinese translation of example sentence
  roleRelevance?: string; // Which roles use this word most
}

export interface VocabularySet {
  category: string;
  description: string;
  entries: VocabularyEntry[];
}

export interface GrammarDrill {
  question: string;
  correctAnswer: string;
  options?: string[]; // Multiple choice (4 options)
  explanation: string;
  source?: string; // "from your game" if based on player's mistake
}

export interface DrillSet {
  title: string;
  grammarFocus: string;
  drills: GrammarDrill[];
}

export interface RoleStrategy {
  role: GameRole;
  roleName: string;
  roleNameCn: string;
  keyPhrases: Array<{
    english: string;
    chinese: string;
    usage: string; // When to use this phrase
  }>;
  strategyTips: string[];
  vocabularyToKnow: string[];
}

export interface RuleAnswer {
  question: string;
  answer: string;
  relatedTopics: string[];
}

export interface MistakeReview {
  studentMistakes: Array<{
    originalSpeech: string;
    correctedVersion: string;
    mistakeType: string; // "grammar", "vocabulary", "expression"
    explanation: string;
  }>;
  suggestedDrills: GrammarDrill[];
  overallTips: string[];
}

// ── Helper: extract recent mistakes from game history ──────────────────────

function extractRecentMistakes(games: Game[]): string[] {
  const mistakes: string[] = [];
  for (const game of games) {
    const speeches = game.speeches as SpeechRecord[] | undefined;
    if (!speeches) continue;
    for (const speech of speeches) {
      if (speech.feedback?.improvements) {
        for (const imp of speech.feedback.improvements) {
          mistakes.push(
            `[Role: ${game.role}] "${speech.text}" → ${imp}`
          );
        }
      }
    }
  }
  return mistakes.slice(-20); // Last 20 mistakes across games
}

// ── Main API functions ─────────────────────────────────────────────────────

/**
 * Generate vocabulary by category and optional role focus.
 * Categories: "accusation", "defense", "debate", "role-specific", "general"
 */
export async function generateVocabulary(
  category?: string,
  role?: GameRole,
  difficulty?: DifficultyLevel,
): Promise<VocabularySet> {
  const cacheKey = buildCacheKey("generateVocabulary", { category, role, difficulty });
  const cached = getCached<VocabularySet>(cacheKey);
  if (cached) return cached;

  try {
    const categoryPhrase = category || "general werewolf game";
    const rolePhrase = role
      ? `for a ${roleInfoMap[role].name} player`
      : "for any role";
    const levelPhrase = difficulty || "intermediate";

    const prompt = `You are an English teacher for Hong Kong university students learning English through a Werewolf social deduction game. Students are native Cantonese speakers with B2 English level. **All Chinese translations must be in Traditional Chinese (繁體中文), NOT Simplified Chinese.**

Generate a vocabulary set ${rolePhrase} at ${levelPhrase} level, focused on "${categoryPhrase}".

Include 8-10 vocabulary words/phrases that are:
1. Useful for English debate in this specific context
2. Appropriate for the difficulty level
3. Real phrases native speakers use in arguments/discussions

For each entry, also provide a Traditional Chinese translation of the example sentence as "sentenceTranslation".

Return JSON:
{
  "category": "<category>",
  "description": "<1 sentence description of this vocabulary set>",
  "entries": [
    {
      "word": "suspicious behavior",
      "translation": "可疑行為",
      "category": "accusation",
      "example": "I noticed some suspicious behavior from Player 3 last night.",
      "sentenceTranslation": "我昨晚注意到3號玩家有一些可疑行為。",
      "roleRelevance": "werewolf, villager"
    }
  ]
}

Return ONLY valid JSON, no other text.`;

    const content = await callModel(prompt, { maxTokens: 2048 });
    const result = JSON.parse(content) as VocabularySet;
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Learning] Vocabulary generation failed:", error);
    const fallback = getFallbackVocabulary(role, category);
    setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Generate grammar drills — optionally personalized from player mistakes.
 * If gameHistory is provided, drills target the student's actual weak areas.
 */
export async function generateDrills(
  grammarFocus?: string,
  difficulty?: DifficultyLevel,
  count: number = 5,
  gameHistory?: Game[],
): Promise<DrillSet> {
  // Only cache when no gameHistory (demo calls from Copilot Studio)
  const cacheKey = !gameHistory?.length
    ? buildCacheKey("generateDrills", { grammarFocus, difficulty, count })
    : null;
  if (cacheKey) {
    const cached = getCached<DrillSet>(cacheKey);
    if (cached) return cached;
  }

  try {
    const levelPhrase = difficulty || "intermediate";
    let personalization = "";

    if (gameHistory && gameHistory.length > 0) {
      const recentMistakes = extractRecentMistakes(gameHistory);
      if (recentMistakes.length > 0) {
        personalization = `\nThe student's recent mistakes from actual games:\n${recentMistakes.join("\n")}\n\nGenerate drills that target these specific error patterns.`;
      }
    }

    const focusPhrase = grammarFocus || "common English mistakes made by Chinese speakers";

    const prompt = `You are an English teacher for Hong Kong university students (native Cantonese speakers, B2 English).

Create ${count} English grammar/vocabulary drills at ${levelPhrase} level.
Focus area: ${focusPhrase}
${personalization}

Each drill should be multiple-choice with 4 options. Make the wrong options realistic (common mistakes).

Return JSON:
{
  "title": "<descriptive title>",
  "grammarFocus": "${focusPhrase}",
  "drills": [
    {
      "question": "Fill in the blank (or correct the sentence): '...' ",
      "correctAnswer": "the right answer",
      "options": ["A", "B", "C", "D"],
      "explanation": "Why this is correct, with grammar rule explanation",
      "source": "from your last game"
    }
  ]
}

The "source" field should say "from your last game" if the drill is based on a student's actual mistake, or omit it for general drills.

Return ONLY valid JSON.`;

    const content = await callModel(prompt, { maxTokens: 3072 });
    const result = JSON.parse(content) as DrillSet;
    if (cacheKey) setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Learning] Drill generation failed:", error);
    const fallback = getFallbackDrills(grammarFocus || "general", count);
    if (cacheKey) setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Get role strategy guide — key English phrases and tips for playing a role.
 */
export async function generateRoleStrategy(
  role: GameRole,
  difficulty?: DifficultyLevel,
): Promise<RoleStrategy> {
  const cacheKey = buildCacheKey("generateRoleStrategy", { role, difficulty });
  const cached = getCached<RoleStrategy>(cacheKey);
  if (cached) return cached;

  const roleInfo = roleInfoMap[role];
  try {
    const levelPhrase = difficulty || "intermediate";

    const prompt = `You are an English teacher helping Hong Kong university students (native Cantonese speakers, B2 English) prepare to play a Werewolf social deduction game.

The student will play as the **${roleInfo.name}** (${roleInfo.nameCn}: ${roleInfo.descriptionCn}).

Their English level is: ${levelPhrase}

Provide a strategy guide focused on English language skills for this role:

1. **Key Phrases** (6-8): Specific English sentences/phrases this role needs, with Traditional Chinese (繁體中文) translation and when to use each one.
2. **Strategy Tips** (4-5): Communication strategies in English for this role.
3. **Vocabulary To Know** (6-8 words): Essential werewolf-related vocabulary this role will hear or need to use.

Return JSON:
{
  "role": "${role}",
  "roleName": "${roleInfo.name}",
  "roleNameCn": "${roleInfo.nameCn}",
  "keyPhrases": [
    {
      "english": "I used my ability last night and checked Player 3.",
      "chinese": "我昨晚使用能力查驗了3號玩家。",
      "usage": "When revealing your prophecy result during day discussion"
    }
  ],
  "strategyTips": ["..."],
  "vocabularyToKnow": ["verify", "claim", "..."]
}

Return ONLY valid JSON.`;

    const content = await callModel(prompt, { maxTokens: 2048 });
    const result = JSON.parse(content) as RoleStrategy;
    result.role = role;
    result.roleName = roleInfo.name;
    result.roleNameCn = roleInfo.nameCn;
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Learning] Role strategy generation failed:", error);
    return getFallbackRoleStrategy(role);
  }
}

/**
 * Answer a question about Werewolf game rules.
 */
export async function askGameRules(
  question: string,
): Promise<RuleAnswer> {
  const cacheKey = buildCacheKey("askGameRules", { question });
  const cached = getCached<RuleAnswer>(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `You are an expert on the Werewolf (狼人杀) social deduction game rules. Answer the question clearly in English, suitable for Hong Kong university students (native Cantonese speakers, B2 English) learning English.

Question: "${question}"

Game context (use these facts):
- Roles: Villager (村民), Werewolf (狼人), Prophet/Seer (预言家), Witch (女巫), Hunter (猎人), Guard (守卫), Idiot (白痴), Wolf King (狼王)
- 5-12 players, night phase (werewolves choose target, special roles use abilities), day phase (discussion and voting)
- Villagers win when all werewolves eliminated. Werewolves win when werewolves >= villagers.
- Voting: simple majority, tie = random elimination or re-vote

Return JSON:
{
  "question": "<the original question>",
  "answer": "<clear, friendly answer in English>",
  "relatedTopics": ["role abilities", "voting rules", "..."]
}

Return ONLY valid JSON.`;

    const content = await callModel(prompt, { maxTokens: 1024 });
    const result = JSON.parse(content) as RuleAnswer;
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Learning] Rule Q&A failed:", error);
    return {
      question,
      answer: "I'm having trouble answering that right now. Try asking about specific roles (villager, werewolf, prophet, witch, hunter) or game phases (night, day, voting).",
      relatedTopics: ["roles", "game phases", "winning conditions"],
    };
  }
}

/**
 * Generate a personalized mistake review from the student's actual game history.
 * This is the core "Review My Game" feature for both website and Copilot Chat.
 */
export async function generateMistakeReview(
  gameHistory: Game[],
  difficulty?: DifficultyLevel,
): Promise<MistakeReview> {
  // Cache by game count + user IDs (stable for demo when same user queried)
  const cacheKey = buildCacheKey("generateMistakeReview", {
    gameCount: gameHistory.length,
    userIds: gameHistory.map(g => g.userId).join(","),
    difficulty,
  });
  const cached = getCached<MistakeReview>(cacheKey);
  if (cached) return cached;

  try {
    const mistakes: string[] = [];
    const speechesWithContext: Array<{ text: string; role: string; corrections: string[] }> = [];

    for (const game of gameHistory) {
      const speeches = game.speeches as SpeechRecord[] | undefined;
      if (!speeches) continue;
      for (const speech of speeches) {
        if (speech.feedback?.improvements && speech.feedback.improvements.length > 0) {
          speechesWithContext.push({
            text: speech.text,
            role: game.role,
            corrections: speech.feedback.improvements,
          });
        }
      }
    }

    const levelPhrase = difficulty || "intermediate";

    if (speechesWithContext.length === 0) {
      return {
        studentMistakes: [],
        suggestedDrills: [],
        overallTips: [
          "Great job! No mistakes were recorded from your recent games.",
          "Keep playing to build your English speaking skills.",
          "Try using more advanced vocabulary in your next game.",
        ],
      };
    }

    const mistakeSummary = speechesWithContext
      .slice(-10) // Last 10 mistakes
      .map((s) => `[${s.role}] Said: "${s.text}" → Corrections: ${s.corrections.join("; ")}`)
      .join("\n");

    const prompt = `You are an English teacher reviewing a Hong Kong university student's performance in Werewolf games. The student is a native Cantonese speaker at B2 English level.

The student's recent mistakes (original speech → what needed fixing):
${mistakeSummary}

Analyze these mistakes at ${levelPhrase} level and provide:

1. **Student Mistakes** (up to 6): For each, show original, corrected version, classify as "grammar", "vocabulary", or "expression", and explain clearly.
2. **Suggested Drills** (3-5): Multiple-choice drills targeting the specific error patterns you found.
3. **Overall Tips** (3-4): Actionable advice for this student's English improvement.

Return JSON:
{
  "studentMistakes": [
    {
      "originalSpeech": "I think he is werewolf",
      "correctedVersion": "I think he is the werewolf",
      "mistakeType": "grammar",
      "explanation": "Missing article 'the' before 'werewolf'. In English, we use 'the' before named roles/characters."
    }
  ],
  "suggestedDrills": [
    {
      "question": "...",
      "correctAnswer": "...",
      "options": ["A", "B", "C", "D"],
      "explanation": "...",
      "source": "from your last game"
    }
  ],
  "overallTips": ["..."]
}

Return ONLY valid JSON.`;

    const content = await callModel(prompt, { maxTokens: 3072 });
    const result = JSON.parse(content) as MistakeReview;
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Learning] Mistake review generation failed:", error);
    const fallback: MistakeReview = {
      studentMistakes: [],
      suggestedDrills: [],
      overallTips: [
        "AI review is temporarily unavailable. Your game data has been saved.",
        "Check back later for personalized feedback.",
        "In the meantime, try the vocabulary and grammar drill sections.",
      ],
    };
    setCache(cacheKey, fallback);
    return fallback;
  }
}

// ── Fallback content (when AI is unavailable) ─────────────────────────────

function getFallbackVocabulary(
  role?: GameRole,
  category?: string,
): VocabularySet {
  const generalVocab: VocabularySet = {
    category: category || "general",
    description: "Essential Werewolf game English vocabulary",
    entries: [
      {
        word: "suspicious",
        translation: "可疑的",
        category: "accusation",
        example: "Player 3 seems suspicious to me.",
        sentenceTranslation: "3號玩家在我看來很可疑。",
        roleRelevance: "all roles",
      },
      {
        word: "eliminate",
        translation: "淘汰",
        category: "voting",
        example: "I think we should eliminate Player 2.",
        sentenceTranslation: "我認為我們應該淘汰2號玩家。",
        roleRelevance: "all roles",
      },
      {
        word: "innocent",
        translation: "無辜的",
        category: "defense",
        example: "I'm just an innocent villager.",
        sentenceTranslation: "我只是個無辜的村民。",
        roleRelevance: "villager, good roles",
      },
      {
        word: "claim",
        translation: "聲稱",
        category: "debate",
        example: "He claims to be the prophet.",
        sentenceTranslation: "他聲稱自己是預言家。",
        roleRelevance: "all roles",
      },
      {
        word: "ability",
        translation: "能力",
        category: "role-specific",
        example: "I used my ability last night.",
        sentenceTranslation: "我昨晚使用了我的能力。",
        roleRelevance: "prophet, witch, hunter, guard",
      },
      {
        word: "vote against",
        translation: "投票反對",
        category: "voting",
        example: "I'm voting against Player 4.",
        sentenceTranslation: "我要投票反對4號玩家。",
        roleRelevance: "all roles",
      },
      {
        word: "defend",
        translation: "辯護",
        category: "defense",
        example: "Let me defend myself.",
        sentenceTranslation: "讓我為自己辯護。",
        roleRelevance: "all roles",
      },
      {
        word: "observe",
        translation: "觀察",
        category: "debate",
        example: "I observed that Player 2 didn't speak much.",
        sentenceTranslation: "我觀察到2號玩家沒有說太多話。",
        roleRelevance: "all roles",
      },
    ],
  };

  if (role === "werewolf" || role === "wolf_king") {
    generalVocab.description = "Werewolf team English vocabulary";
    generalVocab.entries.push(
      {
        word: "target",
        translation: "目標",
        category: "role-specific",
        example: "We should target the prophet tonight.",
        sentenceTranslation: "我們今晚應該以預言家為目標。",
        roleRelevance: "werewolf",
      },
      {
        word: "pretend",
        translation: "假裝",
        category: "strategy",
        example: "Pretend to be a villager.",
        sentenceTranslation: "假裝自己是村民。",
        roleRelevance: "werewolf",
      },
    );
  }

  return generalVocab;
}

function getFallbackDrills(grammarFocus: string, count: number): DrillSet {
  return {
    title: `Practice: ${grammarFocus}`,
    grammarFocus,
    drills: [
      {
        question: "Choose the correct sentence:",
        correctAnswer: "I think he is the werewolf.",
        options: [
          "I think he is werewolf.",
          "I think he is the werewolf.",
          "I think him is werewolf.",
          "I think he werewolf.",
        ],
        explanation: "Use 'the' before 'werewolf' when referring to a specific player's role. 'Werewolf' is a countable noun and needs an article.",
      },
      {
        question: "Which is the most natural way to accuse someone?",
        correctAnswer: "I find Player 3 suspicious.",
        options: [
          "I suspect Player 3.",
          "I find Player 3 suspicious.",
          "Player 3 is bad guy.",
          "I think Player 3 not good.",
        ],
        explanation: "'I find X suspicious' is the most natural and idiomatic expression. 'I suspect X' is also correct but more formal in this context.",
      },
    ].slice(0, count),
  };
}

function getFallbackRoleStrategy(role: GameRole): RoleStrategy {
  const info = roleInfoMap[role];
  return {
    role,
    roleName: info.name,
    roleNameCn: info.nameCn,
    keyPhrases: [
      {
        english: "I'm just a villager, I don't have any special information.",
        chinese: "我只是個村民，沒有任何特殊資訊。",
        usage: "When defending yourself as a villager",
      },
      {
        english: "I think we should vote for Player X.",
        chinese: "我認為我們應該投票給X號玩家。",
        usage: "During voting phase",
      },
    ],
    strategyTips: [
      "Speak clearly and use complete sentences in English.",
      "Listen carefully to other players' speeches for inconsistencies.",
      "Use transition words like 'however', 'therefore', 'additionally'.",
    ],
    vocabularyToKnow: [
      "suspicious", "innocent", "eliminate", "defend",
      "observe", "claim", "evidence", "majority",
    ],
  };
}
