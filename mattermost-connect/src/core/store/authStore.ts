// src/core/store/authStore.ts
/**
 * Authentication store
 * Manages user authentication state and actions
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { User, EventType, LoginParams } from "../../types";
import { authService } from "../services/authService";
import { emitEvent } from "../api/eventUtils";
import { createLoadingSlice } from "./storeUtils";

/**
 * Authentication store state and actions
 */
interface AuthStoreState {
  // State
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  currentUser: User | null;
  token: string | null;
  serverUrl: string | null;
  error: Error | null;

  // Actions
  initialize: () => Promise<boolean>;
  login: (params: LoginParams) => Promise<User>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;
  setCurrentUser: (user: User) => void;

  // Loading state actions (provided by loading slice)
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;

  // Reset
  reset: () => void;
}

/**
 * Configuration for persist middleware
 */
const authPersistConfig = {
  name: "mattermost-auth",

  // Only persist token and serverUrl to avoid security issues
  partialize: (state: AuthStoreState) => ({
    token: state.token,
    serverUrl: state.serverUrl,
  }),
};

/**
 * Authentication store for managing user session
 * Uses persist middleware for token persistence
 * Uses immer for immutable state updates
 */
export const useAuthStore = create<AuthStoreState>()(
  persist(
    immer((set, get) => {
      // Create loading slice for standardized loading/error state
      const loadingSlice = createLoadingSlice<any>(set);

      return {
        // Initial state
        isAuthenticated: false,
        isAuthenticating: false,
        currentUser: null,
        token: null,
        serverUrl: null,
        error: null,

        // Include loading state actions
        setLoading: loadingSlice.setLoading,
        setError: loadingSlice.setError,

        /**
         * Initializes authentication from stored token
         * @returns Whether authentication was successful
         */
        initialize: async () => {
          try {
            set((state) => {
              state.isAuthenticating = true;
              state.error = null;
            });

            const isAuthenticated = await authService.initializeAuth();

            if (isAuthenticated) {
              const user = await authService.getCurrentUser();

              if (user) {
                const token = authService.getStoredToken();
                const serverUrl = authService.getStoredServerUrl();

                set((state) => {
                  state.isAuthenticated = true;
                  state.currentUser = user;
                  state.token = token;
                  state.serverUrl = serverUrl;
                  state.isAuthenticating = false;
                  state.error = null;
                });

                // Emit authenticated event
                emitEvent(EventType.LOGIN_SUCCESS, { user });

                return true;
              }
            }

            set((state) => {
              state.isAuthenticating = false;
              state.isAuthenticated = false;
            });

            return false;
          } catch (error) {
            set((state) => {
              state.isAuthenticating = false;
              state.isAuthenticated = false;
              state.error = error as Error;
            });

            return false;
          }
        },

        /**
         * Logs in a user with credentials
         * @param params Login parameters
         * @returns The authenticated user
         */
        login: async ({ username, password, serverUrl }: LoginParams) => {
          try {
            set((state) => {
              state.isAuthenticating = true;
              state.error = null;
            });

            // Call auth service to login
            const { token, user } = await authService.login(
              username,
              password,
              serverUrl,
            );

            // Update store with authentication data
            set((state) => {
              state.token = token;
              state.currentUser = user;
              state.isAuthenticated = true;
              state.isAuthenticating = false;
              state.serverUrl = serverUrl || authService.getStoredServerUrl();
              state.error = null;
            });

            // Emit login success event
            emitEvent(EventType.LOGIN_SUCCESS, { user });

            return user;
          } catch (error) {
            set((state) => {
              state.isAuthenticating = false;
              state.error = error as Error;
            });

            throw error;
          }
        },

        /**
         * Logs out the current user
         */
        logout: () => {
          // Get user before logout for event
          const user = get().currentUser;

          // Perform logout in auth service
          authService.logout();

          // Clear authentication state
          set((state) => {
            state.token = null;
            state.currentUser = null;
            state.isAuthenticated = false;
            state.error = null;
          });

          // Emit logout event
          emitEvent(EventType.LOGOUT, { user });
        },

        /**
         * Refreshes current user data
         * @returns Updated user or null if not authenticated
         */
        refreshCurrentUser: async () => {
          if (!get().isAuthenticated) {
            return null;
          }

          try {
            const user = await authService.getCurrentUser();

            if (user) {
              set((state) => {
                state.currentUser = user;
              });
              return user;
            }

            // If user retrieval fails, logout
            authService.logout();

            set((state) => {
              state.token = null;
              state.currentUser = null;
              state.isAuthenticated = false;
            });

            // Emit session expired event
            emitEvent(EventType.SESSION_EXPIRED, { reason: "User not found" });

            return null;
          } catch (error) {
            // On error, logout and report
            authService.logout();

            set((state) => {
              state.token = null;
              state.currentUser = null;
              state.isAuthenticated = false;
              state.error = error as Error;
            });

            // Emit session expired event
            emitEvent(EventType.SESSION_EXPIRED, {
              reason: "Error refreshing user",
            });

            return null;
          }
        },

        /**
         * Updates the current user information
         * @param user Updated user object
         */
        setCurrentUser: (user: User) => {
          set((state) => {
            state.currentUser = user;
          });

          // Emit user updated event
          emitEvent(EventType.USER_UPDATED, { user });
        },

        /**
         * Resets the store to initial state
         */
        reset: () => {
          set((state) => {
            state.token = null;
            state.currentUser = null;
            state.isAuthenticated = false;
            state.isAuthenticating = false;
            state.serverUrl = null;
            state.error = null;
          });
        },
      };
    }),
    authPersistConfig,
  ),
);

/**
 * Helper to get the current user from the auth store
 * @returns Current authenticated user or null
 */
export function getCurrentUser(): User | null {
  return useAuthStore.getState().currentUser;
}

/**
 * Helper to check if the user is authenticated
 * @returns Whether the user is authenticated
 */
export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}
