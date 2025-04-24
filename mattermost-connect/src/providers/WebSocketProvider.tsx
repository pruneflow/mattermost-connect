// src/providers/WebSocketProvider.tsx
/**
 * Provider pour la gestion des connexions WebSocket
 * Gère la connexion, déconnexion et les messages WebSocket
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useServices } from "./ServicesProvider";
import { useAuth } from "./AuthProvider";
import { WebSocketContext, WebSocketContextValue } from "./contexts";
import { WebSocketState } from "../core/types/websocket.types";

/**
 * Propriétés du provider WebSocket
 */
interface WebSocketProviderProps {
  /** Enfants du provider */
  children: ReactNode;

  /** Activer WebSocket automatiquement */
  enableWebSocket?: boolean;

  /** Intervalle de ping en ms */
  pingInterval?: number;

  /** Callback appelé à l'ouverture de la connexion */
  onConnected?: () => void;

  /** Callback appelé à la fermeture de la connexion */
  onDisconnected?: (event: CloseEvent) => void;

  /** Callback appelé en cas d'erreur */
  onError?: (error: Error) => void;
}

/**
 * État initial du WebSocket
 */
const initialWebSocketState: WebSocketState = {
  isConnected: false,
  isConnecting: false,
  url: null,
  error: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
};

/**
 * Hook pour accéder au contexte WebSocket
 *
 * @returns Contexte WebSocket
 * @throws Error si utilisé en dehors d'un WebSocketProvider
 */
export function useWebSocket(): WebSocketContextValue {
  const context = React.useContext(WebSocketContext);

  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }

  return context;
}

/**
 * Provider pour la gestion des connexions WebSocket
 *
 * @example
 * ```tsx
 * <WebSocketProvider
 *   enableWebSocket={true}
 *   pingInterval={30000}
 *   onConnected={() => console.log('WebSocket connected')}
 * >
 *   <App />
 * </WebSocketProvider>
 * ```
 */
export function WebSocketProvider({
  children,
  enableWebSocket = true,
  pingInterval = 30000,
  onConnected,
  onDisconnected,
  onError,
}: WebSocketProviderProps): JSX.Element {
  const { webSocketService, errorService } = useServices();
  const { isAuthenticated, currentUser } = useAuth();
  const [state, setState] = useState<WebSocketState>(initialWebSocketState);

  // Fonction pour se connecter au WebSocket
  const connect = useCallback(
    async (url: string, token: string) => {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        await webSocketService.connect(url, token, {
          onOpen: () => {
            setState((prev) => ({
              ...prev,
              isConnected: true,
              isConnecting: false,
              url,
              lastConnectedAt: Date.now(),
              reconnectAttempts: 0,
            }));

            if (onConnected) {
              onConnected();
            }
          },
          onClose: (event) => {
            setState((prev) => ({
              ...prev,
              isConnected: false,
              isConnecting: false,
            }));

            if (onDisconnected) {
              onDisconnected(event);
            }
          },
          onError: (event) => {
            const error = new Error("WebSocket connection error");

            setState((prev) => ({
              ...prev,
              error,
              isConnecting: false,
            }));

            errorService.handleError(error, {
              source: "WebSocketProvider",
              event,
            });

            if (onError) {
              onError(error);
            }
          },
          pingInterval,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        setState((prev) => ({
          ...prev,
          error,
          isConnecting: false,
        }));

        errorService.handleError(error, {
          source: "WebSocketProvider.connect",
        });

        if (onError) {
          onError(error);
        }
      }
    },
    [
      webSocketService,
      errorService,
      onConnected,
      onDisconnected,
      onError,
      pingInterval,
    ],
  );

  // Fonction pour se déconnecter
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, [webSocketService]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback(
    (message: any) => {
      return webSocketService.send(message);
    },
    [webSocketService],
  );

  // Fonction pour s'abonner aux messages
  const subscribe = useCallback(
    (eventType: string, handler: (data: any) => void) => {
      return webSocketService.addMessageHandler(eventType, handler);
    },
    [webSocketService],
  );

  // Connexion/déconnexion automatique basée sur l'état d'authentification
  useEffect(() => {
    if (!enableWebSocket) return;

    if (isAuthenticated && currentUser) {
      // Déterminer l'URL du WebSocket
      const serverUrl = localStorage.getItem("mattermost_server");
      const token = localStorage.getItem("mattermost_token");

      if (serverUrl && token) {
        // Construire l'URL WebSocket
        const wsProtocol =
          window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${serverUrl.replace(/^https?:/, wsProtocol)}/api/v4/websocket`;

        // Se connecter
        connect(wsUrl, token);
      }
    } else if (state.isConnected) {
      // Se déconnecter si l'utilisateur n'est plus authentifié
      disconnect();
    }

    // Nettoyage à la désinscription
    return () => {
      if (state.isConnected) {
        disconnect();
      }
    };
  }, [
    enableWebSocket,
    isAuthenticated,
    currentUser,
    state.isConnected,
    connect,
    disconnect,
  ]);

  // Valeur du contexte mémoïsée
  const contextValue = useMemo<WebSocketContextValue>(
    () => ({
      state,
      connect,
      disconnect,
      sendMessage,
      subscribe,
    }),
    [state, connect, disconnect, sendMessage, subscribe],
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
