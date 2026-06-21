/**
 * Cross-platform speech input module.
 *
 * Strategy:
 *   1. Web Speech API (SpeechRecognition) — Chrome, Edge, Android Chrome.
 *      Real-time, no server cost, best UX.
 *   2. MediaRecorder → server /api/speech/transcribe (OpenAI Whisper) —
 *      Safari, iOS Safari, Firefox. Works everywhere.
 *
 * Usage:
 *   const input = createSpeechInput({
 *     onResult:  (finalText) => { ... },
 *     onInterim: (interimText) => { ... },
 *     onError:   (msg) => { ... },
 *     onStateChange: (listening) => { ... },
 *   });
 *   input.start();
 *   input.stop();
 *   input.isSupported(); // => boolean
 */

export interface SpeechInputCallbacks {
  onResult: (finalText: string) => void;
  onInterim?: (interimText: string) => void;
  onError?: (message: string) => void;
  onStateChange: (listening: boolean) => void;
}

export interface SpeechInput {
  start: () => void;
  stop: () => void;
  isSupported: () => boolean;
  /** Returns the name of the engine being used */
  engine: () => "webspeech" | "mediarecorder" | "none";
}

// ── Web Speech API implementation ──────────────────────────────────────────

function createWebSpeechInput(callbacks: SpeechInputCallbacks): SpeechInput {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let intentionalStop = false;

  recognition.onresult = (event: any) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript) {
      callbacks.onResult(finalTranscript.trim());
    }
    callbacks.onInterim?.(interimTranscript);
  };

  recognition.onerror = (event: any) => {
    console.error("[WebSpeech] error:", event.error);
    if (event.error === "no-speech") {
      if (!intentionalStop) {
        try { recognition.start(); } catch (_) { /* ignore */ }
        return;
      }
    }
    if (event.error === "aborted") return; // expected on stop()
    callbacks.onError?.(`Speech recognition error: ${event.error}`);
    callbacks.onStateChange(false);
  };

  recognition.onend = () => {
    if (!intentionalStop) {
      // Auto-restart after silence
      try {
        recognition.start();
      } catch (_) {
        callbacks.onStateChange(false);
      }
    } else {
      callbacks.onStateChange(false);
      intentionalStop = false;
    }
  };

  return {
    start() {
      intentionalStop = false;
      try {
        recognition.start();
        callbacks.onStateChange(true);
      } catch (_) {
        // May already be started
      }
    },
    stop() {
      intentionalStop = true;
      try { recognition.stop(); } catch (_) { /* ignore */ }
    },
    isSupported: () => true,
    engine: () => "webspeech",
  };
}

// ── MediaRecorder → server transcription fallback ──────────────────────────

function createMediaRecorderInput(callbacks: SpeechInputCallbacks): SpeechInput {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: Blob[] = [];
  let active = false;

  const cleanup = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try { mediaRecorder.stop(); } catch (_) { /* ignore */ }
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    mediaRecorder = null;
    chunks.length = 0;
    active = false;
  };

  async function sendForTranscription(blob: Blob): Promise<string> {
    const resp = await fetch("/api/speech/transcribe", {
      method: "POST",
      headers: { "Content-Type": blob.type || "audio/webm" },
      body: blob,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Transcription failed" }));
      throw new Error(err.error || `Server error ${resp.status}`);
    }
    const data = await resp.json();
    return data.text || "";
  }

  return {
    async start() {
      cleanup();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        callbacks.onError?.(
          err.name === "NotAllowedError"
            ? "Microphone access denied. Please allow microphone access in your browser settings."
            : "Could not access microphone. Please check your device."
        );
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4"; // Safari fallback

      mediaRecorder = new MediaRecorder(stream, { mimeType });
      active = true;
      callbacks.onStateChange(true);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (!active) return; // stopped by user intentionally
        active = false;
        callbacks.onStateChange(false);

        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType });
        chunks.length = 0;

        callbacks.onInterim?.("Transcribing...");

        try {
          const text = await sendForTranscription(blob);
          if (text) {
            callbacks.onResult(text);
            callbacks.onInterim?.("");
          } else {
            callbacks.onError?.("No speech detected. Please try again.");
          }
        } catch (err: any) {
          console.error("[MediaRecorder] Transcription error:", err);
          callbacks.onError?.(err.message || "Transcription failed. Please type your speech instead.");
        }

        // Clean up the stream tracks
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
        }
        mediaRecorder = null;
      };

      // Request data every second so we capture audio progressively
      mediaRecorder.start(1000);
    },

    stop() {
      active = false;
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // triggers onstop which sends for transcription
      } else {
        cleanup();
      }
      callbacks.onStateChange(false);
    },

    isSupported: () =>
      !!(
        "mediaDevices" in navigator &&
        (navigator as any).mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
      ),

    engine: () => "mediarecorder",
  };
}

