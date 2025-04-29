// src/providers/MattermostProvider.tsx
/**
 * Main provider component for MattermostConnect
 * Initializes API client, authentication, and WebSocket connections
 */
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "../core/api/client";
import { queryClient } from "../core/api/queryClient";
import { useWsStore, useAuthStore } from "../core/store";
import { wsService } from "../core/services/wsService";
import { useUnreadCounts } from "../hooks";
import { emitEvent } from "../core/api/eventUtils";
import { EventType } from "../types";

/**
 * Props for the MattermostProvider component
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
 * Determines if we're using direct or proxy mode based on provided URLs
 */
function determineMode(
  serverUrl?: string,
  proxyUrl?: string,
  clientId?: string,
): "direct" | "proxy" {
  if (serverUrl) {
    return "direct";
  } else if (proxyUrl && clientId) {
    return "proxy";
  }

  // Default to direct mode if not specified
  return "direct";
}

/**
 * Initialization component that handles API client and authentication setup
 * Separated to avoid unnecessary re-renders of the children
 */
const MattermostInitializer: React.FC<MattermostProviderProps> = ({
  serverUrl,
  proxyUrl,
  clientId,
  token,
  enableWebSocket = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
}) => {
  // Get state and actions from stores
  const { initialize, setError: setAuthError } = useAuthStore();
  const { connect: connectWs, setError: setWsError } = useWsStore();

  // Use ref for tracking initialization to prevent unnecessary effect triggers
  const isInitializedRef = useRef(false);

  // Hook that uses React Query - safe to use here as no rendering depends on it
  const { loadInitialUnreadCounts } = useUnreadCounts();

  // WebSocket connection tracking ref to avoid state-based re-renders
  const wsConnectionStatusRef = useRef({
    hadSuccessfulConnection: false,
    hasDisconnected: false,
    lastConnectedAt: 0,
  });

  // Determine the API mode (direct/proxy)
  const mode = useMemo(
    () => determineMode(serverUrl, proxyUrl, clientId),
    [serverUrl, proxyUrl, clientId],
  );

  // Configure API client
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
      if (onAuthError) {
        onAuthError(error as Error);
      }
    }
  }, [serverUrl, proxyUrl, clientId, token, mode, onAuthError]);

  // Handle WebSocket reconnection - optimized to reduce dependencies
  const handleWsReconnect = useCallback(() => {
    if (
      wsConnectionStatusRef.current.hadSuccessfulConnection &&
      wsConnectionStatusRef.current.hasDisconnected
    ) {
      void loadInitialUnreadCounts();
      wsConnectionStatusRef.current.hasDisconnected = false;

      // Emit reconnection event
      emitEvent(EventType.WEBSOCKET_CONNECTED, {
        timestamp: Date.now(),
        reconnected: true,
      });
    }
  }, [loadInitialUnreadCounts]);

  // Update WebSocket connection status
  useEffect(() => {
    const handleWsConnection = (state: any) => {
      const isConnected = state.isConnected;
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
    };

    // Subscribe to WebSocket connection events
    return useWsStore.subscribe(handleWsConnection);
  }, [handleWsReconnect]);

  // Initialize authentication and WebSocket connection
  useEffect(() => {
    // Skip if already initialized
    if (isInitializedRef.current) return;

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
            // Only connect in direct mode for now
            if (mode === "direct" && serverUrl) {
              const wsUrl =
                serverUrl.replace(
                  /^http(s)?:\/\//,
                  window.location.protocol === "https:" ? "wss://" : "ws://",
                ) + "/api/v4/websocket";

              const authToken = useAuthStore.getState().token;
              if (authToken) {
                await connectWs(wsUrl, authToken);

                // Load initial unread counts
                await loadInitialUnreadCounts();
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
          // Even without WebSocket, load unread counts
          await loadInitialUnreadCounts();
        }

        // Mark as initialized
        isInitializedRef.current = true;
      } catch (authError) {
        console.error("Failed to initialize authentication:", authError);
        setAuthError(authError as Error);

        if (onAuthError) {
          onAuthError(authError as Error);
        }
      }
    };

    // Only initialize with the required configuration
    if (
      (mode === "direct" && serverUrl) ||
      (mode === "proxy" && proxyUrl && clientId)
    ) {
      void initAuth();
    }

    // Cleanup WebSocket connection on unmount
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
    mode,
    initialize,
    connectWs,
    setAuthError,
    setWsError,
    onInitialized,
    onAuthError,
    onWebSocketError,
    loadInitialUnreadCounts,
  ]);

  // This component doesn't render anything
  return null;
};

/**
 * Memoized Initializer component to prevent unnecessary re-renders
 */
const MemoizedInitializer = React.memo(MattermostInitializer);

/**
 * Main provider component for MattermostConnect
 * Initializes all required services and provides context to child components
 */
export const MattermostProvider: React.FC<MattermostProviderProps> = (
  props,
) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoizedInitializer {...props} />
      {props.children}
    </QueryClientProvider>
  );
};

/**
 * Direct mode provider for Mattermost
 */
export const MattermostDirectProvider: React.FC<
  Omit<MattermostProviderProps, "proxyUrl" | "clientId"> & {
    serverUrl: string;
  }
> = ({
  children,
  serverUrl,
  token,
  enableWebSocket = true,
  persistAuth = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
}) => {
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
};

/**
 * Proxy mode provider for Mattermost
 */
export const MattermostProxyProvider: React.FC<
  Omit<MattermostProviderProps, "serverUrl"> & {
    proxyUrl: string;
    clientId: string;
  }
> = ({
  children,
  proxyUrl,
  clientId,
  token,
  enableWebSocket = true,
  persistAuth = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
}) => {
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
};
