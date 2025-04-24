// src/providers/ServicesProvider.tsx
/**
 * Provider principal pour les services de l'application
 * Initialise et expose les services fondamentaux (API, cache, etc.)
 */
import React, { createContext, useMemo, useContext, ReactNode } from "react";
import { ApiClient, createApiClient } from "../core/api/client";
import { CacheService } from "../core/services/cache.service";
import { ErrorService } from "../core/services/error.service";
import { AuthService } from "../core/services/auth.service";
import { WebSocketService } from "../core/services/ws.service";
import { configureStore } from "../core/store/store.config";
import { initializeServices } from "../core/services";
import { ServicesContext, ServicesContextValue } from "./contexts";

/**
 * Propriétés du provider de services
 */
export interface ServicesProviderProps {
  /** Enfants du provider */
  children: ReactNode;

  /** Configuration du client API */
  apiConfig?: {
    /** Mode de fonctionnement */
    mode?: "direct" | "proxy" | "custom";

    /** URL du serveur (mode direct) */
    serverUrl?: string;

    /** Token d'authentification (mode direct) */
    token?: string;

    /** URL du proxy (mode proxy) */
    proxyUrl?: string;

    /** ID client pour le proxy */
    clientId?: string;

    /** ID utilisateur pour le proxy */
    userId?: string;

    /** Headers par défaut */
    defaultHeaders?: Record<string, string>;
  };

  /** Configuration du cache */
  cacheConfig?: {
    /** Durée de vie par défaut en ms */
    ttl?: number;

    /** Taille maximale du cache */
    maxSize?: number;

    /** Utiliser le localStorage pour persistance */
    persistent?: boolean;

    /** Préfixe de stockage */
    storagePrefix?: string;

    /** Niveau de journalisation */
    logLevel?: number;
  };

  /** Configuration du service d'erreurs */
  errorConfig?: {
    /** Envoyer les erreurs à un service externe */
    enableReporting?: boolean;

    /** URL du service de rapport d'erreurs */
    reportingEndpoint?: string;

    /** Niveau de détail du logging */
    logLevel?: number;

    /** Capturer les erreurs non gérées */
    catchUnhandledErrors?: boolean;
  };
}

/**
 * Crée un conteneur de services complet
 */
function createServicesContainer(
  props: ServicesProviderProps,
): ServicesContextValue {
  const { apiConfig = {}, cacheConfig = {}, errorConfig = {} } = props;

  // Créer le client API
  const apiClient = createApiClient({
    mode: apiConfig.mode || "direct",
    serverUrl: apiConfig.serverUrl,
    token: apiConfig.token,
    proxyUrl: apiConfig.proxyUrl,
    clientId: apiConfig.clientId,
    userId: apiConfig.userId,
    defaultHeaders: apiConfig.defaultHeaders,
  });

  // Créer le service de cache
  const cacheService = new CacheService({
    ttl: cacheConfig.ttl,
    maxSize: cacheConfig.maxSize,
    logLevel: cacheConfig.logLevel,
    keyPrefix: cacheConfig.storagePrefix,
    storage: cacheConfig.persistent ? localStorage : undefined,
  });

  // Créer le service d'erreurs
  const errorService = new ErrorService({
    enableReporting: errorConfig.enableReporting,
    reportingEndpoint: errorConfig.reportingEndpoint,
    logLevel: errorConfig.logLevel,
    catchUnhandledErrors: errorConfig.catchUnhandledErrors,
  });

  // Configurer le store
  const store = configureStore(apiClient, null as any); // Le WebSocketService sera ajouté plus tard

  // Créer le service d'authentification
  const authService = new AuthService(apiClient, store, {
    useLocalStorage: true,
    storageKey: "mattermost_token",
    serverStorageKey: "mattermost_server",
  });

  // Créer le service WebSocket
  const webSocketService = new WebSocketService(store);

  // Mettre à jour le store avec le service WebSocket
  store.replaceReducer((s, a) => s); // Force un re-render

  // Initialiser les services globaux
  initializeServices({
    apiClient,
    authService,
    cacheService,
    webSocketService,
    errorService,
    store,
    isInitialized: true,
  });

  return {
    apiClient,
    authService,
    cacheService,
    webSocketService,
    errorService,
    store,
    isInitialized: true,
  };
}

/**
 * Hook pour accéder au contexte des services
 *
 * @returns Contexte des services
 * @throws Error si utilisé en dehors d'un ServicesProvider
 */
export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext);

  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider");
  }

  return context;
}

/**
 * Provider pour les services fondamentaux de l'application
 *
 * @example
 * ```tsx
 * <ServicesProvider
 *   apiConfig={{
 *     mode: 'direct',
 *     serverUrl: 'https://mattermost.example.com'
 *   }}
 *   cacheConfig={{
 *     persistent: true,
 *     ttl: 300000 // 5 minutes
 *   }}
 * >
 *   <App />
 * </ServicesProvider>
 * ```
 */
export function ServicesProvider(props: ServicesProviderProps): JSX.Element {
  const { children } = props;

  // Créer les services mémoïsés
  const services = useMemo(() => createServicesContainer(props), [props]);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}
