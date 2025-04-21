// src/services/index.ts
/**
 * Point d'entrée unifié pour tous les services de MattermostConnect
 * Exporte les interfaces, implémentations et factories
 */

// Interfaces de base des services
export { BaseService, type ServiceBase } from "./base";

export type {
  AuthService,
  TeamService,
  ChannelService,
  MessageService,
  FileService,
  WebSocketService,
  ReactionService,
  GifService,
  MattermostService,
} from "./base";

// Services spécialisés
export * from "./team";
export * from "./channel";
export * from "./message";
export * from "./user";
export * from "./reaction";
export * from "./file";
export * from "./error";

// Gestion des erreurs
export {
  MattermostError,
  AuthError,
  NetworkError,
  ValidationError,
  PermissionError,
  RateLimitError,
  NotFoundError,
  createErrorHandler,
  type ErrorHandlerInterface,
} from "./error";

// Services d'implémentation
export * from "./direct";
export * from "./proxy";
export * from "./notification";
export * from "./emoji";
export * from "./websocket";
export * from "./auth";
export * from "./http";

// Factory
export * from "./factory";
