import { Button } from "@/components/ui/button";
import logoImage from "@assets/icon_AI.png";

interface MatchingPageProps {
  currentPlayers: number;
  maxPlayers?: number;
  onCancel?: () => void;
}

export default function MatchingPage({ onCancel }: MatchingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src={logoImage}
            alt="Werewolf Logo"
            className="w-28 h-28 object-contain"
            data-testid="img-game-logo"
          />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-title">
            Werewolf English Learning
          </h1>
          <p className="text-sm text-muted-foreground">
            Practice English through immersive social gaming
          </p>
        </div>

        {/* Finding status — no count, it's always wrong before joining */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="text-matching-status">
            Finding Players
          </h2>

          {/* Spinning Logo */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <img
                src={logoImage}
                alt="Werewolf Logo"
                className="w-20 h-20 object-contain animate-spin"
                style={{ animationDuration: '1s' }}
                data-testid="img-loading-logo"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground" data-testid="text-waiting">
            Finding other players...
          </p>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-matching"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
