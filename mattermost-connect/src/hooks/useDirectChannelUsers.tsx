// src/hooks/useDirectChannelUsers.tsx
/**
 * Hook for loading users related to direct and group channels
 */
import { useMemo } from "react";
import { Channel } from "../core/store/channelStore";
import { useAuthStore } from "../core/store/authStore";
import { useUserStore } from "../core/store/userStore";
import { useUsersQuery } from "../core/api/queries/userQueries";
import {
  isDirectChannel,
  isGroupChannel,
  getUserIdsFromDirectChannel,
  getOtherUserIdFromDirectChannel,
  getUserIdsFromGroupChannel,
} from "../utils/directChannelUtils";

/**
 * Hook that ensures all users needed for direct and group channels are loaded
 * @param channels List of channels to process
 * @returns Loading state and user IDs information
 */
export function useDirectChannelUsers(channels: Channel[] = []) {
  // Get current user
  const { currentUser } = useAuthStore();
  const currentUserId = currentUser?.id || "";

  // Get user store
  const { getUserById } = useUserStore();

  // Extract all user IDs from direct and group channels that need to be loaded
  const userIdsToLoad = useMemo(() => {
    const ids: string[] = [];

    channels.forEach((channel) => {
      // Process direct channels
      if (isDirectChannel(channel)) {
        const otherUserId = getOtherUserIdFromDirectChannel(
          channel.name,
          currentUserId,
        );
        if (otherUserId) {
          // Only add if we don't already have the user
          const existingUser = getUserById(otherUserId);
          if (!existingUser && !ids.includes(otherUserId)) {
            ids.push(otherUserId);
          }
        }
      }
      // Process group channels
      else if (isGroupChannel(channel)) {
        const memberIds = getUserIdsFromGroupChannel(channel);

        // Only add users we don't already have
        memberIds.forEach((memberId) => {
          if (memberId !== currentUserId) {
            const existingUser = getUserById(memberId);
            if (!existingUser && !ids.includes(memberId)) {
              ids.push(memberId);
            }
          }
        });
      }
    });

    return ids;
  }, [channels, currentUserId, getUserById]);

  // Log the IDs we need to load for debugging
  if (userIdsToLoad.length > 0) {
    console.log("Direct channel users to load:", userIdsToLoad);
  }

  // Use the users query to load the users
  const {
    isLoading: isLoadingUsers,
    data: loadedUsers,
    error,
  } = useUsersQuery({
    userIds: userIdsToLoad.length > 0 ? userIdsToLoad : undefined,
  });

  // Calculate how many users were successfully loaded
  const loadedCount = loadedUsers?.length || 0;
  const stillMissingCount = userIdsToLoad.length - loadedCount;

  return {
    isLoadingUsers,
    userIdsToLoad,
    userIdsCount: userIdsToLoad.length,
    loadedUsers,
    loadedCount,
    stillMissingCount,
    error,
  };
}
