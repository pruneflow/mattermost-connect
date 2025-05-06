// src/core/services/eventService.ts
/**
 * Event service
 * Provides a browser-compatible event system to replace Node.js EventEmitter
 */
import { EventType } from "../../types";

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Event emitter interface
 * Browser-compatible implementation of event emitter pattern
 */
class EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private maxListeners: number = 10;

  /**
   * Sets the maximum number of listeners for a single event type
   * @param n Maximum number of listeners
   * @returns This instance for chaining
   */
  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  /**
   * Gets the current maximum number of listeners
   * @returns Maximum number of listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Gets the number of listeners for an event
   * @param eventType Event type to check
   * @returns Number of registered listeners
   */
  listenerCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Registers an event listener
   * @param eventType Event type to listen for
   * @param handler Event handler function
   * @returns Function to unregister the listener
   */
  on<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;

    // Check for max listeners
    if (handlers.size >= this.maxListeners) {
      console.warn(
        `Warning: Event emitter for "${eventType}" has exceeded ${this.maxListeners} listeners.`,
      );
    }

    handlers.add(handler as EventHandler);

    // Return function to remove the listener
    return () => {
      this.removeListener(eventType, handler as EventHandler);
    };
  }

  /**
   * Registers a one-time event listener
   * @param eventType Event type to listen for
   * @param handler Event handler function
   * @returns Function to unregister the listener
   */
  once<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    const onceWrapper = ((data: T) => {
      this.removeListener(eventType, onceWrapper);
      (handler as EventHandler)(data);
    }) as EventHandler;

    return this.on(eventType, onceWrapper);
  }

  /**
   * Removes an event listener
   * @param eventType Event type
   * @param handler Handler to remove
   * @returns This instance for chaining
   */
  removeListener(eventType: string, handler: EventHandler): this {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      // Clean up empty sets
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
    return this;
  }

  /**
   * Removes all listeners for an event type
   * @param eventType Optional event type, if not provided removes all listeners
   * @returns This instance for chaining
   */
  removeAllListeners(eventType?: string): this {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
    return this;
  }

  /**
   * Emits an event to registered listeners
   * @param eventType Event type
   * @param data Event data
   * @returns Whether the event had listeners
   */
  emit<T = any>(eventType: string, data: T): boolean {
    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.size === 0) {
      return false;
    }

    // Copy handlers to avoid issues if handlers are added/removed during iteration
    const handlersToCall = Array.from(handlers);
    for (const handler of handlersToCall) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    }

    // Also emit to wildcard listeners
    if (eventType !== "*") {
      this.emit("*", { type: eventType, data });
    }

    return true;
  }

  /**
   * Gets all registered event types
   * @returns Array of event types
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Gets all listeners for an event type
   * @param eventType Event type
   * @returns Array of handlers
   */
  listeners(eventType: string): EventHandler[] {
    const handlers = this.handlers.get(eventType);
    return handlers ? Array.from(handlers) : [];
  }
}

/**
 * Singleton instance of the event emitter
 */
export const eventEmitter = new EventEmitter();

/**
 * Emits an application event
 * @param eventType Event type to emit
 * @param data Event data
 * @returns Whether the event had listeners
 */
export function emitEvent<T = any>(eventType: EventType, data: T): boolean {
  return eventEmitter.emit(eventType, {
    type: eventType,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Registers an event listener
 * @param eventType Event type to listen for
 * @param handler Event handler function
 * @returns Function to unregister the listener
 */
export function onEvent<T = any>(
  eventType: EventType | string,
  handler: EventHandler<T>,
): () => void {
  return eventEmitter.on(eventType, handler);
}

/**
 * Registers multiple event listeners
 * @param handlers Map of event types to handlers
 * @returns Function to unregister all listeners
 */
export function onMultipleEvents<T = any>(
  handlers: Record<string, EventHandler<T>>,
): () => void {
  const unsubscribers: Array<() => void> = [];

  Object.entries(handlers).forEach(([eventType, handler]) => {
    unsubscribers.push(onEvent(eventType, handler));
  });

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

/**
 * Singleton service for application-wide events
 */
export const eventService = {
  emit: emitEvent,
  on: onEvent,
  onMultiple: onMultipleEvents,
  emitter: eventEmitter,
};

export default eventService;
