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
  /** Time of last disconnection */
  lastDisconnectedAt: number | null;
  /** Whether we've had a successful connection that later disconnected */
  hasBeenDisconnected: boolean;

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
  /** Resets the disconnected state after recovery */
  resetDisconnectedState: () => void;
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
  lastDisconnectedAt: null,
  hasBeenDisconnected: false,

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
          const now = Date.now();
          const wasDisconnected = get().hasBeenDisconnected;

          set({
            isConnected: true,
            isConnecting: false,
            reconnectAttempts: 0,
            lastConnectedAt: now,
            error: null,
          });

          // If this is a reconnect, we'll leave hasBeenDisconnected true
          // so the app can detect this reconnection and refresh data if needed
          if (!wasDisconnected) {
            set({ hasBeenDisconnected: false });
          }
        },
        onClose: (event) => {
          const now = Date.now();

          set({
            isConnected: false,
            isConnecting: false,
            lastDisconnectedAt: now,
            hasBeenDisconnected: true,
          });

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
            lastDisconnectedAt: Date.now(),
            hasBeenDisconnected: true,
          });
        },
        pingInterval: 30000,
      });
    } catch (error) {
      set({
        error: error as Error,
        isConnecting: false,
        lastDisconnectedAt: Date.now(),
        hasBeenDisconnected: true,
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
      lastDisconnectedAt: Date.now(),
      hasBeenDisconnected: true,
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
    const now = Date.now();
    set({
      isConnected,
      lastConnectedAt: isConnected ? now : get().lastConnectedAt,
      lastDisconnectedAt: !isConnected ? now : get().lastDisconnectedAt,
      hasBeenDisconnected: !isConnected ? true : get().hasBeenDisconnected,
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

  /**
   * Resets the disconnected state after recovery
   * Used when the application has handled reconnection-related data refreshes
   */
  resetDisconnectedState: () => {
    set({ hasBeenDisconnected: false });
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
