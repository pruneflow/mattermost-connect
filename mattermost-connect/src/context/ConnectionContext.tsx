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
import { WebSocketEventType } from "../services";
import { useAuth } from "./AuthContext";
import { useMattermost } from "./MattermostProvider";

/**
 * Interface for the ConnectionContext
 * Provides connection state and WebSocket functionality
 */
export interface ConnectionContextType {
  // Connection state
  isConnected: boolean;
  error: Error | null;

  socketState: number;

  // Methods for connection management
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
  enableWebsocket = true,
  notificationHandler,
  mode,
}) => {
  console.debug("ConnectionProvider");
  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [websocket, setWebsocket] = useState<WebSocketConnection | null>(null);
  const { isAuthenticated, token } = useAuth();
  const { services } = useMattermost();

  // Refs to avoid unnecessary re-renders
  const websocketRef = useRef<WebSocketConnection | null>(null);

  // Ref for event listeners
  const eventListeners = useRef<Record<string, Set<(data: any) => void>>>({});

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
    if (!enableWebsocket || isConnecting || isConnected || !isAuthenticated) {
      return websocketRef.current;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Configurer l'URL WebSocket selon le mode
      let wsUrl: string;
      let wsToken: string;

      if (mode === "direct") {
        if (!services?.mattermostService) {
          console.error("Mattermost service not available");
          return;
        }

        wsUrl = services.mattermostService.getWebsocketUrl();
        wsToken = await services.mattermostService.getWebsocketToken();
      } else if (mode === "proxy") {
        if (!services?.mattermostService) {
          console.error("Mattermost service not available");
          return;
        }

        wsUrl = services.mattermostService.getWebsocketUrl();
        wsToken = await services.mattermostService.getWebsocketToken();
      } else {
        // Custom mode
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
    isAuthenticated,
    mode,
    services,
    token,
    processWebSocketEvent,
    notifyListeners,
  ]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (!websocketRef.current) return;

    console.debug("Closing WebSocket connection");

    // Récupérer l'information nécessaire des services si disponible
    let wsUrl: string | undefined;
    let wsToken: string | undefined;

    if (services?.mattermostService) {
      try {
        // Obtenir l'URL WebSocket depuis le service
        wsUrl = services.mattermostService.getWebsocketUrl();

        wsToken = token || "placeholder-token";
      } catch (error) {
        console.warn("Could not retrieve WebSocket URL from service:", error);
      }
    }

    // Fermer la connexion
    websocketRef.current.close();

    // Libérer les ressources selon le mode si URL et token sont disponibles
    if (wsUrl && wsToken) {
      releaseWebsocket(wsUrl, wsToken);
    } else {
      console.warn(
        "Could not properly release WebSocket resources (missing URL or token)",
      );
    }

    // Mettre à jour l'état
    setWebsocket(null);
    websocketRef.current = null;
    setIsConnected(false);
  }, [services, token]);

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
    if (enableWebsocket && isAuthenticated && !isConnected && !isConnecting) {
      void connect();
    } else if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [
    enableWebsocket,
    isAuthenticated,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  ]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ConnectionContextType>(
    () => ({
      // State
      isConnected,
      error,
      socketState: websocket ? websocket.getState() : WebSocket.CLOSED,

      // Methods
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
    [isConnected, error],
  );

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};
