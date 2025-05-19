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
import { emitEvent } from "../core/api/eventUtils";
import { EventType } from "../types";
import { DialogProvider } from "../internal/providers/DialogProvider";
import { ensureChannelEventHandlers } from "../core/services/channelWebSocketHandler";

// Using hooks instead of directly accessing stores
import {
  useAuth,
  useWebSocket,
  useAuthInitialize,
  useTeamUnreadCount,
} from "../hooks";

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
 * API Configuration Initializer
 * Responsible for configuring the API client
 */
const ApiConfigInitializer: React.FC<{
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  token?: string;
  onError?: (error: Error) => void;
}> = ({ serverUrl, proxyUrl, clientId, token, onError }) => {
  // Determine the API mode (direct/proxy)
  const mode = useMemo(
    () => determineMode(serverUrl, proxyUrl, clientId),
    [serverUrl, proxyUrl, clientId],
  );

  // Configure API client on mount or when configuration changes
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
          if (onError && error.status === 401) {
            onError(error as Error);
          }
        },
      });
    } catch (error) {
      console.error("Failed to configure API client:", error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [serverUrl, proxyUrl, clientId, token, mode, onError]);

  // This component doesn't render anything
  return null;
};

/**
 * Auth Initializer
 * Responsible for initializing authentication
 */
const AuthInitializer: React.FC<{
  token?: string;
  persistAuth?: boolean;
  onInitialized?: (success: boolean) => void;
  onError?: (error: Error) => void;
}> = ({ onInitialized, onError }) => {
  const { isInitialized, error: authError } = useAuthInitialize();
  const { isAuthenticated, error } = useAuth();

  // Track initialization status to prevent multiple callbacks
  const hasCalledInitCallback = useRef(false);

  // Call onInitialized when auth is initialized
  useEffect(() => {
    if (isInitialized && !hasCalledInitCallback.current) {
      hasCalledInitCallback.current = true;
      if (onInitialized) {
        onInitialized(isAuthenticated);
      }
    }
  }, [isInitialized, isAuthenticated, onInitialized]);

  // Report auth errors
  useEffect(() => {
    const errorToReport = error || authError;
    if (errorToReport && onError) {
      onError(errorToReport);
    }
  }, [error, authError, onError]);

  // This component doesn't render anything
  return null;
};

/**
 * WebSocket Initializer
 * Responsible for establishing and maintaining WebSocket connection
 */
