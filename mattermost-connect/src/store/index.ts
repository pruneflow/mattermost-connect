import { configureStore } from '@reduxjs/toolkit';
import { Client4 } from '../api/client';
import { getCurrentUser } from './slices/authSlice';

import entitiesReducer from './slices/entitiesSlice';
import viewsReducer from './slices/viewsSlice';
import errorsReducer from './slices/errorsSlice';
import authReducer from './slices/authSlice';
import preferencesReducer from './slices/preferencesSlice';

// Configure Client4 immediately before store creation if credentials exist
const token = localStorage.getItem('mattermostToken');
const serverUrl = localStorage.getItem('mattermostServerUrl');

if (token && serverUrl) {
  Client4.setUrl(serverUrl);
  Client4.setToken(token);
  // Disable cookies to avoid CORS issues with Access-Control-Allow-Origin: *
  Client4.setIncludeCookies(false);
  Client4.setEnableLogging(false);
}

// Configure store inspired by Mattermost configureServiceStore()
export const store = configureStore({
  reducer: {
    // Core state structure simplified (no requests - createAsyncThunk handles loading)
    entities: entitiesReducer,
    views: viewsReducer,
    errors: errorsReducer,
    auth: authReducer,
    preferences: preferencesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore WebSocket and RTK Query actions for serialization checks
        ignoredActions: [
          'persist/PERSIST',
          'websocket/connect',
          'websocket/disconnect',
          'websocket/message',
        ],
        ignoredPaths: ['api.queries', 'api.mutations'],
      },
    }),
    // WebSocket middleware will be added in Phase 5
  devTools: process.env.NODE_ENV !== 'production',
});

// Auto-restore user if credentials exist - use getCurrentUser() instead of localStorage parsing
if (token && serverUrl) {
  store.dispatch(getCurrentUser());
}

// Export store type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export all actions for convenience
export * from './slices/entitiesSlice';
export * from './slices/viewsSlice';
export * from './slices/errorsSlice';
export * from './slices/authSlice';
export * from './slices/preferencesSlice';