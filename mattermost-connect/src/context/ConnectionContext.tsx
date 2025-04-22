// src/context/ConnectionContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { WebSocketConnection, WebSocketSetupOptions } from "../types";
import { setupWebsocket, releaseWebsocket } from "../services";
import { WebSocketEventType } from "../services/notification/notification.service";

/**
 * Interface for the ConnectionContext
 * Provides connection state and WebSocket functionality
 */
export interface ConnectionContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  mode: "direct" | "proxy" | "custom" | null;

  // WebSocket reference and state
  websocket: WebSocketConnection | null;
  socketState: number;

  // Methods for connection management
  connect: () => Promise<WebSocketConnection | null | undefined>;
  disconnect: () => void;
  reconnect: () => Promise<boolean>;
  sendMessage: (action: string, data?: any) => boolean;

  // Event management
  addEventListener: (
    event: string,
    callback: (data: any) => void,
  ) => () => void;
  addEventListeners: (
    eventMap: Record<string, (data: any) => void>,
  ) => () => void;

  // Constants
  WebSocketState: {
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
  };
  EventType: typeof WebSocketEventType;
}

// Create the context with a default value of null
export const ConnectionContext = createContext<ConnectionContextType | null>(
  null,
);

/**
 * Custom hook to access the ConnectionContext
 * Throws an error if used outside of a ConnectionProvider
 */
export function useConnection(): ConnectionContextType {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return context;
}

/**
 * Props for ConnectionProvider component
 */
export interface ConnectionProviderProps {
  children: ReactNode;

  // Connection configuration
  serverUrl?: string;
  token?: string;
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Options
  enableWebsocket?: boolean;
  notificationHandler?: (event: any) => void;

  // Connection mode
  mode?: "direct" | "proxy" | "custom";
}

/**
 * Provider component for WebSocket connection management
 * Handles WebSocket lifecycle, reconnection, and event dispatching
 */
