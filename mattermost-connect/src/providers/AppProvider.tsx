import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { ThemeProvider } from './ThemeProvider';

/**
 * App initialization component - handles single initialization (Mattermost pattern)
 */
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitialized } = useAppInitialization();
  
  // Following Mattermost pattern: don't render until properly initialized
  if (!isInitialized) {
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