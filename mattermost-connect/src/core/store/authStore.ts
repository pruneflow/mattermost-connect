// src/core/store/authStore.ts
/**
 * Authentication store
 * Manages user authentication state and actions
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  User,
  AuthState,
  LoginParams,
  EventType,
  ErrorSource,
} from "../../types";
import { authService } from "../services/authService";
import { apiClient } from "../api/client";
import { emitEvent } from "./eventStore";
import { handleError } from "./errorStore";

/**
 * Authentication store state and actions
 */
interface AuthStoreState extends AuthState {
  // Actions
  currentUser: User;
  initialize: () => Promise<boolean>;
  login: (params: LoginParams) => Promise<User>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;
  setCurrentUser: (user: User) => void;

  // Reset
  reset: () => void;
}

/**
 * Authentication store for managing user session
 */
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      currentUser: null,
      isAuthenticated: false,
      isAuthenticating: false,
      serverUrl: null,

      /**
       * Initializes authentication from stored token
       * @returns Whether authentication was successful
       */
      initialize: async () => {
        try {
          set({ isAuthenticating: true });

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

              // Emit authenticated event
              emitEvent(EventType.LOGIN_SUCCESS, { user });

              return true;
            }
          }

          set({ isAuthenticating: false, isAuthenticated: false });
          return false;
        } catch (error) {
          set({
            isAuthenticating: false,
            isAuthenticated: false,
          });

          // Handle and report error
          handleError(error as Error, ErrorSource.AUTH);

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
          set({ isAuthenticating: true });

          // Configure API client for direct mode if serverUrl is provided
          if (serverUrl && apiClient.getMode() === "direct") {
            apiClient.configure({
              mode: "direct",
              serverUrl,
            });
          }

          // Call auth service to login
          const { token, user } = await authService.login(
            username,
            password,
            serverUrl,
          );

          // Update store with authentication data
          set({
            token,
            currentUser: user,
            isAuthenticated: true,
            isAuthenticating: false,
            serverUrl: serverUrl || authService.getStoredServerUrl(),
          });

          // Emit login success event
          emitEvent(EventType.LOGIN_SUCCESS, { user });

          return user;
        } catch (error) {
          set({ isAuthenticating: false });

          // Handle and report error
          handleError(error as Error, ErrorSource.AUTH);

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
        set({
          token: null,
          currentUser: null,
          isAuthenticated: false,
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
            set({ currentUser: user });
            return user;
          }

          // If user retrieval fails, logout
          authService.logout();

          set({
            token: null,
            currentUser: null,
            isAuthenticated: false,
          });

          // Emit session expired event
          emitEvent(EventType.SESSION_EXPIRED, { reason: "User not found" });

          return null;
        } catch (error) {
          // On error, logout and report
          authService.logout();

          set({
            token: null,
            currentUser: null,
            isAuthenticated: false,
          });

          // Handle and report error
          handleError(error as Error, ErrorSource.AUTH);

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
        set({ currentUser: user });

        // Emit user updated event
        emitEvent(EventType.USER_UPDATED, { user });
      },

      /**
       * Resets the store to initial state
       */
      reset: () => {
        set({
          token: null,
          currentUser: null,
          isAuthenticated: false,
          isAuthenticating: false,
          serverUrl: null,
        });
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
