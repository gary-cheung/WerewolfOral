import { WSMessage, GameRoom } from "@shared/schema";

type MessageHandler = (message: WSMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: number | null = null;
  private connectionPromise: Promise<void> | null = null;

  connect(): Promise<void> {
    // Return existing promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Return immediately if already connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.connectionPromise = null; // Clear after successful connection
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        this.connectionPromise = null;
        // Attempt reconnect after 3 seconds
        this.reconnectTimer = window.setTimeout(() => {
          this.connect();
        }, 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionPromise = null;
        reject(error);
      };
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const wsClient = new WebSocketClient();
