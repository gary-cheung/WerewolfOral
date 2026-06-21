import { useEffect } from "react";
import { queryClient, recreateGuestSession } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import HomePage from "@/pages/HomePage";
import LearningPage from "@/pages/LearningPage";
import ReviewPage from "@/pages/ReviewPage";
import RulesPage from "@/pages/RulesPage";

async function ensureGuestSession() {
  const storedUser = localStorage.getItem('guestUser');

  // If we already have a guest user in localStorage, assume session exists
  // The 401 auto-recovery in queryClient will handle session expiration
  if (storedUser) {
    return JSON.parse(storedUser);
  }

  // No stored user - create new guest session
  await recreateGuestSession();
}

type AppPage = "game" | "learning" | "review" | "rules";

function Router() {
  const [currentPage, setCurrentPage] = useState<AppPage>("game");
  const [isInGame, setIsInGame] = useState(false);

  const navigateTo = (page: AppPage) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Tab-based navigation — shows on all pages (hidden on mobile during gameplay)
  const isActive = (page: AppPage) => currentPage === page;

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar — hidden on mobile during gameplay */}
      <div className={`sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border ${isInGame ? 'hidden md:block' : ''}`}>
        <div className="max-w-4xl mx-auto flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
          <button
            onClick={() => navigateTo("game")}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-md transition-colors ${
              isActive("game")
                ? "bg-primary/20 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            🎮 Play Game
          </button>
          <button
            onClick={() => navigateTo("learning")}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-md transition-colors ${
              isActive("learning")
                ? "bg-primary/20 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            📚 Learn
          </button>
          <button
            onClick={() => navigateTo("review")}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-md transition-colors ${
              isActive("review")
                ? "bg-primary/20 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            ✨ Review
          </button>
          <button
            onClick={() => navigateTo("rules")}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-md transition-colors ${
              isActive("rules")
                ? "bg-primary/20 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            ❓<span className="hidden md:inline"> Rules</span>
          </button>
        </div>
      </div>

      {/* Page content */}
      {currentPage === "game" && (
        <HomePage
          onNavigateToLearning={() => navigateTo("learning")}
          onNavigateToReview={() => navigateTo("review")}
          onNavigateToRules={() => navigateTo("rules")}
          onGameModeChange={setIsInGame}
        />
      )}
      {currentPage === "learning" && (
        <LearningPage onNavigateHome={() => navigateTo("game")} />
      )}
      {currentPage === "review" && (
        <ReviewPage onNavigateHome={() => navigateTo("game")} />
      )}
      {currentPage === "rules" && (
        <RulesPage onNavigateHome={() => navigateTo("game")} />
      )}
    </div>
  );
}

function App() {
  // Enable dark mode by default for werewolf theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Auto-create guest session on app load
  useEffect(() => {
    ensureGuestSession().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
