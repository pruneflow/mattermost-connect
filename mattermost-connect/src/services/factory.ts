// src/services/factory.ts
import {
  MattermostService,
  ServiceConfig,
  CustomServiceProvider,
} from "./base";
import { createDirectService } from "./direct";
import { createProxyService } from "./proxy";
import { HttpClient } from "./http";
import {
  createErrorHandler,
  ErrorHandlerInterface,
} from "./error/error-handler";
import { TeamServiceInterface, createTeamService } from "./team/team.service";
import {
  ChannelServiceInterface,
  createChannelService,
} from "./channel/channel.service";
import {
  MessageServiceInterface,
  createMessageService,
} from "./message/message.service";
import { UserServiceInterface, createUserService } from "./user";
import {
  ReactionServiceInterface,
  createReactionService,
} from "./reaction/reaction.service";
import { FileServiceInterface, createFileService } from "./file/file.service";
import { NotificationService } from "./notification";

/**
 * Interface pour le conteneur de services
 * Centralise l'accès à tous les services spécialisés
 */
export interface ServiceContainer {
  /** Service principal Mattermost */
  mattermostService: MattermostService;

  /** Service de gestion des équipes */
  teamService: TeamServiceInterface;

  /** Service de gestion des canaux */
  channelService: ChannelServiceInterface;

  /** Service de gestion des messages */
  messageService: MessageServiceInterface;

  /** Service de gestion des utilisateurs */
  userService: UserServiceInterface;

  /** Service de gestion des réactions */
  reactionService: ReactionServiceInterface;

  /** Service de gestion des fichiers */
  fileService: FileServiceInterface;

  /** Service de gestion des notifications */
  notificationService: NotificationService;

  /** Gestionnaire d'erreurs */
  errorHandler: ErrorHandlerInterface;
}

/**
 * Crée un service personnalisé basé sur le fournisseur de service
 * @param provider Configuration pour le service personnalisé
 * @returns Service Mattermost
 */
function createCustomService(
  provider: CustomServiceProvider,
): MattermostService {
  // Le fournisseur doit implémenter la méthode setupService
  const service = provider.setupService();

  // Si un utilisateur courant est fourni, le définir dans le service
  // si le service implémente l'interface nécessaire
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
  // Déterminer le mode en fonction de la configuration
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
    console.debug("CreateDirectService");
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
  console.debug("createServiceContainer");

  // Create the main service
  const mattermostService = createMainService(config);
  console.debug("MattermostService", mattermostService);
  const errorHandler = createErrorHandler();

  // Extract HTTP client from the main service
  let httpClient: HttpClient;
  if ("httpClient" in mattermostService) {
    httpClient = (mattermostService as any).httpClient;
  } else {
    console.warn(
      "HttpClient not found in mattermostService, using legacy approach",
    );
    httpClient = mattermostService as unknown as HttpClient;
  }

  // Check if the main service already contains the specialized services
  let teamService: TeamServiceInterface;
  let channelService: ChannelServiceInterface;
  let messageService: MessageServiceInterface;
  let userService: UserServiceInterface;
  let reactionService: ReactionServiceInterface;
  let fileService: FileServiceInterface;
  let notificationService: NotificationService;

  // Try to extract existing services from the main service first
  if ("teamService" in mattermostService) {
    teamService = (mattermostService as any).teamService;
  } else {
    // Only create if not already available
    teamService = createTeamService(httpClient, errorHandler);
  }

  if ("channelService" in mattermostService) {
    channelService = (mattermostService as any).channelService;
  } else {
    channelService = createChannelService(httpClient, errorHandler);
  }

  if ("messageService" in mattermostService) {
    messageService = (mattermostService as any).messageService;
  } else {
    messageService = createMessageService(httpClient, errorHandler);
  }

  if ("userService" in mattermostService) {
    userService = (mattermostService as any).userService;
  } else {
    userService = createUserService(mattermostService);
  }

  if ("reactionService" in mattermostService) {
    reactionService = (mattermostService as any).reactionService;
  } else {
    reactionService = createReactionService(httpClient, errorHandler);
  }

  if ("fileService" in mattermostService) {
    fileService = (mattermostService as any).fileService;
  } else {
    // Create the file service with necessary context
    const baseUrl = mattermostService.getBaseUrl();
    const mode = mattermostService.mode;
    const tokenProvider = () => {
      if ("token" in mattermostService) {
        return (mattermostService as any).token;
      }
      return null;
    };

    fileService = createFileService(
      httpClient,
      errorHandler,
      baseUrl,
      mode,
      tokenProvider,
    );
  }

  if ("notificationService" in mattermostService) {
    notificationService = (mattermostService as any).notificationService;
  } else {
    notificationService = new NotificationService(mattermostService);
  }

  // Extract current user ID if available
  const currentUserId =
    "currentUser" in mattermostService && (mattermostService as any).currentUser
      ? (mattermostService as any).currentUser.id
      : null;

  // Set current user ID on services that need it
  if (currentUserId) {
    if ("setCurrentUserId" in teamService) {
      (teamService as any).setCurrentUserId(currentUserId);
    }
    if ("setCurrentUserId" in channelService) {
      (channelService as any).setCurrentUserId(currentUserId);
    }
    if ("setCurrentUserId" in reactionService) {
      (reactionService as any).setCurrentUserId(currentUserId);
    }
    notificationService.setCurrentUserId(currentUserId);
  }

  // Return the service container
  return {
    mattermostService,
    teamService,
    channelService,
    messageService,
    userService,
    reactionService,
    fileService,
    notificationService,
    errorHandler,
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
