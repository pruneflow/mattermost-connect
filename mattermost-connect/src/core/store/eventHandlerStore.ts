// src/core/store/eventHandlerStore.ts
import { create } from "zustand";

interface EventHandlerState {
  handlers: Record<string, Set<(data: any) => void>>;
}

export const useEventHandlerStore = create<
  EventHandlerState & {
    addHandler: (eventType: string, handler: (data: any) => void) => () => void;
    addHandlers: (handlers: Record<string, (data: any) => void>) => () => void;
    removeHandler: (eventType: string, handler: (data: any) => void) => void;
    notifyHandlers: (eventType: string, data: any) => void;
    reset: () => void;
  }
>((set, get) => ({
  handlers: {},

  addHandler: (eventType: string, handler: (data: any) => void) => {
    set((state) => {
      const eventHandlers =
        state.handlers[eventType] || new Set<(data: any) => void>();
      eventHandlers.add(handler);

      return {
        handlers: {
          ...state.handlers,
          [eventType]: eventHandlers,
        },
      };
    });

    // Return a function to remove the handler
    return () => {
      get().removeHandler(eventType, handler);
    };
  },

  addHandlers: (handlersMap: Record<string, (data: any) => void>) => {
    const unregisterFunctions: Array<() => void> = [];

    Object.entries(handlersMap).forEach(([eventType, handler]) => {
      unregisterFunctions.push(get().addHandler(eventType, handler));
    });

    // Return a function to remove all handlers
    return () => {
      unregisterFunctions.forEach((unregister) => unregister());
    };
  },

  removeHandler: (eventType: string, handler: (data: any) => void) => {
    set((state) => {
      const eventHandlers = state.handlers[eventType];
      if (!eventHandlers) return state;

      eventHandlers.delete(handler);

      const updatedHandlers = { ...state.handlers };
      if (eventHandlers.size === 0) {
        delete updatedHandlers[eventType];
      } else {
        updatedHandlers[eventType] = eventHandlers;
      }

      return { handlers: updatedHandlers };
    });
  },

  notifyHandlers: (eventType: string, data: any) => {
    const handlers = get().handlers[eventType];
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });
  },

  reset: () => {
    set({ handlers: {} });
  },
}));

// Helper functions
export const registerHandler = (
  eventType: string,
  handler: (data: any) => void,
): (() => void) => {
  return useEventHandlerStore.getState().addHandler(eventType, handler);
};

export const registerHandlers = (
  handlers: Record<string, (data: any) => void>,
): (() => void) => {
  return useEventHandlerStore.getState().addHandlers(handlers);
};
