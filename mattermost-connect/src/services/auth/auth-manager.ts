// services/auth/auth-manager.ts

import { HttpClient } from "../http/http.service";

/**
 * Authentication result interface
 */
export interface AuthResult {
  /** Authentication token */
  token: string;
  /** Server URL (optional) */
  serverUrl?: string;
  /** User ID (optional) */
  userId?: string;
  /** Refresh token (optional) */
  refreshToken?: string;
  /** Token expiration time (optional) */
  expiresAt?: number;
}

/**
 * Token storage interface
 */
export interface TokenStorage {
  /** Get stored token */
  getToken(): string | null;
  /** Store token */
  setToken(token: string): void;
  /** Clear stored token */
  clearToken(): void;
  /** Get stored refresh token if any */
  getRefreshToken(): string | null;
  /** Store refresh token */
  setRefreshToken(token: string): void;
  /** Clear stored refresh token */
  clearRefreshToken(): void;
}

/**
 * Local storage implementation of token storage
 */
export class LocalStorageTokenStorage implements TokenStorage {
  private tokenKey: string;
  private refreshTokenKey: string;

  constructor(
    tokenKey: string = "mattermost_token",
    refreshTokenKey: string = "mattermost_refresh_token",
  ) {
    this.tokenKey = tokenKey;
    this.refreshTokenKey = refreshTokenKey;
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  public clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  public setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token);
  }

  public clearRefreshToken(): void {
    localStorage.removeItem(this.refreshTokenKey);
  }
}

/**
 * In-memory implementation of token storage
 */
export class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null;
  private refreshToken: string | null = null;

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string): void {
    this.token = token;
  }

  public clearToken(): void {
    this.token = null;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  public clearRefreshToken(): void {
    this.refreshToken = null;
  }
}

/**
 * Authentication manager interface
 */
export interface AuthManager {
  /** Get current token */
  getToken(): string | null;

  /** Check if user is authenticated */
  isAuthenticated(): boolean;

  /** Authenticate with username and password */
  authenticate(username: string, password: string): Promise<AuthResult>;

  /** Validate a token */
  validateToken(token: string): Promise<boolean>;

  /** Refresh token if possible */
  refreshToken(): Promise<boolean>;

  /** Clear authentication */
  logout(): void;

  /** Set token directly */
  setToken(token: string): void;
}

/**
 * Direct mode authentication manager
 */
export class DirectAuthManager implements AuthManager {
  private httpClient: HttpClient;
  private tokenStorage: TokenStorage;
  private serverUrl: string;

  constructor(
    httpClient: HttpClient,
    serverUrl: string,
    tokenStorage?: TokenStorage,
  ) {
    this.httpClient = httpClient;
    this.serverUrl = serverUrl;
    this.tokenStorage = tokenStorage || new MemoryTokenStorage();
  }

  public getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public async authenticate(
    username: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      // Login to get a session token
      const loginResponse = await fetch(
        `${this.serverUrl}/api/v4/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            login_id: username,
            password,
          }),
        },
      );

      if (!loginResponse.ok) {
        throw new Error("Authentication failed");
      }

      const user = await loginResponse.json();
      const sessionToken = loginResponse.headers.get("Token");

      if (!sessionToken) {
        throw new Error("No session token returned");
      }

      // Create a personal access token (PAT)
      const tokenResponse = await fetch(
        `${this.serverUrl}/api/v4/users/${user.id}/tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "MattermostConnect Integration",
          }),
        },
      );

      if (!tokenResponse.ok) {
        throw new Error("Failed to create token");
      }

      const tokenData = await tokenResponse.json();

      // Store the token
      this.tokenStorage.setToken(tokenData.token);

      return {
        token: tokenData.token,
        serverUrl: this.serverUrl,
        userId: user.id,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  public async validateToken(token: string): Promise<boolean> {
    const originalToken = this.tokenStorage.getToken();

    try {
      // Temporarily set the token to validate
      this.tokenStorage.setToken(token);

      // Try to make a request that requires authentication
      const response = await this.httpClient.get("users/me", {
        requireAuth: true,
      });

      return response.status === 200;
    } catch (error) {
      return false;
    } finally {
      // Restore the original token
      if (originalToken) {
        this.tokenStorage.setToken(originalToken);
      } else {
        this.tokenStorage.clearToken();
      }
    }
  }

  public async refreshToken(): Promise<boolean> {
    // Direct mode doesn't support token refresh
    // PATs don't expire unless revoked
    return this.isAuthenticated();
  }

  public logout(): void {
    this.tokenStorage.clearToken();
    this.tokenStorage.clearRefreshToken();
  }

  public setToken(token: string): void {
    this.tokenStorage.setToken(token);
  }
}

/**
 * Proxy mode authentication manager
 */
export class ProxyAuthManager implements AuthManager {
  private httpClient: HttpClient;
  private tokenStorage: TokenStorage;
  private clientId: string;
  private userId?: string;

  constructor(
    httpClient: HttpClient,
    clientId: string,
    tokenStorage?: TokenStorage,
    userId?: string,
  ) {
    this.httpClient = httpClient;
    this.clientId = clientId;
    this.tokenStorage = tokenStorage || new MemoryTokenStorage();
    this.userId = userId;
  }

  public getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public async authenticate(
    username: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const response = await this.httpClient.post<{
        token: string;
        user_id?: string;
      }>("auth/login", {
        username,
        password,
      });

      const { token, user_id } = response.data;

      // Store the token
      this.tokenStorage.setToken(token);

      // Update user ID if provided
      if (user_id) {
        this.userId = user_id;
      }

      return {
        token,
        userId: user_id,
      };
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  public async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post<{ valid: boolean }>(
        "auth/validate",
        {
          token,
        },
      );

      return response.data.valid === true;
    } catch (error) {
      return false;
    }
  }

  public async refreshToken(): Promise<boolean> {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await this.httpClient.post<{ token: string }>(
        "auth/refresh",
        {
          refresh_token: refreshToken,
        },
      );

      if (response.data.token) {
        this.tokenStorage.setToken(response.data.token);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  public logout(): void {
    this.tokenStorage.clearToken();
    this.tokenStorage.clearRefreshToken();
  }

  public setToken(token: string): void {
    this.tokenStorage.setToken(token);
  }
}

/**
 * Create an authentication manager for direct mode
 */
export function createDirectAuthManager(
  httpClient: HttpClient,
  serverUrl: string,
  useLocalStorage: boolean = false,
): AuthManager {
  const storage = useLocalStorage
    ? new LocalStorageTokenStorage()
    : new MemoryTokenStorage();

  return new DirectAuthManager(httpClient, serverUrl, storage);
}

/**
 * Create an authentication manager for proxy mode
 */
export function createProxyAuthManager(
  httpClient: HttpClient,
  clientId: string,
  useLocalStorage: boolean = false,
  userId?: string,
): AuthManager {
  const storage = useLocalStorage
    ? new LocalStorageTokenStorage()
    : new MemoryTokenStorage();

  return new ProxyAuthManager(httpClient, clientId, storage, userId);
}
