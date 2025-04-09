// src/types/service.types.ts
import { Channel, Message, Team, User, UserStatus, GifData } from "./index";

/**
 * Options pour la récupération des messages
 */
export interface GetMessagesOptions {
  page?: number;
  perPage?: number;
  since?: number;
  before?: string;
  after?: string;
}

/**
 * Options pour la récupération des utilisateurs
 */
export interface GetUsersOptions {
  ids?: string[];
  inChannel?: string;
  inTeam?: string;
  page?: number;
  perPage?: number;
}

/**
 * Réponse de l'API pour les messages
 */
export interface MessagesResponse {
  posts: Record<string, Message>;
  order: string[];
  next_post_id?: string;
  prev_post_id?: string;
}

/**
 * Configuration pour le service Mattermost
 */
export interface ServiceConfig {
  // Mode direct
  serverUrl?: string;
  token?: string;

  // Mode proxy
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Mode personnalisé
  serviceProvider?: CustomServiceProvider;

  // Options communes
  enableWebsocket?: boolean;
  refreshInterval?: number;
}

/**
 * Fournisseur de service personnalisé (pour les tests, démonstrations, etc.)
 */
export interface CustomServiceProvider {
  setupService: () => MattermostService;
  isConnected?: boolean;
  skipConnectionTest?: boolean;
  currentUser?: User;
  enableWebsocket?: boolean;
}

/**
 * Interface principale du service Mattermost
 * Regroupe toutes les fonctionnalités dans une interface unique
 */
export interface MattermostService {
  // Propriété indiquant le mode de fonctionnement
  readonly mode: "direct" | "proxy" | "custom";

  // ----- Méthodes de base (utilisateurs, équipes, canaux) -----
  getCurrentUser(): Promise<User>;
  getTeams(): Promise<Team[]>;
  getTeam(teamId: string): Promise<Team>;
  getChannels(teamId: string): Promise<Channel[]>;
  getChannel(channelId: string): Promise<Channel>;

  // ----- Méthodes pour les messages -----
  getChannelMessages(
    channelId: string,
    options?: GetMessagesOptions,
  ): Promise<MessagesResponse>;
  postMessage(channelId: string, message: string): Promise<Message>;

  // ----- Méthodes pour les utilisateurs -----
  /**
   * Méthode d'authentification pour obtenir un token
   * @param username Nom d'utilisateur ou email
   * @param password Mot de passe
   * @returns Token d'authentification
   */
  authenticate?(
    username: string,
    password: string,
  ): Promise<{ token: string; serverUrl?: string }>;
  /**
   * Valide un token existant
   * @param token Token à valider
   * @returns Booléen indiquant la validité du token
   */
  validateToken?(token: string): Promise<boolean>;
  getUsers(options?: GetUsersOptions): Promise<User[]>;
  getUserStatus(userId: string): Promise<UserStatus>;

  // ----- Méthodes pour les emojis et réactions -----
  getFrequentEmojis(): Promise<string[]>;
  addReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any>;
  removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any>;
  hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean>;

  // ----- Méthodes pour les GIFs -----
  searchGifs(query: string, category?: string): Promise<GifData[]>;
  getGifs(category: string, limit?: number): Promise<GifData[]>;

  // ----- Méthodes pour WebSocket -----
  getWebsocketUrl(): string;
  getWebsocketToken(): Promise<string>;

  // ----- Méthodes pour les fichiers -----
  uploadFiles(formData: FormData): Promise<any>;

  // ----- Méthodes utilitaires -----
  getBaseUrl(): string;
}
