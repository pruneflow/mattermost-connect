// src/core/store/authStore.ts
/**
 * Authentication store
 * Manages user authentication state and actions
 */
import "./storeConfig";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  User,
  AuthState,
  LoginParams,
  EventType,
  ErrorSource,
  AuthStore,
  RegistrationParams,
  PasswordResetParams,
  AuthMode,
} from "../../types";
import { authService } from "../services/authService";
import { emitEvent } from "../api/eventUtils";
import { createCommonSlice } from "./slices/commonSlice";
import { handleError } from "./errorStore";

/**
 * Configuration for persist middleware
 */
const authPersistConfig = {
  name: "mattermost-auth",

  storage: createJSONStorage(() => localStorage),

  // Partialize to only store necessary data
  partialize: (state: AuthState) => ({
    token: state.token || null,
    serverUrl: state.serverUrl || null,
  }),
  // Add a migration function to handle structure changes
  version: 1,
  migrate: (persistedState: any, version: number) => {
    if (version === 0) {
      // Migration from version 0 to 1 if needed
      return {
        token: persistedState.token || null,
        serverUrl: persistedState.serverUrl || null,
      };
    }
    return persistedState;
  },

  // Handle deserialization errors
  onRehydrateStorage: (state: any) => {
    return (rehydratedState: any, error: any) => {
      if (error) {
        console.error("Error rehydrating auth store:", error);
        handleError(error, ErrorSource.STORAGE, undefined, {
          action: "rehydrate-auth-store",
        });
      } else {
        console.log("Auth store rehydrated successfully");
      }
    };
  },
};

/**
 * Authentication store for managing user session
 * Uses persist middleware for token persistence
 * Uses immer for immutable state updates
 */
export const useAuthStore = create<AuthState & AuthStore>()(
  persist(
    immer((set, get) => {
      // Create common slice for standardized loading/error state
      const commonSlice = createCommonSlice<AuthState>(set);

      return {
        // Include common slice properties
        ...commonSlice,
        mode: "direct" as AuthMode,
        isAuthenticated: false,
        isAuthenticating: false,
        currentUser: null,
        token: null,
        serverUrl: null,

        /**
         * Sets the authentication mode
         * @param mode Authentication mode
         */
        setMode: (mode: AuthMode) => {
          set((state) => {
            state.mode = mode;
            state.lastUpdated = Date.now();
          });

          // Update auth service mode
          authService.setMode(mode);
        },

        /**
         * Gets the current authentication mode
         * @returns Current authentication mode
         */
        getMode: () => {
          return get().mode;
        },
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
                  state.lastUpdated = Date.now();
                });

                // Emit authenticated event
                emitEvent(EventType.LOGIN_SUCCESS, { user });

                return true;
              }
            }

            set((state) => {
              state.isAuthenticating = false;
              state.isAuthenticated = false;
              state.lastUpdated = Date.now();
            });

            return false;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            set((state) => {
              state.isAuthenticating = false;
              state.isAuthenticated = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
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
              state.lastUpdated = Date.now();
            });

            // Emit login success event
            emitEvent(EventType.LOGIN_SUCCESS, { user });

            return user;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            set((state) => {
              state.isAuthenticating = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
            });

            throw error;
          }
        },

        /**
         * Registers a new user
         * @param registrationData Registration parameters
         * @returns The registered user
         */
        register: async (registrationData: RegistrationParams) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            // Call auth service to register the user
            const user = await authService.register(
              registrationData,
              registrationData.serverUrl,
            );

            set((state) => {
              state.isLoading = false;
              state.lastUpdated = Date.now();
            });

            // Emit registration success event
            emitEvent(EventType.REGISTRATION_SUCCESS, { user });

            return user;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            set((state) => {
              state.isLoading = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
            });

            throw error;
          }
        },

        /**
         * Requests a password reset for a user
         * @param email User's email address
         * @returns Promise resolving to success status
         */
        forgotPassword: async (email: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const result = await authService.forgotPassword(email);

            set((state) => {
              state.isLoading = false;
              state.lastUpdated = Date.now();
            });

            return result;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            set((state) => {
              state.isLoading = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
            });

            throw error;
          }
        },

        /**
         * Updates a user's password
         * @param currentPassword Current password
         * @param newPassword New password
         * @returns Promise resolving to success status
         */
        updatePassword: async (
          currentPassword: string,
          newPassword: string,
        ) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const result = await authService.updatePassword(
              currentPassword,
              newPassword,
            );

            set((state) => {
              state.isLoading = false;
              state.lastUpdated = Date.now();
            });

            return result;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            set((state) => {
              state.isLoading = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
            });

            throw error;
          }
        },

        /**
         * Resets a user's password using a reset token
         * @param params Password reset parameters
         * @returns Promise resolving to success status
         */
        resetPassword: async (params: PasswordResetParams) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const result = await authService.resetPassword(params);

            set((state) => {
              state.isLoading = false;
              state.lastUpdated = Date.now();
            });

            return result;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            set((state) => {
              state.isLoading = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
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
            state.lastUpdated = Date.now();
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
                state.lastUpdated = Date.now();
              });
              return user;
            }

            // If user retrieval fails, logout
            authService.logout();

            set((state) => {
              state.token = null;
              state.currentUser = null;
              state.isAuthenticated = false;
              state.lastUpdated = Date.now();
            });

            // Emit session expired event
            emitEvent(EventType.SESSION_EXPIRED, { reason: "User not found" });

            return null;
          } catch (error) {
            // Standardized error handling
            handleError(error as Error, ErrorSource.AUTH);

            // On error, logout and report
            authService.logout();

            set((state) => {
              state.token = null;
              state.currentUser = null;
              state.isAuthenticated = false;
              state.error = error as Error;
              state.lastUpdated = Date.now();
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
            state.lastUpdated = Date.now();
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
            state.lastUpdated = Date.now();
          });
          localStorage.removeItem("mattermost-auth");
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
