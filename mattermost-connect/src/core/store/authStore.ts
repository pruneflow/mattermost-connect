// src/core/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, authService } from "../services/authService";
import { apiClient } from "../api/client";

export interface AuthState {
  // State
  token: string | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  error: Error | null;
  serverUrl?: string | null;

  // Actions
  initialize: () => Promise<boolean>;
  login: (
    username: string,
    password: string,
    serverUrl?: string,
  ) => Promise<User>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;
  setCurrentUser: (user: User) => void;
  setError: (error: Error | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      currentUser: null,
      isAuthenticated: false,
      isAuthenticating: false,
      error: null,

      initialize: async () => {
        try {
          set({ isAuthenticating: true, error: null });

          const isAuthenticated = await authService.initializeAuth();

          if (isAuthenticated) {
            const user = await authService.getCurrentUser();

            if (user) {
              const token = authService.getStoredToken();
              const serverUrl = authService.getStoredServerUrl();

              set({
                isAuthenticated: true,
                currentUser: user,
                token,
                serverUrl,
                isAuthenticating: false,
              });

              return true;
            }
          }

          set({ isAuthenticating: false, isAuthenticated: false });
          return false;
        } catch (error) {
          set({
            isAuthenticating: false,
            isAuthenticated: false,
            error: error as Error,
          });
          return false;
        }
      },

      login: async (username: string, password: string, serverUrl?: string) => {
        try {
          set({ isAuthenticating: true, error: null });

          if (serverUrl && apiClient.getMode() === "direct") {
            apiClient.configure({
              mode: "direct",
              serverUrl,
            });
          }

          const { token, user } = await authService.login(
            username,
            password,
            serverUrl,
          );

          set({
            token,
            currentUser: user,
            isAuthenticated: true,
            isAuthenticating: false,
            serverUrl: serverUrl || authService.getStoredServerUrl(),
          });

          return user;
        } catch (error) {
          set({
            isAuthenticating: false,
            error: error as Error,
          });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          token: null,
          currentUser: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshCurrentUser: async () => {
        if (!get().isAuthenticated) {
          return null;
        }

        try {
          const user = await authService.getCurrentUser();

          if (user) {
            set({ currentUser: user });
            return user;
          }

          authService.logout();
          set({
            token: null,
            currentUser: null,
            isAuthenticated: false,
          });

          return null;
        } catch (error) {
          authService.logout();
          set({
            token: null,
            currentUser: null,
            isAuthenticated: false,
            error: error as Error,
          });

          return null;
        }
      },

      setCurrentUser: (user: User) => {
        set({ currentUser: user });
      },

      setError: (error: Error | null) => {
        set({ error });
      },
    }),
    {
      name: "mattermost-auth",
      partialize: (state) => ({
        token: state.token,
        serverUrl: state.serverUrl,
      }),
    },
  ),
);
