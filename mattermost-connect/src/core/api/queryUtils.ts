// src/core/api/queryUtils.ts
/**
 * Query utilities for React Query
 * Provides standardized configurations using React Query's built-in capabilities
 */
import {
  QueryClient,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from "@tanstack/react-query";
import { normalize, schema } from "normalizr";

/**
 * Standard query configuration by entity type
 */
export const QUERY_CONFIG = {
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  team: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  channel: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  message: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  unread: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  },
  auth: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
};

/**
 * Default error handler for query failures
 */
export const defaultErrorHandler = (error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.error("Query error:", error);
  }
};

/**
 * Creates query options with standard settings for the entity type
 */
export function createQueryOptions<TData, TError, TQueryKey extends QueryKey>(
  entityType: keyof typeof QUERY_CONFIG,
  options?: Partial<UseQueryOptions<TData, TError, TData, TQueryKey>>,
): Partial<UseQueryOptions<TData, TError, TData, TQueryKey>> {
  return {
    staleTime: QUERY_CONFIG[entityType].staleTime,
    gcTime: QUERY_CONFIG[entityType].gcTime,
    retry: false,
    refetchOnWindowFocus: entityType === "unread" || entityType === "message",
    refetchOnMount: false,
    refetchOnReconnect: entityType === "unread" || entityType === "message",
    ...options,
  };
}

/**
 * Creates mutation options with standard error handling
 */
export function createMutationOptions<TData, TError, TVariables, TContext>(
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>>,
): Partial<UseMutationOptions<TData, TError, TVariables, TContext>> {
  return {
    retry: false,
    onError: options?.onError || defaultErrorHandler,
    ...options,
  };
}

/**
 * Core entity schemas for normalizr
 */
export const entitySchemas = {
  user: new schema.Entity("users"),
  team: new schema.Entity("teams"),
  channel: new schema.Entity("channels"),
  message: new schema.Entity("messages"),
};

/**
 * Normalizes data using normalizr
 */
export function normalizeData(
  data: any,
  schemaKey: keyof typeof entitySchemas,
) {
  return normalize(
    data,
    Array.isArray(data) ? [entitySchemas[schemaKey]] : entitySchemas[schemaKey],
  );
}

/**
 * Relation mapping for invalidation
 */
export const RELATED_ENTITIES = {
  teams: ["channels"],
  channels: ["messages", "unread"],
  messages: ["channels", "reactions"],
  users: ["teams", "channels"],
};

/**
 * Invalidates related queries using React Query's built-in invalidation
 */
export function invalidateRelated(
  queryClient: QueryClient,
  entityType: string,
  entityId?: string,
) {
  // Invalidate the specific entity
  if (entityId) {
    queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
  } else {
    queryClient.invalidateQueries({ queryKey: [entityType] });
  }

  // Invalidate related entities
  const relatedTypes =
    RELATED_ENTITIES[entityType as keyof typeof RELATED_ENTITIES] || [];
  relatedTypes.forEach((type) => {
    queryClient.invalidateQueries({ queryKey: [type] });
  });
}
