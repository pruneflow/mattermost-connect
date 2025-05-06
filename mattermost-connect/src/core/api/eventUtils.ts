// src/core/api/eventUtils.ts
/**
 * Event utility functions
 * Provides standardized event emission across the application
 */
import { eventService } from "../services/eventService";
import { EventType } from "../../types";

/**
 * Emits an event to the application's event system
 * @param eventType Event type to emit
 * @param data Event data
 * @returns Whether the event had listeners
 */
export function emitEvent<T = any>(eventType: EventType, data: T): boolean {
  return eventService.emit(eventType, data);
}

/**
 * Listens for an event from the application's event system
 * @param eventType Event type to listen for
 * @param handler Event handler function
 * @returns Function to unregister the listener
 */
export function onEvent<T = any>(
  eventType: EventType,
  handler: (data: T) => void,
): () => void {
  return eventService.on(eventType, handler);
}

/**
 * Listens for multiple events from the application's event system
 * @param handlers Map of event types to handlers
 * @returns Function to unregister all listeners
 */
export function onMultipleEvents<T = any>(
  handlers: Record<EventType, (data: T) => void>,
): () => void {
  return eventService.onMultiple(handlers);
}

export default {
  emit: emitEvent,
  on: onEvent,
  onMultiple: onMultipleEvents,
};
