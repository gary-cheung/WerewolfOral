import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Player } from "@shared/schema";
import { X, Moon, Skull, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface NightPhasePageProps {
  players: Player[];
  currentPlayerId: string;
  isWerewolf: boolean;
  onSelectTarget: (targetId: string) => void;
}

export default function NightPhasePage({
  players,
  currentPlayerId,
  isWerewolf,
  onSelectTarget
}: NightPhasePageProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [showRoleScreen, setShowRoleScreen] = useState(true);

  const werewolfRoles = ["werewolf", "wolf_king"];
  const alivePlayers = players.filter(p => p.status === "alive" && p.id !== currentPlayerId);
  const werewolfCount = players.filter(p => p.role && werewolfRoles.includes(p.role)).length;
  const goodGuyCount = players.filter(p => p.role && !werewolfRoles.includes(p.role)).length;
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  const handleConfirm = () => {
    if (selectedTarget) {
      onSelectTarget(selectedTarget);
    }
  };

  // ── Role Screen (shown before night actions) ──
  if (showRoleScreen) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="p-4 border-b">
          <div className="flex items-center justify-center gap-2">
            <Moon className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-center" data-testid="text-phase-title">
              Night Phase
            </h1>
          </div>
        </header>

        {/* Role Screen Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              {/* Role indicator */}
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isWerewolf
                    ? 'bg-destructive/20'
                    : 'bg-primary/20'
                }`}>
                  {isWerewolf ? (
                    <Skull className="w-10 h-10 text-destructive" data-testid="icon-role-werewolf" />
                  ) : (
                    <ShieldCheck className="w-10 h-10 text-primary" data-testid="icon-role-goodguy" />
                  )}
                </div>

                {/* Role title */}
                <div>
                  <p className="text-sm text-muted-foreground">Your Role</p>
                  <h2
                    className={`text-2xl font-bold ${
                      isWerewolf ? 'text-destructive' : 'text-primary'
                    }`}
                    data-testid="text-role-name"
                  >
                    {isWerewolf ? "Werewolf" : "Good Guy"}
                  </h2>
                  {currentPlayer?.role && (
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {currentPlayer.role.replace(/_/g, " ")}
                    </p>
                  )}
                </div>

                {/* Numbers */}
                <div className="w-full pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Faction Counts</p>
                  <div className="flex justify-center gap-8">
                    <div className="flex flex-col items-center" data-testid="stat-werewolves">
                      <div className="flex items-center gap-1.5">
                        <Skull className="w-4 h-4 text-destructive" />
                        <span className="text-2xl font-bold text-destructive">{werewolfCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Werewolves</p>
                    </div>
                    <div className="flex flex-col items-center" data-testid="stat-goodguys">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-2xl font-bold text-primary">{goodGuyCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Good Guys</p>
                    </div>
                  </div>
                </div>

                {/* Win Rules */}
                <div className="w-full pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Win Conditions</p>
                  <div className="space-y-2 text-left">
                    <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10">
                      <Skull className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-destructive">Werewolves win</span> when they equal or outnumber all surviving good guys (including special roles).
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-md bg-primary/10">
                      <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-primary">Good Guys win</span> when all werewolves have been eliminated from the game.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Continue button */}
                <Button
                  size="lg"
                  onClick={() => setShowRoleScreen(false)}
                  className="w-full"
                  data-testid="button-continue-to-night"
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Continue to Night Actions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty footer for consistent layout */}
        <footer className="p-4 border-t opacity-0 pointer-events-none">
          <div className="h-10" />
        </footer>
      </div>
    );
  }

  // ── Night Action Screen (existing logic) ──
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="p-4 border-b">
        <h1 className="text-lg font-semibold text-center" data-testid="text-phase-title">
          Night Phase
        </h1>
        {isWerewolf && (
          <p className="text-sm text-center text-muted-foreground mt-1">
            Select your target to eliminate
          </p>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isWerewolf ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {alivePlayers.map((player) => {
                    const isSelected = selectedTarget === player.id;
                    return (
                      <button
                        key={player.id}
                        onClick={() => setSelectedTarget(player.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover-elevate ${
                          isSelected
                            ? 'border-destructive bg-destructive/20'
                            : 'border-border'
                        }`}
                        data-testid={`button-target-${player.id}`}
                      >
                        <Avatar className="w-12 h-12 grayscale">
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {player.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium">{player.name}</p>
                        {isSelected && (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium" data-testid="text-waiting-message">
                Night has fallen...
              </p>
              <p className="text-sm text-muted-foreground">
                Waiting for werewolves to take action
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {isWerewolf && (
        <div className="p-4 border-t">
          <Button
            size="lg"
            variant="destructive"
            className="w-full"
            disabled={!selectedTarget}
            onClick={handleConfirm}
            data-testid="button-confirm-kill"
          >
            <X className="w-4 h-4 mr-2" />
            Confirm Elimination
          </Button>
        </div>
      )}
    </div>
  );
}
