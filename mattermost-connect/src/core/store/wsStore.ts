// src/core/store/wsStore.ts
/**
 * WebSocket store
 * Manages WebSocket connection state and event subscription
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import {
  WebSocketOptions,
  WebSocketMessage,
  EventType,
  ErrorSource,
  WebSocketState,
  WebSocketStore,
} from "../../types";
import { wsService } from "../services/wsService";
import { createCommonSlice } from "./slices/commonSlice";
import { emitEvent } from "../api/eventUtils";
import { handleError } from "./errorStore";

/**
 * WebSocket store implementation with Zustand
 * Uses immer middleware for immutable state updates
 * Uses subscribeWithSelector for observing state changes
 */
export const useWsStore = create<WebSocketState & WebSocketStore>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<WebSocketState>(set);

      // Set up connection state event listener
      wsService.on("connection", (data: any) => {
        if (data.isConnected) {
          set((state) => {
            state.isConnected = true;
            state.isConnecting = false;
            state.lastConnectedAt = data.timestamp;
            state.reconnectAttempts = 0;
            state.lastUpdated = Date.now();
          });

          // Emit connected event
          emitEvent(EventType.WEBSOCKET_CONNECTED, {
            timestamp: data.timestamp,
          });
        } else {
          set((state) => {
            state.isConnected = false;
            state.isConnecting = false;
            state.lastDisconnectedAt = data.timestamp;
            state.hasBeenDisconnected = true;
            state.lastUpdated = Date.now();
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
          state.lastUpdated = Date.now();
        });

        // Emit error event
        emitEvent(EventType.WEBSOCKET_ERROR, {
          error: data.error,
          timestamp: data.timestamp,
        });
      });

      return {
        // Include common slice for standardized state
        ...commonSlice,

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
        connect: async (
          url: string,
          token: string,
          options?: WebSocketOptions,
        ) => {
          try {
            // Update state to connecting
            set((state) => {
              state.isConnecting = true;
              state.url = url;
              state.hasBeenDisconnected = false;
              state.lastUpdated = Date.now();
            });

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
              state.lastUpdated = Date.now();
            });

            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "connect",
              url,
              reconnectAttempts: get().reconnectAttempts,
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
          try {
            wsService.disconnect(code, reason);

            // State is updated via the connection event listener
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "disconnect",
              code,
              reason,
            });
          }
        },

        /**
         * Reconnects to WebSocket server
         * @param url WebSocket server URL
         * @param token Authentication token
         * @param options Connection options
         */
        reconnect: async (
          url?: string,
          token?: string,
          options?: WebSocketOptions,
        ) => {
          try {
            // Use stored values if not provided
            const connectUrl = url || get().url || "";
            const connectToken = token || "";

            if (!connectUrl) {
              throw new Error("Cannot reconnect: No URL available");
            }

            // Reset reconnect attempts
            set((state) => {
              state.reconnectAttempts = 0;
              state.lastUpdated = Date.now();
            });

            // Emit event for reconnection attempt
            emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
              reason: "Reconnection requested",
              timestamp: Date.now(),
              reconnectAttempted: true,
            });

            // Force reconnect via service
            return wsService.forceReconnect(connectUrl, connectToken, options);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "reconnect",
              url,
            });

            throw error;
          }
        },

        /**
         * Sends a message via WebSocket
         * @param message Message to send
         * @returns Whether message was sent
         */
        sendMessage: (message: WebSocketMessage | string) => {
          try {
            return wsService.send(message);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "sendMessage",
              messageType: typeof message === "string" ? "string" : "object",
            });

            return false;
          }
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
          try {
            return wsService.on(eventType, handler);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "addMessageHandler",
              eventType,
            });

            // Return empty function as fallback
            return () => {};
          }
        },

        /**
         * Adds multiple WebSocket event handlers
         * @param handlers Map of event types to handlers
         * @returns Function to remove all handlers
         */
        addMessageHandlers: <T = any>(
          handlers: Record<string, (data: T) => void>,
        ): (() => void) => {
          try {
            return wsService.onMultiple(handlers);
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "addMessageHandlers",
              handlerCount: Object.keys(handlers).length,
            });

            // Return empty function as fallback
            return () => {};
          }
        },

        /**
         * Sets the connected state
         * @param isConnected Connected state
         */
        setConnected: (isConnected: boolean) => {
          try {
            const now = Date.now();

            set((state) => {
              state.isConnected = isConnected;

              if (isConnected) {
                state.lastConnectedAt = now;
              } else {
                state.lastDisconnectedAt = now;
                state.hasBeenDisconnected = true;
              }

              state.lastUpdated = now;
            });

            // Emit appropriate event
            if (isConnected) {
              emitEvent(EventType.WEBSOCKET_CONNECTED, {
                timestamp: now,
                reconnected: get().reconnectAttempts > 0,
              });
            } else {
              emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
                timestamp: now,
                reason: "Connection state changed",
              });
            }
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "setConnected",
              isConnected,
            });
          }
        },

        /**
         * Sets the connecting state
         * @param isConnecting Connecting state
         */
        setConnecting: (isConnecting: boolean) => {
          try {
            set((state) => {
              state.isConnecting = isConnecting;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "setConnecting",
              isConnecting,
            });
          }
        },

        /**
         * Sets the WebSocket URL
         * @param url WebSocket URL
         */
        setUrl: (url: string | null) => {
          try {
            set((state) => {
              state.url = url;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "setUrl",
              url,
            });
          }
        },

        /**
         * Sets the error state
         * @param error Error object
         */
        setError: (error: Error | null) => {
          try {
            set((state) => {
              state.error = error;
              state.lastUpdated = Date.now();
            });

            if (error) {
              // Emit error event using standard event system
              emitEvent(EventType.WEBSOCKET_ERROR, {
                error,
                timestamp: Date.now(),
              });
            }
          } catch (e) {
            // Don't use handleError here to avoid potential loops
            console.error("Error in setError:", e);
          }
        },

        /**
         * Resets the disconnected state
         */
        resetDisconnectedState: () => {
          try {
            set((state) => {
              state.hasBeenDisconnected = false;
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "resetDisconnectedState",
            });
          }
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          try {
            // Close any existing connection
            if (wsService.isSocketConnected()) {
              wsService.disconnect();
            }

            set((state) => {
              // Reset domain-specific state
              state.isConnected = false;
              state.isConnecting = false;
              state.url = null;
              state.reconnectAttempts = 0;
              state.lastConnectedAt = null;
              state.lastDisconnectedAt = null;
              state.hasBeenDisconnected = false;

              // Reset common state from CommonSlice
              state.isLoading = false;
              state.loadingIds = [];
              state.error = null;
              state.errors = {};
              state.lastFetchTimes = {};
              state.lastUpdated = Date.now();
            });
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.WEBSOCKET, undefined, {
              action: "reset",
            });
          }
        },
      };
    }),
  ),
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
  try {
    return useWsStore.getState().addMessageHandler(eventType, handler);
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "registerWsHandler",
      eventType,
    });
    return () => {};
  }
}

/**
 * Helper function to register multiple WebSocket event handlers
 * @param handlers Map of event types to handlers
 * @returns Function to unregister all handlers
 */
export function registerWsHandlers<T = any>(
  handlers: Record<string, MessageHandler<T>>,
): () => void {
  try {
    return useWsStore.getState().addMessageHandlers(handlers);
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "registerWsHandlers",
      handlerCount: Object.keys(handlers).length,
    });
    return () => {};
  }
}

/**
 * Checks if the WebSocket is currently connected
 * @returns Whether the WebSocket is connected
 */
export function isWsConnected(): boolean {
  try {
    return useWsStore.getState().isConnected;
  } catch (error) {
    handleError(error as Error, ErrorSource.UI, undefined, {
      action: "isWsConnected",
    });
    return false;
  }
}
