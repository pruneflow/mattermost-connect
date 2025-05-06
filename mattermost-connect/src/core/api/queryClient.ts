// src/core/api/queryClient.ts
/**
 * Configuration for React Query client
 * Centralized query client and key definitions
 */
import { QueryClient } from "@tanstack/react-query";
import { useChannelStore } from "../store";

/**
 * Default React Query configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on error by default
      retry: false,
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Refetch automatically on window focus
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (WebSocket will handle updates)
      refetchOnReconnect: false,
      // Don't refetch on mount (we're using it with Zustand)
      refetchOnMount: false,
    },
    mutations: {
      // Don't retry mutations on error
      retry: false,
    },
  },
});

/**
 * Query keys used throughout the application
 * Using these constants ensures consistency in cache management
 */
export const QUERY_KEYS = {
  // Auth-related queries
  auth: {
    current: ["auth", "current"],
    initialize: ["auth", "initialize"],
    session: ["auth", "session"],
  },

  // Team-related queries
  teams: {
    all: ["teams"],
    byId: (id: string) => ["teams", id],
  },

  // Channel-related queries
  channels: {
    byTeam: (teamId: string) => ["channels", "byTeam", teamId],
    byId: (id: string) => ["channels", id],
    unreadCount: (channelId: string) => ["channelUnreadCount", channelId],
    unreadCounts: (teamId: string) => ["channelUnreadCounts", teamId],
    unreadMessages: (channelId: string, since?: number) => [
      "channelUnreadMessages",
      channelId,
      since,
    ],
  },

  // Message-related queries
  messages: {
    byChannel: (channelId: string) => ["messages", "byChannel", channelId],
    thread: (rootId: string) => ["messages", "thread", rootId],
    since: (channelId: string, since: number) => [
      "messages",
      "since",
      channelId,
      since,
    ],
  },

  // User-related queries
  users: {
    all: ["users"],
    byId: (id: string) => ["users", id],
    byIds: (ids: string[]) => ["users", "byIds", ids],
    inChannel: (channelId: string) => ["users", "inChannel", channelId],
    inTeam: (teamId: string) => ["users", "inTeam", teamId],
    statuses: ["users", "statuses"],
    status: (userId: string) => ["users", "status", userId],
  },

  // Unread count queries
  unread: {
    total: ["unread", "total"],
    byTeam: (teamId: string) => ["unread", "byTeam", teamId],
    byChannel: (channelId: string) => ["unread", "byChannel", channelId],
  },
};

/**
 * Utility for invalidating related queries when data changes
 */
export const invalidateQueries = {
  /**
   * Invalidates auth-related queries
   */
  auth: {
    all: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    currentUser: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.current });
    },
  },

  /**
   * Invalidates all team-related queries
   */
  allTeams: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams.all });
  },

  /**
   * Invalidates queries for a specific team and its related data
   */
  team: (teamId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.teams.byId(teamId) });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.channels.byTeam(teamId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.channels.unreadCounts(teamId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.unread.byTeam(teamId),
    });
  },

  /**
   * Invalidates all channel-related queries
   */
  allChannels: () => {
    queryClient.invalidateQueries({ queryKey: ["channels"] });
  },

  /**
   * Invalidates queries for a specific channel and its related data
   */
  channel: (channelId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.channels.byId(channelId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.messages.byChannel(channelId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.users.inChannel(channelId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.channels.unreadCount(channelId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.unread.byChannel(channelId),
    });
  },

  /**
   * Invalidates unread count queries for a channel
   */
  channelUnreadCount: (channelId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.channels.unreadCount(channelId),
    });

    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.unread.byChannel(channelId),
    });

    // Get the channel to find its team
    const { getChannelById } = useChannelStore.getState();
    const channel = getChannelById(channelId);

    if (channel?.team_id) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.channels.unreadCounts(channel.team_id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.unread.byTeam(channel.team_id),
      });
    }

    // Also invalidate total unread counts
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.unread.total,
    });
  },

  /**
   * Invalidates all unread-related queries
   */
  allUnreadCounts: () => {
    queryClient.invalidateQueries({ queryKey: ["channelUnreadCount"] });
    queryClient.invalidateQueries({ queryKey: ["channelUnreadCounts"] });
    queryClient.invalidateQueries({ queryKey: ["unread"] });
  },

  /**
   * Invalidates all message-related queries
   */
  allMessages: () => {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  },

  /**
   * Invalidates queries for messages in a specific channel
   */
  channelMessages: (channelId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.messages.byChannel(channelId),
    });

    // Also invalidate unread counts for this channel
    invalidateQueries.channelUnreadCount(channelId);
  },

  /**
   * Invalidates queries for a specific thread
   */
  thread: (rootId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.messages.thread(rootId),
    });
  },

  /**
   * Invalidates all user-related queries
   */
  allUsers: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },

  /**
   * Invalidates queries for a specific user and their related data
   */
  user: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.byId(userId) });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.users.status(userId),
    });
  },

  /**
   * Invalidates all user status queries
   */
  userStatuses: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.statuses });
  },
};

/**
 * Type-safe function to register custom invalidation functions
 * @param entityType Entity type
 * @param invalidationFn Invalidation function
 */
export function registerInvalidation(
  entityType: string,
  invalidationFn: (id?: string) => void,
): void {
  (invalidateQueries as any)[entityType] = invalidationFn;
}

/**
 * Reset query cache completely
 * Useful for logout or testing
 */
export function resetQueryCache(): void {
  queryClient.clear();
}

/**
 * Sets default query data from another query
 * @param sourceKey Source query key
 * @param targetKey Target query key
 */
export function setQueryDataFromQuery<T>(
  sourceKey: unknown[],
  targetKey: unknown[],
): void {
  const data = queryClient.getQueryData<T>(sourceKey);
  if (data) {
    queryClient.setQueryData<T>(targetKey, data);
  }
}

/**
 * Gets query data with type safety
 * @param queryKey Query key
 * @returns Query data or undefined
 */
export function getQueryData<T>(queryKey: unknown[]): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

/**
 * Sets query data with type safety
 * @param queryKey Query key
 * @param data Query data
 */
export function setQueryData<T>(queryKey: unknown[], data: T): void {
  queryClient.setQueryData<T>(queryKey, data);
}

/**
 * Prefetches a query
 * @param queryKey Query key
 * @param queryFn Query function
 */
export function prefetchQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
): void {
  queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
