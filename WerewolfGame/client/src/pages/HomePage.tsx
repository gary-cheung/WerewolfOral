import { useState, useEffect, useRef, useCallback } from "react";
import { DifficultyLevel, GameRole, LearningReport, Player, SpeechFeedback, GameRoom, WSMessage, FinalGameState } from "@shared/schema";
import LoadingPage from "@/components/LoadingPage";
import LoginPage from "@/components/LoginPage";
import DifficultySelectionPage from "@/components/DifficultySelectionPage";
import MatchingPage from "@/components/MatchingPage";
import GameRoomPage from "@/components/GameRoomPage";
import NightPhasePage from "@/components/NightPhasePage";
import DayPhasePage from "@/components/DayPhasePage";
import VotingPage from "@/components/VotingPage";
import GameResultDialog from "@/components/GameResultDialog";
import GameResultPage from "@/components/GameResultPage";
import LearningReportPage from "@/components/LearningReportPage";
import { useToast } from "@/hooks/use-toast";
import { speechSynthesizer } from "@/lib/speech-synthesis";
import { wsClient } from "@/lib/websocket";

type GameState = 
  | "loading" 
  | "login" 
  | "difficulty" 
  | "matching" 
  | "room" 
  | "night" 
  | "day" 
  | "voting" 
  | "tie-break"
  | "tie-break-voting"
  | "result" 
  | "report";

interface HomePageProps {
  onNavigateToLearning?: () => void;
  onNavigateToReview?: () => void;
  onNavigateToRules?: () => void;
  onGameModeChange?: (inGame: boolean) => void;
}

