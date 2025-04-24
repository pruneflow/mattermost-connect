// src/hooks/useWebSocket.ts
/**
 * Hook pour la gestion des WebSockets
 */
import { useCallback, useEffect, useState } from "react";
import { WebSocketService } from "../core/services/ws.service";
import { useStoreDispatch } from "./useStoreDispatch";
import { useAuth } from "./useAuth";

interface UseWebSocketReturnType {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: any) => boolean;
  addMessageHandler: (
    eventType: string,
    handler: (data: any) => void,
  ) => () => void;
}

export function useWebSocket(
  webSocketService: WebSocketService,
): UseWebSocketReturnType {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Fonction pour se connecter au WebSocket
  const connect = useCallback(
    async (url: string, token: string) => {
      setIsConnecting(true);
      setError(null);

      try {
        await webSocketService.connect(url, token, {
          onOpen: () => {
            setIsConnected(true);
            setIsConnecting(false);
          },
          onClose: () => {
            setIsConnected(false);
          },
          onError: (event) => {
            setError(new Error("WebSocket connection error"));
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsConnecting(false);
      }
    },
    [webSocketService],
  );

  // Fonction pour se déconnecter
  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
  }, [webSocketService]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback(
    (message: any) => {
      return webSocketService.send(message);
    },
    [webSocketService],
  );

  // Fonction pour ajouter un gestionnaire de messages
  const addMessageHandler = useCallback(
    (eventType: string, handler: (data: any) => void) => {
      return webSocketService.addMessageHandler(eventType, handler);
    },
    [webSocketService],
  );

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendMessage,
    addMessageHandler,
  };
}
