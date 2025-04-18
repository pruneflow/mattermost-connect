// src/hooks/useRealtime.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useMattermost } from "../context";
import {
  WebSocketEvent,
  WebSocketEventType,
} from "../services/notification/notification.service";

/**
 * Types d'événements pouvant être écoutés
 */
type EventType = WebSocketEventType | string;

/**
 * Fonction de gestion d'événement
 */
type EventHandler = (data: any) => void;

/**
 * Options pour le hook useRealtime
 */
interface UseRealtimeOptions {
  /**
   * Si vrai, les événements seront mis en mémoire tampon lors de déconnexions
   * et rejoués lors de la reconnexion
   */
  bufferEvents?: boolean;

  /** Taille maximale du tampon d'événements */
  maxBufferSize?: number;

  /** Callback appelé lors de la connexion au WebSocket */
  onConnect?: () => void;

  /** Callback appelé lors de la déconnexion du WebSocket */
  onDisconnect?: (event: CloseEvent) => void;

  /** Callback appelé en cas d'erreur WebSocket */
  onError?: (error: Event) => void;

  /** Liste des événements à écouter par défaut */
  events?: EventType[];
}

/**
 * État de retour du hook useRealtime
 */
interface UseRealtimeState {
  /** Indique si le WebSocket est connecté */
  isConnected: boolean;

  /** Indique si une connexion est en cours d'établissement */
  isConnecting: boolean;

  /** Erreur éventuelle */
  error: Error | null;

  /** Nombre de tentatives de reconnexion */
  reconnectAttempt: number;

  /** État WebSocket brut (0-3: CONNECTING, OPEN, CLOSING, CLOSED) */
  socketState: number;

  /** Événements en attente dans le tampon de reconnexion */
  bufferedEventsCount: number;

  /** Dernier événement reçu */
  lastEvent: WebSocketEvent | null;
}