export default function HomePage({ onNavigateToLearning, onNavigateToReview, onNavigateToRules, onGameModeChange }: HomePageProps = {}) {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>("loading");
  const [playerId] = useState(`player-${Math.random().toString(36).substring(7)}`);
  const [playerName, setPlayerName] = useState(`Player ${Math.floor(Math.random() * 1000)}`);
  const [userId, setUserId] = useState<number | undefined>();
  const [roomCode, setRoomCode] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("basic");
  const [isRoomOwner, setIsRoomOwner] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | undefined>();
  const [speeches, setSpeeches] = useState<Array<{ playerId: string; text: string }>>([]);
  const [aiFeedback, setAiFeedback] = useState<SpeechFeedback | undefined>();
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [winner, setWinner] = useState<"villagers" | "werewolves" | undefined>();
  const [finalState, setFinalState] = useState<FinalGameState | undefined>();
  const [learningReport, setLearningReport] = useState<LearningReport | undefined>();
  const [gameRoomId, setGameRoomId] = useState<string | undefined>();

  // Mute TTS voice announcements (game phase / winner calls)
  useEffect(() => {
    speechSynthesizer.setMuted(true);
  }, []);

  // Notify parent (App) when in game mode for mobile nav hiding
  useEffect(() => {
    const inGame = ["room", "night", "day", "voting", "tie-break", "tie-break-voting", "result", "report"].includes(gameState);
    onGameModeChange?.(inGame);
  }, [gameState, onGameModeChange]);

  // Get current player from players array
  const currentPlayer = players.find(p => p.id === playerId) || {
    id: playerId,
    name: playerName,
    role: "villager" as GameRole, // Default role, will be assigned later
    difficulty,
    status: "alive" as const,
    isReady: false,
    hasSpoken: false,
  };

  // Speech stagger queue — display messages one at a time with 1s delay
  const speechQueueRef = useRef<Array<{ playerId: string; text: string }>>([]);
  const processingRef = useRef(false);
  const speechCountRef = useRef(0);
  const pausedRef = useRef(false); // Pause while AI feedback is shown

  const processSpeechQueue = useCallback(() => {
    if (processingRef.current || speechQueueRef.current.length === 0 || pausedRef.current) return;
    processingRef.current = true;
    const next = speechQueueRef.current.shift()!;
    speechCountRef.current++;
    setSpeeches(prev => [...prev, next]);
    setTimeout(() => {
      processingRef.current = false;
      processSpeechQueue();
    }, 1000);
  }, []);

  // WebSocket message handler
  useEffect(() => {
    const cleanup = wsClient.onMessage((message: WSMessage) => {
      console.log("[WebSocket] Received message:", message.type);
      
      switch (message.type) {
        case "game_update": {
          const room = message.payload as GameRoom & { aiFeedback?: SpeechFeedback };
          console.log("[WebSocket] Game update:", room);
          
          // Update players list
          setPlayers(room.players || []);
          setGameRoomId(room.id);

          // Sync difficulty from host (first player)
          if (room.players && room.players.length > 0) {
            setDifficulty(room.players[0].difficulty);
          }
          
          // Update AI feedback if available (sent from server after speech analysis)
          if (room.aiFeedback) {
            console.log("[AI Feedback] Received feedback:", room.aiFeedback);
            setAiFeedback(room.aiFeedback);
          }
          setAiFeedbackLoading(false);
          
          // Update game phase
          if (room.phase === "night") {
            // Reset speech queue for new round
            speechQueueRef.current = [];
            speechCountRef.current = 0;
            setSpeeches([]);
            setGameState("night");
            speechSynthesizer.announcePhaseChange("night");
          } else if (room.phase === "day") {
            setGameState("day");
            if (room.currentSpeaker) {
              setCurrentSpeaker(room.currentSpeaker);
            }
            speechSynthesizer.announcePhaseChange("day");
          } else if (room.phase === "voting") {
            setGameState("voting");
            speechSynthesizer.announcePhaseChange("voting");
          } else if (room.phase === "finished") {
            // Game finished - show result
            setGameState("result");
            if (room.winner) {
              setWinner(room.winner);
            }
            if (room.finalState) {
              setFinalState(room.finalState);
            }
            toast({
              title: "Game Finished!",
              description: `${room.winner === "villagers" ? "Good Guys" : "Werewolves"} win!`,
              duration: 3000,
            });
          } else if (room.phase === "waiting") {
            // Successfully joined room - show room lobby
            if (gameState === "matching") {
              setGameState("room");
              toast({
                title: "Joined Room!",
                description: `${room.players.length} player(s) in room`,
                duration: 2000,
              });
            } else if (gameState !== "room") {
              setGameState("room");
            }
          }
          
          // Queue new speeches one at a time with 1s delay
          if (room.speeches) {
            const allSpeeches = room.speeches.map(s => ({ playerId: s.playerId, text: s.text }));
            // Only queue speeches we haven't dispatched yet (use ref to avoid stale closure)
            const newSpeeches = allSpeeches.slice(speechCountRef.current);
            if (newSpeeches.length > 0) {
              speechQueueRef.current.push(...newSpeeches);
              processSpeechQueue();
            }
          }
          
          // Update votes if available
          if (room.votes) {
            setVotes(room.votes);
          }
          
          break;
        }
        
        case "player_joined": {
          const { player, roomId } = message.payload as { player: Player; roomId: string };
          console.log("[WebSocket] Player joined:", player.name);
          
          toast({
            title: "Player Joined",
            description: `${player.name} has joined the room`,
            duration: 2000,
          });
          
          break;
        }
        
        case "player_left": {
          const { playerId: leftPlayerId } = message.payload as { playerId: string };
          console.log("[WebSocket] Player left:", leftPlayerId);
          
          const leftPlayer = players.find(p => p.id === leftPlayerId);
          if (leftPlayer) {
            toast({
              title: "Player Left",
              description: `${leftPlayer.name} has left the room`,
              duration: 2000,
            });
          }
          
          break;
        }
        
        case "error": {
          const { message: errorMessage } = message.payload as { message: string };
          console.error("[WebSocket] Error:", errorMessage);
          
          toast({
            title: "Join Failed",
            description: errorMessage,
            variant: "destructive",
          });
          
          // Reset to main menu on error
          if (gameState === "matching") {
            setTimeout(() => {
              setGameState("login");
            }, 2000);
          }
          
          break;
        }
      }
    });
    
    return cleanup;
  }, [players, gameState, toast]);

  // Connect to WebSocket when entering matching or room (for creator)
  useEffect(() => {
    const connectAndJoin = async () => {
      // Trigger for matching (joiners) OR room with roomCode but no players yet (creators)
      const shouldConnect = (gameState === "matching" && roomCode) ||
        (gameState === "room" && roomCode && players.length === 0);
      if (shouldConnect) {
        try {
          console.log("[WebSocket] Connecting to server...");
          await wsClient.connect();

          console.log("[WebSocket] Sending join_room message with roomCode:", roomCode);
          wsClient.send({
            type: "join_room",
            payload: {
              playerId,
              playerName,
              difficulty,
              role: "villager" as GameRole, // Will be reassigned by server
              roomCode, // Include room code so server knows which room to join
            },
          });
          
          // Note: State transition to "room" will happen automatically
          // when we receive the "game_update" message from server
          console.log("[WebSocket] Waiting for server confirmation...");
        } catch (error) {
          console.error("[WebSocket] Connection failed:", error);
          toast({
            title: "Connection Failed",
            description: "Could not connect to game server. Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    
    connectAndJoin();
    
    return () => {
      // Cleanup WebSocket on unmount
      if (gameState === "result" || gameState === "report") {
        wsClient.disconnect();
      }
    };
  }, [gameState, roomCode, difficulty]);

  const handleLoadingComplete = () => {
    setGameState("login");
  };

  const handleLoginSuccess = (loggedInUserId: number, username: string, code?: string, isOwner?: boolean) => {
    setUserId(loggedInUserId);
    setPlayerName(username);
    setIsRoomOwner(isOwner ?? false);
    if (code) {
      setRoomCode(code);
      if (isOwner) {
        toast({
          title: "Room ready!",
          description: `Room code: ${code}. Share this code with friends to join.`,
        });
      }
    }
    // Owner picks difficulty first, joiner skips straight to matching
    setGameState(isOwner ? "difficulty" : "matching");
  };

  const handleDifficultySelect = (selected: DifficultyLevel) => {
    setDifficulty(selected);
    // Room creator goes directly to room, joiners go through matching
    setGameState(isRoomOwner ? "room" : "matching");
  };

  const handleReady = () => {
    // Mark player as ready locally
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, isReady: true } : p
    );
    setPlayers(updatedPlayers);

    // Announce game rules
    speechSynthesizer.announceGameRules();

    // Send ready status to server via WebSocket
    console.log("[WebSocket] Sending player_ready message");
    wsClient.send({
      type: "player_ready",
      payload: { playerId },
    });
    
    toast({
      title: "Ready!",
      description: "Waiting for other players...",
      duration: 2000,
    });
  };
  
  // Helper function to assign roles randomly based on player count
  const assignRoles = (playersList: Player[]): Player[] => {
    const count = playersList.length;
    const shuffled = [...playersList].sort(() => Math.random() - 0.5);
    let idx = 0;
    
    // 9 players: 3 werewolves + 3 gods (prophet, witch, hunter) + 3 villagers
    if (count === 9) {
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "werewolf";
      shuffled[idx++].role = "prophet";
      shuffled[idx++].role = "witch";
      shuffled[idx++].role = "hunter";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
      shuffled[idx++].role = "villager";
    } else if (count === 10) {
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
    } else if (count === 11) {
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
    } else if (count >= 12) {
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
    }
    
    return shuffled;
  };
  
  // Helper function to get role display name
  const getRoleDisplayName = (role: GameRole): string => {
    const roleNames: Record<GameRole, string> = {
      werewolf: "Werewolf 🐺",
      wolf_king: "Wolf King 👑",
      prophet: "Seer 🔮",
      witch: "Witch 🧙",
      hunter: "Hunter 🏹",
      guard: "Guard 🛡️",
      idiot: "Idiot 🤪",
      villager: "Villager 👤",
    };
    return roleNames[role] || role;
  };
  
  // Execute AI werewolf night actions when player is not a werewolf
  const executeAINightPhase = (currentPlayers: Player[]) => {
    const aliveWerewolves = currentPlayers.filter(p => 
      p.status === "alive" && (p.role === "werewolf" || p.role === "wolf_king")
    );
    
    // Check if any werewolves remain
    if (aliveWerewolves.length === 0) {
      // Villagers win - no werewolves left
      toast({
        title: "Villagers Win!",
        description: "All werewolves have been eliminated",
        duration: 3000,
      });
      setTimeout(() => {
        setWinner("villagers");
        setGameState("result");
        speechSynthesizer.announceWinner("villagers");
      }, 2000);
      return;
    }
    
    // Select a random non-werewolf target for AI werewolves to eliminate
    const aliveNonWerewolves = currentPlayers.filter(p => 
      p.status === "alive" && p.role !== "werewolf" && p.role !== "wolf_king"
    );
    
    if (aliveNonWerewolves.length > 0) {
      const randomTarget = aliveNonWerewolves[Math.floor(Math.random() * aliveNonWerewolves.length)];
      
      // Eliminate the target
      const updatedPlayers = currentPlayers.map(p => 
        p.id === randomTarget.id ? { ...p, status: "dead" as const } : p
      );
      setPlayers(updatedPlayers);
      
      toast({
        title: "Night Phase Complete",
        description: `${randomTarget.name} was eliminated during the night`,
        duration: 3000,
      });
      
      // Check win condition after night elimination
      setTimeout(() => {
        const aliveAfterNight = updatedPlayers.filter(p => p.status === "alive");
        const remainingWerewolves = aliveAfterNight.filter(p => p.role === "werewolf" || p.role === "wolf_king");
        const remainingVillagers = aliveAfterNight.filter(p => p.role !== "werewolf" && p.role !== "wolf_king");
        
        if (remainingWerewolves.length >= remainingVillagers.length) {
          // Werewolves win
          setWinner("werewolves");
          setGameState("result");
          speechSynthesizer.announceWinner("werewolves");
        } else {
          // Continue to day phase - reset hasSpoken for new round
          const resetPlayers = updatedPlayers.map(p => ({ ...p, hasSpoken: false }));
          setPlayers(resetPlayers);
          setSpeeches([]);
          setAiFeedback(undefined);
          
          setGameState("day");
          speechSynthesizer.announcePhaseChange("day");
          setTimeout(() => {
            setCurrentSpeaker(playerId);
          }, 500);
        }
      }, 2000);
    }
  };

  const handleNightAction = (targetId: string) => {
    // Send night action to server via WebSocket
    console.log("[WebSocket] Sending night_action message");
    wsClient.send({
      type: "night_action",
      payload: {
        playerId,
        targetId,
        action: "eliminate",
      },
    });
    
    toast({
      title: "Night Action Submitted",
      description: "Waiting for dawn...",
      duration: 2000,
    });
  };

  // Recursive function to simulate AI players speaking
  const triggerNextAISpeaker = (currentPlayers: Player[]) => {
    // Only trigger next speaker if there are AI players who haven't spoken yet
    const nextSpeaker = currentPlayers.find(p => !p.hasSpoken && p.id !== playerId && p.status === "alive");
    
    if (nextSpeaker) {
      setCurrentSpeaker(nextSpeaker.id);
      
      // AI player auto-speaks after 2 seconds with realistic dialogue
      setTimeout(() => {
        // Generate more realistic player speeches based on game context
        const alivePlayerNames = currentPlayers.filter(p => p.status === "alive" && p.id !== nextSpeaker.id).map(p => p.name);
        const randomTargetName = alivePlayerNames[Math.floor(Math.random() * alivePlayerNames.length)] || "someone";
        
        const aiSpeeches = [
          `I have some concerns about ${randomTargetName}'s behavior. They seemed very nervous when discussing last night's events.`,
          `Based on what I observed, I think we should carefully consider ${randomTargetName}. Their story doesn't quite add up.`,
          `I'm not entirely sure, but ${randomTargetName} has been acting suspiciously. We might want to keep an eye on them.`,
          `From my perspective, ${randomTargetName}'s defense was too aggressive. That's usually a red flag in my experience.`,
          `I noticed ${randomTargetName} was very quick to accuse others without solid evidence. We should discuss this.`,
          `Honestly, I'm finding it hard to trust ${randomTargetName} after their inconsistent statements today.`,
          `I think ${randomTargetName} might be hiding something. Their explanation earlier felt rehearsed to me.`,
          `We need to be strategic here. I suggest we focus on ${randomTargetName} because of their evasive answers.`,
          `In my opinion, ${randomTargetName} has been deflecting too much. We should investigate further.`,
          `I want to point out that ${randomTargetName} seemed unusually quiet until just now. That's concerning.`
        ];
        
        const randomSpeech = aiSpeeches[Math.floor(Math.random() * aiSpeeches.length)];
        setSpeeches(prev => [...prev, { playerId: nextSpeaker.id, text: randomSpeech }]);
        
        const newPlayers = currentPlayers.map(p =>
          p.id === nextSpeaker.id ? { ...p, hasSpoken: true } : p
        );
        setPlayers(newPlayers);
        
        // Continue with next AI player after a short delay
        setTimeout(() => {
          triggerNextAISpeaker(newPlayers);
        }, 1500);
      }, 2000);
    } else {
      // All players have spoken, clear current speaker
      setCurrentSpeaker(undefined);
    }
  };

  const handleSpeechSubmit = (speakerId: string, text: string) => {
    // Send speech to server via WebSocket — AI feedback comes back via game_update
    console.log("[WebSocket] Sending speech_submit message");
    setAiFeedbackLoading(true);
    setAiFeedback(undefined); // Clear previous feedback while waiting

    wsClient.send({
      type: "speech_submit",
      payload: {
        playerId: speakerId,
        text,
      },
    });
  };

  const handleProceedToVoting = () => {
    setGameState("voting");
    speechSynthesizer.announcePhaseChange("voting");
  };


  const handleVote = (targetId: string) => {
    // Update local state
    setVotes(prev => ({ ...prev, [playerId]: targetId }));
    
    // Send vote to server via WebSocket
    console.log("[WebSocket] Sending vote_submit message");
    wsClient.send({
      type: "vote_submit",
      payload: {
        playerId,
        targetId,
      },
    });
    
    toast({
      title: "Vote Submitted",
      description: "Waiting for other players to vote...",
      duration: 2000,
    });
  };

  const handleViewReport = (report: LearningReport) => {
    setLearningReport(report);
    setGameState("report");
  };

  const handleGeneratePDF = () => {
    toast({
      title: "PDF Generated",
      description: "Your learning report has been downloaded",
    });
  };

  const handleGenerateShareLink = () => {
    const link = `${window.location.origin}/report/${learningReport?.gameId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  const handleBackToHome = () => {
    setGameState("login");
    setPlayers([]);
    setSpeeches([]);
    setVotes({});
    setWinner(undefined);
    setLearningReport(undefined);
  };

  // Render appropriate component based on game state
  switch (gameState) {
    case "loading":
      return <LoadingPage onComplete={handleLoadingComplete} />;
    
    case "login":
      return (
        <LoginPage
          onSuccess={handleLoginSuccess}
          onNavigateToLearning={onNavigateToLearning}
          onNavigateToReview={onNavigateToReview}
          onNavigateToRules={onNavigateToRules}
        />
      );
    
    case "difficulty":
      return <DifficultySelectionPage onSelect={handleDifficultySelect} roomCode={roomCode} isRoomOwner={isRoomOwner} />;
    
    case "matching":
      return <MatchingPage currentPlayers={players.length} maxPlayers={4} />;
    
    case "room":
      return (
        <GameRoomPage
          players={players}
          currentPlayerId={playerId}
          onReady={handleReady}
          roomCode={roomCode}
          difficulty={difficulty}
        />
      );
    
    case "night":
      return (
        <NightPhasePage
          players={players}
          currentPlayerId={playerId}
          isWerewolf={currentPlayer.role === "werewolf" || currentPlayer.role === "wolf_king"}
          onSelectTarget={handleNightAction}
        />
      );
    
    case "day":
      return (
        <DayPhasePage
          players={players}
          currentPlayerId={playerId}
          currentSpeaker={currentSpeaker}
          speeches={speeches}
          onSpeechSubmit={handleSpeechSubmit}
          aiFeedback={aiFeedback}
          aiFeedbackLoading={aiFeedbackLoading}
          canProceedToVoting={players.filter(p => p.status === "alive").every(p => p.hasSpoken)}
          onProceedToVoting={handleProceedToVoting}
          onFeedbackVisibilityChange={(visible) => { pausedRef.current = visible; }}
        />
      );
    
    case "voting":
    case "tie-break-voting":
      return (
        <VotingPage
          players={players}
          currentPlayerId={playerId}
          voteResults={Object.values(votes).reduce((acc, targetId) => {
            acc[targetId] = (acc[targetId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)}
          onVote={handleVote}
          hasVoted={!!votes[playerId]}
        />
      );
    
    case "result":
      return finalState ? (
        <GameResultPage
          players={players}
          finalState={finalState}
          onReturnToLobby={handleBackToHome}
          onViewReport={handleViewReport}
        />
      ) : null;
    
    case "report":
      return learningReport ? (
        <LearningReportPage
          report={learningReport}
          onGeneratePDF={handleGeneratePDF}
          onGenerateShareLink={handleGenerateShareLink}
          onBackToHome={handleBackToHome}
          onNavigateToReview={onNavigateToReview}
        />
      ) : null;
    
    default:
      return <LoadingPage onComplete={handleLoadingComplete} />;
  }
}
