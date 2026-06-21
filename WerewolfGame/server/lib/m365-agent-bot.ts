/**
 * M365 Agents SDK Bot — WerewolfEdu Copilot Chat Integration
 *
 * Handles ALL WerewolfEdu features from Copilot Chat / Teams:
 *   - Speech analysis (existing)
 *   - Learning report (existing)
 *   - Vocabulary, grammar drills, role strategy, game rules, mistake review (new)
 *
 * Architecture:
 *   Copilot Chat → Azure Bot Service → POST /api/messages → this bot
 */

import { ActivityHandler, MessageFactory, TurnContext } from "@microsoft/agents-hosting";
import { getAgent } from "./openai";
import type { SpeechAnalysisResult, ComprehensiveFeedback } from "./openai";
import {
  generateVocabulary,
  generateDrills,
  generateRoleStrategy,
  askGameRules,
  generateMistakeReview,
} from "./learning";
import type {
  VocabularySet,
  DrillSet,
  RoleStrategy,
  RuleAnswer,
  MistakeReview,
} from "./learning";
import type { GameRole, DifficultyLevel } from "@shared/schema";

// ── Intent type ────────────────────────────────────────────────────────────

type BotIntent =
  | "analyze_speech"
  | "generate_feedback"
  | "vocabulary"
  | "drills"
  | "role_strategy"
  | "game_rules"
  | "review_mistakes"
  | "greeting"
  | "unknown";

// ── Bot definition ──────────────────────────────────────────────────────────

export class WerewolfEduCopilotBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context: TurnContext, next: () => Promise<void>) => {
      const text = context.activity.text?.trim() || "";

      if (!text) {
        await context.sendActivity(MessageFactory.text(this.getHelpText()));
        await next();
        return;
      }

      console.log(`[M365 Bot] Received: "${text.substring(0, 100)}"`);

      const intent = this.classifyIntent(text);

      switch (intent) {
        case "analyze_speech":
          await this.handleAnalyzeSpeech(context, text);
          break;
        case "generate_feedback":
          await this.handleGenerateFeedback(context, text);
          break;
        case "vocabulary":
          await this.handleVocabulary(context, text);
          break;
        case "drills":
          await this.handleDrills(context, text);
          break;
        case "role_strategy":
          await this.handleRoleStrategy(context, text);
          break;
        case "game_rules":
          await this.handleGameRules(context, text);
          break;
        case "review_mistakes":
          await this.handleReviewMistakes(context, text);
          break;
        case "greeting":
          await context.sendActivity(MessageFactory.text(this.getGreetingText()));
          break;
        default:
          await context.sendActivity(MessageFactory.text(this.getHelpText()));
      }

