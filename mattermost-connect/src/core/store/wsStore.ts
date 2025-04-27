// src/core/store/wsStore.ts
import { create } from "zustand";
import { wsService } from "../services/wsService";

interface WebsocketState {
  isConnected: boolean;
  isConnecting: boolean;
  url: string | null;
  error: Error | null;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  hasBeenDisconnected: boolean;
}

export const useWsStore = create<
  WebsocketState & {
    connect: (url: string, token: string) => Promise<void>;
    disconnect: () => void;
    sendMessage: (message: any) => boolean;
    setConnected: (isConnected: boolean) => void;
    setConnecting: (isConnecting: boolean) => void;
    setError: (error: Error | null) => void;
    setReconnectAttempts: (attempts: number) => void;
    resetDisconnectedState: () => void;
    reset: () => void;
  }
>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  url: null,
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  hasBeenDisconnected: false,

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

  disconnect: () => {
    wsService.disconnect();
    set({
      isConnected: false,
      isConnecting: false,
      lastDisconnectedAt: Date.now(),
      hasBeenDisconnected: true,
    });
  },

  sendMessage: (message: any) => {
    return wsService.send(message);
  },

  setConnected: (isConnected: boolean) => {
    const now = Date.now();
    set({
      isConnected,
      lastConnectedAt: isConnected ? now : get().lastConnectedAt,
      lastDisconnectedAt: !isConnected ? now : get().lastDisconnectedAt,
      hasBeenDisconnected: !isConnected ? true : get().hasBeenDisconnected,
    });
  },

  setConnecting: (isConnecting: boolean) => {
    set({ isConnecting });
  },

  setError: (error: Error | null) => {
    set({ error });
  },

  setReconnectAttempts: (attempts: number) => {
    set({ reconnectAttempts: attempts });
  },

  resetDisconnectedState: () => {
    set({ hasBeenDisconnected: false });
  },

  reset: () => {
    set({
      isConnected: false,
      isConnecting: false,
      url: null,
      error: null,
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      hasBeenDisconnected: false,
    });
  },
}));
