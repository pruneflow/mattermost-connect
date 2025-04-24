// src/core/types/api.types.ts
/**
 * Types liés à l'API et aux requêtes HTTP
 */

/**
 * Méthodes HTTP supportées
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Modes de fonctionnement de l'API
 */
export type ApiMode = "direct" | "proxy" | "custom";

/**
 * Options pour les requêtes HTTP
 */
export interface RequestOptions {
  /** Méthode HTTP */
  method?: HttpMethod;

  /** Corps de la requête */
  body?: any;

  /** En-têtes HTTP personnalisés */
  headers?: Record<string, string>;

  /** Indique si l'authentification est requise */
  requireAuth?: boolean;

  /** Timeout en ms */
  timeout?: number;
}

/**
 * Configuration du client API
 */
export interface ApiClientConfig {
  // Mode direct
  /** URL du serveur Mattermost (mode direct) */
  serverUrl?: string;

  /** Token d'authentification (mode direct) */
  token?: string;

  // Mode proxy
  /** URL du proxy MattermostConnect */
  proxyUrl?: string;

  /** ID client pour le proxy */
  clientId?: string;

  /** ID utilisateur pour le proxy */
  userId?: string;

  // Général
  /** Mode de fonctionnement */
  mode?: ApiMode;

  /** Fonction fournissant le token d'authentification */
  tokenProvider?: () => string | null | undefined;

  /** Callback d'erreur */
  onError?: (error: any) => void;

  /** En-têtes par défaut pour toutes les requêtes */
  defaultHeaders?: Record<string, string>;
}

/**
 * Réponse formatée du client API
 */
export interface ApiResponse<T = any> {
  /** Données de la réponse */
  data: T;

  /** Code de statut HTTP */
  status: number;

  /** Message de statut HTTP */
  statusText: string;

  /** En-têtes de la réponse */
  headers: Record<string, string>;
}

/**
 * Erreur API standardisée
 */
export interface ApiError extends Error {
  /** Code de statut HTTP */
  status?: number;

  /** Données d'erreur retournées par l'API */
  data?: any;

  /** Requête ayant causé l'erreur */
  request?: {
    url: string;
    method: HttpMethod;
  };
}

/**
 * Configuration pour l'upload de fichiers
 */
export interface FileUploadConfig {
  /** Formulaire contenant le fichier */
  formData: FormData;

  /** Endpoint API (par défaut: "files") */
  path?: string;

  /** Callback de progression */
  onProgress?: (percent: number) => void;
}

/**
 * Résultat d'un upload de fichier
 */
export interface FileUploadResult {
  /** IDs des fichiers uploadés */
  file_ids: string[];

  /** Informations sur les fichiers */
  files: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
}
