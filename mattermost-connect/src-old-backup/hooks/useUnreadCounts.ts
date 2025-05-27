import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WebSocketSingleton } from './useWebSocket';

// Query keys for unread counts
export const unreadKeys = {
  all: ['unread'] as const,
  counts: () => [...unreadKeys.all, 'counts'] as const,
};

// Team unread interface (from API)
export interface TeamUnread {
  team_id: string;
  msg_count: number;
  mention_count: number;
}

// Channel unread interface (from API)
export interface ChannelUnread {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
}

/**
 * NOUVEAU DESIGN SIMPLIFIÉ - Un seul service unread global
 * Plus de gestion par team compliquée, tout est centralisé et simple
 */
class GlobalUnreadManager {
  // Cache global simple : channelId -> unread count
  private channelUnreads = new Map<string, number>();
  private channelMentions = new Map<string, number>();
  private teamUnreads = new Map<string, number>();
  private teamMentions = new Map<string, number>();
  
  // Listeners pour les changements
  private listeners = new Set<() => void>();
  
  // WebSocket listener global
  private wsListenerInitialized = false;
  
  // Current user ID pour filtrer ses propres messages
  private currentUserId: string | null = null;

  /**
   * Initialiser avec les données des APIs
   */
  initialize(teamUnreads: TeamUnread[], channelUnreads: ChannelUnread[]) {
    console.log('[UNREAD] Initializing with', teamUnreads.length, 'teams and', channelUnreads.length, 'channels');
    
    // Reset et populate team counts
    this.teamUnreads.clear();
    this.teamMentions.clear();
    teamUnreads.forEach(team => {
      this.teamUnreads.set(team.team_id, team.msg_count);
      this.teamMentions.set(team.team_id, team.mention_count);
    });

    // Reset et populate channel counts
    this.channelUnreads.clear();
    this.channelMentions.clear();
    channelUnreads.forEach(channel => {
      this.channelUnreads.set(channel.channel_id, channel.msg_count);
      this.channelMentions.set(channel.channel_id, channel.mention_count);
      console.log(`[UNREAD] Channel ${channel.channel_id}: ${channel.msg_count} unread`);
    });

    this.initializeWebSocketListener();
    this.notifyListeners();
  }

  /**
   * Initialiser l'écoute WebSocket UNE SEULE FOIS
   */
  private initializeWebSocketListener() {
    if (this.wsListenerInitialized) return;
    this.wsListenerInitialized = true;
    
    console.log('[UNREAD] Setting up WebSocket listeners');

    // SUPPRIMÉ: L'écoute WebSocket est maintenant centralisée dans WebSocketEventDispatcher
    // Les events 'posted' et 'channel_viewed' sont traités UNE SEULE FOIS puis dispatchés ici
    console.log('[UNREAD] WebSocket listeners will be handled by centralized dispatcher');
  }

  /**
   * API publique simple
   */
  getChannelUnreadCount(channelId: string): number {
    return this.channelUnreads.get(channelId) || 0;
  }

  getChannelMentionCount(channelId: string): number {
    return this.channelMentions.get(channelId) || 0;
  }

  getTeamUnreadCount(teamId: string): number {
    return this.teamUnreads.get(teamId) || 0;
  }

  getTeamMentionCount(teamId: string): number {
    return this.teamMentions.get(teamId) || 0;
  }

  resetChannelCounts(channelId: string) {
    this.channelUnreads.set(channelId, 0);
    this.channelMentions.set(channelId, 0);
    this.notifyListeners();
  }

  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * NOUVEAU: Méthodes pour gérer les events WebSocket depuis le dispatcher centralisé
   */
  handlePostedEvent(post: any) {
    if (!post) return;
    
    // Ne pas incrémenter pour ses propres messages
    const currentUserId = this.getCurrentUserId();
    if (post.user_id === currentUserId) {
      console.log(`[UNREAD] Posted: Ignoring own message from ${post.user_id}`);
      return;
    }
    
    const channelId = post.channel_id;
    const teamId = post.team_id; // Peut venir du post ou de l'event
    
    // Incrémenter channel count
    const currentCount = this.channelUnreads.get(channelId) || 0;
    this.channelUnreads.set(channelId, currentCount + 1);
    
    // Incrémenter team count si on a un teamId
    if (teamId) {
      const currentTeamCount = this.teamUnreads.get(teamId) || 0;
      this.teamUnreads.set(teamId, currentTeamCount + 1);
    }
    
    console.log(`[UNREAD] Posted: +1 for channel ${channelId} (now ${this.channelUnreads.get(channelId)}) from user ${post.user_id}`);
    this.notifyListeners();
  }

