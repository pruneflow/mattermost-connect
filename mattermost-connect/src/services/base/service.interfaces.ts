// src/services/base/service.interfaces.ts
import {
  Channel,
  Team,
  User,
  Message,
  UserStatus,
  GetMessagesOptions,
  GetUsersOptions,
  MessagesResponse,
} from "../../types";

/**
 * Interface pour le service d'authentification
 */
export interface AuthService {
  /**
   * Authentifie un utilisateur et obtient un token
   * @param username Nom d'utilisateur ou email
   * @param password Mot de passe
   * @returns Token d'authentification
   */
  authenticate?: (
    username: string,
    password: string,
  ) => Promise<{ token: string; serverUrl?: string }>;

  /**
   * Valide un token existant
   * @param token Token à valider
   * @returns Booléen indiquant la validité du token
   */
  validateToken?: (token: string) => Promise<boolean>;
}

/**
 * Interface pour le service des équipes
 */
export interface TeamService {
  /**
   * Récupère toutes les équipes accessibles par l'utilisateur
   */
  getTeams(): Promise<Team[]>;

  /**
   * Récupère une équipe spécifique par son ID
   * @param teamId ID de l'équipe
   */
  getTeam(teamId: string): Promise<Team>;

  /**
   * Récupère l'état des messages non lus pour une équipe
   * @param teamId ID de l'équipe
   */
  getTeamUnreadCount?(
    teamId: string,
  ): Promise<{ msg_count: number; mention_count: number }>;
}

/**
 * Interface pour le service des canaux
 */
export interface ChannelService {
  /**
   * Récupère tous les canaux d'une équipe
   * @param teamId ID de l'équipe
   */
  getChannels(teamId: string): Promise<Channel[]>;

  /**
   * Récupère un canal spécifique par son ID
   * @param channelId ID du canal
   */
  getChannel(channelId: string): Promise<Channel>;

  /**
   * Marque un canal comme vu, réinitialise les compteurs non lus
   * @param channelId ID du canal
   */
  viewChannel?(channelId: string): Promise<{ status: "OK" }>;

  /**
   * Récupère l'état des messages non lus pour un canal
   * @param channelId ID du canal
   */
  getChannelUnreadCount?(
    channelId: string,
  ): Promise<{ msg_count: number; mention_count: number }>;
}

/**
 * Interface pour le service des messages
 */
export interface MessageService {
  /**
   * Récupère les messages d'un canal
   * @param channelId ID du canal
   * @param options Options de pagination et filtrage
   */
  getChannelMessages(
    channelId: string,
    options?: GetMessagesOptions,
  ): Promise<MessagesResponse>;

  /**
   * Envoie un message dans un canal
   * @param channelId ID du canal
   * @param message Contenu du message
   * @param fileIds IDs des fichiers joints (optionnel)
   */
  postMessage(
    channelId: string,
    message: string,
    fileIds?: string[],
  ): Promise<Message>;

  /**
   * Récupère un message spécifique
   * @param messageId ID du message
   */
  getPost?(messageId: string): Promise<Message>;

  /**
   * Modifie un message existant
   * @param messageId ID du message
   * @param newMessage Nouveau contenu
   */
  editMessage?(messageId: string, newMessage: string): Promise<Message>;

  /**
   * Supprime un message
   * @param messageId ID du message
   */
  deleteMessage?(messageId: string): Promise<{ success: boolean }>;

  /**
   * Répond à un message
   * @param channelId ID du canal
   * @param messageId ID du message original
   * @param responseMessage Contenu de la réponse
   * @param fileIds IDs des fichiers joints (optionnel)
   */
  replyToMessage?(
    channelId: string,
    messageId: string,
    responseMessage: string,
    fileIds?: string[],
  ): Promise<Message>;
}

/**
 * Interface pour le service des utilisateurs
 */
export interface UserService {
  /**
   * Récupère l'utilisateur courant
   */
  getCurrentUser(): Promise<User>;

  /**
   * Récupère des utilisateurs selon différents critères
   * @param options Options de filtrage
   */
  getUsers(options?: GetUsersOptions): Promise<User[]>;

  /**
   * Récupère le statut d'un utilisateur
   * @param userId ID de l'utilisateur
   */
  getUserStatus(userId: string): Promise<UserStatus>;
}

/**
 * Interface pour le service des fichiers
 */
export interface FileService {
  /**
   * Télécharge des fichiers sur le serveur
   * @param formData FormData contenant les fichiers
   */
  uploadFiles(formData: FormData): Promise<{
    file_infos: Array<{
      id: string;
      name: string;
      type?: string;
      size?: number;
      url?: string;
    }>;
  }>;
}

/**
 * Interface pour le service WebSocket
 */
export interface WebSocketService {
  /**
   * Récupère l'URL du WebSocket
   */
  getWebsocketUrl(): string;

  /**
   * Récupère le token pour la connexion WebSocket
   */
  getWebsocketToken(): Promise<string>;
}

/**
 * Interface pour le service des réactions et émojis
 */
export interface ReactionService {
  /**
   * Récupère les emojis fréquemment utilisés
   */
  getFrequentEmojis(): Promise<string[]>;

  /**
   * Ajoute une réaction à un message
   * @param messageId ID du message
   * @param emoji Emoji à ajouter
   */
  addReaction(messageId: string, emoji: string): Promise<any>;

  /**
   * Supprime une réaction d'un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à supprimer
   */
  removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any>;

  /**
   * Vérifie si l'utilisateur a réagi avec un emoji
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à vérifier
   */
  hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean>;
}

/**
 * Interface pour le service des GIFs
 */
export interface GifService {
  /**
   * Recherche des GIFs
   * @param query Terme de recherche
   * @param category Catégorie (optionnel)
   */
  searchGifs(query: string, category?: string): Promise<any[]>;

  /**
   * Récupère des GIFs par catégorie
   * @param category Catégorie de GIFs
   * @param limit Nombre maximum de résultats
   */
  getGifs(category: string, limit?: number): Promise<any[]>;
}

/**
 * Interface unifiée du service Mattermost principal
 * Combine toutes les interfaces de services spécifiques
 */
export interface MattermostService
  extends AuthService,
    TeamService,
    ChannelService,
    MessageService,
    UserService,
    FileService,
    WebSocketService,
    ReactionService,
    GifService {
  /**
   * Mode de fonctionnement du service
   */
  readonly mode: "direct" | "proxy" | "custom";

  /**
   * Récupère l'URL de base du serveur Mattermost
   * @returns URL de base du serveur
   */
  getBaseUrl(): string;
}
