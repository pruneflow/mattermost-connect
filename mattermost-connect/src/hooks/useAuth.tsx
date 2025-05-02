// src/hooks/useAuth.tsx
/**
 * Authentication hooks
 * Provides standardized access to authentication functionality
 */
import { useState, useEffect, useCallback } from "react";
import {
  useLoginMutation,
  useLogoutMutation,
  useCurrentUserQuery,
  useInitializeAuthQuery,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from "../core/api/queries/authQueries";
import { useAuthStore } from "../core/store/authStore";
import { useWsStore } from "../core/store/wsStore";
import {
  User,
  LoginParams,
  RegistrationParams,
  PasswordResetParams,
  ForgotPasswordParams,
  AuthMode,
  ValidationResult,
} from "../types";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";
import {
  validateLogin,
  validateRegistration,
  validatePassword,
  validateEmail,
} from "../utils/authValidation";

/**
 * Authentication result interface
 */
export interface AuthResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  validationErrors?: Record<string, string>;
}

/**
 * Hook for authentication functionality
 * Provides standardized interface for login, logout, and auth state
 */
export function useAuth() {
  const {
    isAuthenticated,
    isAuthenticating,
    currentUser,
    token,
    serverUrl,
    error,
    mode,
  } = useAuthStore();

  // Use React Query mutations for auth operations
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  // Additional state for error tracking
  const [loginError, setLoginError] = useState<Error | null>(null);
  const [registrationError, setRegistrationError] = useState<Error | null>(
    null,
  );
  const [passwordResetError, setPasswordResetError] = useState<Error | null>(
    null,
  );

  /**
   * Logs in a user with credentials
   * @param credentials Login credentials
   * @returns Promise resolving to authentication result
   */
  const login = useCallback(
    async (credentials: LoginParams): Promise<AuthResult<User>> => {
      // Validate credentials first
      const validationResult = validateLogin(
        credentials.username,
        credentials.password,
      );
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors,
        };
      }

      try {
        setLoginError(null);
        const user = await loginMutation.mutateAsync(credentials);
        return {
          success: true,
          data: user,
        };
      } catch (error) {
        setLoginError(error as Error);
        return {
          success: false,
          error: error as Error,
        };
      }
    },
    [loginMutation],
  );

  /**
   * Registers a new user
   * @param registrationData Registration data
   * @returns Promise resolving to authentication result
   */
  const register = useCallback(
    async (registrationData: RegistrationParams): Promise<AuthResult<User>> => {
      // Validate registration data first
      const validationResult = validateRegistration(registrationData);
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors,
        };
      }

      try {
        setRegistrationError(null);
        const user = await registerMutation.mutateAsync(registrationData);
        return {
          success: true,
          data: user,
        };
      } catch (error) {
        setRegistrationError(error as Error);
        return {
          success: false,
          error: error as Error,
        };
      }
    },
    [registerMutation],
  );

  /**
   * Logs out the current user
   * @returns Promise resolving to logout success
   */
  const logout = useCallback(async (): Promise<boolean> => {
    try {
      await logoutMutation.mutateAsync();

      // Disconnect WebSocket if connected
      const { isConnected, disconnect } = useWsStore.getState();
      if (isConnected) {
        disconnect(1000, "User logged out");
      }

      return true;
    } catch (error) {
      handleError(error as Error, ErrorSource.AUTH);
      return false;
    }
  }, [logoutMutation]);

  /**
   * Refreshes the current user data
   * @returns Promise resolving to updated user or null
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      return await useAuthStore.getState().refreshCurrentUser();
    } catch (error) {
      handleError(error as Error, ErrorSource.AUTH);
      return null;
    }
  }, []);

  /**
   * Sends a password reset request
   * @param email User's email address
   * @returns Promise resolving to the result
   */
  const forgotPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      // Validate email first
      const validationResult = validateEmail(email);
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors,
        };
      }

      try {
        setPasswordResetError(null);
        const data: ForgotPasswordParams = { email };
        await forgotPasswordMutation.mutateAsync(data);
        return {
          success: true,
        };
      } catch (error) {
        setPasswordResetError(error as Error);
        return {
          success: false,
          error: error as Error,
        };
      }
    },
    [forgotPasswordMutation],
  );

  /**
   * Resets a user's password
   * @param resetData Password reset data
   * @returns Promise resolving to the result
   */
  const resetPassword = useCallback(
    async (resetData: PasswordResetParams): Promise<AuthResult> => {
      // Validate password first
      const validationResult = validatePassword(resetData.newPassword);
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors,
        };
      }

      try {
        setPasswordResetError(null);
        await resetPasswordMutation.mutateAsync(resetData);
        return {
          success: true,
        };
      } catch (error) {
        setPasswordResetError(error as Error);
        return {
          success: false,
          error: error as Error,
        };
      }
    },
    [resetPasswordMutation],
  );

  /**
   * Updates user's password when authenticated
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Promise resolving to the result
   */
  const updatePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<AuthResult> => {
      // Validate new password
      const validationResult = validatePassword(newPassword);
      if (!validationResult.isValid) {
        return {
          success: false,
          validationErrors: validationResult.errors,
        };
      }

      try {
        const { updatePassword } = useAuthStore.getState();
        await updatePassword(currentPassword, newPassword);
        return {
          success: true,
        };
      } catch (error) {
        return {
          success: false,
          error: error as Error,
        };
      }
    },
    [],
  );

  /**
   * Changes the authentication mode
   * @param newMode New authentication mode
   */
  const setAuthMode = useCallback((newMode: AuthMode): void => {
    const { setMode } = useAuthStore.getState();
    setMode(newMode);
  }, []);

  /**
   * Validates login credentials client-side
   * @param username Username or email
   * @param password Password
   * @returns Validation result
   */
  const validateCredentials = useCallback(
    (username: string, password: string): ValidationResult => {
      return validateLogin(username, password);
    },
    [],
  );

  /**
   * Validates registration data client-side
   * @param data Registration data
   * @returns Validation result
   */
  const validateRegistrationData = useCallback(
    (data: RegistrationParams): ValidationResult => {
      return validateRegistration(data);
    },
    [],
  );

  /**
   * Validates password client-side
   * @param password Password to validate
   * @returns Validation result
   */
  const validatePasswordFormat = useCallback(
    (password: string): ValidationResult => {
      return validatePassword(password);
    },
    [],
  );

  return {
    // Auth state
    isAuthenticated,
    isAuthenticating,
    loginError,
    registrationError,
    passwordResetError,
    error,
    currentUser,
    token,
    serverUrl,
    mode,

    // Auth operations
    login,
    register,
    logout,
    refreshUser,
    forgotPassword,
    resetPassword,
    updatePassword,
    setAuthMode,

    // Client-side validation
    validateCredentials,
    validateRegistrationData,
    validatePasswordFormat,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation?.isPending,
    isResettingPassword: resetPasswordMutation?.isPending,
    isSendingResetEmail: forgotPasswordMutation?.isPending,
  };
}

/**
 * Hook that requires authentication
 * Redirects or throws error if user is not authenticated
 *
 * @param onUnauthenticated Optional callback when user is not authenticated
 * @returns The authenticated user
 */
export function useRequireAuth(onUnauthenticated?: () => void): User {
  const { isAuthenticated, currentUser } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && onUnauthenticated) {
      onUnauthenticated();
    }
  }, [isAuthenticated, onUnauthenticated]);

  if (!isAuthenticated || !currentUser) {
    throw new Error("Authentication required");
  }

  return currentUser;
}

/**
 * Hook to initialize authentication from stored token
 * @returns Authentication initialization state
 */
export function useAuthInitialize() {
  const initializeQuery = useInitializeAuthQuery();

  return {
    isInitialized: initializeQuery.isSuccess,
    isInitializing: initializeQuery.isLoading,
    error: initializeQuery.error,
    initialized: initializeQuery.data,
  };
}

/**
 * Hook to get the current user
 * @returns Current user query
 */
export function useCurrentUser() {
  const currentUserQuery = useCurrentUserQuery();

  return {
    currentUser: currentUserQuery.data,
    isLoading: currentUserQuery.isLoading,
    error: currentUserQuery.error,
    refetch: currentUserQuery.refetch,
  };
}
