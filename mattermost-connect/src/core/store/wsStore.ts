// src/core/store/wsStore.ts
/**
 * WebSocket store
 * Manages WebSocket connection state and event subscription
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { WebSocketOptions, WebSocketMessage, EventType } from "../../types";
import { wsService } from "../services/wsService";
import { emitEvent } from "./eventStore";
import { createLoadingSlice } from "./storeUtils";

/**
 * WebSocket store state interface
 */
interface WebSocketState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  url: string | null;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  hasBeenDisconnected: boolean;
  error: Error | null;
}

/**
 * WebSocket store state and actions
 */
interface WebSocketStoreState extends WebSocketState {
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

  // Actions - Event Handling
  addMessageHandler: <T = any>(
    eventType: string,
    handler: (data: T) => void,
  ) => () => void;
  addMessageHandlers: <T = any>(
    handlers: Record<string, (data: T) => void>,
  ) => () => void;

  // Actions - State Management
  setConnected: (isConnected: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setUrl: (url: string | null) => void;
  setError: (error: Error | null) => void;
  resetDisconnectedState: () => void;

  // Reset
  reset: () => void;
}

/**
 * WebSocket store implementation with Zustand and immer
 */
export const useWsStore = create<WebSocketStoreState>()(
  immer((set, get) => {
    // Create loading slice for standard loading/error state
    const loadingSlice = createLoadingSlice<any>(set);

    // Set up connection state event listener
    wsService.on("connection", (data: any) => {
      if (data.isConnected) {
        set((state) => {
          state.isConnected = true;
          state.isConnecting = false;
          state.lastConnectedAt = data.timestamp;
          state.reconnectAttempts = 0;
        });

        // Emit connected event
        emitEvent(EventType.WEBSOCKET_CONNECTED, { timestamp: data.timestamp });
      } else {
        set((state) => {
          state.isConnected = false;
          state.isConnecting = false;
          state.lastDisconnectedAt = data.timestamp;
          state.hasBeenDisconnected = true;
        });

        // Emit disconnected event
        emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
          code: data.code,
          reason: data.reason,
          timestamp: data.timestamp,
        });
      }
    });

    // Set up error event listener
    wsService.on("error", (data: any) => {
      set((state) => {
        state.error = data.error;
      });

      // Emit error event
      emitEvent(EventType.WEBSOCKET_ERROR, {
        error: data.error,
        timestamp: data.timestamp,
      });
    });

    return {
      // Initial state
      isConnected: false,
      isConnecting: false,
      url: null,
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      hasBeenDisconnected: false,

      // Include loading slice state
      ...loadingSlice,

      /**
       * Connects to a WebSocket server
       * @param url WebSocket server URL
       * @param token Authentication token
       * @param options Connection options
       */
      connect: async (
        url: string,
        token: string,
        options?: WebSocketOptions,
      ) => {
        // Update state to connecting
        set((state) => {
          state.isConnecting = true;
          state.url = url;
          state.hasBeenDisconnected = false;
        });

        try {
          // Connect using WebSocket service
          await wsService.connect(url, token, options);
        } catch (error) {
          // Update state on connection failure
          set((state) => {
            state.isConnecting = false;
            state.lastDisconnectedAt = Date.now();
            state.hasBeenDisconnected = true;
            state.reconnectAttempts++;
            state.error = error as Error;
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
      },

      /**
       * Reconnects to WebSocket server
       * @param url WebSocket server URL
       * @param token Authentication token
       * @param options Connection options
       */
      reconnect: async (
        url: string,
        token: string,
        options?: WebSocketOptions,
      ) => {
        // Reset reconnect attempts
        set((state) => {
          state.reconnectAttempts = 0;
        });

        // Force reconnect via service
        return wsService.forceReconnect(url, token, options);
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
       * Adds a WebSocket event handler
       * @param eventType Event type to handle
       * @param handler Handler function
       * @returns Function to remove the handler
       */
      addMessageHandler: <T = any>(
        eventType: string,
        handler: (data: T) => void,
      ): (() => void) => {
        return wsService.on(eventType, handler);
      },

      /**
       * Adds multiple WebSocket event handlers
       * @param handlers Map of event types to handlers
       * @returns Function to remove all handlers
       */
      addMessageHandlers: <T = any>(
        handlers: Record<string, (data: T) => void>,
      ): (() => void) => {
        return wsService.onMultiple(handlers);
      },

      /**
       * Sets the connected state
       * @param isConnected Connected state
       */
      setConnected: (isConnected: boolean) => {
        const now = Date.now();

        set((state) => {
          state.isConnected = isConnected;

          if (isConnected) {
            state.lastConnectedAt = now;
          } else {
            state.lastDisconnectedAt = now;
            state.hasBeenDisconnected = true;
          }
        });

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
        set((state) => {
          state.isConnecting = isConnecting;
        });
      },

      /**
       * Sets the WebSocket URL
       * @param url WebSocket URL
       */
      setUrl: (url: string | null) => {
        set((state) => {
          state.url = url;
        });
      },

      /**
       * Sets the error state
       * @param error Error object
       */
      setError: (error: Error | null) => {
        set((state) => {
          state.error = error;
        });

        if (error) {
          // Emit error event
          emitEvent(EventType.WEBSOCKET_ERROR, {
            error,
            timestamp: Date.now(),
          });
        }
      },

      /**
       * Resets the disconnected state
       */
      resetDisconnectedState: () => {
        set((state) => {
          state.hasBeenDisconnected = false;
        });
      },

      /**
       * Resets the store to initial state
       */
      reset: () => {
        // Close any existing connection
        if (wsService.isSocketConnected()) {
          wsService.disconnect();
        }

        set((state) => {
          state.isConnected = false;
          state.isConnecting = false;
          state.url = null;
          state.reconnectAttempts = 0;
          state.lastConnectedAt = null;
          state.lastDisconnectedAt = null;
          state.hasBeenDisconnected = false;
          state.error = null;
        });
      },
    };
  }),
);

/**
 * Message handler type
 */
export type MessageHandler<T = any> = (data: T) => void;

/**
 * Helper function to register a WebSocket event handler
 * @param eventType Event type to listen for
 * @param handler Event handler function
 * @returns Function to unregister handler
 */
export function registerWsHandler<T = any>(
  eventType: string,
  handler: MessageHandler<T>,
): () => void {
  return useWsStore.getState().addMessageHandler(eventType, handler);
}

/**
 * Helper function to register multiple WebSocket event handlers
 * @param handlers Map of event types to handlers
 * @returns Function to unregister all handlers
 */
export function registerWsHandlers<T = any>(
  handlers: Record<string, MessageHandler<T>>,
): () => void {
  return useWsStore.getState().addMessageHandlers(handlers);
}
