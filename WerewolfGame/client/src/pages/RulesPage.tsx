import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, HelpCircle, Users, Moon, Sun, Vote, Trophy,
  Sparkles, Send, Search, BookOpen, Shield, Swords
} from "lucide-react";
import type { GameRole } from "@shared/schema";

// ── Role info (mirrored from shared schema for display) ───────────────────

const ROLE_CARDS: Array<{
  id: GameRole;
  name: string;
  nameCn: string;
  description: string;
  team: "villagers" | "werewolves";
  ability: string;
}> = [
  { id: "villager", name: "Villager", nameCn: "村民", description: "Simple opinion expression — vote to find the werewolves.", team: "villagers", ability: "No special ability. Use logic and observation to identify werewolves." },
  { id: "werewolf", name: "Werewolf", nameCn: "狼人", description: "Logical deception — eliminate villagers at night.", team: "werewolves", ability: "Each night, all werewolves secretly choose one player to eliminate." },
  { id: "wolf_king", name: "Wolf King", nameCn: "狼王", description: "Ultimate deception — leads the werewolf pack.", team: "werewolves", ability: "Same night ability as werewolf. Appears in larger (12-player) games." },
  { id: "prophet", name: "Prophet", nameCn: "预言家", description: "Analytical reasoning — check one player's identity each night.", team: "villagers", ability: "Each night, check whether one player is a werewolf or villager." },
  { id: "witch", name: "Witch", nameCn: "女巫", description: "Strategic communication — has antidote and poison potions.", team: "villagers", ability: "One antidote (save a player from elimination) and one poison (eliminate a player). Each usable once per game." },
  { id: "hunter", name: "Hunter", nameCn: "猎人", description: "Decisive argumentation — can take someone down when eliminated.", team: "villagers", ability: "When eliminated (voted out or killed), may shoot and eliminate one other player." },
  { id: "guard", name: "Guard", nameCn: "守卫", description: "Protective strategy — guard one player each night.", team: "villagers", ability: "Each night, choose one player to protect from werewolf attack. Cannot guard the same player two nights in a row." },
  { id: "idiot", name: "Idiot", nameCn: "白痴", description: "Immune to voting elimination.", team: "villagers", ability: "If voted out, reveals role and stays alive but loses voting rights." },
];

const GAME_RULES = [
  { title: "Game Setup", icon: Users, content: "5-12 players are randomly assigned roles. Each player's role is secret except to the player themselves." },
  { title: "Night Phase", icon: Moon, content: "All players close their eyes. Werewolves silently choose a target to eliminate. Special roles (Prophet, Witch, Guard) use their abilities one at a time when called by the game host." },
  { title: "Day Phase", icon: Sun, content: "Players discuss in English who they suspect. Each player has a timed turn to speak. After discussion, players vote to eliminate one suspicious player." },
  { title: "Voting", icon: Vote, content: "Simple majority vote decides who is eliminated. Ties result in a random elimination among the tied players (or a re-vote depending on house rules)." },
  { title: "Winning", icon: Trophy, content: "Villagers win when all werewolves are eliminated. Werewolves win when the number of werewolves equals or exceeds the number of villagers." },
];

// ── RulesPage Component ───────────────────────────────────────────────────

interface RulesPageProps {
  onNavigateHome?: () => void;
}

interface RuleAnswer {
  question: string;
  answer: string;
  relatedTopics: string[];
}

export default function RulesPage({ onNavigateHome }: RulesPageProps) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<RuleAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/learning/rules/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: question.trim() }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setAnswer(data);
    } catch (err: any) {
      toast({ title: "Error", description: "Could not answer your question. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
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
          <HelpCircle className="h-6 w-6 text-amber-400" />
          <h1 className="text-xl font-bold">Game Rules</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* ── Game Rules Summary ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
              How to Play Werewolf
            </CardTitle>
            <CardDescription>
              A social deduction game for English practice. Use logic, persuasion, and role abilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {GAME_RULES.map((rule, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-lg bg-muted/30">
                <rule.icon className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">{rule.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{rule.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Role Cards ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ROLE_CARDS.map((role) => (
                <Card key={role.id} className={`border-l-4 ${
                  role.team === "werewolves" ? "border-l-red-500" : "border-l-blue-500"
                }`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {role.team === "werewolves" ? (
                          <Swords className="h-4 w-4 text-red-400" />
                        ) : (
                          <Shield className="h-4 w-4 text-blue-400" />
                        )}
                        <span className="font-semibold">{role.name}</span>
                        <Badge variant="outline" className="text-xs">{role.nameCn}</Badge>
                      </div>
                      <Badge variant={role.team === "werewolves" ? "destructive" : "default"} className="text-xs">
                        {role.team}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <p className="text-xs bg-muted/50 p-2 rounded">
                      <span className="font-medium">Ability:</span> {role.ability}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Ask a Question ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Ask a Rules Question
            </CardTitle>
            <CardDescription>
              Ask anything about the Werewolf game — roles, abilities, strategies, or rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What happens if the witch uses poison and antidote in the same night?"
                onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                className="flex-1"
              />
              <Button onClick={askQuestion} disabled={loading || !question.trim()}>
                {loading ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-1">Ask</span>
              </Button>
            </div>

            {answer && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Q: {answer.question}</p>
                  <p className="text-sm">{answer.answer}</p>
                </div>
                {answer.relatedTopics.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Related:</span>
                    {answer.relatedTopics.map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick questions */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "What does the prophet do?",
                  "Can the guard protect the same player twice?",
                  "How does the witch's poison work?",
                  "What happens in a tie vote?",
                  "How many werewolves in a 9-player game?",
                ].map((q) => (
                  <Badge
                    key={q}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => { setQuestion(q); }}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