      await next();
    });

    this.onMembersAdded(async (context: TurnContext, next: () => Promise<void>) => {
      const membersAdded = context.activity.membersAdded || [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient?.id) {
          await context.sendActivity(MessageFactory.text(this.getGreetingText()));
        }
      }
      await next();
    });
  }

  // ── Intent classification ─────────────────────────────────────────────────

  private classifyIntent(text: string): BotIntent {
    const lower = text.toLowerCase();

    // Greeting / help
    if (/^(hello|hi|hey|help|what can you do|who are you)\b/i.test(lower)) {
      return "greeting";
    }

    // Vocabulary
    if (
      /\b(vocab|words?|phrase|learn|teach me)\b/i.test(lower) &&
      !/speech|analyze|report|feedback/i.test(lower)
    ) {
      return "vocabulary";
    }
    if (/what (words?|phrases?|vocab)/i.test(lower)) return "vocabulary";
    if (/quiz me/i.test(lower)) return "vocabulary";

    // Drills / practice
    if (
      /\b(drills?|practice|exercises?|test my english|grammar)\b/i.test(lower) &&
      !/speech|analyze/i.test(lower)
    ) {
      return "drills";
    }

    // Role strategy
    if (
      /\b(how (do|to|should|could) (i|you) (play|act|speak)|strategy|what (should|would|can) (a|the) \w+ (say|do)|role (tips?|guide|help|strategy))\b/i.test(
        lower
      )
    ) {
      return "role_strategy";
    }
    if (/\b(play as|playing as|acting as)\b/i.test(lower)) return "role_strategy";

    // Game rules
    if (
      /\b(how does|what does|what is the|game rules?|explain|rule|ability|abilities?)\b/i.test(
        lower
      ) &&
      !/speech|analyze|report|vocab|drill|practice/i.test(lower)
    ) {
      return "game_rules";
    }

    // Review mistakes
    if (
      /\b(review|my mistakes?|my errors?|how did i (do|perform)|what did i get wrong|my last game|my game)\b/i.test(
        lower
      )
    ) {
      return "review_mistakes";
    }

    // Speech analysis (existing patterns)
    if (
      /analy(s|z)e.*speech/i.test(lower) ||
      /check.*(grammar|english|speech|sentence)/i.test(lower) ||
      /correct.*(english|grammar|speech)/i.test(lower) ||
      /score.*(speech|english|grammar)/i.test(lower) ||
      /how.*(good|well|correct).*(speech|english|sentence|grammar)/i.test(lower) ||
      /(speech|sentence|english).*(analysis|feedback|score|check)/i.test(lower) ||
      /grammar.*(check|analysis|feedback)/i.test(lower)
    ) {
      return "analyze_speech";
    }

    // Feedback / report (existing patterns)
    if (
      /(generate|create|make|write|give).*(report|feedback|summary|evaluation)/i.test(
        lower
      ) ||
      /(end|final|overall|comprehensive).*(report|feedback|game|summary)/i.test(lower) ||
      /(game|learning).*(report|feedback|summary|overview)/i.test(lower) ||
      /(all|my|the).*(speeches|speech).*(report|feedback|summary)/i.test(lower) ||
      /how.*(did|was).*(i|my|the).*(do|perform|game)/i.test(lower) ||
      /feedback.*(report|game|all)/i.test(lower)
    ) {
      return "generate_feedback";
    }

    // Long text with no command words → speech to analyze
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 8) {
      return "analyze_speech";
    }

    return "unknown";
  }

  // ── Role / difficulty extraction helpers ──────────────────────────────────

  private extractRole(text: string): GameRole | undefined {
    const lower = text.toLowerCase();
    const roles: GameRole[] = [
      "werewolf", "villager", "prophet", "witch", "hunter", "guard", "idiot", "wolf_king",
    ];
    for (const role of roles) {
      if (lower.includes(role.replace("_", " ")) || lower.includes(role)) {
        return role;
      }
    }
    return undefined;
  }

  private extractDifficulty(text: string): DifficultyLevel {
    const lower = text.toLowerCase();
    if (/\b(beginner|basic)\b/i.test(lower)) return "basic";
    if (/\b(advanced|hard|difficult)\b/i.test(lower)) return "advanced";
    return "intermediate"; // default
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async handleVocabulary(context: TurnContext, text: string): Promise<void> {
    try {
      const role = this.extractRole(text);
      const difficulty = this.extractDifficulty(text);
      const category = text.match(/\b(accusation|defense|debate|role-specific|general)\b/i)?.[1];

      await context.sendActivity(
        MessageFactory.text(
          `📚 Loading vocabulary${role ? ` for **${role}**` : ""} (${difficulty})...`
        )
      );

      const vocab = await generateVocabulary(category, role, difficulty);

      const lines: string[] = [`## 📚 Werewolf Vocabulary — ${vocab.category}`];
      lines.push("");
      lines.push(vocab.description);
      lines.push("");
      lines.push("| Word / Phrase | Translation | Example |");
      lines.push("|---|---|---|");
      for (const entry of vocab.entries) {
        lines.push(
          `| **${entry.word}** | ${entry.translation} | _${entry.example}_ |`
        );
      }
      lines.push("");
      lines.push("💡 Try using these in your next game! Want drills to practice?");

      await context.sendActivity(MessageFactory.text(lines.join("\n")));
    } catch (error: any) {
      console.error("[M365 Bot] Vocabulary failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, vocabulary is currently unavailable. Please try again later.")
      );
    }
  }

  private async handleDrills(context: TurnContext, text: string): Promise<void> {
    try {
      const grammarFocus = text.match(/\b(articles?|tenses?|verbs?|prepositions?|subject.verb|conditionals?|modals?)\b/i)?.[1];
      const difficulty = this.extractDifficulty(text);

      await context.sendActivity(MessageFactory.text("🎯 Generating practice drills..."));

      const drillSet = await generateDrills(grammarFocus, difficulty, 5);

      const lines: string[] = [`## 🎯 ${drillSet.title}`];
      lines.push(`**Focus:** ${drillSet.grammarFocus}`);
      lines.push("");

      for (let i = 0; i < drillSet.drills.length; i++) {
        const d = drillSet.drills[i];
        lines.push(`### Q${i + 1}: ${d.question}`);
        lines.push("");
        if (d.options) {
          for (let j = 0; j < d.options.length; j++) {
            lines.push(`- **${String.fromCharCode(65 + j)})** ${d.options[j]}`);
          }
        }
        lines.push("");
        lines.push(`<details><summary>Reveal answer</summary>`);
        lines.push(`✅ **Correct:** ${d.correctAnswer}`);
        lines.push(`📝 ${d.explanation}`);
        if (d.source) lines.push(`_${d.source}_`);
        lines.push(`</details>`);
        lines.push("");
      }

      lines.push("---");
      lines.push("Want more drills or a different grammar topic?");

      await context.sendActivity(MessageFactory.text(lines.join("\n")));
    } catch (error: any) {
      console.error("[M365 Bot] Drills failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, drills are currently unavailable. Please try again later.")
      );
    }
  }

  private async handleRoleStrategy(context: TurnContext, text: string): Promise<void> {
    try {
      const role: GameRole = this.extractRole(text) || "werewolf";
      const difficulty = this.extractDifficulty(text);

      await context.sendActivity(
        MessageFactory.text(`🗡️ Loading strategy for **${role}**...`)
      );

      const strategy = await generateRoleStrategy(role, difficulty);

      const lines: string[] = [
        `## 🗡️ ${strategy.roleName} Strategy (${strategy.roleNameCn})`,
        "",
      ];
      lines.push("### 🔑 Key Phrases");
      lines.push("");
      lines.push("| English | 中文 | When to use |");
      lines.push("|---|---|---|");
      for (const phrase of strategy.keyPhrases) {
        lines.push(`| **${phrase.english}** | ${phrase.chinese} | _${phrase.usage}_ |`);
      }
      lines.push("");
      lines.push("### 💡 Strategy Tips");
      for (const tip of strategy.strategyTips) {
        lines.push(`• ${tip}`);
      }
      lines.push("");
      lines.push("### 📖 Must-Know Vocabulary");
      lines.push(strategy.vocabularyToKnow.map((w) => `\`${w}\``).join(" · "));
      lines.push("");
      lines.push("💡 Want vocabulary or drills for this role?");

      await context.sendActivity(MessageFactory.text(lines.join("\n")));
    } catch (error: any) {
      console.error("[M365 Bot] Role strategy failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, role strategy is currently unavailable. Please try again later.")
      );
    }
  }

  private async handleGameRules(context: TurnContext, text: string): Promise<void> {
    try {
      await context.sendActivity(MessageFactory.text("❓ Checking the rules..."));

      const answer = await askGameRules(text);

      const lines: string[] = [
        `## ❓ Game Rules`,
        "",
        `**Q:** ${answer.question}`,
        "",
        answer.answer,
        "",
      ];
      if (answer.relatedTopics.length > 0) {
        lines.push(`**Related:** ${answer.relatedTopics.join(" · ")}`);
        lines.push("");
      }
      lines.push("💡 Ask me about any other rule or role!");

      await context.sendActivity(MessageFactory.text(lines.join("\n")));
    } catch (error: any) {
      console.error("[M365 Bot] Game rules failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, rules Q&A is currently unavailable. Please try again later.")
      );
    }
  }

  private async handleReviewMistakes(context: TurnContext, _text: string): Promise<void> {
    try {
      await context.sendActivity(MessageFactory.text("✨ Reviewing your recent game mistakes..."));

      // For demo — use empty game history. In production, look up by user's M365 identity.
      const review = await generateMistakeReview([], "intermediate");

      if (review.studentMistakes.length === 0) {
        await context.sendActivity(
          MessageFactory.text(
            "## ✨ Game Review\n\n" +
              "No mistakes found in your recent games — great job! 🎉\n\n" +
              "**Tips to keep improving:**\n" +
              review.overallTips.map((t) => `• ${t}`).join("\n") +
              "\n\nPlay another game and come back for a personalized review!"
          )
        );
        return;
      }

      const lines: string[] = ["## ✨ Your Game Mistakes Review", ""];
      lines.push("### 🔍 Recent Errors");
      lines.push("");
      lines.push("| Your Speech | Correction | Type | Explanation |");
      lines.push("|---|---|---|---|");
      for (const m of review.studentMistakes.slice(0, 8)) {
        lines.push(
          `| ${m.originalSpeech} | **${m.correctedVersion}** | ${m.mistakeType} | ${m.explanation} |`
        );
      }
      lines.push("");
      lines.push("### 💡 Overall Tips");
      for (const tip of review.overallTips) {
        lines.push(`• ${tip}`);
      }
      lines.push("");
      lines.push("Want drills to practice these specific errors?");

      await context.sendActivity(MessageFactory.text(lines.join("\n")));
    } catch (error: any) {
      console.error("[M365 Bot] Review mistakes failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, mistake review is currently unavailable. Please try again later.")
      );
    }
  }

  // ── Existing handlers (unchanged) ─────────────────────────────────────────

  private async handleAnalyzeSpeech(context: TurnContext, text: string): Promise<void> {
    try {
      const speechText = this.extractSpeechText(text);

      if (!speechText || speechText.length < 5) {
        await context.sendActivity(
          MessageFactory.text(
            "Please provide the speech you'd like me to analyze. For example:\n\n" +
              '> "I think he is the werewolf because he act strange last night"\n\n' +
              "Or just paste the student's speech directly."
          )
        );
        return;
      }

      await context.sendActivity(
        MessageFactory.text(`🔍 Analyzing speech: *"${speechText}"*...`)
      );

      const agent = getAgent();
      const result = await agent.run("analyze_speech", {
        text: speechText,
        context: "Werewolf game discussion (via M365 Copilot Chat)",
      });

      const analysis = result.result as SpeechAnalysisResult;
      await context.sendActivity(
        MessageFactory.text(this.formatSpeechAnalysis(analysis, speechText))
      );
    } catch (error: any) {
      console.error("[M365 Bot] Speech analysis failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, speech analysis is currently unavailable. Please try again later.")
      );
    }
  }

  private async handleGenerateFeedback(context: TurnContext, text: string): Promise<void> {
    try {
      const { allSpeeches, role, difficulty } = this.extractFeedbackParams(text);

      if (!allSpeeches || allSpeeches.length === 0) {
        await context.sendActivity(
          MessageFactory.text(
            "To generate a learning report, please provide:\n\n" +
              "1. **All the student's speeches** from the game\n" +
              "2. **Their role** (villager, werewolf, seer, witch, hunter)\n" +
              "3. **Difficulty level** (beginner, intermediate, advanced)\n\n" +
              'Example: "Generate a report for a villager at intermediate level. Speeches: I think he is suspicious | I vote for player 3 | I am just a villager"'
          )
        );
        return;
      }

      await context.sendActivity(
        MessageFactory.text("📝 Generating comprehensive learning report...")
      );

      const agent = getAgent();
      const result = await agent.run("generate_feedback", {
        allSpeeches,
        role: role || "villager",
        difficulty: difficulty || "intermediate",
      });

      const feedback = result.result as ComprehensiveFeedback;
      await context.sendActivity(
        MessageFactory.text(
          this.formatFeedbackReport(feedback, role || "villager", difficulty || "intermediate")
        )
      );
    } catch (error: any) {
      console.error("[M365 Bot] Feedback generation failed:", error);
      await context.sendActivity(
        MessageFactory.text("❌ Sorry, feedback generation is currently unavailable. Please try again later.")
      );
    }
  }

  private extractSpeechText(message: string): string {
    const quotedMatch = message.match(/["""]([\s\S]+?)["”]/);
    if (quotedMatch) return quotedMatch[1].trim();

    const prefixPatterns = [
      /^(?:analyze|check|correct|score)\s*(?:this|the|my)?\s*(?:speech|sentence|english|text)?\s*[:：-]\s*/i,
      /^(?:what|how)\s+(?:about|is)\s+(?:this|the|my)\s+(?:speech|sentence|text)\s*[:：-]?\s*/i,
      /^(?:is|are)\s+(?:this|that|these)\s+(?:correct|right|good|ok)\s*[:：-]?\s*/i,
      /^.*?(?:speech|sentence|text)\s*(?:is|:)\s*/i,
    ];

    for (const pattern of prefixPatterns) {
      const match = message.match(pattern);
      if (match) {
        const remaining = message.slice(match[0].length).trim();
        if (remaining.length > 3) return remaining;
      }
    }

    if (
      !/^(analyze|check|correct|score|help|what|how|generate|create|make|report|feedback|vocab|drill|practice|strategy|review|rules?)\b/i.test(
        message
      )
    ) {
      return message;
    }

    return "";
  }

  private extractFeedbackParams(message: string): {
    allSpeeches: string[];
    role: string;
    difficulty: string;
  } {
    const roleMatch = message.match(/\b(villager|werewolf|seer|witch|hunter)\b/i);
    const difficultyMatch = message.match(/\b(beginner|intermediate|advanced)\b/i);

    let speechSection = "";
    const speechesMatch = message.match(/speeches?\s*[:：]\s*([\s\S]+)/i);
    if (speechesMatch) {
      speechSection = speechesMatch[1];
    } else {
      const quotedSpeeches = message.match(/["""](.+?)["”]/g);
      if (quotedSpeeches && quotedSpeeches.length > 0) {
        speechSection = quotedSpeeches.map((q) => q.replace(/["""”]/g, "")).join(" | ");
      }
    }

    const allSpeeches = speechSection
      .split(/\s*\|\s*|\s*•\s*|\s*-\s*|\s*\n\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    return {
      allSpeeches,
      role: roleMatch?.[1]?.toLowerCase() || "",
      difficulty: difficultyMatch?.[1]?.toLowerCase() || "",
    };
  }

  // ── Formatters ────────────────────────────────────────────────────────────

  private formatSpeechAnalysis(analysis: SpeechAnalysisResult, original: string): string {
    const lines: string[] = ["## 📊 Speech Analysis", ""];
    lines.push(`**Original:** "${original}"`);
    lines.push("");

    if (analysis.congratulations) {
      lines.push(`🎉 ${analysis.congratulations}`);
      return lines.join("\n");
    }

    lines.push("### Scores");
    lines.push("| Dimension | Score |");
    lines.push("|---|---|");
    lines.push(`| Overall | **${analysis.scores.overall}/100** |`);
    lines.push(`| Grammar Accuracy | ${analysis.scores.accuracy}/100 |`);
    lines.push(`| Fluency & Naturalness | ${analysis.scores.fluency}/100 |`);
    lines.push("");

    if (analysis.correctedText && analysis.correctedText !== original) {
      lines.push(`**Suggested correction:** "${analysis.correctedText}"`);
      lines.push("");
    }

    if (analysis.improvements && analysis.improvements.length > 0) {
      lines.push("### Improvements");
      for (const imp of analysis.improvements) {
        lines.push(`• ${imp}`);
      }
    }

    return lines.join("\n");
  }

  private formatFeedbackReport(
    feedback: ComprehensiveFeedback,
    role: string,
    difficulty: string
  ): string {
    const lines: string[] = ["## 📝 End-of-Game Learning Report"];
    lines.push(`**Role:** ${role} | **Level:** ${difficulty}`);
    lines.push("");
    lines.push("### Overall");
    lines.push(feedback.overallEvaluation);
    lines.push("");
    lines.push("### ✅ Strengths");
    lines.push(`- **Scenario Adaptation:** ${feedback.strengths.scenarioAdaptation}`);
    lines.push(`- **Fluency & Interaction:** ${feedback.strengths.fluencyInteraction}`);
    lines.push(`- **Opinion Expression:** ${feedback.strengths.opinionExpression}`);
    lines.push("");
    lines.push("### 🔧 Areas for Improvement");
    lines.push(
      `- **Grammar Accuracy:** ${feedback.improvements.grammarAccuracy.issue}`
    );
    lines.push(`  → ${feedback.improvements.grammarAccuracy.suggestion}`);
    lines.push(
      `- **Vocabulary Diversity:** ${feedback.improvements.vocabularyDiversity.issue}`
    );
    lines.push(`  → ${feedback.improvements.vocabularyDiversity.suggestion}`);
    lines.push(
      `- **Debate Cohesion:** ${feedback.improvements.debateCohesion.issue}`
    );
    lines.push(`  → ${feedback.improvements.debateCohesion.suggestion}`);

    return lines.join("\n");
  }

  // ── Text helpers ──────────────────────────────────────────────────────────

  private getGreetingText(): string {
    return (
      "👋 Hello! I'm the **Werewolf English Tutor**.\n\n" +
      "I help you practice English through the Werewolf game. Here's what I can do:\n\n" +
      "📚 **Vocabulary** — `teach me werewolf words`\n" +
      "🎯 **Grammar Drills** — `give me practice drills`\n" +
      "🗡️ **Role Strategy** — `how to play as witch`\n" +
      "❓ **Game Rules** — `what does the prophet do?`\n" +
      "✨ **Review Mistakes** — `review my last game`\n" +
      "🔍 **Analyze Speech** — `check my english: I think he is werewolf`\n\n" +
      "What would you like to work on?"
    );
  }

  private getHelpText(): string {
    return (
      "I can help with:\n\n" +
      "📚 **Vocabulary** — `teach me werewolf words`\n" +
      "🎯 **Grammar Drills** — `give me practice drills`\n" +
      "🗡️ **Role Strategy** — `how to play as witch`\n" +
      "❓ **Game Rules** — `what does the prophet do?`\n" +
      "✨ **Review Mistakes** — `review my last game`\n" +
      "🔍 **Analyze Speech** — `check my english: I think he is werewolf`\n" +
      "📝 **Learning Report** — `generate a report`\n\n" +
      "Just type what you need!"
    );
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let botInstance: WerewolfEduCopilotBot | null = null;

export function getM365Bot(): WerewolfEduCopilotBot {
  if (!botInstance) {
    botInstance = new WerewolfEduCopilotBot();
    console.log("[M365 Bot] WerewolfEduCopilotBot initialized");
  }
  return botInstance;
}
