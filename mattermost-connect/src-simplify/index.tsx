import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { api } from './api/client';

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

// Provider component that wraps the app with auth and query providers
export interface MattermostProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
  token?: string;
}

export function MattermostProvider({ children, serverUrl, token }: MattermostProviderProps) {
  // Configure API client if serverUrl and token are provided
  useEffect(() => {
    if (serverUrl) {
      api.configure({
        serverUrl,
        token,
      });
    }
  }, [serverUrl, token]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* WebSocketProvider would be here if fully implemented */}
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Default export the provider
export default MattermostProvider;