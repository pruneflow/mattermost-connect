// src/core/services/authService.ts
/**
 * Authentication service
 * Provides centralized management of user authentication, token handling, and session persistence
 */
import { apiClient } from "../api/client";
import {
  User,
  LoginResponse,
  AuthMode,
  AuthServiceConfig,
  ErrorSource,
  EventType,
  RegistrationParams,
  PasswordResetParams,
} from "../../types";
import { handleError } from "../store";
import { emitEvent } from "../api/eventUtils";
import { AuthValidator } from "../../utils/authValidation";

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = "invalid_credentials",
  NETWORK_ERROR = "network_error",
  SERVER_ERROR = "server_error",
  VALIDATION_ERROR = "validation_error",
  UNAUTHORIZED = "unauthorized",
  ACCOUNT_LOCKED = "account_locked",
  MULTI_FACTOR_REQUIRED = "multi_factor_required",
  SESSION_EXPIRED = "session_expired",
  TOKEN_EXPIRED = "token_expired",
  UNKNOWN = "unknown",
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  type: AuthErrorType;
  details?: Record<string, any>;

  constructor(
    message: string,
    type: AuthErrorType = AuthErrorType.UNKNOWN,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = "AuthError";
    this.type = type;
    this.details = details;
  }
}

/**
 * Default configuration for authentication service
 */
const DEFAULT_CONFIG: AuthServiceConfig = {
  useLocalStorage: true,
  storageKey: "mattermost_token",
  serverStorageKey: "mattermost_server",
  mode: "direct",
  validationRules: {},
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes in milliseconds
};

/**
 * Authentication service for Mattermost
 * Centralizes user authentication, session management, and token storage
 */
class AuthService {
  private useLocalStorage: boolean;
  private storageKey: string;
  private serverStorageKey: string;
  private mode: AuthMode;
  private tokenRefreshThreshold: number;
  private validator: AuthValidator;

  // Token refresh timer
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Creates an instance of the authentication service
   * @param config Configuration options
   */
  constructor(config: AuthServiceConfig = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.useLocalStorage = mergedConfig.useLocalStorage!;
    this.storageKey = mergedConfig.storageKey!;
    this.serverStorageKey = mergedConfig.serverStorageKey!;
    this.mode = mergedConfig.mode!;
    this.tokenRefreshThreshold =
      mergedConfig.tokenRefreshThreshold ||
      DEFAULT_CONFIG.tokenRefreshThreshold!;
    this.validator = new AuthValidator(mergedConfig.validationRules);
  }

