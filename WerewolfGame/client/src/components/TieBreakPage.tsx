import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Player, SpeechFeedback } from "@shared/schema";
import { AlertCircle, Send } from "lucide-react";
import { useState } from "react";

interface TieBreakPageProps {
  players: Player[];
  tiedPlayerIds: string[];
  currentPlayerId: string;
  currentSpeaker?: string;
  speeches: Array<{ playerId: string; text: string }>;
  onSpeechSubmit: (playerId: string, text: string) => void;
  aiFeedback?: SpeechFeedback;
  onProceedToVoting: () => void;
}

export default function TieBreakPage({ 
  players, 
  tiedPlayerIds, 
  currentPlayerId,
  currentSpeaker,
  speeches,
  onSpeechSubmit,
  aiFeedback,
  onProceedToVoting 
}: TieBreakPageProps) {
  const [speechText, setSpeechText] = useState("");
  const tiedPlayers = players.filter(p => tiedPlayerIds.includes(p.id));
  const allTiedPlayersSpoken = tiedPlayers.every(p => p.hasSpoken);
  const currentPlayerIsTied = tiedPlayerIds.includes(currentPlayerId);
  const isCurrentPlayerTurn = currentSpeaker === currentPlayerId;
  const currentPlayerHasSpoken = players.find(p => p.id === currentPlayerId)?.hasSpoken || false;
  
  const handleSubmitSpeech = () => {
    if (speechText.trim()) {
      onSpeechSubmit(currentPlayerId, speechText);
      setSpeechText("");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 border-b">
        <div className="flex items-center gap-3 justify-center">
          <AlertCircle className="w-6 h-6 text-orange-500" />
          <div className="text-center">
            <h1 className="text-lg font-semibold" data-testid="text-tie-break-title">
              Tie-Break Round
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tied players defend themselves before revote
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Tied Players Display */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-3">Tied Players ({tiedPlayers.length}):</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tiedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-orange-500 bg-orange-500/10"
                    data-testid={`card-tied-player-${player.id}`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-xs font-medium">{player.name}</p>
                      {player.hasSpoken && (
                        <p className="text-xs text-green-500 mt-1">✓ Spoken</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Speech Feed */}
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold mb-3">Defense Speeches:</h2>
              {speeches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Waiting for tied players to speak...
                </p>
              ) : (
                <div className="space-y-3">
                  {speeches.map((speech, index) => {
                    const speaker = players.find(p => p.id === speech.playerId);
                    return (
                      <div key={index} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-semibold text-orange-500">
                          {speaker?.name}:
                        </p>
                        <p className="text-sm mt-1">{speech.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Speech Input for Tied Players */}
          {currentPlayerIsTied && !currentPlayerHasSpoken && isCurrentPlayerTurn && (
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold mb-3 text-orange-500">Your Turn to Defend:</h2>
                <Textarea
                  placeholder="Defend yourself and explain why you shouldn't be eliminated..."
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  className="mb-3 min-h-32"
                  data-testid="textarea-tie-break-speech"
                />
                <Button 
                  onClick={handleSubmitSpeech}
                  disabled={!speechText.trim()}
                  className="w-full"
                  data-testid="button-submit-tie-break-speech"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Defense
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Feedback */}
          {aiFeedback && isCurrentPlayerTurn && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">AI Feedback</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Overall: </span>
                    <span className="font-semibold">{aiFeedback.scores.overall}/100</span>
                  </div>
                  {aiFeedback.improvements && aiFeedback.improvements.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Suggestions: </span>
                      <ul className="list-disc list-inside text-xs mt-1">
                        {aiFeedback.improvements.slice(0, 3).map((improvement: string, i: number) => (
                          <li key={i}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Message */}
          {currentPlayerIsTied && !currentPlayerHasSpoken && !isCurrentPlayerTurn && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-orange-500">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-semibold">
                    You are tied! Waiting for your turn to defend yourself...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          onClick={onProceedToVoting}
          disabled={!allTiedPlayersSpoken}
          className="w-full"
          size="lg"
          data-testid="button-proceed-to-revote"
        >
          {allTiedPlayersSpoken 
            ? "Proceed to Revote" 
            : `Waiting for tied players to speak (${tiedPlayers.filter(p => p.hasSpoken).length}/${tiedPlayers.length})`
          }
        </Button>
      </div>
    </div>
  );
}
