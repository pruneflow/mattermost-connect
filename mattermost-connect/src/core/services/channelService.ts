// src/core/services/channelService.ts
/**
 * Channel service
 * Provides business logic for channel operations and formatting
 */
import {
  Channel,
  User,
  UserStatus,
  DirectChannelInfo,
  ChannelType,
  ChannelGroupType,
  ErrorSource,
  EventType,
} from "../../types";
import { emitEvent } from "../api/eventUtils";
import { handleError } from "../store";

/**
 * Channel service class
 * Centralizes channel business logic and formatting
 */
class ChannelService {
  /**
   * Checks if a channel is a direct message channel
   * @param channel Channel to check
   * @returns Whether the channel is a direct message
   */
  public isDirectChannel(channel: Channel): boolean {
    return channel.type === "D";
  }

  /**
   * Checks if a channel is a group message channel
   * @param channel Channel to check
   * @returns Whether the channel is a group message
   */
  public isGroupChannel(channel: Channel): boolean {
    return channel.type === "G";
  }

  /**
   * Checks if a channel is a direct or group message channel
   * @param channel Channel to check
   * @returns Whether the channel is a direct or group message
   */
  public isDirectOrGroupChannel(channel: Channel): boolean {
    return this.isDirectChannel(channel) || this.isGroupChannel(channel);
  }

  /**
   * Checks if a channel is a public channel
   * @param channel Channel to check
   * @returns Whether the channel is public
   */
  public isPublicChannel(channel: Channel): boolean {
    return channel.type === "O";
  }

  /**
   * Checks if a channel is a private channel
   * @param channel Channel to check
   * @returns Whether the channel is private
   */
  public isPrivateChannel(channel: Channel): boolean {
    return channel.type === "P";
  }

  /**
   * Extracts user IDs from a direct channel name
   * Direct channel names are formatted as "user1_id__user2_id" with IDs sorted alphabetically
   * @param channelName The channel name (not display_name)
   * @returns Array of user IDs
   */
  public getUserIdsFromDirectChannel(channelName: string): string[] {
    try {
      // Ensure we have a valid direct channel name format
      if (!channelName) {
        console.warn(
          "Empty channel name passed to getUserIdsFromDirectChannel",
        );
        return [];
      }

      // Handle edge case where channelName is not a string
      if (typeof channelName !== "string") {
        console.error("Invalid channel name type:", typeof channelName);
        return [];
      }

      // Split by double underscore and filter out empty segments
      const userIds = channelName
        .split("__")
        .filter((id) => id && id.length > 0);

      // Validate extracted IDs
      if (userIds.length < 2) {
        console.warn(`Unexpected direct channel name format: ${channelName}`);
      }

      return userIds;
    } catch (error) {
      console.error("Error extracting user IDs from direct channel:", error);
      // Return empty array instead of failing completely
      return [];
    }
  }

