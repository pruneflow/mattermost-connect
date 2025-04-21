// src/hooks/useTeam.ts (Updated)
import { useState, useEffect, useCallback, useMemo } from "react";
import { Team, Channel } from "../types";
import { useTeamContext, useChannelContext } from "../context";

/**
 * Options for the useTeam hook
 */
interface UseTeamOptions {
  /** Include channels for the team (default: true) */
  includeChannels?: boolean;

  /** Preload users involved in direct messages (default: true) */
  preloadDirectMessageUsers?: boolean;

  /** Preload unread states for all channels (default: true) */
  preloadUnreadStates?: boolean;

  /** Refresh interval in ms (default: 0 - disabled) */
  refreshInterval?: number;

  /** Callback called when team change is completed */
  onTeamChange?: (team: Team) => void;
}

/**
 * Return state for the useTeam hook
 */
interface UseTeamState {
  /** The active team */
  team: Team | null;

  /** Team loading state */
  loading: boolean;

  /** Error when loading team */
  error: Error | null;

  /** List of team channels */
  channels: Channel[];

  /** Channels loading state */
  loadingChannels: boolean;

  /** Error when loading channels */
  channelsError: Error | null;

  /** Total unread message count in the team */
  unreadMessagesCount: number;

  /** Total unread mentions count in the team */
  unreadMentionsCount: number;
}

/**
 * Custom hook for interacting with a Mattermost team
 * This version is backward compatible but leverages the new context architecture
 *
 * @param teamId ID of the team to use
 * @param options Configuration options
 * @returns State and functions to interact with the team
 */
export function useTeam(teamId: string | null, options: UseTeamOptions = {}) {
  // Options with default values
  const {
    includeChannels = true,
    preloadDirectMessageUsers = true,
    preloadUnreadStates = true,
    refreshInterval = 0,
    onTeamChange,
  } = options;

  // Use the specialized team and channel contexts
  const teamContext = useTeamContext();
  const channelContext = useChannelContext();

  // States for backward compatibility
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [channelsError, setChannelsError] = useState<Error | null>(null);

  // Function to load team information
  const loadTeam = useCallback(async () => {
    if (!teamId) return;

    setLoading(true);
    setError(null);

    try {
      // Check if team already exists in context
      const existingTeam = teamContext.getTeamById(teamId);

      if (existingTeam) {
        setTeam(existingTeam);
        teamContext.setActiveTeam(existingTeam);

        if (onTeamChange) {
          onTeamChange(existingTeam);
        }

        return existingTeam;
      }

      // Otherwise, switch to the team which will load it
      const loadedTeam = await teamContext.switchTeam(teamId);

      if (loadedTeam) {
        setTeam(loadedTeam);

        if (onTeamChange) {
          onTeamChange(loadedTeam);
        }

        return loadedTeam;
      } else {
        throw new Error(`Failed to load team ${teamId}`);
      }
    } catch (err) {
      console.error(`Error loading team ${teamId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [teamId, teamContext, onTeamChange]);

  // Function to load channels for a team
  const loadChannels = useCallback(async () => {
    if (!teamId || !includeChannels) return;

    setLoadingChannels(true);
    setChannelsError(null);

    try {
      // Load channels using the team context
      const channelsList = await teamContext.loadChannels(teamId, true);
      setChannels(channelsList);

      // Initialize unread states if requested
      if (preloadUnreadStates) {
        await teamContext.initializeTeamUnreadStates(teamId);
      }

      return channelsList;
    } catch (err) {
      console.error(`Error loading channels for team ${teamId}:`, err);
      setChannelsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingChannels(false);
    }
  }, [teamId, includeChannels, teamContext, preloadUnreadStates]);

  // Function to get channels by type
  const getChannelsByType = useCallback(
    (type: "public" | "private" | "direct" | "group" | "favorite") => {
      if (!teamId) return [];
      return teamContext.getChannelsByType(teamId, type);
    },
    [teamId, teamContext],
  );

  // Function to get a channel by ID
  const getChannelById = useCallback(
    (channelId: string): Channel | undefined => {
      return teamContext.getChannelById(channelId, teamId || undefined);
    },
    [teamContext, teamId],
  );

  // Function to get a channel by name
  const getChannelByName = useCallback(
    (channelName: string): Channel | undefined => {
      if (!teamId) return undefined;
      return teamContext.getChannelByName(channelName, teamId);
    },
    [teamContext, teamId],
  );

  // Load team when teamId changes
  useEffect(() => {
    if (teamId) {
      void loadTeam();
    } else {
      setTeam(null);
      setError(null);
    }
  }, [teamId, loadTeam]);

  // Load channels when team changes or includeChannels changes
  useEffect(() => {
    if (teamId && includeChannels) {
      void loadChannels();
    } else if (!includeChannels) {
      setChannels([]);
      setChannelsError(null);
    }
  }, [teamId, includeChannels, loadChannels]);

  // Periodic channel refresh if requested
  useEffect(() => {
    if (
      !refreshInterval ||
      refreshInterval <= 0 ||
      !teamId ||
      !includeChannels
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadChannels();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [teamId, includeChannels, refreshInterval, loadChannels]);

  // Compute unread stats from team context
  const unreadStats = useMemo(() => {
    if (!teamId) return { unreadMessagesCount: 0, unreadMentionsCount: 0 };

    const stats = teamContext.getTeamUnreadCount(teamId);
    return {
      unreadMessagesCount: stats.messageCount,
      unreadMentionsCount: stats.mentionCount,
    };
  }, [teamContext, teamId]);

  // Calculate channel stats by type
  const stats = useMemo(() => {
    return {
      publicChannelsCount: channels.filter((c) => c.type === "O").length,
      privateChannelsCount: channels.filter((c) => c.type === "P").length,
      directMessagesCount: channels.filter((c) => c.type === "D").length,
      groupMessagesCount: channels.filter((c) => c.type === "G").length,
      favoriteChannelsCount: channels.filter((c) => c.is_favorite).length,
    };
  }, [channels]);

  // Combined state to return
  const state: UseTeamState = {
    team,
    loading,
    error,
    channels,
    loadingChannels,
    channelsError,
    unreadMessagesCount: unreadStats.unreadMessagesCount,
    unreadMentionsCount: unreadStats.unreadMentionsCount,
  };

  // Return the state, functions, and statistics
  return {
    ...state,
    ...stats,
    loadTeam,
    loadChannels,
    getChannelsByType,
    getChannelById,
    getChannelByName,
  };
}

export default useTeam;
