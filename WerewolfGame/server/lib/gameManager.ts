import { GameRoom, Player, GamePhase, SpeechRecord, SpeechFeedback, DifficultyLevel, GameRole, LearningReport } from "@shared/schema";
import { randomUUID } from "crypto";
import { analyzeSpeech, generateComprehensiveFeedback } from "./openai";

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

  createRoom(): GameRoom {
    const room: GameRoom = {
      id: randomUUID(),
      players: [],
      phase: "waiting",
      currentRound: 0,
      speeches: [],
      votes: {},
      createdAt: Date.now(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  findAvailableRoom(difficulty: DifficultyLevel): GameRoom | undefined {
    for (const room of Array.from(this.rooms.values())) {
      if (room.phase === "waiting" && room.players.length < 12) {
        // Check if room has similar difficulty players
        if (room.players.length === 0 || room.players[0].difficulty === difficulty) {
          return room;
        }
      }
    }
    return undefined;
  }

  joinRoom(roomId: string, player: Player): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length >= 12 || room.phase !== "waiting") {
      return false;
    }

    room.players.push(player);
    this.playerRooms.set(player.id, roomId);
    return true;
  }

  leaveRoom(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== playerId);
      
      // Clean up empty rooms
      if (room.players.length === 0 && room.phase === "waiting") {
        this.rooms.delete(roomId);
      }
    }
    this.playerRooms.delete(playerId);
  }

  getRoomForPlayer(playerId: string): GameRoom | undefined {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  setPlayerReady(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    player.isReady = true;
    return true;
  }

  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.players.every(p => p.isReady)) {
      return false;
    }

    // Auto-fill with bots if less than 12 players
    this.autoFillWithBots(room);

    // Assign roles based on player count
    this.assignRoles(room);
    room.phase = "night";
    room.currentRound = 1; // Start at round 1
    
    // Auto-advance night phase for bots (demo mode - 3 seconds)
    setTimeout(() => {
      void this.autoAdvanceNight(roomId).catch(error => {
        console.error('[AutoAdvanceNight] Error:', error);
      });
    }, 3000);
    
    return true;
  }
  
  private async autoAdvanceNight(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "night") return;
    
    // Find alive werewolves
    const werewolves = room.players.filter(p => p.status === "alive" && p.role === "werewolf");
    if (werewolves.length === 0) {
      // No werewolves left, skip night
      await this.advanceToDay(roomId);
      return;
    }
    
    // Bots auto-select target
    const possibleTargets = room.players.filter(p => 
      p.status === "alive" && p.role !== "werewolf"
    );
    
    if (possibleTargets.length > 0) {
      const randomTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      room.nightTarget = randomTarget.id;
    }
    
    await this.advanceToDay(roomId);
    this.notifyRoomUpdate(roomId);
  }
  
  // Callback for room updates
  private roomUpdateCallback?: (roomId: string, room: GameRoom) => void;
  
  setRoomUpdateCallback(callback: (roomId: string, room: GameRoom) => void): void {
    this.roomUpdateCallback = callback;
  }
  
  private notifyRoomUpdate(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && this.roomUpdateCallback) {
      this.roomUpdateCallback(roomId, room);
    }
  }
  
  private async advanceToDay(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // Process night kill BEFORE checking win condition
    if (room.nightTarget) {
      const nightVictim = room.players.find(p => p.id === room.nightTarget);
      if (nightVictim && nightVictim.status === "alive") {
        nightVictim.status = "dead";
        console.log(`[Night] ${nightVictim.name} was eliminated by werewolves`);
      }
      // Clear nightTarget after processing
      room.nightTarget = undefined;
    }
    
    // Check win condition after night kill
    await this.checkWinCondition(room);
    
    // If game already finished, don't continue
    if (room.phase === "finished") {
      this.notifyRoomUpdate(roomId);
      return;
    }
    
    room.phase = "day";
    
    // Reset all hasSpoken flags
    room.players.forEach(p => p.hasSpoken = false);
    
    // Set first alive player as current speaker
    const firstAlive = room.players.find(p => p.status === "alive");
    room.currentSpeaker = firstAlive?.id;
    
    this.notifyRoomUpdate(roomId);
    
    // Auto-advance for bots (demo mode - 1 second)
    setTimeout(() => {
      void this.autoBotSpeech(roomId).catch(error => {
        console.error('[AutoBotSpeech] Error:', error);
      });
    }, 1000);
  }
  
  private async autoBotSpeech(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "day") {
      console.log(`[AutoBot] Skipping - room phase: ${room?.phase}`);
      return;
    }
    
    if (!room.currentSpeaker) {
      console.log(`[AutoBot] No current speaker, advancing to voting`);
      this.advanceToVoting(roomId);
      return;
    }
    
    const speaker = room.players.find(p => p.id === room.currentSpeaker);
    if (!speaker) {
      console.log(`[AutoBot] Speaker not found: ${room.currentSpeaker}`);
      return;
    }
    
    console.log(`[AutoBot] Current speaker: ${speaker.name} (${speaker.id.startsWith('bot-') ? 'bot' : 'human'})`);
    
    // If current speaker is a bot, auto-speak
    if (speaker.id.startsWith('bot-')) {
      const botSpeech = this.generateBotSpeech(speaker);
      console.log(`[AutoBot] ${speaker.name} speaking: "${botSpeech}"`);
      await this.handleSpeech(roomId, speaker.id, botSpeech, true); // isBot = true
      this.notifyRoomUpdate(roomId);
      
      // Check if all players have spoken
      const allSpoken = room.players.filter(p => p.status === "alive").every(p => p.hasSpoken);
      console.log(`[AutoBot] All spoken? ${allSpoken}`);
      
      if (allSpoken) {
        this.advanceToVoting(roomId);
      } else {
        // Continue with next speaker (demo mode - 1 second)
        setTimeout(() => {
          void this.autoBotSpeech(roomId).catch(error => {
            console.error('[AutoBotSpeech] Error:', error);
          });
        }, 1000);
      }
    } else {
      console.log(`[AutoBot] Waiting for human player ${speaker.name} to speak`);
    }
  }
  
  private generateBotSpeech(player: Player): string {
    const speeches = [
      "I think we should be careful about who we trust.",
      "I noticed some suspicious behavior last night.",
      "We need to work together to find the werewolves.",
      "I'm not sure who to vote for yet.",
      "Let's discuss what happened during the night.",
    ];
    return speeches[Math.floor(Math.random() * speeches.length)];
  }
  
  private advanceToVoting(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.phase = "voting";
    this.notifyRoomUpdate(roomId);
    
    // Auto-vote for bots (demo mode - 3 seconds)
    setTimeout(() => {
      void this.autoBotVote(roomId).catch(error => {
        console.error('[AutoBotVote] Error:', error);
      });
    }, 3000);
  }
  
  private async autoBotVote(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "voting") return;
    
    const alivePlayers = room.players.filter(p => p.status === "alive");
    const bots = alivePlayers.filter(p => p.id.startsWith('bot-'));
    
    // Each bot votes for a random alive player
    for (const bot of bots) {
      const possibleTargets = alivePlayers.filter(p => p.id !== bot.id);
      if (possibleTargets.length > 0) {
        const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        room.votes[bot.id] = target.id;
      }
    }
    
    // Check if all voted
    if (Object.keys(room.votes).length >= alivePlayers.length) {
      await this.processVotes(room);
      this.notifyRoomUpdate(roomId);
    }
  }

  private autoFillWithBots(room: GameRoom): void {
    const currentCount = room.players.length;
    // Demo mode: fill to 4 players
    const targetCount = 4;
    if (currentCount >= 4) return;

    const botsNeeded = targetCount - currentCount;
    
    // Realistic player names to create immersive experience
    const realisticNames = [
      "Emily", "James", "Sophia", "Oliver", "Emma", "William",
      "Ava", "Lucas", "Isabella", "Mason", "Mia", "Ethan",
      "Charlotte", "Alexander", "Amelia", "Benjamin", "Harper", "Daniel"
    ];
    
    // Shuffle names to get random selection
    const shuffledNames = [...realisticNames].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < botsNeeded; i++) {
      const botPlayer: Player = {
        id: `bot-${randomUUID()}`,
        name: shuffledNames[i % shuffledNames.length],
        difficulty: room.players[0]?.difficulty || "basic",
        status: "alive",
        isReady: true,
        hasSpoken: false,
      };
      room.players.push(botPlayer);
    }
  }

  private assignRoles(room: GameRoom): void {
    const playerCount = room.players.length;
    const shuffled = [...room.players].sort(() => Math.random() - 0.5);
    let idx = 0;

    // Demo mode: 4-12 player configurations
    if (playerCount === 4) {
      // 4人局（Demo模式）：1狼 + 2神（预言家、女巫） + 1平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 5) {
      // 5人局（Demo快速模式）：1狼 + 2神（预言家、女巫） + 2平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 6) {
      // 6人局（Demo模式）：2狼 + 2神（预言家、女巫） + 2平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 7) {
      // 7人局：2狼 + 3神 + 2平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 8) {
      // 8人局：2狼 + 3神 + 3平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 9) {
      // 9 人局（入门友好，节奏快）：3 狼 + 3 神（预言家、女巫、猎人） + 3 平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 10) {
      // 10 人局（平衡进阶）：3 狼 + 4 神（预言家、女巫、猎人、白痴） + 3 平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "idiot";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 11) {
      // 11 人局（过渡配置）：4 狼 + 4 神（预言家、女巫、猎人、守卫） + 3 平民
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "guard";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (playerCount === 12) {
      // 12 人局（标准竞技局）：4 狼（含 1 狼王） + 4 神（预言家、女巫、猎人、守卫） + 4 平民
      shuffled[idx++].role = "wolf_king";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "guard";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else {
      // Fallback: default to 9-player if count is outside range
      // This should not happen due to autoFillWithBots, but adding as safety
      const werewolfCount = Math.floor(playerCount / 3);
      for (let i = 0; i < werewolfCount && idx < playerCount; i++) {
        shuffled[idx++].role = "werewolf";
      }
      if (idx < playerCount) shuffled[idx++].role = "prophet";
      if (idx < playerCount) shuffled[idx++].role = "witch";
      if (idx < playerCount) shuffled[idx++].role = "hunter";
      while (idx < playerCount) {
        shuffled[idx++].role = "villager";
      }
    }
  }

  async handleNightAction(roomId: string, werewolfId: string, targetId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "night") return false;

    const werewolf = room.players.find(p => p.id === werewolfId && p.role === "werewolf");
    if (!werewolf) return false;

    room.nightTarget = targetId;
    room.phase = "day";
    
    // Set first alive player as current speaker
    const firstAlive = room.players.find(p => p.status === "alive");
    room.currentSpeaker = firstAlive?.id;

    return true;
  }

  async handleSpeech(roomId: string, playerId: string, text: string, isBot = false): Promise<SpeechFeedback | undefined> {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "day") return undefined;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return undefined;

    let feedback: SpeechFeedback | undefined = undefined;

    // Only analyze speech for REAL players (not bots)
    if (!isBot && text.trim().length > 0) {
      console.log(`[AI] Analyzing speech for real player: ${player.name}`);
      // analyzeSpeech now has built-in model fallback (primary → fallback → safe default)
      const analysis = await analyzeSpeech(text, `Player is ${player.role}, discussing in day phase`);

      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      const duration = Math.max(1, Math.floor(wordCount / 2)); // Rough estimate: 2 words per second

      feedback = {
        scores: analysis.scores,
        improvements: analysis.improvements,
        correctedText: analysis.correctedText,
        congratulations: analysis.congratulations,
        duration,
        wordCount,
      };
      console.log(`[AI] Feedback: scores=${analysis.scores.overall}, improvements=${analysis.improvements.length}`);
    } else if (isBot) {
      console.log(`[AI] Skipping AI analysis for bot: ${player.name}`);
    }

    const speechRecord: SpeechRecord = {
      playerId,
      text,
      timestamp: Date.now(),
      feedback,
    };

    room.speeches.push(speechRecord);
    player.hasSpoken = true;

    console.log(`[Speech] ${player.name} spoke: "${text}"`);

    // Move to next speaker
    const currentIdx = room.players.findIndex(p => p.id === playerId);
    const nextAlive = room.players.slice(currentIdx + 1).find(p => p.status === "alive");
    room.currentSpeaker = nextAlive?.id;

    console.log(`[Speech] Next speaker: ${room.currentSpeaker ? room.players.find(p => p.id === room.currentSpeaker)?.name : 'none'}`);

    // Trigger bot speech if next speaker is a bot (demo mode - 2 seconds)
    if (room.currentSpeaker && room.currentSpeaker.startsWith('bot-')) {
      console.log(`[Speech] Triggering bot speech for next speaker`);
      setTimeout(() => {
        void this.autoBotSpeech(roomId).catch(error => {
          console.error('[AutoBotSpeech] Error:', error);
        });
      }, 1000);
    }

    return feedback;
  }

  async handleVote(roomId: string, playerId: string, targetId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "voting") return false;

    room.votes[playerId] = targetId;

    // Check if all alive players have voted
    const alivePlayers = room.players.filter(p => p.status === "alive");
    if (Object.keys(room.votes).length === alivePlayers.length) {
      await this.processVotes(room);
    }

    return true;
  }

  private async processVotes(room: GameRoom): Promise<void> {
    // Count votes
    const voteCounts: Record<string, number> = {};
    for (const targetId of Object.values(room.votes)) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    // Find most voted player
    let maxVotes = 0;
    let eliminatedId: string | undefined;
    for (const [playerId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = playerId;
      }
    }

    // Eliminate player voted out
    if (eliminatedId) {
      const player = room.players.find(p => p.id === eliminatedId);
      if (player) {
        player.status = "dead";
        console.log(`[Voting] ${player.name} was eliminated by voting`);
      }
    }

    // Check win condition after voting elimination
    await this.checkWinCondition(room);

    // Reset for next round or finish
    if (!room.winner) {
      room.phase = "night";
      room.currentRound = (room.currentRound || 0) + 1; // Increment round
      room.votes = {};
      room.players.forEach(p => p.hasSpoken = false);
      
      // Start next night phase (demo mode - 3 seconds)
      setTimeout(() => {
        void this.autoAdvanceNight(room.id).catch(error => {
          console.error('[AutoAdvanceNight] Error:', error);
        });
      }, 3000);
    } else {
      // Game finished - phase set to finished by checkWinCondition
      console.log(`[Game] Game finished! Winner: ${room.winner}. Round: ${room.currentRound}`);
    }
  }

  private async checkWinCondition(room: GameRoom): Promise<void> {
    const alivePlayers = room.players.filter(p => p.status === "alive");
    
    // Werewolf team: werewolf, wolf_king
    const aliveWerewolves = alivePlayers.filter(p => 
      p.role === "werewolf" || p.role === "wolf_king"
    );
    
    // Good team: villager, prophet, witch, hunter, guard, idiot
    const aliveGoodGuys = alivePlayers.filter(p => 
      p.role === "villager" || 
      p.role === "prophet" || 
      p.role === "witch" || 
      p.role === "hunter" || 
      p.role === "guard" || 
      p.role === "idiot"
    );

    let winReason = "";
    
    // Villager team wins: all werewolves eliminated
    if (aliveWerewolves.length === 0) {
      room.winner = "villagers";
      winReason = "All werewolves have been eliminated!";
      console.log(`[Game] Villagers win! All werewolves eliminated.`);
    } 
    // Werewolf team wins: werewolves >= good guys OR only werewolves remain
    else if (aliveWerewolves.length >= aliveGoodGuys.length || aliveGoodGuys.length === 0) {
      room.winner = "werewolves";
      winReason = aliveGoodGuys.length === 0 
        ? "Only werewolves remain!"
        : "Werewolves have reached parity with the good guys!";
      console.log(`[Game] Werewolves win! Werewolves: ${aliveWerewolves.length}, Good guys: ${aliveGoodGuys.length}`);
    }
    
    // If there's a winner, set finalState and finish the game
    if (room.winner) {
      room.phase = "finished";
      
      const survivingPlayers = room.players.filter(p => p.status === "alive").length;
      const eliminatedPlayers = room.players.length - survivingPlayers;
      
      // Generate learning report for human player
      const learningReport = await this.generateLearningReport(room);
      
      room.finalState = {
        winner: room.winner,
        reason: winReason,
        totalRounds: Math.max(room.currentRound || 0, 1), // Ensure at least 1
        survivingPlayers,
        eliminatedPlayers,
        learningReport,
      };
      
      console.log(`[Game] Final State set. Winner: ${room.winner}, Rounds: ${room.currentRound}, Survivors: ${survivingPlayers}`);
    }
  }
  
  private async generateLearningReport(room: GameRoom): Promise<LearningReport | undefined> {
    try {
      // Find the human player (not a bot)
      const humanPlayer = room.players.find(p => !p.id.startsWith('bot-'));
      if (!humanPlayer || !humanPlayer.role) {
        console.log('[LearningReport] No human player found - no report needed');
        return undefined; // This is fine - bot-only games don't need reports
      }
      
      // Get all speeches from the human player
      const humanSpeeches = room.speeches.filter(s => s.playerId === humanPlayer.id);
      if (humanSpeeches.length === 0) {
        console.log('[LearningReport] Human player has no speeches - generating minimal report');
        // Generate a minimal fallback report
        return this.generateFallbackReport(humanPlayer, room, "No speeches recorded during the game.");
      }
      
      console.log(`[LearningReport] Generating report for ${humanPlayer.name}, ${humanSpeeches.length} speeches`);
      
      // Extract speech texts
      const speechTexts = humanSpeeches.map(s => s.text);
      
      // Generate comprehensive feedback using AI
      const comprehensiveFeedback = await generateComprehensiveFeedback(
        speechTexts,
        humanPlayer.role,
        humanPlayer.difficulty
      );
      
      // Calculate statistics
      const totalSpeechTime = humanSpeeches.reduce((sum, s) => sum + (s.feedback?.duration || 0), 0);
      const totalWords = humanSpeeches.reduce((sum, s) => sum + (s.feedback?.wordCount || 0), 0);
      
      // Count grammar errors (based on improvements)
      const totalGrammarErrors = humanSpeeches.reduce((sum, s) => {
        return sum + (s.feedback?.improvements.length || 0);
      }, 0);
      
      const grammarErrorRate = totalWords > 0 ? Math.round((totalGrammarErrors / totalWords) * 100) : 0;
      
      // Average scores
      const avgAccuracy = humanSpeeches.reduce((sum, s) => sum + (s.feedback?.scores.accuracy || 0), 0) / humanSpeeches.length;
      const avgFluency = humanSpeeches.reduce((sum, s) => sum + (s.feedback?.scores.fluency || 0), 0) / humanSpeeches.length;
      
      // Extract saved vocabulary (unique words from improvements)
      const savedVocabulary: Array<{word: string, suggestion: string}> = [];
      humanSpeeches.forEach(s => {
        if (s.feedback?.improvements) {
          s.feedback.improvements.forEach(imp => {
            // Extract key vocabulary items from improvements
            const match = imp.match(/['"]([^'"]+)['"]/);
            if (match) {
              savedVocabulary.push({
                word: match[1],
                suggestion: imp
              });
            }
          });
        }
      });
      
      // Get all roles in the game
      const allRoles = Array.from(new Set(room.players.map(p => p.role).filter(Boolean))).join(", ");
      
      // Generate date string
      const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const learningReport: LearningReport = {
        playerId: humanPlayer.id,
        gameId: room.id,
        
        basicInfo: {
          studentName: humanPlayer.name,
          scenario: `Werewolf Game - ${room.currentRound} rounds played`,
          roles: allRoles,
          phases: "Night Phase, Day Phase Discussion, Voting Phase",
          date,
        },
        
        overallEvaluation: comprehensiveFeedback.overallEvaluation,
        
        strengths: comprehensiveFeedback.strengths,
        
        improvements: comprehensiveFeedback.improvements,
        
        phasedImprovementPlan: {
          shortTerm: {
            timeRange: "1-2 weeks",
            goals: "Focus on correcting the most frequent grammar errors identified in this session. Practice using role-specific vocabulary in daily conversations. Review 3-5 key phrases after each game session."
          },
          midTerm: {
            timeRange: "3-4 weeks",
            goals: "Expand vocabulary diversity by learning synonyms for commonly used words. Practice logical argumentation by explaining your reasoning in 2-3 connected sentences. Join more game sessions to build confidence."
          },
          longTerm: {
            timeRange: "1-2 months",
            goals: "Achieve natural, fluent expression during debates without noticeable pauses. Master advanced debate techniques including effective use of transitional phrases. Aim for 90+ overall score in AI feedback."
          }
        },
        
        totalSpeechTime,
        totalGrammarErrors,
        totalWords,
        speeches: humanSpeeches,
        grammarErrorRate,
        vocabularyScore: Math.round(avgAccuracy),
        logicScore: Math.round(avgFluency),
        savedVocabulary: savedVocabulary.slice(0, 10), // Top 10
      };
      
      console.log('[LearningReport] Report generated successfully');
      return learningReport;
      
    } catch (error) {
      console.error('[LearningReport] Error generating report:', error);
      // Return a fallback report instead of undefined
      const humanPlayer = room.players.find(p => !p.id.startsWith('bot-'));
      if (humanPlayer) {
        return this.generateFallbackReport(humanPlayer, room, "Unable to generate AI feedback at this time. Please try again later.");
      }
      return undefined;
    }
  }
  
  private generateFallbackReport(player: Player, room: GameRoom, errorMessage: string): LearningReport {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const allRoles = Array.from(new Set(room.players.map(p => p.role).filter(Boolean))).join(", ");
    
    return {
      playerId: player.id,
      gameId: room.id,
      
      basicInfo: {
        studentName: player.name,
        scenario: `Werewolf Game - ${room.currentRound} rounds played`,
        roles: allRoles,
        phases: "Night Phase, Day Phase Discussion, Voting Phase",
        date,
      },
      
      overallEvaluation: errorMessage,
      
      strengths: {
        scenarioAdaptation: "Participated in the werewolf game scenario.",
        fluencyInteraction: "Engaged with the game mechanics.",
        opinionExpression: "Attempted to communicate during the game.",
      },
      
      improvements: {
        grammarAccuracy: {
          issue: "AI analysis unavailable for this session.",
          suggestion: "Continue practicing English speaking in future games to receive detailed feedback.",
        },
        vocabularyDiversity: {
          issue: "AI analysis unavailable for this session.",
          suggestion: "Try to use varied vocabulary in your next game session.",
        },
        debateCohesion: {
          issue: "AI analysis unavailable for this session.",
          suggestion: "Focus on connecting your arguments logically in future discussions.",
        },
      },
      
      phasedImprovementPlan: {
        shortTerm: {
          timeRange: "1-2 weeks",
          goals: "Play more werewolf games to practice English speaking. Focus on expressing your thoughts clearly during day phase discussions.",
        },
        midTerm: {
          timeRange: "3-4 weeks",
          goals: "Expand your vocabulary by learning game-specific terms. Practice logical argumentation by explaining your reasoning.",
        },
        longTerm: {
          timeRange: "1-2 months",
          goals: "Achieve confident, fluent expression during debates. Master advanced debate techniques and aim for consistent AI feedback scores above 85.",
        },
      },
      
      totalSpeechTime: 0,
      totalGrammarErrors: 0,
      totalWords: 0,
      speeches: [],
      grammarErrorRate: 0,
      vocabularyScore: 0,
      logicScore: 0,
      savedVocabulary: [],
    };
  }

  startVotingPhase(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== "day") return false;

    room.phase = "voting";
    return true;
  }
}

export const gameManager = new GameManager();
