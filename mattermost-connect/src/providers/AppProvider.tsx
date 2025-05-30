import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { ThemeProvider } from './ThemeProvider';

/**
 * App initialization component - handles single initialization
 */
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppInitialization();
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