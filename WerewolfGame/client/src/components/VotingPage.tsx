import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Player } from "@shared/schema";
import { Vote } from "lucide-react";
import { useState } from "react";

interface VotingPageProps {
  players: Player[];
  currentPlayerId: string;
  voteResults?: Record<string, number>;
  onVote: (targetId: string) => void;
  hasVoted: boolean;
}

export default function VotingPage({ players, currentPlayerId, voteResults, onVote, hasVoted }: VotingPageProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const alivePlayers = players.filter(p => p.status === "alive" && p.id !== currentPlayerId);

  const handleConfirmVote = () => {
    if (selectedTarget) {
      onVote(selectedTarget);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="p-4 border-b">
        <div className="text-center">
          <h1 className="text-lg font-semibold" data-testid="text-voting-title">
            Voting Phase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select the player you suspect is a werewolf
          </p>
        </div>
      </header>

      {/* Vote Results (if voting completed) */}
      {voteResults && Object.keys(voteResults).length > 0 && (
        <div className="p-4 bg-muted/50 border-b">
          <p className="text-sm font-medium text-center" data-testid="text-vote-results">
            Current Votes: {Object.entries(voteResults).map(([playerId, count]) => {
              const player = players.find(p => p.id === playerId);
              return `${player?.name || 'Unknown'} (${count})`;
            }).join(', ')}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Player Votes */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Vote to Eliminate:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {alivePlayers.map((player) => {
                  const isSelected = selectedTarget === player.id;
                  const votes = voteResults?.[player.id] || 0;

                  return (
                    <Button
                      key={player.id}
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => !hasVoted && setSelectedTarget(player.id)}
                      disabled={hasVoted}
                      className="flex flex-col items-center gap-2 h-auto p-3"
                      data-testid={`button-vote-${player.id}`}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {player.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="text-xs font-medium">{player.name}</p>
                        {votes > 0 && (
                          <p className="text-xs opacity-80 mt-1">
                            {votes} vote{votes !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {isSelected && !hasVoted && (
                        <Vote className="w-4 h-4" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          size="lg"
          className="w-full"
          disabled={!selectedTarget || hasVoted}
          onClick={handleConfirmVote}
          data-testid="button-confirm-vote"
        >
          {hasVoted ? 'Vote Submitted' : 'Confirm Vote'}
        </Button>
      </div>
    </div>
  );
}
