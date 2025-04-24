// src/providers/MattermostProvider.tsx
/**
 * Provider principal pour MattermostConnect
 * Compose tous les providers nécessaires pour l'application
 */
import React, { ReactNode } from "react";
import { ServicesProvider } from "./ServicesProvider";
import { AuthProvider } from "./AuthProvider";
import { WebSocketProvider } from "./WebSocketProvider";
import { ErrorProvider } from "./ErrorProvider";
import { ApiMode } from "../core/types/api.types";

/**
 * Propriétés du MattermostProvider
 */
export interface MattermostProviderProps {
  /** Contenu de l'application */
  children: ReactNode;

  // Mode direct
  /** URL du serveur Mattermost (mode direct) */
  serverUrl?: string;

  /** Token d'authentification (mode direct) */
  token?: string;

  // Mode proxy
  /** URL du proxy MattermostConnect */
  proxyUrl?: string;

  /** ID client pour le proxy */
  clientId?: string;

  /** ID utilisateur pour le proxy */
  userId?: string;

  // Options communes
  /** Activer la connexion WebSocket */
  enableWebSocket?: boolean;

  /** Utiliser le localStorage pour persister les données */
  useLocalStorage?: boolean;

  /** Clé dans le localStorage pour le token */
  storageKey?: string;

  /** Clé dans le localStorage pour l'URL du serveur */
  serverStorageKey?: string;

  /** Callback appelé après l'initialisation */
  onInitialized?: (isAuthenticated: boolean) => void;

  /** Callback appelé après une connexion réussie */
  onLoginSuccess?: (user: any) => void;

  /** Callback appelé après déconnexion */
  onLogout?: () => void;

  /** Callback appelé lors d'une erreur */
  onError?: (error: Error, context?: any) => void;
}

/**
 * Provider principal qui compose tous les providers nécessaires
 *
 * @example
 * ```tsx
 * // Mode direct
 * <MattermostProvider
 *   serverUrl="https://mattermost.example.com"
 *   enableWebSocket={true}
 * >
 *   <App />
 * </MattermostProvider>
 *
 * // Mode proxy
 * <MattermostProvider
 *   proxyUrl="https://proxy.example.com"
 *   clientId="client_xyz123"
 *   userId="user123"
 * >
 *   <App />
 * </MattermostProvider>
 * ```
 */
export function MattermostProvider({
  children,
  serverUrl,
  token,
  proxyUrl,
  clientId,
  userId,
  enableWebSocket = true,
  useLocalStorage = true,
  storageKey = "mattermost_token",
  serverStorageKey = "mattermost_server",
  onInitialized,
  onLoginSuccess,
  onLogout,
  onError,
}: MattermostProviderProps): JSX.Element {
  // Déterminer le mode basé sur les props
  const mode: ApiMode = serverUrl
    ? "direct"
    : proxyUrl && clientId
      ? "proxy"
      : "direct";

  return (
    <ErrorProvider maxErrors={10} autoClearErrors={false} onError={onError}>
      <ServicesProvider
        apiConfig={{
          mode,
          serverUrl,
          token,
          proxyUrl,
          clientId,
          userId,
        }}
        cacheConfig={{
          ttl: 5 * 60 * 1000, // 5 minutes
          maxSize: 200,
          persistent: useLocalStorage,
          storagePrefix: "mattermost_cache",
          logLevel: 1,
        }}
        errorConfig={{
          catchUnhandledErrors: true,
          logLevel: 2,
        }}
      >
        <AuthProvider
          autoInitialize={true}
          onInitialized={onInitialized}
          onLoginSuccess={onLoginSuccess}
          onLogout={onLogout}
        >
          <WebSocketProvider
            enableWebSocket={enableWebSocket}
            pingInterval={30000}
          >
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </ServicesProvider>
    </ErrorProvider>
  );
}

/**
 * Compose les providers pour la création d'un client MattermostConnect
 * Utile pour créer une instance personnalisée avec des configurations spécifiques
 *
 * @param config Configuration pour les providers
 * @returns HOC qui enveloppe l'application avec les providers
 *
 * @example
 * ```tsx
 * const MyMattermostProvider = createMattermostProvider({
 *   defaultServerUrl: 'https://mattermost.mycompany.com',
 *   enableErrorReporting: true,
 *   customHeaders: { 'X-Company-ID': 'ABC123' }
 * });
 *
 * // Utilisation
 * <MyMattermostProvider>
 *   <App />
 * </MyMattermostProvider>
 * ```
 */
export function createMattermostProvider(config: {
  defaultServerUrl?: string;
  defaultProxyUrl?: string;
  enableErrorReporting?: boolean;
  customHeaders?: Record<string, string>;
  pingInterval?: number;
  cacheTTL?: number;
  persistCache?: boolean;
}) {
  return function CustomMattermostProvider({
    children,
    ...props
  }: Omit<MattermostProviderProps, "children"> & {
    children: ReactNode;
  }): JSX.Element {
    return (
      <MattermostProvider
        serverUrl={config.defaultServerUrl}
        proxyUrl={config.defaultProxyUrl}
        enableWebSocket={true}
        {...props}
      >
        {children}
      </MattermostProvider>
    );
  };
}
