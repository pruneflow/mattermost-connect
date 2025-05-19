import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from './context/AuthContext';
import { api } from './api/client';
import { WebSocketProvider } from './hooks/useWebSocket';

// Re-export hooks
export * from './hooks';

// Re-export API types - handle ambiguity with Message type
import * as ApiTypes from './api/types';
// Explicitly re-export everything except Message to avoid name conflicts
export {
  WithId,
  WithTimestamps,
  User,
  UserStatus,
  UserStatusObject,
  Team,
  TeamMember,
  Channel,
  ChannelMember,
  // Export Message type as ApiMessage to avoid conflict
  Message as ApiMessage,
  MessageMetadata,
  MessageEmbed,
  MessageFile,
  MessageImage,
  MessageReaction,
  FileInfo,
  Preference,
  UnreadCount,
  ChannelUnreadCount,
  DirectChannelInfo,
  LoginCredentials,
  LoginResponse,
  WebSocketEvent
} from './api/types';

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
  // Mode-spécifique properties
  mode?: 'direct' | 'proxy' | 'demo';
  serverUrl?: string;
  proxyUrl?: string;
  clientId?: string;
  token?: string;
  enableWebSocket?: boolean;
  // Authentication callbacks
  onInitialized?: (success: boolean) => void;
  onAuthError?: (error: Error) => void;
  onWebSocketError?: (error: Error) => void;
  // Optionnellement, vous pourriez permettre de passer un thème personnalisé
  theme?: ReturnType<typeof createTheme>;
}

export function MattermostProvider({ 
  children, 
  mode = 'direct',
  serverUrl, 
  proxyUrl,
  clientId,
  token,
  enableWebSocket = true,
  onInitialized,
  onAuthError,
  onWebSocketError,
  theme: customTheme 
}: MattermostProviderProps) {
  // Configure API client based on mode
  useEffect(() => {
    try {
      // Configure based on mode
      if (mode === 'direct' && serverUrl) {
        // Direct mode - connect to Mattermost server directly
        api.configure({
          serverUrl,
          token,
          onError: onAuthError
        });
      } else if (mode === 'proxy' && proxyUrl && clientId) {
        // Proxy mode - connect via proxy server
        api.configure({
          serverUrl: proxyUrl,  // Use proxyUrl as the serverUrl
          token,
          clientId,
          onError: onAuthError
        });
      } else if (mode === 'demo') {
        // Demo mode - use mock data
        console.log('Demo mode active - using mock data');
        // No API configuration needed for demo mode
      }
    } catch (error) {
      console.error('Error configuring API client:', error);
      if (onAuthError) {
        onAuthError(error as Error);
      }
    }
  }, [mode, serverUrl, proxyUrl, clientId, token, onAuthError]);
  
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