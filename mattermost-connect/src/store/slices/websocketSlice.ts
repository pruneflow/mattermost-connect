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
  typingEvents: TypingEvent[];
}

const initialState: WebSocketState = {
  status: 'disconnected',
  lastError: null,
  reconnectAttempts: 0,
  typingEvents: [],
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
      state.typingEvents = [];
    },
    // Typing events management
    addTypingEvent: (state, action: PayloadAction<TypingEvent>) => {
      // Remove existing typing event from same user in same channel
      state.typingEvents = state.typingEvents.filter(
        event => !(event.user_id === action.payload.user_id && event.channel_id === action.payload.channel_id)
      );
      // Add new typing event
      state.typingEvents.push(action.payload);
    },
    removeTypingEvent: (state, action: PayloadAction<{ user_id: string; channel_id: string }>) => {
      state.typingEvents = state.typingEvents.filter(
        event => !(event.user_id === action.payload.user_id && event.channel_id === action.payload.channel_id)
      );
    },
    clearTypingEventsForChannel: (state, action: PayloadAction<string>) => {
      state.typingEvents = state.typingEvents.filter(
        event => event.channel_id !== action.payload
      );
    },
    clearExpiredTypingEvents: (state, action: PayloadAction<number>) => {
      const currentTime = action.payload;
      const TYPING_TIMEOUT = 5000; // 5 seconds timeout
      state.typingEvents = state.typingEvents.filter(
        event => (currentTime - event.timestamp) < TYPING_TIMEOUT
      );
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