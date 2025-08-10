// MattermostConnect - Redux-based Mattermost integration library
// Phase 1: Foundation + Auth

// Redux store and state management
export { store } from './store';

// API types and client
export * from './api/types';
export { setDefaultClient, getDefaultClient } from './api/client';

// Types will be available via * exports

// Components
export * from './components/atoms';
export * from './components/molecules';
export * from './components/organisms';
export * from './components/templates';
export * from './components/common';

// Hooks
export * from './hooks';

// Redux actions and selectors (re-exported from store)
export * from './store/slices/authSlice';
export * from './store/slices/entitiesSlice';
export * from './store/slices/viewsSlice';
export * from './store/slices/errorsSlice';
export * from './store/selectors';

// Mattermost client instance
export { client, mattermostClient } from './api/client';

// Providers
export { ThemeProvider, AppProvider } from './providers';
export type { ThemeProviderProps } from './providers';