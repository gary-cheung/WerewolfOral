/**
 * Azure AI Search — vocabulary & learning content retrieval
 *
 * Copy this file to: server/lib/ai-search.ts
 *
 * What this does:
 *   - Indexes werewolf-game vocabulary with Chinese translations
 *   - Provides similarity search during speech analysis
 *   - Suggests relevant vocabulary as alternatives to overused words
 *
 * Install: npm install @azure/search-documents
 */

import {
  SearchClient,
  SearchIndexClient,
  AzureKeyCredential,
} from "@azure/search-documents";

// ── Document shape ────────────────────────────────────────────────────────
export interface VocabularyEntry {
  id: string;
  word: string;           // e.g., "suspicious"
  translation: string;    // e.g., "可疑的"
  category: string;       // e.g., "accusation", "defense", "reasoning"
  difficulty: string;     // "basic" | "intermediate" | "advanced"
  exampleSentence: string;
  synonyms: string[];
  embedding?: number[];   // 1536-dim vector (text-embedding-3-small)
}

// ── Client singleton ──────────────────────────────────────────────────────
let searchClient: SearchClient<VocabularyEntry> | null = null;

function getSearchClient(): SearchClient<VocabularyEntry> {
  if (searchClient) return searchClient;

  const endpoint = process.env.AZURE_AI_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_AI_SEARCH_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("Azure AI Search not configured");
  }

  searchClient = new SearchClient<VocabularyEntry>(
    endpoint,
    "vocabulary-index",
    new AzureKeyCredential(apiKey),
  );

  return searchClient;
}

// ── Search vocabulary by keyword (fuzzy, scored) ──────────────────────────

export async function searchVocabulary(
  query: string,
  options?: {
    category?: string;
    difficulty?: string;
    top?: number;
  },
): Promise<VocabularyEntry[]> {
  try {
    const client = getSearchClient();

    const filterClauses: string[] = [];
    if (options?.category) filterClauses.push(`category eq '${options.category}'`);
    if (options?.difficulty) filterClauses.push(`difficulty eq '${options.difficulty}'`);

    const results = await client.search(query, {
      top: options?.top ?? 5,
      select: ["id", "word", "translation", "category", "difficulty", "exampleSentence", "synonyms"],
      filter: filterClauses.length > 0 ? filterClauses.join(" and ") : undefined,
      searchMode: "all",
      queryType: "simple",
    });

    const entries: VocabularyEntry[] = [];
    for await (const result of results.results) {
      entries.push(result.document);
    }

    return entries;
  } catch (error) {
    console.error("[AI Search] Search error:", error);
    return [];
  }
}

// ── Suggest alternative vocabulary (for "vocabulary diversity" feedback) ──

export async function suggestAlternatives(
  word: string,
  context: string, // e.g., "accusation" or "defense"
): Promise<VocabularyEntry[]> {
  try {
    const client = getSearchClient();

    // Search synonyms — find words in the same category, excluding the input
    const results = await client.search(`*`, {
      top: 5,
      select: ["id", "word", "translation", "category", "exampleSentence"],
      filter: `category eq '${context}'`,
      searchMode: "all",
    });

    const entries: VocabularyEntry[] = [];
    for await (const result of results.results) {
      if (result.document.word.toLowerCase() !== word.toLowerCase()) {
        entries.push(result.document);
      }
    }

    return entries;
  } catch (error) {
    console.error("[AI Search] Suggest error:", error);
    return [];
  }
}

// ── Seed vocabulary index (run once during setup) ─────────────────────────

