// src/core/api/hooks.ts
/**
 * Reusable React Query hooks
 * Thin wrappers around React Query's built-in hooks
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from "@tanstack/react-query";
import { apiClient } from "./client";
import {
  createQueryOptions,
  createMutationOptions,
  invalidateRelated,
} from "./queryUtils";
import { PaginationParams, ApiError } from "../../types";

/**
 * Hook for fetching a list of entities
 */
export function useList<TData, TParams = {}>(
  entityType: string,
  endpoint: string,
  params?: TParams & PaginationParams,
  options?: Partial<UseQueryOptions<TData[], ApiError>>,
) {
  const queryKey = params ? [entityType, params] : [entityType];

  return useQuery<TData[], ApiError>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<TData[]>(endpoint, { params });
      return response.data;
    },
    ...createQueryOptions(entityType as any, options),
  });
}

/**
 * Hook for fetching a single entity by ID
 */
export function useItem<TData>(
  entityType: string,
  endpoint: string,
  id?: string,
  options?: Partial<UseQueryOptions<TData, ApiError>>,
) {
  const enabled = !!id;
  const queryKey = [entityType, id];

  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await apiClient.get<TData>(`${endpoint}/${id}`);
      return response.data;
    },
    enabled,
    ...createQueryOptions(entityType as any, options),
  });
}

/**
 * Hook for creating a new entity
 */
export function useCreate<TData, TVariables>(
  entityType: string,
  endpoint: string,
  options?: Partial<UseMutationOptions<TData, ApiError, TVariables>>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (data) => {
      const response = await apiClient.post<TData>(endpoint, data);
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate the list query
      invalidateRelated(queryClient, entityType);

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...createMutationOptions(options),
  });
}

/**
 * Hook for updating an entity
 */
export function useUpdate<TData, TVariables>(
  entityType: string,
  endpoint: string,
  options?: Partial<
    UseMutationOptions<TData, ApiError, { id: string; data: TVariables }>
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, { id: string; data: TVariables }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<TData>(`${endpoint}/${id}`, data);
      return response.data;
    },
    onSuccess: (data: any, { id }, context) => {
      // Invalidate both the list and the specific item
      invalidateRelated(queryClient, entityType, id);

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, { id, data: {} as TVariables }, context);
      }
    },
    ...createMutationOptions(options),
  });
}

/**
 * Hook for deleting an entity
 */
export function useDelete<TData = void>(
  entityType: string,
  endpoint: string,
  options?: Partial<UseMutationOptions<TData, ApiError, string>>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, string>({
    mutationFn: async (id) => {
      const response = await apiClient.delete<TData>(`${endpoint}/${id}`);
      return response.data;
    },
    onSuccess: (data, id, context) => {
      // Invalidate the list query and remove the item query
      invalidateRelated(queryClient, entityType);
      queryClient.removeQueries({ queryKey: [entityType, id] });

      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, id, context);
      }
    },
    ...createMutationOptions(options),
  });
}

/**
 * Hook for paginated queries with React Query's built-in functionality
 */
export function usePagination<TData, TParams = {}>(
  entityType: string,
  endpoint: string,
  params?: TParams & PaginationParams,
  options?: Partial<
    UseQueryOptions<
      {
        data: TData[];
        pagination: {
          hasMore: boolean;
          nextCursor?: string;
          totalCount?: number;
        };
      },
      ApiError
    >
  >,
) {
  const queryKey = params
    ? [entityType, "paginated", params]
    : [entityType, "paginated"];

  return useQuery<
    {
      data: TData[];
      pagination: {
        hasMore: boolean;
        nextCursor?: string;
        totalCount?: number;
      };
    },
    ApiError
  >({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get(endpoint, { params });

      // Extract pagination data from headers
      const nextCursor = response.headers["x-next-cursor"];
      const totalCount = parseInt(response.headers["x-total-count"] || "0", 10);

      // Determine if there are more pages
      const hasMore =
        response.data.length === (params?.perPage || 30) &&
        response.data.length > 0;

      return {
        data: response.data,
        pagination: {
          hasMore,
          nextCursor,
          totalCount: isNaN(totalCount) ? undefined : totalCount,
        },
      };
    },
    ...createQueryOptions(entityType as any, options),
  });
}
