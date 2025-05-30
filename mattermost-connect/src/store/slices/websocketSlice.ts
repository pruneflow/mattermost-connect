import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WebSocketState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError: string | null;
  reconnectAttempts: number;
}

const initialState: WebSocketState = {
  status: 'disconnected',
  lastError: null,
  reconnectAttempts: 0,
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
    },
  },
});

export const {
  setConnectionStatus,
  setConnectionError,
  incrementReconnectAttempts,
  resetConnection,
} = websocketSlice.actions;

export default websocketSlice.reducer;