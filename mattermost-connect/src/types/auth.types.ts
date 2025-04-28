// types/auth.types.ts
/**
 * Types for authentication-related data and functions
 */

/**
 * User interface representing a Mattermost user
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  roles?: string;
  props?: Record<string, unknown>;
  last_picture_update?: number;
  update_at: number;
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
}

/**
 * State for authentication store
 */
export interface AuthState {
  token: string | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  serverUrl?: string | null;
}

/**
 * Login parameters for authentication
 */
export interface LoginParams {
  username: string;
  password: string;
  serverUrl?: string;
}