  handleChannelViewedEvent(channelId: string) {
    if (!channelId) return;
    
    console.log(`[UNREAD] Channel viewed: ${channelId} → reset to 0`);
    this.channelUnreads.set(channelId, 0);
    this.channelMentions.set(channelId, 0);
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[UNREAD] Error notifying listener:', error);
      }
    });
  }
}

// Instance singleton globale
export const globalUnreadManager = new GlobalUnreadManager();

/**
 * Hook simplifié pour les unread counts
 * Plus de complexité par team, tout est global et simple
 */
export function useUnreadCounts() {
  const { user } = useAuth();
  
  // Force update quand le manager change
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  React.useEffect(() => {
    return globalUnreadManager.subscribe(() => forceUpdate());
  }, []);

  // Mettre à jour l'userId dans le manager quand il change
  React.useEffect(() => {
    globalUnreadManager.setCurrentUserId(user?.id || null);
  }, [user?.id]);

  // 1. SIMPLIFIÉ: team unread counts maintenant gérés par useMattermostFlow
  const teamUnreadQuery = useQuery({
    queryKey: [...unreadKeys.counts(), 'teams'],
    queryFn: async () => {
      console.log('[UNREAD] Team unread counts now handled by useMattermostFlow - returning empty array');
      return [];
    },
    enabled: false, // Désactivé - remplacé par useMattermostFlow
    staleTime: Infinity,
  });

  // 2. SUPPRIMÉ: plus d'appels individuels /channels/{id}/unread
  // Les unread counts sont maintenant calculés via total_msg_count - msg_count
  // dans useMattermostFlow hook
  const channelUnreadQuery = useQuery({
    queryKey: [...unreadKeys.counts(), 'channels'],
    queryFn: async () => {
      console.log('[UNREAD] Channel unread counts now handled by useMattermostFlow - returning empty array');
      return [];
    },
    enabled: false, // Désactivé - remplacé par useMattermostFlow
    staleTime: Infinity,
  });

  // 3. Initialiser le manager quand les données arrivent
  React.useEffect(() => {
    if (teamUnreadQuery.data && channelUnreadQuery.data) {
      globalUnreadManager.initialize(teamUnreadQuery.data, channelUnreadQuery.data);
    }
  }, [teamUnreadQuery.data, channelUnreadQuery.data]);

  // Mark as read mutation - DISABLED FOR NOW
  const markAsReadMutation = useMutation({
    mutationFn: async (channelId: string) => {
      // Disabled - just reset locally for now
      console.log('markAsRead called but disabled, resetting locally');
      globalUnreadManager.resetChannelCounts(channelId);
      return channelId;
    },
  });

  return {
    // Loading states
    isLoading: teamUnreadQuery.isLoading || channelUnreadQuery.isLoading,
    isError: teamUnreadQuery.isError || channelUnreadQuery.isError,
    error: teamUnreadQuery.error || channelUnreadQuery.error,
    
    // Actions
    markAsRead: markAsReadMutation.mutateAsync,
    isMarkingAsRead: markAsReadMutation.isPending,
    
    // Utility functions - API simple
    getChannelUnreadCount: (channelId: string) => globalUnreadManager.getChannelUnreadCount(channelId),
    getChannelMentionCount: (channelId: string) => globalUnreadManager.getChannelMentionCount(channelId),
    getTeamUnreadCount: (teamId: string) => globalUnreadManager.getTeamUnreadCount(teamId),
    getTeamMentionCount: (teamId: string) => globalUnreadManager.getTeamMentionCount(teamId),
    
    // Refetch
    refetch: () => {
      teamUnreadQuery.refetch();
      channelUnreadQuery.refetch();
    },
  };
}