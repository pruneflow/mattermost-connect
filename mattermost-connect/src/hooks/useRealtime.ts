// src/hooks/useRealtime.ts
import { useState, useEffect, useCallback } from "react";
import { useConnection } from "../context";
import {
  WebSocketEventType,
  WebSocketEvent,
} from "../services/notification/notification.service";

/**
 * Event types that can be listened to
 */
type EventType = WebSocketEventType | string;

/**
 * Event handler function
 */
type EventHandler = (data: any) => void;

/**
 * Options for the useRealtime hook
 */
interface UseRealtimeOptions {
  /**
   * If true, events will be buffered during disconnections
   * and replayed on reconnection
   */
  bufferEvents?: boolean;

  /** Maximum size of the event buffer */
  maxBufferSize?: number;

  /** Callback called when connected to WebSocket */
  onConnect?: () => void;

  /** Callback called when disconnected from WebSocket */
  onDisconnect?: (event: CloseEvent) => void;

  /** Callback called on WebSocket error */
  onError?: (error: Event) => void;

  /** List of events to listen to by default */
  events?: EventType[];
}

/**
 * Return state for the useRealtime hook
 */
interface UseRealtimeState {
  /** Indicates if WebSocket is connected */
  isConnected: boolean;

  /** Indicates if a connection is being established */
  isConnecting: boolean;

  /** Error if any */
  error: Error | null;

  /** Reconnection attempt count */
  reconnectAttempt: number;

  /** Raw WebSocket state (0-3: CONNECTING, OPEN, CLOSING, CLOSED) */
  socketState: number;

  /** Number of events in the reconnection buffer */
  bufferedEventsCount: number;

  /** Last received event */
  lastEvent: WebSocketEvent | null;
}

/**
 * Custom hook for managing WebSocket connections and realtime events
 * This version is backward compatible but leverages the new ConnectionContext
 *
 * @param options Configuration options
 * @returns State and functions for managing realtime events
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  // Options with default values
  const {
    bufferEvents = true,
    maxBufferSize = 200,
    onConnect,
    onDisconnect,
    onError,
    events = [],
  } = options;

  // Use the connection context
  const connection = useConnection();

  // Local states
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const [bufferedEvents, setBufferedEvents] = useState<WebSocketEvent[]>([]);

  // Event handler registration
  const addEventListener = useCallback(
    (eventType: EventType, handler: EventHandler): (() => void) => {
      return connection.addEventListener(eventType, handler);
    },
    [connection],
  );

  // Register multiple event handlers at once
  const addEventListeners = useCallback(
    (eventMap: Record<EventType, EventHandler>): (() => void) => {
      return connection.addEventListeners(eventMap);
    },
    [connection],
  );

  // Buffer an event for later replay
  const bufferEvent = useCallback(
    (event: WebSocketEvent) => {
      if (!bufferEvents) return;

      setBufferedEvents((prev) => {
        // Add event to buffer
        const newBuffer = [...prev, event];

        // Limit buffer size
        if (newBuffer.length > maxBufferSize) {
          return newBuffer.slice(newBuffer.length - maxBufferSize);
        }

        return newBuffer;
      });
    },
    [bufferEvents, maxBufferSize],
  );

  // Replay buffered events
  const replayBufferedEvents = useCallback(() => {
    if (!bufferEvents || bufferedEvents.length === 0) return;

    console.log(`Replaying ${bufferedEvents.length} buffered events`);

    // Dispatch events in order
    bufferedEvents.forEach((event) => {
      // In a real implementation, this would dispatch to event handlers
      setLastEvent(event);
    });

    // Clear buffer after replay
    setBufferedEvents([]);
  }, [bufferEvents, bufferedEvents]);

  // Send a custom message via WebSocket
  const sendMessage = useCallback(
    (action: string, data?: any): boolean => {
      return connection.sendMessage(action, data);
    },
    [connection],
  );

  // Force WebSocket reconnection
  const reconnect = useCallback(async (): Promise<boolean> => {
    setReconnectAttempt((prev) => prev + 1);
    const success = await connection.reconnect();

    if (success && bufferEvents) {
      // Replay buffered events after reconnection
      setTimeout(() => {
        replayBufferedEvents();
      }, 500);
    }

    return success;
  }, [connection, bufferEvents, replayBufferedEvents]);

  // Handle connection and disconnection events
  useEffect(() => {
    if (connection.isConnected) {
      if (onConnect) onConnect();

      // Replay buffered events when connected
      if (bufferEvents && bufferedEvents.length > 0) {
        setTimeout(() => {
          replayBufferedEvents();
        }, 500);
      }
    }
  }, [
    connection.isConnected,
    onConnect,
    bufferEvents,
    bufferedEvents.length,
    replayBufferedEvents,
  ]);

  // Register event handlers for errors and disconnections
  useEffect(() => {
    // These would normally be registered with the WebSocket connection
    // In this refactored version, we're assuming ConnectionContext handles this internally

    // For backward compatibility, we'll handle the onError and onDisconnect callbacks
    if (connection.error && onError) {
      onError(new Event("error")); // Simplified
    }

    if (
      !connection.isConnected &&
      onDisconnect &&
      connection.socketState === WebSocket.CLOSED
    ) {
      onDisconnect(new CloseEvent("close")); // Simplified
    }
  }, [
    connection.error,
    connection.isConnected,
    connection.socketState,
    onError,
    onDisconnect,
  ]);

  // Register default event listeners
  useEffect(() => {
    if (events.length === 0 || !connection.isConnected) return;

    // Create a map of event handlers
    const eventHandlers: Record<string, EventHandler> = {};

    events.forEach((eventType) => {
      eventHandlers[eventType] = (data: any) => {
        const event = { event: eventType, data } as WebSocketEvent;
        setLastEvent(event);

        if (!connection.isConnected && bufferEvents) {
          bufferEvent(event);
        }
      };
    });

    // Register all handlers at once
    const cleanup = connection.addEventListeners(eventHandlers);

    return cleanup;
  }, [events, connection.isConnected, connection, bufferEvents, bufferEvent]);

  // Return the combined state and functions
  return {
    // State
    isConnected: connection.isConnected,
    isConnecting: connection.isConnecting,
    error: connection.error,
    reconnectAttempt,
    socketState: connection.socketState,
    bufferedEventsCount: bufferedEvents.length,
    lastEvent,

    // Functions
    addEventListener,
    addEventListeners,
    sendMessage,
    reconnect,

    // Constants
    WebSocketState: connection.WebSocketState,
    EventType: connection.EventType,
  };
}

export default useRealtime;
