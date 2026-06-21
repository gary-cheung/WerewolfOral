import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, HelpCircle, Zap, Copy } from "lucide-react";
import { Player, DifficultyLevel } from "@shared/schema";
import { useState } from "react";
import judgeImage from "@assets/generated_images/AI_judge_character_illustration_fa068d49.png";

interface GameRoomPageProps {
  players: Player[];
  currentPlayerId: string;
  onReady: () => void;
  onStartGame?: () => void;
  roomCode?: string;
  difficulty?: DifficultyLevel;
}

export default function GameRoomPage({ players, currentPlayerId, onReady, onStartGame, roomCode, difficulty }: GameRoomPageProps) {
  const [showRules, setShowRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerReady = currentPlayer?.isReady || false;
  // Minimum 9 players required, all real players must be ready
  const allPlayersReady = players.length >= 4 && players.every(p => p.isReady);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header — compact on mobile */}
      <header className="flex items-center justify-between p-2 md:p-4 border-b flex-wrap gap-2">
        <div className="flex items-center gap-1.5 md:gap-3 flex-wrap">
          <h1 className="text-sm md:text-lg font-semibold" data-testid="text-room-title">Game Room</h1>
          {roomCode && (
            <div className="flex items-center gap-0.5 md:gap-1">
              <Badge variant="outline" className="font-mono text-xs md:text-sm tracking-wider px-1.5 md:px-2" data-testid="badge-room-code">
                {roomCode}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 md:h-7 md:w-7"
                onClick={handleCopyCode}
                data-testid="button-copy-room-code"
              >
                {copied ? <Check className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" /> : <Copy className="h-3 w-3 md:h-3.5 md:w-3.5" />}
              </Button>
            </div>
          )}
          <Badge variant="secondary" className="gap-0.5 md:gap-1 text-[10px] md:text-xs px-1.5 md:px-2" data-testid="badge-demo-mode">
            <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span className="hidden sm:inline">Demo</span>
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRules(true)}
          className="text-xs md:text-sm h-7 md:h-auto"
          data-testid="button-rules"
        >
          <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
          Rules
        </Button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 md:gap-3 p-2 md:p-3 overflow-hidden">
        {/* Players List — includes Ready button */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardContent className="p-2 md:p-3 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-1.5 md:mb-2">
                <h2 className="text-xs md:text-sm font-medium">Players ({players.length}/4)</h2>
                <span className="text-[10px] md:text-xs text-muted-foreground">Max: 4</span>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2">
                  {Array.from({ length: 4 }).map((_, index) => {
                    const player = players[index];
                    return (
                      <div
                        key={index}
                        className={`flex flex-col items-center gap-0.5 md:gap-1.5 p-1 md:p-2 rounded-lg border ${
                          player ? 'border-border bg-card' : 'border-dashed border-muted bg-muted/20'
                        }`}
                        data-testid={player ? `player-card-${index}` : `empty-slot-${index}`}
                      >
                        <Avatar className="w-7 h-7 md:w-10 md:h-10">
                          <AvatarFallback className="bg-muted text-muted-foreground text-[9px] md:text-xs">
                            {player ? player.name.substring(0, 2).toUpperCase() : '--'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center w-full">
                          <p className="text-[9px] md:text-xs font-medium truncate">
                            {player ? player.name : 'Waiting...'}
                          </p>
                          {player && (
                            <div className="mt-0.5">
                              {player.isReady ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] md:text-xs text-green-600">
                                  <Check className="w-2 h-2 md:w-3 md:h-3" />
                                  Ready
                                </span>
                              ) : (
                                <span className="text-[9px] md:text-xs text-muted-foreground">Not Ready</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {/* Ready Button — in player section */}
              <div className="mt-2 md:mt-3 pt-2 border-t">
                <Button
                  size="lg"
                  className="w-full h-9 md:h-11 text-sm md:text-base"
                  variant={isCurrentPlayerReady ? "secondary" : "default"}
                  onClick={isCurrentPlayerReady ? undefined : onReady}
                  disabled={isCurrentPlayerReady}
                  data-testid="button-ready"
                >
                  {isCurrentPlayerReady ? 'Ready ✓' : 'Ready'}
                </Button>
                {/* Status */}
                <div className="text-center mt-1.5">
                  {allPlayersReady ? (
                    <p className="text-xs md:text-sm font-medium text-green-600">All Ready! Starting in 3s...</p>
                  ) : (
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {players.length > 1 ? 'Waiting for all players to be ready...' : 'Click Ready to start (bots fill to 4)'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules Panel (was AI Judge) — compact */}
        <div className="lg:w-72 shrink-0">
          <Card className="h-full">
            <CardContent className="p-2 md:p-3 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <img
                  src={judgeImage}
                  alt="Rules"
                  className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-full"
                  data-testid="img-ai-judge"
                />
                <h2 className="text-xs md:text-sm font-semibold">Rules</h2>
              </div>
              <div className="flex-1 space-y-1.5 md:space-y-2 text-left">
                <div className="bg-muted/50 rounded-lg p-1.5 md:p-2">
                  <h3 className="text-[10px] md:text-xs font-semibold mb-0.5">How to Play</h3>
                  <p className="text-[9px] md:text-xs text-muted-foreground leading-relaxed">
                    Each player is secretly a <span className="text-red-500 font-semibold">Werewolf</span> or a <span className="text-blue-500 font-semibold">Villager</span>.
                    Werewolves eliminate at night. Day: discuss and vote to find werewolves.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-1.5 md:p-2">
                  <h3 className="text-[10px] md:text-xs font-semibold mb-0.5">How to Win</h3>
                  <p className="text-[9px] md:text-xs text-muted-foreground leading-relaxed">
                    <strong>Villagers win</strong> by eliminating all werewolves.
                    <br />
                    <strong>Werewolves win</strong> when they outnumber villagers.
                  </p>
                </div>
                {difficulty && (
                  <div className="bg-muted/50 rounded-lg p-1.5 md:p-2">
                    <h3 className="text-[10px] md:text-xs font-semibold mb-0.5">English Level</h3>
                    <p className="text-[9px] md:text-xs text-muted-foreground capitalize">{difficulty}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Game Rules</DialogTitle>
            <DialogDescription>How to play Werewolf with English practice</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">How to Play</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>12 Players (Competitive):</strong> Balanced 12-player configuration for competitive gameplay</li>
                  <li><strong>Auto-Fill Bots:</strong> AI bots will join if less than 4 players</li>
                  <li><strong>Practice English:</strong> Speak in English throughout the game</li>
                  <li><strong>Get Feedback:</strong> AI provides real-time grammar corrections</li>
                  <li><strong>Win:</strong> Villagers eliminate all werewolves, or werewolves equal villagers</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Role Configurations by Player Count</h3>
                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <strong>9 Players (Beginner-Friendly):</strong>
                    <p className="ml-4">3 Werewolves + 3 Gods (Seer, Witch, Hunter) + 3 Villagers</p>
                  </div>
                  <div>
                    <strong>10 Players (Balanced):</strong>
                    <p className="ml-4">3 Werewolves + 4 Gods (Seer, Witch, Hunter, Idiot) + 3 Villagers</p>
                  </div>
                  <div>
                    <strong>11 Players (Advanced):</strong>
                    <p className="ml-4">4 Werewolves + 4 Gods (Seer, Witch, Hunter, Guard) + 3 Villagers</p>
                  </div>
                  <div>
                    <strong>12 Players (Competitive):</strong>
                    <p className="ml-4">4 Werewolves (1 Wolf King) + 4 Gods (Seer, Witch, Hunter, Guard) + 4 Villagers</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Game Flow</h3>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Night Phase: Werewolves choose a target to eliminate</li>
                  <li>Day Phase: All players discuss and share opinions in English</li>
                  <li>Voting: Vote to eliminate one suspected werewolf</li>
                  <li>Repeat until one team wins</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-2">English Speaking Requirements</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Express your thoughts clearly in English</li>
                  <li>Use complete sentences when making arguments</li>
                  <li>AI will provide real-time grammar corrections</li>
                  <li>Practice logical reasoning and persuasive language</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
