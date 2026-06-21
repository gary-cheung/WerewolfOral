import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { gameManager } from "./lib/gameManager";
import { analyzeSpeech, transcribeAudio, getAgent, getCopilotChatPublishConfig, getAgentRegistrationStatus } from "./lib/openai";
import {
  generateVocabulary,
  generateDrills,
  generateRoleStrategy,
  askGameRules,
  generateMistakeReview,
} from "./lib/learning";
import { getM365Bot } from "./lib/m365-agent-bot";
import { CloudAdapter, authorizeJWT, AuthType } from "@microsoft/agents-hosting";
import { sql } from "drizzle-orm";
import { db } from "./db";
import express from "express";
import { WSMessage, Player, DifficultyLevel, GameRole, insertUserSchema, insertGameSchema } from "@shared/schema";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// Helper function to generate room code
function generateRoomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // ===== Authentication Routes =====

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username is required" });
      }
      
      if (!password || typeof password !== "string" || password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });

      // Set session data
      req.session.userId = user.id;
      req.session.username = user.username;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Set session data
      req.session.userId = user.id;
      req.session.username = user.username;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Room Code Routes =====

  // Create room with code (requires authentication)
  app.post("/api/rooms/create", requireAuth, async (req, res) => {
    try {
      // Use authenticated user ID from session
      const userId = req.session.userId!;

      // Generate unique room code
      let code = generateRoomCode();
      let existing = await storage.getRoomCodeByCode(code);
      while (existing) {
        code = generateRoomCode();
        existing = await storage.getRoomCodeByCode(code);
      }

      // Create game room
      const gameRoom = gameManager.createRoom();
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create room code
      const roomCode = await storage.createRoomCode({
        code,
        roomId: gameRoom.id,
        createdBy: userId,
        isActive: true,
        maxPlayers: 12,
        currentPlayers: 0,
        expiresAt,
      });

      res.json({ code, roomId: gameRoom.id });
    } catch (error: any) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Join room with code
  app.post("/api/rooms/join", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Room code is required" });
      }

      // Find room code
      const roomCode = await storage.getRoomCodeByCode(code.toUpperCase());
      if (!roomCode) {
        return res.status(404).json({ error: "Room not found or expired" });
      }

      // Check if room is full
      if (roomCode.currentPlayers >= roomCode.maxPlayers) {
        return res.status(400).json({ error: "Room is full" });
      }

      // Get room from game manager
      const room = gameManager.getRoom(roomCode.roomId);
      if (!room) {
        return res.status(404).json({ error: "Game room not found" });
      }

      res.json({ roomId: roomCode.roomId, currentPlayers: roomCode.currentPlayers, maxPlayers: roomCode.maxPlayers });
    } catch (error: any) {
      console.error("Error joining room:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== API Routes for Game Statistics =====

  // Create or get guest user
  app.post("/api/users/guest", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username is required" });
      }

      // Check if username already exists, add suffix if needed
      let finalUsername = username;
      let existingUser = await storage.getUserByUsername(finalUsername);
      let suffix = 1;
      
      while (existingUser) {
        finalUsername = `${username}${suffix}`;
        existingUser = await storage.getUserByUsername(finalUsername);
        suffix++;
        
        // Prevent infinite loop (max 1000 attempts)
        if (suffix > 1000) {
          return res.status(500).json({ error: "Unable to generate unique username" });
        }
      }

      // Generate guest ID
      const guestId = nanoid();
      
      // Create user with unique username
      const user = await storage.createUser({
        username: finalUsername,
        guestId,
      });

      // Regenerate session for security (prevent session fixation)
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set session data (required for requireAuth middleware)
      req.session.userId = user.id;
      req.session.username = user.username;

      res.json(user);
    } catch (error: any) {
      console.error("Error creating guest user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save game statistics
  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const savedGame = await storage.saveGameStats(gameData);
      res.json(savedGame);
    } catch (error: any) {
      console.error("Error saving game stats:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get user's game history
  app.get("/api/users/:userId/games", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const games = await storage.getUserGames(userId, limit);
      res.json(games);
    } catch (error: any) {
      console.error("Error fetching user games:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user statistics summary
  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reference: blueprint:javascript_websocket
  // AI Speech Analysis endpoint — used by client during day phase discussion
  app.post("/api/speech/analyze", async (req, res) => {
    try {
      const { text, context } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Speech text is required" });
      }

      console.log(`[SpeechAnalyze] Analyzing speech: "${text.substring(0, 80)}..."`);
      const analysis = await analyzeSpeech(text, context || "Werewolf game discussion");

      // Add duration and word count to the response
      const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
      const duration = Math.max(1, Math.floor(wordCount / 2)); // Rough estimate: 2 words/sec

      res.json({
        ...analysis,
        duration,
        wordCount,
      });
    } catch (error: any) {
      console.error("Error analyzing speech:", error);
      res.status(500).json({ error: error.message || "Failed to analyze speech" });
    }
  });

  // AI Speech Transcription endpoint — cross-platform fallback for browsers
  // that don't support the Web Speech API (Safari, iOS, Firefox).
  // Accepts raw audio blob, returns transcribed text via OpenAI Whisper.
  app.post(
    "/api/speech/transcribe",
    express.raw({ type: "audio/*", limit: "5mb" }),
    async (req, res) => {
      try {
        const audioBuffer = req.body as Buffer;

        if (!audioBuffer || audioBuffer.length === 0) {
          return res.status(400).json({ error: "Audio data is required" });
        }

        const mimeType = req.headers["content-type"] || "audio/webm";
        console.log(
          `[Transcribe] Received ${audioBuffer.length} bytes, type: ${mimeType}`
        );

        const text = await transcribeAudio(audioBuffer, mimeType);
        res.json({ text });
      } catch (error: any) {
        console.error("Error transcribing audio:", error);
        // Check if it's an OpenAI API error
        const message =
          error?.status === 404
            ? "Audio transcription is not available in this environment. Please type your speech instead."
            : error?.message || "Failed to transcribe audio";
        res.status(error?.status || 500).json({ error: message });
      }
    }
  );

  // ── Cache Management ──────────────────────────────────────────────────
  // Clear cache to refresh demo responses

  app.post("/api/learning/cache/clear", (_req, res) => {
    const { clearCache, getCacheStats } = require("./lib/learning-cache");
    const before = getCacheStats();
    const cleared = clearCache();
    res.json({ cleared, before: before.entries, message: `Cleared ${cleared} cached responses` });
  });

  app.get("/api/learning/cache/stats", (_req, res) => {
    const { getCacheStats } = require("./lib/learning-cache");
    res.json(getCacheStats());
  });

  // ── Demo endpoints ─────────────────────────────────────────────────────
  // Fixed content for Copilot Studio prototype — never changes, bilingual HK

  app.get("/api/demo/vocabulary", (req, res) => {
    const role = (req.query.role as string) || "werewolf";
    const { DEMO_VOCABULARY } = require("./lib/demo-data");
    const data = DEMO_VOCABULARY[role] || DEMO_VOCABULARY.werewolf;
    res.json(data);
  });

  app.get("/api/demo/drills", (_req, res) => {
    const { DEMO_DRILLS } = require("./lib/demo-data");
    res.json(DEMO_DRILLS);
  });

  app.get("/api/demo/strategy", (req, res) => {
    const role = (req.query.role as string) || "werewolf";
    const { DEMO_STRATEGIES } = require("./lib/demo-data");
    const data = DEMO_STRATEGIES[role] || DEMO_STRATEGIES.werewolf;
    res.json(data);
  });

  app.get("/api/demo/rules", (req, res) => {
    const topic = (req.query.topic as string) || "general";
    const { DEMO_RULES } = require("./lib/demo-data");
    const data = DEMO_RULES[topic] || DEMO_RULES.general;
    res.json(data);
  });

  app.get("/api/demo/review", (_req, res) => {
    const { DEMO_MISTAKE_REVIEW } = require("./lib/demo-data");
    res.json(DEMO_MISTAKE_REVIEW);
  });

  // ── Learning API endpoints ────────────────────────────────────────────
  // Used by both the website learning section and the Copilot Studio agent

  // Get vocabulary by category and optional role/difficulty
  app.get("/api/learning/vocabulary", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const role = req.query.role as string | undefined;
      const difficulty = req.query.difficulty as string | undefined;

      // Validate role if provided
      const validRoles = ["werewolf", "prophet", "villager", "witch", "hunter", "idiot", "guard", "wolf_king"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
      }

      const validDifficulties = ["basic", "intermediate", "advanced"];
      if (difficulty && !validDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: `Invalid difficulty. Must be one of: ${validDifficulties.join(", ")}` });
      }

      const vocabulary = await generateVocabulary(
        category,
        role as any,
        difficulty as any,
      );
      res.json(vocabulary);
    } catch (error: any) {
      console.error("[Learning] Vocabulary endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to generate vocabulary" });
    }
  });

  // Generate grammar/vocabulary drills — optionally personalized from game history
  app.post("/api/learning/drills", async (req, res) => {
    try {
      const { grammarFocus, difficulty, count, userId } = req.body;

      let gameHistory;
      if (userId) {
        gameHistory = await storage.getUserGames(userId, 10);
      }

      const drills = await generateDrills(
        grammarFocus,
        difficulty || "intermediate",
        count || 5,
        gameHistory,
      );
      res.json(drills);
    } catch (error: any) {
      console.error("[Learning] Drills endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to generate drills" });
    }
  });

  // Get role strategy guide
  app.get("/api/learning/role/:role/strategy", async (req, res) => {
    try {
      const { role } = req.params;
      const difficulty = req.query.difficulty as string | undefined;

      const validRoles = ["werewolf", "prophet", "villager", "witch", "hunter", "idiot", "guard", "wolf_king"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
      }

      const strategy = await generateRoleStrategy(role as any, difficulty as any);
      res.json(strategy);
    } catch (error: any) {
      console.error("[Learning] Role strategy endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to generate role strategy" });
    }
  });

  // Q&A about game rules
  app.post("/api/learning/rules/ask", async (req, res) => {
    try {
      const { question } = req.body;

      if (!question || typeof question !== "string" || question.trim().length === 0) {
        return res.status(400).json({ error: "Question is required" });
      }

      const answer = await askGameRules(question.trim());
      res.json(answer);
    } catch (error: any) {
      console.error("[Learning] Rules Q&A endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to answer question" });
    }
  });

  // Get personalized mistake review from game history
  app.get("/api/review/mistakes/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const gameHistory = await storage.getUserGames(userId, 10);
      const review = await generateMistakeReview(gameHistory);
      res.json(review);
    } catch (error: any) {
      console.error("[Review] Mistakes endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to generate review" });
    }
  });

  // Generate personalized review exercises
  app.post("/api/review/exercises", async (req, res) => {
    try {
      const { userId, difficulty } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const gameHistory = await storage.getUserGames(userId, 10);
      const review = await generateMistakeReview(gameHistory, difficulty);
      res.json(review);
    } catch (error: any) {
      console.error("[Review] Exercises endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to generate exercises" });
    }
  });

  // ── Player account linking (M365 identity ↔ game user) ──────────────────
  // Used by Copilot Studio to connect the M365 user to their game record

  // Link M365 email to game user (verification only — Copilot Studio stores the mapping)
  app.post("/api/users/link", async (req, res) => {
    try {
      const { m365Email, gameUsername } = req.body;

      if (!m365Email || !gameUsername) {
        return res.status(400).json({ error: "m365Email and gameUsername are required" });
      }

      const user = await storage.getUserByUsername(gameUsername);
      if (!user) {
        return res.status(404).json({
          error: "Game user not found. Make sure you've played at least one game on the website first.",
          hint: "Visit the WerewolfEdu website, play a game, and note your username shown in the lobby.",
        });
      }

      // Verification succeeded. Copilot Studio stores the m365Email → gameUsername
      // mapping in a user-level variable for subsequent calls.
      res.json({
        linked: true,
        userId: user.id,
        username: user.username,
        m365Email,
        message: `Account verified! Welcome, ${user.username}. I can now access your game history and provide personalized tutoring.`,
      });
    } catch (error: any) {
      console.error("[User] Link endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to verify account" });
    }
  });

  // Get user by email (used by Copilot Studio to look up the player)
  app.get("/api/users/me", async (req, res) => {
    try {
      const email = req.query.email as string;
      const username = req.query.username as string;

      if (!email && !username) {
        return res.status(400).json({ error: "email or username query parameter required" });
      }

      let user;
      if (username) {
        user = await storage.getUserByUsername(username);
      }
      // else: lookup by email once m365Email column exists

      if (!user) {
        return res.status(404).json({ error: "User not found. Play a game on the website first!" });
      }

      const stats = await storage.getUserStats(user.id);
      const recentGames = await storage.getUserGames(user.id, 5);

      res.json({
        userId: user.id,
        username: user.username,
        stats,
        recentGames: recentGames.map((g) => ({
          id: g.id,
          role: g.role,
          difficulty: g.difficulty,
          winner: g.winner,
          playerWon: g.playerWon,
          grammarErrorRate: g.grammarErrorRate,
          vocabularyScore: g.vocabularyScore,
          createdAt: g.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("[User] Me endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to get user info" });
    }
  });

  // ── Azure AI Agent Service endpoint (M365 Copilot Chat integration) ──
  // Called by Copilot Chat to invoke agent tools: analyze_speech, generate_feedback
  app.post("/api/agent/run", async (req, res) => {
    try {
      const { tool, args } = req.body;

      if (!tool || typeof tool !== "string") {
        return res.status(400).json({ error: "Tool name is required" });
      }

      const agent = getAgent();
      console.log(`[Agent] Running tool: ${tool}`);
      const result = await agent.run(tool, args || {});
      res.json(result);
    } catch (error: any) {
      console.error("[Agent] Error running tool:", error);
      res.status(500).json({ error: error.message || "Agent tool execution failed" });
    }
  });

  // Agent manifest endpoint — returns Copilot Chat publishing config
  app.get("/api/agent/manifest", (_req, res) => {
    res.json(getCopilotChatPublishConfig());
  });

  // Agent tools list — discoverability for Copilot Chat
  app.get("/api/agent/tools", (_req, res) => {
    const agent = getAgent();
    res.json({ tools: agent.getToolDefinitions(), available: agent.listTools() });
  });

  // ── M365 Agents SDK bot endpoint (Copilot Chat via Azure Bot Service) ──
  // Handles incoming Activity protocol messages from Copilot Chat / Teams.
  // Uses CloudAdapter directly to avoid the strict production auth requirement
  // while MicrosoftAppId/MicrosoftAppPassword are being provisioned.
  const m365Bot = getM365Bot();
  const m365AuthConfig = {
    clientId: process.env.MicrosoftAppId || "dev-placeholder",
    clientSecret: process.env.MicrosoftAppPassword || "dev-placeholder",
    tenantId: process.env.MicrosoftAppTenantId || "7b37f8d6-cb05-4895-9066-6398c8669b31",
    authType: AuthType.ClientSecret,
  };
  const m365Adapter = new CloudAdapter(m365AuthConfig);

  app.post("/api/messages", async (req, res) => {
    try {
      await m365Adapter.process(req, res, (context) => (m365Bot as any).run(context));
    } catch (e: any) {
      console.error("[M365 Bot] Error processing message:", e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Bot processing failed", detail: e.message });
      }
    }
  });
  console.log("[M365 Bot] Endpoint registered at POST /api/messages");

  // Health check endpoint — used by Azure Container Apps liveness/readiness probes
  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, "ok" | "error" | "degraded"> = {};

    // 1. Database connectivity
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch (e: any) {
      checks.database = "error";
      console.error("[Health] Database check failed:", e.message);
    }

    // 2. Azure OpenAI
    if (process.env.AZURE_OPENAI_ENDPOINT) {
      checks.openai = "ok";
    } else {
      checks.openai = "degraded";
    }

    // 3. Azure AI Agent Service (+ Copilot Chat publishing status)
    const agentStatus = getAgentRegistrationStatus();
    if (agentStatus.registered) {
      checks.aiAgent = "ok";
    } else if (process.env.AZURE_AI_AGENT_ENDPOINT) {
      checks.aiAgent = "degraded"; // endpoint set but registration failed
    }

    // 4. Cosmos DB session store
    if (process.env.COSMOS_CONNECTION_STRING) {
      checks.cosmos = "ok";
    }

    // 5. Memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    if (memPercent > 85) {
      checks.memory = "degraded";
    }

    const hasError = Object.values(checks).some((v) => v === "error");
    res.status(hasError ? 503 : 200).json({
      status: hasError ? "unhealthy" : "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: { heapUsedMB, heapTotalMB, percent: memPercent },
      checks,
      copilotChat: {
        published: agentStatus.registered,
        method: agentStatus.method,
        agentId: agentStatus.agentId || null,
        error: agentStatus.error || null,
      },
      m365AgentSdk: {
        enabled: true,
        endpoint: "/api/messages",
        botServiceRequired: !!(process.env.MicrosoftAppId),
      },
      version: process.env.APP_VERSION || "dev",
    });
  });

  // WebSocket server on /ws path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store WebSocket connections by player ID
  const connections = new Map<string, WebSocket>();
  
  // Set up callback for game manager to broadcast updates
  gameManager.setRoomUpdateCallback((roomId: string, room: any) => {
    broadcastToRoom(roomId, {
      type: "game_update",
      payload: room,
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    let currentPlayerId: string | undefined;

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "join_room": {
            const { playerId, playerName, difficulty, role, roomCode: clientRoomCode } = message.payload as { 
              playerId: string; 
              playerName: string; 
              difficulty: DifficultyLevel; 
              role: GameRole;
              roomCode?: string;
            };

            currentPlayerId = playerId;
            connections.set(playerId, ws);

            let room: any;
            
            // If roomCode provided, find the specific room
            if (clientRoomCode) {
              // Normalize room code (trim + uppercase) to match stored format
              const normalizedCode = clientRoomCode.trim().toUpperCase();
              const roomCodeData = await storage.getRoomCodeByCode(normalizedCode);
              
              if (roomCodeData) {
                room = gameManager.getRoom(roomCodeData.roomId);
                if (!room) {
                  ws.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Room not found" },
                  }));
                  break;
                }
                if (room.phase !== "waiting") {
                  ws.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Game has already started" },
                  }));
                  break;
                }
                if (room.players.length >= 12) {
                  ws.send(JSON.stringify({
                    type: "error",
                    payload: { message: "Room is full" },
                  }));
                  break;
                }
              } else {
                ws.send(JSON.stringify({
                  type: "error",
                  payload: { message: "Invalid or expired room code" },
                }));
                break;
              }
            } else {
              // No room code - use matchmaking
              room = gameManager.findAvailableRoom(difficulty);
              if (!room) {
                room = gameManager.createRoom();
              }
            }

            // Use the host's difficulty for joiners (first player = host)
            const hostDifficulty = room.players.length > 0 ? room.players[0].difficulty : difficulty;

            const player: Player = {
              id: playerId,
              name: playerName,
              difficulty: clientRoomCode ? hostDifficulty : difficulty,
              role, // Will be reassigned when game starts
              status: "alive",
              isReady: false,
              hasSpoken: false,
            };

            const joined = gameManager.joinRoom(room.id, player);
            if (joined) {
              // Broadcast player_joined event to all players in room
              broadcastToRoom(room.id, {
                type: "player_joined",
                payload: { player, roomId: room.id },
              });

              // Also broadcast full game_update so all clients refresh their player list
              const updatedRoom = gameManager.getRoom(room.id);
              broadcastToRoom(room.id, {
                type: "game_update",
                payload: updatedRoom,
              });
              
              // Update room player count in database
              if (clientRoomCode) {
                const normalizedCode = clientRoomCode.trim().toUpperCase();
                await storage.updateRoomCodePlayers(normalizedCode, room.players.length);
              }
            }
            break;
          }

          case "player_ready": {
            const { playerId } = message.payload as { playerId: string };
            const room = gameManager.getRoomForPlayer(playerId);
            if (room) {
              gameManager.setPlayerReady(room.id, playerId);
              broadcastToRoom(room.id, {
                type: "game_update",
                payload: room,
              });

              // Check if any real player is ready
              const realPlayers = room.players.filter(p => !p.id.startsWith('bot-'));
              const realPlayersReady = realPlayers.filter(p => p.isReady).length;
              const allRealReady = realPlayers.length > 0 && realPlayers.every(p => p.isReady);

              console.log(`[Ready] Room ${room.id}: realPlayers=${realPlayers.length}, ready=${realPlayersReady}, allReady=${allRealReady}`);

              // Start game when all real players are ready (or 1-player demo mode)
              if (allRealReady) {
                const delay = realPlayers.length === 1 ? 1500 : 2000; // Faster for solo demo
                setTimeout(() => {
                  const started = gameManager.startGame(room.id);
                  console.log(`[Ready] startGame result: ${started}, room phase: ${room.phase}`);
                  if (started) {
                    const updatedRoom = gameManager.getRoom(room.id);
                    broadcastToRoom(room.id, {
                      type: "game_update",
                      payload: updatedRoom,
                    });
                  } else {
                    // If startGame failed, broadcast current state so client knows
                    broadcastToRoom(room.id, {
                      type: "game_update",
                      payload: room,
                    });
                  }
                }, delay);
              }
            }
            break;
          }

          case "night_action": {
            const { playerId, targetId } = message.payload as { playerId: string; targetId: string };
            const room = gameManager.getRoomForPlayer(playerId);
            if (room) {
              const success = await gameManager.handleNightAction(room.id, playerId, targetId);
              if (success) {
                const updatedRoom = gameManager.getRoom(room.id);
                broadcastToRoom(room.id, {
                  type: "game_update",
                  payload: updatedRoom,
                });
              }
            }
            break;
          }

          case "speech_submit": {
            const { playerId, text } = message.payload as { playerId: string; text: string };
            const room = gameManager.getRoomForPlayer(playerId);
            if (room) {
              const feedback = await gameManager.handleSpeech(room.id, playerId, text);
              
              // Send feedback to speaker
              const playerWs = connections.get(playerId);
              if (playerWs && playerWs.readyState === WebSocket.OPEN) {
                playerWs.send(JSON.stringify({
                  type: "game_update",
                  payload: { ...room, aiFeedback: feedback },
                }));
              }

              // Broadcast updated room state to all
              broadcastToRoom(room.id, {
                type: "game_update",
                payload: room,
              });
            }
            break;
          }

          case "vote_submit": {
            const { playerId, targetId } = message.payload as { playerId: string; targetId: string };
            const room = gameManager.getRoomForPlayer(playerId);
            if (room) {
              await gameManager.handleVote(room.id, playerId, targetId);
              const updatedRoom = gameManager.getRoom(room.id);
              broadcastToRoom(room.id, {
                type: "game_update",
                payload: updatedRoom,
              });
            }
            break;
          }

          case "start_game": {
            const { roomId } = message.payload as { roomId: string };
            const room = gameManager.getRoom(roomId);
            if (room) {
              gameManager.startVotingPhase(roomId);
              const updatedRoom = gameManager.getRoom(roomId);
              broadcastToRoom(roomId, {
                type: "game_update",
                payload: updatedRoom,
              });
            }
            break;
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("WebSocket message error:", errMsg);
        ws.send(JSON.stringify({
          type: "error",
          payload: { message: `Server error: ${errMsg}` },
        }));
      }
    });

    ws.on('close', () => {
      if (currentPlayerId) {
        const room = gameManager.getRoomForPlayer(currentPlayerId);
        if (room) {
          broadcastToRoom(room.id, {
            type: "player_left",
            payload: { playerId: currentPlayerId },
          });
        }
        gameManager.leaveRoom(currentPlayerId);
        connections.delete(currentPlayerId);
      }
    });
  });

  function broadcastToRoom(roomId: string, message: WSMessage) {
    const room = gameManager.getRoom(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    for (const player of room.players) {
      const ws = connections.get(player.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  return httpServer;
}
