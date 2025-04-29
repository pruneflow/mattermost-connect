// src/core/services/wsService.ts
/**
 * WebSocket service
 * Provides centralized management of WebSocket connections and events
 */
import { EventEmitter } from "events";
import {
  WebSocketEventType,
  WebSocketMessage,
  WebSocketOptions,
  ErrorSource,
} from "../../types";
import { handleError } from "../store";

/**
 * WebSocket connection states
 */
export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * WebSocket connection information
 */
interface ConnectionInfo {
  url: string | null;
  token: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

/**
 * WebSocket service for managing WebSocket connections and events
 * Implements a pub/sub pattern for event distribution
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private connectionInfo: ConnectionInfo = {
    url: null,
    token: null,
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  };
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private sequence: number = 1;
  private maxReconnectAttempts: number = 5;
  private defaultPingInterval: number = 30000; // 30 seconds

  /**
   * Creates an instance of WebSocketService
   * Sets up the event emitter with increased max listeners
   */
  constructor() {
    // Increase max listeners to accommodate multiple components
    this.eventEmitter.setMaxListeners(50);
  }

  /**
   * Gets current connection state
   * @returns Connection information
   */
  public getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  /**
   * Connects to the WebSocket server
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   * @returns Promise resolving when connected
   */
  public async connect(
    url: string,
    token: string,
    options: WebSocketOptions = {},
  ): Promise<void> {
    // Don't reconnect if already connected or connecting
    if (this.connectionInfo.isConnected || this.connectionInfo.isConnecting) {
      return;
    }

    // Update connection state
    this.connectionInfo.isConnecting = true;
    this.connectionInfo.url = url;
    this.connectionInfo.token = token;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.handleOpen(options);
      };

      this.socket.onclose = (event) => {
        this.handleClose(event, options);
      };

