import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Skull, Target, FileText } from "lucide-react";
import type { Player, FinalGameState } from "@shared/schema";
import { roleInfoMap } from "@shared/schema";

interface GameResultPageProps {
  players: Player[];
  finalState: FinalGameState;
  onReturnToLobby: () => void;
  onViewReport?: (report: FinalGameState['learningReport']) => void;
}

export default function GameResultPage({ players, finalState, onReturnToLobby, onViewReport }: GameResultPageProps) {
  const isVillagersWin = finalState.winner === "villagers";
  // Categorize players by team
  const werewolfTeam = players.filter(p => 
    p.role === "werewolf" || p.role === "wolf_king"
  );
  
  const villagerTeam = players.filter(p => 
    p.role === "villager" || 
    p.role === "prophet" || 
    p.role === "witch" || 
    p.role === "hunter" || 
    p.role === "guard" || 
    p.role === "idiot"
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Victory Banner */}
      <header className="p-6 border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Trophy className={`w-16 h-16 ${isVillagersWin ? 'text-blue-500' : 'text-red-500'}`} />
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-game-result">
            {isVillagersWin ? "🎉 Good Guys Win!" : "🐺 Werewolves Win!"}
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-win-reason">
            {finalState.reason}
          </p>
          
          {/* Game Stats */}
          <div className="flex justify-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm">
                <strong>{finalState.totalRounds}</strong> Rounds
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-sm">
                <strong>{finalState.survivingPlayers}</strong> Survived
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-red-500" />
              <span className="text-sm">
                <strong>{finalState.eliminatedPlayers}</strong> Eliminated
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content - Player Roles Revealed */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Werewolf Team */}
          <Card className={werewolfTeam.length > 0 && !isVillagersWin ? "border-red-500/50 bg-red-500/5" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-red-500">🐺</span>
                Werewolf Team
                {!isVillagersWin && <Badge variant="default" className="ml-2">Winners</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {werewolfTeam.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                      player.status === "alive"
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                        : "bg-muted/50 border-border opacity-60"
                    }`}
                    data-testid={`player-result-${player.id}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={player.status === "alive" ? "bg-green-500 text-white" : ""}>
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{player.name}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs h-5">
                          {player.role ? roleInfoMap[player.role]?.name : "Unknown"}
                        </Badge>
                        {player.status === "dead" && (
                          <Badge variant="destructive" className="text-xs h-5">Dead</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Villager Team */}
          <Card className={villagerTeam.length > 0 && isVillagersWin ? "border-blue-500/50 bg-blue-500/5" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-500">👥</span>
                Good Guys Team
                {isVillagersWin && <Badge variant="default" className="ml-2">Winners</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {villagerTeam.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                      player.status === "alive"
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                        : "bg-muted/50 border-border opacity-60"
                    }`}
                    data-testid={`player-result-${player.id}`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={player.status === "alive" ? "bg-blue-500 text-white" : ""}>
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{player.name}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs h-5">
                          {player.role ? roleInfoMap[player.role]?.name : "Unknown"}
                        </Badge>
                        {player.status === "dead" && (
                          <Badge variant="destructive" className="text-xs h-5">Dead</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            {finalState.learningReport && (
              <Button
                size="lg"
                variant="default"
                onClick={() => onViewReport?.(finalState.learningReport)}
                data-testid="button-view-report"
                className="gap-2"
              >
                <FileText className="w-5 h-5" />
                View Learning Report
              </Button>
            )}
            <Button
              size="lg"
              variant={finalState.learningReport ? "outline" : "default"}
              onClick={onReturnToLobby}
              data-testid="button-return-lobby"
              className="gap-2"
            >
              <Users className="w-5 h-5" />
              Return to Lobby
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
