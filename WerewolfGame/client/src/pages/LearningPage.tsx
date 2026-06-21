import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Shuffle, GraduationCap, Swords, Sparkles,
  ArrowLeft, Lightbulb, Volume2, Check, X, RefreshCw
} from "lucide-react";
import type { DifficultyLevel, GameRole } from "@shared/schema";
import { speechSynthesizer } from "@/lib/speech-synthesis";

// ── Types ─────────────────────────────────────────────────────────────────

interface VocabularyEntry {
  word: string;
  translation: string;
  category: string;
  example: string;
  sentenceTranslation?: string;
  roleRelevance?: string;
}

interface VocabularySet {
  category: string;
  description: string;
  entries: VocabularyEntry[];
}

interface GrammarDrill {
  question: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
  source?: string;
}

interface DrillSet {
  title: string;
  grammarFocus: string;
  drills: GrammarDrill[];
}

interface RoleStrategy {
  role: GameRole;
  roleName: string;
  roleNameCn: string;
  keyPhrases: Array<{ english: string; chinese: string; usage: string }>;
  strategyTips: string[];
  vocabularyToKnow: string[];
}

// ── LearningPage Component ───────────────────────────────────────────────

interface LearningPageProps {
  onNavigateHome?: () => void;
}

export default function LearningPage({ onNavigateHome }: LearningPageProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<GameRole>("villager");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("intermediate");
  const [vocabCategory, setVocabCategory] = useState("general");
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [speakingWordIdx, setSpeakingWordIdx] = useState<number | null>(null);
  const [speakingExampleIdx, setSpeakingExampleIdx] = useState<number | null>(null);

  // ── Fetch Vocabulary ────────────────────────────────────────────────────

  const { data: vocabulary, isLoading: vocabLoading, refetch: refetchVocab } = useQuery<VocabularySet>({
    queryKey: [`/api/learning/vocabulary?category=${vocabCategory}&role=${selectedRole}&difficulty=${selectedDifficulty}`],
  });

  // ── Fetch Drills ────────────────────────────────────────────────────────

  const { data: drills, isLoading: drillsLoading, refetch: refetchDrills } = useQuery<DrillSet>({
    queryKey: [`/api/learning/drills-data-${selectedDifficulty}`],
    queryFn: async () => {
      const storedUser = localStorage.getItem("guestUser");
      const userId = storedUser ? JSON.parse(storedUser).id : undefined;
      const res = await fetch("/api/learning/drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ difficulty: selectedDifficulty, count: 5, userId }),
      });
      if (!res.ok) throw new Error("Failed to fetch drills");
      return res.json();
    },
    enabled: false, // Manual fetch
  });

  // ── Fetch Role Strategy ─────────────────────────────────────────────────

  const { data: strategy, isLoading: strategyLoading } = useQuery<RoleStrategy>({
    queryKey: [`/api/learning/role/${selectedRole}/strategy?difficulty=${selectedDifficulty}`],
  });

  // ── Drill interaction ──────────────────────────────────────────────────

  const currentDrill = drills?.drills?.[currentDrillIndex];

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowExplanation(true);
  };

  const nextDrill = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (drills && currentDrillIndex < drills.drills.length - 1) {
      setCurrentDrillIndex((i) => i + 1);
    }
  };

  const loadDrills = () => {
    refetchDrills();
    setCurrentDrillIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  // ── Pronunciation handlers ─────────────────────────────────────────────
  const handleSpeakWord = (idx: number, word: string) => {
    if (speakingWordIdx === idx) {
      speechSynthesizer.stop();
      setSpeakingWordIdx(null);
      return;
    }
    setSpeakingWordIdx(idx);
    speechSynthesizer.speak(word, { rate: 0.8, onEnd: () => setSpeakingWordIdx(null) });
  };

  const handleSpeakExample = (idx: number, example: string) => {
    if (speakingExampleIdx === idx) {
      speechSynthesizer.stop();
      setSpeakingExampleIdx(null);
      return;
    }
    setSpeakingExampleIdx(idx);
    speechSynthesizer.speak(example, { rate: 0.85, onEnd: () => setSpeakingExampleIdx(null) });
  };

  const roles: GameRole[] = ["villager", "werewolf", "prophet", "witch", "hunter", "guard", "idiot", "wolf_king"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onNavigateHome && (
              <Button variant="ghost" size="icon" onClick={onNavigateHome}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <GraduationCap className="h-6 w-6 text-amber-400" />
            <h1 className="text-xl font-bold">English Learning</h1>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Level:</Label>
            <Select value={selectedDifficulty} onValueChange={(v) => setSelectedDifficulty(v as DifficultyLevel)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="vocabulary" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="vocabulary">
              <BookOpen className="h-4 w-4 mr-2" /> Vocabulary
            </TabsTrigger>
            <TabsTrigger value="grammar">
              <Shuffle className="h-4 w-4 mr-2" /> Grammar Drills
            </TabsTrigger>
            <TabsTrigger value="strategy">
              <Swords className="h-4 w-4 mr-2" /> Role Strategy
            </TabsTrigger>
          </TabsList>

          {/* ── Vocabulary Tab ──────────────────────────────────────────── */}
          <TabsContent value="vocabulary" className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as GameRole)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={vocabCategory} onValueChange={setVocabCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="accusation">Accusation</SelectItem>
                  <SelectItem value="defense">Defense</SelectItem>
                  <SelectItem value="debate">Debate</SelectItem>
                  <SelectItem value="role-specific">Role-Specific</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetchVocab()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>

            {vocabLoading ? (
              <div className="grid gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : vocabulary ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{vocabulary.description}</p>
                <div className="grid gap-3">
                  {vocabulary.entries.map((entry, i) => (
                    <Card key={i} className="hover:border-amber-500/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-lg">{entry.word}</span>
                              <Badge variant="outline" className="text-xs">{entry.translation}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${speakingWordIdx === i ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}
                                onClick={() => handleSpeakWord(i, entry.word)}
                                data-testid={`speak-word-${i}`}
                                title="Pronounce word"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex items-start gap-1">
                              <p className="text-sm text-muted-foreground italic">"{entry.example}"</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-5 w-5 shrink-0 mt-0.5 ${speakingExampleIdx === i ? 'text-primary animate-pulse' : 'text-muted-foreground/50'}`}
                                onClick={() => handleSpeakExample(i, entry.example)}
                                data-testid={`speak-example-${i}`}
                                title="Pronounce sentence"
                              >
                                <Volume2 className="h-3 w-3" />
                              </Button>
                            </div>
                            {entry.sentenceTranslation && (
                              <p className="text-xs text-muted-foreground/70 mt-1">{entry.sentenceTranslation}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="secondary" className="text-xs">{entry.category}</Badge>
                            {entry.roleRelevance && (
                              <span className="text-xs text-muted-foreground">{entry.roleRelevance}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ── Grammar Drills Tab ──────────────────────────────────────── */}
          <TabsContent value="grammar" className="space-y-4">
            {!drills ? (
              <div className="text-center py-12 space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-amber-400" />
                <p className="text-muted-foreground">Ready to practice? Drills are personalized based on your game history.</p>
                <Button onClick={loadDrills} size="lg">
                  <GraduationCap className="h-5 w-5 mr-2" /> Start Practice
                </Button>
              </div>
            ) : drillsLoading ? (
              <Card><CardContent className="p-8"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ) : currentDrill ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{drills.title}</h3>
                  <Badge variant="outline">{currentDrillIndex + 1} / {drills.drills.length}</Badge>
                </div>
                {currentDrill.source && (
                  <Badge variant="secondary" className="text-xs">
                    <Lightbulb className="h-3 w-3 mr-1" /> {currentDrill.source}
                  </Badge>
                )}

                <Card>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-base font-medium">{currentDrill.question}</p>
                    <div className="grid gap-2">
                      {currentDrill.options?.map((option, i) => {
                        const isCorrect = option === currentDrill.correctAnswer;
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
                        <p className="text-sm">{currentDrill.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={loadDrills} size="sm">
                    <RefreshCw className="h-4 w-4 mr-1" /> New Set
                  </Button>
                  {selectedAnswer && currentDrillIndex < (drills?.drills?.length || 1) - 1 && (
                    <Button onClick={nextDrill}>Next Drill →</Button>
                  )}
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ── Role Strategy Tab ───────────────────────────────────────── */}
          <TabsContent value="strategy" className="space-y-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as GameRole)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Choose Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {strategyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : strategy ? (
              <div className="space-y-4">
                {/* Key Phrases */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-amber-400" />
                      Key Phrases for {strategy.roleName}
                      <Badge variant="outline">{strategy.roleNameCn}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {strategy.keyPhrases.map((phrase, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <p className="font-medium text-amber-300">"{phrase.english}"</p>
                        <p className="text-sm text-muted-foreground">{phrase.chinese}</p>
                        <p className="text-xs italic">{phrase.usage}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Strategy Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      Strategy Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {strategy.strategyTips.map((tip, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-amber-400 font-bold">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Vocabulary to Know */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-amber-400" />
                      Must-Know Vocabulary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {strategy.vocabularyToKnow.map((word, i) => (
                        <Badge key={i} variant="secondary">{word}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
