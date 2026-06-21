import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Copy, Check } from "lucide-react";
import { DifficultyLevel } from "@shared/schema";
import { useState } from "react";

interface DifficultySelectionPageProps {
  onSelect: (difficulty: DifficultyLevel) => void;
  roomCode?: string;
  isRoomOwner?: boolean;
}

export default function DifficultySelectionPage({ onSelect, roomCode, isRoomOwner }: DifficultySelectionPageProps) {
  const [copied, setCopied] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const difficulties: Array<{
    value: DifficultyLevel;
    label: string;
    variant: "default" | "secondary" | "outline";
    description: string;
  }> = [
    {
      value: "basic",
      label: "Basic",
      variant: "secondary",
      description: "Simple sentences, reduced recognition threshold"
    },
    {
      value: "intermediate",
      label: "Intermediate",
      variant: "default",
      description: "Complex expressions, standard recognition"
    },
    {
      value: "advanced",
      label: "Advanced",
      variant: "outline",
      description: "Logical debate, strict recognition"
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-2 md:py-8">
      <div className="w-full max-w-2xl space-y-3 md:space-y-6">
        {/* Title */}
        <div className="text-center space-y-1 md:space-y-2">
          <h1 className="text-xl md:text-2xl font-bold text-foreground" data-testid="text-page-title">
            {isRoomOwner ? 'Select English Level' : 'Waiting for Host'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isRoomOwner ? 'Choose the English difficulty mode' : 'The room host will select the difficulty'}
          </p>
        </div>

        {/* Room Code Display */}
        {roomCode && (
          <div className="flex items-center justify-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/30 rounded-lg border">
            <span className="text-xs md:text-sm text-muted-foreground">Room Code:</span>
            <span className="text-base md:text-lg font-mono font-bold tracking-wider text-foreground" data-testid="text-room-code">
              {roomCode}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyCode}
              className="h-7 md:h-8 px-1.5 md:px-2"
              data-testid="button-copy-room-code"
            >
              {copied ? <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" /> : <Copy className="h-3.5 w-3.5 md:h-4 md:w-4" />}
            </Button>
          </div>
        )}

        {/* Difficulty Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          {difficulties.map((diff) => (
            <Button
              key={diff.value}
              size="lg"
              variant={diff.variant}
              className="min-w-[80px] md:min-w-[120px] h-10 md:h-auto"
              onClick={() => isRoomOwner !== false && onSelect(diff.value)}
              disabled={isRoomOwner === false}
              data-testid={`button-difficulty-${diff.value}`}
            >
              <div className="flex flex-col items-center">
                <span className="font-semibold text-sm md:text-base">{diff.label}</span>
              </div>
            </Button>
          ))}
        </div>

        {/* Mode Description */}
        <div className="pt-1 md:pt-4">
          <button
            onClick={() => setShowDescription(!showDescription)}
            className="w-full flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-description"
          >
            <span>Mode Description</span>
            <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform ${showDescription ? 'rotate-180' : ''}`} />
          </button>

          {showDescription && (
            <Card className="mt-2 md:mt-4">
              <CardContent className="pt-4 md:pt-6 space-y-2 md:space-y-3">
                {difficulties.map((diff) => (
                  <div key={diff.value} className="space-y-0.5 md:space-y-1">
                    <p className="font-medium text-xs md:text-sm">{diff.label}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{diff.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
