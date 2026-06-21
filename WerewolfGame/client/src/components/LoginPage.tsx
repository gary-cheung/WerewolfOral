import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, PlusCircle, Users, Sparkles, BookOpen, Shuffle, HelpCircle } from "lucide-react";
import logoImage from "@assets/icon_with_text_AI.png";

interface LoginPageProps {
  onSuccess: (userId: number, username: string, roomCode?: string, isOwner?: boolean) => void;
  onNavigateToLearning?: () => void;
  onNavigateToReview?: () => void;
  onNavigateToRules?: () => void;
}

type ViewType = "menu" | "create" | "join";

// Generate random guest username
function generateGuestUsername(): string {
  const adjectives = ["Swift", "Brave", "Wise", "Silent", "Noble", "Clever", "Bold", "Mighty", "Keen", "Fierce"];
  const nouns = ["Wolf", "Fox", "Eagle", "Lion", "Tiger", "Bear", "Hawk", "Raven", "Falcon", "Panther"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${adjective}${noun}${number}`;
}

export default function LoginPage({ onSuccess, onNavigateToLearning, onNavigateToReview, onNavigateToRules }: LoginPageProps) {
  const [view, setView] = useState<ViewType>("menu");
  const [isLoading, setIsLoading] = useState(false);
  const [guestUsername, setGuestUsername] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [customUsername, setCustomUsername] = useState("");
  const { toast } = useToast();

  // Generate guest username on component mount
  useEffect(() => {
    const name = generateGuestUsername();
    setGuestUsername(name);
    setCustomUsername(name);
  }, []);

  // Create guest user and auto-login
  const createGuestUser = async (username: string) => {
    const res = await apiRequest(
      "POST",
      "/api/users/guest",
      { username }
    );
    return await res.json();
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      // Create guest user
      const user = await createGuestUser(guestUsername);

      // Create room
      const roomRes = await apiRequest(
        "POST",
        "/api/rooms/create",
        {}
      );
      const roomData = await roomRes.json();

      toast({
        title: "Room created!",
        description: `Welcome ${user.username}! Room code: ${roomData.code}`,
      });

      onSuccess(user.id, user.username, roomData.code, true);
    } catch (error: any) {
      toast({
        title: "Failed to create room",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create guest user
      const user = await createGuestUser(guestUsername);

      toast({
        title: "Joining room...",
        description: `Welcome ${user.username}! Connecting to room ${joinRoomCode.toUpperCase()}`,
      });

      // Pass room code to main app - validation happens via WebSocket
      onSuccess(user.id, user.username, joinRoomCode.toUpperCase(), false);
    } catch (error: any) {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Menu View - Main landing page with guest mode
  if (view === "menu") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-2 md:py-8">
        <div className="w-full max-w-md space-y-3 md:space-y-8">
          {/* Werewolf Logo */}
          <div className="flex flex-col items-center space-y-2 md:space-y-4">
            <img
              src={logoImage}
              alt="Werewolf Game Logo"
              className="w-full max-w-[200px] md:max-w-sm h-20 md:h-32 object-contain"
              data-testid="img-werewolf-logo"
            />
            <div className="text-center space-y-1 md:space-y-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground" data-testid="text-title">
                Werewolf English Learning
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Practice English through immersive social gaming
              </p>
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm">
                {editingUsername ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      className="h-8 w-44"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setGuestUsername(customUsername.trim() || generateGuestUsername());
                          setEditingUsername(false);
                        }
                      }}
                      maxLength={16}
                      placeholder="Your name"
                      autoFocus
                      data-testid="input-username"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGuestUsername(customUsername.trim() || generateGuestUsername());
                        setEditingUsername(false);
                      }}
                    >
                      ✓
                    </Button>
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-primary" data-testid="text-guest-username">
                      Playing as: {guestUsername}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Menu Buttons */}
          <Card className="shadow-lg">
            <CardContent className="p-6 space-y-4">
              <Button
                className="w-full h-10 md:h-14 text-sm md:text-base hover-elevate active-elevate-2"
                variant="default"
                onClick={() => setView("create")}
                data-testid="button-menu-create-room"
              >
                <PlusCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Create a Room
              </Button>

              <Button
                className="w-full h-10 md:h-14 text-sm md:text-base hover-elevate active-elevate-2"
                variant="secondary"
                onClick={() => setView("join")}
                data-testid="button-menu-join-room"
              >
                <Users className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Join a Room
              </Button>

              {/* Learning section navigation */}
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground text-center">Learning & Practice</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-2 flex-col gap-1 text-xs"
                    onClick={() => onNavigateToLearning?.()}
                  >
                    <BookOpen className="h-4 w-4" />
                    Learn
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-2 flex-col gap-1 text-xs"
                    onClick={() => onNavigateToReview?.()}
                  >
                    <Shuffle className="h-4 w-4" />
                    Review
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-2 flex-col gap-1 text-xs"
                    onClick={() => onNavigateToRules?.()}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Rules
                  </Button>
                </div>
              </div>

              <div className="pt-2 text-center flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setEditingUsername(!editingUsername);
                    if (!editingUsername) setCustomUsername(guestUsername);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  data-testid="button-change-username"
                >
                  {editingUsername ? 'Cancel' : 'Edit username'}
                </button>
                <button
                  onClick={() => {
                    const newName = generateGuestUsername();
                    setGuestUsername(newName);
                    setCustomUsername(newName);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  data-testid="button-random-username"
                >
                  Random name
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Footer — compact on mobile */}
          <div className="text-center text-[10px] md:text-xs text-muted-foreground space-y-0.5 md:space-y-1 mt-1 md:mt-0">
            <p>Improve your English while playing Werewolf</p>
            <p className="text-[9px] md:text-[10px]">Guest mode - No registration required</p>
          </div>
        </div>
      </div>
    );
  }


  // Create Room View
  if (view === "create") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView("menu")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Create a Room</h2>
                <p className="text-sm text-muted-foreground">
                  Create a room and share the code with friends
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-md border">
                <p className="text-sm text-center">
                  You will join as <span className="font-semibold text-primary">{guestUsername}</span>
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateRoom}
                disabled={isLoading}
                data-testid="button-create-room"
              >
                {isLoading ? "Creating..." : "Create Room"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                A unique room code will be generated for you to share
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Join Room View
  if (view === "join") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView("menu")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Join a Room</h2>
                <p className="text-sm text-muted-foreground">
                  Enter a room code shared by your friend
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-md border">
                <p className="text-sm text-center">
                  You will join as <span className="font-semibold text-primary">{guestUsername}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-room-code">Room Code</Label>
                <Input
                  id="join-room-code"
                  type="text"
                  placeholder="Enter 6-character room code"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  maxLength={6}
                  data-testid="input-join-room-code"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleJoinRoom}
                disabled={isLoading}
                data-testid="button-join-room"
              >
                {isLoading ? "Joining..." : "Join Room"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