const WebSocketInitializer: React.FC<{
  mode: "direct" | "proxy";
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  enabled?: boolean;
  onError?: (error: Error) => void;
}> = ({ mode, serverUrl, proxyUrl, clientId, enabled = true, onError }) => {
  const { isAuthenticated, token } = useAuth();
  const {
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    isConnected,
    error: wsError,
  } = useWebSocket();

  // WebSocket connection tracking ref to optimize reconnection logic
  const wsConnectionStatusRef = useRef({
    hadSuccessfulConnection: false,
    hasDisconnected: false,
    lastConnectedAt: 0,
  });

  // Connect to WebSocket when authenticated and enabled
  useEffect(() => {
    // Skip if not enabled or not authenticated
    if (!enabled || !isAuthenticated || !token) return;

    // Skip if missing required URLs for the mode
    if (
      (mode === "direct" && !serverUrl) ||
      (mode === "proxy" && (!proxyUrl || !clientId))
    ) {
      return;
    }

    const initWebSocket = async () => {
      try {
        let wsUrl;

        if (mode === "direct" && serverUrl) {
          // Direct mode WebSocket URL
          wsUrl =
            serverUrl.replace(
              /^http(s)?:\/\//,
              window.location.protocol === "https:" ? "wss://" : "ws://",
            ) + "/api/v4/websocket";
        } else if (mode === "proxy" && proxyUrl) {
          // Proxy mode WebSocket URL
          wsUrl =
            proxyUrl.replace(
              /^http(s)?:\/\//,
              window.location.protocol === "https:" ? "wss://" : "ws://",
            ) + "/ws"; // Assuming proxy WebSocket endpoint
        }

        if (wsUrl) {
          try {
            await connectWebSocket(wsUrl, token);
          } catch (error) {
            if (
              error instanceof Error &&
              (error.message.includes("timeout") ||
                error.message.includes("CORS") ||
                error.message.includes("could not be accessed"))
            ) {
              console.warn(
                "WebSocket connection failed but continuing:",
                error,
              );
              // Emit an event to indicate that WebSocket failed but we continue
              emitEvent(EventType.WEBSOCKET_FAILED_CONTINUE, {
                error,
                timestamp: Date.now(),
              });
            } else {
              // For other errors, propagate them
              throw error;
            }
          }
        }
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    void initWebSocket();

    // Cleanup WebSocket connection on unmount
    return () => {
      disconnectWebSocket();
    };
  }, [
    mode,
    serverUrl,
    proxyUrl,
    clientId,
    enabled,
    isAuthenticated,
    token,
    connectWebSocket,
    disconnectWebSocket,
    onError,
  ]);

  // Update connection tracking status and initialize event handlers
  useEffect(() => {
    if (isConnected) {
      // Determine if this is a reconnection
      const isReconnection =
        wsConnectionStatusRef.current.hadSuccessfulConnection &&
        wsConnectionStatusRef.current.hasDisconnected;

      // Emit connected event with reconnection flag if appropriate
      emitEvent(EventType.WEBSOCKET_CONNECTED, {
        timestamp: Date.now(),
        reconnected: isReconnection,
      });

      // Update connection status
      wsConnectionStatusRef.current = {
        hadSuccessfulConnection: true,
        hasDisconnected: false,
        lastConnectedAt: Date.now(),
      };
      
      // Initialize channel WebSocket event handlers
      ensureChannelEventHandlers();
    } else if (wsConnectionStatusRef.current.hadSuccessfulConnection) {
      wsConnectionStatusRef.current.hasDisconnected = true;

      // Optionally emit disconnected event
      emitEvent(EventType.WEBSOCKET_DISCONNECTED, {
        timestamp: Date.now(),
        reason: "Connection lost",
      });
    }
  }, [isConnected]);

  // Report WebSocket errors
  useEffect(() => {
    if (wsError && onError) {
      onError(wsError);
    }
  }, [wsError, onError]);

  // This component doesn't render anything
  return null;
};

/**
 * Data Initializer
 * Responsible for loading initial data like unread counts
 */
const DataInitializer: React.FC<{
  enabled?: boolean;
}> = ({ enabled = true }) => {
  const { isAuthenticated } = useAuth();
  const { isConnected } = useWebSocket();

  const { refresh: refreshTeamUnreads } = useTeamUnreadCount("");

  // Load initial unread counts
  const loadInitialUnreadCounts = useCallback(async () => {
    try {
      // Refresh team unread counts which should update all unread data
      if (refreshTeamUnreads) {
        await refreshTeamUnreads();
        return true;
      }

      console.warn("Team unread refresh method not available");
      return false;
    } catch (error) {
      console.error("Failed to load initial unread counts:", error);
      return false;
    }
  }, [refreshTeamUnreads]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    void loadInitialUnreadCounts();
  }, [enabled, isAuthenticated, loadInitialUnreadCounts]);

  // Handle WebSocket reconnection
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      // When WebSocket reconnects, refresh data
      void loadInitialUnreadCounts();
    }
  }, [isConnected, isAuthenticated, loadInitialUnreadCounts]);

  // This component doesn't render anything
  return null;
};

// Memoize initializers to prevent unnecessary re-renders
const MemoizedApiConfigInitializer = React.memo(ApiConfigInitializer);
const MemoizedAuthInitializer = React.memo(AuthInitializer);
const MemoizedWebSocketInitializer = React.memo(WebSocketInitializer);
const MemoizedDataInitializer = React.memo(DataInitializer);

/**
 * Main provider component for MattermostConnect
 * Initializes all required services and provides context to child components
 */
export const MattermostProvider: React.FC<MattermostProviderProps> = ({
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
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* API Configuration Initializer */}
      <MemoizedApiConfigInitializer
        serverUrl={serverUrl}
        proxyUrl={proxyUrl}
        clientId={clientId}
        token={token}
        onError={onAuthError}
      />
      <DialogProvider>
        {/* Auth Initializer */}
        <MemoizedAuthInitializer
          token={token}
          persistAuth={persistAuth}
          onInitialized={onInitialized}
          onError={onAuthError}
        />

        {/* WebSocket Initializer - only when enabled */}
        <MemoizedWebSocketInitializer
          mode={determineMode(serverUrl, proxyUrl, clientId)}
          serverUrl={serverUrl}
          proxyUrl={proxyUrl}
          clientId={clientId}
          enabled={enableWebSocket}
          onError={onWebSocketError}
        />

        {/* Data Initializer */}
        <MemoizedDataInitializer enabled={true} />

        {/* Render children directly */}
        {children}
      </DialogProvider>
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
