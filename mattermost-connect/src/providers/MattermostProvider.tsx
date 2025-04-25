// src/providers/MattermostProvider.tsx
/**
 * Main provider component for MattermostConnect
 * Initializes API client, authentication, and WebSocket connections
 */
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "../core/api/client";
import { queryClient } from "../core/api/queryClient";
import { useAuthStore } from "../core/store/authStore";
import { useWsStore } from "../core/store/wsStore";
import { wsService } from "../core/services/wsService";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { JSX } from "react/jsx-runtime";

/**
 * MattermostProvider props
 */
export interface MattermostProviderProps {
  /** Children elements */
  children: ReactNode;
  /** Direct mode: Mattermost server URL */
  serverUrl?: string;
  /** Proxy mode: Proxy service URL */
  proxyUrl?: string;
  /** Client ID for proxy mode */
  clientId?: string;
  /** Authentication token (optional, will use stored token if available) */
  token?: string;
  /** Whether to enable WebSocket connection (default: true) */
  enableWebSocket?: boolean;
  /** Whether to persist authentication (default: true) */
  persistAuth?: boolean;
  /** Callback when initialization is complete */
  onInitialized?: (success: boolean) => void;
  /** Callback for authentication errors */
  onAuthError?: (error: Error) => void;
  /** Callback for WebSocket errors */
  onWebSocketError?: (error: Error) => void;
}

/**
 * Determines if we're using direct or proxy mode
 * @param props Provider props
 * @returns API mode
 */
function determineMode(props: MattermostProviderProps): "direct" | "proxy" {
  if (props.serverUrl) {
    return "direct";
  } else if (props.proxyUrl && props.clientId) {
    return "proxy";
  }
  // Default to direct mode if not specified
  return "direct";
}