export async function seedVocabularyIndex(): Promise<void> {
  const endpoint = process.env.AZURE_AI_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_AI_SEARCH_KEY;
  if (!endpoint || !apiKey) {
    console.warn("[AI Search] Cannot seed — not configured");
    return;
  }

  const indexClient = new SearchIndexClient(
    endpoint,
    new AzureKeyCredential(apiKey),
  );

  // Create index
  await indexClient.createOrUpdateIndex({
    name: "vocabulary-index",
    fields: [
      { name: "id", type: "Edm.String", key: true, searchable: false },
      { name: "word", type: "Edm.String", searchable: true, filterable: true, sortable: true },
      { name: "translation", type: "Edm.String", searchable: true },
      { name: "category", type: "Edm.String", filterable: true, facetable: true },
      { name: "difficulty", type: "Edm.String", filterable: true, facetable: true },
      { name: "exampleSentence", type: "Edm.String", searchable: true },
      { name: "synonyms", type: "Collection(Edm.String)", searchable: true },
      { name: "embedding", type: "Collection(Edm.Single)", hidden: true, searchable: false,
        vectorSearchDimensions: 1536, vectorSearchProfileName: "vocabulary-vector-profile" },
    ],
    vectorSearch: {
      algorithms: [{ name: "hnsw-config", kind: "hnsw" }],
      profiles: [
        { name: "vocabulary-vector-profile", algorithmConfigurationName: "hnsw-config" },
      ],
    },
    semanticSettings: {
      configurations: [
        {
          name: "vocabulary-semantic-config",
          prioritizedFields: {
            titleField: { fieldName: "word" },
            prioritizedContentFields: [{ fieldName: "exampleSentence" }],
          },
        },
      ],
    },
  });

  console.log("[AI Search] Vocabulary index created/updated");

  // Seed data (werewolf game vocabulary)
  const vocabulary: VocabularyEntry[] = [
    { id: "v1", word: "suspicious", translation: "可疑的", category: "accusation", difficulty: "basic", exampleSentence: "I find player 3 suspicious because they voted without explanation.", synonyms: ["doubtful", "questionable"] },
    { id: "v2", word: "eliminate", translation: "淘汰", category: "voting", difficulty: "basic", exampleSentence: "We should eliminate the player who is acting most suspiciously.", synonyms: ["vote out", "remove"] },
    { id: "v3", word: "innocent", translation: "无辜的", category: "defense", difficulty: "basic", exampleSentence: "I am innocent — I have been helping the village all game.", synonyms: ["blameless", "not guilty"] },
    { id: "v4", word: "verify", translation: "验证", category: "reasoning", difficulty: "intermediate", exampleSentence: "The prophet can verify one player's identity each night.", synonyms: ["confirm", "check"] },
    { id: "v5", word: "collusion", translation: "勾结", category: "accusation", difficulty: "advanced", exampleSentence: "I suspect collusion between players 2 and 5 — they always vote together.", synonyms: ["conspiracy", "secret agreement"] },
    { id: "v6", word: "contradiction", translation: "矛盾", category: "reasoning", difficulty: "intermediate", exampleSentence: "There is a contradiction in your statement — you claimed to be a villager, but then said you investigated someone.", synonyms: ["inconsistency", "discrepancy"] },
    { id: "v7", word: "defend", translation: "辩护", category: "defense", difficulty: "basic", exampleSentence: "I need to defend myself against these accusations.", synonyms: ["protect", "justify"] },
    { id: "v8", word: "unanimous", translation: "一致的", category: "voting", difficulty: "advanced", exampleSentence: "The vote was nearly unanimous — only one player dissented.", synonyms: ["in complete agreement", "with one voice"] },
    { id: "v9", word: "deduction", translation: "推理", category: "reasoning", difficulty: "intermediate", exampleSentence: "Through logical deduction, I believe the werewolf is among the players who haven't spoken yet.", synonyms: ["reasoning", "inference"] },
    { id: "v10", word: "counterargument", translation: "反驳", category: "defense", difficulty: "advanced", exampleSentence: "My counterargument is that if I were the werewolf, I would not have voted so obviously.", synonyms: ["rebuttal", "opposing argument"] },
    { id: "v11", word: "majority", translation: "多数", category: "voting", difficulty: "basic", exampleSentence: "The majority has voted to eliminate player 4.", synonyms: ["most people", "greater part"] },
    { id: "v12", word: "deceive", translation: "欺骗", category: "accusation", difficulty: "intermediate", exampleSentence: "The werewolves are trying to deceive us with false logic.", synonyms: ["mislead", "trick"] },
    { id: "v13", word: "strategy", translation: "策略", category: "reasoning", difficulty: "basic", exampleSentence: "Our strategy should be to listen carefully to everyone before voting.", synonyms: ["plan", "approach"] },
    { id: "v14", word: "testimony", translation: "证词", category: "reasoning", difficulty: "advanced", exampleSentence: "Based on the testimony we've heard, player 6 seems the most trustworthy.", synonyms: ["statement", "account"] },
    { id: "v15", word: "ambush", translation: "埋伏", category: "accusation", difficulty: "advanced", exampleSentence: "I think the wolves are setting an ambush — waiting for us to vote wrong.", synonyms: ["trap", "setup"] },
  ];

  const searchClient = new SearchClient<VocabularyEntry>(
    endpoint,
    "vocabulary-index",
    new AzureKeyCredential(apiKey),
  );

  // Upload in batches (max 1000 per batch)
  await searchClient.mergeOrUploadDocuments(vocabulary);
  console.log(`[AI Search] Seeded ${vocabulary.length} vocabulary entries`);
}
