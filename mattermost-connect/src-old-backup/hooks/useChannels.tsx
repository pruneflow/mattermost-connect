import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useMemo, useCallback } from "react";
import { api } from "../api/client";
import { Channel, ChannelMember, User, DirectChannelInfo } from "../api/types";
import { formatUserName } from "../utils/formatters";
import { getUser } from "./useUsers";
import { userCache as userCacheService } from "../api/userCache";
import { useActiveSelections } from "./useActiveSelections";
import {
  isDirectChannel,
  isGroupChannel,
  getUserIdsFromGroupChannel,
  getGroupChannelDisplayName,
} from "../utils/channelUtils";

// Cache global pour les canaux par équipe
export const channelsCache: Record<string, Channel[]> = {};

// Date d'actualisation pour chaque équipe - pour déterminer si le cache est frais
export const channelsLastUpdate: Record<string, number> = {};

// Requêtes en cours pour éviter les requêtes dupliquées
export const pendingChannelsRequests: Record<
  string,
  Promise<Channel[]> | undefined
> = {};

// Cache global pour mapping channelId -> teamId
export const channelToTeamMapping: Record<string, string> = {};

// Liste des équipes dont les canaux ont été modifiés pendant qu'on n'y était pas
export const dirtyTeams = new Set<string>();

/**
 * Marque une équipe comme "sale" (nécessitant une actualisation)
 * Utile quand des événements WebSocket indiquent des changements
 * alors qu'on n'est pas sur cette équipe
 */
export function markTeamAsDirty(teamId: string): void {
  if (teamId) {
    dirtyTeams.add(teamId);
  }
}

/**
 * Met à jour le mapping channelId -> teamId pour une liste de channels
 */
export function updateChannelToTeamMapping(
  channels: Channel[],
  teamId: string,
): void {
  channels.forEach((channel) => {
    channelToTeamMapping[channel.id] = teamId;
  });
}

/**
 * Récupère le teamId depuis un channelId
 */
export function getTeamIdFromChannelId(channelId: string): string | undefined {
  return channelToTeamMapping[channelId];
}

/**
 * Récupère les canaux d'une équipe avec déduplication des requêtes
 * Ne fait qu'un seul appel API par équipe, sauf si force=true
 *
 * @param teamId ID de l'équipe
 * @param force Forcer un rafraîchissement même si en cache
 */
export async function getChannels(
  teamId: string,
  force: boolean = false,
): Promise<Channel[]> {
  // Si l'équipe est "sale" (modifiée par événement), forcer le rafraîchissement
  if (dirtyTeams.has(teamId)) {
    force = true;
    dirtyTeams.delete(teamId); // Nettoyer après usage
  }

  // 1. Si les canaux sont déjà en cache et on ne force pas le rafraîchissement, les retourner
  if (!force && channelsCache[teamId]) {
    return channelsCache[teamId];
  }

  // 2. Si une requête est déjà en cours pour cette équipe, la réutiliser
  if (pendingChannelsRequests[teamId]) {
    return pendingChannelsRequests[teamId];
  }

  // 3. Sinon, faire l'appel API et mettre en cache le résultat
  const promise = api
    .get<Channel[]>(`users/me/teams/${teamId}/channels`)
    .then((response) => {
      const channels = response.data;

      // Mettre à jour le cache
      channelsCache[teamId] = channels;
      channelsLastUpdate[teamId] = Date.now();

      // Mettre à jour le mapping channelId -> teamId
      updateChannelToTeamMapping(channels, teamId);

      // Nettoyer la promesse en cours
      delete pendingChannelsRequests[teamId];

      return channels;
    })
    .catch((error) => {
      // Nettoyer la promesse en cours en cas d'erreur
      delete pendingChannelsRequests[teamId];
      throw error;
    });

  // Stocker la promesse pour éviter les appels dupliqués
  pendingChannelsRequests[teamId] = promise;

  return promise;
}

// Query keys
export const channelKeys = {
  all: ["channels"] as const,
  lists: () => [...channelKeys.all, "list"] as const,
  list: (teamId: string) => [...channelKeys.lists(), { teamId }] as const,
  details: () => [...channelKeys.all, "detail"] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  members: (channelId: string) =>
    [...channelKeys.detail(channelId), "members"] as const,
};

