import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ChevronDown, ChevronUp, Send, Clock, PartyPopper, X, Minimize2, Maximize2, Lightbulb, AlertTriangle, BookOpen, Skull, ShieldCheck } from "lucide-react";
import { Player, SpeechFeedback, roleInfoMap, type GameRole } from "@shared/schema";
import { useState, useRef, useEffect, useCallback } from "react";
import { createSpeechInput, isSpeechInputSupported, SpeechInput } from "@/lib/speech-input";
import { useIsMobile } from "@/hooks/use-mobile";

interface DayPhasePageProps {
  players: Player[];
  currentPlayerId: string;
  currentSpeaker?: string;
  speeches: Array<{ playerId: string; text: string }>;
  onSpeechSubmit: (playerId: string, text: string) => void;
  aiFeedback?: SpeechFeedback;
  aiFeedbackLoading?: boolean;
  canProceedToVoting: boolean;
  onProceedToVoting: () => void;
  onFeedbackVisibilityChange?: (visible: boolean) => void;
}

export default function DayPhasePage({
  players,
  currentPlayerId,
  currentSpeaker,
  speeches,
  onSpeechSubmit,
  aiFeedback,
  aiFeedbackLoading = false,
  canProceedToVoting,
  onProceedToVoting,
  onFeedbackVisibilityChange
}: DayPhasePageProps) {
  const [speechText, setSpeechText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false); // Compact by default — more chat space
  const [feedbackDismissed, setFeedbackDismissed] = useState(false); // Mobile: fully dismissed after close
  const [showSpeechInput, setShowSpeechInput] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechEngine, setSpeechEngine] = useState<"webspeech" | "mediarecorder" | "none">("none");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false); // Don't auto-show — user uses Role Info button
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const speechInputRef = useRef<SpeechInput | null>(null);
  const isMobile = useIsMobile();

  // Role & faction info
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const werewolfRoles = ["werewolf", "wolf_king"];
  const isWerewolf = currentPlayer?.role ? werewolfRoles.includes(currentPlayer.role) : false;
  const specificRole = currentPlayer?.role ? roleInfoMap[currentPlayer.role as GameRole] : null;

  // Initialize cross-platform speech input
  useEffect(() => {
    const input = createSpeechInput({
      onResult: (finalText: string) => {
        setSpeechText(prev => (prev + ' ' + finalText).trim());
      },
      onInterim: (text: string) => {
        setInterimText(text);
      },
      onError: (msg: string) => {
        console.error('[SpeechInput]', msg);
        setSpeechError(msg);
        // Don't set isListening=false here — the speech input manages its own
        // state via onStateChange. The hybrid fallback auto-starts recording
        // after a network error, and we'd kill that state if we force false.
        setTimeout(() => setSpeechError(null), 8000);
      },
      onStateChange: (listening: boolean) => {
        setIsListening(listening);
        if (listening) {
          // Sync engine type from the speech input (may have auto-switched)
          setSpeechEngine(speechInputRef.current?.engine() || "none");
        } else {
          setInterimText("");
          setSpeechEngine("none");
        }
      },
    });

    speechInputRef.current = input;
    setSpeechEngine(input.engine());

    return () => {
      // Cleanup on unmount
      if (speechInputRef.current) {
        speechInputRef.current.stop();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    const input = speechInputRef.current;
    if (!input || !input.isSupported()) {
      if (!isSpeechInputSupported()) {
        alert(
          'Speech input is not supported in this browser.\n\n' +
          '• On desktop: please use Chrome or Edge\n' +
          '• On iPhone/iPad: Safari supports recording — tap Speak to try\n' +
          '• You can also type your speech in the text box below'
        );
        return;
      }
      // Re-create if support appeared (e.g. permissions granted)
      return;
    }

    setSpeechError(null);

    if (isListening) {
      input.stop();
    } else {
      input.start();
      setSpeechEngine(input.engine());
    }
  }, [isListening]);

  const isCurrentTurn = currentSpeaker === currentPlayerId;
  const hasSpoken = currentPlayer?.hasSpoken || false;
  
  // Show collapse button whenever AI feedback is available (so user can see more chat)
  const shouldShowCollapseButton = aiFeedback !== undefined;

  // Auto-focus textarea when it's player's turn
  useEffect(() => {
    if (textareaRef.current && isCurrentTurn && !hasSpoken) {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isCurrentTurn, hasSpoken]);

  // Auto-scroll chat to bottom when new speeches arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [speeches.length]);

  // Track previous aiFeedback to detect arrival
  const prevFeedbackRef = useRef(aiFeedback);

  // Auto-expand feedback panel when AI feedback arrives (after speech submission)
  useEffect(() => {
    if (!prevFeedbackRef.current && aiFeedback) {
      setShowFeedback(true);
      setFeedbackDismissed(false); // Reset dismiss on new feedback
    }
    prevFeedbackRef.current = aiFeedback;
  }, [aiFeedback]);

  // Notify parent when feedback overlay is visible (pause speech queue)
  useEffect(() => {
    onFeedbackVisibilityChange?.(showFeedback);
  }, [showFeedback, onFeedbackVisibilityChange]);

  // Auto-expand feedback panel when collapse button becomes unavailable
  useEffect(() => {
    if (!shouldShowCollapseButton && !showFeedback) {
      setShowFeedback(true);
    }
  }, [shouldShowCollapseButton, showFeedback]);

  // Mobile: fully close feedback panel and mark as dismissed
  const handleCloseFeedback = () => {
    setShowFeedback(false);
    setFeedbackDismissed(true);
  };

  const handleSubmitSpeech = () => {
    // Include any interim text in the final submission
    const fullText = (speechText + (interimText ? ' ' + interimText : '')).trim();
    if (fullText) {
      onSpeechSubmit(currentPlayerId, fullText);
      setSpeechText("");
      setInterimText("");
    }
  };

  const handleSkipTurn = () => {
    onSpeechSubmit(currentPlayerId, "");
    setSpeechText("");
    setInterimText("");
    setSpeechError(null);
    // Stop listening if active
    if (speechInputRef.current) {
      speechInputRef.current.stop();
    }
  };

  const currentSpeakerInfo = players.find(p => p.id === currentSpeaker);
  const nextSpeaker = players.filter(p => p.status === "alive" && !p.hasSpoken).find(p => p.id !== currentSpeaker);
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Simple Role Info Dialog — just tells role + werewolf/villager */}
      <Dialog open={showRoleInfo} onOpenChange={setShowRoleInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your Role</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isWerewolf ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`}>
              {isWerewolf ? (
                <Skull className="w-8 h-8 text-red-500" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              )}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isWerewolf ? 'text-red-500' : 'text-blue-500'}`}>
                {isWerewolf ? "🐺 Werewolf" : "🛡️ Good Guy"}
              </h2>
              {specificRole && (
                <p className="text-sm text-muted-foreground mt-1">
                  {specificRole.name}
                </p>
              )}
            </div>
            <Button onClick={() => setShowRoleInfo(false)} className="w-full">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="p-4 border-b space-y-3">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-lg font-semibold" data-testid="text-phase-title">
            Day Phase - Discussion
          </h1>
          {/* Role badge */}
          {currentPlayer?.role && (
            <Badge
              variant="outline"
              className={`text-xs font-bold ${
                isWerewolf
                  ? 'border-red-500 text-red-500'
                  : 'border-blue-500 text-blue-500'
              }`}
            >
              {isWerewolf ? '🐺 ' : '🛡️ '}
              {specificRole?.name || currentPlayer.role}
            </Badge>
          )}
          {/* Re-read role info button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRoleInfo(true)}
            className="gap-1"
            data-testid="button-reread-role"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-xs">Role Info</span>
          </Button>
        </div>
        
        {/* Now Speaking Banner */}
        {currentSpeakerInfo && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentSpeakerInfo.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm font-semibold" data-testid="text-now-speaking">
                  Now Speaking: {currentSpeakerInfo.id === currentPlayerId ? `${currentSpeakerInfo.name} (You)` : currentSpeakerInfo.name}
                </p>
                {nextSpeaker && (
                  <p className="text-xs text-muted-foreground" data-testid="text-next-speaker">
                    Next: {nextSpeaker.id === currentPlayerId ? `${nextSpeaker.name} (You)` : nextSpeaker.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className={`flex-1 flex flex-col lg:flex-row gap-2 md:gap-4 p-2 md:p-4 overflow-auto min-h-0 ${isMobile ? 'pb-24' : ''}`}>
        {/* Left: Speaking Order — hidden on mobile, sidebar on desktop */}
        <div className="lg:w-56 shrink-0 hidden lg:block">
          <Card>
            <CardHeader className="pb-1 md:pb-3 px-2 md:px-4 pt-2 md:pt-4">
              <CardTitle className="text-xs md:text-sm">Speaking Order</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile: compact icon row */}
              <div className="hidden lg:block">
                <ScrollArea className="h-[500px]">
                  <div className="px-4 pb-4 space-y-2">
                    {players.filter(p => p.status === "alive").map((player, idx) => {
                      const isCurrent = player.id === currentSpeaker;
                      const isCurrentUser = player.id === currentPlayerId;
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 p-2 rounded-md ${
                            isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                          }`}
                          data-testid={`speaker-item-${player.id}`}
                        >
                          <span className={`text-xs font-mono w-5 text-center flex-shrink-0 ${
                            isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={isCurrent ? 'bg-primary-foreground text-primary' : ''}>
                              {player.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {isCurrentUser ? `${player.name} (You)` : player.name}
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {player.hasSpoken && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">Spoken</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              {/* Mobile: icon-only row with numbers */}
              <div className="lg:hidden">
                <div className="flex flex-wrap justify-center gap-1.5 px-2 pb-2">
                  {players.filter(p => p.status === "alive").map((player, idx) => {
                    const isCurrent = player.id === currentSpeaker;
                    const isCurrentUser = player.id === currentPlayerId;
                    return (
                      <div
                        key={player.id}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md min-w-[36px] ${
                          isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-muted/50'
                        } ${player.hasSpoken ? 'opacity-50' : ''}`}
                        title={player.name + (isCurrentUser ? ' (You)' : '')}
                        data-testid={`speaker-item-${player.id}`}
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className={`text-[8px] ${isCurrent ? 'bg-primary-foreground text-primary' : ''}`}>
                            {player.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-bold leading-none">{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Speech Text Area */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-auto">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                <CardTitle className="text-base font-bold flex-1">Discussion - All Speeches</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {speeches.length} {speeches.length === 1 ? 'speech' : 'speeches'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="flex-1 min-h-[200px] px-4 py-3" data-testid="chat-feed">
                {speeches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Send className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-base font-medium text-foreground mb-1">
                      Discussion Starts Soon
                    </p>
                    <p className="text-sm text-muted-foreground">
                      All speeches will appear here in chronological order
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {speeches.map((speech, index) => {
                      const speaker = players.find(p => p.id === speech.playerId);
                      const isUserSpeech = speech.playerId === currentPlayerId;
                      return (
                        <div 
                          key={index} 
                          className={`flex gap-3 p-4 rounded-lg border-2 transition-all ${
                            isUserSpeech 
                              ? 'bg-primary/10 border-primary/30 shadow-sm' 
                              : 'bg-card border-border hover-elevate'
                          }`}
                          data-testid={`speech-${index}`}
                        >
                          <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-border">
                            <AvatarFallback className={isUserSpeech ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                              {speaker?.name.substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-sm font-bold text-foreground">
                                {speaker?.name || 'Unknown'}
                                {isUserSpeech && <span className="text-primary"> (You)</span>}
                              </p>
                              {speaker?.role && isUserSpeech && (
                                <span className="text-[10px] text-muted-foreground leading-none">
                                  {roleInfoMap[speaker.role as GameRole]?.name || speaker.role}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                #{index + 1}
                              </Badge>
                            </div>
                            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                              {speech.text || <span className="italic text-muted-foreground">(Skipped turn)</span>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Turn Status Message */}
          {!isCurrentTurn && !hasSpoken && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {currentSpeaker ? 
                    `Waiting for ${players.find(p => p.id === currentSpeaker)?.name || 'another player'} to speak...` :
                    'All players have spoken. Ready to proceed to voting.'
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* Speech Input Controls */}
          {isCurrentTurn && !hasSpoken && (
            <div className={isMobile ? 'fixed bottom-0 left-0 right-0 z-30 p-2 bg-background/95 backdrop-blur border-t' : ''}>
            {isMobile ? (
              /* ── Mobile: compact input ── */
              <div className="space-y-1.5">
                {/* Listening status line */}
                {isListening && (
                  <p className="text-[10px] text-primary px-1 animate-pulse">
                    {speechEngine === "mediarecorder" ? '🎙️ Recording...' : '🎤 Listening...'} {interimText ? `"${interimText}"` : 'Speak clearly in English'}
                  </p>
                )}
                {/* Speech error banner — compact */}
                {speechError && (
                  <p className="text-[10px] text-amber-600 px-1 truncate">{speechError}</p>
                )}
                {/* Textarea with mic inside */}
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type or tap mic to speak..."
                    value={speechText + (interimText ? (speechText ? ' ' : '') + interimText : '')}
                    onChange={(e) => setSpeechText(e.target.value)}
                    rows={3}
                    disabled={isListening}
                    className="pr-10 text-sm"
                    data-testid="textarea-speech-input"
                  />
                  <Button
                    variant={isListening ? "default" : "ghost"}
                    size="icon"
                    className={`absolute top-2 right-2 h-8 w-8 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' : 'text-muted-foreground'}`}
                    onClick={toggleListening}
                    data-testid="button-speech-input"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                {/* Submit + Skip side by side */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!speechText.trim() && !interimText.trim()}
                    onClick={handleSubmitSpeech}
                    data-testid="button-send-text"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Submit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleSkipTurn}
                    data-testid="button-finish-speaking"
                  >
                    Skip Turn
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Desktop: full card layout ── */
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm flex-1">Your Speech Input</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSpeechInput(!showSpeechInput)}
                    data-testid="button-toggle-speech-input"
                    className="gap-1"
                  >
                    {showSpeechInput ? (
                      <><Minimize2 className="w-3 h-3" /><span className="text-xs">Collapse</span></>
                    ) : (
                      <><Maximize2 className="w-3 h-3" /><span className="text-xs">Expand</span></>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {showSpeechInput && (
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                      <Button
                        variant={isListening ? "default" : "outline"}
                        size="lg"
                        onClick={toggleListening}
                        className={`gap-2 flex-shrink-0 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
                        data-testid="button-speech-input"
                      >
                        <Mic className="w-5 h-5" />
                        {isListening ? (speechEngine === "mediarecorder" ? 'Recording...' : 'Stop') : 'Speak'}
                      </Button>
                      <div className="flex-1">
                        {isListening ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-red-500">{speechEngine === "mediarecorder" ? 'Recording... tap Stop when done' : 'Listening... speak clearly in English'}</p>
                            {interimText && <p className="text-xs text-muted-foreground italic">{interimText}</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Click <strong>Speak</strong> to use voice input, or type your speech below</p>
                        )}
                      </div>
                    </div>
                    {speechError && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">{speechError}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Type your speech in English, or use the Speak button above..."
                        value={speechText + (interimText ? (speechText ? ' ' : '') + interimText : '')}
                        onChange={(e) => setSpeechText(e.target.value)}
                        rows={4}
                        disabled={isListening}
                        className={interimText ? 'border-primary/50' : ''}
                        data-testid="textarea-speech-input"
                      />
                      <div className="flex gap-2">
                        <Button size="lg" className="flex-1" disabled={!speechText.trim() && !interimText.trim()} onClick={handleSubmitSpeech} data-testid="button-send-text">
                          <Send className="w-5 h-5 mr-2" />Submit Speech
                        </Button>
                      </div>
                    </div>
                    {speechText.trim() === "" && !isListening && (
                      <div className="pt-2">
                        <Button variant="outline" size="lg" className="w-full" onClick={handleSkipTurn} data-testid="button-finish-speaking">
                          Finish Speaking (Skip Turn)
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
            )}
            </div>
          )}
        </div>

        {/* Right: AI Feedback — mobile overlay, desktop sidebar */}
        {isMobile ? (
          aiFeedback && !feedbackDismissed ? (
            <>
              {/* Backdrop */}
              {showFeedback && (
                <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur" onClick={handleCloseFeedback} />
              )}
              {/* Bottom sheet */}
              {showFeedback && (
                <div className="fixed inset-x-0 bottom-0 z-40">
                  <Card className="w-full max-h-[80vh] overflow-auto rounded-t-xl shadow-xl">
                    <CardHeader className="pb-2 border-b px-3 pt-3">
                      <div className="flex items-center justify-between gap-1">
                        <CardTitle className="text-sm">AI Feedback</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCloseFeedback}
                            data-testid="button-close-feedback"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      {aiFeedbackLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-3" />
                          <p className="text-sm font-medium text-primary">Waiting to analyze...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                  {Math.round(((aiFeedback.scores?.accuracy ?? 0) + (aiFeedback.scores?.fluency ?? 0)) / 2)}
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-500">Overall</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{aiFeedback.scores?.accuracy ?? 0}</div>
                                <div className="text-xs text-green-600 dark:text-green-500">Accuracy</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{aiFeedback.scores?.fluency ?? 0}</div>
                                <div className="text-xs text-green-600 dark:text-green-500">Fluency</div>
                              </div>
                            </div>
                          </div>
                          {aiFeedback.congratulations ? (
                            <div className="text-center py-4">
                              <PartyPopper className="w-10 h-10 text-primary mx-auto mb-2" />
                              <p className="text-sm font-semibold text-primary">{aiFeedback.congratulations}</p>
                            </div>
                          ) : aiFeedback.correctedText ? (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Enhanced Version:</p>
                              <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                                <p className="text-sm leading-relaxed">{aiFeedback.correctedText}</p>
                              </div>
                            </div>
                          ) : null}
                          {(aiFeedback.improvements?.length ?? 0) > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Key Improvements:</p>
                              <div className="space-y-2">
                                {(aiFeedback.improvements || []).map((improvement, idx) => (
                                  <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                                    <Badge variant="outline" className="mt-0.5 h-5 shrink-0">{idx + 1}</Badge>
                                    <p className="text-xs leading-relaxed">{improvement}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="border-t pt-3 flex justify-between text-xs text-muted-foreground">
                            <span>Duration: {Math.floor((aiFeedback.duration ?? 0) / 60)}m {Math.floor((aiFeedback.duration ?? 0) % 60)}s</span>
                            <span>Words: {Math.round(aiFeedback.wordCount ?? 0)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : aiFeedback && feedbackDismissed ? (
            /* Floating reopen button after full dismiss */
            <div className="fixed bottom-20 right-4 z-30">
              <Button
                size="sm"
                className="rounded-full shadow-lg gap-1.5 px-4"
                onClick={() => { setShowFeedback(true); setFeedbackDismissed(false); }}
                data-testid="button-reopen-feedback"
              >
                💬 AI Feedback
              </Button>
            </div>
          ) : null
        ) : (
          /* Desktop: sidebar panel */
          <div className="lg:w-80 shrink-0">
            <Card className={showFeedback ? "h-full" : ""}>
              <CardHeader className="pb-2 md:pb-3 border-b px-2 md:px-4 pt-2 md:pt-4">
                <div className="flex items-center justify-between gap-1 md:gap-2">
                  <CardTitle className="text-xs md:text-sm flex-1">AI Feedback</CardTitle>
                  <Button
                    variant={showFeedback ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFeedback(!showFeedback)}
                    data-testid="button-toggle-feedback"
                    className="h-6 md:h-8 text-[10px] md:text-xs gap-0.5 md:gap-1 px-2"
                  >
                    {showFeedback ? (
                      <>
                        <Minimize2 className="w-3 h-3" />
                        <span className="hidden md:inline">Hide</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span>Details</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {!showFeedback && aiFeedback && (
                <CardContent className="px-2 py-2">
                  <div className="flex items-center justify-center gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">{Math.round(((aiFeedback.scores?.accuracy ?? 0) + (aiFeedback.scores?.fluency ?? 0)) / 2)}</div>
                      <div className="text-[9px] text-muted-foreground">Score</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-green-600">{aiFeedback.scores?.accuracy ?? 0}</div>
                      <div className="text-[9px] text-muted-foreground">Acc</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-green-600">{aiFeedback.scores?.fluency ?? 0}</div>
                      <div className="text-[9px] text-muted-foreground">Flu</div>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center mt-1">
                    {Math.floor((aiFeedback.duration ?? 0) / 60)}m{Math.floor((aiFeedback.duration ?? 0) % 60)}s · {Math.round(aiFeedback.wordCount ?? 0)} words
                  </p>
                </CardContent>
              )}
              {showFeedback && (
                <CardContent>
                  {!isCurrentTurn && !hasSpoken ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Clock className="w-12 h-12 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">Waiting for your turn...</p>
                      <p className="text-xs text-muted-foreground mt-2">Real-time feedback will appear when you speak</p>
                    </div>
                  ) : aiFeedbackLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-3" />
                      <p className="text-sm font-medium text-primary">Waiting to analyze...</p>
                    </div>
                  ) : aiFeedback ? (
                    <div className="space-y-4">
                      <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{Math.round(((aiFeedback.scores?.accuracy ?? 0) + (aiFeedback.scores?.fluency ?? 0)) / 2)}</div>
                            <div className="text-xs text-green-600 dark:text-green-500">Overall</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{aiFeedback.scores?.accuracy ?? 0}</div>
                            <div className="text-xs text-green-600 dark:text-green-500">Accuracy</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{aiFeedback.scores?.fluency ?? 0}</div>
                            <div className="text-xs text-green-600 dark:text-green-500">Fluency</div>
                          </div>
                        </div>
                      </div>
                      {aiFeedback.congratulations ? (
                        <div className="text-center py-6">
                          <PartyPopper className="w-12 h-12 text-primary mx-auto mb-2" />
                          <p className="text-sm font-semibold text-primary">{aiFeedback.congratulations}</p>
                        </div>
                      ) : aiFeedback.correctedText ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Enhanced Version:</p>
                          <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                            <p className="text-sm leading-relaxed">{aiFeedback.correctedText}</p>
                          </div>
                        </div>
                      ) : null}
                      {(aiFeedback.improvements?.length ?? 0) > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Key Improvements:</p>
                          <div className="space-y-2">
                            {(aiFeedback.improvements || []).map((improvement, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                                <Badge variant="outline" className="mt-0.5 h-5 shrink-0">{idx + 1}</Badge>
                                <p className="text-xs leading-relaxed">{improvement}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between text-xs text-muted-foreground">
                        <span>Duration: {Math.floor((aiFeedback.duration ?? 0) / 60)}m {Math.floor((aiFeedback.duration ?? 0) % 60)}s</span>
                        <span>Words: {Math.round(aiFeedback.wordCount ?? 0)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Waiting for speech...</p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Footer - Voting Button */}
      <div className="p-4 border-t">
        <Button
          size="lg"
          className="w-full"
          disabled={!canProceedToVoting}
          onClick={onProceedToVoting}
          data-testid="button-proceed-voting"
        >
          Proceed to Voting
        </Button>
      </div>
    </div>
  );
}
