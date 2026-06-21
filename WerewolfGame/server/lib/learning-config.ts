/**
 * Learning Config — Tune all AI-generated content from one file.
 *
 * Edit this file to change:
 *   - Target audience and difficulty ceiling
 *   - Language / localization (Traditional Chinese, Cantonese, etc.)
 *   - Vocabulary lists, drill style, feedback tone
 *
 * No need to touch the AI prompts in learning.ts unless you want to
 * change the structure of the returned JSON.
 */

export const LEARNING_CONFIG = {
  // ── Audience ────────────────────────────────────────────────────────────
  audience: {
    description: "Hong Kong university students",
    nativeLanguage: "Cantonese (Traditional Chinese)",
    englishLevel: "B2-C1 (upper-intermediate to advanced)",
    ageRange: "18-24",
    context: "Undergraduate students practicing academic and social English through a Werewolf social deduction game",
  },

  // ── Localization ────────────────────────────────────────────────────────
  localization: {
    translationLanguage: "Traditional Chinese (繁體中文)",
    preferCantonese: true,
    romanization: "Jyutping (粵拼) — optional, for pronunciation help",
    exampleLocations: "Hong Kong, Kowloon, New Territories, HK universities (HKU, CUHK, HKUST, CityU, PolyU, HKBU, EdUHK, Lingnan)",
  },

  // ── Difficulty ──────────────────────────────────────────────────────────
  difficulty: {
    default: "advanced",
    floor: "intermediate",
    ceiling: "advanced",
    vocabularyComplexity: "university-level academic and social English",
    grammarFocus: [
      "articles (a/an/the) — common Cantonese-L1 error",
      "countable vs uncountable nouns",
      "subject-verb agreement with complex subjects",
      "conditional sentences (Type 2 & 3)",
      "relative clauses",
      "reported speech in debate context",
      "modal verbs for speculation (must have, might have, could have)",
      "hedging language for academic politeness",
      "cohesive devices for argument flow",
      "collocations natural to native speakers",
    ],
    avoidOverlySimple: true,
    instructionNote: "Do NOT use beginner-level vocabulary or oversimplified explanations. These are university students at B2-C1 level. Challenge them with nuanced, natural English.",
  },

  // ── Vocabulary Settings ─────────────────────────────────────────────────
  vocabulary: {
    entriesPerSet: 10,
    includeCollocations: true,
    includeRegisterNotes: true,
    exampleSentenceStyle: "natural, conversational, Hong Kong context",
    categories: [
      "accusation — phrases for suspecting someone",
      "defense — phrases for defending yourself",
      "debate — logical connectors and argumentation",
      "role-specific — language unique to each Werewolf role",
      "persuasion — convincing and influencing others",
      "interrogation — questioning and cross-examining",
    ],
  },

  // ── Drills Settings ─────────────────────────────────────────────────────
  drills: {
    defaultCount: 5,
    maxCount: 10,
    quizStyle: "multiple-choice with 4 options",
    includeDistractorAnalysis: true,
    personalizationNote: "If student has game history, prioritize their weak areas. Mark these drills as 'from your last game'.",
  },

  // ── Tone & Style ────────────────────────────────────────────────────────
  tone: {
    style: "Supportive but direct — treat them as capable adults, not children",
    feedbackStyle: "constructive, specific, actionable",
    humorAllowed: true,
    emojiAllowed: false,
    useAcademicTerminology: true,
    compareLanguagesNote: "When helpful, contrast Cantonese/Chinese grammar patterns with English to explain errors (e.g., Cantonese lacks articles, so article errors are expected)",
  },

  // ── Game Context ────────────────────────────────────────────────────────
  game: {
    name: "Werewolf (狼人殺)",
    description: "A social deduction party game where students practice English through role-playing, debate, and persuasion",
    roles: [
      { id: "werewolf", name: "Werewolf", nameLocal: "狼人", team: "werewolves" },
      { id: "wolf_king", name: "Wolf King", nameLocal: "狼王", team: "werewolves" },
      { id: "prophet", name: "Prophet", nameLocal: "預言家", team: "villagers" },
      { id: "witch", name: "Witch", nameLocal: "女巫", team: "villagers" },
      { id: "hunter", name: "Hunter", nameLocal: "獵人", team: "villagers" },
      { id: "guard", name: "Guard", nameLocal: "守衛", team: "villagers" },
      { id: "idiot", name: "Idiot", nameLocal: "白痴", team: "villagers" },
      { id: "villager", name: "Villager", nameLocal: "村民", team: "villagers" },
    ],
  },
} as const;

/**
 * Helper: build the audience prompt segment used by all AI calls.
 */
export function getAudiencePrompt(): string {
  const { audience, localization, difficulty, tone } = LEARNING_CONFIG;
  return [
    `Target audience: ${audience.description}`,
    `Native language: ${audience.nativeLanguage}`,
    `English level: ${audience.englishLevel}`,
    `Translations: ${localization.translationLanguage}`,
    `${difficulty.instructionNote}`,
    `Tone: ${tone.style}`,
    `${tone.compareLanguagesNote}`,
  ].join("\n");
}

/**
 * Helper: get role display names in Traditional Chinese.
 */
export function getRoleDisplay(roleId: string): { name: string; nameLocal: string } {
  const role = LEARNING_CONFIG.game.roles.find(r => r.id === roleId);
  return role ? { name: role.name, nameLocal: role.nameLocal } : { name: roleId, nameLocal: roleId };
}
