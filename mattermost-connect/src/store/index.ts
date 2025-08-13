import { configureStore } from '@reduxjs/toolkit';
import { client } from '../api/client';
import { getCurrentUser } from './slices/authSlice';

import entitiesReducer from './slices/entitiesSlice';
import viewsReducer from './slices/viewsSlice';
import errorsReducer from './slices/errorsSlice';
import authReducer from './slices/authSlice';
import preferencesReducer from './slices/preferencesSlice';
import websocketReducer from './slices/websocketSlice';
import postsReducer from './slices/postsSlice'
import filesReducer from './slices/filesSlice'
import messageUIReducer from './slices/messageUISlice'
import threadsReducer from './slices/threadsSlice'

// Configure Client4 immediately before store creation if credentials exist
const token = localStorage.getItem('mattermostToken');
const serverUrl = localStorage.getItem('mattermostServerUrl');

if (token && serverUrl) {
  client.setUrl(serverUrl);
  client.setToken(token);
  // NOTE: setIncludeCookies(false) to avoid CORS issues when server uses AllowCorsFrom: "*"
  // If server is properly configured with specific origins, this can be set to true
  client.setIncludeCookies(false);
  client.setEnableLogging(true);
}

// Configure store inspired by Mattermost configureServiceStore()
export const store = configureStore({
  reducer: {
    // Core state structure following Mattermost patterns
    entities: entitiesReducer,
    views: viewsReducer,
    errors: errorsReducer,
    auth: authReducer,
    preferences: preferencesReducer,
    websocket: websocketReducer,
    posts: postsReducer,
    files: filesReducer,
    messageUI: messageUIReducer,
    threads: threadsReducer
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

// Auto-restore user if credentials exist - establishes auth state
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
export * from './slices/postsSlice'
export * from './slices/filesSlice'
export * from './slices/messageUISlice'
export * from './slices/threadsSlice'