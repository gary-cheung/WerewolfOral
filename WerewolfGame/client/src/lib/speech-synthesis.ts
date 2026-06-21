// Text-to-Speech utility using Web Speech Synthesis API
class SpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private isAvailable: boolean = false;
  private pendingSpeechTimeout: NodeJS.Timeout | null = null;
  private muted: boolean = false;

  constructor() {
    // Check if speech synthesis is available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isAvailable = true;
      this.initializeVoice();
    } else {
      console.warn('Speech synthesis not available in this browser');
    }
  }

  private initializeVoice() {
    if (!this.synth) return;

    // Wait for voices to load
    const loadVoices = () => {
      if (!this.synth) return;
      const voices = this.synth.getVoices();
      // Prefer English (US) voices for educational purposes
      this.voice = voices.find(v => v.lang === 'en-US') || 
                   voices.find(v => v.lang.startsWith('en')) ||
                   voices[0] || null;
    };

    loadVoices();
    this.synth.onvoiceschanged = loadVoices;
  }

  speak(text: string, options: { rate?: number; pitch?: number; volume?: number; onEnd?: () => void } = {}) {
    // Silent fallback if speech synthesis not available, or muted
    if (!this.synth || !this.isAvailable || this.muted) {
      return;
    }

    // Cancel any ongoing speech and pending timeouts
    this.synth.cancel();
    if (this.pendingSpeechTimeout) {
      clearTimeout(this.pendingSpeechTimeout);
      this.pendingSpeechTimeout = null;
    }
    
    // Add a small delay to ensure previous speech is fully cancelled
    this.pendingSpeechTimeout = setTimeout(() => {
      if (!this.synth) return;
      
      const utterance = new SpeechSynthesisUtterance(text);
    
      if (this.voice) {
        utterance.voice = this.voice;
      }

      utterance.rate = options.rate ?? 0.9; // Slightly slower for learning
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = 'en-US';

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };

      utterance.onend = () => {
        options.onEnd?.();
      };

      this.synth.speak(utterance);
      this.pendingSpeechTimeout = null;
    }, 100); // Small delay to prevent stuttering
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.pendingSpeechTimeout) {
      clearTimeout(this.pendingSpeechTimeout);
      this.pendingSpeechTimeout = null;
    }
  }

  setMuted(value: boolean) {
    this.muted = value;
    if (value) this.stop();
  }

  isMuted(): boolean {
    return this.muted;
  }

  // Check if speech synthesis is available
  isSupported(): boolean {
    return this.isAvailable;
  }

  // Game-specific announcement helpers
  announcePhaseChange(phase: string) {
    const messages: Record<string, string> = {
      night: "Night has fallen. Werewolves, choose your target wisely.",
      day: "It's daytime. Everyone, please share your thoughts and suspicions.",
      voting: "Voting time. Choose carefully who you want to eliminate.",
      result: "The game has ended. Let's reveal the results."
    };

    const message = messages[phase] || `${phase} phase has begun`;
    this.speak(message);
  }

  announceWinner(winner: "villagers" | "werewolves") {
    const message = winner === "villagers"
      ? "Congratulations! The villagers have won. All werewolves have been eliminated."
      : "The werewolves have won. They now control the village.";
    this.speak(message);
  }

  announcePlayerTurn(playerName: string) {
    this.speak(`${playerName}, it's your turn to speak.`);
  }

  announceElimination(playerName: string, role: string) {
    this.speak(`${playerName}, the ${role}, has been eliminated.`);
  }

  announceGameRules() {
    const rules = "Welcome to Werewolf. Use this game to practice your English speaking skills. Listen carefully and speak clearly. The AI will provide feedback on your grammar and vocabulary.";
    this.speak(rules, { rate: 0.8 }); // Slower for rules
  }
}

// Singleton instance
export const speechSynthesizer = new SpeechSynthesizer();
