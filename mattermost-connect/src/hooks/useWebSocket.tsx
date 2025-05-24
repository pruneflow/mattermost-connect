import { useEffect, useState, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { WebSocketEvent } from '../api/types';
import { messageKeys } from './useMessages';
import { channelKeys } from './useChannels';
import { userKeys } from './useUsers';
import { teamKeys } from './useTeams';
import { unreadKeys } from './useUnreadCounts';
import { getTeamIdFromChannelId, markTeamAsDirty, channelsCache } from './useChannels';
import { formatUserName } from '../utils/formatters';

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
  // Ajout des statuts des utilisateurs
  userStatuses: Record<string, string>;
  sendTypingEvent: (channelId: string) => void;
  connect: () => void;
  disconnect: () => void;
}

// Création du contexte WebSocket
const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// Note: unreadKeys is now imported from useUnreadCounts

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
export const WebSocketSingleton = (() => {
  // Instance WebSocket et état
  let wsInstance: WebSocket | null = null;
  
  // Référence à l'instance API pour une utilisation directe
  // Cette référence sera remplie lors de la première connexion
  let apiInstance = api;
  
  // Tableau global des événements de frappe
  let wsTypingEvents: Array<{
    username: string;
    channel_id: string;
    timestamp: number;
  }> = [];
  
  // Nouvelle structure : événements de frappe organisés par canal
  // Clé : ID du canal, Valeur : Tableau des événements pour ce canal
  let wsTypingEventsByChannel: Record<string, Array<{
    username: string;
    channel_id: string;
    timestamp: number;
  }>> = {};
  
  // Statuts des utilisateurs centralisés
  let wsUserStatuses: Record<string, string> = {};
  
  // Suivi des utilisateurs dont les statuts ont été initialisés via API
  let wsUserStatusesInitialized = new Set<string>();
  
  // Suivi des utilisateurs à surveiller pour les statuts
  let wsUserStatusesToWatch = new Set<string>();
  
  // Timer pour le pull périodique des statuts
  let wsStatusPullTimer: NodeJS.Timeout | null = null;
  
  // Stockage des réactions aux messages
  // Clé : ID du message, Valeur : Tableau des réactions pour ce message
  let wsMessageReactions: Record<string, Array<{
    user_id: string;
    emoji_name: string;
    post_id: string;
    create_at: number;
  }>> = {};
  
  let wsIsConnected = false;
  let wsIsConnecting = false;
  let wsError: Error | null = null;
  
  // Abonnements par canal pour les événements de frappe
  // Clé : ID du canal, Valeur : Ensemble des fonctions callback pour ce canal
  const channelSubscribers: Record<string, Set<() => void>> = {};
  
  // Abonnements par utilisateur pour les changements de statut
  // Clé : ID de l'utilisateur, Valeur : Ensemble des fonctions callback pour cet utilisateur
  const userStatusSubscribers: Record<string, Set<() => void>> = {};
  
  // Abonnements par message pour les réactions
  // Clé : ID du message, Valeur : Ensemble des fonctions callback pour ce message
  const messageReactionSubscribers: Record<string, Set<() => void>> = {};
  
  // Abonnés à l'état WebSocket global
  const subscribers = new Set<() => void>();
  
  // Notifier tous les abonnés d'un changement d'état global
  const notifySubscribers = () => {
    subscribers.forEach(callback => callback());
  };
  
  // Notifier les abonnés d'un canal spécifique
  const notifyChannelSubscribers = (channelId: string) => {
    if (channelSubscribers[channelId]) {
      channelSubscribers[channelId].forEach(callback => callback());
    }
  };
  
  // Notifier les abonnés d'un utilisateur spécifique
  const notifyUserStatusSubscribers = (userId: string) => {
    if (userStatusSubscribers[userId]) {
      userStatusSubscribers[userId].forEach(callback => callback());
    }
  };
  
  // Notifier les abonnés d'un message spécifique (pour les réactions)
  const notifyMessageReactionSubscribers = (postId: string) => {
    if (messageReactionSubscribers[postId]) {
      messageReactionSubscribers[postId].forEach(callback => callback());
    }
  };
  
  // Mettre à jour les événements de saisie avec organisation par canal
  const updateTypingEvents = (newEvents: typeof wsTypingEvents) => {
    // Vérifier si les événements ont réellement changé
    const hasChanged = 
      newEvents.length !== wsTypingEvents.length || 
      JSON.stringify(newEvents) !== JSON.stringify(wsTypingEvents);
    
    // Mettre à jour seulement s'il y a un changement réel
    if (hasChanged) {
      // Mettre à jour le tableau global
      wsTypingEvents = newEvents;
      
      // Réorganiser les événements par canal
      const newEventsByChannel: Record<string, typeof wsTypingEvents> = {};
      const affectedChannels = new Set<string>();
      
      // Grouper les événements par canal
      newEvents.forEach(event => {
        const channelId = event.channel_id;
        if (!newEventsByChannel[channelId]) {
          newEventsByChannel[channelId] = [];
        }
        newEventsByChannel[channelId].push(event);
        affectedChannels.add(channelId);
      });
      
      // Identifier les canaux dont les événements ont changé
      for (const channelId of Object.keys(wsTypingEventsByChannel)) {
        if (!newEventsByChannel[channelId] || 
            JSON.stringify(newEventsByChannel[channelId]) !== JSON.stringify(wsTypingEventsByChannel[channelId])) {
          affectedChannels.add(channelId);
        }
      }
      
      // Mettre à jour la structure par canal
      wsTypingEventsByChannel = newEventsByChannel;
      
      // Notifier les abonnés des canaux affectés uniquement
      affectedChannels.forEach(channelId => {
        notifyChannelSubscribers(channelId);
      });
      
      // Notifier aussi les abonnés globaux
      notifySubscribers();
    }
  };
  
  // Mettre à jour les statuts des utilisateurs
  const updateUserStatus = (userId: string, status: string) => {
    // N'envoyer des notifications que si le statut a réellement changé
    if (wsUserStatuses[userId] !== status) {
      wsUserStatuses = { ...wsUserStatuses, [userId]: status };
      
      // Note: Le cache centralisé sera mis à jour via les autres hooks si nécessaire
      
      // Notifier uniquement les abonnés de cet utilisateur spécifique
      notifyUserStatusSubscribers(userId);
      
      // Notifier aussi les abonnés globaux
      notifySubscribers();
    }
  };
  
  // Récupérer tous les statuts des utilisateurs
  const getUserStatuses = () => wsUserStatuses;
  
  // Récupérer le statut d'un utilisateur spécifique
  const getUserStatus = (userId: string) => wsUserStatuses[userId] || 'offline';
  
    const initializeUserStatus = async (userId: string, serverUrl: string, token: string) => {
    // Vérifier si l'initialisation a déjà été faite
    if (wsUserStatusesInitialized.has(userId) || !userId || !serverUrl || !token) {
      return;
    }
    
    try {
      // Construire l'URL pour l'API de statut
      const statusUrl = `${serverUrl}/api/v4/users/${userId}/status`;
      
      // Faire l'appel API
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Si l'utilisateur n'est pas trouvé (404), ne pas propager l'erreur
        if (response.status === 404) {
          console.warn(`User ${userId} status not found, setting as offline`);
          // Supposer que l'utilisateur est hors ligne par défaut
          updateUserStatus(userId, 'offline');
          // Marquer comme initialisé malgré l'erreur
          wsUserStatusesInitialized.add(userId);
          return { status: 'offline' };
        }
        
        // Pour les autres erreurs, juste logger sans propager
        console.error(`Failed to fetch status: ${response.status} ${response.statusText}`);
        return null;
      }
      
      // Extraire les données
      const data = await response.json();
      
      // Mettre à jour le statut si la réponse contient un statut valide
      if (data && data.status) {
        updateUserStatus(userId, data.status);
        
        // Note: Le cache centralisé sera mis à jour via les autres hooks si nécessaire
        
        // Marquer comme initialisé
        wsUserStatusesInitialized.add(userId);
      }
      
      return data;
    } catch (error) {
      // Capturer toutes les erreurs, ne jamais les propager
      console.error(`Error fetching user status for ${userId}:`, error);
      // Retourner null au lieu de propager
      return null;
    }
  };
  
  // Vérifier si le statut a été initialisé
  const isUserStatusInitialized = (userId: string) => wsUserStatusesInitialized.has(userId);
  
  // Ajouter un utilisateur à la liste de surveillance des statuts
  const addUserToStatusWatch = (userId: string) => {
    if (userId && !wsUserStatusesToWatch.has(userId)) {
      wsUserStatusesToWatch.add(userId);
      // Log uniquement pour le debug avancé
      if (wsUserStatusesToWatch.size % 5 === 0) {
        console.log(`Status watch list update: ${wsUserStatusesToWatch.size} users being monitored`);
      }
    }
  };
  
  // Supprimer un utilisateur de la liste de surveillance des statuts
  const removeUserFromStatusWatch = (userId: string) => {
    if (userId && wsUserStatusesToWatch.has(userId)) {
      wsUserStatusesToWatch.delete(userId);
      // Log uniquement pour le debug avancé ou en cas de vidage complet
      if (wsUserStatusesToWatch.size === 0 || wsUserStatusesToWatch.size % 5 === 0) {
        console.log(`Status watch list update: ${wsUserStatusesToWatch.size} users being monitored`);
      }
    }
  };
  
  // Récupérer tous les utilisateurs actuellement surveillés
  const getStatusWatchList = () => Array.from(wsUserStatusesToWatch);
  
  // Timestamp du dernier pull pour éviter les requêtes trop fréquentes
  let lastStatusPullTimestamp = 0;
  
  // Set pour stocker les utilisateurs dont on a déjà demandé le statut via API, pour éviter les doublons
  // Cette liste est globale et persistante car le singleton ne se réinitialise pas
  let apiStatusRequestedUsers = new Set<string>();
  
  // Map pour suivre les requêtes de statut par utilisateur
  // Clé: ID utilisateur, Valeur: timestamp de la dernière requête
  const userStatusRequestMap = new Map<string, number>();
  
  // Envoyer une requête WebSocket pour obtenir les statuts des utilisateurs
  const requestStatusUpdates = (ws: WebSocket) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    // Obtenir la liste des utilisateurs à surveiller
    const userIds = getStatusWatchList();
    
    // Ne pas envoyer de requête si la liste est vide
    if (userIds.length === 0) return;
    
    // Limiter la fréquence des requêtes (pas plus d'une toutes les 5 secondes)
    const now = Date.now();
    if (now - lastStatusPullTimestamp < 5000) {
      console.log('Skipping status update request - too soon since last request');
      return;
    }
    
    // Mettre à jour le timestamp
    lastStatusPullTimestamp = now;
    
    // Log simplifié
    
    
    // Préparer la requête WebSocket get_statuses
    const getStatusesMessage = {
      action: "get_statuses",
      seq: now, // Identifiant unique basé sur le timestamp
      data: { user_ids: userIds }
    };
    
    try {
      // Envoyer la requête
      ws.send(JSON.stringify(getStatusesMessage));
    } catch (error) {
      console.error('Error sending status update request:', error);
    }
  };
  
  // Démarrer le timer de pull périodique des statuts
  const startStatusPullTimer = (ws: WebSocket) => {
    // Annuler le timer existant s'il y en a un
    stopStatusPullTimer();
    
    // Créer un nouveau timer qui s'exécute toutes les 60 secondes
    wsStatusPullTimer = setInterval(() => {
      requestStatusUpdates(ws);
    }, 30000); // 30 secondes
    
    
  };
  
  // Arrêter le timer de pull périodique
  const stopStatusPullTimer = () => {
    if (wsStatusPullTimer) {
      clearInterval(wsStatusPullTimer);
      wsStatusPullTimer = null;
    }
  };
  
  // Mettre à jour les réactions à un message
  const updateMessageReactions = (postId: string, reaction: {
    user_id: string;
    emoji_name: string;
    post_id: string;
    create_at: number;
  }, isAdd: boolean) => {
    // Créer une nouvelle liste de réactions pour ce message
    let currentReactions = wsMessageReactions[postId] || [];
    
    if (isAdd) {
      // Ajouter la réaction si elle n'existe pas déjà
      const exists = currentReactions.some(r => 
        r.user_id === reaction.user_id && r.emoji_name === reaction.emoji_name
      );
      
      if (!exists) {
        currentReactions = [...currentReactions, reaction];
      }
    } else {
      // Supprimer la réaction
      currentReactions = currentReactions.filter(r => 
        !(r.user_id === reaction.user_id && r.emoji_name === reaction.emoji_name)
      );
    }
    
    // Mettre à jour le stockage
    if (currentReactions.length > 0) {
      wsMessageReactions = { ...wsMessageReactions, [postId]: currentReactions };
    } else {
      // Si plus de réactions, supprimer l'entrée
      const { [postId]: _, ...rest } = wsMessageReactions;
      wsMessageReactions = rest;
    }
    
    // Notifier les abonnés de ce message
    notifyMessageReactionSubscribers(postId);
    
    // Notifier aussi les abonnés globaux
    notifySubscribers();
  };
  
  // Récupérer les réactions d'un message spécifique
  const getMessageReactions = (postId: string) => wsMessageReactions[postId] || [];
  
  // S'abonner aux changements d'état global
  const subscribe = (callback: () => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };
  
  // S'abonner aux changements d'état pour un canal spécifique
  const subscribeToChannel = (channelId: string, callback: () => void) => {
    // Créer l'ensemble de subscribers pour ce canal s'il n'existe pas
    if (!channelSubscribers[channelId]) {
      channelSubscribers[channelId] = new Set();
    }
    
    // Ajouter le callback
    channelSubscribers[channelId].add(callback);
    
    // Retourner une fonction de nettoyage
    return () => {
      if (channelSubscribers[channelId]) {
        channelSubscribers[channelId].delete(callback);
        
        // Nettoyer l'ensemble si vide
        if (channelSubscribers[channelId].size === 0) {
          delete channelSubscribers[channelId];
        }
      }
    };
  };
  
  // S'abonner aux changements d'état pour un utilisateur spécifique
  const subscribeToUserStatus = (userId: string, callback: () => void) => {
    // Créer l'ensemble de subscribers pour cet utilisateur s'il n'existe pas
    if (!userStatusSubscribers[userId]) {
      userStatusSubscribers[userId] = new Set();
    }
    
    // Ajouter le callback
    userStatusSubscribers[userId].add(callback);
    
    // Retourner une fonction de nettoyage
    return () => {
      if (userStatusSubscribers[userId]) {
        userStatusSubscribers[userId].delete(callback);
        
        // Nettoyer l'ensemble si vide
        if (userStatusSubscribers[userId].size === 0) {
          delete userStatusSubscribers[userId];
        }
      }
    };
  };
  
  // S'abonner aux changements des réactions pour un message spécifique
  const subscribeToMessageReactions = (postId: string, callback: () => void) => {
    // Créer l'ensemble de subscribers pour ce message s'il n'existe pas
    if (!messageReactionSubscribers[postId]) {
      messageReactionSubscribers[postId] = new Set();
    }
    
    // Ajouter le callback
    messageReactionSubscribers[postId].add(callback);
    
    // Retourner une fonction de nettoyage
    return () => {
      if (messageReactionSubscribers[postId]) {
        messageReactionSubscribers[postId].delete(callback);
        
        // Nettoyer l'ensemble si vide
        if (messageReactionSubscribers[postId].size === 0) {
          delete messageReactionSubscribers[postId];
        }
      }
    };
  };
  
  // Exposer l'API du singleton
  return {
    getWebSocket: () => wsInstance,
    setWebSocket: (ws: WebSocket | null) => {
      wsInstance = ws;
      notifySubscribers();
    },
    
    // Accès à l'API
    getApiInstance: () => apiInstance,
    
    // API globale pour les événements de frappe
    getTypingEvents: () => wsTypingEvents,
    updateTypingEvents,
    
    // API pour les événements par canal
    getTypingEventsForChannel: (channelId: string) => wsTypingEventsByChannel[channelId] || [],
    
    // API pour les statuts utilisateur
    getUserStatuses,
    getUserStatus,
    updateUserStatus,
    initializeUserStatus,
    isUserStatusInitialized,
    
    // API pour la gestion des statuts par pull périodique
    addUserToStatusWatch,
    removeUserFromStatusWatch,
    getStatusWatchList,
    requestStatusUpdates,
    startStatusPullTimer,
    stopStatusPullTimer,
    
    // API pour les réactions aux messages
    getMessageReactions,
    updateMessageReactions,
    
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
    
    // Abonnements
    subscribe,
    subscribeToChannel,
    subscribeToUserStatus,
    subscribeToMessageReactions
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
  const { isAuthenticated, token, serverUrl, user } = useAuth();
  
  // Query client for cache updates
  const queryClient = useQueryClient();
  
  // Forcer le re-rendu quand l'état du singleton change
  const [, setRenderKey] = useState(0);
  
  // S'abonner aux changements d'état du singleton
  useEffect(() => {
    const forceRender = () => setRenderKey(prev => prev + 1);
    return WebSocketSingleton.subscribe(forceRender);
  }, []);

  // Hook to get current active channel (from MattermostChat component state)
  // Since there's no global state, we'll need to determine active channel from cache
  const getCurrentActiveChannel = useCallback(() => {
    // Try to find the most recently accessed channel from React Query cache
    const queryCache = queryClient.getQueryCache();
    const messageQueries = queryCache.findAll({ queryKey: ['messages', 'list'] });
    
    // Find the most recently fetched channel (likely the active one)
    let mostRecentChannel = null;
    let mostRecentTime = 0;
    
    messageQueries.forEach(query => {
      if (query.state.dataUpdatedAt > mostRecentTime && query.state.data) {
        mostRecentTime = query.state.dataUpdatedAt;
        // Extract channel ID from query key
        const queryParams = query.queryKey[2] as { channelId?: string } | undefined;
        const channelId = queryParams?.channelId;
        if (channelId) {
          mostRecentChannel = channelId;
        }
      }
    });
    
    return mostRecentChannel;
  }, [queryClient]);
  
  // États locaux synchronisés avec le singleton
  const typingEvents = WebSocketSingleton.getTypingEvents();
  const userStatuses = WebSocketSingleton.getUserStatuses();
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
      
      
      
      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      WebSocketSingleton.setWebSocket(ws);
      wsRef.current = ws;
      
      // Connection opened
      ws.onopen = () => {
        
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
        
        
        // Délai pour s'assurer que l'authentification est traitée
        setTimeout(() => {
          // Démarrer le timer de pull périodique des statuts
          WebSocketSingleton.startStatusPullTimer(ws);
          
          // Effectuer une requête immédiate des statuts si nous avons des utilisateurs à surveiller
          if (WebSocketSingleton.getStatusWatchList().length > 0) {
            WebSocketSingleton.requestStatusUpdates(ws);
          }
        }, 2000);
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
          console.log('📨 Raw WebSocket message received');
          const data = JSON.parse(event.data);
          console.log('📩 Parsed WebSocket message:', data);
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
    
    // Arrêter le timer de pull périodique des statuts
    WebSocketSingleton.stopStatusPullTimer();
    
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
    // Utiliser la référence au singleton pour l'instance WebSocket
    const ws = WebSocketSingleton.getWebSocket();
    
    if (!ws || ws.readyState !== WebSocket.OPEN || !isAuthenticated || !user) {
      return;
    }
    
    
    if (!user.id) {
      return;
    }
    
    const typingEvent = {
      action: 'user_typing',
      seq: Date.now(), 
      data: {
        channel_id: channelId,
        parent_id: ''
      }
    };
    
    try {
      ws.send(JSON.stringify(typingEvent));
    } catch (error) {
      console.error('Error sending typing event:', error);
    }
  }, [isConnected, isAuthenticated, token]);
  
  // Clean up old typing events via le singleton
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentEvents = WebSocketSingleton.getTypingEvents();
      
      // Dédoublonner les événements par utilisateur/canal et filtrer les périmés
      // 1. Créer un objet temporaire pour stocker le dernier événement de chaque utilisateur par canal
      const latestEventsByUserAndChannel: Record<string, typeof currentEvents[0]> = {};
      
      // 2. Pour chaque événement, ne conserver que le plus récent pour chaque paire utilisateur/canal
      currentEvents.forEach(event => {
        const key = `${event.username}_${event.channel_id}`;
        
        // Si cet événement est plus récent ou si c'est le premier pour cette paire
        if (!latestEventsByUserAndChannel[key] || 
            event.timestamp > latestEventsByUserAndChannel[key].timestamp) {
          latestEventsByUserAndChannel[key] = event;
        }
      });
      
      // 3. Convertir l'objet en tableau et filtrer les événements périmés
      const uniqueEvents = Object.values(latestEventsByUserAndChannel)
        .filter(event => now - event.timestamp < 10000);
      
      // Utiliser updateTypingEvents qui vérifiera lui-même si une mise à jour est nécessaire
      WebSocketSingleton.updateTypingEvents(uniqueEvents);
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
          const currentActiveChannel = getCurrentActiveChannel();
          
          // Si c'est la channel active, utiliser setQueryData comme avant (pas d'incrémentation)
          if (post.channel_id === currentActiveChannel) {
            // Pour messages normaux (non-thread) : ajouter au cache direct
            if (!post.root_id) {
              queryClient.setQueryData(
                messageKeys.list(post.channel_id),
                (oldMessages: any[] = []) => {
                  // Déduplication : éviter les doublons
                  if (oldMessages.some((msg: any) => msg.id === post.id)) {
                    return oldMessages;
                  }
                  // Ajouter le nouveau message et trier par date de création
                  const updatedMessages = [...oldMessages, post];
                  return updatedMessages.sort((a: any, b: any) => a.create_at - b.create_at);
                }
              );
            } else {
              // Pour thread replies : ajouter au cache thread ET mettre à jour le parent
              queryClient.setQueryData(
                messageKeys.thread(post.root_id),
                (oldData: any = { threadMessages: [], parentMessage: null }) => {
                  const threadMessages = oldData.threadMessages || [];
                  if (threadMessages.some((msg: any) => msg.id === post.id)) {
                    return oldData;
                  }
                  return {
                    ...oldData,
                    threadMessages: [...threadMessages, post].sort((a: any, b: any) => a.create_at - b.create_at)
                  };
                }
              );
              
              // Mettre à jour le reply count du message parent dans la liste principale
              queryClient.setQueryData(
                messageKeys.list(post.channel_id),
                (oldMessages: any[] = []) => {
                  return oldMessages.map((msg: any) => {
                    if (msg.id === post.root_id) {
                      const updatedMsg = { ...msg };
                      // @ts-ignore - We're adding a dynamic property
                      updatedMsg.reply_count = ((updatedMsg.reply_count || 0) + 1);
                      // @ts-ignore - We're adding a dynamic property
                      updatedMsg.has_replies = true;
                      return updatedMsg;
                    }
                    return msg;
                  });
                }
              );
            }
          } else {
            // Sinon, incrémenter les compteurs unread
            console.log('Incrementing unread counts for non-active channel:', post.channel_id);
            
            // Récupérer le teamId depuis différentes sources
            const teamId = event.data?.team_id || post.team_id || getTeamIdFromChannelId(post.channel_id);
            
            if (teamId) {
              // Incrémenter channel unread count
              queryClient.setQueryData(
                unreadKeys.channelCounts(teamId),
                (old: any[] = []) => {
                  const existingIndex = old.findIndex((count: any) => count.channel_id === post.channel_id);
                  
                  if (existingIndex >= 0) {
                    const updated = [...old];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      msg_count: updated[existingIndex].msg_count + 1,
                    };
                    return updated;
                  } else {
                    return [...old, {
                      channel_id: post.channel_id,
                      team_id: teamId,
                      msg_count: 1,
                      mention_count: 0,
                    }];
                  }
                }
              );

              // Incrémenter team unread count
              queryClient.setQueryData(
                unreadKeys.counts(),
                (old: any[] = []) => {
                  const existingIndex = old.findIndex((count: any) => count.team_id === teamId);
                  
                  if (existingIndex >= 0) {
                    const updated = [...old];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      msg_count: updated[existingIndex].msg_count + 1,
                    };
                    return updated;
                  } else {
                    return [...old, {
                      team_id: teamId,
                      msg_count: 1,
                      mention_count: 0,
                    }];
                  }
                }
              );
              console.log('Successfully incremented unread counts for team:', teamId, 'channel:', post.channel_id);
            } else {
              console.warn('Could not determine teamId for channel:', post.channel_id, 'skipping unread count increment');
            }
          }
        }
      }
    },
    
    post_edited: {
      handle: (event, queryClient) => {
        console.log('Handling post_edited event:', event);
        const post = parseEventPost(event);
        if (post?.channel_id) {
          // Pour messages normaux : mettre à jour dans le cache
          if (!post.root_id) {
            queryClient.setQueryData(
              messageKeys.list(post.channel_id),
              (oldMessages: any[] = []) => {
                return oldMessages.map((msg: any) => 
                  msg.id === post.id ? { ...msg, ...post } : msg
                );
              }
            );
          } else {
            // Pour thread replies : mettre à jour dans le cache thread
            queryClient.setQueryData(
              messageKeys.thread(post.root_id),
              (oldData: any = { threadMessages: [], parentMessage: null }) => {
                const threadMessages = oldData.threadMessages || [];
                const updatedThreadMessages = threadMessages.map((msg: any) => 
                  msg.id === post.id ? { ...msg, ...post } : msg
                );
                return {
                  ...oldData,
                  threadMessages: updatedThreadMessages
                };
              }
            );
          }
        }
      }
    },
    
    post_deleted: {
      handle: (event, queryClient) => {
        console.log('Handling post_deleted event:', event);
        const post = parseEventPost(event);
        if (post?.channel_id) {
          const currentActiveChannel = getCurrentActiveChannel();
          
          // Si c'est la channel active, utiliser setQueryData comme avant (pas de décrémentation)
          if (post.channel_id === currentActiveChannel) {
            // Pour messages normaux : supprimer du cache
            if (!post.root_id) {
              queryClient.setQueryData(
                messageKeys.list(post.channel_id),
                (oldMessages: any[] = []) => {
                  return oldMessages.filter((msg: any) => msg.id !== post.id);
                }
              );
            } else {
              // Pour thread replies : supprimer du cache thread ET décrémenter reply count
              queryClient.setQueryData(
                messageKeys.thread(post.root_id),
                (oldData: any = { threadMessages: [], parentMessage: null }) => {
                  const threadMessages = oldData.threadMessages || [];
                  const filteredThreadMessages = threadMessages.filter((msg: any) => msg.id !== post.id);
                  return {
                    ...oldData,
                    threadMessages: filteredThreadMessages
                  };
                }
              );
              
              // Décrémenter le reply count du message parent
              queryClient.setQueryData(
                messageKeys.list(post.channel_id),
                (oldMessages: any[] = []) => {
                  return oldMessages.map((msg: any) => {
                    if (msg.id === post.root_id) {
                      const updatedMsg = { ...msg };
                      // @ts-ignore - We're adding a dynamic property
                      updatedMsg.reply_count = Math.max(0, (updatedMsg.reply_count || 1) - 1);
                      // @ts-ignore - We're adding a dynamic property
                      updatedMsg.has_replies = updatedMsg.reply_count > 0;
                      return updatedMsg;
                    }
                    return msg;
                  });
                }
              );
            }
          } else {
            // Sinon, décrémenter les compteurs unread
            console.log('Decrementing unread counts for deleted message in non-active channel:', post.channel_id);
            
            // Récupérer le teamId depuis différentes sources
            const teamId = event.data?.team_id || post.team_id || getTeamIdFromChannelId(post.channel_id);
            
            if (teamId) {
              // Décrémenter channel unread count
              queryClient.setQueryData(
                unreadKeys.channelCounts(teamId),
                (old: any[] = []) => old.map((count: any) => 
                  count.channel_id === post.channel_id && count.msg_count > 0
                    ? { ...count, msg_count: count.msg_count - 1 }
                    : count
                )
              );

              // Décrémenter team unread count
              queryClient.setQueryData(
                unreadKeys.counts(),
                (old: any[] = []) => old.map((count: any) => 
                  count.team_id === teamId && count.msg_count > 0
                    ? { ...count, msg_count: count.msg_count - 1 }
                    : count
                )
              );
              console.log('Successfully decremented unread counts for team:', teamId, 'channel:', post.channel_id);
            } else {
              console.warn('Could not determine teamId for channel:', post.channel_id, 'skipping unread count decrement');
            }
          }
        }
      }
    },
    
    // Canaux
    channel_created: {
      handle: (event, queryClient) => {
        console.log('Handling channel event:', event);
        const { team_id, channel_id } = event.data || {};
        
        if (team_id) {
          // Obtenir l'ID d'équipe actuellement affichée
          // Nous détectons l'équipe active en regardant les données actuellement en cache
          const activeTeamIds = Object.keys(channelsCache);
          
          if (activeTeamIds.includes(team_id)) {
            // Si c'est l'équipe actuelle, invalider les requêtes immédiatement
            console.log(`Channel event on current team ${team_id}, invalidating queries`);
            queryClient.invalidateQueries({ queryKey: channelKeys.list(team_id) });
          } else {
            // Si c'est une autre équipe, marquer comme "dirty" pour refetch futur
            console.log(`Channel event on other team ${team_id}, marking team as dirty`);
            markTeamAsDirty(team_id);
          }
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
        const userId = event.data?.user_id;
        const status = event.data?.status;
        
        if (userId && status) {
          // Log uniquement si le statut a changé
          const oldStatus = WebSocketSingleton.getUserStatus(userId);
          if (oldStatus !== status) {
            console.log(`Status change from event: user ${userId.slice(0, 6)}... => ${status}`);
          }
          
          // Mise à jour centralisée dans le singleton
          WebSocketSingleton.updateUserStatus(userId, status);
          
          // Mettre également à jour le cache React Query pour cohérence
          queryClient.setQueryData(
            userKeys.detail(userId),
            (oldData: any) => oldData ? { ...oldData, status } : oldData
          );
          
          // Mise à jour du cache userKeys.status
          queryClient.setQueryData(
            userKeys.status(userId),
            status
          );
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
          
          // Récupérer le nom d'utilisateur à partir des différentes sources de cache
          // Afficher l'ID utilisateur pour faciliter le débogage
          console.log(`Typing event received from user ID: ${userId}`);
          
          // 1. Essayer d'abord le cache en mémoire de useUsers.ts qui est plus fiable
          try {
            // Importer dynamiquement pour éviter les dépendances circulaires
            // Sans utiliser require pour respecter les contraintes de React client
            import('../hooks/useUsers').then(useUsersModule => {
              if (useUsersModule.userCache[userId]) {
                username = formatUserName(useUsersModule.userCache[userId]);
                console.log(`Found user ${userId} in useUsers cache, username: ${username}`);
                
                // Mettre à jour directement le singleton
                const updatedEvents = [...WebSocketSingleton.getTypingEvents().filter(e => 
                  !(e.channel_id === channelId && e.username === 'Someone')), 
                  { username, channel_id: channelId, timestamp: now }
                ];
                WebSocketSingleton.updateTypingEvents(updatedEvents);
                return; // Exit early since we found the user
              } else {
                console.warn(`User ${userId} not found in useUsers cache`);
              }
            }).catch(error => {
              console.error('Error accessing useUsers module:', error);
            });
          } catch (error) {
            console.error('Error with dynamic import:', error);
          }
          
          // 2. Fallback au localStorage
          const cachedUsersStr = localStorage.getItem('mattermost_cached_users');
          if (cachedUsersStr) {
            try {
              const cachedUsers = JSON.parse(cachedUsersStr);
              const user = cachedUsers[userId];
              if (user) {
                // Utiliser formatUserName pour respecter les conventions existantes
                username = formatUserName(user);
                console.log(`Successfully resolved username: ${username} for user ${userId}`);
              } else {
                console.warn(`User ${userId} not found in localStorage cache`);
              }
            } catch (error) {
              console.error('Error parsing cached users from localStorage:', error);
            }
          } else {
            console.warn('No cached users found in localStorage');
          }
          
          // 3. Si nous avons toujours "Someone", essayer de charger l'utilisateur
          if (username === 'Someone') {
            console.log(`Attempting to load user ${userId} from API`);
            // Utiliser une IIFE pour pouvoir utiliser await
            (async () => {
              try {
                try {
                  // Utiliser l'API client directement
                  const response = await api.get(`users/${userId}`);
                  if (response.data) {
                    username = formatUserName(response.data);
                    console.log(`Loaded user ${userId} from API, username: ${username}`);
                    
                    // Mettre à jour directement le singleton
                    const updatedEvents = [...WebSocketSingleton.getTypingEvents().filter(e => 
                      !(e.channel_id === channelId && e.username === 'Someone')), 
                      { username, channel_id: channelId, timestamp: now }
                    ];
                    WebSocketSingleton.updateTypingEvents(updatedEvents);
                  }
                } catch (apiError) {
                  // Si l'API renvoie une erreur (comme 404), simplement continuer
                  console.warn(`Error loading user ${userId}, will use default name:`, apiError);
                  // Conserver le nom par défaut 'Someone'
                }
              } catch (error) {
                console.error(`Error loading user ${userId} from API:`, error);
              }
            })();
          }
          
          // Mettre à jour l'état des événements de saisie via le singleton de façon optimisée
          const currentEvents = WebSocketSingleton.getTypingEvents();
          
          // 1. Filtrer les événements périmés et ceux du même utilisateur pour le même canal
          const filtered = currentEvents.filter(event => 
            // Garder les événements de moins de 10 secondes
            now - event.timestamp < 10000 && 
            // Filtrer TOUS les événements de cet utilisateur dans ce canal spécifique
            !(event.channel_id === channelId && event.username === username)
          );
          
          // 2. Ajouter un nouvel événement unique pour cet utilisateur
          const updatedEvents = [...filtered, { username, channel_id: channelId, timestamp: now }];
          
          // 3. Mettre à jour le singleton
          WebSocketSingleton.updateTypingEvents(updatedEvents);
        } catch (error) {
          console.error('Error processing typing event:', error);
        }
      }
    },
    
    // Réactions
    reaction_added: {
      handle: (event, queryClient) => {
        console.log('Handling reaction_added event:', event);
        
        try {
          // Les données de réaction sont dans un JSON stringifié dans event.data.reaction
          const reactionData = event.data?.reaction 
            ? JSON.parse(event.data.reaction)
            : null;
            
          if (reactionData) {
            const { emoji_name, post_id, user_id, create_at } = reactionData;
            
            if (emoji_name && post_id && user_id) {
              console.log(`Processing reaction_added: ${emoji_name} by ${user_id} on ${post_id}`);
              
              // Mettre à jour le stockage central via le singleton
              WebSocketSingleton.updateMessageReactions(post_id, {
                emoji_name,
                post_id,
                user_id,
                create_at: create_at || Date.now()
              }, true); // true = ajouter
            }
          }
          
          // Maintenir aussi l'invalidation du cache pour compatibilité
          const channelId = event.broadcast?.channel_id;
          if (channelId) {
            queryClient.invalidateQueries({ queryKey: messageKeys.list(channelId) });
          }
        } catch (error) {
          console.error('Error processing reaction_added event:', error, event);
        }
      }
    },
    
    reaction_removed: {
      handle: (event, queryClient) => {
        console.log('Handling reaction_removed event:', event);
        
        try {
          // Les données de réaction sont dans un JSON stringifié dans event.data.reaction
          const reactionData = event.data?.reaction 
            ? JSON.parse(event.data.reaction)
            : null;
            
          if (reactionData) {
            const { emoji_name, post_id, user_id, create_at } = reactionData;
            
            if (emoji_name && post_id && user_id) {
              console.log(`Processing reaction_removed: ${emoji_name} by ${user_id} on ${post_id}`);
              
              // Mettre à jour le stockage central via le singleton
              WebSocketSingleton.updateMessageReactions(post_id, {
                emoji_name,
                post_id,
                user_id,
                create_at: create_at || Date.now()
              }, false); // false = supprimer
            }
          }
          
          // Maintenir aussi l'invalidation du cache pour compatibilité
          const channelId = event.broadcast?.channel_id;
          if (channelId) {
            queryClient.invalidateQueries({ queryKey: messageKeys.list(channelId) });
          }
        } catch (error) {
          console.error('Error processing reaction_removed event:', error, event);
        }
      }
    },
    
    // Membres d'équipe
    team_member_added: {
      handle: (event, queryClient) => {
        console.log('Handling team_member event:', event);
        const teamId = event.data?.team_id;
        if (teamId) {
          queryClient.invalidateQueries({ queryKey: [...teamKeys.detail(teamId), 'members'] });
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
          queryClient.invalidateQueries({ queryKey: teamKeys.list({}) });
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
        queryClient.invalidateQueries({ queryKey: userKeys.all });
      }
    },
    
    // Mentions
    mention_received: {
      handle: (event, queryClient) => {
        console.log('Handling mention_received event:', event);
        const channelId = event.data?.channel_id;
        if (channelId) {
          queryClient.invalidateQueries({ queryKey: unreadKeys.counts() });
          queryClient.invalidateQueries({ queryKey: messageKeys.list(channelId) });
        }
      }
    },

    // Channel viewed (mark as read)
    channel_viewed: {
      handle: (event, queryClient) => {
        console.log('Handling channel_viewed event:', event);
        const channelId = event.data?.channel_id;
        if (channelId) {
          console.log('Handling channel_viewed for channel:', channelId);
          
          // Récupérer le teamId depuis l'événement ou en utilisant le mapping
          const teamId = event.data?.team_id || getTeamIdFromChannelId(channelId);
          
          if (teamId) {
            // Récupérer le channel count actuel pour ajuster le team count
            let currentChannelCount = 0;
            const channelData = queryClient.getQueryData<any[]>(unreadKeys.channelCounts(teamId));
            if (channelData) {
              const channelUnread = channelData.find((c: any) => c.channel_id === channelId);
              currentChannelCount = channelUnread?.msg_count || 0;
            }

            // Reset channel unread count
            queryClient.setQueryData(
              unreadKeys.channelCounts(teamId),
              (old: any[] = []) => old.map((count: any) => 
                count.channel_id === channelId 
                  ? { ...count, msg_count: 0, mention_count: 0 }
                  : count
              )
            );

            // Ajuster team unread count en soustrayant le count du channel
            if (currentChannelCount > 0) {
              queryClient.setQueryData(
                unreadKeys.counts(),
                (old: any[] = []) => old.map((count: any) => 
                  count.team_id === teamId 
                    ? { 
                        ...count, 
                        msg_count: Math.max(0, count.msg_count - currentChannelCount)
                      }
                    : count
                )
              );
              console.log('Successfully reset unread counts for channel:', channelId, 'team:', teamId, 'previous count:', currentChannelCount);
            }
          } else {
            console.warn('Could not determine teamId for channel_viewed event:', channelId);
          }
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
    },
    
    // Test pour les statuts (potentiellement avec des noms différents)
    user_status_change: {
      handle: (event, queryClient) => {
        console.log('🟢 TROUVÉ: user_status_change event:', event);
        // On essaie avec un nom d'événement alternatif
      }
    },
    
    user_updated: {
      handle: (event, queryClient) => {
        console.log('🟢 TROUVÉ: user_updated event (peut contenir des statuts):', event);
        // Les mises à jour utilisateur peuvent inclure des changements de statut
      }
    }
  };

  // Handle WebSocket events and update cache
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    if (!event) return;
    
    // Gérer les réponses aux commandes (comme get_statuses)
    if ((event.status === "OK" || event.seq_reply) && !event.event) {
      // Vérifier si c'est une réponse à get_statuses avec des données
      if (event.data && typeof event.data === 'object') {
        // Traiter les statuts reçus
        try {
          const statusData = event.data;
          const statusCount = Object.keys(statusData).length;
          
          // Log condensé pour éviter de polluer la console
          if (statusCount > 0) {
            console.log(`Received ${statusCount} user status updates`);
          }
          
          // Parcourir tous les statuts reçus
          Object.entries(statusData).forEach(([userId, status]) => {
            if (typeof status === 'string') {
              // Log uniquement si le statut a changé
              const oldStatus = WebSocketSingleton.getUserStatus(userId);
              if (oldStatus !== status) {
                console.log(`Status change: user ${userId.slice(0, 6)}... => ${status}`);
              }
              
              // Utiliser la référence directe au singleton pour mettre à jour le statut
              WebSocketSingleton.updateUserStatus(userId, status);
            }
          });
        } catch (error) {
          console.error('Error processing status response:', error);
        }
      }
      
      return; // Ne pas continuer le traitement pour les réponses aux commandes
    }
    
    // Traitement normal des événements
    if (!event.event) return;
    
    // Log limité aux événements importants
    if (event.event === 'status_change' || 
        event.event === 'typing' || 
        event.event === 'reaction_added' || 
        event.event === 'reaction_removed') {
      console.log(`WebSocket ${event.event} event received`);
    }
    
    // Détecter les nouveaux types d'événements liés aux statuts pour le debug
    if (event.event && 
        (event.event.includes('status') || event.event.includes('presence')) && 
        event.event !== 'status_change') {
      console.log(`Potential new status event type detected: ${event.event}`);
    }
    
    const handler = eventHandlers[event.event];
    if (handler) {
      try {
        // Tous les gestionnaires d'événements utilisent maintenant le singleton
        handler.handle(event, queryClient);
      } catch (error) {
        console.error(`Error handling WebSocket event ${event.event}:`, error);
      }
    } else {
      console.log(`No handler defined for event type: ${event.event}`);
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
      
      // Add a longer initial delay (3 seconds) to ensure the server is ready
      // This gives more time for the authentication to be fully processed
      // and for the server to be ready to accept WebSocket connections
      timer = setTimeout(() => {
        if (isAuthenticated && !connectionStateRef.current.isConnected && 
            !connectionStateRef.current.isConnecting) {
          connect();
        }
      }, 3000); // Increased from 1000ms to 3000ms
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
    
    // User statuses
    userStatuses,
    
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
    userStatuses: {},
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