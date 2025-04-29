/**
 * Authentication related type definitions
 */
import { Entity, CommonState, CommonSliceActions } from "./common";

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
 * Authentication state
 * Now extends CommonState for standardized state management
 */
export interface AuthState extends CommonState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  currentUser: User | null;
  token: string | null;
  serverUrl: string | null;
}

export interface AuthStore extends CommonSliceActions {
  // Actions
  initialize: () => Promise<boolean>;
  login: (params: LoginParams) => Promise<User>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;
  setCurrentUser: (user: User) => void;
  reset: () => void;
}

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
