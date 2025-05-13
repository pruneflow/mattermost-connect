import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { WebSocketEvent } from '../api/types';
import { messageKeys } from './useMessages';
import { channelKeys } from './useChannels';
import { userKeys } from './useUsers';
import { teamKeys } from './useTeams';

// Définition de l'interface pour le contexte WebSocket
interface WebSocketContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  typingEvents: Array<{
    username: string;
    channel_id: string;
    timestamp: number;
  }>;
  sendTypingEvent: (channelId: string) => void;
  connect: () => void;
  disconnect: () => void;
}

// Création du contexte WebSocket
const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Constantes pour les clés d'invalidation de requêtes
const unreadKeys = {
  counts: ['unread', 'counts'],
};

// Extraction des informations du post à partir de l'événement
const parseEventPost = (event: WebSocketEvent) => {
  try {
    return event.data?.post ? JSON.parse(event.data.post) : null;
  } catch (error) {
    console.error('Failed to parse post data:', error);
    return null;
  }
};

// Singleton privé pour stocker l'instance WebSocket partagée et son état
// Ce pattern de module nous permet de maintenir un état partagé sans exposer les détails d'implémentation
const WebSocketSingleton = (() => {
  // Instance WebSocket et état
  let wsInstance: WebSocket | null = null;
  let wsTypingEvents: Array<{
    username: string;
    channel_id: string;
    timestamp: number;
  }> = [];
  let wsIsConnected = false;
  let wsIsConnecting = false;
  let wsError: Error | null = null;
  
  // Abonnés à l'état WebSocket
  const subscribers = new Set<() => void>();
  
  // Notifier tous les abonnés d'un changement d'état
  const notifySubscribers = () => {
    subscribers.forEach(callback => callback());
  };
  
  // Mettre à jour les événements de saisie
  const updateTypingEvents = (newEvents: typeof wsTypingEvents) => {
    wsTypingEvents = newEvents;
    notifySubscribers();
  };
  
  // S'abonner aux changements d'état
  const subscribe = (callback: () => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };
  
  // Exposer l'API du singleton
  return {
    getWebSocket: () => wsInstance,
    setWebSocket: (ws: WebSocket | null) => {
      wsInstance = ws;
      notifySubscribers();
    },
    
    getTypingEvents: () => wsTypingEvents,
    updateTypingEvents,
    
    getIsConnected: () => wsIsConnected,
    setIsConnected: (value: boolean) => {
      wsIsConnected = value;
      notifySubscribers();
    },
    
    getIsConnecting: () => wsIsConnecting,
    setIsConnecting: (value: boolean) => {
      wsIsConnecting = value;
      notifySubscribers();
    },
    
    getError: () => wsError,
    setError: (value: Error | null) => {
      wsError = value;
      notifySubscribers();
    },
    
    subscribe
  };
})();

/**
 * Hook for WebSocket connection to Mattermost server
 * Handles real-time updates and events
 * Utilise le pattern singleton pour partager l'état entre tous les composants
 * 
 * Ce hook utilise un module singleton pour garantir qu'une seule instance
 * WebSocket est partagée entre tous les composants. Cela permet d'assurer
 * que tous les composants reçoivent les mêmes événements et mises à jour.
 * 
 * Usage: 
 * ```tsx
 * const { isConnected, typingEvents, sendTypingEvent } = useWebSocket();
 * ```
 */
