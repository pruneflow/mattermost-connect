// src/core/services/wsService.ts
/**
 * WebSocket service for real-time communication with Mattermost
 */

/**
 * Type for WebSocket message handlers
 */
export type MessageHandler = (data: any) => void;

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  /** Callback invoked when connection opens */
  onOpen?: () => void;
  /** Callback invoked when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Callback invoked when an error occurs */
  onError?: (event: Event) => void;
  /** Interval in ms for sending ping messages */
  pingInterval?: number;
}

/**
 * Standard Mattermost WebSocket event types
 */
export enum WebSocketEventType {
  POSTED = "posted",
  POST_EDITED = "post_edited",
  POST_DELETED = "post_deleted",
  CHANNEL_VIEWED = "channel_viewed",
  CHANNEL_CREATED = "channel_created",
  CHANNEL_UPDATED = "channel_updated",
  CHANNEL_DELETED = "channel_deleted",
  CHANNEL_MEMBER_UPDATED = "channel_member_updated",
  USER_ADDED = "user_added",
  USER_REMOVED = "user_removed",
  USER_UPDATED = "user_updated",
  USER_ROLE_UPDATED = "user_role_updated",
  STATUS_CHANGE = "status_change",
  TYPING = "typing",
  ADDED_TO_TEAM = "added_to_team",
  LEAVE_TEAM = "leave_team",
  UPDATE_TEAM = "update_team",
  DELETE_TEAM = "delete_team",
  REACTION_ADDED = "reaction_added",
  REACTION_REMOVED = "reaction_removed",
  PREFERENCES_CHANGED = "preferences_changed",
  ALL = "*",
}

/**
 * WebSocket service for real-time communication with Mattermost
 * Manages connection, authentication, reconnection, and message handling
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private sequence: number = 1;
  private handlerCount: number = 0;

  /**
   * Connects to the WebSocket server
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   */
  public async connect(
    url: string,
    token: string,
    options: WebSocketOptions = {},
  ): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send authentication challenge
        this.sendAuthChallenge(token);

        // Set up ping interval
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

        // Clean up resources
        this.cleanup();

        // Try to reconnect unless connection was intentionally closed
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
        if (options.onError) {
          options.onError(event);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Process different types of messages
          const eventType = message.event || "unknown";

          // Notify handlers registered for this event type
          this.notifyHandlers(eventType, message.data || message);

          // Notify generic handlers (for all messages)
          this.notifyHandlers(WebSocketEventType.ALL, message);
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
    } catch (error) {
      this.isConnecting = false;

      // Try to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect(url, token, options);
      }

      throw error;
    }
  }

  /**
   * Disconnects from the WebSocket server
   * @param code Close code
   * @param reason Reason for closing
   */
  public disconnect(
    code: number = 1000,
    reason: string = "User initiated",
  ): void {
    if (!this.socket) {
      return;
    }

    // Clean up resources
    this.cleanup();

    // Close the connection
    if (
      this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING
    ) {
      this.socket.close(code, reason);
    }

    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Sends the authentication challenge to the server
   * @param token Authentication token
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
   * Starts the ping interval to keep the connection alive
   * @param interval Ping interval in milliseconds
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
   * Stops the ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedules a reconnection attempt
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   */
  private scheduleReconnect(
    url: string,
    token: string,
    options: WebSocketOptions,
  ): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect(url, token, options);
    }, delay);
  }

  /**
   * Cleans up resources
   */
  private cleanup(): void {
    this.stopPingInterval();

    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Sends a message to the server
   * @param message Message to send
   * @returns Whether the message was sent successfully
   */
  public send(message: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      // Convert to JSON string if not already a string
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
   * Adds a handler for a specific event type
   * @param eventType Event type to handle
   * @param handler Handler function
   * @returns Function to remove the handler
   */
  public addMessageHandler(
    eventType: string,
    handler: MessageHandler,
  ): () => void {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, new Set());
    }

    const handlers = this.messageHandlers.get(eventType)!;
    handlers.add(handler);

    // Increment handler count
    this.handlerCount++;

    // Return a function to remove the handler
    return () => {
      const handlers = this.messageHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);

        // Decrement handler count
        this.handlerCount--;

        // Clean up the set if it's empty
        if (handlers.size === 0) {
          this.messageHandlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Notifies all handlers registered for an event type
   * @param eventType Event type
   * @param data Event data
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
   * Checks if the WebSocket is connected
   * @returns Whether the WebSocket is connected
   */
  public isSocketConnected(): boolean {
    return (
      this.isConnected &&
      this.socket !== null &&
      this.socket.readyState === WebSocket.OPEN
    );
  }

  /**
   * Gets the current state of the WebSocket
   * @returns WebSocket ready state
   */
  public getState(): number {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  /**
   * Gets the number of registered handlers
   * @returns Number of handlers
   */
  public getHandlerCount(): number {
    return this.handlerCount;
  }

  /**
   * Forces a reconnection
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   */
  public forceReconnect(
    url: string,
    token: string,
    options: WebSocketOptions = {},
  ): void {
    if (this.socket) {
      this.disconnect(1000, "Reconnection requested");
    }

    this.reconnectAttempts = 0;
    this.connect(url, token, options);
  }
}

/**
 * Singleton instance of the WebSocket service
 */
export const wsService = new WebSocketService();
