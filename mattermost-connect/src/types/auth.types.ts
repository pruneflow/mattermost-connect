/**
 * Authentication related type definitions
 */
import { Entity, WithId, WithTimestamps } from "./common";

/**
 * Authentication modes
 */
export type AuthMode = "direct" | "proxy";

/**
 * User interface representing a Mattermost user
 */
export interface User extends Entity {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  roles?: string;
  props?: Record<string, unknown>;
  last_picture_update?: number;
}

/**
 * Authentication token information
 */
export interface AuthToken {
  token: string;
  issuedAt: number;
  expiresAt?: number;
}

/**
 * Authentication state - discriminated union for type safety
 */
export type AuthState =
  | {
      status: "unauthenticated";
      isAuthenticated: false;
      currentUser: null;
      token: null;
      serverUrl: null | string;
      isAuthenticating: boolean;
      error: Error | null;
    }
  | {
      status: "authenticating";
      isAuthenticated: false;
      currentUser: null;
      token: null;
      serverUrl: null | string;
      isAuthenticating: true;
      error: Error | null;
    }
  | {
      status: "authenticated";
      isAuthenticated: true;
      currentUser: User;
      token: string;
      serverUrl?: string;
      isAuthenticating: false;
      error: Error | null;
    };

/**
 * Authentication response from the server
 */
export interface LoginResponse {
  token: string;
  user: User;
}

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
 * Login parameters for authentication
 */
export interface LoginParams {
  username: string;
  password: string;
  serverUrl?: string;
}

/**
 * Password reset parameters
 */
export interface PasswordResetParams {
  token: string;
  newPassword: string;
}

/**
 * Session information
 */
export interface Session {
  userId: string;
  token: string;
  createdAt: number;
  expiresAt?: number;
  lastActivityAt: number;
  isActive: boolean;
}

/**
 * API Client configuration
 */
export interface ApiClientConfig {
  mode: AuthMode;
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  token?: string;
  userId?: string;
  defaultHeaders?: Record<string, string>;
  onError?: (error: any) => void;
}

/**
 * Event types specific to authentication
 */
export enum AuthEventType {
  LOGIN_SUCCESS = "auth:login_success",
  LOGOUT = "auth:logout",
  SESSION_EXPIRED = "auth:session_expired",
  TOKEN_REFRESH = "auth:token_refresh",
  UNAUTHORIZED = "auth:unauthorized",
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = "invalid_credentials",
  SESSION_EXPIRED = "session_expired",
  NETWORK_ERROR = "network_error",
  SERVER_ERROR = "server_error",
  UNAUTHORIZED = "unauthorized",
}

/**
 * Authentication state for React components
 */
export interface AuthContextState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isInitialized: boolean;
  currentUser: User | null;
  error: Error | null;
  serverUrl: string | null;
  login: (params: LoginParams) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<User | null>;
}