export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({
  children,
  serverUrl,
  token,
  proxyUrl,
  clientId,
  userId,
  enableWebsocket = true,
  notificationHandler,
  mode: initialMode = null,
}) => {
  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);

  // Refs to avoid unnecessary re-renders
  const websocketRef = useRef<WebSocketConnection | null>(null);
  const serverUrlRef = useRef<string | undefined>(serverUrl);
  const tokenRef = useRef<string | undefined>(token);
  const proxyUrlRef = useRef<string | undefined>(proxyUrl);
  const clientIdRef = useRef<string | undefined>(clientId);
  const userIdRef = useRef<string | undefined>(userId);

  // Ref for event listeners
  const eventListeners = useRef<Record<string, Set<(data: any) => void>>>({});

  // Determine connection mode based on props
  const mode = useMemo<"direct" | "proxy" | "custom" | null>(() => {
    if (initialMode) return initialMode;
    if (serverUrl && token) return "direct";
    if (proxyUrl && clientId) return "proxy";
    return null;
  }, [initialMode, serverUrl, token, proxyUrl, clientId]);

  // Update refs when props change
  useEffect(() => {
    serverUrlRef.current = serverUrl;
    tokenRef.current = token;
    proxyUrlRef.current = proxyUrl;
    clientIdRef.current = clientId;
    userIdRef.current = userId;
  }, [serverUrl, token, proxyUrl, clientId, userId]);

  /**
   * Initialize event listeners system
   */
  const initEventListeners = useCallback(() => {
    // Initialize basic WebSocket event types
    Object.values(WebSocketEventType).forEach((eventType) => {
      if (!eventListeners.current[eventType]) {
        eventListeners.current[eventType] = new Set();
      }
    });

    // Add custom internal events
    const customEvents = [
      "connection_established",
      "connection_lost",
      "connection_error",
    ];

    customEvents.forEach((eventType) => {
      if (!eventListeners.current[eventType]) {
        eventListeners.current[eventType] = new Set();
      }
    });
  }, []);

  /**
   * Notify all listeners for a specific event
   */
  const notifyListeners = useCallback((event: string, data: any) => {
    if (eventListeners.current[event]) {
      eventListeners.current[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }, []);

  /**
   * Process a WebSocket event
   */
  const processWebSocketEvent = useCallback(
    (event: any) => {
      // Pass to notification handler if provided
      if (notificationHandler) {
        notificationHandler(event);
      }

      // Also notify internal listeners
      if (event.event && eventListeners.current[event.event]) {
        notifyListeners(event.event, event.data);
      }
    },
    [notificationHandler, notifyListeners],
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    // Skip if websocket is disabled or already connecting/connected
    if (!enableWebsocket || isConnecting || isConnected) {
      return websocketRef.current;
    }

    // Determine WebSocket URL based on mode
    let wsUrl: string;
    let wsToken: string;

    if (!mode) {
      setError(new Error("Cannot connect: Invalid connection configuration"));
      return null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Configure WebSocket based on mode
      if (mode === "direct") {
        if (!serverUrl || !token) {
          console.debug("Direct mode requires serverUrl and token");
          setIsConnecting(false);
          return null;
        }

        wsUrl = serverUrl.replace(/^http/, "ws") + "/api/v4/websocket";
        wsToken = token;
      } else if (mode === "proxy") {
        if (!proxyUrl || !clientId) {
          console.debug("Proxy mode requires proxyUrl and clientId");
          setIsConnecting(false);
          return null;
        }

        wsUrl = proxyUrl.replace(/^http/, "ws") + "/websocket";

        // For proxy mode, we need to get a WebSocket token from the server
        try {
          const response = await fetch(`${proxyUrl}/websocket/token`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Mattermost-Client-ID": clientId,
              ...(userId ? { "X-Mattermost-User-ID": userId } : {}),
            },
          });

          if (!response.ok) {
            console.debug(`Failed to get WebSocket token: ${response.status}`);
            setIsConnecting(false);
            return null;
          }

          const data = await response.json();
          wsToken = data.token;
        } catch (tokenError) {
          console.error("Error retrieving WebSocket token:", tokenError);
          setIsConnecting(false);
          return null;
        }
      } else {
        // Custom mode - placeholder, would need implementation
        console.debug("Custom WebSocket mode not implemented");
        setIsConnecting(false);
        return null;
      }

      // Set up WebSocket options
      const wsOptions: WebSocketSetupOptions = {
        mode,
        serverUrl: wsUrl,
        token: wsToken,
        onMessage: processWebSocketEvent,
        onError: (wsError) => {
          console.error("WebSocket error:", wsError);
          setError(new Error("WebSocket connection error"));
          notifyListeners("connection_error", wsError);
        },
        onClose: (closeEvent) => {
          console.log("WebSocket closed:", closeEvent);
          setIsConnected(false);
          setWebsocket(null);
          websocketRef.current = null;
          notifyListeners("connection_lost", closeEvent);
        },
      };

      // Create WebSocket connection
      const wsConnection = await setupWebsocket(wsOptions);

      // Update state and refs
      setWebsocket(wsConnection);
      websocketRef.current = wsConnection;
      setIsConnected(true);
      setError(null);

      // Notify listeners of successful connection
      notifyListeners("connection_established", { timestamp: Date.now() });

      return wsConnection;
    } catch (connectionError) {
      const errorObj =
        connectionError instanceof Error
          ? connectionError
          : new Error(String(connectionError));

      console.error("WebSocket connection error:", errorObj);
      setError(errorObj);
      setIsConnected(false);
      notifyListeners("connection_error", errorObj);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [
    enableWebsocket,
    isConnecting,
    isConnected,
    mode,
    serverUrl,
    token,
    proxyUrl,
    clientId,
    userId,
    processWebSocketEvent,
    notifyListeners,
  ]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      console.debug("Closing WebSocket connection");

      // Close connection
      websocketRef.current.close();

      // Clean up WebSocket resources based on mode
      if (mode === "direct" && serverUrlRef.current && tokenRef.current) {
        const wsUrl =
          serverUrlRef.current.replace(/^http/, "ws") + "/api/v4/websocket";
        releaseWebsocket(wsUrl, tokenRef.current);
      } else if (
        mode === "proxy" &&
        proxyUrlRef.current &&
        clientIdRef.current
      ) {
        // For proxy mode, use the correct URL format
        const wsUrl = proxyUrlRef.current.replace(/^http/, "ws") + "/websocket";

        // Use a placeholder token if needed
        const proxyToken = "proxy-token"; // This should be the actual token if available
        releaseWebsocket(wsUrl, proxyToken);
      }

      // Update state
      setWebsocket(null);
      websocketRef.current = null;
      setIsConnected(false);
    }
  }, [mode]);

  /**
   * Force WebSocket reconnection
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    disconnect();

    try {
      await connect();
      return true;
    } catch (error) {
      console.error("Reconnection failed:", error);
      return false;
    }
  }, [disconnect, connect]);

  /**
   * Send a message through the WebSocket connection
   */
  const sendMessage = useCallback((action: string, data?: any): boolean => {
    if (
      !websocketRef.current ||
      websocketRef.current.getState() !== WebSocket.OPEN
    ) {
      setError(new Error("WebSocket not connected"));
      return false;
    }

    try {
      const message = { action, data };
      websocketRef.current.send(message);
      return true;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      console.error("Error sending WebSocket message:", errorObj);
      setError(errorObj);
      return false;
    }
  }, []);

  /**
   * Add an event listener for a specific event type
   */
  const addEventListener = useCallback(
    (event: string, callback: (data: any) => void) => {
      // Create the set if it doesn't exist
      if (!eventListeners.current[event]) {
        eventListeners.current[event] = new Set();
      }

      // Add to the set of listeners
      eventListeners.current[event].add(callback);

      // Return a cleanup function
      return () => {
        if (eventListeners.current[event]) {
          eventListeners.current[event].delete(callback);
        }
      };
    },
    [],
  );

  /**
   * Add multiple event listeners at once
   */
  const addEventListeners = useCallback(
    (eventMap: Record<string, (data: any) => void>) => {
      const cleanupFunctions: Array<() => void> = [];

      Object.entries(eventMap).forEach(([eventType, handler]) => {
        const cleanup = addEventListener(eventType, handler);
        cleanupFunctions.push(cleanup);
      });

      // Return a combined cleanup function
      return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
      };
    },
    [addEventListener],
  );

  // Initialize event listeners on first render
  useEffect(() => {
    initEventListeners();
  }, [initEventListeners]);

  // Auto-connect when enabled and configuration changes
  useEffect(() => {
    if (enableWebsocket && mode && !isConnected && !isConnecting) {
      void connect();
    }

    // Cleanup on unmount
    return () => {
      if (websocketRef.current) {
        disconnect();
      }
    };
  }, [enableWebsocket, mode, isConnected, isConnecting, connect, disconnect]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ConnectionContextType>(
    () => ({
      // State
      isConnected,
      isConnecting,
      error,
      mode,
      websocket,
      socketState: websocket ? websocket.getState() : WebSocket.CLOSED,

      // Methods
      connect,
      disconnect,
      reconnect,
      sendMessage,
      addEventListener,
      addEventListeners,

      // Constants
      WebSocketState: {
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED,
      },
      EventType: WebSocketEventType,
    }),
    [
      isConnected,
      isConnecting,
      error,
      mode,
      websocket,
      connect,
      disconnect,
      reconnect,
      sendMessage,
      addEventListener,
      addEventListeners,
    ],
  );

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};
