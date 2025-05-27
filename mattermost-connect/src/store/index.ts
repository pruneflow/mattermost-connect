import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import entitiesReducer from './slices/entitiesSlice';
import viewsReducer from './slices/viewsSlice';
import errorsReducer from './slices/errorsSlice';
import requestsReducer from './slices/requestsSlice';
import authReducer from './slices/authSlice';
import { apiSlice } from './middleware/api';
// Configure store inspired by Mattermost configureServiceStore()
export const store = configureStore({
  reducer: {
    // Core state structure identical to mattermost-redux
    entities: entitiesReducer,
    views: viewsReducer,
    errors: errorsReducer,
    requests: requestsReducer,
    auth: authReducer,
    
    // RTK Query API slice
    [apiSlice.reducerPath]: apiSlice.reducer,
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
    }).concat(
      apiSlice.middleware,
      // WebSocket middleware will be added in Phase 5
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners for refetchOnFocus/refetchOnReconnect
setupListeners(store.dispatch);


// Types are exported from src/types.ts to avoid Rollup issues

// Re-export API slice
export { apiSlice };

// Re-export all actions for convenience
export * from './slices/entitiesSlice';
export * from './slices/viewsSlice';
export * from './slices/errorsSlice';
export * from './slices/requestsSlice';
export * from './slices/authSlice';