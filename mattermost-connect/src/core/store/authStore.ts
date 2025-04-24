// src/core/store/authStore.ts
/**
 * Zustand store for authentication state
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, authService } from "../services/authService";
import { apiClient } from "../api/client";

/**
 * Authentication state
 */
export interface AuthState {
  // State
  /** Authentication token */
  token: string | null;
  /** Currently logged in user */
  currentUser: User | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Error that occurred during authentication */
  error: Error | null;
  /** Server URL (for direct mode) */
  serverUrl?: string | null;

  // Actions
  /** Initializes authentication from stored token */
  initialize: () => Promise<boolean>;
  /** Logs in a user */
  login: (
    username: string,
    password: string,
    serverUrl?: string,
  ) => Promise<User>;
  /** Logs out the current user */
  logout: () => void;
  /** Refreshes the current user */
  refreshCurrentUser: () => Promise<User | null>;
  /** Sets the current user */
  setCurrentUser: (user: User) => void;
  /** Sets the error state */
  setError: (error: Error | null) => void;
}

/**
 * Create the authentication store with persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      currentUser: null,
      isAuthenticated: false,
      isAuthenticating: false,
      error: null,

      /**
       * Initializes authentication from stored token
       * @returns Promise resolving to whether initialization succeeded
       */
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

      /**
       * Logs in a user
       * @param username Username or email
       * @param password User password
       * @param serverUrl Server URL (for direct mode)
       * @returns Promise resolving to the logged in user
       */
      login: async (username: string, password: string, serverUrl?: string) => {
        try {
          set({ isAuthenticating: true, error: null });

          // If a server URL is provided, update the API client configuration
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

      /**
       * Logs out the current user
       */
      logout: () => {
        authService.logout();
        set({
          token: null,
          currentUser: null,
          isAuthenticated: false,
          error: null,
        });
      },

      /**
       * Refreshes the current user
       * @returns Promise resolving to the current user
       */
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

          // If no user was returned, token might be invalid
          authService.logout();
          set({
            token: null,
            currentUser: null,
            isAuthenticated: false,
          });

          return null;
        } catch (error) {
          // If an error occurred, authentication probably failed
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

      /**
       * Sets the current user
       * @param user User to set
       */
      setCurrentUser: (user: User) => {
        set({ currentUser: user });
      },

      /**
       * Sets the error state
       * @param error Error to set
       */
      setError: (error: Error | null) => {
        set({ error });
      },
    }),
    {
      name: "mattermost-auth",
      // Only persist token and server URL
      partialize: (state) => ({
        token: state.token,
        serverUrl: state.serverUrl,
      }),
    },
  ),
);
