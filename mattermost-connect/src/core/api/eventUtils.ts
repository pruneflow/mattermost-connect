// src/core/api/eventUtils.ts
/**
 * Event utilities
 * Provides functions for event emission and handling
 * Simplifies event management across the application
 */
import { EventType, EventPayload } from "../../types";

/**
 * Event listener type
 */
type EventListener<T = any> = (payload: EventPayload<T>) => void;

/**
 * Map to store event listeners by event type
 */
const eventListeners: Map<string, Set<EventListener>> = new Map();

/**
 * Emits an event to all registered listeners
 * @param eventType Type of event to emit
 * @param data Event data
 * @param meta Optional metadata
 */
export function emitEvent<T = any>(
  eventType: EventType,
  data: T,
  meta?: Record<string, any>,
): void {
  // Create event payload with timestamp
  const payload: EventPayload<T> = {
    type: eventType,
    data,
    timestamp: Date.now(),
    meta,
  };

  // Get listeners for this specific event type
  const listeners = eventListeners.get(eventType);

  // Notify specific event listeners
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }

  // Also notify category wildcard listeners
  // Category is the part before the colon (e.g., "auth" for "auth:login")
  const category = eventType.split(":")[0];
  const categoryWildcard = `${category}:*`;
  const wildcardListeners = eventListeners.get(categoryWildcard);

  if (wildcardListeners) {
    wildcardListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(
          `Error in wildcard listener for ${categoryWildcard}:`,
          error,
        );
      }
    });
  }
}

/**
 * Registers a listener for a specific event type
 * @param eventType Event type to listen for
 * @param listener Function to call when the event occurs
 * @returns Function to unregister the listener
 */
export function onEvent<T = any>(
  eventType: EventType,
  listener: EventListener<T>,
): () => void {
  // Get or create listener set for this event type
  let listeners = eventListeners.get(eventType);

  if (!listeners) {
    listeners = new Set();
    eventListeners.set(eventType, listeners);
  }

  // Add the listener
  listeners.add(listener as EventListener);

  // Return function to remove the listener
  return () => {
    const listenersSet = eventListeners.get(eventType);
    if (listenersSet) {
      listenersSet.delete(listener as EventListener);

      // Clean up empty sets
      if (listenersSet.size === 0) {
        eventListeners.delete(eventType);
      }
    }
  };
}

/**
 * Registers multiple event listeners at once
 * @param handlers Map of event types to handler functions
 * @returns Function to unregister all listeners
 */
export function onEvents(
  handlers: Record<EventType, EventListener>,
): () => void {
  // Register all handlers
  const unregisterFunctions = Object.entries(handlers).map(
    ([eventType, handler]) => onEvent(eventType as EventType, handler),
  );

  // Return function to unregister all handlers
  return () => {
    unregisterFunctions.forEach((unregister) => unregister());
  };
}

/**
 * Removes all event listeners
 * @param eventType Optional event type to clear listeners for
 */
export function clearEventListeners(eventType?: EventType): void {
  if (eventType) {
    // Clear listeners for specific event type
    eventListeners.delete(eventType);
  } else {
    // Clear all listeners
    eventListeners.clear();
  }
}

/**
 * Gets the number of listeners for an event type
 * @param eventType Event type to check
 * @returns Number of listeners
 */
export function getListenerCount(eventType: EventType): number {
  const listeners = eventListeners.get(eventType);
  return listeners ? listeners.size : 0;
}

/**
 * Creates a typed event emitter for a specific event type
 * Provides better type safety for event data
 *
 * @param eventType Event type
 * @returns Function to emit events of the specified type
 */
export function createTypedEmitter<T>(eventType: EventType) {
  return (data: T, meta?: Record<string, any>) => {
    emitEvent<T>(eventType, data, meta);
  };
}

/**
 * Creates a typed event listener for a specific event type
 * Provides better type safety for event data
 *
 * @param eventType Event type
 * @returns Function to register listeners for the specified event type
 */
export function createTypedListener<T>(eventType: EventType) {
  return (listener: (data: T, meta?: Record<string, any>) => void) => {
    return onEvent<T>(eventType, (payload) => {
      listener(payload.data, payload.meta);
    });
  };
}
