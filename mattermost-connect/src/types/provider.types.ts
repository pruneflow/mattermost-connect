// src/types/provider.types.ts
import { MattermostService, User } from "./index";

/**
 * Types for MattermostProvider configuration
 */

export interface DirectModeConfig {
  serverUrl: string;
  token: string;
}

export interface ProxyModeConfig {
  proxyUrl: string;
  clientId: string;
  userId?: string;
}

export interface CustomModeConfig {
  setupService: () => MattermostService;
  isConnected?: boolean;
  skipConnectionTest?: boolean;
  currentUser?: User;
  enableWebsocket?: boolean;
}

export interface ProviderOptions {
  enableWebsocket?: boolean;
  refreshInterval?: number;
}

export interface ProviderConfig extends ProviderOptions {
  // Direct mode props
  serverUrl?: string;
  token?: string;

  // Proxy mode props
  proxyUrl?: string;
  clientId?: string;
  userId?: string;

  // Custom mode props
  serviceProvider?: CustomModeConfig;
}
