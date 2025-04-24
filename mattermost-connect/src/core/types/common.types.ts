// src/core/types/common.types.ts
/**
 * Types communs utilisés à travers l'application
 */

/**
 * Représente un état de chargement pour toute ressource
 */
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  lastFetchTime?: number;
}

/**
 * État de pagination pour les requêtes
 */
export interface PaginationState {
  page: number;
  perPage: number;
  hasMore: boolean;
  total?: number;
}

/**
 * Options pour les requêtes paginées
 */
export interface PaginationOptions {
  page?: number;
  perPage?: number;
  before?: string;
  after?: string;
  since?: number;
}

/**
 * Options pour les requêtes avec cache
 */
export interface CacheOptions {
  /** Force un rafraîchissement même si la donnée est en cache */
  forceRefresh?: boolean;
  /** Durée de vie en millisecondes pour cette entrée de cache spécifique */
  ttl?: number;
}

/**
 * État générique avec entités normalisées par ID
 */
export interface NormalizedState<T> {
  byId: Record<string, T>;
  allIds: string[];
}

/**
 * Type utilitaire pour l'état initial des slices
 */
export type InitialState<T> = {
  [K in keyof T]: T[K];
};

/**
 * Résultat d'une opération asynchrone
 */
export interface AsyncResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}
