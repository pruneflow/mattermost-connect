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
  mode: AuthMode;
}

export interface AuthStore extends CommonSliceActions {
  // Actions
  initialize: () => Promise<boolean>;
  login: (params: LoginParams) => Promise<User>;
  logout: () => void;
  refreshCurrentUser: () => Promise<User | null>;
  setCurrentUser: (user: User) => void;
  reset: () => void;
  resetPassword: (params: PasswordResetParams) => Promise<boolean>;
  register: (registrationData: RegistrationParams) => Promise<User>;
  forgotPassword: (email: string) => Promise<boolean>;
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<boolean>;
  setMode: (mode: AuthMode) => void;
  getMode: () => AuthMode;
}

/**
 * Validation result interface for authentication validations
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Map of field names to error messages */
  errors: Record<string, string>;
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

/**
 * Registration parameters for new user
 */
export interface RegistrationParams {
  username: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  serverUrl?: string;
}

/**
 * Forgot password parameters
 */
export interface ForgotPasswordParams {
  email: string;
}

/**
 * Authentication validation rules configuration
 */
export interface ValidationRules {
  /** Minimum username length */
  minUsernameLength: number;
  /** Maximum username length */
  maxUsernameLength: number;
  /** Username pattern (for allowed characters) */
  usernamePattern: RegExp;
  /** Username pattern error message */
  usernamePatternError: string;
  /** Minimum password length */
  minPasswordLength: number;
  /** Maximum password length */
  maxPasswordLength: number;
  /** Whether to enforce password strength */
  enforcePasswordStrength: boolean;
  /** Minimum password strength (0-3) */
  minPasswordStrength: number;
  /** Email pattern (for validation beyond standard) */
  emailPattern?: RegExp;
  /** Email pattern error message */
  emailPatternError?: string;
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
  /** Custom validation rules for authentication */
  validationRules?: Partial<ValidationRules>;
  /** Threshold in milliseconds before token expiration to trigger refresh */
  tokenRefreshThreshold?: number;
}