export function useWebSocket() {
  // Get auth state
  const { isAuthenticated, token, serverUrl } = useAuth();
  
  // Query client for cache updates
  const queryClient = useQueryClient();
  
  // Forcer le re-rendu quand l'état du singleton change
  const [, setRenderKey] = useState(0);
  
  // S'abonner aux changements d'état du singleton
  useEffect(() => {
    const forceRender = () => setRenderKey(prev => prev + 1);
    return WebSocketSingleton.subscribe(forceRender);
  }, []);
  
  // États locaux synchronisés avec le singleton
  const typingEvents = WebSocketSingleton.getTypingEvents();
  const isConnected = WebSocketSingleton.getIsConnected();
  const isConnecting = WebSocketSingleton.getIsConnecting();
  const error = WebSocketSingleton.getError();
  
  // Référence locale (pour la compatibilité avec le code existant)
  const wsRef = useRef<WebSocket | null>(WebSocketSingleton.getWebSocket());
  
  // État local (pour la compatibilité avec le code existant)
  const [retryCount, setRetryCount] = useState(0);
  
  // Maximum retry attempts
  const MAX_RETRIES = 5;
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || !token || !serverUrl) {
      WebSocketSingleton.setError(new Error('Authentication required for WebSocket connection'));
      return;
    }
    
    // Don't attempt to reconnect if we're already connecting or connected
    if (isConnected || isConnecting) {
      return;
    }
    
    // Close existing connection if any
    const currentWs = WebSocketSingleton.getWebSocket();
    if (currentWs) {
      currentWs.close();
    }
    
    WebSocketSingleton.setIsConnecting(true);
    WebSocketSingleton.setError(null);
    
    try {
      // Create WebSocket URL from server URL
      const wsProtocol = serverUrl.startsWith('https') ? 'wss' : 'ws';
      const baseUrl = serverUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${baseUrl}/api/v4/websocket`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      WebSocketSingleton.setWebSocket(ws);
      wsRef.current = ws;
      
      // Connection opened
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        WebSocketSingleton.setIsConnected(true);
        WebSocketSingleton.setIsConnecting(false);
        setRetryCount(0);
        
        // Authenticate with token
        const authMessage = {
          seq: 1,
          action: 'authentication_challenge',
          data: { token },
        };
        
        ws.send(JSON.stringify(authMessage));
        console.log('WebSocket authentication sent');
      };
      
      // Track intentional disconnections - use the global ref
      
      // Connection closed
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        WebSocketSingleton.setIsConnected(false);
        WebSocketSingleton.setIsConnecting(false);
        WebSocketSingleton.setWebSocket(null);
        
        // Normal closure (1000) or auth error (4001) shouldn't trigger reconnect
        const isIntentionalClosure = event.code === 1000 || 
                                    event.code === 4001 || 
                                    intentionalDisconnectRef.current;
        
        // Only attempt to reconnect if the closure wasn't intentional and we're still authenticated
        if (!isIntentionalClosure && retryCount < MAX_RETRIES && isAuthenticated) {
          setRetryCount(prevCount => prevCount + 1);
          
          const delayMs = 1000 * Math.pow(2, retryCount);
          console.log(`Will attempt to reconnect in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          
          const reconnectTimer = setTimeout(() => {
            // Double check we're still authenticated before attempting reconnect
            if (isAuthenticated) {
              console.log(`Attempting reconnection #${retryCount + 1}`);
              connect();
            }
          }, delayMs); // Exponential backoff
          
          // Store the timer for cleanup
          return () => clearTimeout(reconnectTimer);
        } else {          
          if (retryCount >= MAX_RETRIES) {
            WebSocketSingleton.setError(new Error(`Failed to connect after ${MAX_RETRIES} attempts`));
            console.error('Giving up on WebSocket connection after', MAX_RETRIES, 'attempts');
          } else if (isIntentionalClosure) {
            console.log('Intentional disconnection, not attempting to reconnect');
          }
        }
      };
      
      // Handle errors
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        WebSocketSingleton.setError(new Error('WebSocket connection error'));
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
      WebSocketSingleton.setIsConnecting(false);
      WebSocketSingleton.setError(error as Error);
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
    
    // Update the singleton state
    WebSocketSingleton.setIsConnected(false);
    WebSocketSingleton.setIsConnecting(false);
    WebSocketSingleton.setError(null);
    
    // Reset reconnection state
    setRetryCount(0);
    
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
  
  // Clean up old typing events via le singleton
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentEvents = WebSocketSingleton.getTypingEvents();
      
      // Filtrer les événements périmés
      const filtered = currentEvents.filter(event => now - event.timestamp < 10000);
      
      // Ne mettre à jour que si quelque chose a changé
      if (filtered.length !== currentEvents.length) {
        WebSocketSingleton.updateTypingEvents(filtered);
        console.log(`Cleaned up typing events. Now have ${filtered.length} active events.`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Définition des gestionnaires d'événements
  interface EventHandler {
    handle: (event: WebSocketEvent, queryClient: QueryClient) => void;
  }

  // Registre centralisé des gestionnaires d'événements pour respecter DRY
  const eventHandlers: Record<string, EventHandler> = {
    // Messages
    posted: {
      handle: (event, queryClient) => {
        console.log('Handling posted event:', event);
        const post = parseEventPost(event);
        if (post?.channel_id) {
          queryClient.invalidateQueries({ queryKey: messageKeys.list(post.channel_id) });
          if (post.root_id) {
            queryClient.invalidateQueries({ queryKey: messageKeys.thread(post.root_id) });
          }
        }
      }
    },
    
    post_edited: {
      handle: (event, queryClient) => eventHandlers.posted.handle(event, queryClient)
    },
    
    post_deleted: {
      handle: (event, queryClient) => eventHandlers.posted.handle(event, queryClient)
    },
    
    // Canaux
    channel_created: {
      handle: (event, queryClient) => {
        console.log('Handling channel event:', event);
        const { team_id, channel_id } = event.data || {};
        if (team_id) {
          queryClient.invalidateQueries({ queryKey: channelKeys.list(team_id) });
        }
        if (channel_id) {
          queryClient.invalidateQueries({ queryKey: channelKeys.detail(channel_id) });
        }
      }
    },
    
    channel_updated: {
      handle: (event, queryClient) => eventHandlers.channel_created.handle(event, queryClient)
    },
    
    channel_deleted: {
      handle: (event, queryClient) => eventHandlers.channel_created.handle(event, queryClient)
    },
    
    // Statut utilisateur
    status_change: {
      handle: (event, queryClient) => {
        console.log('Handling status_change event:', event);
        const userId = event.data?.user_id;
        const status = event.data?.status;
        if (userId && status) {
          queryClient.setQueryData(
            userKeys.detail(userId),
            (oldData: any) => oldData ? { ...oldData, status } : oldData
          );
          queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
        }
      }
    },
    
    // Saisie
    typing: {
      handle: (event, queryClient) => {
        // Extraire correctement user_id depuis data et channel_id depuis broadcast
        const userId = event.data?.user_id;
        const channelId = event.broadcast?.channel_id;
        
        // Vérifier si les données nécessaires sont présentes
        if (!userId || !channelId) {
          return;
        }
        
        // Récupérer les informations utilisateur à partir du cache local
        try {
          const now = Date.now();
          let username = 'Someone';
          
          // Tenter de récupérer le nom d'utilisateur depuis le cache
          const cachedUsersStr = localStorage.getItem('mattermost_cached_users');
          if (cachedUsersStr) {
            const cachedUsers = JSON.parse(cachedUsersStr);
            const user = cachedUsers[userId];
            if (user) {
              // Utiliser formatUserName pour respecter les conventions existantes
              username = user.first_name || user.username || 'Someone';
            }
          }
          
          // Mettre à jour l'état des événements de saisie via le singleton
          const currentEvents = WebSocketSingleton.getTypingEvents();
          const filtered = currentEvents.filter(event => 
            // Garder les événements de moins de 10 secondes (augmenté pour plus de visibilité)
            now - event.timestamp < 10000 && 
            // Supprimer les événements du même utilisateur dans le même canal
            !(event.username === username && event.channel_id === channelId)
          );
          
          // Ajouter le nouvel événement de saisie
          const updatedEvents = [...filtered, { username, channel_id: channelId, timestamp: now }];
          
          // Mettre à jour le singleton
          WebSocketSingleton.updateTypingEvents(updatedEvents);
          
          // Log de débogage
          console.log(`Typing event processed: user ${username} is typing in channel ${channelId}`);
          console.log(`Total typing events: ${updatedEvents.length}`);
          
          // Invalider les requêtes pour forcer un rafraîchissement
          queryClient.invalidateQueries({ 
            queryKey: ['typing', channelId],
            exact: true
          });
        } catch (error) {
          console.error('Error processing typing event:', error);
        }
      }
    },
    
    // Réactions
    reaction_added: {
      handle: (event, queryClient) => {
        console.log('Handling reaction_added event:', event);
        const post = parseEventPost(event);
        if (post?.channel_id) {
          queryClient.invalidateQueries({ queryKey: messageKeys.list(post.channel_id) });
          if (post.root_id) {
            queryClient.invalidateQueries({ queryKey: messageKeys.thread(post.root_id) });
          }
        }
      }
    },
    
    reaction_removed: {
      handle: (event, queryClient) => eventHandlers.reaction_added.handle(event, queryClient)
    },
    
    // Membres d'équipe
    team_member_added: {
      handle: (event, queryClient) => {
        console.log('Handling team_member event:', event);
        const teamId = event.data?.team_id;
        if (teamId) {
          queryClient.invalidateQueries({ queryKey: teamKeys.members(teamId) });
        }
      }
    },
    
    team_member_removed: {
      handle: (event, queryClient) => eventHandlers.team_member_added.handle(event, queryClient)
    },
    
    // Membres de canal
    channel_member_added: {
      handle: (event, queryClient) => {
        console.log('Handling channel_member event:', event);
        const channelId = event.data?.channel_id;
        if (channelId) {
          queryClient.invalidateQueries({ queryKey: channelKeys.members(channelId) });
        }
      }
    },
    
    channel_member_removed: {
      handle: (event, queryClient) => eventHandlers.channel_member_added.handle(event, queryClient)
    },
    
    // Équipes
    team_updated: {
      handle: (event, queryClient) => {
        console.log('Handling team event:', event);
        const teamId = event.data?.team_id;
        if (teamId) {
          queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
          queryClient.invalidateQueries({ queryKey: teamKeys.list });
        }
      }
    },
    
    team_deleted: {
      handle: (event, queryClient) => eventHandlers.team_updated.handle(event, queryClient)
    },
    
    // Préférences
    preferences_changed: {
      handle: (event, queryClient) => {
        console.log('Handling preferences_changed event:', event);
        queryClient.invalidateQueries({ queryKey: userKeys.preferences });
      }
    },
    
    // Mentions
    mention_received: {
      handle: (event, queryClient) => {
        console.log('Handling mention_received event:', event);
        const channelId = event.data?.channel_id;
        if (channelId) {
          queryClient.invalidateQueries({ queryKey: unreadKeys.counts });
          queryClient.invalidateQueries({ queryKey: messageKeys.list(channelId) });
        }
      }
    },
    
    // Présence
    presence_change: {
      handle: (event, queryClient) => {
        console.log('Handling presence_change event:', event);
        const userId = event.data?.user_id;
        const isOnline = event.data?.is_online;
        if (userId) {
          queryClient.setQueryData(
            userKeys.detail(userId),
            (oldData: any) => oldData ? { ...oldData, isOnline } : oldData
          );
        }
      }
    }
  };

  // Handle WebSocket events and update cache
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    if (!event || !event.event) return;
    
    // Seuls les logs essentiels
    if (event.event === 'typing') {
      // Logs spécifiques pour le debug typing
      console.log(`WebSocket typing event received: user=${event.data?.user_id}, channel=${event.broadcast?.channel_id}`);
    }
    
    const handler = eventHandlers[event.event];
    if (handler) {
      try {
        // Tous les gestionnaires d'événements utilisent maintenant le singleton
        handler.handle(event, queryClient);
      } catch (error) {
        console.error(`Error handling WebSocket event ${event.event}:`, error);
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
  
  // Pas de logs ici pour éviter les cycles de rendu

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

// Note: La gestion globale des événements WebSocket est maintenue par 
// le singleton WebSocketSingleton défini plus haut dans ce fichier

// Création d'un hook simplifié pour utiliser le contexte WebSocket partagé
export function useWebSocketContext() {
  // Utiliser le contexte s'il est disponible
  const context = useContext(WebSocketContext);
  if (context) {
    return context;
  }
  
  // Si pas de contexte, retourner un objet avec les données essentielles
  // pour la compatibilité avec les composants existants
  return {
    typingEvents: [],
    sendTypingEvent: () => {},
    isConnected: false,
    isConnecting: false,
    error: null,
    connect: () => {},
    disconnect: () => {}
  };
}

// WebSocket Context Provider component - version simplifiée
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  // Utiliser le hook standard pour créer l'instance
  const ws = useWebSocket();
  
  // Provide WebSocket state to children via context
  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}