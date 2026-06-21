/**
 * One-time script: seeds Azure AI Search vocabulary index.
 * Run via `azd up` post-provision hook, or manually:
 *   npx tsx azure/seed-search.ts
 */
import { seedVocabularyIndex } from "./server-lib-ai-search";

async function main() {
  console.log("Seeding Azure AI Search vocabulary index...");
  try {
    await seedVocabularyIndex();
    console.log("✓ Vocabulary index seeded successfully");
  } catch (error) {
    console.error("✗ Failed to seed vocabulary index:", error);
    process.exit(1);
  }
}

main();
