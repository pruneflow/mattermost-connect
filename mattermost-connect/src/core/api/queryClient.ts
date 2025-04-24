// src/core/api/queryClient.ts
/**
 * Configuration for React Query client
 */
import { QueryClient } from "@tanstack/react-query";

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
  },

  // Message-related queries
  messages: {
    byChannel: (channelId: string) => ["messages", "byChannel", channelId],
    thread: (rootId: string) => ["messages", "thread", rootId],
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
};

/**
 * Utility for invalidating related queries when data changes
 */
export const invalidateQueries = {
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
