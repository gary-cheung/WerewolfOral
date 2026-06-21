import { type User, type InsertUser, type Game, type InsertGame, type RoomCode, type InsertRoomCode, users, games, roomCodes } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gt } from "drizzle-orm";

// Storage interface for database operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGuestId(guestId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room code methods
  createRoomCode(roomCode: InsertRoomCode): Promise<RoomCode>;
  getRoomCodeByCode(code: string): Promise<RoomCode | undefined>;
  updateRoomCodePlayers(code: string, currentPlayers: number): Promise<void>;
  deactivateRoomCode(code: string): Promise<void>;
  
  // Game statistics methods
  saveGameStats(game: InsertGame): Promise<Game>;
  getUserGames(userId: number, limit?: number): Promise<Game[]>;
  getUserStats(userId: number): Promise<{
    totalGames: number;
    averageGrammarErrorRate: number;
    averageVocabularyScore: number;
    averageLogicScore: number;
    totalSpeechTime: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByGuestId(guestId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.guestId, guestId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Room code methods
  async createRoomCode(insertRoomCode: InsertRoomCode): Promise<RoomCode> {
    const [roomCode] = await db
      .insert(roomCodes)
      .values(insertRoomCode)
      .returning();
    return roomCode;
  }

  async getRoomCodeByCode(code: string): Promise<RoomCode | undefined> {
    const [roomCode] = await db
      .select()
      .from(roomCodes)
      .where(
        and(
          eq(roomCodes.code, code),
          eq(roomCodes.isActive, true),
          gt(roomCodes.expiresAt, new Date())
        )
      );
    return roomCode || undefined;
  }

  async updateRoomCodePlayers(code: string, currentPlayers: number): Promise<void> {
    await db
      .update(roomCodes)
      .set({ currentPlayers })
      .where(eq(roomCodes.code, code));
  }

  async deactivateRoomCode(code: string): Promise<void> {
    await db
      .update(roomCodes)
      .set({ isActive: false })
      .where(eq(roomCodes.code, code));
  }

  // Game statistics methods
  async saveGameStats(game: InsertGame): Promise<Game> {
    const [savedGame] = await db
      .insert(games)
      .values(game as any)
      .returning();
    return savedGame;
  }

  async getUserGames(userId: number, limit: number = 50): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.userId, userId))
      .orderBy(desc(games.createdAt))
      .limit(limit);
  }

  async getUserStats(userId: number): Promise<{
    totalGames: number;
    averageGrammarErrorRate: number;
    averageVocabularyScore: number;
    averageLogicScore: number;
    totalSpeechTime: number;
  }> {
    const userGames = await db
      .select()
      .from(games)
      .where(eq(games.userId, userId));

    if (userGames.length === 0) {
      return {
        totalGames: 0,
        averageGrammarErrorRate: 0,
        averageVocabularyScore: 0,
        averageLogicScore: 0,
        totalSpeechTime: 0,
      };
    }

    const totalGrammarErrorRate = userGames.reduce((sum, g) => sum + g.grammarErrorRate, 0);
    const totalVocabularyScore = userGames.reduce((sum, g) => sum + g.vocabularyScore, 0);
    const totalLogicScore = userGames.reduce((sum, g) => sum + g.logicScore, 0);
    const totalSpeechTime = userGames.reduce((sum, g) => sum + g.totalSpeechTime, 0);

    return {
      totalGames: userGames.length,
      averageGrammarErrorRate: Math.round(totalGrammarErrorRate / userGames.length),
      averageVocabularyScore: Math.round(totalVocabularyScore / userGames.length),
      averageLogicScore: Math.round(totalLogicScore / userGames.length),
      totalSpeechTime,
    };
  }
}

export const storage = new DatabaseStorage();