function MattermostProviderContent({
  children,
  serverUrl,
  proxyUrl,
  clientId,
  token,
  enableWebSocket = true,
  persistAuth = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
}: MattermostProviderProps) {
  // États
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // CHANGEMENT IMPORTANT: Utiliser useRef pour l'état de la connexion WebSocket
  // plutôt que useState, pour éviter des rendus supplémentaires
  const wsConnectionStatusRef = useRef({
    hadSuccessfulConnection: false,
    hasDisconnected: false,
    lastConnectedAt: 0,
  });

  // Hooks du store
  const { initialize, setError: setAuthError } = useAuthStore();
  const {
    connect: connectWs,
    setError: setWsError,
    isConnected,
  } = useWsStore();

  // Hook qui utilise React Query - maintenant utilisable en toute sécurité
  const { loadInitialUnreadCounts } = useUnreadCounts();

  // Déterminer le mode (direct/proxy)
  const mode = serverUrl ? "direct" : proxyUrl && clientId ? "proxy" : "direct";

  // Gestionnaire de reconnexion WebSocket
  const handleWsReconnect = useCallback(() => {
    // Utiliser une fonction qui ne modifie pas l'état local
    if (
      wsConnectionStatusRef.current.hadSuccessfulConnection &&
      wsConnectionStatusRef.current.hasDisconnected
    ) {
      void loadInitialUnreadCounts();
      wsConnectionStatusRef.current.hasDisconnected = false;
    }
  }, [loadInitialUnreadCounts]); // Moins de dépendances

  useEffect(() => {
    if (isConnected) {
      if (wsConnectionStatusRef.current.hasDisconnected) {
        handleWsReconnect();
      }

      wsConnectionStatusRef.current = {
        hadSuccessfulConnection: true,
        hasDisconnected: false,
        lastConnectedAt: Date.now(),
      };
    } else if (wsConnectionStatusRef.current.hadSuccessfulConnection) {
      wsConnectionStatusRef.current.hasDisconnected = true;
    }
  }, [isConnected, handleWsReconnect]);

  useEffect(() => {
    try {
      apiClient.configure({
        mode,
        serverUrl,
        proxyUrl,
        token,
        clientId,
        onError: (error) => {
          console.error("API client error:", error);
          if (onAuthError && error.status === 401) {
            onAuthError(error as Error);
          }
        },
      });
    } catch (error) {
      console.error("Failed to configure API client:", error);
      setInitError(error as Error);
    }
  }, [serverUrl, proxyUrl, clientId, token, mode, onAuthError]);

  // Initialisation de l'authentification et WebSocket - légèrement modifiée
  useEffect(() => {
    // Éviter les appels excessifs
    if (isInitialized) return;

    const initAuth = async () => {
      try {
        // Initialize from stored token or provided token
        const isAuthenticated = await initialize();

        // Call initialization callback
        if (onInitialized) {
          onInitialized(isAuthenticated);
        }

        // Connect WebSocket if enabled and authenticated
        if (enableWebSocket && isAuthenticated) {
          try {
            // Build WebSocket URL from the server URL, replacing http(s) with ws(s)
            if (mode === "direct" && serverUrl) {
              const wsUrl =
                serverUrl.replace(
                  /^http(s)?:\/\//,
                  window.location.protocol === "https:" ? "wss://" : "ws://",
                ) + "/api/v4/websocket";

              const authToken = useAuthStore.getState().token;
              if (authToken) {
                await connectWs(wsUrl, authToken);

                // Sécuritaire d'appeler ici car le Provider est déjà monté
                loadInitialUnreadCounts();
              }
            }
          } catch (wsError) {
            console.error("Failed to connect WebSocket:", wsError);
            setWsError(wsError as Error);

            if (onWebSocketError) {
              onWebSocketError(wsError as Error);
            }
          }
        } else if (isAuthenticated) {
          // Même sans WebSocket, charger les compteurs
          loadInitialUnreadCounts();
        }

        // CHANGEMENT IMPORTANT: Mettre à jour isInitialized à la fin, pas au milieu
        setIsInitialized(true);
      } catch (authError) {
        console.error("Failed to initialize authentication:", authError);
        setAuthError(authError as Error);
        setInitError(authError as Error);

        if (onAuthError) {
          onAuthError(authError as Error);
        }
      }
    };

    // Seulement initialiser avec la configuration requise
    if (
      (mode === "direct" && serverUrl) ||
      (mode === "proxy" && proxyUrl && clientId)
    ) {
      initAuth();
    }

    // Nettoyage
    return () => {
      if (wsService.isSocketConnected()) {
        wsService.disconnect();
      }
    };
  }, [
    serverUrl,
    proxyUrl,
    clientId,
    token,
    enableWebSocket,
    persistAuth,
    mode,
    isInitialized,
    initialize,
    connectWs,
    setAuthError,
    setWsError,
    onInitialized,
    onAuthError,
    onWebSocketError,
    loadInitialUnreadCounts,
  ]);

  // Le rendu est simplement les enfants - toute la logique est au-dessus
  return <>{children}</>;
}

/**
 * Main provider component for MattermostConnect
 * Initializes all required services and provides context to child components
 * @param props Provider props
 * @returns Provider component
 */
export function MattermostProvider(props: MattermostProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MattermostProviderContent {...props} />
    </QueryClientProvider>
  );
}

/**
 * Direct mode provider for Mattermost
 * @param props Provider props
 * @returns Provider component
 */
export function MattermostDirectProvider({
  children,
  serverUrl,
  token,
  enableWebSocket = true,
  persistAuth = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
}: Omit<MattermostProviderProps, "proxyUrl" | "clientId"> & {
  serverUrl: string;
}) {
  return (
    <MattermostProvider
      serverUrl={serverUrl}
      token={token}
      enableWebSocket={enableWebSocket}
      persistAuth={persistAuth}
      onInitialized={onInitialized}
      onAuthError={onAuthError}
      onWebSocketError={onWebSocketError}
    >
      {children}
    </MattermostProvider>
  );
}

/**
 * Proxy mode provider for Mattermost
 * @param props Provider props
 * @returns Provider component
 */
export function MattermostProxyProvider({
  children,
  proxyUrl,
  clientId,
  token,
  enableWebSocket = true,
  persistAuth = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
}: Omit<MattermostProviderProps, "serverUrl"> & {
  proxyUrl: string;
  clientId: string;
}) {
  return (
    <MattermostProvider
      proxyUrl={proxyUrl}
      clientId={clientId}
      token={token}
      enableWebSocket={enableWebSocket}
      persistAuth={persistAuth}
      onInitialized={onInitialized}
      onAuthError={onAuthError}
      onWebSocketError={onWebSocketError}
    >
      {children}
    </MattermostProvider>
  );
}
