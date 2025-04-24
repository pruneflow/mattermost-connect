// src/providers/contexts.ts
/**
 * Définition des contextes React pour l'application
 * Centralise tous les contextes utilisés par les différents providers
 */

import { createContext } from "react";
import { ApiClient } from "../core/api/client";
import { AuthService } from "../core/services/auth.service";
import { CacheService } from "../core/services/cache.service";
import { WebSocketService } from "../core/services/ws.service";
import { ErrorService } from "../core/services/error.service";
import { AppStore } from "../core/store/store.config";
import { User } from "../core/types/users.types";
import { WebSocketState } from "../core/types/websocket.types";

/**
 * Interface pour le contexte de services
 */
export interface ServicesContextValue {
  /** Client API pour les requêtes HTTP */
  apiClient: ApiClient;

  /** Service d'authentification */
  authService: AuthService;

  /** Service de cache */
  cacheService: CacheService;

  /** Service WebSocket */
  webSocketService: WebSocketService;

  /** Service de gestion d'erreurs */
  errorService: ErrorService;

  /** Store centralisé */
  store: AppStore;

  /** Indique si les services sont initialisés */
  isInitialized: boolean;
}

/**
 * Interface pour le contexte d'authentification
 */
export interface AuthContextValue {
  /** Indique si l'utilisateur est authentifié */
  isAuthenticated: boolean;

  /** Indique si une authentification est en cours */
  isAuthenticating: boolean;

  /** Utilisateur actuellement connecté */
  currentUser: User | null;

  /** Erreur d'authentification le cas échéant */
  error: Error | null;

  /** URL du serveur (mode direct) */
  serverUrl?: string;

  /** Fonction pour se connecter */
  login: (
    username: string,
    password: string,
    serverUrl?: string,
  ) => Promise<any>;

  /** Fonction pour se déconnecter */
  logout: () => void;
}

/**
 * Interface pour le contexte WebSocket
 */
export interface WebSocketContextValue {
  /** État actuel de la connexion WebSocket */
  state: WebSocketState;

  /** Fonction pour se connecter au WebSocket */
  connect: (url: string, token: string) => Promise<void>;

  /** Fonction pour se déconnecter du WebSocket */
  disconnect: () => void;

  /** Fonction pour envoyer un message via WebSocket */
  sendMessage: (message: any) => boolean;

  /** Fonction pour s'abonner aux messages WebSocket */
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
}

/**
 * Interface pour le contexte d'erreurs
 */
export interface ErrorContextValue {
  /** Dernière erreur survenue */
  lastError: Error | null;

  /** Liste des erreurs récentes */
  recentErrors: Array<{
    error: Error;
    timestamp: number;
    context?: string;
  }>;

  /** Fonction pour enregistrer une erreur */
  reportError: (error: Error, context?: string) => void;

  /** Fonction pour effacer les erreurs */
  clearErrors: () => void;

  /** Fonction pour s'abonner aux erreurs */
  subscribeToErrors: (
    handler: (error: Error, context?: string) => void,
  ) => () => void;
}

// Valeurs par défaut des contextes (utilisées en développement et tests)
const defaultServicesContext: ServicesContextValue = {
  apiClient: null as any,
  authService: null as any,
  cacheService: null as any,
  webSocketService: null as any,
  errorService: null as any,
  store: null as any,
  isInitialized: false,
};

const defaultAuthContext: AuthContextValue = {
  isAuthenticated: false,
  isAuthenticating: false,
  currentUser: null,
  error: null,
  login: async () => ({}),
  logout: () => {},
};

const defaultWebSocketContext: WebSocketContextValue = {
  state: {
    isConnected: false,
    isConnecting: false,
    url: null,
    error: null,
    reconnectAttempts: 0,
    lastConnectedAt: null,
  },
  connect: async () => {},
  disconnect: () => {},
  sendMessage: () => false,
  subscribe: () => () => {},
};

const defaultErrorContext: ErrorContextValue = {
  lastError: null,
  recentErrors: [],
  reportError: () => {},
  clearErrors: () => {},
  subscribeToErrors: () => () => {},
};

/**
 * Contexte pour les services centraux
 */
export const ServicesContext = createContext<ServicesContextValue>(
  defaultServicesContext,
);

/**
 * Contexte pour l'authentification
 */
export const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

/**
 * Contexte pour les WebSockets
 */
export const WebSocketContext = createContext<WebSocketContextValue>(
  defaultWebSocketContext,
);

/**
 * Contexte pour la gestion d'erreurs
 */
export const ErrorContext =
  createContext<ErrorContextValue>(defaultErrorContext);