/**
 * Hook personnalisé pour gérer les connexions WebSocket et événements en temps réel
 *
 * @param options Options de configuration
 * @returns État et fonctions pour gérer les événements en temps réel
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  // Options avec valeurs par défaut
  const {
    bufferEvents = true,
    maxBufferSize = 200,
    onConnect,
    onDisconnect,
    onError,
    events = [],
  } = options;

  // Contexte Mattermost
  const { websocket, services } = useMattermost();

  // États locaux
  const [isConnected, setIsConnected] = useState(
    websocket !== null && websocket.getState() === WebSocket.OPEN,
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  // Références pour les objets qui ne déclenchent pas de rendus
  const eventHandlersRef = useRef<Map<EventType, Set<EventHandler>>>(new Map());
  const bufferedEventsRef = useRef<WebSocketEvent[]>([]);
  const isConnectedRef = useRef(isConnected);

  // Mettre à jour la référence quand l'état change
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  /**
   * Initialise un type d'événement dans la map des gestionnaires s'il n'existe pas déjà
   */
  const initEventType = useCallback((eventType: EventType) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    return eventHandlersRef.current.get(eventType)!;
  }, []);

  /**
   * S'abonne à un type d'événement spécifique
   */
  const addEventListener = useCallback(
    (eventType: EventType, handler: EventHandler): (() => void) => {
      const handlers = initEventType(eventType);
      handlers.add(handler);

      // Retourner une fonction de nettoyage
      return () => {
        if (eventHandlersRef.current.has(eventType)) {
          const currentHandlers = eventHandlersRef.current.get(eventType)!;
          currentHandlers.delete(handler);

          // Supprimer le type d'événement s'il n'y a plus de gestionnaires
          if (currentHandlers.size === 0) {
            eventHandlersRef.current.delete(eventType);
          }
        }
      };
    },
    [initEventType],
  );

  /**
   * S'abonne à plusieurs types d'événements à la fois
   */
  const addEventListeners = useCallback(
    (eventMap: Record<EventType, EventHandler>): (() => void) => {
      const cleanupFunctions: Array<() => void> = [];

      Object.entries(eventMap).forEach(([eventType, handler]) => {
        const cleanup = addEventListener(eventType as EventType, handler);
        cleanupFunctions.push(cleanup);
      });

      // Retourner une fonction de nettoyage qui appelle toutes les fonctions de nettoyage
      return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
      };
    },
    [addEventListener],
  );

  /**
   * Dispatche un événement aux gestionnaires appropriés
   */
  const dispatchEvent = useCallback((event: WebSocketEvent) => {
    if (!event || !event.event) return;

    // Mettre à jour le dernier événement
    setLastEvent(event);

    // Trouver les gestionnaires pour ce type d'événement
    const eventType = event.event;
    const handlers = eventHandlersRef.current.get(eventType);

    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(event.data);
        } catch (err) {
          console.error(
            `Erreur dans le gestionnaire d'événement ${eventType}:`,
            err,
          );
        }
      });
    }

    // Dispatche également aux gestionnaires qui écoutent tous les événements
    const allEventHandlers = eventHandlersRef.current.get("*");
    if (allEventHandlers && allEventHandlers.size > 0) {
      allEventHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error(
            "Erreur dans le gestionnaire d'événement universel:",
            err,
          );
        }
      });
    }
  }, []);

  /**
   * Met un événement en mémoire tampon pour le rejouer ultérieurement
   */
  const bufferEvent = useCallback(
    (event: WebSocketEvent) => {
      if (!bufferEvents) return;

      // Ajouter l'événement au tampon
      bufferedEventsRef.current.push(event);

      // Limiter la taille du tampon
      if (bufferedEventsRef.current.length > maxBufferSize) {
        // Supprimer l'événement le plus ancien
        bufferedEventsRef.current.shift();
      }
    },
    [bufferEvents, maxBufferSize],
  );

  /**
   * Rejoue les événements mis en mémoire tampon
   */
  const replayBufferedEvents = useCallback(() => {
    if (!bufferEvents || bufferedEventsRef.current.length === 0) return;

    console.log(
      `Rejouant ${bufferedEventsRef.current.length} événements mis en mémoire tampon`,
    );

    // Copier et vider le tampon avant de rejouer pour éviter les boucles infinies
    const events = [...bufferedEventsRef.current];
    bufferedEventsRef.current = [];

    // Rejouer les événements dans l'ordre
    events.forEach((event) => {
      dispatchEvent(event);
    });
  }, [bufferEvents, dispatchEvent]);

  /**
   * Gère la réception d'un nouvel événement WebSocket
   */
  const handleWebSocketMessage = useCallback(
    (event: WebSocketEvent) => {
      if (!isConnectedRef.current && bufferEvents) {
        // Si déconnecté, mettre l'événement en mémoire tampon
        bufferEvent(event);
        return;
      }

      // Dispatcher l'événement aux gestionnaires
      dispatchEvent(event);
    },
    [bufferEvents, bufferEvent, dispatchEvent],
  );

  /**
   * Envoie un message personnalisé via WebSocket
   */
  const sendMessage = useCallback(
    (action: string, data?: any): boolean => {
      if (!websocket || websocket.getState() !== WebSocket.OPEN) {
        setError(new Error("WebSocket non connecté"));
        return false;
      }

      try {
        const message = {
          action,
          data,
        };

        websocket.send(message);
        return true;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        console.error("Erreur lors de l'envoi du message WebSocket:", errorObj);
        setError(errorObj);
        return false;
      }
    },
    [websocket],
  );

  /**
   * Force une reconnexion WebSocket
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!websocket) {
      setError(new Error("WebSocket non initialisé"));
      return false;
    }

    setIsConnecting(true);
    setReconnectAttempt((prev) => prev + 1);

    try {
      await websocket.reconnect();
      setIsConnected(true);
      setError(null);

      // Rejouer les événements mis en mémoire tampon après la reconnexion
      setTimeout(() => {
        replayBufferedEvents();
      }, 500); // Court délai pour s'assurer que la connexion est bien établie

      return true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.error("Erreur lors de la reconnexion WebSocket:", errorObj);
      setError(errorObj);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [websocket, replayBufferedEvents]);

  /**
   * S'abonne aux événements de notification du service
   */
  const subscribeToNotificationService = useCallback(() => {
    if (!services || !services.notificationService) return () => {};

    // S'abonner aux événements de la liste
    const cleanupFunctions: Array<() => void> = [];

    events.forEach((eventType) => {
      const cleanup = services.notificationService.addEventListener(
        eventType,
        (data) =>
          handleWebSocketMessage({ event: eventType, data } as WebSocketEvent),
      );

      cleanupFunctions.push(cleanup);
    });

    // Retourner une fonction de nettoyage qui appelle toutes les fonctions de nettoyage
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [services, events, handleWebSocketMessage]);

  // Gérer les changements d'état du WebSocket
  useEffect(() => {
    if (!websocket) {
      setIsConnected(false);
      return;
    }

    const socketState = websocket.getState();
    setIsConnected(socketState === WebSocket.OPEN);

    // Si le WebSocket vient d'être connecté, rejouer les événements mis en mémoire tampon
    if (socketState === WebSocket.OPEN && bufferEvents) {
      setTimeout(() => {
        replayBufferedEvents();
      }, 500); // Court délai pour s'assurer que la connexion est bien établie

      // Appeler le callback onConnect si fourni
      if (onConnect) {
        onConnect();
      }
    }
  }, [websocket, bufferEvents, replayBufferedEvents, onConnect]);

  // S'abonner aux événements de notification
  useEffect(() => {
    return subscribeToNotificationService();
  }, [subscribeToNotificationService]);

  // Retourner l'état et les fonctions
  return {
    // État
    isConnected,
    isConnecting,
    error,
    reconnectAttempt,
    socketState: websocket ? websocket.getState() : WebSocket.CLOSED,
    bufferedEventsCount: bufferedEventsRef.current.length,
    lastEvent,

    // Fonctions
    addEventListener,
    addEventListeners,
    sendMessage,
    reconnect,

    // Constantes
    WebSocketState: {
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED,
    },

    // Types d'événements
    EventType: WebSocketEventType,
  };
}

export default useRealtime;
