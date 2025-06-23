import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Type for typing event (following Mattermost WebSocket pattern)
export interface TypingEvent {
  channel_id: string;
  user_id: string;
  username: string;
  timestamp: number;
}

export interface WebSocketState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError: string | null;
  reconnectAttempts: number;
  typingEventsByChannel: Record<string, TypingEvent[]>; // Keyed by channel_id
}

const initialState: WebSocketState = {
  status: 'disconnected',
  lastError: null,
  reconnectAttempts: 0,
  typingEventsByChannel: {},
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<WebSocketState['status']>) => {
      state.status = action.payload;
      if (action.payload === 'connected') {
        state.lastError = null;
        state.reconnectAttempts = 0;
      }
    },
    setConnectionError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.lastError = action.payload;
    },
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    resetConnection: (state) => {
      state.status = 'disconnected';
      state.lastError = null;
      state.reconnectAttempts = 0;
      state.typingEventsByChannel = {};
    },
    // Typing events management
    addTypingEvent: (state, action: PayloadAction<TypingEvent>) => {
      const { channel_id, user_id } = action.payload;
      
      // Initialize channel typing events if not exists
      if (!state.typingEventsByChannel[channel_id]) {
        state.typingEventsByChannel[channel_id] = [];
      }
      
      // Remove existing typing event from same user in same channel
      state.typingEventsByChannel[channel_id] = state.typingEventsByChannel[channel_id].filter(
        event => event.user_id !== user_id
      );
      
      // Add new typing event
      state.typingEventsByChannel[channel_id].push(action.payload);
    },
    removeTypingEvent: (state, action: PayloadAction<{ user_id: string; channel_id: string }>) => {
      const { channel_id, user_id } = action.payload;
      if (state.typingEventsByChannel[channel_id]) {
        state.typingEventsByChannel[channel_id] = state.typingEventsByChannel[channel_id].filter(
          event => event.user_id !== user_id
        );
        // Clean up empty arrays
        if (state.typingEventsByChannel[channel_id].length === 0) {
          delete state.typingEventsByChannel[channel_id];
        }
      }
    },
    clearTypingEventsForChannel: (state, action: PayloadAction<string>) => {
      delete state.typingEventsByChannel[action.payload];
    },
    clearExpiredTypingEvents: (state, action: PayloadAction<number>) => {
      const currentTime = action.payload;
      const TYPING_TIMEOUT = 5000; // 5 seconds timeout
      
      // Process each channel separately (only affects channels with expired events)
      Object.keys(state.typingEventsByChannel).forEach(channelId => {
        const channelEvents = state.typingEventsByChannel[channelId];
        const validEvents = channelEvents.filter(
          event => (currentTime - event.timestamp) < TYPING_TIMEOUT
        );
        
        if (validEvents.length !== channelEvents.length) {
          if (validEvents.length === 0) {
            delete state.typingEventsByChannel[channelId];
          } else {
            state.typingEventsByChannel[channelId] = validEvents;
          }
        }
      });
    },
  },
});

export const {
  setConnectionStatus,
  setConnectionError,
  incrementReconnectAttempts,
  resetConnection,
  addTypingEvent,
  removeTypingEvent,
  clearTypingEventsForChannel,
  clearExpiredTypingEvents,
} = websocketSlice.actions;

export default websocketSlice.reducer;