      this.socket.onerror = (event) => {
        this.handleError(event, options);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };
    } catch (error) {
      this.connectionInfo.isConnecting = false;
      this.connectionInfo.lastDisconnectedAt = Date.now();

      // Increment reconnect attempts and schedule reconnect
      this.connectionInfo.reconnectAttempts++;
      this.scheduleReconnect(url, token, options);

      handleError(error as Error, ErrorSource.WEBSOCKET);
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
      this.socket.readyState === WebSocketState.OPEN ||
      this.socket.readyState === WebSocketState.CONNECTING
    ) {
      this.socket.close(code, reason);
    }

    this.socket = null;
    this.connectionInfo.isConnected = false;
    this.connectionInfo.isConnecting = false;
    this.connectionInfo.lastDisconnectedAt = Date.now();

    // Emit disconnection event
    this.emit("connection", {
      isConnected: false,
      code,
      reason,
      userInitiated: true,
    });
  }

  /**
   * Forces a reconnection
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   */
  public async forceReconnect(
    url: string = this.connectionInfo.url || "",
    token: string = this.connectionInfo.token || "",
    options: WebSocketOptions = {},
  ): Promise<void> {
    // Disconnect if connected
    if (this.isSocketConnected()) {
      this.disconnect(1000, "Reconnection requested");
    }

    // Reset reconnect attempts
    this.connectionInfo.reconnectAttempts = 0;

    // Connect again
    return this.connect(url, token, options);
  }

  /**
   * Sends a message to the server
   * @param message Message to send
   * @returns Whether the message was sent successfully
   */
  public send(message: WebSocketMessage | string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocketState.OPEN) {
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
   * Checks if the WebSocket is connected
   * @returns Whether the WebSocket is connected
   */
  public isSocketConnected(): boolean {
    return (
      this.connectionInfo.isConnected &&
      this.socket !== null &&
      this.socket.readyState === WebSocketState.OPEN
    );
  }

  /**
   * Registers an event listener
   * @param eventType Event type to listen for
   * @param listener Event handler function
   * @returns Function to unregister the listener
   */
  public on<T = any>(
    eventType: string,
    listener: (data: T) => void,
  ): () => void {
    this.eventEmitter.on(eventType, listener);

    // Return function to remove the listener
    return () => {
      this.eventEmitter.removeListener(eventType, listener);
    };
  }

  /**
   * Registers multiple event listeners
   * @param listeners Map of event types to event handlers
   * @returns Function to unregister all listeners
   */
  public onMultiple<T = any>(
    listeners: Record<string, (data: T) => void>,
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    // Register each listener
    Object.entries(listeners).forEach(([eventType, listener]) => {
      unsubscribers.push(this.on(eventType, listener));
    });

    // Return function to remove all listeners
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }

  /**
   * Emits an event to registered listeners
   * @param eventType Event type
   * @param data Event data
   */
  private emit<T = any>(eventType: string, data: T): void {
    this.eventEmitter.emit(eventType, data);

    // Also emit to wildcard listeners
    if (eventType !== "*") {
      this.eventEmitter.emit("*", { type: eventType, data });
    }
  }

  /**
   * Handles WebSocket open event
   * @param options Connection options
   */
  private handleOpen(options: WebSocketOptions): void {
    const now = Date.now();

    // Update connection state
    this.connectionInfo.isConnected = true;
    this.connectionInfo.isConnecting = false;
    this.connectionInfo.lastConnectedAt = now;
    this.connectionInfo.reconnectAttempts = 0;

    // Send authentication challenge
    this.sendAuthChallenge();

    // Set up ping interval
    if (options.pingInterval || this.defaultPingInterval) {
      this.startPingInterval(options.pingInterval || this.defaultPingInterval);
    }

    // Call user callback if provided
    if (options.onOpen) {
      options.onOpen();
    }

    // Emit connection event
    this.emit("connection", {
      isConnected: true,
      timestamp: now,
    });
  }

  /**
   * Handles WebSocket close event
   * @param event Close event
   * @param options Connection options
   */
  private handleClose(event: CloseEvent, options: WebSocketOptions): void {
    const now = Date.now();

    // Update connection state
    this.connectionInfo.isConnected = false;
    this.connectionInfo.isConnecting = false;
    this.connectionInfo.lastDisconnectedAt = now;

    // Clean up resources
    this.cleanup();

    // Try to reconnect unless connection was intentionally closed
    if (
      event.code !== 1000 &&
      this.connectionInfo.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.connectionInfo.reconnectAttempts++;
      this.scheduleReconnect(
        this.connectionInfo.url || "",
        this.connectionInfo.token || "",
        options,
      );
    }

    // Call user callback if provided
    if (options.onClose) {
      options.onClose(event);
    }

    // Emit disconnection event
    this.emit("connection", {
      isConnected: false,
      code: event.code,
      reason: event.reason,
      timestamp: now,
    });
  }

  /**
   * Handles WebSocket error event
   * @param event Error event
   * @param options Connection options
   */
  private handleError(event: Event, options: WebSocketOptions): void {
    // Update connection state
    this.connectionInfo.isConnected = false;
    this.connectionInfo.isConnecting = false;
    this.connectionInfo.lastDisconnectedAt = Date.now();

    // Create error object
    const error = new Error("WebSocket connection error");

    // Pass to error handler
    handleError(error, ErrorSource.WEBSOCKET);

    // Call user callback if provided
    if (options.onError) {
      options.onError(event);
    }

    // Emit error event
    this.emit("error", {
      error,
      originalEvent: event,
      timestamp: Date.now(),
    });
  }

  /**
   * Handles WebSocket message event
   * @param event Message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      // Process different types of messages
      const eventType = message.event || "unknown";

      // Emit event for specific event type
      this.emit(eventType, message.data || message);

      // Emit event for all messages
      this.emit(WebSocketEventType.ALL, message);
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  /**
   * Sends authentication challenge
   */
  private sendAuthChallenge(): void {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocketState.OPEN ||
      !this.connectionInfo.token
    ) {
      return;
    }

    const authMessage = {
      seq: this.sequence++,
      action: "authentication_challenge",
      data: {
        token: this.connectionInfo.token,
      },
    };

    this.socket.send(JSON.stringify(authMessage));
  }

  /**
   * Starts the ping interval to keep the connection alive
   * @param interval Ping interval in milliseconds
   */
  private startPingInterval(interval: number): void {
    this.stopPingInterval();

    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocketState.OPEN) {
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

    // Use exponential backoff with a maximum delay
    const delay = Math.min(
      1000 * Math.pow(2, this.connectionInfo.reconnectAttempts),
      30000,
    );

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
}

/**
 * Singleton instance of the WebSocket service
 */
export const wsService = new WebSocketService();
