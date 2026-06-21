import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import logoImage from "@assets/icon_AI.png";

interface LoadingPageProps {
  onComplete: () => void;
}

export default function LoadingPage({ onComplete }: LoadingPageProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds loading
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={logoImage} 
            alt="Werewolf Logo" 
            className="w-32 h-32 object-contain"
            data-testid="img-logo"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-title">
            Werewolf English Learning
          </h1>
          <p className="text-base text-foreground" data-testid="text-subtitle">
            Practice English through immersive social gaming
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <Progress 
            value={progress} 
            className="h-2"
            data-testid="progress-loading"
          />
          <p className="text-sm text-muted-foreground" data-testid="text-progress">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Footer Text */}
        <p className="text-xs text-muted-foreground pt-8" data-testid="text-support">
          Supports mobile & desktop
        </p>
      </div>
    </div>
  );
}
