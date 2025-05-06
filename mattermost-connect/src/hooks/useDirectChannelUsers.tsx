// src/hooks/useDirectChannelUsers.tsx
/**
 * Direct channel users hook
 * Provides access to users in direct and group messages
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useChannelStore } from "../core/store/channelStore";
import { useDirectChannelStore } from "../core/store/directChannelStore";
import { useUserStore } from "../core/store/userStore";
import { useUsersQuery } from "../core/api/queries/userQueries";
import { channelService } from "../core/services/channelService";
import { userService } from "../core/services/userService";
import { Channel, User, UserWithStatus } from "../types";
import { useAuthStore } from "../core/store/authStore";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for users in a direct or group channel
 * @param channelId Channel ID
 * @returns Users in the channel
 */
export function useDirectChannelUsers(channelId: string | undefined) {
  const { currentUser } = useAuthStore();

  // Get stores
  const { getChannelById } = useChannelStore();
  const { getDirectChannelInfo, refreshDirectChannelInfo } =
    useDirectChannelStore();
  const { getUserById, getUserStatus, getUserDisplayName } = useUserStore();

  // Get channel
  const channel = useMemo(() => {
    if (!channelId) return null;
    return getChannelById(channelId);
  }, [channelId, getChannelById]);

  // Get direct channel info
  const directInfo = useMemo(() => {
    if (!channelId) return null;
    return getDirectChannelInfo(channelId);
  }, [channelId, getDirectChannelInfo]);

  // Determine if this is a direct or group channel
  const isDirect = useMemo(() => {
    return channel ? channelService.isDirectChannel(channel) : false;
  }, [channel]);

  const isGroup = useMemo(() => {
    return channel ? channelService.isGroupChannel(channel) : false;
  }, [channel]);

  // Extract user IDs from channel - MODIFICATION ICI
  const userIds = useMemo(() => {
    console.log("Extracting userIds for channel:", channel?.name);

    if (!channel) return [];

    // Pour les canaux directs, extrayons toujours directement du nom
    if (isDirect) {
      const extractedIds = channelService.getUserIdsFromDirectChannel(
        channel.name,
      );
      console.log("Extracted IDs from direct channel name:", extractedIds);
      return extractedIds;
    }

    // Pour les canaux de groupe, même logique
    if (isGroup) {
      const extractedIds = channelService.getUserIdsFromGroupChannel(channel);
      console.log("Extracted IDs from group channel:", extractedIds);
      return extractedIds;
    }

    // Finalement, essayons directInfo si disponible
    if (directInfo && directInfo.userIds && directInfo.userIds.length > 0) {
      console.log("Using userIds from directInfo:", directInfo.userIds);
      return directInfo.userIds;
    }

    console.log("No user IDs found for channel:", channel.id);
    return [];
  }, [channel, directInfo, isDirect, isGroup]);

  // Filter out current user
  const otherUserIds = useMemo(() => {
    if (!currentUser) return userIds;
    return userIds.filter((id) => id !== currentUser.id);
  }, [userIds, currentUser]);

  // Fetch users
  const usersQuery = useUsersQuery({
    userIds: otherUserIds,
    withStatuses: true,
  });

  // Force le chargement des utilisateurs une fois que nous avons leurs IDs
  useEffect(() => {
    if (otherUserIds.length > 0) {
      // Forcer le chargement des utilisateurs correspondant aux IDs
      console.log("Forcing user load for IDs:", otherUserIds);

      // Utilisez usersQuery.refetch() pour recharger spécifiquement ces utilisateurs
      refreshUsers();
    }
  }, [otherUserIds]);

  // Other user in direct channel
  const otherUser = useMemo(() => {
    if (!isDirect || otherUserIds.length === 0) return null;

    const userId = otherUserIds[0];
    return getUserById(userId);
  }, [isDirect, otherUserIds, getUserById]);

  // All other users in group channel
  const groupUsers = useMemo(() => {
    if (!isGroup) return [];

    return otherUserIds
      .map((id) => getUserById(id))
      .filter((user): user is User => !!user);
  }, [isGroup, otherUserIds, getUserById]);

  // Users with status information
  const usersWithStatus = useMemo(() => {
    return otherUserIds
      .map((userId) => {
        const user = getUserById(userId);
        if (!user) return null;

        const status = getUserStatus(userId);
        const displayName = getUserDisplayName(userId);

        return {
          user,
          status,
          displayName,
        } as UserWithStatus;
      })
      .filter((userStatus): userStatus is UserWithStatus => !!userStatus);
  }, [otherUserIds, getUserById, getUserStatus, getUserDisplayName]);

  /**
   * Refreshes user information
   */
  const refreshUsers = useCallback(() => {
    return usersQuery.refetch();
  }, [usersQuery]);

  /**
   * Refreshes direct channel info
   */
  const refreshInfo = useCallback(() => {
    if (channelId && currentUser) {
      refreshDirectChannelInfo(channelId, currentUser.id);
    }
  }, [channelId, currentUser, refreshDirectChannelInfo]);

  /**
   * Formats a user's display name
   * @param userId User ID
   */
  const formatDisplayName = useCallback(
    (userId: string): string => {
      const user = getUserById(userId);
      if (!user) return "Unknown User";

      return userService.formatUserName(user);
    },
    [getUserById],
  );

  return {
    // Data
    userIds,
    otherUserIds,
    isDirect,
    isGroup,
    otherUser,
    groupUsers,
    usersWithStatus,

    // State
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,

    // Actions
    refreshUsers,
    refreshInfo,

    // Helpers
    formatDisplayName,
  };
}