// Create channel parameters
export interface CreateChannelParams {
  team_id: string;
  name: string;
  display_name: string;
  type: "O" | "P";
  purpose?: string;
  header?: string;
}

/**
 * Hook for working with channels in a team
 */
export function useChannels(teamId: string | undefined) {
  const queryClient = useQueryClient();
  // Référence au dernier teamId traité pour détecter les changements d'équipe
  const previousTeamIdRef = useRef<string | undefined>(undefined);

  // Auto-selection logic integration
  const {
    activeTeam,
    activeChannel,
    setActiveChannel,
    autoSelectFirstChannel,
  } = useActiveSelections();

  // Skip query if teamId is undefined
  const enabled = !!teamId;

  // Utiliser useEffect au lieu de useMemo pour les effets secondaires
  // et ne logger qu'une seule fois le changement d'équipe
  useEffect(() => {
    // Si l'ID d'équipe a changé
    if (teamId && previousTeamIdRef.current !== teamId) {
      // Journaliser le changement d'équipe (for debugging)
      // La condition unique évite les logs dupliqués de différents composants
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `Team changed from ${previousTeamIdRef.current} to ${teamId}`,
        );
      }

      // Mettre à jour la référence
      previousTeamIdRef.current = teamId;
    }
  }, [teamId]);

  // Fetch channels for team with optimized caching
  const channelsQuery = useQuery({
    queryKey: channelKeys.list(teamId || ""),
    queryFn: async () => {
      if (!teamId) {
        return [];
      }

      // Déterminer si on doit forcer un rechargement (changement d'équipe)
      const forceRefresh = dirtyTeams.has(teamId);

      // Utiliser notre fonction optimisée qui gère la déduplication et le cache
      return getChannels(teamId, forceRefresh);
    },
    enabled,
    // Paramètres de cache optimisés - ne refetch pas automatiquement
    staleTime: Infinity, // Ne jamais considérer les données comme obsolètes
    gcTime: Infinity, // Garder les données en cache indéfiniment (cacheTime est déprécié)
    refetchOnWindowFocus: false, // Pas de refetch au focus
    refetchOnReconnect: false, // Pas de refetch à la reconnexion
  });

  // Auto-select first channel when channels are loaded for the active team
  useEffect(() => {
    const channels = channelsQuery.data || [];

    // Only auto-select if:
    // 1. We have channels
    // 2. This teamId matches the currently active team
    // 3. Query has finished loading (not still loading)
    if (
      channels.length > 0 &&
      teamId &&
      activeTeam?.id === teamId &&
      !channelsQuery.isLoading
    ) {
      autoSelectFirstChannel(channels, teamId);
    }
  }, [
    channelsQuery.data,
    channelsQuery.isLoading,
    teamId,
    activeTeam?.id,
    autoSelectFirstChannel,
  ]);

  // Fetch users for direct/group channels
  const usersQuery = useQuery({
    queryKey: ["users", "directChannels", { teamId }],
    queryFn: async () => {
      // Get all channels
      const channels = channelsQuery.data || [];

      // If no channels or team, return empty array
      if (channels.length === 0) {
        return [];
      }

      // Find direct and group channels
      const directAndGroupChannels = channels.filter(
        (channel) => isDirectChannel(channel) || isGroupChannel(channel),
      );

      // If no direct/group channels, return empty array
      if (directAndGroupChannels.length === 0) {
        return [];
      }

      // Collect unique user IDs from direct and group channels
      const userIds = new Set<string>();

      directAndGroupChannels.forEach((channel) => {
        if (isDirectChannel(channel)) {
          // Extract user ID from channel name
          const parts = channel.name.split("__");
          parts.forEach((id) => userIds.add(id));
        } else if (isGroupChannel(channel)) {
          // Get user IDs from group channel name
          getUserIdsFromGroupChannel(channel).forEach((id) => userIds.add(id));
        }
      });

      // Fetch users
      if (userIds.size === 0) {
        return [];
      }

      const response = await api.post<User[]>("users/ids", Array.from(userIds));
      return response.data;
    },
    // Always enable this query, but it will effectively do nothing when no channels are available
    enabled: true,
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: CreateChannelParams) => {
      const response = await api.post<Channel>("channels", channelData);
      return response.data;
    },
    onSuccess: (newChannel) => {
      // Invalidate channel list for this team
      queryClient.invalidateQueries({
        queryKey: channelKeys.list(newChannel.team_id),
      });
    },
  });

  // Join channel mutation
  const joinChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post<Channel>(
        `channels/${channelId}/members`,
        {
          user_id: "me",
        },
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate channel list for this team
      if (teamId) {
        queryClient.invalidateQueries({ queryKey: channelKeys.list(teamId) });
      }
    },
  });

  // Leave channel mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      await api.delete(`channels/${channelId}/members/me`);
      return channelId;
    },
    onSuccess: (channelId) => {
      // Remove channel from queries
      if (teamId) {
        // Update channel list
        queryClient.setQueryData<Channel[]>(
          channelKeys.list(teamId),
          (old = []) => old.filter((channel) => channel.id !== channelId),
        );
      }
    },
  });

  // Get channels by type - mémoiser pour éviter des recalculs lors des re-renders
  const getChannelsByType = useMemo(() => {
    return (type: "public" | "private" | "direct" | "group") => {
      const channels = channelsQuery.data || [];

      switch (type) {
        case "public":
          return channels.filter((channel) => channel.type === "O");
        case "private":
          return channels.filter((channel) => channel.type === "P");
        case "direct":
          return channels.filter((channel) => isDirectChannel(channel));
        case "group":
          return channels.filter((channel) => isGroupChannel(channel));
        default:
          return [];
      }
    };
  }, [channelsQuery.data, isDirectChannel, isGroupChannel]);

  // Mémoriser les canaux par type pour éviter des recalculs inutiles
  const publicChannels = useMemo(
    () => getChannelsByType("public"),
    [getChannelsByType],
  );
  const privateChannels = useMemo(
    () => getChannelsByType("private"),
    [getChannelsByType],
  );
  const directChannels = useMemo(
    () => getChannelsByType("direct"),
    [getChannelsByType],
  );
  const groupChannels = useMemo(
    () => getChannelsByType("group"),
    [getChannelsByType],
  );

  // Format direct channel info - mémoiser pour éviter des recalculs lors des re-renders
  const getDirectChannelInfo = useCallback(
    (channelId: string): DirectChannelInfo | null => {
      const channels = channelsQuery.data || [];
      const users = usersQuery.data || [];
      const currentUser = queryClient.getQueryData<User>(["users", "me"]);
      const currentUserId = currentUser?.id;

      // Find channel
      const channel = channels.find((c) => c.id === channelId);
      if (!channel) return null;

      // Check if direct channel
      if (isDirectChannel(channel)) {
        // Get user IDs
        const userIds = channel.name.split("__");

        // Find other user
        const otherUserId = userIds.find((id) => id !== currentUserId);
        if (!otherUserId) return null;

        // Essayer d'abord de trouver l'utilisateur dans les données chargées
        const otherUser = users.find((u) => u.id === otherUserId);
        let displayName;

        // 1. Vérifier si l'utilisateur est déjà dans les données React Query
        if (otherUser) {
          displayName = formatUserName(otherUser);
        }
        // 2. Sinon, essayer de récupérer depuis le service userCache
        else {
          const cachedUser = userCacheService.getUser(otherUserId);
          if (cachedUser) {
            displayName = formatUserName(cachedUser);

            // Mettre à jour les données React Query pour cohérence
            const currentUsers =
              queryClient.getQueryData<User[]>([
                "users",
                "directChannels",
                { teamId },
              ]) || [];
            if (!currentUsers.some((u) => u.id === cachedUser.id)) {
              queryClient.setQueryData(
                ["users", "directChannels", { teamId }],
                [...currentUsers, cachedUser],
              );
            }
          }
          // 3. Si pas en cache non plus, faire la requête et afficher un placeholder en attendant
          else {
            // Lancer l'appel API (un seul appel sera fait par utilisateur grâce à notre système)
            getUser(otherUserId)
              .then((user) => {
                // Vérifier que l'utilisateur existe
                if (!user) return;

                // Mettre à jour React Query pour la prochaine fois
                const currentUsers =
                  queryClient.getQueryData<User[]>([
                    "users",
                    "directChannels",
                    { teamId },
                  ]) || [];
                if (!currentUsers.some((u) => u.id === user.id)) {
                  queryClient.setQueryData(
                    ["users", "directChannels", { teamId }],
                    [...currentUsers, user],
                  );
                }

                // Forcer la mise à jour de l'affichage
                queryClient.invalidateQueries({
                  queryKey: channelKeys.list(teamId || ""),
                });
              })
              .catch((err) =>
                console.error(`Error fetching user ${otherUserId}:`, err),
              );

            // Utiliser un placeholder en attendant
            displayName =
              channel.display_name && channel.display_name !== "Direct Channel"
                ? channel.display_name
                : `Loading...`;
          }
        }

        return {
          isDirect: true,
          isGroup: false,
          displayName,
          userIds,
          otherUserId,
        };
      }
      // Check if group channel
      else if (isGroupChannel(channel)) {
        // Get user IDs
        const userIds = getUserIdsFromGroupChannel(channel);

        // Find all users in the group
        const groupUsers = users.filter((u) => userIds.includes(u.id));

        // Create a display name with the list of users
        let displayName = channel.display_name;

        // If no display name or it's the default, use the proper format with user names
        if (
          !displayName ||
          displayName === "Group Message" ||
          displayName === "Group Channel"
        ) {
          displayName = getGroupChannelDisplayName(groupUsers, "Group Message");
        }

        return {
          isDirect: false,
          isGroup: true,
          displayName,
          userIds,
        };
      }

      return null;
    },
    [
      channelsQuery.data,
      usersQuery.data,
      queryClient,
      teamId,
      isDirectChannel,
      isGroupChannel,
      getUserIdsFromGroupChannel,
      getGroupChannelDisplayName,
    ],
  );

  // Get channel display name (handling direct channels specially)
  const getChannelDisplayName = (channel: Channel): string => {
    if (channel.type === "D") {
      const directInfo = getDirectChannelInfo(channel.id);
      if (directInfo) {
        return directInfo.displayName;
      }
    }

    return channel.display_name || channel.name;
  };

  return {
    // Data
    channels: channelsQuery.data || [],
    publicChannels,
    privateChannels,
    directChannels,
    groupChannels,

    // Active selections from global state
    activeChannel,
    setActiveChannel,

    // Loading states
    isLoading: channelsQuery.isLoading || usersQuery.isLoading,
    isError: channelsQuery.isError,
    error: channelsQuery.error,

    // Actions
    refetch: channelsQuery.refetch,
    createChannel: createChannelMutation.mutateAsync,
    joinChannel: joinChannelMutation.mutateAsync,
    leaveChannel: leaveChannelMutation.mutateAsync,

    // Helpers
    getDirectChannelInfo,
    getChannelDisplayName,
  };
}

