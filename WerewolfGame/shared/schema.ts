import { z } from "zod";
import { pgTable, serial, varchar, integer, timestamp, jsonb, text, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// Game difficulty levels
export const difficultyLevels = ["basic", "intermediate", "advanced"] as const;
export type DifficultyLevel = typeof difficultyLevels[number];

// Game roles
export const gameRoles = ["werewolf", "prophet", "villager", "witch", "hunter", "idiot", "guard", "wolf_king"] as const;
export type GameRole = typeof gameRoles[number];

// Game phases
export const gamePhases = ["waiting", "night", "day", "voting", "finished"] as const;
export type GamePhase = typeof gamePhases[number];

// Player status
export const playerStatuses = ["alive", "dead"] as const;
export type PlayerStatus = typeof playerStatuses[number];

// Player Schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(gameRoles).optional(),
  difficulty: z.enum(difficultyLevels),
  status: z.enum(playerStatuses).default("alive"),
  isReady: z.boolean().default(false),
  hasSpoken: z.boolean().default(false),
  votedFor: z.string().optional(),
});

export type Player = z.infer<typeof playerSchema>;

// Speech feedback from AI - Simplified Real-time Format (inspired by 真棒 APP)
export const speechFeedbackSchema = z.object({
  // Score Summary (0-100 each)
  scores: z.object({
    overall: z.number(), // Overall score
    accuracy: z.number(), // Grammar accuracy
    fluency: z.number(), // Speaking fluency
  }),
  
  // Corrected Text (if grammar errors found)
  correctedText: z.string().optional(), // Enhanced version of user's speech
  
  // Key Improvements (2-3 concise bullet points in English)
  improvements: z.array(z.string()), // e.g., ["Changed 'I think' to 'I find' for more directness", "Replaced 'most appealing' with 'particularly appealing' for precision"]
  
  // Congratulations message if no errors
  congratulations: z.string().optional(), // e.g., "Great! No grammar errors~"
  
  // Basic stats
  duration: z.number(), // in seconds
  wordCount: z.number(),
});

export type SpeechFeedback = z.infer<typeof speechFeedbackSchema>;

// Speech record (for a single speech during the game)
export const speechRecordSchema = z.object({
  playerId: z.string(),
  text: z.string(),
  timestamp: z.number(),
  feedback: speechFeedbackSchema.optional(),
});

export type SpeechRecord = z.infer<typeof speechRecordSchema>;

// Learning report for a game session (based on formal feedback format)
export const learningReportSchema = z.object({
  playerId: z.string(),
  gameId: z.string(),
  
  // I. Basic Information
  basicInfo: z.object({
    studentName: z.string(),
    scenario: z.string(), // e.g., "Werewolf Game - Day Phase Discussion"
    roles: z.string(), // e.g., "Villager, Prophet, Werewolf"
    phases: z.string(), // e.g., "Sheriff Election Speech, Daytime Voting Debate"
    date: z.string(),
  }),
  
  // II. Overall Evaluation
  overallEvaluation: z.string(), // 1-2 sentence summary
  
  // III. Detailed Performance Analysis
  // (A) Strengths & Highlights
  strengths: z.object({
    scenarioAdaptation: z.string(), // How well student uses game-specific language
    fluencyInteraction: z.string(), // Speaking fluency and responsiveness
    opinionExpression: z.string(), // Clarity of arguments and logic
  }),
  
  // (B) Improvement Suggestions
  improvements: z.object({
    grammarAccuracy: z.object({
      issue: z.string(),
      suggestion: z.string(),
    }),
    vocabularyDiversity: z.object({
      issue: z.string(),
      suggestion: z.string(),
    }),
    debateCohesion: z.object({
      issue: z.string(),
      suggestion: z.string(),
    }),
  }),
  
  // IV. Phased Improvement Plan
  phasedImprovementPlan: z.object({
    shortTerm: z.object({
      timeRange: z.string(), // "1-2 weeks"
      goals: z.string(), // Core objectives and specific actions
    }),
    midTerm: z.object({
      timeRange: z.string(), // "3-4 weeks"
      goals: z.string(),
    }),
    longTerm: z.object({
      timeRange: z.string(), // "1-2 months"
      goals: z.string(),
    }),
  }),
  
  // Statistics (kept for reference)
  totalSpeechTime: z.number(), // in seconds
  totalGrammarErrors: z.number(),
  totalWords: z.number(),
  speeches: z.array(speechRecordSchema),
  grammarErrorRate: z.number(), // percentage
  vocabularyScore: z.number(), // 0-100
  logicScore: z.number(), // 0-100
  savedVocabulary: z.array(z.object({
    word: z.string(),
    suggestion: z.string(),
  })),
});

export type LearningReport = z.infer<typeof learningReportSchema>;

// Final game state (when game finishes)
export const finalGameStateSchema = z.object({
  winner: z.enum(["villagers", "werewolves"]),
  reason: z.string(), // Why the game ended
  totalRounds: z.number(),
  survivingPlayers: z.number(),
  eliminatedPlayers: z.number(),
  learningReport: learningReportSchema.optional(), // Generated learning report for the player
});

export type FinalGameState = z.infer<typeof finalGameStateSchema>;

