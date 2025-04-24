// src/core/services/ws.service.ts
/**
 * Service WebSocket pour la gestion des connexions en temps réel
 * Gère la connexion, la déconnexion et les messages WebSocket
 */

import { Store } from "../store/store";

type MessageHandler = (data: any) => void;

export class WebSocketService {
  private store: Store<any>;
  private socket: WebSocket | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private sequence: number = 1;

  constructor(store: Store<any>) {
    this.store = store;
  }

  /**
   * Connecte au serveur WebSocket
   */
  public async connect(
    url: string,
    token: string,
    options: {
      onOpen?: () => void;
      onClose?: (event: CloseEvent) => void;
      onError?: (event: Event) => void;
      pingInterval?: number;
    } = {},
  ): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Dispatch de l'action de connexion en cours
    this.store.dispatch({
      type: "WS_CONNECTING",
      payload: { url },
    });

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Dispatch de l'action de connexion établie
        this.store.dispatch({
          type: "WS_CONNECTED",
          payload: { url, timestamp: Date.now() },
        });

        // Envoyer le challenge d'authentification
        this.sendAuthChallenge(token);

        // Configurer le ping
        if (options.pingInterval) {
          this.startPingInterval(options.pingInterval);
        }

        if (options.onOpen) {
          options.onOpen();
        }
      };

      this.socket.onclose = (event) => {
        this.isConnected = false;
        this.isConnecting = false;

        // Nettoyer les ressources
        this.cleanup();

        // Dispatch de l'action de déconnexion
        this.store.dispatch({
          type: "WS_DISCONNECTED",
          payload: { code: event.code, reason: event.reason },
        });

        // Tenter une reconnexion si ce n'est pas une fermeture intentionnelle
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect(url, token, options);
        }

        if (options.onClose) {
          options.onClose(event);
        }
      };

      this.socket.onerror = (event) => {
        // Dispatch de l'action d'erreur
        this.store.dispatch({
          type: "WS_ERROR",
          payload: { error: event },
        });

        if (options.onError) {
          options.onError(event);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Dispatch de l'action de message reçu
          this.store.dispatch({
            type: "WS_MESSAGE_RECEIVED",
            payload: { message },
          });

          // Traiter les différents types de messages
          const eventType = message.event || "unknown";

          // Notifier les handlers enregistrés pour ce type d'événement
          this.notifyHandlers(eventType, message.data || message);

          // Notifier les handlers génériques (pour tous les messages)
          this.notifyHandlers("*", message);
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
    } catch (error) {
      this.isConnecting = false;

      // Dispatch de l'action d'erreur de connexion
      this.store.dispatch({
        type: "WS_CONNECTION_ERROR",
        payload: { error },
      });

      // Tenter une reconnexion
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect(url, token, options);
      }
    }
  }

  /**
   * Envoie le challenge d'authentification au serveur
   */
  private sendAuthChallenge(token: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const authMessage = {
      seq: this.sequence++,
      action: "authentication_challenge",
      data: {
        token,
      },
    };

    this.socket.send(JSON.stringify(authMessage));
  }

  /**
   * Démarre l'intervalle de ping
   */
  private startPingInterval(interval: number = 30000): void {
    this.stopPingInterval();

    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const pingMessage = {
          seq: this.sequence++,
          action: "ping",
        };
        this.socket.send(JSON.stringify(pingMessage));
      }
    }, interval);
  }

  /**
   * Arrête l'intervalle de ping
   */
  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Planifie une tentative de reconnexion
   */
  private scheduleReconnect(url: string, token: string, options: any): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    // Dispatch de l'action de reconnexion programmée
    this.store.dispatch({
      type: "WS_RECONNECT_SCHEDULED",
      payload: { delay, attempt: this.reconnectAttempts },
    });

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect(url, token, options);
    }, delay);
  }

  /**
   * Déconnecte du serveur WebSocket
   */
  public disconnect(
    code: number = 1000,
    reason: string = "User initiated",
  ): void {
    if (!this.socket) {
      return;
    }

    // Nettoyer les ressources
    this.cleanup();

    // Fermer la connexion
    if (
      this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING
    ) {
      this.socket.close(code, reason);
    }

    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;

    // Dispatch de l'action de déconnexion
    this.store.dispatch({
      type: "WS_DISCONNECTED",
      payload: { code, reason, intentional: true },
    });
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    this.stopPingInterval();

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Envoie un message au serveur WebSocket
   */
  public send(message: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      // Si message n'est pas une chaîne, le convertir en JSON
      const data =
        typeof message === "string"
          ? message
          : JSON.stringify({
              seq: this.sequence++,
              ...message,
            });

      this.socket.send(data);
      return true;
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      return false;
    }
  }

  /**
   * Ajoute un handler pour un type d'événement
   */
  public addMessageHandler(
    eventType: string,
    handler: MessageHandler,
  ): () => void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, new Set());
    }

    this.messageHandlers.get(eventType)!.add(handler);

    // Renvoie une fonction pour supprimer le handler
    return () => {
      const handlers = this.messageHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Notifie tous les handlers enregistrés pour un type d'événement
   */
  private notifyHandlers(eventType: string, data: any): void {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Vérifie si le WebSocket est connecté
   */
  public isSocketConnected(): boolean {
    return (
      this.isConnected &&
      this.socket !== null &&
      this.socket.readyState === WebSocket.OPEN
    );
  }

  /**
   * Récupère l'état actuel du WebSocket
   */
  public getState(): number {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  /**
   * Force une reconnexion
   */
  public forceReconnect(url: string, token: string, options: any = {}): void {
    if (this.socket) {
      this.disconnect(1000, "Reconnection requested");
    }

    this.reconnectAttempts = 0;
    this.connect(url, token, options);
  }
}
