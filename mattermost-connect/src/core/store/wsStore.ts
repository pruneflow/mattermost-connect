// src/core/store/wsStore.ts
/**
 * WebSocket store
 * Manages WebSocket connection and messaging
 */
import { create } from "zustand";
import {
  WebsocketState,
  WebSocketOptions,
  WebSocketMessage,
  MessageHandler,
  EventType,
  ErrorSource,
} from "../../types";
import { wsService } from "../services/wsService";
import { emitEvent } from "./eventStore";
import { handleError } from "./errorStore";

/**
 * WebSocket store state and actions
 */
interface WebSocketStoreState extends WebsocketState {
  // Actions - Connection
  connect: (
    url: string,
    token: string,
    options?: WebSocketOptions,
  ) => Promise<void>;
  disconnect: (code?: number, reason?: string) => void;
  reconnect: (
    url: string,
    token: string,
    options?: WebSocketOptions,
  ) => Promise<void>;

  // Actions - Messaging
  sendMessage: (message: WebSocketMessage | string) => boolean;

  // Actions - State Management
  setConnected: (isConnected: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setUrl: (url: string | null) => void;
  setError: (error: Error | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  resetDisconnectedState: () => void;

  // Reset
  reset: () => void;
}

/**
 * WebSocket store for managing WebSocket connections
 */
export const useWsStore = create<WebSocketStoreState>()((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  url: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  hasBeenDisconnected: false,

  /**
   * Connects to a WebSocket server
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   */
  connect: async (url: string, token: string, options?: WebSocketOptions) => {
    // Update state to connecting
    set({
      isConnecting: true,
      url,
      hasBeenDisconnected: false,
    });

    try {
      // Create enhanced options
      const enhancedOptions: WebSocketOptions = {
        ...options,
        onOpen: () => {
          const now = Date.now();

          // Update connection state
          set({
            isConnected: true,
            isConnecting: false,
            lastConnectedAt: now,
            reconnectAttempts: 0,
          });

          // Emit connected event
          emitEvent(EventType.WEBSOCKET_CONNECTED, { url, timestamp: now });

          // Call original onOpen if provided
          if (options?.onOpen) {
            options.onOpen();
          }
        },
        onClose: (event) => {
          const now = Date.now();

          // Update connection state
          set((state) => ({
            isConnected: false,
            isConnecting: false,
            lastDisconnectedAt: now,
            hasBeenDisconnected: true,
            // Only increment reconnect attempts for unexpected closes
            reconnectAttempts:
              event.code !== 1000
                ? state.reconnectAttempts + 1
                : state.reconnectAttempts,
          }));

          // Emit disconnected event
          emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
            code: event.code,
            reason: event.reason,
            timestamp: now,
          });

          // Call original onClose if provided
          if (options?.onClose) {
            options.onClose(event);
          }
        },
        onError: (event) => {
          const now = Date.now();
          const error = new Error("WebSocket connection error");

          // Update error state
          set({
            isConnected: false,
            isConnecting: false,
            lastDisconnectedAt: now,
            hasBeenDisconnected: true,
          });

          // Handle error
          handleError(error, ErrorSource.WEBSOCKET);

          // Emit error event
          emitEvent(EventType.WEBSOCKET_ERROR, {
            error,
            timestamp: now,
          });

          // Call original onError if provided
          if (options?.onError) {
            options.onError(event);
          }
        },
      };

      // Connect using WebSocket service
      await wsService.connect(url, token, enhancedOptions);
    } catch (error) {
      // Update state on connection failure
      set((state) => ({
        isConnecting: false,
        lastDisconnectedAt: Date.now(),
        hasBeenDisconnected: true,
        reconnectAttempts: state.reconnectAttempts + 1,
      }));

      // Handle error
      handleError(error as Error, ErrorSource.WEBSOCKET);

      // Emit error event
      emitEvent(EventType.WEBSOCKET_ERROR, {
        error,
        timestamp: Date.now(),
        context: "connection",
      });

      throw error;
    }
  },

  /**
   * Disconnects from WebSocket server
   * @param code Close code
   * @param reason Reason for closing
   */
  disconnect: (code = 1000, reason = "User initiated") => {
    wsService.disconnect(code, reason);

    set({
      isConnected: false,
      isConnecting: false,
      lastDisconnectedAt: Date.now(),
      hasBeenDisconnected: true,
    });

    // Emit disconnected event
    emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
      code,
      reason,
      userInitiated: true,
      timestamp: Date.now(),
    });
  },

  /**
   * Reconnects to WebSocket server
   * @param url WebSocket server URL
   * @param token Authentication token
   * @param options Connection options
   */
  reconnect: async (url: string, token: string, options?: WebSocketOptions) => {
    // Disconnect first if connected
    if (wsService.isSocketConnected()) {
      wsService.disconnect(1000, "Reconnection requested");
    }

    // Reset reconnect attempts
    set({ reconnectAttempts: 0 });

    // Connect again
    return get().connect(url, token, options);
  },

  /**
   * Sends a message via WebSocket
   * @param message Message to send
   * @returns Whether message was sent
   */
  sendMessage: (message: WebSocketMessage | string) => {
    return wsService.send(message);
  },

  /**
   * Sets the connected state
   * @param isConnected Connected state
   */
  setConnected: (isConnected: boolean) => {
    const now = Date.now();

    set((state) => ({
      isConnected,
      lastConnectedAt: isConnected ? now : state.lastConnectedAt,
      lastDisconnectedAt: !isConnected ? now : state.lastDisconnectedAt,
      hasBeenDisconnected: !isConnected ? true : state.hasBeenDisconnected,
    }));

    // Emit appropriate event
    if (isConnected) {
      emitEvent(EventType.WEBSOCKET_CONNECTED, {
        timestamp: now,
        reconnected: true,
      });
    } else {
      emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
        timestamp: now,
        reason: "Connection state changed",
      });
    }
  },

  /**
   * Sets the connecting state
   * @param isConnecting Connecting state
   */
  setConnecting: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  /**
   * Sets the WebSocket URL
   * @param url WebSocket URL
   */
  setUrl: (url: string | null) => {
    set({ url });
  },

  /**
   * Sets the error state
   * @param error Error object
   */
  setError: (error: Error | null) => {
    if (error) {
      handleError(error, ErrorSource.WEBSOCKET);

      // Emit error event
      emitEvent(EventType.WEBSOCKET_ERROR, {
        error,
        timestamp: Date.now(),
      });
    }
  },

  /**
   * Increments the reconnect attempts counter
   */
  incrementReconnectAttempts: () => {
    set((state) => ({
      reconnectAttempts: state.reconnectAttempts + 1,
    }));
  },

  /**
   * Resets the reconnect attempts counter
   */
  resetReconnectAttempts: () => {
    set({ reconnectAttempts: 0 });
  },

  /**
   * Resets the disconnected state
   */
  resetDisconnectedState: () => {
    set({ hasBeenDisconnected: false });
  },

  /**
   * Resets the store to initial state
   */
  reset: () => {
    // Close any existing connection
    if (wsService.isSocketConnected()) {
      wsService.disconnect();
    }

    set({
      isConnected: false,
      isConnecting: false,
      url: null,
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      hasBeenDisconnected: false,
    });
  },
}));

/**
 * Définition du type MessageHandler générique
 */
export type GenericMessageHandler<T = any> = (data: T) => void;

/**
 * Registers a WebSocket event handler
 * @param eventType WebSocket event type
 * @param handler Event handler
 * @returns Function to unregister handler
 */
export function registerWsHandler<T = any>(
  eventType: string,
  handler: GenericMessageHandler<T>,
): () => void {
  return wsService.addMessageHandler(eventType, handler as MessageHandler);
}

/**
 * Registers multiple WebSocket event handlers
 * @param handlers Map of event types to handlers
 * @returns Function to unregister all handlers
 */
export function registerWsHandlers(
  handlers: Record<string, MessageHandler>,
): () => void {
  // Create unregister functions for each handler
  const unregisterFunctions: Array<() => void> = [];

  Object.entries(handlers).forEach(([eventType, handler]) => {
    unregisterFunctions.push(registerWsHandler(eventType, handler));
  });

  // Return function to unregister all handlers
  return () => {
    unregisterFunctions.forEach((unregister) => unregister());
  };
}