// Game room schema
export const gameRoomSchema = z.object({
  id: z.string(),
  players: z.array(playerSchema),
  phase: z.enum(gamePhases),
  currentRound: z.number().default(0), // Track current round number
  currentSpeaker: z.string().optional(),
  nightTarget: z.string().optional(), // player targeted during night
  speeches: z.array(speechRecordSchema),
  votes: z.record(z.string(), z.string()), // playerId -> votedForPlayerId
  winner: z.enum(["villagers", "werewolves"]).optional(),
  finalState: finalGameStateSchema.optional(), // Populated when game finishes
  createdAt: z.number(),
});

export type GameRoom = z.infer<typeof gameRoomSchema>;

// WebSocket message types
export const wsMessageTypes = [
  "join_room",
  "player_ready",
  "start_game",
  "night_action",
  "speech_submit",
  "vote_submit",
  "game_update",
  "player_joined",
  "player_left",
  "error"
] as const;

export type WSMessageType = typeof wsMessageTypes[number];

export const wsMessageSchema = z.object({
  type: z.enum(wsMessageTypes),
  payload: z.any(),
});

export type WSMessage = z.infer<typeof wsMessageSchema>;

// Role information for display
export interface RoleInfo {
  id: GameRole;
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  difficulty: "easy" | "medium" | "hard";
}

export const roleInfoMap: Record<GameRole, RoleInfo> = {
  villager: {
    id: "villager",
    name: "Villager",
    nameCn: "村民",
    description: "Simple opinion expression",
    descriptionCn: "簡單觀點表達",
    difficulty: "easy",
  },
  werewolf: {
    id: "werewolf",
    name: "Werewolf",
    nameCn: "狼人",
    description: "Logical deception",
    descriptionCn: "邏輯偽裝表達",
    difficulty: "hard",
  },
  prophet: {
    id: "prophet",
    name: "Prophet",
    nameCn: "預言家",
    description: "Analytical reasoning",
    descriptionCn: "分析推理表達",
    difficulty: "medium",
  },
  witch: {
    id: "witch",
    name: "Witch",
    nameCn: "女巫",
    description: "Strategic communication",
    descriptionCn: "策略溝通表達",
    difficulty: "medium",
  },
  hunter: {
    id: "hunter",
    name: "Hunter",
    nameCn: "獵人",
    description: "Decisive argumentation",
    descriptionCn: "果斷論證表達",
    difficulty: "medium",
  },
  idiot: {
    id: "idiot",
    name: "Idiot",
    nameCn: "白痴",
    description: "Immune to voting",
    descriptionCn: "免疫投票淘汰",
    difficulty: "medium",
  },
  guard: {
    id: "guard",
    name: "Guard",
    nameCn: "守衛",
    description: "Protective strategy",
    descriptionCn: "保護策略表達",
    difficulty: "medium",
  },
  wolf_king: {
    id: "wolf_king",
    name: "Wolf King",
    nameCn: "狼王",
    description: "Ultimate deception",
    descriptionCn: "終極偽裝表達",
    difficulty: "hard",
  },
};

// ======= DATABASE TABLES (Drizzle ORM) =======

// Users table - for authentication and tracking
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }), // Hashed password for registered users
  guestId: varchar("guest_id", { length: 255 }).unique(), // For guest users (deprecated but kept for compatibility)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Games table - stores completed game sessions
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  winner: varchar("winner", { length: 50 }), // "villagers" or "werewolves"
  playerWon: boolean("player_won").notNull().default(false), // Did the user's team win?
  totalSpeechTime: integer("total_speech_time").notNull().default(0), // in seconds
  totalWords: integer("total_words").notNull().default(0),
  totalGrammarErrors: integer("total_grammar_errors").notNull().default(0),
  grammarErrorRate: integer("grammar_error_rate").notNull().default(0), // percentage (0-100)
  vocabularyScore: integer("vocabulary_score").notNull().default(0), // 0-100
  logicScore: integer("logic_score").notNull().default(0), // 0-100
  speeches: jsonb("speeches").notNull().$type<SpeechRecord[]>().default([]), // Array of speech records
  savedVocabulary: jsonb("saved_vocabulary").notNull().$type<Array<{word: string, suggestion: string}>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

// Relations - defined after both tables
export const usersRelations = relations(users, ({ many }) => ({
  games: many(games),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
}));

// Room codes table - for creating and joining game rooms
export const roomCodes = pgTable("room_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // 6-character room code
  roomId: varchar("room_id", { length: 255 }).notNull(), // Game room ID
  createdBy: integer("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true), // Can be deactivated after game starts
  maxPlayers: integer("max_players").notNull().default(12),
  currentPlayers: integer("current_players").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Expires after 24 hours
});

export const insertRoomCodeSchema = createInsertSchema(roomCodes).omit({ id: true, createdAt: true });
export type InsertRoomCode = z.infer<typeof insertRoomCodeSchema>;
export type RoomCode = typeof roomCodes.$inferSelect;

export const roomCodesRelations = relations(roomCodes, ({ one }) => ({
  creator: one(users, {
    fields: [roomCodes.createdBy],
    references: [users.id],
  }),
}));
