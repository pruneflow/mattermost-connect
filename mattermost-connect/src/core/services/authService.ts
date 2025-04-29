// src/core/services/authService.ts
/**
 * Authentication service
 * Handles user login, logout, token management, and session persistence
 */
import { apiClient } from "../api/client";
import { handleError } from "../store/errorStore";
import {
  ErrorSource,
  User,
  LoginParams,
  LoginResponse,
  AuthMode,
} from "../../types";

/**
 * Authentication service configuration options
 */
export interface AuthServiceConfig {
  /** Whether to use localStorage to persist tokens */
  useLocalStorage?: boolean;
  /** Key to use in localStorage for tokens */
  storageKey?: string;
  /** Key to use in localStorage for server URL */
  serverStorageKey?: string;
  /** Auth mode to use */
  mode?: AuthMode;
}

/**
 * Default configuration for authentication service
 */
const DEFAULT_CONFIG: AuthServiceConfig = {
  useLocalStorage: true,
  storageKey: "mattermost_token",
  serverStorageKey: "mattermost_server",
  mode: "direct",
};

/**
 * Authentication service for Mattermost
 * Centralized service for handling user authentication
 */
class AuthService {
  private useLocalStorage: boolean;
  private storageKey: string;
  private serverStorageKey: string;
  private mode: AuthMode;

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
  }

  /**
   * Logs in a user with username and password
   * @param username Username or email
   * @param password User password
   * @param serverUrl Server URL (for direct mode)
   * @returns Promise resolving to login response
   */
  public async login(
    username: string,
    password: string,
    serverUrl?: string,
  ): Promise<LoginResponse> {
    try {
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
      }
      // Handle proxy mode login
      else {
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
      }

      return { token, user };
    } catch (error) {
      // Handle and report error
      handleError(error as Error, ErrorSource.AUTH);
      throw error;
    }
  }

  /**
   * Logs out the current user
   */
  public logout(): void {
    // Clear stored credentials
    this.clearStoredCredentials();

    // Reset API client state
    apiClient.setToken(null);
    apiClient.setUserId(null);
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
    } catch (error) {
      // If authentication error, clean up
      if ((error as any).status === 401) {
        this.logout();
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

      return true;
    } catch (error) {
      // Clear invalid credentials
      this.clearStoredCredentials();
      apiClient.setToken(null);
      handleError(error as Error, ErrorSource.AUTH);
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
   * Stores authentication credentials
   * @param token Authentication token
   * @param serverUrl Server URL
   */
  private storeCredentials(token: string, serverUrl?: string): void {
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
