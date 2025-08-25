/**
 * Event service for emoji selection communication between components
 * Allows MessageInput and other components to listen for emoji selections
 * from the global MobileEmojiPanel
 */

class EmojiEventService {
  private listeners: Map<string, Function[]> = new Map();
  
  /**
   * Subscribe to an emoji event
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  /**
   * Unsubscribe from an emoji event
   */
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }
  
  /**
   * Emit an emoji selection event
   */
  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  /**
   * Emit an emoji selection event for a specific input
   */
  emitToInput(inputId: string, data: any) {
    const event = `${EMOJI_EVENTS.EMOJI_SELECTED}_${inputId}`;
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  /**
   * Subscribe to emoji events for a specific input
   */
  onForInput(inputId: string, callback: Function) {
    const event = `${EMOJI_EVENTS.EMOJI_SELECTED}_${inputId}`;
    this.on(event, callback);
  }

  /**
   * Unsubscribe from emoji events for a specific input
   */
  offForInput(inputId: string, callback: Function) {
    const event = `${EMOJI_EVENTS.EMOJI_SELECTED}_${inputId}`;
    this.off(event, callback);
  }
  
  /**
   * Clear all listeners (useful for cleanup)
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Clear listeners for a specific input
   */
  clearForInput(inputId: string) {
    const event = `${EMOJI_EVENTS.EMOJI_SELECTED}_${inputId}`;
    this.listeners.delete(event);
  }
}

export const emojiEvents = new EmojiEventService();

// Event types
export const EMOJI_EVENTS = {
  EMOJI_SELECTED: 'emojiSelected',
} as const;