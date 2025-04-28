// src/hooks/useEntityQuery.tsx
/**
 * Generic entity query hook
 * Leverages React Query's built-in functionality for entity management
 */
import { useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "../core/api/client";
import {
  createQueryOptions,
  createMutationOptions,
  invalidateRelated,
} from "../core/api/queryUtils";
import { buildUrlWithParams } from "../core/api/apiUtils";
import { PaginationParams, ApiError, Entity } from "../types";

/**
 * Options for entity query
 */
export interface EntityQueryOptions<T> {
  entityType: "user" | "team" | "channel" | "message" | "unread";
  endpoint: string;
  idField?: keyof T;
  initialParams?: PaginationParams & Record<string, any>;
  queryOptions?: Partial<UseQueryOptions<T[], ApiError>>;
  enabled?: boolean;
  select?: (data: T[]) => T[];
}

/**
 * Generic hook for querying and managing entities
 * Using React Query's native capabilities
 */
export function useEntityQuery<T extends Entity>(
  options: EntityQueryOptions<T>,
) {
  const {
    entityType,
    endpoint,
    idField = "id" as keyof T,
    initialParams,
    queryOptions,
    enabled = true,
    select,
  } = options;

  const queryClient = useQueryClient();
  const queryKey = initialParams ? [entityType, initialParams] : [entityType];

  // Primary query to fetch the list of entities
  const query = useQuery<T[], ApiError>({
    queryKey,
    queryFn: async () => {
      const url = buildUrlWithParams(endpoint, initialParams);
      const response = await apiClient.get<T[]>(url);
      return response.data;
    },
    ...createQueryOptions(entityType, {
      enabled,
      select,
      ...queryOptions,
    }),
  });

  // Mutation for creating entities
  const createMutation = useMutation<T, ApiError, Partial<T>>({
    mutationFn: async (data) => {
      const response = await apiClient.post<T>(endpoint, data);
      return response.data; // Return just the data property
    },
    onSuccess: () => {
      invalidateRelated(queryClient, entityType);
    },
    ...createMutationOptions(),
  });

  // Mutation for updating entities
  const updateMutation = useMutation<
    T,
    ApiError,
    { id: string; data: Partial<T> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<T>(`${endpoint}/${id}`, data);
      return response.data; // Return just the data property
    },
    onSuccess: (_, { id }) => {
      invalidateRelated(queryClient, entityType, id);
    },
    ...createMutationOptions(),
  });

  // Mutation for deleting entities
  const deleteMutation = useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response.data; // Return just the data property
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [entityType, id] });
      invalidateRelated(queryClient, entityType);
    },
    ...createMutationOptions(),
  });

  // Helper to get a single entity by ID
  const getById = useCallback(
    (id: string): T | undefined => {
      if (!id || !query.data) return undefined;

      return query.data.find((item: T) => String(item[idField]) === id);
    },
    [query.data, idField],
  );

  // Function to fetch a single entity by ID
  const fetchById = useCallback(
    async (id: string): Promise<T | null> => {
      // Check cache first
      const cached = getById(id);
      if (cached) return cached;

      try {
        const response = await apiClient.get<T>(`${endpoint}/${id}`);

        // Update the cache
        queryClient.setQueryData<T>([entityType, id], response.data);

        return response.data;
      } catch (error) {
        console.error(`Error fetching ${entityType} by ID:`, error);
        return null;
      }
    },
    [entityType, endpoint, queryClient, getById],
  );

  // Prepare data for return
  const byId = useMemo(() => {
    const result: Record<string, T> = {};
    if (query.data) {
      query.data.forEach((item: T) => {
        const id = String(item[idField]);
        result[id] = item;
      });
    }
    return result;
  }, [query.data, idField]);

  const ids = useMemo(() => {
    return Object.keys(byId);
  }, [byId]);

  // CRUD action wrappers
  const create = useCallback(
    (data: Partial<T>) => createMutation.mutateAsync(data),
    [createMutation],
  );

  const update = useCallback(
    (id: string, data: Partial<T>) => updateMutation.mutateAsync({ id, data }),
    [updateMutation],
  );

  const remove = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  return {
    // State
    data: query.data || [],
    byId,
    ids,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,

    // Actions
    refetch: query.refetch,
    fetchById,
    getById,
    create,
    update,
    remove,

    // Raw mutations for more control
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