/**
 * Hook for working with a specific channel
 */
export function useChannel(channelId: string | undefined) {
  const queryClient = useQueryClient();

  // Skip query if channelId is undefined
  const enabled = !!channelId;

  // Fetch channel details
  const channelQuery = useQuery({
    queryKey: channelKeys.detail(channelId || ""),
    queryFn: async () => {
      const response = await api.get<Channel>(`channels/${channelId}`);
      return response.data;
    },
    enabled,
  });

  // Fetch channel members
  const membersQuery = useQuery({
    queryKey: channelKeys.members(channelId || ""),
    queryFn: async () => {
      const response = await api.get<ChannelMember[]>(
        `channels/${channelId}/members`,
      );
      return response.data;
    },
    enabled,
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (updates: Partial<Channel>) => {
      if (!channelId) {
        throw new Error("Channel ID is required to update a channel");
      }

      const response = await api.put<Channel>(`channels/${channelId}`, updates);
      return response.data;
    },
    onSuccess: (updatedChannel) => {
      // Update channel in cache
      queryClient.setQueryData(
        channelKeys.detail(updatedChannel.id),
        updatedChannel,
      );

      // Update channel in list cache if it exists
      queryClient.setQueryData<Channel[]>(
        channelKeys.list(updatedChannel.team_id),
        (oldChannels = []) => {
          return oldChannels.map((channel) =>
            channel.id === updatedChannel.id ? updatedChannel : channel,
          );
        },
      );
    },
  });

  // Note: Channel viewing is now handled by useMessages hook automatically

  return {
    // Data
    channel: channelQuery.data,
    members: membersQuery.data || [],

    // Loading states
    isLoading: channelQuery.isLoading || membersQuery.isLoading,
    isError: channelQuery.isError,
    error: channelQuery.error,

    // Actions
    updateChannel: updateChannelMutation.mutateAsync,
    refetch: channelQuery.refetch,
    refetchMembers: membersQuery.refetch,
  };
}
