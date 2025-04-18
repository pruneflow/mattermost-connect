// src/services/factory.ts
import {
  MattermostService,
  ServiceConfig,
  CustomServiceProvider,
} from "../types";
import { createDirectService } from "./direct";
import { createProxyService } from "./proxy";
import { createFileService, FileServiceInterface } from "./file";
import { createUserService, UserServiceInterface } from "./user";
import { createEmojiService, EmojiServiceInterface } from "./emoji";
import { NotificationService } from "./notification";

/**
 * Interface pour le conteneur de services
 * Centralise l'accès à tous les services spécialisés
 */
export interface ServiceContainer {
  /** Service principal Mattermost */
  mattermostService: MattermostService;

  /** Service de gestion des fichiers */
  fileService: FileServiceInterface;

  /** Service de gestion des utilisateurs */
  userService: UserServiceInterface;

  /** Service de gestion des emoji et GIFs */
  emojiService: EmojiServiceInterface;

  /** Service de gestion des notifications */
  notificationService: NotificationService;
}

/**
 * Creates a custom service based on the service provider
 * @param provider Configuration pour le service personnalisé
 * @returns Service Mattermost
 */
function createCustomService(
  provider: CustomServiceProvider,
): MattermostService {
  // The provider must implement the setupService method
  const service = provider.setupService();

  // If a current user is provided, set it in the service
  // if the service implements the necessary interface
  if (provider.currentUser && "setCurrentUser" in service) {
    (service as any).setCurrentUser(provider.currentUser);
  }

  return service;
}

/**
 * Crée le service Mattermost principal en fonction de la configuration
 * @param config Configuration du service
 * @returns Service Mattermost
 */
function createMainService(config: ServiceConfig): MattermostService {
  // Determine mode based on configuration
  if (config.serviceProvider) {
    return createCustomService(config.serviceProvider);
  } else if (config.serverUrl && config.token) {
    return createDirectService({
      serverUrl: config.serverUrl,
      token: config.token,
    });
  } else if (config.proxyUrl && config.clientId) {
    return createProxyService({
      proxyUrl: config.proxyUrl,
      clientId: config.clientId,
      userId: config.userId,
    });
  } else if (config.serverUrl) {
    // Add this condition to allow creation with just the URL
    return createDirectService({
      serverUrl: config.serverUrl,
    });
  } else {
    throw new Error(
      "Invalid configuration. You must provide (serverUrl and token) OR " +
        "(proxyUrl and clientId) OR serviceProvider.",
    );
  }
}

/**
 * Crée tous les services nécessaires et les assemble dans un conteneur
 * @param config Configuration des services
 * @returns Conteneur de services
 */
export function createServiceContainer(
  config: ServiceConfig,
): ServiceContainer {
  // Créer le service principal
  const mattermostService = createMainService(config);

  // Créer les services spécialisés
  const fileService = createFileService(mattermostService);
  const userService = createUserService(mattermostService);
  const emojiService = createEmojiService(mattermostService);
  const notificationService = new NotificationService(mattermostService);

  // Assembler tous les services dans un conteneur
  return {
    mattermostService,
    fileService,
    userService,
    emojiService,
    notificationService,
  };
}

/**
 * Fonction d'aide pour vérifier si un service est initialisé
 * Utile pour les vérifications de type avant d'utiliser un service
 * @param service Service à vérifier
 * @param serviceName Nom du service pour les messages d'erreur
 */
export function assertServiceInitialized<T>(
  service: T | null | undefined,
  serviceName: string,
): asserts service is T {
  if (!service) {
    throw new Error(`Le service ${serviceName} n'est pas initialisé`);
  }
}
