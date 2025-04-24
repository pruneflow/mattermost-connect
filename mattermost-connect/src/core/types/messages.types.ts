// src/core/types/messages.types.ts
/**
 * Types liés aux messages
 */

import { NormalizedState, PaginationOptions } from "./common.types";

/**
 * Représente un fichier attaché à un message
 */
export interface MessageAttachment {
  /** Identifiant unique du fichier */
  id: string;

  /** Nom du fichier */
  name: string;

  /** Type MIME du fichier */
  type?: string;

  /** Taille du fichier en octets */
  size?: number;

  /** URL d'accès au fichier */
  url?: string;

  /** Lien vers l'aperçu du fichier */
  link?: string;
}

/**
 * Représente une réaction à un message
 */
export interface MessageReaction {
  /** Nom de l'emoji */
  emoji_name: string;

  /** ID de l'utilisateur qui a réagi */
  user_id: string;

  /** ID du message */
  post_id: string;

  /** Timestamp de création de la réaction */
  create_at: number;
}

/**
 * Métadonnées additionnelles d'un message
 */
export interface MessageMetadata {
  /** Fichiers attachés au message */
  files?: MessageAttachment[];

  /** Emojis personnalisés utilisés dans le message */
  emojis?: string[];

  /** Réactions au message */
  reactions?: MessageReaction[];
}

/**
 * Représente un message Mattermost
 */
export interface Message {
  /** Identifiant unique du message */
  id: string;

  /** ID de l'utilisateur qui a créé le message */
  user_id: string;

  /** ID du canal où le message a été posté */
  channel_id: string;

  /** Contenu du message */
  message: string;

  /** Timestamp de création */
  create_at: number;

  /** Timestamp de dernière mise à jour */
  update_at: number;

  /** Timestamp de suppression (0 si non supprimé) */
  delete_at?: number;

  /** Métadonnées du message */
  metadata?: MessageMetadata;

  /** Indique si le message est épinglé */
  is_pinned?: boolean;

  /** Indique si le message a des réactions */
  has_reactions?: boolean;

  /** Nombre de réponses dans le thread */
  reply_count?: number;

  /** ID du message parent si c'est une réponse */
  root_id?: string;

  /** IDs des fichiers attachés */
  file_ids?: string[];

  /** Propriétés additionnelles du message */
  props?: Record<string, unknown>;
}

/**
 * État normalisé des messages
 */
export interface NormalizedMessagesState extends NormalizedState<Message> {
  /** Messages par canal (ID canal -> liste d'IDs de messages) */
  byChannel: Record<string, string[]>;

  /** Messages par thread (ID message parent -> liste d'IDs de réponses) */
  byThread: Record<string, string[]>;
}

/**
 * État des messages dans le store
 */
export interface MessagesState {
  /** Messages par canal */
  messagesByChannel: Record<string, Message[]>;

  /** Messages de thread par message parent */
  threadMessages: Record<string, Message[]>;

  /** État de chargement par canal */
  loadingStates: Record<string, boolean>;

  /** État de chargement par thread */
  threadLoadingStates: Record<string, boolean>;

  /** Erreurs par canal */
  errors: Record<string, Error | null>;

  /** Message à mettre en évidence */
  highlightedMessageId: string | null;

  /** Message en cours de réponse */
  replyToMessage: Message | null;

  /** Message en cours d'édition */
  editingMessageId: string | null;

  /** Derniers timestamps de chargement par canal */
  lastFetchTimes: Record<string, number>;
}

/**
 * Options pour le chargement des messages
 */
export interface MessageOptions extends PaginationOptions {
  /** Force un rechargement, ignore le cache */
  forceRefresh?: boolean;
}

/**
 * Interface de retour pour le hook useMessages
 */
export interface UseMessagesReturnType {
  // État
  messagesByChannel: Record<string, Message[]>;
  threadMessages: Record<string, Message[]>;
  loadingStates: Record<string, boolean>;
  threadLoadingStates: Record<string, boolean>;
  highlightedMessageId: string | null;
  replyToMessage: Message | null;
  editingMessageId: string | null;

  // Actions pour les messages
  loadMessages: (
    channelId: string,
    options?: MessageOptions,
  ) => Promise<Message[]>;
  loadThreadReplies: (rootMessageId: string) => Promise<Message[]>;
  sendMessage: (
    channelId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;
  replyToMessage: (
    channelId: string,
    rootMessageId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;
  editMessage: (
    messageId: string,
    newMessage: string,
  ) => Promise<Message | null>;
  deleteMessage: (messageId: string, channelId: string) => Promise<boolean>;

  // Actions pour les réactions
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (
    messageId: string,
    emoji: string,
    channelId: string,
  ) => Promise<boolean>;

  // Actions pour l'UI
  setHighlightedMessage: (messageId: string | null) => void;
  setReplyTo: (message: Message | null) => void;
  startEditingMessage: (messageId: string) => void;
  cancelEditingMessage: () => void;
}
