import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { selectIsAuthenticated } from '../store/selectors';
import { restoreAuthFromStorage } from '../store/slices/authSlice';
import { ThemeProvider } from './ThemeProvider';

/**
 * App initialization component - handles single initialization (Mattermost pattern)
 */
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppInitialization();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Restore auth state from localStorage on app startup (Mattermost pattern)
  useEffect(() => {
    dispatch(restoreAuthFromStorage());
  }, [dispatch]);
  
  // Only show loading if we're authenticated but not yet initialized
  // If not authenticated, let the app render (so LoginForm can be shown)
  if (isAuthenticated && !isInitialized) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Initializing...</div>;
  }
  
  return <>{children}</>;
};

/**
 * Complete app provider with Redux store, theme, and initialization
 * Following Mattermost pattern: single initialization point
 * Includes ThemeProvider for convenience
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppInitializer>
          {children}
        </AppInitializer>
      </ThemeProvider>
    </Provider>
  );
};

export default AppProvider;