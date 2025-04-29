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
  // If we received a full page of results (dataLength equals pageSize),
  // or if the API explicitly tells us there are more results
  const hasMore = dataLength > 0 && dataLength === defaultPageSize;

  return {
    hasMore,
    nextCursor,
    totalCount: isNaN(totalCount as number) ? undefined : totalCount,
  };
}

/**
 * Normalizes entity array to a map keyed by ID
 * @param entities Array of entities with an ID field
 * @param idField Field to use as key (default: 'id')
 * @returns Map of entities keyed by ID
 */
export function normalizeEntities<T extends Record<string, any>>(
  entities: T[],
  idField: string = "id",
): Record<string, T> {
  const normalized: Record<string, T> = {};

  entities.forEach((entity) => {
    const id = entity[idField];
    if (id) {
      normalized[id] = entity;
    }
  });

  return normalized;
}

/**
 * Formats JSON body for API request, handling special cases
 * @param body Request body
 * @returns Formatted body ready for API request
 */
export function formatRequestBody(body: any): any {
  if (!body) {
    return undefined;
  }

  // For FormData, return as-is
  if (body instanceof FormData) {
    return body;
  }

  // Convert Date objects to ISO strings
  if (typeof body === "object") {
    return JSON.parse(JSON.stringify(body));
  }

  return body;
}

/**
 * Creates a URL for fetching a user's profile picture
 * @param userId User ID
 * @param lastPictureUpdate Last picture update timestamp
 * @param size Desired size in pixels
 * @returns Profile picture URL
 */
export function getUserProfilePictureUrl(
  userId: string,
  lastPictureUpdate?: number,
  size: number = 128,
): string {
  const timestamp = lastPictureUpdate || Date.now();
  return `/api/v4/users/${userId}/image?_=${timestamp}&size=${size}`;
}

/**
 * Creates a URL for downloading a file
 * @param fileId File ID
 * @returns File download URL
 */
export function getFileDownloadUrl(fileId: string): string {
  return `/api/v4/files/${fileId}`;
}

/**
 * Creates a URL for previewing a file
 * @param fileId File ID
 * @returns File preview URL
 */
export function getFilePreviewUrl(fileId: string): string {
  return `/api/v4/files/${fileId}/preview`;
}

/**
 * Creates a URL for a team
 * @param teamName Team name
 * @returns Team URL
 */
export function getTeamUrl(teamName: string): string {
  return `/teams/${teamName}`;
}

/**
 * Creates a URL for a channel within a team
 * @param teamName Team name
 * @param channelName Channel name
 * @returns Channel URL
 */
export function getChannelUrl(teamName: string, channelName: string): string {
  return `/teams/${teamName}/channels/${channelName}`;
}
