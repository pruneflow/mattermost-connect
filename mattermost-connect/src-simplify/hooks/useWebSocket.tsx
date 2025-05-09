import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { WebSocketEvent } from '../api/types';
import { messageKeys } from './useMessages';
import { channelKeys } from './useChannels';

/**
 * Hook for WebSocket connection to Mattermost server
 * Handles real-time updates and events
 */
export function useWebSocket() {
  // Get auth state
  const { isAuthenticated, token, serverUrl } = useAuth();
  
  // Query client for cache updates
  const queryClient = useQueryClient();
  
  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Typing events state - keep track of who is typing in which channel
  const [typingEvents, setTypingEvents] = useState<Array<{
    username: string;
    channel_id: string;
    timestamp: number;
  }>>([]);
  
  // Maximum retry attempts
  const MAX_RETRIES = 5;
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || !token || !serverUrl) {
      setError(new Error('Authentication required for WebSocket connection'));
      return;
    }
    
    // Don't attempt to reconnect if we're already connecting or connected
    if (isConnected || isConnecting) {
      return;
    }
    
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Create WebSocket URL from server URL
      const wsProtocol = serverUrl.startsWith('https') ? 'wss' : 'ws';
      const baseUrl = serverUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${baseUrl}/api/v4/websocket`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Connection opened
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setRetryCount(0);
        
        // Authenticate with token
        const authMessage = {
          seq: 1,
          action: 'authentication_challenge',
          data: { token },
        };
        
        ws.send(JSON.stringify(authMessage));
      };
      
      // Track intentional disconnections to prevent auto-reconnect
      const intentionalDisconnectRef = useRef(false);
      
      // Connection closed
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Normal closure (1000) or auth error (4001) shouldn't trigger reconnect
        const isIntentionalClosure = event.code === 1000 || 
                                    event.code === 4001 || 
                                    intentionalDisconnectRef.current;
        
        // Only attempt to reconnect if we were previously connected
        // and the closure wasn't intentional, and we're still authenticated
        if (isConnected && !isIntentionalClosure && retryCount < MAX_RETRIES && isAuthenticated) {
          setRetryCount(prevCount => prevCount + 1);
          
          console.log(`Will attempt to reconnect in ${1000 * Math.pow(2, retryCount)}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          
          const reconnectTimer = setTimeout(() => {
            // Double check we're still authenticated before attempting reconnect
            if (isAuthenticated) {
              connect();
            }
          }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
          
          // Store the timer for cleanup
          return () => clearTimeout(reconnectTimer);
        } else {          
          if (retryCount >= MAX_RETRIES) {
            setError(new Error('Failed to connect after multiple attempts'));
            console.error('Giving up on WebSocket connection after', MAX_RETRIES, 'attempts');
          }
        }
      };
      
      // Handle errors
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      // Handle messages
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketEvent(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      setIsConnecting(false);
      setError(error as Error);
    }
  }, [isAuthenticated, token, serverUrl, retryCount, isConnected, isConnecting]);
  
  // Track intentional disconnections
  const intentionalDisconnectRef = useRef(false);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Mark this disconnection as intentional to prevent auto-reconnect
    intentionalDisconnectRef.current = true;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Normal closure, intentional disconnect'); // Normal closure
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    // Reset reconnection state
    setRetryCount(0);
    setError(null);
    
    // Reset reconnect attempted flag
    if (connectionStateRef.current) {
      connectionStateRef.current.reconnectAttempted = false;
    }
  }, []);
  
  // Send typing event
  const sendTypingEvent = useCallback((channelId: string) => {
    if (!wsRef.current || !isConnected) return;
    
    const typingEvent = {
      action: 'user_typing',
      seq: 1,
      data: {
        channel_id: channelId,
      },
    };
    
    wsRef.current.send(JSON.stringify(typingEvent));
  }, [isConnected]);
  
  // Clean up old typing events
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTypingEvents(prev => 
        prev.filter(event => now - event.timestamp < 5000)
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle WebSocket events and update cache
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    if (!event || !event.event) return;
    
    // Handle posted/updated/deleted message events
    if (event.event === 'posted' || event.event === 'post_edited' || event.event === 'post_deleted') {
      const post = event.data?.post ? JSON.parse(event.data.post) : null;
      
      if (post) {
        // Invalidate channel messages to trigger refetch
        queryClient.invalidateQueries({ queryKey: messageKeys.list(post.channel_id) });
      }
    }
    
    // Handle channel events
    if (
      event.event === 'channel_created' || 
      event.event === 'channel_updated' || 
      event.event === 'channel_deleted'
    ) {
      const channelId = event.data?.channel_id;
      const teamId = event.data?.team_id;
      
      if (teamId) {
        // Invalidate team channels
        queryClient.invalidateQueries({ queryKey: channelKeys.list(teamId) });
      }
      
      if (channelId) {
        // Invalidate specific channel
        queryClient.invalidateQueries({ queryKey: channelKeys.detail(channelId) });
      }
    }
    
    // Handle user status change
    if (event.event === 'status_change') {
      // Update user status in cache (would need additional handling)
    }
    
    // Handle typing event
    if (event.event === 'typing') {
      const userId = event.data?.user_id;
      const channelId = event.data?.channel_id;
      const username = event.data?.username || 'Someone';
      
      if (channelId) {
        // Add typing event
        const now = Date.now();
        
        // Clean up old typing events (older than 5 seconds)
        setTypingEvents(prev => {
          const filtered = prev.filter(event => 
            // Keep events that are less than 5 seconds old
            now - event.timestamp < 5000 && 
            // Remove events from the same user in the same channel
            !(event.username === username && event.channel_id === channelId)
          );
          
          // Add new typing event
          return [...filtered, { username, channel_id: channelId, timestamp: now }];
        });
      }
    }
  }, [queryClient]);
  
  // Connection state reference to prevent unnecessary reconnections
  const connectionStateRef = useRef({
    isConnected,
    isConnecting,
    reconnectAttempted: false
  });
  
  // Update the ref when state changes to avoid stale values in cleanup
  useEffect(() => {
    connectionStateRef.current = {
      isConnected,
      isConnecting,
      reconnectAttempted: isConnecting || connectionStateRef.current.reconnectAttempted
    };
  }, [isConnected, isConnecting]);
  
  // Connect/disconnect based on authentication state
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    
    // Only connect if authenticated and not already connected or connecting
    if (isAuthenticated && !connectionStateRef.current.isConnected && 
        !connectionStateRef.current.isConnecting && 
        !connectionStateRef.current.reconnectAttempted) {
      
      // Mark that we've attempted to reconnect for this mount cycle
      connectionStateRef.current.reconnectAttempted = true;
      
      // Add a delay to avoid rapid connection attempts
      timer = setTimeout(() => {
        if (isAuthenticated && !connectionStateRef.current.isConnected && 
            !connectionStateRef.current.isConnecting) {
          connect();
        }
      }, 1000);
    }
    
    // Disconnect if no longer authenticated
    if (!isAuthenticated && (connectionStateRef.current.isConnected || 
                             connectionStateRef.current.isConnecting)) {
      disconnect();
      
      // Reset reconnect flag when explicitly disconnecting
      connectionStateRef.current.reconnectAttempted = false;
    }
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isAuthenticated, connect, disconnect]);
  
  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    
    // Typing events
    typingEvents,
    sendTypingEvent,
    
    // Actions
    connect,
    disconnect,
  };
}

// WebSocket Context Provider component (could be implemented in a separate file)
// This would allow any component to access WebSocket state without passing props
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  // Use the WebSocket hook
  const ws = useWebSocket();
  
  // Provide WebSocket state to children
  return (
    // This would be a React Context Provider if fully implemented
    <>{children}</>
  );
}