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

// Ajout des méthodes à authService.ts

/**
 * MFA verification parameters
 */
export interface MfaVerificationParams {
  /** User ID for verification */
  userId: string;
  /** Verification code */
  code: string;
  /** MFA method type */
  method: "totp" | "email";
}

/**
 * MFA resend parameters
 */
export interface MfaResendParams {
  /** User ID to resend code for */
  userId: string;
  /** MFA method type */
  method: "totp" | "email";
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
   * Performs comprehensive validation based on token type
   * @param token Token to validate
   * @returns Whether token format is valid
   */
  public validateTokenFormat(token: string): boolean {
    if (!token || token.trim() === "") {
      return false;
    }

    try {
      // For JWT tokens (most common in production)
      if (token.split(".").length === 3) {
        // JWT has three parts separated by dots: header.payload.signature
        const [header, payload, signature] = token.split(".");

        // Verify each part exists and is not empty
        if (!header || !payload || !signature) {
          return false;
        }

        // Basic structure check - can decode from base64
        try {
          const decodedHeader = JSON.parse(atob(header));
          const decodedPayload = JSON.parse(atob(payload));

          // Check for minimal required JWT fields
          if (!decodedHeader.alg || !decodedPayload.sub) {
            return false;
          }

          // Ensure signature is not empty
          return signature.trim() !== "";
        } catch (decodeError) {
          // If we can't decode parts, it's not a valid JWT
          return false;
        }
      }

      // For Bearer token format
      if (token.startsWith("Bearer ")) {
        const tokenValue = token.substring(7).trim();
        // Check minimum length and character set for Bearer tokens
        return tokenValue.length >= 32 && /^[A-Za-z0-9\-_]+$/.test(tokenValue);
      }

      // For simple token formats (could be session ID or similar)
      // Minimum 32 characters and only contains allowed characters
      return token.length >= 32 && /^[A-Za-z0-9\-_]+$/.test(token);
    } catch (error) {
      // Log the error but don't expose internal details
      console.error("Token validation error", error);
      return false;
    }
  }

  /**
   * Estimates remaining token validity
   * Calculates the remaining validity time in seconds
   * @param token Authentication token (optional, uses stored token if not provided)
   * @returns Estimated validity in seconds or null if unknown
   */
  public getTokenRemainingValidity(token?: string): number | null {
    try {
      // Use provided token or fall back to stored token
      const tokenToCheck = token || this.getStoredToken();
      if (!tokenToCheck) {
        return null;
      }

      // For JWT tokens
      if (tokenToCheck.split(".").length === 3) {
        try {
          // Decode the payload
          const payload = JSON.parse(atob(tokenToCheck.split(".")[1]));

          // Check for expiration time
          if (payload.exp) {
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();

            // Check if already expired
            if (expirationTime <= currentTime) {
              return 0;
            }

            // Return remaining validity in seconds
            return Math.floor((expirationTime - currentTime) / 1000);
          }
        } catch (jwtError) {
          // Error decoding JWT, can't determine validity
          console.warn("Error determining JWT validity", jwtError);
          return null;
        }
      }

      // For server-stored sessions with our own expiration tracking
      // Check if we have stored token issuance and expiration
      const localStorageKey = `${this.storageKey}_exp`;

      try {
        if (this.useLocalStorage && localStorage.getItem(localStorageKey)) {
          const tokenExpiration = parseInt(
            localStorage.getItem(localStorageKey) || "0",
            10,
          );
          const currentTime = Date.now();

          // Check if already expired
          if (tokenExpiration <= currentTime) {
            return 0;
          }

          // Return remaining validity in seconds
          return Math.floor((tokenExpiration - currentTime) / 1000);
        }
      } catch (storageError) {
        console.warn(
          "Error accessing local storage for token expiration",
          storageError,
        );
        // Continue to fallback approach
      }

      // Fallback: For tokens where we can't determine expiration
      // Make a lightweight API call to check token validity
      // This is non-blocking and meant to be informational only
      this.checkTokenValidityAsync(tokenToCheck).catch(() => {});

      // Return a conservative estimate based on refresh threshold
      // This assumes the refresh logic will handle token renewal appropriately
      return Math.floor(this.tokenRefreshThreshold / 1000);
    } catch (error) {
      console.error("Error in getTokenRemainingValidity", error);
      return null;
    }
  }

