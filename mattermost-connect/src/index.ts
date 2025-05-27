// MattermostConnect - Redux-based Mattermost integration library
// Phase 1: Foundation + Auth

// Redux store and state management
export { store } from './store';

// API types and client - explicit exports like src-old
export * from './api/types';
export { default as MattermostClient, setDefaultClient, getDefaultClient } from './api/client';

// Types will be available via * exports

// Components
export * from './components/atoms';
export * from './components/organisms';

// Hooks
export * from './hooks';

// Redux actions and selectors (re-exported from store)
export * from './store/slices/authSlice';
export * from './store/slices/entitiesSlice';
export * from './store/slices/viewsSlice';
export * from './store/slices/errorsSlice';

// RTK Query API slice
export { apiSlice } from './store/middleware/api';
export * from './store/middleware/api';

// Constants
export { MATTERMOST_API_ENDPOINTS, WEBSOCKET_EVENTS } from './api/endpoints';