  /**
   * Gets the other user ID from a direct channel (not current user)
   * @param channelName The channel name (not display_name)
   * @param currentUserId Current user ID
   * @returns The other user ID or null if not found
   */
  public getOtherUserIdFromDirectChannel(
    channelName: string,
    currentUserId: string,
  ): string | null {
    try {
      if (!channelName || !currentUserId) {
        return null;
      }

      const userIds = this.getUserIdsFromDirectChannel(channelName);

      // No user IDs extracted
      if (userIds.length === 0) {
        return null;
      }

      // Find the ID that's not the current user
      const otherUserId = userIds.find((id) => id !== currentUserId);
      return otherUserId || null;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getOtherUserIdFromDirectChannel",
        channelName,
        currentUserId,
      });
      return null;
    }
  }

  /**
   * Extracts user IDs from a group channel name or members list
   * @param channel Group channel
   * @param members Optional list of channel members
   * @returns Array of user IDs
   */
  public getUserIdsFromGroupChannel(
    channel: Channel,
    members?: { user_id: string }[],
  ): string[] {
    try {
      // If members are provided, use them as the primary source
      if (members && members.length > 0) {
        return members.map((member) => member.user_id);
      }

      // Fall back to parsing channel name if it follows the expected format
      if (channel.name && channel.name.startsWith("G__")) {
        const parts = channel.name.split("__");
        // Remove the 'G' prefix and return the rest of the parts
        const userIds = parts.slice(1).filter((part) => part.length > 0);

        // Validate the extracted IDs
        if (userIds.length === 0) {
          console.warn(
            `No user IDs found in group channel name: ${channel.name}`,
          );
        }

        return userIds;
      }

      // Check if channel has a custom_data field with userIds
      if (
        "props" in channel &&
        channel.props &&
        typeof (channel as any).props === "object" &&
        Array.isArray((channel as any).props.userIds)
      ) {
        return (channel as any).props.userIds;
      }

      // If we can't determine the members, return an empty array
      console.warn(
        `Unable to extract user IDs for group channel: ${channel.id}`,
      );
      return [];
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getUserIdsFromGroupChannel",
        channelId: channel.id,
      });
      return [];
    }
  }

  /**
   * Generates a channel name for direct messages
   * @param userId Current user ID
   * @param otherId Other user ID
   * @returns Channel name
   */
  public generateDirectChannelName(userId: string, otherId: string): string {
    // Direct channel names are two user IDs sorted alphabetically and joined with a double underscore
    if (!userId || !otherId) {
      throw new Error(
        "Both user IDs are required to generate direct channel name",
      );
    }
    return [userId, otherId].sort().join("__");
  }

  /**
   * Generates a display name for a direct channel
   * @param otherUser The other user in the direct channel
   * @param fallbackName Fallback name if user info is not available
   * @returns Display name for the direct channel
   */
  public getDirectChannelDisplayName(
    otherUser: User | null | undefined,
    fallbackName: string = "Unknown User",
  ): string {
    if (!otherUser) {
      return fallbackName;
    }

    if (otherUser.first_name && otherUser.last_name) {
      return `${otherUser.first_name} ${otherUser.last_name}`;
    } else if (otherUser.nickname) {
      return otherUser.nickname;
    } else {
      return otherUser.username || fallbackName;
    }
  }

  /**
   * Generates a display name for a group channel
   * @param users Array of users in the group
   * @param currentUserId Current user ID to exclude from the display name
   * @param maxNames Maximum number of names to include before using "and X more"
   * @returns Display name for the group channel
   */
  public getGroupChannelDisplayName(
    users: User[],
    currentUserId: string,
    maxNames: number = 3,
  ): string {
    try {
      // Filter out current user and get valid users
      const otherUsers = users.filter((user) => user.id !== currentUserId);

      if (otherUsers.length === 0) {
        return "Group Channel";
      }

      // Format names
      const formattedNames = otherUsers.map((user) => {
        if (user.first_name) {
          return user.first_name;
        } else if (user.nickname) {
          return user.nickname;
        } else {
          return user.username || "User";
        }
      });

      // Limit the number of displayed names
      if (formattedNames.length <= maxNames) {
        return formattedNames.join(", ");
      } else {
        const displayedNames = formattedNames.slice(0, maxNames);
        const remainingCount = formattedNames.length - maxNames;
        return `${displayedNames.join(", ")} and ${remainingCount} more`;
      }
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getGroupChannelDisplayName",
        userCount: users.length,
      });
      return "Group Channel";
    }
  }

  /**
   * Gets initials from a display name
   * @param displayName Display name
   * @returns Initials (1-2 characters)
   */
  public getChannelInitials(displayName: string): string {
    if (!displayName) return "?";

    const parts = displayName.trim().split(/[\s,]+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  /**
   * Gets a placeholder display name for a direct channel when user data is not available
   * @param userId User ID
   * @returns Placeholder display name
   */
  public getPlaceholderDisplayName(userId: string): string {
    if (!userId) return "Loading...";
    return `User ${userId.substring(0, 5)}...`;
  }

  /**
   * Gets channels by type from a channel list
   * @param channels List of channels
   * @param type Channel type (O, P, D, G)
   * @returns Filtered channels
   */
  public filterChannelsByType(
    channels: Channel[],
    type: ChannelType,
  ): Channel[] {
    return channels.filter((channel) => channel.type === type);
  }

  /**
   * Gets channels by group type from a channel list
   * @param channels List of channels
   * @param groupType Channel group type
   * @param favoriteIds Set of favorite channel IDs
   * @returns Filtered channels
   */
  public getChannelsByGroupType(
    channels: Channel[],
    groupType: ChannelGroupType,
    favoriteIds?: Set<string>,
  ): Channel[] {
    switch (groupType) {
      case "public":
        return channels.filter((c) => c.type === "O");
      case "private":
        return channels.filter((c) => c.type === "P");
      case "direct":
        return channels.filter((c) => c.type === "D");
      case "group":
        return channels.filter((c) => c.type === "G");
      case "favorite":
        return favoriteIds
          ? channels.filter((c) => favoriteIds.has(c.id))
          : channels.filter((c) => c.is_favorite);
      default:
        return channels;
    }
  }

  /**
   * Gets favorite channels from a channel list
   * @param channels List of channels
   * @returns Favorite channels
   */
  public getFavoriteChannels(channels: Channel[]): Channel[] {
    return channels.filter((channel) => channel.is_favorite);
  }

  /**
   * Gets channels for a specific team
   * @param channels List of channels
   * @param teamId Team ID
   * @returns Channels for the team
   */
  public getChannelsForTeam(channels: Channel[], teamId: string): Channel[] {
    return channels.filter((channel) => channel.team_id === teamId);
  }

  /**
   * Sorts channels by display name
   * @param channels List of channels to sort
   * @returns Sorted channels
   */
  public sortChannelsByDisplayName(channels: Channel[]): Channel[] {
    return [...channels].sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    );
  }

  /**
   * Creates a formatted direct channel info object
   * @param channel Channel object
   * @param currentUserId Current user ID
   * @param users Map of users by ID
   * @param statusMap Map of user statuses
   * @returns Formatted direct channel info
   */
  public createDirectChannelInfo(
    channel: Channel,
    currentUserId: string,
    users: Record<string, User>,
    statusMap: Record<string, UserStatus> = {},
  ): DirectChannelInfo {
    try {
      // Default info with channel is not direct/group
      const defaultInfo: DirectChannelInfo = {
        isDirect: false,
        isGroup: false,
        displayName: channel.display_name || "Channel",
        userIds: [],
        status: "complete",
      };

      // Handle direct channel
      if (this.isDirectChannel(channel)) {
        const userIds = this.getUserIdsFromDirectChannel(channel.name);
        const otherUserId = this.getOtherUserIdFromDirectChannel(
          channel.name,
          currentUserId,
        );

        // If no other user ID was found, return a loading state
        if (!otherUserId) {
          return {
            ...defaultInfo,
            isDirect: true,
            userIds,
            displayName: "Loading...",
            status: "loading",
          };
        }

        const otherUser = users[otherUserId];

        if (otherUser) {
          // User is loaded - complete state
          return {
            isDirect: true,
            isGroup: false,
            displayName: this.getDirectChannelDisplayName(otherUser),
            userIds,
            otherUserId,
            userStatus: statusMap[otherUserId] || "offline",
            userImageUrl: otherUser.last_picture_update
              ? `/api/v4/users/${otherUser.id}/image?_=${otherUser.last_picture_update}`
              : undefined,
            status: "complete",
          };
        } else {
          // User is not loaded yet - loading state
          return {
            isDirect: true,
            isGroup: false,
            displayName: this.getPlaceholderDisplayName(otherUserId),
            userIds,
            otherUserId,
            status: "loading",
          };
        }
      }

      // Handle group channel
      if (this.isGroupChannel(channel)) {
        const userIds = this.getUserIdsFromGroupChannel(channel);

        // Get available users
        const availableUsers = userIds
          .map((id) => users[id])
          .filter((user): user is User => !!user);

        // If we have users, build a proper display name
        if (availableUsers.length > 0) {
          const displayName = this.getGroupChannelDisplayName(
            availableUsers,
            currentUserId,
          );

          // Build avatar URLs for users in the group
          const groupAvatarUrls = availableUsers
            .filter((user) => user.last_picture_update)
            .map(
              (user) =>
                `/api/v4/users/${user.id}/image?_=${user.last_picture_update}`,
            );

          // Determine status based on if we have all users
          const status =
            availableUsers.length === userIds.length ? "complete" : "loading";

          return {
            isDirect: false,
            isGroup: true,
            displayName,
            userIds,
            groupAvatarUrls,
            status,
          };
        } else {
          // No users loaded yet - loading state
          return {
            isDirect: false,
            isGroup: true,
            displayName: channel.display_name || "Group Message",
            userIds,
            status: "loading",
          };
        }
      }

      // Return default info for non-direct/group channels
      return defaultInfo;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "createDirectChannelInfo",
        channelId: channel.id,
      });

      // Return a safe default with error state
      return {
        isDirect: false,
        isGroup: false,
        displayName: channel.display_name || "Channel",
        userIds: [],
        status: "error",
      };
    }
  }

  /**
   * Checks if all required users for direct channels are loaded
   * @param channel Channel to check
   * @param users Map of users by ID
   * @param currentUserId Current user ID
   * @returns Whether all required users are loaded
   */
  public areDirectChannelUsersLoaded(
    channel: Channel,
    users: Record<string, User>,
    currentUserId: string,
  ): boolean {
    // For direct messages, we need the other user
    if (this.isDirectChannel(channel)) {
      const otherUserId = this.getOtherUserIdFromDirectChannel(
        channel.name,
        currentUserId,
      );
      return otherUserId ? !!users[otherUserId] : true;
    }

    // For group messages, we should have at least one other user
    if (this.isGroupChannel(channel)) {
      const userIds = this.getUserIdsFromGroupChannel(channel);
      const otherUserIds = userIds.filter((id) => id !== currentUserId);
      return otherUserIds.some((id) => !!users[id]);
    }

    // Not a direct/group channel, so no users needed
    return true;
  }

  /**
   * Gets a list of user IDs needed to display direct channels
   * @param channels List of channels
   * @param users Current loaded users map
   * @param currentUserId Current user ID
   * @returns List of user IDs that need to be loaded
   */
  public getNeededUserIdsForDirectChannels(
    channels: Channel[],
    users: Record<string, User>,
    currentUserId: string,
  ): string[] {
    try {
      const neededUserIds: string[] = [];

      channels.forEach((channel) => {
        if (this.isDirectChannel(channel)) {
          const otherUserId = this.getOtherUserIdFromDirectChannel(
            channel.name,
            currentUserId,
          );
          if (
            otherUserId &&
            !users[otherUserId] &&
            !neededUserIds.includes(otherUserId)
          ) {
            neededUserIds.push(otherUserId);
          }
        } else if (this.isGroupChannel(channel)) {
          const userIds = this.getUserIdsFromGroupChannel(channel);
          userIds.forEach((userId) => {
            if (
              userId !== currentUserId &&
              !users[userId] &&
              !neededUserIds.includes(userId)
            ) {
              neededUserIds.push(userId);
            }
          });
        }
      });

      return neededUserIds;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getNeededUserIdsForDirectChannels",
        channelCount: channels.length,
      });
      return [];
    }
  }

  /**
   * Groups direct channels by loaded status to facilitate optimized loading
   * @param channels List of channels
   * @param users Current loaded users map
   * @param currentUserId Current user ID
   * @returns Grouped channels by loading status
   */
  public groupDirectChannelsByLoadStatus(
    channels: Channel[],
    users: Record<string, User>,
    currentUserId: string,
  ): {
    loaded: Channel[];
    needLoading: Channel[];
  } {
    try {
      const result = {
        loaded: [] as Channel[],
        needLoading: [] as Channel[],
      };

      channels.forEach((channel) => {
        if (!this.isDirectOrGroupChannel(channel)) {
          result.loaded.push(channel);
          return;
        }

        const isLoaded = this.areDirectChannelUsersLoaded(
          channel,
          users,
          currentUserId,
        );
        if (isLoaded) {
          result.loaded.push(channel);
        } else {
          result.needLoading.push(channel);
        }
      });

      return result;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "groupDirectChannelsByLoadStatus",
        channelCount: channels.length,
      });

      // Return all channels as loaded to avoid breaking the UI
      return {
        loaded: channels,
        needLoading: [],
      };
    }
  }

  /**
   * Validates a channel name format
   * @param name Channel name to validate
   * @returns Whether the name is valid
   */
  public validateChannelName(name: string): boolean {
    // Channel names must be lowercase alphanumeric or hyphens
    // Cannot start with a hyphen
    const channelNameRegex = /^[a-z0-9][a-z0-9\-_]*$/;
    return channelNameRegex.test(name) && name.length >= 2 && name.length <= 64;
  }

  /**
   * Creates a URL-friendly channel name from a display name
   * @param displayName Display name
   * @returns URL-friendly channel name
   */
  public sanitizeChannelName(displayName: string): string {
    return displayName
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9\-_]/g, "") // Remove invalid characters
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Notifies about channel updates
   * @param channel Updated channel
   * @param action Action performed on the channel
   */
  public notifyChannelUpdate(
    channel: Channel,
    action: "created" | "updated" | "deleted" | "joined" | "left",
  ): void {
    const eventMap = {
      created: EventType.CHANNEL_CREATED,
      updated: EventType.CHANNEL_UPDATED,
      deleted: EventType.CHANNEL_DELETED,
      joined: EventType.CHANNEL_JOINED,
      left: EventType.CHANNEL_LEFT,
    };

    emitEvent(eventMap[action], {
      channel,
      teamId: channel.team_id,
      timestamp: Date.now(),
    });
  }
}

/**
 * Singleton instance of the channel service
 */
export const channelService = new ChannelService();