  /**
   * Helper method to check token validity asynchronously
   * Makes a lightweight API call to verify token is still valid
   * @param token Token to check
   * @returns Promise resolving to boolean indicating validity
   * @private
   */
  private async checkTokenValidityAsync(token: string): Promise<boolean> {
    try {
      // Use a lightweight endpoint that requires authentication
      // This could be a dedicated endpoint or any existing one that's fast
      await apiClient.get("users/status/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error: any) {
      // Token is invalid if we get a 401
      if (error.status === 401) {
        return false;
      }
      // For other errors, we can't be sure
      return true;
    }
  }

  /**
   * Verifies an MFA code
   * @param params MFA verification parameters
   * @returns Promise resolving to authenticated user
   * @throws AuthError if verification fails
   */
  public async verifyMfa(params: MfaVerificationParams): Promise<User> {
    try {
      // Validate params
      if (!params.userId) {
        throw new AuthError(
          "User ID is required",
          AuthErrorType.VALIDATION_ERROR,
        );
      }

      if (!params.code) {
        throw new AuthError(
          "Verification code is required",
          AuthErrorType.VALIDATION_ERROR,
        );
      }

      // Validate code format
      if (!/^\d+$/.test(params.code) || params.code.length !== 6) {
        throw new AuthError(
          "Verification code must be 6 digits",
          AuthErrorType.VALIDATION_ERROR,
        );
      }

      let endpoint: string;
      switch (params.method) {
        case "totp":
          endpoint = "users/mfa/totp/verify";
          break;
        case "email":
          endpoint = "users/mfa/email/verify";
          break;
        default:
          throw new AuthError(
            `Unsupported MFA method: ${params.method}`,
            AuthErrorType.VALIDATION_ERROR,
          );
      }

      // Call API to verify MFA code
      const response = await apiClient.post<{ token: string; user: User }>(
        endpoint,
        {
          user_id: params.userId,
          code: params.code,
        },
      );

      // Update API client with new token
      if (response.data.token) {
        apiClient.setToken(response.data.token);

        // Store credentials if localStorage is enabled
        if (this.useLocalStorage) {
          this.storeCredentials(response.data.token, this.getStoredServerUrl());
        }

        // Setup token refresh if needed
        this.setupTokenRefresh(response.data.token);
      }

      // Return the authenticated user
      return response.data.user;
    } catch (error: any) {
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      // Handle specific error types
      if (error.status === 401) {
        throw new AuthError(
          "Invalid verification code",
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
          error.message || "MFA verification failed",
          AuthErrorType.SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Resends an MFA code
   * @param params MFA resend parameters
   * @returns Promise resolving to success status
   * @throws AuthError if resend fails
   */
  public async resendMfaCode(params: MfaResendParams): Promise<boolean> {
    try {
      // Validate params
      if (!params.userId) {
        throw new AuthError(
          "User ID is required",
          AuthErrorType.VALIDATION_ERROR,
        );
      }

      let endpoint: string;
      switch (params.method) {
        case "totp":
          // TOTP doesn't typically need resending as it's generated by the app
          // But we provide an endpoint to possibly refresh the secret
          endpoint = "users/mfa/totp/refresh";
          break;
        case "email":
          endpoint = "users/mfa/email/resend";
          break;
        default:
          throw new AuthError(
            `Unsupported MFA method: ${params.method}`,
            AuthErrorType.VALIDATION_ERROR,
          );
      }

      // Call API to resend MFA code
      await apiClient.post(endpoint, {
        user_id: params.userId,
      });

      return true;
    } catch (error: any) {
      if (error instanceof AuthError) {
        handleError(error, ErrorSource.AUTH);
        throw error;
      }

      // Handle specific error types
      if (error.status === 404) {
        throw new AuthError(
          "User not found or MFA not enabled",
          AuthErrorType.SERVER_ERROR,
        );
      } else if (error.status === 429) {
        throw new AuthError(
          "Too many requests. Please wait before trying again",
          AuthErrorType.SERVER_ERROR,
        );
      } else if (!navigator.onLine) {
        throw new AuthError(
          "Network error. Please check your internet connection",
          AuthErrorType.NETWORK_ERROR,
        );
      } else {
        handleError(error as Error, ErrorSource.AUTH);
        throw new AuthError(
          error.message || "Failed to resend MFA code",
          AuthErrorType.SERVER_ERROR,
        );
      }
    }
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
