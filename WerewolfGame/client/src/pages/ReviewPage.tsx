import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Lightbulb, AlertCircle, TrendingUp, Check, X, RefreshCw,
  Sparkles, MessageSquare, BookOpen
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface StudentMistake {
  originalSpeech: string;
  correctedVersion: string;
  mistakeType: "grammar" | "vocabulary" | "expression";
  explanation: string;
}

interface GrammarDrill {
  question: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
  source?: string;
}

interface MistakeReview {
  studentMistakes: StudentMistake[];
  suggestedDrills: GrammarDrill[];
  overallTips: string[];
}

// ── ReviewPage Component ──────────────────────────────────────────────────

interface ReviewPageProps {
  onNavigateHome?: () => void;
}

export default function ReviewPage({ onNavigateHome }: ReviewPageProps) {
  const { toast } = useToast();
  const [review, setReview] = useState<MistakeReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDrill, setCurrentDrill] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const loadReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedUser = localStorage.getItem("guestUser");
      if (!storedUser) {
        setError("You need to play at least one game first. Your game data will appear here for review.");
        setLoading(false);
        return;
      }
      const user = JSON.parse(storedUser);
      const userId = user.id;
      if (!userId) {
        setError("Could not find your user ID. Play a game on the website first.");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/review/mistakes/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setReview(data);
      setCurrentDrill(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } catch (err: any) {
      setError(err.message || "Failed to load review. Try again later.");
      toast({ title: "Error", description: "Could not load your review data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const drill = review?.suggestedDrills?.[currentDrill];

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowExplanation(true);
  };

  const nextDrill = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (review && currentDrill < (review.suggestedDrills?.length || 0) - 1) {
      setCurrentDrill((i) => i + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {onNavigateHome && (
            <Button variant="ghost" size="icon" onClick={onNavigateHome}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Sparkles className="h-6 w-6 text-amber-400" />
          <h1 className="text-xl font-bold">Review Your Game</h1>
          <Badge variant="secondary" className="ml-2 text-xs">Personalized</Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {!review && !loading && (
          <div className="text-center py-16 space-y-4">
            <MessageSquare className="h-16 w-16 mx-auto text-amber-400/50" />
            <h2 className="text-xl font-semibold">Ready to review?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              After you play a Werewolf game, come here to review your English mistakes
              and get personalized practice exercises.
            </p>
            {error && (
              <Card className="max-w-md mx-auto border-amber-500/30">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </p>
                </CardContent>
              </Card>
            )}
            <Button onClick={loadReview} size="lg">
              <RefreshCw className="h-5 w-5 mr-2" /> Load My Review
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {review && (
          <div className="space-y-6">
            {/* ── Mistakes Section ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  Your Recent Mistakes
                </CardTitle>
                <CardDescription>
                  Based on your actual speeches in recent Werewolf games
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {review.studentMistakes.length === 0 ? (
                  <div className="text-center py-8">
                    <Check className="h-12 w-12 mx-auto text-green-400 mb-2" />
                    <p className="text-muted-foreground">No mistakes found — great job!</p>
                  </div>
                ) : (
                  review.studentMistakes.map((mistake, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          mistake.mistakeType === "grammar" ? "default" :
                          mistake.mistakeType === "vocabulary" ? "secondary" : "outline"
                        }>
                          {mistake.mistakeType}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-muted-foreground mb-1">You said:</p>
                          <p className="text-sm text-red-300">"{mistake.originalSpeech}"</p>
                        </div>
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                          <p className="text-xs text-muted-foreground mb-1">Better:</p>
                          <p className="text-sm text-green-300">"{mistake.correctedVersion}"</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Lightbulb className="h-3 w-3 inline mr-1 text-amber-400" />
                        {mistake.explanation}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* ── Practice Drills ───────────────────────────────────────── */}
            {review.suggestedDrills.length > 0 && drill && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-amber-400" />
                    Practice Drills
                  </CardTitle>
                  <CardDescription>
                    Exercises targeting your specific weak areas
                    <Badge variant="outline" className="ml-2">{currentDrill + 1}/{review.suggestedDrills.length}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {drill.source && (
                    <Badge variant="secondary" className="text-xs">
                      <Lightbulb className="h-3 w-3 mr-1" /> {drill.source}
                    </Badge>
                  )}
                  <p className="text-base font-medium">{drill.question}</p>
                  <div className="grid gap-2">
                    {drill.options?.map((option, i) => {
                      const isCorrect = option === drill.correctAnswer;
                      const isSelected = option === selectedAnswer;
                      let variant: "default" | "outline" | "secondary" = "outline";
                      if (selectedAnswer && isCorrect) variant = "default";
                      if (isSelected && !isCorrect) variant = "secondary";

                      return (
                        <Button
                          key={i}
                          variant={variant}
                          className={`justify-start h-auto py-3 px-4 text-left ${
                            selectedAnswer && isCorrect ? "border-green-500 bg-green-500/10" : ""
                          } ${isSelected && !isCorrect ? "border-red-500 bg-red-500/10" : ""}`}
                          onClick={() => !selectedAnswer && handleAnswer(option)}
                          disabled={!!selectedAnswer}
                        >
                          <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                          {option}
                          {selectedAnswer && isCorrect && <Check className="h-4 w-4 ml-auto text-green-500" />}
                          {isSelected && !isCorrect && <X className="h-4 w-4 ml-auto text-red-500" />}
                        </Button>
                      );
                    })}
                  </div>
                  {showExplanation && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm font-medium text-amber-300 mb-1">Explanation:</p>
                      <p className="text-sm">{drill.explanation}</p>
                    </div>
                  )}
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={loadReview} size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                    {selectedAnswer && currentDrill < review.suggestedDrills.length - 1 && (
                      <Button onClick={nextDrill}>Next Drill →</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Overall Tips ──────────────────────────────────────────── */}
            {review.overallTips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-amber-400" />
                    Overall Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {review.overallTips.map((tip, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reload button at bottom */}
            <div className="text-center pt-4">
              <Button variant="outline" onClick={loadReview}>
                <RefreshCw className="h-4 w-4 mr-1" /> Load Latest Review
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
