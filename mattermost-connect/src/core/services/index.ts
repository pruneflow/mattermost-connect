// src/core/services/index.ts
import { ApiClient } from "../api/client";
import { AuthService } from "./auth.service";
import { CacheService } from "./cache.service";
import { WebSocketService } from "./ws.service";
import { AppStore } from "../store/store.config";

interface ServiceContainer {
  apiClient: ApiClient;
  authService: AuthService;
  cacheService: CacheService;
  webSocketService: WebSocketService;
  store: AppStore;
}

// Variable globale pour stocker les services
let services: ServiceContainer | null = null;

/**
 * Initialise les services
 */
export function initializeServices(container: ServiceContainer): void {
  services = container;
}

/**
 * Récupère les services
 */
export function getServices(): ServiceContainer {
  if (!services) {
    throw new Error("Services not initialized. Call initializeServices first.");
  }
  return services;
}

/**
 * Nettoie les services
 */
export function clearServices(): void {
  if (services) {
    // Nettoyer les ressources
    if (services.webSocketService) {
      services.webSocketService.disconnect();
    }

    services = null;
  }
}
