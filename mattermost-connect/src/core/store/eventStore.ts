// src/core/store/eventStore.ts
/**
 * Event store for centralized event handling
 * Manages application-wide events and subscriptions
 */
import { create } from "zustand";
import {
  EventType,
  EventCategory,
  EventPayload,
  EventHandler,
} from "../../types/event.types";

interface EventStoreState {
  // State
  handlers: Record<string, Set<EventHandler>>;
  lastEvents: Record<string, EventPayload>;

  // Actions
  addHandler: <T>(eventType: EventType, handler: EventHandler<T>) => () => void;
  addHandlers: (handlers: Record<EventType, EventHandler>) => () => void;
  removeHandler: <T>(eventType: EventType, handler: EventHandler<T>) => void;
  emitEvent: <T>(
    eventType: EventType,
    data: T,
    meta?: Record<string, any>,
  ) => void;

  // Selectors
  getLastEvent: <T>(eventType: EventType) => EventPayload<T> | null;

  // Reset
  reset: () => void;
}

/**
 * Event store for centralized event management
 */
export const useEventStore = create<EventStoreState>()((set, get) => ({
  // Initial state
  handlers: {},
  lastEvents: {},

  /**
   * Adds an event handler for a specific event type
   * @param eventType Type of event to handle
   * @param handler Function to call when event occurs
   * @returns Function to remove the handler
   */
  addHandler: <T>(eventType: EventType, handler: EventHandler<T>) => {
    set((state) => {
      const eventHandlers =
        state.handlers[eventType] || new Set<EventHandler>();
      eventHandlers.add(handler as EventHandler);

      return {
        handlers: {
          ...state.handlers,
          [eventType]: eventHandlers,
        },
      };
    });

    // Return function to remove the handler
    return () => {
      get().removeHandler(eventType, handler);
    };
  },

  /**
   * Adds multiple event handlers
   * @param handlers Map of event types to handler functions
   * @returns Function to remove all handlers
   */
  addHandlers: (handlers) => {
    const unregisterFunctions: Array<() => void> = [];

    Object.entries(handlers).forEach(([eventType, handler]) => {
      unregisterFunctions.push(
        get().addHandler(eventType as EventType, handler),
      );
    });

    // Return function to remove all handlers
    return () => {
      unregisterFunctions.forEach((unregister) => unregister());
    };
  },

  /**
   * Removes an event handler
   * @param eventType Type of event
   * @param handler Handler to remove
   */
  removeHandler: <T>(eventType: EventType, handler: EventHandler<T>) => {
    set((state) => {
      const eventHandlers = state.handlers[eventType];
      if (!eventHandlers) return state;

      eventHandlers.delete(handler as EventHandler);

      const updatedHandlers = { ...state.handlers };
      if (eventHandlers.size === 0) {
        delete updatedHandlers[eventType];
      } else {
        updatedHandlers[eventType] = eventHandlers;
      }

      return { handlers: updatedHandlers };
    });
  },

  /**
   * Emits an event to all registered handlers
   * @param eventType Type of event to emit
   * @param data Event payload data
   * @param meta Optional metadata
   */
  emitEvent: <T>(eventType: EventType, data: T, meta?: Record<string, any>) => {
    const payload: EventPayload<T> = {
      type: eventType,
      data,
      timestamp: Date.now(),
      meta,
    };

    // Store the last event of this type
    set((state) => ({
      lastEvents: {
        ...state.lastEvents,
        [eventType]: payload,
      },
    }));

    // Notify all handlers for this event type
    const handlers = get().handlers[eventType];
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }

    // Also notify wildcard handlers for any event in the same category
    const category = eventType.split(":")[0];
    const categoryWildcard = `${category}:*`;
    const wildcardHandlers = get().handlers[categoryWildcard];

    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(
            `Error in wildcard handler for ${categoryWildcard}:`,
            error,
          );
        }
      });
    }
  },

  /**
   * Gets the last event of a specific type
   * @param eventType Type of event to retrieve
   * @returns The last event payload or null
   */
  getLastEvent: <T>(eventType: EventType): EventPayload<T> | null => {
    return (get().lastEvents[eventType] as EventPayload<T>) || null;
  },

  /**
   * Resets the event store to initial state
   */
  reset: () => {
    set({
      handlers: {},
      lastEvents: {},
    });
  },
}));

/**
 * Helper function to register an event handler
 * @param eventType Event type to listen for
 * @param handler Handler function
 * @returns Function to unregister handler
 */
export function registerEventHandler<T>(
  eventType: EventType,
  handler: EventHandler<T>,
): () => void {
  return useEventStore.getState().addHandler(eventType, handler);
}

/**
 * Helper function to register multiple event handlers
 * @param handlers Map of event types to handlers
 * @returns Function to unregister all handlers
 */
export function registerEventHandlers(
  handlers: Record<EventType, EventHandler>,
): () => void {
  return useEventStore.getState().addHandlers(handlers);
}

/**
 * Helper function to emit an event
 * @param eventType Type of event to emit
 * @param data Event data
 * @param meta Optional metadata
 */
export function emitEvent<T>(
  eventType: EventType,
  data: T,
  meta?: Record<string, any>,
): void {
  useEventStore.getState().emitEvent(eventType, data, meta);
}
