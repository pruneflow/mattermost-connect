// src/core/types/websocket.types.ts
/**
 * Types liés à WebSocket et aux communications en temps réel
 */

/**
 * Options de connexion WebSocket
 */
export interface WebSocketConnectionOptions {
  /** Callback appelé à l'ouverture de la connexion */
  onOpen?: () => void;

  /** Callback appelé à la fermeture de la connexion */
  onClose?: (event: CloseEvent) => void;

  /** Callback appelé en cas d'erreur */
  onError?: (event: Event) => void;

  /** Intervalle de ping en millisecondes */
  pingInterval?: number;
}

/**
 * Handler pour les messages WebSocket
 */
export type MessageHandler = (data: any) => void;

/**
 * Message entrant du WebSocket Mattermost
 */
export interface WebSocketMessage {
  /** Type d'événement */
  event: string;

  /** Données de l'événement */
  data: any;

  /** ID de broadcast */
  broadcast?: {
    omit_users?: Record<string, boolean>;
    user_id?: string;
    channel_id?: string;
    team_id?: string;
  };

  /** ID de séquence */
  seq?: number;
}

/**
 * Message sortant pour le WebSocket Mattermost
 */
export interface WebSocketOutgoingMessage {
  /** ID de séquence */
  seq: number;

  /** Action à effectuer */
  action: string;

  /** Données associées à l'action */
  data?: any;
}

/**
 * Message de challenge d'authentification
 */
export interface WebSocketAuthChallenge {
  /** ID de séquence */
  seq: number;

  /** Action: "authentication_challenge" */
  action: "authentication_challenge";

  /** Données d'authentification */
  data: {
    /** Token d'authentification */
    token: string;
  };
}

/**
 * Types d'événements WebSocket standardisés
 */
export enum WebSocketEventType {
  // Événements du canal
  POSTED = "posted",
  POST_EDITED = "post_edited",
  POST_DELETED = "post_deleted",
  CHANNEL_VIEWED = "channel_viewed",
  CHANNEL_CREATED = "channel_created",
  CHANNEL_UPDATED = "channel_updated",
  CHANNEL_DELETED = "channel_deleted",
  CHANNEL_MEMBER_UPDATED = "channel_member_updated",

  // Événements utilisateur
  USER_ADDED = "user_added",
  USER_REMOVED = "user_removed",
  USER_UPDATED = "user_updated",
  USER_ROLE_UPDATED = "user_role_updated",
  STATUS_CHANGE = "status_change",
  TYPING = "typing",

  // Événements d'équipe
  ADDED_TO_TEAM = "added_to_team",
  LEAVE_TEAM = "leave_team",
  UPDATE_TEAM = "update_team",
  DELETE_TEAM = "delete_team",

  // Événements de réaction
  REACTION_ADDED = "reaction_added",
  REACTION_REMOVED = "reaction_removed",

  // Événements de préférence
  PREFERENCES_CHANGED = "preferences_changed",

  // Événement générique (attrape-tout)
  ALL = "*",
}

/**
 * État du WebSocket
 */
export interface WebSocketState {
  /** Indique si le WebSocket est connecté */
  isConnected: boolean;

  /** Indique si le WebSocket est en cours de connexion */
  isConnecting: boolean;

  /** URL du WebSocket */
  url: string | null;

  /** Erreur de connexion éventuelle */
  error: Error | null;

  /** Nombre de tentatives de reconnexion */
  reconnectAttempts: number;

  /** Timestamp de la dernière connexion réussie */
  lastConnectedAt: number | null;
}
