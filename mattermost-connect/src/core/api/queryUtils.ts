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
import { ErrorSource } from "../../types";
import { handleError } from "../store/errorStore";

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
 * Uses the standardized error handling from Group 2
 */
export const defaultErrorHandler = (error: unknown) => {
  handleError(error as Error, ErrorSource.API);

  // Also log in development for debugging
  if (process.env.NODE_ENV !== "production") {
    console.error("Query error:", error);
  }
};

/**
 * Creates query options with standard settings for the entity type
 * @param entityType Type of entity to determine caching strategy
 * @param options Additional query options to merge
 * @returns Standardized query options
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
    onError: (error: Error) => {
      // Use standardized error handling from Group 2
      handleError(error as Error, ErrorSource.API, undefined, {
        entityType,
        queryKey: options?.queryKey,
      });

      // Also call custom error handler if provided
      if (options?.onError) {
        options.onError(error);
      }
    },
  };
}

/**
 * Creates mutation options with standard error handling
 * @param options Additional mutation options to merge
 * @returns Standardized mutation options
 */
export function createMutationOptions<TData, TError, TVariables, TContext>(
  options?: Partial<UseMutationOptions<TData, TError, TVariables, TContext>>,
): Partial<UseMutationOptions<TData, TError, TVariables, TContext>> {
  return {
    retry: false,
    ...options,
    onError: (error, variables, context) => {
      // Use standardized error handling from Group 2
      handleError(error as Error, ErrorSource.API, undefined, {
        mutationVariables: variables,
        context,
      });

      // Also call custom error handler if provided
      if (options?.onError) {
        options.onError(error, variables, context);
      }
    },
  };
}

/**
 * Relation mapping for invalidation
 * Defines relations between entity types for intelligent cache invalidation
 */
export const RELATED_ENTITIES = {
  teams: ["channels"],
  channels: ["messages", "unread"],
  messages: ["channels", "reactions"],
  users: ["teams", "channels"],
};

/**
 * Invalidates related queries using React Query's built-in invalidation
 * @param queryClient React Query client
 * @param entityType Type of entity that was modified
 * @param entityId Optional ID of the specific entity
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

/**
 * Creates a function for invalidating specific entity queries
 * @param queryClient React Query client
 * @param entityType Type of entity
 * @returns Function to invalidate entity queries
 */
export function createInvalidator(
  queryClient: QueryClient,
  entityType: string,
) {
  return {
    /**
     * Invalidates all queries for this entity type
     */
    all: () => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
    },

    /**
     * Invalidates a specific entity by ID
     * @param id Entity ID
     */
    byId: (id: string) => {
      queryClient.invalidateQueries({ queryKey: [entityType, id] });
    },

    /**
     * Invalidates a list of entities by ID
     * @param ids Array of entity IDs
     */
    byIds: (ids: string[]) => {
      ids.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: [entityType, id] });
      });
    },

    /**
     * Invalidates related entities
     * @param id Optional entity ID
     */
    related: (id?: string) => {
      invalidateRelated(queryClient, entityType, id);
    },
  };
}

/**
 * Determines if a query should be fetched based on its age and data presence
 * @param lastFetchTime Timestamp of last fetch
 * @param hasData Whether data exists already
 * @param maxAge Maximum age in milliseconds
 * @returns Whether to fetch data
 */
export function shouldFetch(
  lastFetchTime: number | undefined,
  hasData: boolean,
  maxAge: number = 5 * 60 * 1000, // 5 minutes by default
): boolean {
  // Always fetch if no data
  if (!hasData) return true;

  // Don't fetch if recently fetched
  if (lastFetchTime && Date.now() - lastFetchTime < maxAge) {
    return false;
  }

  return true;
}

/**
 * Extracts error details from React Query errors
 * @param error Error object
 * @returns Structured error details
 */
export function extractErrorDetails(error: unknown): Record<string, any> {
  if (!error) return {};

  try {
    if (typeof error === "object") {
      const anyError = error as any;
      return {
        message: anyError.message,
        status: anyError.status,
        data: anyError.data,
        request: anyError.request,
      };
    }
    return { error: String(error) };
  } catch (e) {
    return { error: "Unknown error" };
  }
}
