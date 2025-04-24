// src/providers/MattermostProvider.tsx
/**
 * Main provider component for MattermostConnect
 * Initializes API client, authentication, and WebSocket connections
 */
import React, { useEffect, useState, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "../core/api/client";
import { queryClient } from "../core/api/queryClient";
import { useAuthStore } from "../core/store/authStore";
import { useWsStore } from "../core/store/wsStore";
import { useInitializeAuthQuery } from "../core/api/queries/authQueries";
import { wsService } from "../core/services/wsService";

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

/**
 * Main provider component for MattermostConnect
 * Initializes all required services and provides context to child components
 * @param props Provider props
 * @returns Provider component
 */
export function MattermostProvider({
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
  // Track initialization status
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Use auth store actions
  const { initialize, setError: setAuthError } = useAuthStore();

  // Use WebSocket store actions
  const { connect: connectWs, setError: setWsError } = useWsStore();

  // Set up API client
  useEffect(() => {
    const mode = determineMode({
      serverUrl,
      proxyUrl,
      clientId,
    } as MattermostProviderProps);

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
  }, [serverUrl, proxyUrl, clientId, token, onAuthError]);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize from stored token or provided token
        const isAuthenticated = await initialize();

        // Update initialization status
        setIsInitialized(true);

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
              }
            }
          } catch (wsError) {
            console.error("Failed to connect WebSocket:", wsError);
            setWsError(wsError as Error);

            if (onWebSocketError) {
              onWebSocketError(wsError as Error);
            }
          }
        }
      } catch (authError) {
        console.error("Failed to initialize authentication:", authError);
        setAuthError(authError as Error);
        setInitError(authError as Error);

        if (onAuthError) {
          onAuthError(authError as Error);
        }
      }
    };

    const mode = determineMode({
      serverUrl,
      proxyUrl,
      clientId,
    } as MattermostProviderProps);

    // Only initialize if we have the required configuration
    if (
      (mode === "direct" && serverUrl) ||
      (mode === "proxy" && proxyUrl && clientId)
    ) {
      initAuth();
    }

    // Clean up on unmount
    return () => {
      // Disconnect WebSocket if connected
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
    initialize,
    connectWs,
    setAuthError,
    setWsError,
    onInitialized,
    onAuthError,
    onWebSocketError,
  ]);

  // Provide React Query context to children
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
