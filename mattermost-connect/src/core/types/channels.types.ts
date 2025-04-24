// src/core/types/channels.types.ts
/**
 * Types liés aux canaux
 */

import { NormalizedState } from "./common.types";

/**
 * Représente un canal Mattermost
 */
export interface Channel {
  /** Identifiant unique du canal */
  id: string;

  /** ID de l'équipe à laquelle appartient le canal */
  team_id: string;

  /** Nom technique du canal (utilisé pour les URLs) */
  name: string;

  /** Nom d'affichage du canal */
  display_name: string;

  /** Type de canal: O (public), P (privé), D (direct), G (groupe) */
  type: "O" | "P" | "D" | "G";

  /** En-tête du canal */
  header?: string;

  /** Description / objectif du canal */
  purpose?: string;

  /** Timestamp de création */
  create_at: number;

  /** Timestamp de dernière mise à jour */
  update_at: number;

  /** Timestamp de suppression (0 si non supprimé) */
  delete_at: number;

  /** Nombre total de messages dans le canal */
  total_msg_count?: number;

  /** Timestamp du dernier message */
  last_post_at?: number;

  /** Indique si le canal est en favori */
  is_favorite?: boolean;

  /** Nombre de mentions non lues */
  mention_count?: number;
}

/**
 * Types de regroupement de canaux pour l'UI
 */
export type ChannelGroupType =
  | "public"
  | "private"
  | "direct"
  | "group"
  | "favorite";

/**
 * Compteurs non lus pour un canal
 */
export interface ChannelUnreadCount {
  /** Nombre de messages non lus */
  messageCount: number;

  /** Nombre de mentions non lues */
  mentionCount: number;

  /** ID du dernier message lu */
  lastMessageId?: string;

  /** Timestamp de la dernière consultation */
  lastViewedAt?: number;
}

/**
 * Information sur un membre d'un canal
 */
export interface ChannelMember {
  /** ID de l'utilisateur */
  user_id: string;

  /** ID du canal */
  channel_id: string;

  /** Rôles dans le canal */
  roles: string;

  /** Timestamp de la dernière consultation */
  last_viewed_at?: number;

  /** Nombre de messages dans le canal */
  msg_count?: number;

  /** Nombre de mentions non lues */
  mention_count?: number;

  /** Notifications de mentions */
  notify_props?: {
    desktop?: "default" | "all" | "mentions" | "none";
    mark_unread?: "all" | "mention";
  };
}

/**
 * État normalisé des canaux
 */
export interface NormalizedChannelsState extends NormalizedState<Channel> {
  /** Canaux par équipe (ID d'équipe -> liste d'IDs de canaux) */
  byTeam: Record<string, string[]>;

  /** ID du canal actif */
  activeChannelId: string | null;
}

/**
 * État des canaux dans le store
 */
export interface ChannelsState {
  /** Canaux par équipe */
  channelsByTeam: Record<string, Channel[]>;

  /** Canal actuellement actif */
  activeChannel: Channel | null;

  /** État de chargement par équipe */
  loadingStates: Record<string, boolean>;

  /** Erreurs par équipe */
  errors: Record<string, Error | null>;

  /** Timestamps du dernier chargement par équipe */
  lastFetchTimes: Record<string, number>;

  /** Compteurs non lus par canal */
  unreadCounts: Record<string, ChannelUnreadCount>;

  /** Utilisateurs en train de taper par canal */
  typingUsers: Record<string, string[]>;
}

/**
 * Interface de retour pour le hook useChannels
 */
export interface UseChannelsReturnType {
  // État
  channelsByTeam: Record<string, Channel[]>;
  activeChannel: Channel | null;
  loadingStates: Record<string, boolean>;
  errors: Record<string, Error | null>;

  // Actions
  loadChannels: (teamId: string, forceRefresh?: boolean) => Promise<Channel[]>;
  loadChannel: (
    channelId: string,
    forceRefresh?: boolean,
  ) => Promise<Channel | null>;
  selectChannel: (channel: Channel | null) => Promise<Channel | null>;
  markAsRead: (channelId: string) => Promise<boolean>;

  // Utilitaires
  getChannelsByType: (teamId: string, type: ChannelGroupType) => Channel[];
  getChannelUnreadCount: (channelId: string) => ChannelUnreadCount;
  getTypingUsers: (channelId: string) => string[];
}
