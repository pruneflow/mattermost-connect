// src/core/api/apiUtils.ts
/**
 * API utility functions for building URLs and handling parameters
 */
import { PaginationParams } from "../../types";

/**
 * Builds a URL with query parameters
 * @param endpoint Base endpoint
 * @param params Query parameters to append
 * @returns URL with query parameters
 */
export function buildUrlWithParams(
  endpoint: string,
  params?: Record<string, any>,
): string {
  if (!params) {
    return endpoint;
  }

  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  if (!queryString) {
    return endpoint;
  }

  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${queryString}`;
}

/**
 * Builds pagination parameters for API requests
 * @param params Base parameters
 * @param pagination Pagination parameters
 * @returns Combined parameters
 */
export function buildPaginationParams<T>(
  params: T,
  pagination: PaginationParams,
): T & PaginationParams {
  return {
    ...params,
    page: pagination.page,
    perPage: pagination.perPage,
    ...(pagination.after ? { after: pagination.after } : {}),
    ...(pagination.before ? { before: pagination.before } : {}),
    ...(pagination.since ? { since: pagination.since } : {}),
  } as T & PaginationParams;
}

/**
 * Extracts pagination information from API response headers
 * @param headers Response headers
 * @param dataLength Length of the returned data array
 * @param defaultPageSize Default page size
 * @returns Pagination information
 */
export function extractPaginationInfo(
  headers: Record<string, string>,
  dataLength: number,
  defaultPageSize: number = 30,
): {
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
} {
  const nextCursor = headers["x-next-cursor"];
  const totalCountStr = headers["x-total-count"];
  const totalCount = totalCountStr ? parseInt(totalCountStr, 10) : undefined;

  // Determine if there are more pages
  const hasMore = dataLength > 0 && dataLength === defaultPageSize;

  return {
    hasMore,
    nextCursor,
    totalCount: isNaN(totalCount as number) ? undefined : totalCount,
  };
}
