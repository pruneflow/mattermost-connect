// src/core/store/wsStore.ts
/**
 * Zustand store for WebSocket state
 */
import { create } from "zustand";
import { wsService } from "../services/wsService";

/**
 * WebSocket state
 */
export interface WebSocketState {
  // State
  /** Whether the WebSocket is connected */
  isConnected: boolean;
  /** Whether the WebSocket is connecting */
  isConnecting: boolean;
  /** WebSocket URL */
  url: string | null;
  /** Error that occurred during connection */
  error: Error | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Time of last successful connection */
  lastConnectedAt: number | null;

  // Actions
  /** Connects to the WebSocket server */
  connect: (url: string, token: string) => Promise<void>;
  /** Disconnects from the WebSocket server */
  disconnect: () => void;
  /** Sends a message via WebSocket */
  sendMessage: (message: any) => boolean;
  /** Sets the connected state */
  setConnected: (isConnected: boolean) => void;
  /** Sets the connecting state */
  setConnecting: (isConnecting: boolean) => void;
  /** Sets the error state */
  setError: (error: Error | null) => void;
  /** Sets the reconnect attempts */
  setReconnectAttempts: (attempts: number) => void;
}

/**
 * Create the WebSocket store
 */
export const useWsStore = create<WebSocketState>()((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  url: null,
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,

  /**
   * Connects to the WebSocket server
   * @param url WebSocket server URL
   * @param token Authentication token
   */
  connect: async (url: string, token: string) => {
    set({ isConnecting: true, url, error: null });

    try {
      await wsService.connect(url, token, {
        onOpen: () => {
          set({
            isConnected: true,
            isConnecting: false,
            reconnectAttempts: 0,
            lastConnectedAt: Date.now(),
            error: null,
          });
        },
        onClose: (event) => {
          set({ isConnected: false, isConnecting: false });

          // Only increment reconnect attempts for unexpected closes
          if (event.code !== 1000) {
            set((state) => ({
              reconnectAttempts: state.reconnectAttempts + 1,
            }));
          }
        },
        onError: (event) => {
          set({
            error: new Error("WebSocket connection error"),
            isConnecting: false,
          });
        },
        pingInterval: 30000,
      });
    } catch (error) {
      set({
        error: error as Error,
        isConnecting: false,
      });

      // Increment reconnect attempts
      set((state) => ({
        reconnectAttempts: state.reconnectAttempts + 1,
      }));

      throw error;
    }
  },

  /**
   * Disconnects from the WebSocket server
   */
  disconnect: () => {
    wsService.disconnect();
    set({
      isConnected: false,
      isConnecting: false,
    });
  },

  /**
   * Sends a message via WebSocket
   * @param message Message to send
   * @returns Whether the message was sent successfully
   */
  sendMessage: (message: any) => {
    return wsService.send(message);
  },

  /**
   * Sets the connected state
   * @param isConnected Whether the WebSocket is connected
   */
  setConnected: (isConnected: boolean) => {
    set({
      isConnected,
      lastConnectedAt: isConnected ? Date.now() : get().lastConnectedAt,
    });
  },

  /**
   * Sets the connecting state
   * @param isConnecting Whether the WebSocket is connecting
   */
  setConnecting: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  /**
   * Sets the error state
   * @param error Error to set
   */
  setError: (error: Error | null) => {
    set({ error });
  },

  /**
   * Sets the reconnect attempts
   * @param attempts Number of reconnect attempts
   */
  setReconnectAttempts: (attempts: number) => {
    set({ reconnectAttempts: attempts });
  },
}));

/**
 * Registers a handler for WebSocket messages
 * @param eventType Event type to handle
 * @param handler Handler function
 * @returns Function to remove the handler
 */
export const registerWsHandler = (
  eventType: string,
  handler: (data: any) => void,
): (() => void) => {
  return wsService.addMessageHandler(eventType, handler);
};

/**
 * Registers multiple handlers for WebSocket messages
 * @param handlers Map of event types to handler functions
 * @returns Function to remove all handlers
 */
export const registerWsHandlers = (
  handlers: Record<string, (data: any) => void>,
): (() => void) => {
  const unsubscribers: Array<() => void> = [];

  Object.entries(handlers).forEach(([eventType, handler]) => {
    unsubscribers.push(wsService.addMessageHandler(eventType, handler));
  });

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};