  /**
   * Logs in a user with username and password
   * @param username Username or email
   * @param password User password
   * @param serverUrl Server URL (for direct mode)
   * @returns Promise resolving to login response
   * @throws AuthError if login fails
   */
  public async login(
    username: string,
    password: string,
    serverUrl?: string | null,
  ): Promise<LoginResponse> {
    try {
      // Validate credentials
      const validationResult = this.validator.validateLogin(username, password);
      if (!validationResult.isValid) {
        throw new AuthError(
          "Invalid login credentials",
          AuthErrorType.VALIDATION_ERROR,
          validationResult.errors,
        );
      }

      let token: string;
      let user: User;

      // Handle direct mode login
      if (apiClient.getMode() === "direct") {
        // Configure API client with server URL if provided
        if (serverUrl) {
          apiClient.configure({
            mode: "direct",
            serverUrl,
          });
        }

        try {
          // Log in to Mattermost server
          const loginResponse = await apiClient.post<User>("users/login", {
            login_id: username,
            password,
          });

          // Extract token from headers
          token = loginResponse.headers["token"];
          user = loginResponse.data;

          // Update API client with token
          apiClient.setToken(token);

          // Store credentials if localStorage is enabled
          if (this.useLocalStorage) {
            this.storeCredentials(token, serverUrl);
          }
        } catch (error: any) {
          // Handle specific error types
          if (error.status === 401) {
            throw new AuthError(
              "Invalid username or password",
              AuthErrorType.INVALID_CREDENTIALS,
            );
          } else if (error.status === 403) {
            throw new AuthError(
              "Account is locked or disabled",
              AuthErrorType.ACCOUNT_LOCKED,
            );
          } else if (!navigator.onLine) {
            throw new AuthError(
              "Network error. Please check your internet connection",
              AuthErrorType.NETWORK_ERROR,
            );
          } else {
            throw new AuthError(
              error.message || "Login failed",
              AuthErrorType.SERVER_ERROR,
            );
          }
        }
      }
      // Handle proxy mode login
      else {
        try {
          // Log in via proxy
          const response = await apiClient.post<{
            token: string;
            user_id: string;
          }>("auth/login", {
            username,
            password,
          });

          token = response.data.token;

          // Configure API client with token and user ID
          apiClient.setToken(token);
          if (response.data.user_id) {
            apiClient.setUserId(response.data.user_id);
          }

          // Get current user information
          const userResponse = await apiClient.get<User>("users/me");
          user = userResponse.data;

          // Store credentials if localStorage is enabled
          if (this.useLocalStorage) {
            this.storeCredentials(token, apiClient.getBaseUrl());
          }
        } catch (error: any) {
          // Handle specific error types
          if (error.status === 401) {
            throw new AuthError(
              "Invalid username or password",
              AuthErrorType.INVALID_CREDENTIALS,
            );
          } else if (error.status === 403) {
            throw new AuthError(
              "Account is locked or disabled",
              AuthErrorType.ACCOUNT_LOCKED,
            );
          } else if (!navigator.onLine) {
            throw new AuthError(
              "Network error. Please check your internet connection",
              AuthErrorType.NETWORK_ERROR,
            );
          } else {
            throw new AuthError(
              error.message || "Login failed",
              AuthErrorType.SERVER_ERROR,
            );
          }
        }
      }

      // Setup token refresh if needed
      this.setupTokenRefresh(token);

      // Emit login success event
      emitEvent(EventType.LOGIN_SUCCESS, {
        user,
        timestamp: Date.now(),
      });

      return { token, user };
    } catch (error) {
      // If the error is already an AuthError, rethrow it
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      // Otherwise, handle as a generic error
      handleError(error as Error, ErrorSource.AUTH);
      throw new AuthError(
        (error as Error).message || "Authentication failed",
        AuthErrorType.UNKNOWN,
      );
    }
  }

