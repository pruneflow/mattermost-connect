// src/services/index.ts
/**
 * Point d'entrée unifié pour tous les services de MattermostConnect
 * Exporte les interfaces, implémentations et factories
 */

// Base exports - service interfaces
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

// Direct service
export * from "./direct";

// Emoji service
export * from "./emoji";

// File service
export * from "./file";

// Notification service
export * from "./notification";

// Proxy service
export * from "./proxy";

// User service - the canonical source for UserServiceInterface
export {
  UserService,
  createUserService,
  type UserServiceInterface,
} from "./user";

// WebSocket service
export * from "./websocket";

// Export the factory
export * from "./factory";
