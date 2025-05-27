import { configureStore } from '@reduxjs/toolkit';

import entitiesReducer from './slices/entitiesSlice';
import viewsReducer from './slices/viewsSlice';
import errorsReducer from './slices/errorsSlice';
import authReducer from './slices/authSlice';
// Configure store inspired by Mattermost configureServiceStore()
export const store = configureStore({
  reducer: {
    // Core state structure simplified (no requests - createAsyncThunk handles loading)
    entities: entitiesReducer,
    views: viewsReducer,
    errors: errorsReducer,
    auth: authReducer,
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



// Types are exported from src/types.ts to avoid Rollup issues


// Re-export all actions for convenience
export * from './slices/entitiesSlice';
export * from './slices/viewsSlice';
export * from './slices/errorsSlice';
export * from './slices/authSlice';