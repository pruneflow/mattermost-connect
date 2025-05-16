import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from './context/AuthContext';
import { api } from './api/client';
import { WebSocketProvider } from './hooks/useWebSocket';

// Re-export hooks
export * from './hooks';

// Re-export API types
export * from './api/types';

// Re-export API client for direct usage
export { api } from './api/client';

// Re-export context
export { useAuth } from './context/AuthContext';

// Re-export components
export * from './components';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Créer un thème par défaut pour Material-UI
const theme = createTheme({
  shape: {
    borderRadius: 4,
  },
  // Vous pouvez personnaliser d'autres aspects du thème ici si nécessaire
});

export interface MattermostProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
  token?: string;
  // Optionnellement, vous pourriez permettre de passer un thème personnalisé
  theme?: ReturnType<typeof createTheme>;
}

export function MattermostProvider({ 
  children, 
  serverUrl, 
  token,
  theme: customTheme 
}: MattermostProviderProps) {
  // Configure API client if serverUrl and token are provided
  useEffect(() => {
    if (serverUrl) {
      api.configure({
        serverUrl,
        token,
      });
    }
  }, [serverUrl, token]);
  
  // Utiliser le thème personnalisé si fourni, sinon utiliser le thème par défaut
  const appliedTheme = customTheme || theme;
  
  return (
    <ThemeProvider theme={appliedTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// Default export the provider
export default MattermostProvider;