// src/core/types/auth.types.ts
/**
 * Types liés à l'authentification et aux utilisateurs
 */

import { User } from "./users.types";

/**
 * Informations d'authentification
 */
export interface AuthCredentials {
  /** Token d'authentification (JWT ou autre) */
  token: string;

  /** ID de l'utilisateur connecté */
  userId: string;

  /** URL du serveur (pour le mode direct) */
  serverUrl?: string;
}

/**
 * État d'authentification dans le store
 */
export interface AuthState {
  /** Indique si l'utilisateur est authentifié */
  isAuthenticated: boolean;

  /** Indique si une authentification est en cours */
  isAuthenticating: boolean;

  /** Token d'authentification en cours */
  token: string | null;

  /** Utilisateur connecté */
  currentUser: User | null;

  /** Erreur d'authentification le cas échéant */
  error: Error | null;

  /** URL du serveur (pour le mode direct) */
  serverUrl?: string;
}

/**
 * Paramètres de connexion
 */
export interface LoginParams {
  /** Nom d'utilisateur (ou email) */
  username: string;

  /** Mot de passe */
  password: string;

  /** URL du serveur (pour le mode direct) */
  serverUrl?: string;
}

/**
 * Résultat d'une opération de connexion
 */
export interface LoginResult {
  /** Succès ou échec de la connexion */
  success: boolean;

  /** Token d'authentification en cas de succès */
  token?: string;

  /** Utilisateur connecté en cas de succès */
  user?: User;

  /** Message d'erreur en cas d'échec */
  error?: string;
}

/**
 * Options pour le AuthService
 */
export interface AuthServiceOptions {
  /** Utiliser le localStorage pour persister le token */
  useLocalStorage?: boolean;

  /** Clé dans le localStorage pour le token */
  storageKey?: string;

  /** Clé dans le localStorage pour l'URL du serveur */
  serverStorageKey?: string;
}

/**
 * Type d'authentification
 */
export enum AuthType {
  /** Authentification directe avec le serveur Mattermost */
  DIRECT = "direct",

  /** Authentification via le proxy MattermostConnect */
  PROXY = "proxy",

  /** OAuth (futur) */
  OAUTH = "oauth",

  /** Personnalisé */
  CUSTOM = "custom",
}