  /**
   * Registers a new user
   * @param registrationData Registration data
   * @param serverUrl Server URL (for direct mode)
   * @returns Promise resolving to registered user
   * @throws AuthError if registration fails
   */
  public async register(
    registrationData: RegistrationParams,
    serverUrl?: string,
  ): Promise<User> {
    try {
      // Validate registration data
      const validationResult =
        this.validator.validateRegistration(registrationData);
      if (!validationResult.isValid) {
        throw new AuthError(
          "Invalid registration data",
          AuthErrorType.VALIDATION_ERROR,
          validationResult.errors,
        );
      }

      // Configure API client with server URL if provided
      if (serverUrl && apiClient.getMode() === "direct") {
        apiClient.configure({
          mode: "direct",
          serverUrl,
        });
      }

      // Create user account
      const response = await apiClient.post<User>("users", registrationData);

      // Emit registration success event
      emitEvent(EventType.REGISTRATION_SUCCESS, {
        user: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error: any) {
      // Handle specific error types
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      if (error.status === 400) {
        const errorMessage = error.data?.message || "Registration failed";
        throw new AuthError(errorMessage, AuthErrorType.VALIDATION_ERROR);
      } else if (!navigator.onLine) {
        throw new AuthError(
          "Network error. Please check your internet connection",
          AuthErrorType.NETWORK_ERROR,
        );
      } else {
        handleError(error as Error, ErrorSource.AUTH);
        throw new AuthError(
          error.message || "Registration failed",
          AuthErrorType.SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Requests a password reset for a user
   * @param email User's email address
   * @returns Promise resolving to success status
   * @throws AuthError if request fails
   */
  public async forgotPassword(email: string): Promise<boolean> {
    try {
      // Validate email
      const validationResult = this.validator.validateEmail(email);
      if (!validationResult.isValid) {
        throw new AuthError(
          "Invalid email format",
          AuthErrorType.VALIDATION_ERROR,
          validationResult.errors,
        );
      }

      await apiClient.post("users/password/reset", { email });
      return true;
    } catch (error: any) {
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      // Handle network errors
      if (!navigator.onLine) {
        throw new AuthError(
          "Network error. Please check your internet connection",
          AuthErrorType.NETWORK_ERROR,
        );
      }

      // Don't expose too much information for security reasons
      // Just indicate if the request was processed
      handleError(error as Error, ErrorSource.AUTH);
      if (error.status === 404) {
        // Return true even if email not found to prevent email enumeration
        return true;
      }

      throw new AuthError(
        "Failed to process password reset request",
        AuthErrorType.SERVER_ERROR,
      );
    }
  }

  /**
   * Resets a user's password using a reset token
   * @param params Password reset parameters
   * @returns Promise resolving to success status
   * @throws AuthError if reset fails
   */
  public async resetPassword(params: PasswordResetParams): Promise<boolean> {
    try {
      // Validate password
      const validationResult = this.validator.validatePassword(
        params.newPassword,
      );
      if (!validationResult.isValid) {
        throw new AuthError(
          "Invalid password format",
          AuthErrorType.VALIDATION_ERROR,
          validationResult.errors,
        );
      }

      await apiClient.post("users/password/reset/complete", {
        token: params.token,
        new_password: params.newPassword,
      });
      return true;
    } catch (error: any) {
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      // Handle specific error types
      if (error.status === 400) {
        throw new AuthError(
          "Invalid or expired reset token",
          AuthErrorType.VALIDATION_ERROR,
        );
      } else if (!navigator.onLine) {
        throw new AuthError(
          "Network error. Please check your internet connection",
          AuthErrorType.NETWORK_ERROR,
        );
      } else {
        handleError(error as Error, ErrorSource.AUTH);
        throw new AuthError(
          "Failed to reset password",
          AuthErrorType.SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Updates a user's password
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Promise resolving to success status
   * @throws AuthError if update fails
   */
  public async updatePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    try {
      // Validate new password
      const validationResult = this.validator.validatePassword(newPassword);
      if (!validationResult.isValid) {
        throw new AuthError(
          "Invalid password format",
          AuthErrorType.VALIDATION_ERROR,
          validationResult.errors,
        );
      }

      await apiClient.post("users/password/update", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return true;
    } catch (error: any) {
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      // Handle specific error types
      if (error.status === 401) {
        throw new AuthError(
          "Current password is incorrect",
          AuthErrorType.INVALID_CREDENTIALS,
        );
      } else if (!navigator.onLine) {
        throw new AuthError(
          "Network error. Please check your internet connection",
          AuthErrorType.NETWORK_ERROR,
        );
      } else {
        handleError(error as Error, ErrorSource.AUTH);
        throw new AuthError(
          "Failed to update password",
          AuthErrorType.SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Refreshes the authentication token
   * @returns Promise resolving to new token
   * @throws AuthError if refresh fails
   */
  public async refreshToken(): Promise<string | null> {
    try {
      const currentToken = this.getStoredToken();
      if (!currentToken) {
        throw new AuthError(
          "No token available to refresh",
          AuthErrorType.UNAUTHORIZED,
        );
      }

      // For direct mode, token refresh depends on server implementation
      if (apiClient.getMode() === "direct") {
        const response = await apiClient.post<{ token: string }>(
          "users/token/refresh",
          {
            token: currentToken,
          },
        );

        const newToken = response.data.token;

        // Update API client with new token
        apiClient.setToken(newToken);

        // Store new credentials
        if (this.useLocalStorage) {
          this.storeCredentials(newToken, this.getStoredServerUrl());
        }

        // Setup refresh for the new token
        this.setupTokenRefresh(newToken);

        return newToken;
      }
      // For proxy mode
      else {
        const response = await apiClient.post<{ token: string }>(
          "auth/refresh",
          {
            token: currentToken,
          },
        );

        const newToken = response.data.token;

        // Update API client with new token
        apiClient.setToken(newToken);

        // Store new credentials
        if (this.useLocalStorage) {
          this.storeCredentials(newToken, apiClient.getBaseUrl());
        }

        // Setup refresh for the new token
        this.setupTokenRefresh(newToken);

        return newToken;
      }
    } catch (error: any) {
      // Clear token if expired or invalid
      if (error.status === 401) {
        this.clearStoredCredentials();
        apiClient.setToken(null);

        // Emit session expired event
        emitEvent(EventType.SESSION_EXPIRED, {
          reason: "Token expired or invalid",
          timestamp: Date.now(),
        });

        throw new AuthError(
          "Authentication token expired or invalid",
          AuthErrorType.TOKEN_EXPIRED,
        );
      }

      // Handle network errors
      if (!navigator.onLine) {
        throw new AuthError(
          "Network error during token refresh",
          AuthErrorType.NETWORK_ERROR,
        );
      }

      handleError(error as Error, ErrorSource.AUTH);
      throw new AuthError(
        "Failed to refresh authentication token",
        AuthErrorType.SERVER_ERROR,
      );
    }
  }

  /**
   * Logs out the current user
   */
  public logout(): void {
    // Clear token refresh timer if active
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Get current user before logout for event emission
    let currentUser = null;

    try {
      // Attempt to get current user info from API client for event
      // This is a best-effort attempt and won't block logout if it fails
      const userId = apiClient.getUserId();
      if (userId) {
        currentUser = { id: userId };
      }
    } catch (error) {
      // Silent catch - we still want to complete the logout
    }

    // Clear stored credentials
    this.clearStoredCredentials();

    // Reset API client state
    apiClient.setToken(null);
    apiClient.setUserId(null);

    // Emit logout event
    emitEvent(EventType.LOGOUT, {
      user: currentUser,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets the currently logged in user
   * @returns Promise resolving to current user or null if not authenticated
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>("users/me");
      const currentUser = response.data;

      // Update user ID in API client
      apiClient.setUserId(currentUser.id);

      return currentUser;
    } catch (error: any) {
      // If authentication error, clean up
      if (error.status === 401) {
        this.logout();

        // Emit session expired event
        emitEvent(EventType.SESSION_EXPIRED, {
          reason: "Authentication failed",
          timestamp: Date.now(),
        });

        throw new AuthError(
          "Session expired or invalid",
          AuthErrorType.SESSION_EXPIRED,
        );
      }

      handleError(error as Error, ErrorSource.AUTH);
      return null;
    }
  }

  /**
   * Initializes authentication from stored token
   * @returns Promise resolving to boolean indicating if initialization succeeded
   */
  public async initializeAuth(): Promise<boolean> {
    if (!this.useLocalStorage) {
      return false;
    }

    // Check for stored token
    const token = this.getStoredToken();
    const serverUrl = this.getStoredServerUrl();

    if (!token) {
      return false;
    }

    try {
      // Configure API client with token
      apiClient.setToken(token);

      // Set server URL if in direct mode and URL is stored
      if (apiClient.getMode() === "direct" && serverUrl) {
        apiClient.configure({
          mode: "direct",
          serverUrl,
          token,
        });
      }

      // Validate token by getting current user
      const user = await this.getCurrentUser();

      if (!user) {
        this.clearStoredCredentials();
        return false;
      }

      // Setup token refresh if token is valid
      this.setupTokenRefresh(token);

      // Emit login success event if initialization was successful
      emitEvent(EventType.LOGIN_SUCCESS, {
        user,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      // Clear invalid credentials
      this.clearStoredCredentials();
      apiClient.setToken(null);

      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
      } else {
        handleError(error as Error, ErrorSource.AUTH);
      }

      return false;
    }
  }

  /**
   * Sets the authentication mode
   * @param mode Authentication mode
   */
  public setMode(mode: AuthMode): void {
    this.mode = mode;
  }

  /**
   * Gets the current authentication mode
   * @returns Current authentication mode
   */
  public getMode(): AuthMode {
    return this.mode;
  }

  /**
   * Checks if a token is stored
   * @returns Whether a token is stored
   */
  public hasStoredToken(): boolean {
    if (!this.useLocalStorage) {
      return false;
    }
    return !!localStorage.getItem(this.storageKey);
  }

  /**
   * Gets the stored token
   * @returns Stored token or null if none
   */
  public getStoredToken(): string | null {
    if (!this.useLocalStorage) {
      return null;
    }
    return localStorage.getItem(this.storageKey);
  }

  /**
   * Gets the stored server URL
   * @returns Stored server URL or null if none
   */
  public getStoredServerUrl(): string | null {
    if (!this.useLocalStorage) {
      return null;
    }
    return localStorage.getItem(this.serverStorageKey);
  }

  /**
   * Validates an authentication token format
   * @param token Token to validate
   * @returns Whether token format is valid
   */
  public validateTokenFormat(token: string): boolean {
    // Basic validation - can be extended based on token format
    return !!(token && token.length > 8);
  }

  /**
   * Estimates remaining token validity
   * @param token Authentication token
   * @returns Estimated validity in seconds or null if unknown
   */
  public getTokenRemainingValidity(token?: string): number | null {
    // This is a placeholder implementation - token validity would typically
    // be determined by decoding JWT or tracking issuance time
    return null;
  }

  /**
   * Sets up token refresh timer based on token expiration
   * @param token Authentication token
   */
  private setupTokenRefresh(token: string): void {
    // Clear any existing refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Determine token expiration time
    const tokenExpiration = this.getTokenExpirationTime(token);
    if (!tokenExpiration) {
      return; // Can't determine expiration, no refresh needed
    }

    // Calculate time until refresh (expiration minus threshold)
    const now = Date.now();
    const timeUntilRefresh = Math.max(
      0,
      tokenExpiration - now - this.tokenRefreshThreshold,
    );

    // Set timer to refresh token
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch(() => {
        // If token refresh fails, logout user
        this.logout();
      });
    }, timeUntilRefresh);
  }

  /**
   * Gets token expiration time in milliseconds since epoch
   * @param token Authentication token
   * @returns Expiration time or null if cannot be determined
   */
  private getTokenExpirationTime(token: string): number | null {
    try {
      // For JWT tokens
      if (token.split(".").length === 3) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp) {
          return payload.exp * 1000; // Convert to milliseconds
        }
      }

      // For non-JWT tokens or if exp not found
      // Use a default expiration of 24 hours from now
      return Date.now() + 24 * 60 * 60 * 1000;
    } catch (error) {
      // If token can't be decoded, use a default
      return Date.now() + 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Stores authentication credentials
   * @param token Authentication token
   * @param serverUrl Server URL
   */
  private storeCredentials(token: string, serverUrl?: string | null): void {
    if (!this.useLocalStorage) {
      return;
    }

    localStorage.setItem(this.storageKey, token);

    if (serverUrl) {
      localStorage.setItem(this.serverStorageKey, serverUrl);
    }
  }

  /**
   * Clears stored credentials
   */
  private clearStoredCredentials(): void {
    if (!this.useLocalStorage) {
      return;
    }

    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.serverStorageKey);
  }
}

/**
 * Singleton instance of the authentication service
 */
export const authService = new AuthService();