// ── Hybrid: WebSpeech first, auto-fallback to MediaRecorder ─────────────────

/**
 * Creates a speech input that tries WebSpeech first, and if it fails with
 * a network/service error (Google blocked by firewall/VPN/GFW), seamlessly
 * switches to the MediaRecorder fallback.
 */
function createHybridSpeechInput(callbacks: SpeechInputCallbacks): SpeechInput {
  const hasMediaRecorder =
    "mediaDevices" in navigator &&
    (navigator as any).mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  let activeInput: SpeechInput | null = null;
  let fallbackUsed = false;
  let currentEngine: "webspeech" | "mediarecorder" = "webspeech";

  // Wrap callbacks so we can intercept the network error
  const wrappedCallbacks: SpeechInputCallbacks = {
    onResult: (text) => callbacks.onResult(text),
    onInterim: (text) => callbacks.onInterim?.(text),
    onStateChange: (_listening: boolean) => {
      // After fallback, suppress ALL events from the dead WebSpeech engine.
      // The MediaRecorder calls callbacks.onStateChange directly, bypassing this wrapper.
      if (fallbackUsed) return;
      callbacks.onStateChange(_listening);
    },
    onError: (msg) => {
      // Check if this is a network error from WebSpeech (Google servers blocked)
      if (
        !fallbackUsed &&
        hasMediaRecorder &&
        (msg.includes("network") || msg.includes("service"))
      ) {
        console.log("[Hybrid] WebSpeech network error — auto-switching to MediaRecorder");
        fallbackUsed = true;
        currentEngine = "mediarecorder";

        callbacks.onInterim?.("");
        callbacks.onError?.("Using recording mode — tap Stop when done speaking.");

        // Create fallback — bypasses the wrapper, calls original callbacks directly
        const fallbackInput = createMediaRecorderInput({
          onResult: (text) => callbacks.onResult(text),
          onInterim: (text) => callbacks.onInterim?.(text),
          onStateChange: (listening) => callbacks.onStateChange(listening),
          onError: (err) => callbacks.onError?.(err),
        });
        activeInput = fallbackInput;
        fallbackInput.start(); // auto-start — user already clicked Speak once
        return;
      }

      // Check if this is a network error but we have no MediaRecorder fallback
      if (
        !fallbackUsed &&
        !hasMediaRecorder &&
        (msg.includes("network") || msg.includes("service"))
      ) {
        callbacks.onError?.(
          "Speech recognition unavailable — Google's servers may be blocked on this network. Please type your speech instead."
        );
        return;
      }

      // Pass through other errors
      callbacks.onError?.(msg);
    },
  };

  // Start with WebSpeech — on network error it will auto-switch
  const webSpeechInput = createWebSpeechInput(wrappedCallbacks);
  activeInput = webSpeechInput;

  return {
    start() {
      activeInput?.start();
    },
    stop() {
      activeInput?.stop();
    },
    isSupported: () => true, // Always at least try WebSpeech
    engine: () => currentEngine,
  };
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createSpeechInput(callbacks: SpeechInputCallbacks): SpeechInput {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const hasMediaRecorder =
    "mediaDevices" in navigator &&
    (navigator as any).mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  // If WebSpeech is available, use hybrid (auto-fallback on network error)
  if (SpeechRecognition) {
    return createHybridSpeechInput(callbacks);
  }

  // No WebSpeech — use MediaRecorder directly
  if (hasMediaRecorder) {
    return createMediaRecorderInput(callbacks);
  }

  // Nothing supported
  return {
    start() {
      callbacks.onError?.(
        "Speech input is not supported in this browser. Please use Chrome, Edge, Safari, or type your speech below."
      );
    },
    stop() {},
    isSupported: () => false,
    engine: () => "none",
  };
}

/**
 * Quick check: is ANY form of speech input supported in this browser?
 */
export function isSpeechInputSupported(): boolean {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRecognition) return true;
  return !!(
    "mediaDevices" in navigator &&
    (navigator as any).mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}
