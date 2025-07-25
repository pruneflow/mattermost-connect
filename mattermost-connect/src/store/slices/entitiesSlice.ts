import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import {
  UserProfile,
  Team,
  Channel,
  Post,
  PostList,
  PaginatedPostList,
  PostOrderBlock,
  TeamMember,
  ChannelMember,
  UserStatus,
  TeamStats,
  ChannelCategory, CanLoadMorePosts
} from "../../api/types";
import { client } from "../../api/client";

// ============================================================================
// ASYNC THUNKS - Centralized Data Loading (Mattermost pattern)
// ============================================================================

/**
 * Update team member scheme roles (like Mattermost)
 */
export const updateTeamMemberRoles = createAsyncThunk(
  "entities/updateTeamMemberRoles",
  async (
    {
      teamId,
      userId,
      isSchemeAdmin,
    }: { teamId: string; userId: string; isSchemeAdmin: boolean },
    { dispatch, rejectWithValue },
  ) => {
    try {
      // Utilise l'endpoint /schemeRoles comme Mattermost
      await client.updateTeamMemberSchemeRoles(
        teamId,
        userId,
        true,
        isSchemeAdmin,
      );

      // Calculate roles string for store update
      const roles = isSchemeAdmin ? "team_admin team_user" : "team_user";

      // Update store with new roles
      dispatch(updateTeamMemberRole({ teamId, userId, roles }));

      return { teamId, userId, roles };
    } catch (error) {
      return rejectWithValue({
        teamId,
        userId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update member roles",
      });
    }
  },
);

/**
 * Load team members for a specific team (only if not already loaded)
 */
export const loadTeamMembers = createAsyncThunk(
  "entities/loadTeamMembers",
  async (teamId: string, { rejectWithValue }) => {
    try {
      // Always load fresh data (no cache check)

      console.log(`Loading members for team ${teamId}`);
      const members = await client.getTeamMembers(teamId, 0, 200, {
        sort: "Username",
        exclude_deleted_users: true,
      });
      return { teamId, members: members || [], skipped: false };
    } catch (error) {
      return rejectWithValue({
        teamId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load team members",
      });
    }
  },
);

/**
 * Load user profiles for a team (with pagination support)
 */
export const loadTeamUserProfiles = createAsyncThunk(
  "entities/loadTeamUserProfiles",
  async (
    {
      teamId,
      page = 0,
      perPage = 100,
    }: { teamId: string; page?: number; perPage?: number },
    { rejectWithValue },
  ) => {
    try {
      console.log(`Loading user profiles for team ${teamId}, page ${page}`);
      const profiles = await client.getProfilesInTeam(
        teamId,
        page,
        perPage,
        "",
        {
          active: true,
        },
      );
      return { teamId, profiles: profiles || [], page };
    } catch (error) {
      return rejectWithValue({
        teamId,
        page,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load team user profiles",
      });
    }
  },
);

/**
 * Load channel members for a specific channel (only if not already loaded)
 */
export const loadChannelMembers = createAsyncThunk(
  "entities/loadChannelMembers",
  async (channelId: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };

      // Always load fresh data (no cache check)

      console.log(`Loading members for channel ${channelId}`);
      const members = await client.getChannelMembers(channelId, 0, 200);

      // Extract user IDs and load their profiles if needed
      const userIds = (members || []).map((member) => member.user_id);
      const existingUserIds = Object.keys(state.entities.users.profiles);
      const missingUserIds = userIds.filter(
        (id) => !existingUserIds.includes(id),
      );

      // Load missing user profiles
      if (missingUserIds.length > 0) {
        console.log(
          `Loading ${missingUserIds.length} missing user profiles for channel members`,
        );
        try {
          const users = await client.getProfilesByIds(missingUserIds);
          // Store users in state (will be handled by the fulfilled reducer)
          dispatch(setUsers(users || []));
        } catch (userError) {
          console.warn("Failed to load some user profiles:", userError);
        }
      }

      return { channelId, members: members || [], skipped: false };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load channel members",
      });
    }
  },
);

/**
 * Load user statuses by IDs with debounced batching (Mattermost pattern)
 */
export const loadUserStatuses = createAsyncThunk(
  "entities/loadUserStatuses",
  async (userIds: string[], { rejectWithValue }) => {
    try {
      if (userIds.length === 0) {
        return { statuses: [] };
      }

      console.log(`Loading statuses for ${userIds.length} users`);
      const statuses = await client.getStatusesByIds(userIds);

      return { statuses: statuses || [] };
    } catch (error) {
      return rejectWithValue({
        userIds,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load user statuses",
      });
    }
  },
);

/**
 * Add users to team
 */
export const addUsersToTeam = createAsyncThunk(
  "entities/addUsersToTeam",
  async (
    { teamId, userIds }: { teamId: string; userIds: string[] },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await client.addUsersToTeam(teamId, userIds);

      // Update store - increment team member count
      console.log(
        `Adding ${userIds.length} users to team ${teamId}, updating stats`,
      );
      dispatch(adjustTeamMemberCount({ teamId, count: userIds.length }));

      // Optionally reload team members to get fresh data
      dispatch(loadTeamMembers(teamId));

      return { teamId, userIds };
    } catch (error) {
      return rejectWithValue({
        teamId,
        userIds,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add users to team",
      });
    }
  },
);

/**
 * Remove user from team
 */
export const removeUserFromTeam = createAsyncThunk(
  "entities/removeUserFromTeam",
  async (
    { teamId, userId }: { teamId: string; userId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await client.removeFromTeam(teamId, userId);

      // Update store - remove user from team (WebSocket will handle stats)
      console.log(
        `Removing user ${userId} from team ${teamId}, WebSocket will update stats`,
      );
      dispatch(removeUserFromTeamAction({ teamId, userId }));
      // Note: Don't decrement here - WebSocket 'leave_team' event will do it

      return { teamId, userId };
    } catch (error) {
      return rejectWithValue({
        teamId,
        userId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove user from team",
      });
    }
  },
);

/**
 * Load channel categories for team (Mattermost pattern)
 */
export const loadChannelCategories = createAsyncThunk(
  "entities/loadChannelCategories",
  async (teamId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ teamId, error: "No current user" });
      }

      // Single API call returns categories with order (Mattermost pattern)
      const categoriesResponse = await client.getChannelCategories(
        currentUserId,
        teamId,
      );

      return {
        teamId,
        categories: categoriesResponse.categories,
        order: categoriesResponse.order,
      };
    } catch (error) {
      return rejectWithValue({
        teamId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load channel categories",
      });
    }
  },
);

/**
 * Toggle channel favorite status (Mattermost pattern)
 */
export const toggleChannelFavoriteAction = createAsyncThunk(
  "entities/toggleChannelFavorite",
  async (
    {
      channelId,
      teamId,
      isFavorite,
    }: { channelId: string; teamId: string; isFavorite: boolean },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ channelId, teamId, error: "No current user" });
      }

      // Find favorites category (always exists in Mattermost)
      const favoritesCategory = Object.values(
        state.entities.channels.categories,
      ).find((cat) => cat.team_id === teamId && cat.type === "favorites");

      if (!favoritesCategory) {
        return rejectWithValue({
          channelId,
          teamId,
          error: "Favorites category not found",
        });
      }

      // Update channel_ids array
      const updatedChannelIds = isFavorite
        ? [
            ...favoritesCategory.channel_ids.filter((id) => id !== channelId),
            channelId,
          ]
        : favoritesCategory.channel_ids.filter((id) => id !== channelId);

      const updatedCategory = {
        ...favoritesCategory,
        channel_ids: updatedChannelIds,
      };

      // API call to update category
      await client.updateChannelCategory(
        currentUserId,
        teamId,
        updatedCategory,
      );

      // Optimistic update
      dispatch(toggleChannelFavorite({ channelId, teamId, isFavorite }));

      return { channelId, teamId, isFavorite };
    } catch (error) {
      return rejectWithValue({
        channelId,
        teamId,
        error:
          error instanceof Error ? error.message : "Failed to toggle favorite",
      });
    }
  },
);

/**
 * Mute/unmute a channel by updating notify props
 */
export const muteChannelAction = createAsyncThunk(
  "entities/muteChannel",
  async (
    {
      channelId,
      userId,
      muted,
    }: { channelId: string; userId: string; muted: boolean },
    { rejectWithValue },
  ) => {
    try {
      const notifyProps = {
        user_id: userId,
        channel_id: channelId,
        mark_unread: muted ? "mention" : "all",
      };

      await client.updateChannelNotifyProps(notifyProps);

      return { channelId, userId, muted };
    } catch (error) {
      return rejectWithValue({
        channelId,
        userId,
        error:
          error instanceof Error ? error.message : "Failed to mute channel",
      });
    }
  },
);

/**
 * Leave a channel by removing current user from it
 */
export const leaveChannelAction = createAsyncThunk(
  "entities/leaveChannel",
  async (
    { channelId, userId }: { channelId: string; userId: string },
    { rejectWithValue },
  ) => {
    try {
      await client.removeFromChannel(userId, channelId);

      return { channelId, userId };
    } catch (error) {
      return rejectWithValue({
        channelId,
        userId,
        error:
          error instanceof Error ? error.message : "Failed to leave channel",
      });
    }
  },
);

/**
 * Update channel categories (for drag & drop)
 */
export const updateChannelCategoriesAction = createAsyncThunk(
  "entities/updateChannelCategories",
  async (
    { teamId, categories }: { teamId: string; categories: ChannelCategory[] },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ teamId, error: "No current user" });
      }

      await client.updateChannelCategories(currentUserId, teamId, categories);

      return { teamId, categories };
    } catch (error) {
      return rejectWithValue({
        teamId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update categories",
      });
    }
  },
);

/**
 * Reorder channel categories (for drag & drop)
 */
export const reorderCategoriesAction = createAsyncThunk(
  "entities/reorderCategories",
  async (
    { teamId, categoryOrder }: { teamId: string; categoryOrder: string[] },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ teamId, error: "No current user" });
      }

      // API call to update category order
      await client.updateChannelCategoryOrder(
        currentUserId,
        teamId,
        categoryOrder,
      );

      // Optimistic update
      dispatch(reorderCategories({ teamId, categoryOrder }));

      return { teamId, categoryOrder };
    } catch (error) {
      return rejectWithValue({
        teamId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reorder categories",
      });
    }
  },
);

/**
 * Toggle channel category collapsed state (Mattermost pattern)
 */
export const toggleCategoryCollapsedAction = createAsyncThunk(
  "entities/toggleCategoryCollapsed",
  async (
    { categoryId, isCollapsed }: { categoryId: string; isCollapsed: boolean },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ categoryId, error: "No current user" });
      }

      const category = state.entities.channels.categories[categoryId];
      if (!category) {
        return rejectWithValue({ categoryId, error: "Category not found" });
      }

      // Create updated category with new collapsed state
      const updatedCategory = {
        ...category,
        collapsed: isCollapsed,
      };

      // API call to update category
      await client.updateChannelCategory(
        currentUserId,
        category.team_id,
        updatedCategory,
      );

      // Optimistic update
      dispatch(toggleCategoryCollapsed({ categoryId, isCollapsed }));

      return { categoryId, isCollapsed };
    } catch (error) {
      return rejectWithValue({
        categoryId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to toggle category collapsed state",
      });
    }
  },
);

/**
 * Mark channel as unread (Mattermost pattern)
 */
export const markChannelAsUnreadAction = createAsyncThunk(
  "entities/markChannelAsUnread",
  async (
    { channelId }: { channelId: string },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ channelId, error: "No current user" });
      }

      // Get the latest posts in the channel to find the most recent one
      const posts = await client.getPosts(channelId, 0, 1);

      if (!posts.posts || Object.keys(posts.posts).length === 0) {
        return rejectWithValue({
          channelId,
          error: "No posts found in channel",
        });
      }

      // Get the latest post ID
      const latestPostId = posts.order[0];

      // Mark channel as unread from this post
      const channelUnread = await client.markPostAsUnread(
        currentUserId,
        latestPostId,
      );

      // Update local store with the returned unread counts
      dispatch(
        setChannelUnreads({
          [channelId]: {
            msg_count: channelUnread.msg_count,
            mention_count: channelUnread.mention_count,
          },
        }),
      );

      return { channelId, channelUnread };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark channel as unread",
      });
    }
  },
);

/**
 * Move channel to another category (Mattermost pattern)
 */
export const moveChannelToCategoryAction = createAsyncThunk(
  "entities/moveChannelToCategory",
  async (
    {
      channelId,
      fromCategoryId,
      toCategoryId,
    }: { channelId: string; fromCategoryId: string; toCategoryId: string },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ channelId, error: "No current user" });
      }

      const fromCategory = state.entities.channels.categories[fromCategoryId];
      const toCategory = state.entities.channels.categories[toCategoryId];

      if (!fromCategory || !toCategory) {
        return rejectWithValue({ channelId, error: "Category not found" });
      }

      // Remove channel from source category
      const updatedFromCategory = {
        ...fromCategory,
        channel_ids: fromCategory.channel_ids.filter((id) => id !== channelId),
      };

      // Add channel to destination category
      const updatedToCategory = {
        ...toCategory,
        channel_ids: [...toCategory.channel_ids, channelId],
      };

      // API call to update both categories
      await client.updateChannelCategories(
        currentUserId,
        fromCategory.team_id,
        [updatedFromCategory, updatedToCategory],
      );

      // Optimistic updates
      dispatch(updateChannelCategory(updatedFromCategory));
      dispatch(updateChannelCategory(updatedToCategory));

      return { channelId, fromCategoryId, toCategoryId };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to move channel to category",
      });
    }
  },
);

/**
 * Reorder channels within a category (Mattermost pattern)
 */
export const reorderChannelsAction = createAsyncThunk(
  "entities/reorderChannels",
  async (
    {
      categoryId,
      newChannelOrder,
    }: { categoryId: string; newChannelOrder: string[] },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ categoryId, error: "No current user" });
      }

      const category = state.entities.channels.categories[categoryId];
      if (!category) {
        return rejectWithValue({ categoryId, error: "Category not found" });
      }

      // Update category with new channel order
      const updatedCategory = {
        ...category,
        channel_ids: newChannelOrder,
      };

      // API call to update category
      await client.updateChannelCategory(
        currentUserId,
        category.team_id,
        updatedCategory,
      );

      // Optimistic update
      dispatch(updateChannelCategory(updatedCategory));

      return { categoryId, newChannelOrder };
    } catch (error) {
      return rejectWithValue({
        categoryId,
        error:
          error instanceof Error ? error.message : "Failed to reorder channels",
      });
    }
  },
);

/**
 * Store users and their statuses in Redux state
 * Shared by both loadChannelsForTeam and addSingleChannelToTeam reducers
 */
const storeUsersAndStatuses = (
  state: EntitiesState,
  users?: UserProfile[],
  userStatuses?: Record<string, UserStatus>,
) => {
  // Store users
  if (users) {
    users.forEach((user: UserProfile) => {
      state.users.profiles[user.id] = user;
    });
  }

  // Store user statuses
  if (userStatuses) {
    Object.assign(state.users.statuses, userStatuses);
  }
};

/**
 * Unified function to load group channel members and remaining missing users
 * Optimizes API calls by avoiding duplicate user loading
 */
const loadGroupChannelMembersAndUsers = async (
  groupChannelIds: string[],
  allUserIdsToLoad: string[],
  dispatch: any,
  currentState: EntitiesState,
): Promise<{
  groupChannelData?: {
    profilesByChannelId: Record<string, UserProfile[]>;
    memberCounts: Record<string, number>;
  };
  users: UserProfile[];
  userStatuses: Record<string, UserStatus>;
}> => {
  let groupChannelData: any = undefined;
  let loadedUserIds: Set<string> = new Set();

  // Step 1: Load group channel members first if there are group channels
  if (groupChannelIds.length > 0) {
    const profilesByChannelId =
      await client.getProfilesInGroupChannels(groupChannelIds);
    // Extract all user profiles from group channels
    const groupChannelProfiles: UserProfile[] = [];

    Object.values(profilesByChannelId).forEach((profiles) => {
      profiles.forEach((profile) => {
        if (!loadedUserIds.has(profile.id)) {
          groupChannelProfiles.push(profile);
          loadedUserIds.add(profile.id);
        }
      });
    });

    // Store group channel users in state
    if (groupChannelProfiles.length > 0) {
      dispatch(setUsers(groupChannelProfiles));
    }

    // Load statuses for group channel users
    const groupUserIds = groupChannelProfiles.map((user) => user.id);
    const missingStatusIds = groupUserIds.filter(
      (userId) => !currentState.users.statuses[userId],
    );
    if (missingStatusIds.length > 0) {
      const statuses = await client.getStatusesByIds(missingStatusIds);
      const statusRecord: Record<string, UserStatus> = {};
      statuses.forEach((status: UserStatus) => {
        statusRecord[status.user_id] = status;
      });
      dispatch(setUsersStatus(statusRecord));
    }

    groupChannelData = {
      profilesByChannelId,
      memberCounts: Object.fromEntries(
        Object.entries(profilesByChannelId).map(([channelId, profiles]) => [
          channelId,
          profiles.length,
        ]),
      ),
    };
  }

  // Step 2: Load remaining missing users (excluding those already loaded from group channels)
  const remainingUserIds = allUserIdsToLoad.filter(
    (id) => !loadedUserIds.has(id),
  );
  const { users: additionalUsers, userStatuses } = await loadMissingUsers(
    remainingUserIds,
    currentState.users.profiles,
  );

  return {
    groupChannelData,
    users: additionalUsers,
    userStatuses,
  };
};

/**
 * Load missing users and their statuses
 * Shared logic between loadChannelsForTeam and addSingleChannelToTeam
 */
const loadMissingUsers = async (
  userIdsToLoad: string[],
  existingUserProfiles: Record<string, UserProfile>,
): Promise<{
  users: UserProfile[];
  userStatuses: Record<string, UserStatus>;
}> => {
  let missingUsers: UserProfile[] = [];
  let missingUserStatuses: Record<string, UserStatus> = {};

  if (userIdsToLoad.length > 0) {
    const existingUserIds = Object.keys(existingUserProfiles);
    const missingUserIds = userIdsToLoad.filter(
      (id) => !existingUserIds.includes(id),
    );

    if (missingUserIds.length > 0) {
      // First load users (this works with invalid IDs)
      const users = await client.getProfilesByIds(missingUserIds);
      missingUsers = users || [];

      // Then load statuses using only the valid user IDs returned from getProfilesByIds
      if (users && users.length > 0) {
        const validUserIds = users.map((user) => user.id);
        const statuses = await client.getStatusesByIds(validUserIds);

        // Transform status array to Record<userId, UserStatus>
        if (statuses && Array.isArray(statuses)) {
          statuses.forEach((status: UserStatus) => {
            missingUserStatuses[status.user_id] = status;
          });
        }
      }
    }
  }

  return { users: missingUsers, userStatuses: missingUserStatuses };
};

/**
 * Process a single channel to extract user IDs and calculate unreads
 * Shared logic between loadChannelsForTeam and addSingleChannelToTeam
 */
const processChannelData = (
  channel: Channel,
  membership: ChannelMember | null,
  currentUserId: string | null,
): {
  userIdsToLoad: string[];
  unreadData: { msg_count: number; mention_count: number } | null;
} => {
  const userIdsToLoad: string[] = [];
  let unreadData: { msg_count: number; mention_count: number } | null = null;

  // 1. Extract user IDs for direct channels
  if (channel.type === "D" && currentUserId) {
    const userIds = channel.name.split("__");
    const otherUserId = userIds.find((id) => id !== currentUserId);
    if (otherUserId) {
      userIdsToLoad.push(otherUserId);
    }
  } else if (channel.type === "G") {
    // Group channel names are hashes, not user ID lists
    // Cannot extract user IDs by parsing - would need /api/v4/users/group_channels API
    // For now, skip user loading for group channels
  }

  // 2. Calculate initial unreads from channel/member data
  if (membership) {
    const channelTotalMsg = (channel as any).total_msg_count || 0;
    const memberMsgCount = membership.msg_count || 0;
    const memberMentionCount = membership.mention_count || 0;

    const unreadMsgCount = Math.max(0, channelTotalMsg - memberMsgCount);

    unreadData = {
      msg_count: unreadMsgCount,
      mention_count: memberMentionCount,
    };
  }

  return { userIdsToLoad, unreadData };
};

/**
 * Add a single channel to team with complete setup (like loadChannelsForTeam)
 * Used by WebSocket events when user is added to a channel
 */
export const addSingleChannelToTeam = createAsyncThunk(
  "entities/addSingleChannelToTeam",
  async (
    { channelId, teamId }: { channelId: string; teamId: string },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ channelId, teamId, error: "No current user" });
      }

      // Fetch channel and member data
      const [channel, member] = await Promise.all([
        client.getChannel(channelId),
        client.getChannelMember(channelId, currentUserId),
      ]);

      // Process channel using same logic as loadChannelsForTeam
      const { userIdsToLoad, unreadData } = processChannelData(
        channel,
        member,
        currentUserId,
      );

      // Load group channel members and missing users with optimized API calls
      const groupChannelIds = channel.type === "G" ? [channelId] : [];

      const {
        groupChannelData: singleGroupChannelData,
        users: missingUsers,
        userStatuses: missingUserStatuses,
      } = await loadGroupChannelMembersAndUsers(
        groupChannelIds,
        userIdsToLoad,
        dispatch,
        state.entities,
      );

      return {
        teamId,
        channel,
        member,
        users: missingUsers,
        userStatuses: missingUserStatuses,
        unreadData,
        groupChannelData: singleGroupChannelData,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        teamId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add channel to team",
      });
    }
  },
);

/**
 * Load channels for specific team with store verification
 * Only fetches if channels not already loaded for this team
 */
export const loadChannelsForTeam = createAsyncThunk(
  "entities/loadChannelsForTeam",
  async (teamId: string, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };

      // Check if channels already loaded for this team
      const existingChannels = state.entities.channels.channelsInTeam[teamId];
      if (existingChannels && existingChannels.length > 0) {
        // Already loaded, skip API call
        return { teamId, skipped: true };
      }

      // Fetch channels, members and unreads in parallel (Mattermost pattern)
      const [teamChannels, myChannelMembers] = await Promise.all([
        client.getMyChannels(teamId),
        client.getMyChannelMembers(teamId),
      ]);

      // Process all channels using extracted logic (single loop optimization)
      const currentUserId = state.entities.users.currentUserId;
      const userIdsToLoad = new Set<string>();
      const initialUnreads: Record<
        string,
        { msg_count: number; mention_count: number }
      > = {};

      teamChannels.forEach((channel: Channel) => {
        const membership = myChannelMembers.find(
          (member: ChannelMember) => member.channel_id === channel.id,
        );
        const { userIdsToLoad: channelUserIds, unreadData } =
          processChannelData(channel, membership || null, currentUserId);

        // Collect user IDs
        channelUserIds.forEach((userId) => userIdsToLoad.add(userId));

        // Store unread data
        if (unreadData) {
          initialUnreads[channel.id] = unreadData;
        }
      });

      // Load group channel members and missing users with optimized API calls
      const groupChannels = teamChannels.filter(
        (channel: Channel) => channel.type === "G",
      );
      const groupChannelIds = groupChannels.map((channel) => channel.id);

      const {
        groupChannelData,
        users: missingUsers,
        userStatuses: missingUserStatuses,
      } = await loadGroupChannelMembersAndUsers(
        groupChannelIds,
        Array.from(userIdsToLoad),
        dispatch,
        state.entities,
      );

      return {
        teamId,
        channels: teamChannels,
        members: myChannelMembers,
        users: missingUsers,
        userStatuses: missingUserStatuses,
        unreads: initialUnreads,
        groupChannelData,
        skipped: false,
      };
    } catch (error) {
      return rejectWithValue({
        teamId,
        error:
          error instanceof Error ? error.message : "Failed to load channels",
      });
    }
  },
);

// ============================================================================
// POSTS/MESSAGES ASYNC THUNKS
// ============================================================================

// Utility function to create default channel pagination
const createDefaultChannelPagination = () => ({
  hasOlderPosts: false,
  hasNewerPosts: false,
  oldestPostId: null,
  newestPostId: null,
  isLoading: false,
  isLoadingOlder: false,
  isLoadingNewer: false,
  lastLoadedAt: 0,
  newMessageLineIndex: null,
  focusedPostId: null,
  atBottom: false,
  isScrolling: false,
  scrollToIndex: null,
  error: null,
});

export const getPostsAround = createAsyncThunk(
  "posts/getPostsAround",
  async (
    {
      channelId,
      postId,
      perPage = 30,
      fetchThreads = true,
      collapsedThreadsExtended = false,
    }: {
      channelId: string;
      postId: string;
      perPage?: number;
      fetchThreads?: boolean;
      collapsedThreadsExtended?: boolean;
    },
    { rejectWithValue, getState },
  ) => {
    const state = getState() as { entities: EntitiesState };

    let after, thread, before;

    try {
      const collapsedThreadsEnabled = true;
      [after, thread, before] = await Promise.all([
        client.getPostsAfter(
          channelId,
          postId,
          0,
          perPage,
          fetchThreads,
          collapsedThreadsEnabled,
          collapsedThreadsExtended,
        ),
        client.getPostThread(
          postId,
          fetchThreads,
          collapsedThreadsEnabled,
          collapsedThreadsExtended,
        ),
        client.getPostsBefore(
          channelId,
          postId,
          0,
          perPage,
          fetchThreads,
          collapsedThreadsEnabled,
          collapsedThreadsExtended,
        ),
      ]);
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get posts around focused post",
      });
    }

    const posts: PostList = {
      posts: {
        ...after.posts,
        ...thread.posts,
        ...before.posts,
      },
      order: [...after.order, postId, ...before.order],
      next_post_id: after.next_post_id,
      prev_post_id: before.prev_post_id,
      first_inaccessible_post_time:
        Math.max(
          before.first_inaccessible_post_time,
          after.first_inaccessible_post_time,
          thread.first_inaccessible_post_time,
        ) || 0,
    };

    const userIds = new Set<string>();
    Object.values(posts.posts).forEach((post: Post) => {
      userIds.add(post.user_id);
    });

    // Load missing user profiles using existing function
    const { users, userStatuses } = await loadMissingUsers(
      Array.from(userIds),
      state.entities.users.profiles,
    );

    return { posts, users, userStatuses };
  },
);

/**
 * Load posts around last unread (Mattermost official pattern)
 * Uses getPostsAroundLastUnread for contextual loading like official Mattermost
 */

type LoadPostsAroundParams = {
  channelId: string;
  focusedPostId: string;
};

type LoadPostsAroundReturn = {
  posts: PostList;
  atLatestMessage: boolean;
  atOldestMessage: boolean;
  users: UserProfile[];
  userStatuses: Record<string, UserStatus>;
};

export const loadPostsAround = createAsyncThunk<
  LoadPostsAroundReturn,
  LoadPostsAroundParams,
  { rejectValue: { channelId: string; error: string } }
>(
  "posts/loadPostsAround",
  async ({ channelId, focusedPostId }, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(
        getPostsAround({
          channelId,
          postId: focusedPostId,
          perPage: 30,
        }),
      ).unwrap();

      const { posts, users, userStatuses } = result;

      return {
        posts,
        atLatestMessage: posts.next_post_id === "",
        atOldestMessage: posts.prev_post_id === "",
        users,
        userStatuses,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load posts around last unread",
      });
    }
  },
);

export const loadPostsAroundLastUnread = createAsyncThunk(
  "entities/loadPostsAroundLastUnread",
  async (
    {
      channelId,
      limitBefore = 30,
      limitAfter = 30,
      userId,
    }: {
      channelId: string;
      limitBefore?: number;
      limitAfter?: number;
      userId?: string;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = userId || state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ channelId, error: "No current user" });
      }

      // Use the official Mattermost getPostsAroundLastUnread API
      const response = (await client.getPostsUnread(
        channelId,
        currentUserId,
        limitAfter,
        limitBefore,
      )) as PaginatedPostList;

      // Mattermost format: { order: string[], posts: Record<string, Post> }
      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles using existing function
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        hasNext: response.has_next || false,
        hasPrev: !!response.prev_post_id,
        nextPostId: response.next_post_id || null,
        prevPostId: response.prev_post_id || null,
        contextual: true, // Mark as contextual load
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load posts around last unread",
      });
    }
  },
);

/**
 * Load posts for a channel with pagination (Mattermost pattern)
 * Uses regular getPosts for pagination
 */
export const loadPostsForChannel = createAsyncThunk(
  "entities/loadPostsForChannel",
  async (
    {
      channelId,
      page = 0,
      perPage = 60,
    }: { channelId: string; page?: number; perPage?: number },
    { getState, rejectWithValue, dispatch },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };

      // For first page, try to use contextual loading first
      if (page === 0) {
        try {
          // Use dispatch to call the contextual loading thunk properly
          const contextualResult = await dispatch(
            loadPostsAroundLastUnread({ channelId }),
          );

          if (contextualResult.type.endsWith("/fulfilled")) {
            return contextualResult.payload;
          }
        } catch (error) {
          console.log(
            "Contextual loading failed, falling back to regular loading:",
            error,
          );
          // Continue with regular loading if contextual fails
        }
      }

      // Regular pagination loading
      const response = (await client.getPosts(
        channelId,
        page,
        perPage,
      )) as PaginatedPostList;

      // Mattermost format: { order: string[], posts: Record<string, Post> }
      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles using existing function
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        hasNext: response.has_next || false,
        hasPrev: !!response.prev_post_id,
        nextPostId: response.next_post_id || null,
        prevPostId: response.prev_post_id || null,
        page,
        perPage,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error: error instanceof Error ? error.message : "Failed to load posts",
      });
    }
  },
);

/**
 * Load posts before a specific post (pagination backward)
 */
export const loadPostsBefore = createAsyncThunk(
  "entities/loadPostsBefore",
  async (
    {
      channelId,
      postId,
      perPage = 60,
    }: { channelId: string; postId: string; perPage?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };

      // EXACT Mattermost pattern: Prevent multiple calls if already loading older posts
      const pagination = state.entities.posts.channelPagination[channelId];
      if (pagination?.isLoadingOlder) {
        return rejectWithValue({
          channelId,
          postId,
          error: "Already loading older posts",
        });
      }

      const response = (await client.getPostsBefore(
        channelId,
        postId,
        0,
        perPage,
      )) as PaginatedPostList;
      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles using existing function
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        hasNext: response.has_next || false,
        hasPrev: !!response.prev_post_id,
        nextPostId: response.next_post_id || null,
        prevPostId: response.prev_post_id || null,
        direction: "before" as const,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        postId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load posts before",
      });
    }
  },
);

/**
 * Load posts (Mattermost universal action) - EXACT Mattermost pattern
 * This is the main action called by PostList component with type BEFORE_ID or AFTER_ID
 */
export const loadPosts = createAsyncThunk(
  "entities/loadPosts",
  async (
    {
      channelId,
      postId,
      type,
    }: { channelId: string; postId: string; type: CanLoadMorePosts },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      let response: PaginatedPostList;

      const POST_INCREASE_AMOUNT = 30; // Same as Mattermost Constants.POST_CHUNK_SIZE / 2

      // Call appropriate API based on type - EXACT Mattermost pattern
      if (type === "BEFORE_ID") {
        response = (await client.getPostsBefore(
          channelId,
          postId,
          0,
          POST_INCREASE_AMOUNT,
        )) as PaginatedPostList;
      } else {
        response = (await client.getPostsAfter(
          channelId,
          postId,
          0,
          POST_INCREASE_AMOUNT,
        )) as PaginatedPostList;
      }

      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles using existing function
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        hasNext:
          type === "BEFORE_ID"
            ? !!response.next_post_id
            : response.has_next || false,
        hasPrev:
          type === "AFTER_ID"
            ? !!response.prev_post_id
            : response.has_next || false,
        nextPostId: response.next_post_id || null,
        prevPostId: response.prev_post_id || null,
        direction:
          type === "BEFORE_ID" ? ("before" as const) : ("after" as const),
        moreToLoad:
          type === "BEFORE_ID"
            ? response.prev_post_id !== "" && !!response.prev_post_id
            : response.next_post_id !== "" && !!response.next_post_id,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        postId,
        type,
        error: error instanceof Error ? error.message : "Failed to load posts",
      });
    }
  },
);

/**
 * Load unread posts (Mattermost specialized action) - EXACT Mattermost pattern
 */
// EXACT Mattermost getPostsUnread function
export const getPostsUnread = createAsyncThunk(
  "posts/getPostsUnread",
  async (
    {
      channelId,
      fetchThreads = true,
      collapsedThreadsExtended = false,
    }: {
      channelId: string;
      fetchThreads?: boolean;
      collapsedThreadsExtended?: boolean;
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };

      // Get current user ID
      const userId = state.entities.users.currentUserId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Get unread scroll preference (for now assume start from oldest)
      const shouldLoadRecent = false; // TODO: Get from preferences
      const collapsedThreadsEnabled = true; // TODO: Get from config

      const DEFAULT_LIMIT_BEFORE = 30;
      const DEFAULT_LIMIT_AFTER = 30;

      // EXACT Mattermost API call
      let posts = (await client.getPostsUnread(
        channelId,
        userId,
        DEFAULT_LIMIT_BEFORE,
        DEFAULT_LIMIT_AFTER,
        fetchThreads,
        collapsedThreadsEnabled,
        collapsedThreadsExtended,
      )) as PostList;

      let recentPosts: PostList | null = null;

      // If there are newer posts and user prefers to start from newest, load recent posts too
      if (posts.next_post_id && shouldLoadRecent) {
        recentPosts = (await client.getPosts(
          channelId,
          0,
          30, // Posts.POST_CHUNK_SIZE / 2
          fetchThreads,
          collapsedThreadsEnabled,
          collapsedThreadsExtended,
        )) as PostList;
      }

      // Extract user IDs for profile loading
      const userIds = new Set<string>();
      Object.values(posts.posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      if (recentPosts) {
        Object.values(recentPosts.posts).forEach((post: Post) => {
          userIds.add(post.user_id);
        });
      }

      // Load missing user profiles
      const { users, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        posts,
        recentPosts,
        users,
        userStatuses,
        atLatestMessage: posts.next_post_id === "",
        atOldestMessage: posts.prev_post_id === "",
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error ? error.message : "Failed to get posts unread",
      });
    }
  },
);

export const loadUnreads = createAsyncThunk(
  "entities/loadUnreads",
  async (channelId: string, { dispatch, rejectWithValue }) => {
    if (!channelId) {
      return rejectWithValue("channelId is required");
    }
    try {
      // EXACT Mattermost: Call getPostsUnread
      const result = await dispatch(
        getPostsUnread({
          channelId,
          fetchThreads: true,
          collapsedThreadsExtended: false,
        }),
      ).unwrap();

      const {
        posts,
        recentPosts,
        users,
        userStatuses,
        atLatestMessage,
        atOldestMessage,
      } = result;

      // TODO: dispatch loadCustomStatusEmojisForPostList(posts.posts);
      // TODO: dispatch INCREASE_POST_VISIBILITY action
      // TODO: dispatch PREFETCH_POSTS_FOR_CHANNEL if prefetch
      // TODO: dispatch RECEIVED_POSTS_FOR_CHANNEL_AT_TIME if atLatestMessage

      return {
        posts,
        recentPosts,
        users,
        userStatuses,
        atLatestMessage,
        atOldestMessage,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load unread posts",
      });
    }
  },
);

// Keep old implementation for reference - TODO: Remove after verification
export const loadUnreadsOld = createAsyncThunk(
  "entities/loadUnreadsOld",
  async (channelId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const timeStart = Date.now();

      // Get last viewed at timestamp from channel member
      const member = state.entities.channels.myMembers[channelId];
      const lastViewedAt = member?.last_viewed_at;

      if (!lastViewedAt) {
        // No last viewed, load latest posts instead - EXACT Mattermost behavior
        const response = (await client.getPosts(
          channelId,
          0,
          60,
        )) as PaginatedPostList;

        const posts = response.posts || {};
        const order = response.order || [];

        // Extract unique user IDs from posts
        const userIds = new Set<string>();
        Object.values(posts).forEach((post: Post) => {
          userIds.add(post.user_id);
        });

        // Load missing user profiles
        const { users: missingUsers, userStatuses } = await loadMissingUsers(
          Array.from(userIds),
          state.entities.users.profiles,
        );


        return {
          channelId,
          posts,
          order,
          users: missingUsers,
          userStatuses,
          atLatestMessage: true,
          atOldestMessage: !response.has_next,
          contextual: true,
        };
      }

      // Load posts since last viewed - EXACT Mattermost pattern
      const response = (await client.getPostsSince(
        channelId,
        lastViewedAt,
      )) as PaginatedPostList;

      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      console.log(
        `[loadUnreads] Loaded ${order.length} posts since ${lastViewedAt} in ${Date.now() - timeStart}ms`,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        lastViewedAt,
        atLatestMessage: order.length < 60, // Less than full batch means we're at latest
        atOldestMessage: false,
        contextual: true,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load unread posts",
      });
    }
  },
);

/**
 * Load latest posts (Mattermost specialized action) - EXACT Mattermost pattern
 */
export const loadLatestPosts = createAsyncThunk(
  "entities/loadLatestPosts",
  async (channelId: string, { getState, rejectWithValue }) => {
    if (!channelId) {
      return rejectWithValue("channelId is required");
    }
    try {
      const state = getState() as { entities: EntitiesState };
      const timeStart = Date.now();

      const response = (await client.getPosts(
        channelId,
        0,
        60,
      )) as PaginatedPostList;

      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      console.log(
        `[loadLatestPosts] Loaded latest ${order.length} posts in ${Date.now() - timeStart}ms`,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        atLatestMessage: true, // Always true for latest posts
        atOldestMessage: !response.has_next,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load latest posts",
      });
    }
  },
);

/**
 * Sync posts in channel (Mattermost specialized action) - EXACT Mattermost pattern
 */
export const syncPostsInChannel = createAsyncThunk(
  "entities/syncPostsInChannel",
  async (
    { channelId, since }: { channelId: string; since: number },
    { getState, rejectWithValue },
  ) => {
    if (!channelId) {
      return rejectWithValue("channelId is required");
    }
    
    const state = getState() as { entities: EntitiesState };
    
    // Éviter syncPostsInChannel si loadUnreads est en cours
    const pagination = state.entities.posts.channelPagination[channelId];
    if (pagination?.isLoading) {
      return rejectWithValue("loadUnreads in progress");
    }
    
    try {
      const timeStart = Date.now();

      const response = (await client.getPostsSince(
        channelId,
        since,
      )) as PaginatedPostList;

      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      console.log(
        `[syncPostsInChannel] Synced ${order.length} posts since ${since} in ${Date.now() - timeStart}ms`,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        hasNext: false, // Sync always goes to latest
        hasPrev: false,
        nextPostId: null,
        prevPostId: null,
        since,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        since,
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync posts in channel",
      });
    }
  },
);

/**
 * Load posts after a specific post (pagination forward)
 */
export const loadPostsAfter = createAsyncThunk(
  "entities/loadPostsAfter",
  async (
    {
      channelId,
      postId,
      perPage = 60,
    }: { channelId: string; postId: string; perPage?: number },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };

      // EXACT Mattermost pattern: Prevent multiple calls if already loading newer posts
      const pagination = state.entities.posts.channelPagination[channelId];
      if (pagination?.isLoadingNewer) {
        return rejectWithValue({
          channelId,
          postId,
          error: "Already loading newer posts",
        });
      }

      const response = (await client.getPostsAfter(
        channelId,
        postId,
        0,
        perPage,
      )) as PaginatedPostList;

      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles using existing function
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        channelId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        hasNext: response.has_next || false,
        hasPrev: !!response.prev_post_id,
        nextPostId: response.next_post_id || null,
        prevPostId: response.prev_post_id || null,
        direction: "after" as const,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        postId,
        error:
          error instanceof Error ? error.message : "Failed to load posts after",
      });
    }
  },
);

/**
 * Load posts for a thread (replies)
 */
export const loadPostThread = createAsyncThunk(
  "entities/loadPostThread",
  async (
    { postId, fetchThreads = true }: { postId: string; fetchThreads?: boolean },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const response = (await client.getPostThread(
        postId,
        fetchThreads,
      )) as PostList;

      const posts = response.posts || {};
      const order = response.order || [];

      // Extract unique user IDs from posts
      const userIds = new Set<string>();
      Object.values(posts).forEach((post: Post) => {
        userIds.add(post.user_id);
      });

      // Load missing user profiles using existing function
      const { users: missingUsers, userStatuses } = await loadMissingUsers(
        Array.from(userIds),
        state.entities.users.profiles,
      );

      return {
        postId,
        posts,
        order,
        users: missingUsers,
        userStatuses,
        rootId: postId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        error:
          error instanceof Error ? error.message : "Failed to load post thread",
      });
    }
  },
);

/**
 * Create a new post (send message)
 */
export const createPost = createAsyncThunk(
  "entities/createPost",
  async (
    {
      channelId,
      message,
      rootId,
      fileIds,
    }: {
      channelId: string;
      message: string;
      rootId?: string;
      fileIds?: string[];
    },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ channelId, error: "No current user" });
      }

      const postData = {
        channel_id: channelId,
        message,
        root_id: rootId || "",
        file_ids: fileIds || [],
        user_id: currentUserId,
        create_at: Date.now(),
        update_at: Date.now(),
      };

      const response = await client.createPost(postData);

      return {
        post: response,
        channelId,
        isReply: !!rootId,
      };
    } catch (error) {
      return rejectWithValue({
        channelId,
        error: error instanceof Error ? error.message : "Failed to create post",
      });
    }
  },
);

/**
 * Update an existing post (edit message)
 */
export const updatePost = createAsyncThunk(
  "entities/updatePost",
  async (
    { postId, message }: { postId: string; message: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const existingPost = state.entities.posts.posts[postId];

      if (!existingPost) {
        return rejectWithValue({ postId, error: "Post not found" });
      }

      const updatedPost = {
        ...existingPost,
        message,
        update_at: Date.now(),
        edit_at: Date.now(),
      };

      const response = await client.updatePost(updatedPost);

      return {
        post: response,
        postId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        error: error instanceof Error ? error.message : "Failed to update post",
      });
    }
  },
);

/**
 * Delete a post
 */
export const deletePost = createAsyncThunk(
  "entities/deletePost",
  async ({ postId }: { postId: string }, { rejectWithValue }) => {
    try {
      await client.deletePost(postId);

      return { postId };
    } catch (error) {
      return rejectWithValue({
        postId,
        error: error instanceof Error ? error.message : "Failed to delete post",
      });
    }
  },
);

/**
 * Add reaction to a post
 */
export const addReaction = createAsyncThunk(
  "entities/addReaction",
  async (
    { postId, emojiName }: { postId: string; emojiName: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ postId, error: "No current user" });
      }

      const reaction = {
        user_id: currentUserId,
        post_id: postId,
        emoji_name: emojiName,
        create_at: Date.now(),
      };

      const response = await client.addReaction(
        currentUserId,
        postId,
        emojiName,
      );

      return {
        reaction: response,
        postId,
        emojiName,
        userId: currentUserId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        emojiName,
        error:
          error instanceof Error ? error.message : "Failed to add reaction",
      });
    }
  },
);

/**
 * Remove reaction from a post
 */
export const removeReaction = createAsyncThunk(
  "entities/removeReaction",
  async (
    { postId, emojiName }: { postId: string; emojiName: string },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;

      if (!currentUserId) {
        return rejectWithValue({ postId, error: "No current user" });
      }

      await client.removeReaction(currentUserId, postId, emojiName);

      return {
        postId,
        emojiName,
        userId: currentUserId,
      };
    } catch (error) {
      return rejectWithValue({
        postId,
        emojiName,
        error:
          error instanceof Error ? error.message : "Failed to remove reaction",
      });
    }
  },
);

export const toggleReaction = createAsyncThunk(
  "entities/toggleReaction",
  async (
    { postId, emojiName }: { postId: string; emojiName: string },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      const post = state.entities.posts.posts[postId];

      if (!currentUserId) {
        return rejectWithValue({ postId, error: "No current user" });
      }

      if (!post) {
        return rejectWithValue({ postId, error: "Post not found" });
      }

      // Vérifier si l'utilisateur a déjà réagi avec cet emoji
      const userHasReacted = !!post.metadata?.reactions?.find(
        (r) => r.emoji_name === emojiName && r.user_id === currentUserId,
      );

      if (userHasReacted) {
        // Supprimer la réaction
        await dispatch(removeReaction({ postId, emojiName })).unwrap();
        return {
          postId,
          emojiName,
          userId: currentUserId,
          action: "removed" as const,
        };
      } else {
        // Ajouter la réaction
        await dispatch(addReaction({ postId, emojiName })).unwrap();
        return {
          postId,
          emojiName,
          userId: currentUserId,
          action: "added" as const,
        };
      }
    } catch (error) {
      return rejectWithValue({
        postId,
        emojiName,
        error:
          error instanceof Error ? error.message : "Failed to toggle reaction",
      });
    }
  },
);

// ============================================================================
// ENTITIES STATE STRUCTURE
// ============================================================================

// Entities State Structure inspired by mattermost-redux
export interface EntitiesState {
  users: {
    currentUserId: string;
    profiles: Record<string, UserProfile>;
    profilesInChannel: Record<string, string[]>;
    statuses: Record<string, UserStatus>;
  };
  teams: {
    currentTeamId: string;
    teams: Record<string, Team>;
    myMembers: Record<string, TeamMember>;
    membersInTeam: Record<string, Record<string, TeamMember>>; // teamId -> { userId -> TeamMember }
    unreads: Record<string, { msg_count: number; mention_count: number }>;
    stats: Record<string, TeamStats>;
  };
  channels: {
    currentChannelId: string;
    channels: Record<string, Channel>;
    myMembers: Record<string, ChannelMember>;
    membersInChannel: Record<string, Record<string, ChannelMember>>; // channelId -> { userId -> ChannelMember }
    channelsInTeam: Record<string, string[]>;
    unreads: Record<string, { msg_count: number; mention_count: number }>;
    memberCounts: Record<string, number>; // channelId -> member count
    categories: Record<string, ChannelCategory>; // category_id -> ChannelCategory
    categoriesInTeam: Record<string, string[]>; // team_id -> category_ids (in order)
    categoryOrder: Record<string, string[]>; // team_id -> category_ids (user's custom order)
  };
  posts: {
    posts: Record<string, Post>;
    postsInThread: Record<string, string[]>;
    // EXACT Mattermost structure - ARRAY de PostOrderBlocks
    postsInChannel: Record<string, PostOrderBlock[]>;
    // Metadata séparée pour les états de loading
    channelPagination: Record<
      string,
      {
        hasOlderPosts: boolean;
        hasNewerPosts: boolean;
        oldestPostId: string | null;
        newestPostId: string | null;
        isLoading: boolean;
        isLoadingOlder: boolean;
        isLoadingNewer: boolean;
        lastLoadedAt: number;
        // Mattermost-like additional state
        newMessageLineIndex: number | null;
        focusedPostId: string | null;
        atBottom: boolean;
        isScrolling: boolean;
        scrollToIndex: number | null;
        error: string | null;
      }
    >;
  };
}

const initialState: EntitiesState = {
  users: {
    currentUserId: "",
    profiles: {},
    profilesInChannel: {},
    statuses: {},
  },
  teams: {
    currentTeamId: "",
    teams: {},
    myMembers: {},
    membersInTeam: {},
    unreads: {},
    stats: {},
  },
  channels: {
    currentChannelId: "",
    channels: {},
    myMembers: {},
    membersInChannel: {},
    channelsInTeam: {},
    unreads: {},
    memberCounts: {},
    categories: {},
    categoriesInTeam: {},
    categoryOrder: {},
  },
  posts: {
    posts: {},
    postsInThread: {},
    postsInChannel: {}, // EXACT Mattermost: arrays de PostOrderBlocks
    channelPagination: {}, // Metadata de loading seulement
  },
};

const entitiesSlice = createSlice({
  name: "entities",
  initialState,
  reducers: {
    // Users
    setCurrentUserId: (state, action: PayloadAction<string>) => {
      state.users.currentUserId = action.payload;
    },
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.users.profiles[action.payload.id] = action.payload;

      // If this is the current user, update localStorage for persistence
      if (state.users.currentUserId === action.payload.id) {
        try {
          localStorage.setItem(
            "mattermostUser",
            JSON.stringify(action.payload),
          );
        } catch (error) {
          console.warn("Failed to update user in localStorage:", error);
        }
      }
    },
    setUsers: (state, action: PayloadAction<UserProfile[]>) => {
      action.payload.forEach((user) => {
        state.users.profiles[user.id] = user;
      });
    },
    setUserStatus: (state, action: PayloadAction<UserStatus>) => {
      state.users.statuses[action.payload.user_id] = action.payload;
    },
    setUsersInChannel: (
      state,
      action: PayloadAction<{ channelId: string; userIds: string[] }>,
    ) => {
      state.users.profilesInChannel[action.payload.channelId] =
        action.payload.userIds;
    },
    setUsersStatus: (
      state,
      action: PayloadAction<Record<string, UserStatus>>,
    ) => {
      Object.assign(state.users.statuses, action.payload);
    },

    // Teams
    setCurrentTeamId: (state, action: PayloadAction<string>) => {
      state.teams.currentTeamId = action.payload;
    },
    setTeam: (state, action: PayloadAction<Team>) => {
      state.teams.teams[action.payload.id] = action.payload;
    },
    updateTeam: (
      state,
      action: PayloadAction<Partial<Team> & { id: string }>,
    ) => {
      const teamId = action.payload.id;
      if (state.teams.teams[teamId]) {
        Object.assign(state.teams.teams[teamId], action.payload);
      }
    },
    setTeams: (state, action: PayloadAction<Team[] | Record<string, Team>>) => {
      if (Array.isArray(action.payload)) {
        action.payload.forEach((team) => {
          state.teams.teams[team.id] = team;
        });
      } else {
        // Handle normalized object format
        Object.assign(state.teams.teams, action.payload);
      }
    },
    setTeamMember: (state, action: PayloadAction<TeamMember>) => {
      state.teams.myMembers[action.payload.team_id] = action.payload;
    },
    setTeamMembers: (
      state,
      action: PayloadAction<Record<string, TeamMember>>,
    ) => {
      Object.assign(state.teams.myMembers, action.payload);
    },
    setTeamUnreads: (
      state,
      action: PayloadAction<
        Record<string, { msg_count: number; mention_count: number }>
      >,
    ) => {
      Object.assign(state.teams.unreads, action.payload);
    },
    incrementTeamUnreadCount: (
      state,
      action: PayloadAction<{
        teamId: string;
        msgCount?: number;
        mentionCount?: number;
      }>,
    ) => {
      const { teamId, msgCount = 1, mentionCount = 0 } = action.payload;

      if (!state.teams.unreads[teamId]) {
        state.teams.unreads[teamId] = { msg_count: 0, mention_count: 0 };
      }

      // Increment/decrement msg_count (can be negative for decrementing)
      state.teams.unreads[teamId].msg_count = Math.max(
        0,
        state.teams.unreads[teamId].msg_count + msgCount,
      );

      // Increment/decrement mention_count (can be negative for decrementing)
      state.teams.unreads[teamId].mention_count = Math.max(
        0,
        state.teams.unreads[teamId].mention_count + mentionCount,
      );
    },
    resetTeamUnreadCount: (state, action: PayloadAction<string>) => {
      const teamId = action.payload;
      if (state.teams.unreads[teamId]) {
        state.teams.unreads[teamId] = { msg_count: 0, mention_count: 0 };
      }
    },
    updateTeamMemberRole: (
      state,
      action: PayloadAction<{ teamId: string; userId: string; roles: string }>,
    ) => {
      const { teamId, userId, roles } = action.payload;
      if (
        state.teams.myMembers[teamId] &&
        state.teams.myMembers[teamId].user_id === userId
      ) {
        state.teams.myMembers[teamId].roles = roles;
      }
    },
    removeUserFromTeamAction: (
      state,
      action: PayloadAction<{ teamId: string; userId: string }>,
    ) => {
      const { teamId, userId } = action.payload;

      // Remove from my team memberships if it's me
      if (
        state.teams.myMembers[teamId] &&
        state.teams.myMembers[teamId].user_id === userId
      ) {
        delete state.teams.myMembers[teamId];
      }

      // Remove from team members list (this was missing!)
      if (state.teams.membersInTeam[teamId]) {
        delete state.teams.membersInTeam[teamId][userId];
      }
    },

    // Team Stats
    setTeamStats: (
      state,
      action: PayloadAction<{ teamId: string; stats: TeamStats }>,
    ) => {
      const { teamId, stats } = action.payload;
      state.teams.stats[teamId] = stats;
    },
    incrementTeamMemberCount: (state, action: PayloadAction<string>) => {
      const teamId = action.payload;
      if (state.teams.stats[teamId]) {
        state.teams.stats[teamId].total_member_count += 1;
        state.teams.stats[teamId].active_member_count += 1;
      }
    },
    decrementTeamMemberCount: (state, action: PayloadAction<string>) => {
      const teamId = action.payload;
      if (state.teams.stats[teamId]) {
        state.teams.stats[teamId].total_member_count = Math.max(
          0,
          state.teams.stats[teamId].total_member_count - 1,
        );
        state.teams.stats[teamId].active_member_count = Math.max(
          0,
          state.teams.stats[teamId].active_member_count - 1,
        );
      }
    },
    // Bulk operations for better performance
    adjustTeamMemberCount: (
      state,
      action: PayloadAction<{ teamId: string; count: number }>,
    ) => {
      const { teamId, count } = action.payload;
      if (state.teams.stats[teamId]) {
        state.teams.stats[teamId].total_member_count = Math.max(
          0,
          state.teams.stats[teamId].total_member_count + count,
        );
        state.teams.stats[teamId].active_member_count = Math.max(
          0,
          state.teams.stats[teamId].active_member_count + count,
        );
      }
    },

    // Channels
    setCurrentChannelId: (state, action: PayloadAction<string>) => {
      state.channels.currentChannelId = action.payload;
    },
    setChannel: (state, action: PayloadAction<Channel>) => {
      state.channels.channels[action.payload.id] = action.payload;
    },
    setChannels: (
      state,
      action: PayloadAction<Channel[] | Record<string, Channel>>,
    ) => {
      if (Array.isArray(action.payload)) {
        action.payload.forEach((channel) => {
          state.channels.channels[channel.id] = channel;
        });
      } else {
        Object.assign(state.channels.channels, action.payload);
      }
    },
    setChannelMember: (state, action: PayloadAction<ChannelMember>) => {
      state.channels.myMembers[action.payload.channel_id] = action.payload;
    },
    setChannelsInTeam: (
      state,
      action: PayloadAction<{ teamId: string; channelIds: string[] }>,
    ) => {
      state.channels.channelsInTeam[action.payload.teamId] =
        action.payload.channelIds;
    },
    addChannelToTeam: (
      state,
      action: PayloadAction<{ teamId: string; channelId: string }>,
    ) => {
      const { teamId, channelId } = action.payload;
      if (!state.channels.channelsInTeam[teamId]) {
        state.channels.channelsInTeam[teamId] = [];
      }
      if (!state.channels.channelsInTeam[teamId].includes(channelId)) {
        state.channels.channelsInTeam[teamId].push(channelId);
      }
    },
    removeChannelFromTeam: (
      state,
      action: PayloadAction<{ teamId: string; channelId: string }>,
    ) => {
      const { teamId, channelId } = action.payload;
      if (state.channels.channelsInTeam[teamId]) {
        state.channels.channelsInTeam[teamId] = state.channels.channelsInTeam[
          teamId
        ].filter((id) => id !== channelId);
      }
    },
    setChannelUnread: (
      state,
      action: PayloadAction<{
        channelId: string;
        msg_count: number;
        mention_count: number;
      }>,
    ) => {
      const { channelId, msg_count, mention_count } = action.payload;
      state.channels.unreads[channelId] = { msg_count, mention_count };
    },
    setChannelUnreads: (
      state,
      action: PayloadAction<
        Record<string, { msg_count: number; mention_count: number }>
      >,
    ) => {
      Object.assign(state.channels.unreads, action.payload);
    },
    // WebSocket event 'posted' handler - exactly like Mattermost
    incrementChannelUnreadCount: (
      state,
      action: PayloadAction<{
        channelId: string;
        msgCount?: number;
        mentionCount?: number;
        fromCurrentUser?: boolean;
      }>,
    ) => {
      const {
        channelId,
        msgCount = 1,
        mentionCount = 0,
        fromCurrentUser = false,
      } = action.payload;

      // Don't increment for current user's own messages (Mattermost behavior)
      if (fromCurrentUser) return;

      if (!state.channels.unreads[channelId]) {
        state.channels.unreads[channelId] = { msg_count: 0, mention_count: 0 };
      }

      // Always increment msg_count for new messages
      state.channels.unreads[channelId].msg_count += msgCount;

      // Only increment mention_count if the message contains mentions
      if (mentionCount > 0) {
        state.channels.unreads[channelId].mention_count += mentionCount;
      }
    },

    // WebSocket event 'channel_viewed' handler - exactly like Mattermost
    resetChannelUnreadCount: (state, action: PayloadAction<string>) => {
      const channelId = action.payload;
      if (state.channels.unreads[channelId]) {
        state.channels.unreads[channelId] = { msg_count: 0, mention_count: 0 };
      }
    },

    // Posts
    setPost: (state, action: PayloadAction<Post>) => {
      const post = action.payload;
      state.posts.posts[post.id] = post;

      // Add to channel posts - EXACT Mattermost pattern with PostOrderBlocks
      if (!state.posts.postsInChannel[post.channel_id]) {
        state.posts.postsInChannel[post.channel_id] = [];
      }

      const chunks = state.posts.postsInChannel[post.channel_id];
      let recentChunk = chunks.find((chunk) => chunk.recent);

      // Create recent chunk if none exists
      if (!recentChunk) {
        recentChunk = { order: [], recent: true, oldest: chunks.length === 0 };
        chunks.push(recentChunk);
      }

      // Add post if not already present
      if (!recentChunk.order.includes(post.id)) {
        recentChunk.order.unshift(post.id); // newest first
      }

      // Add to thread if it's a reply
      if (post.root_id) {
        if (!state.posts.postsInThread[post.root_id]) {
          state.posts.postsInThread[post.root_id] = [];
        }
        if (!state.posts.postsInThread[post.root_id].includes(post.id)) {
          state.posts.postsInThread[post.root_id].push(post.id);
        }
      }
    },
    setPosts: (
      state,
      action: PayloadAction<{ channelId: string; posts: Post[] }>,
    ) => {
      const { channelId, posts } = action.payload;

      posts.forEach((post) => {
        state.posts.posts[post.id] = post;
      });

      // Store posts as single recent chunk - EXACT Mattermost pattern
      state.posts.postsInChannel[channelId] = [
        {
          order: posts.map((p) => p.id),
          recent: true,
          oldest: true,
        },
      ];
    },
    removePost: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      const post = state.posts.posts[postId];

      if (post) {
        // Remove from channel - EXACT Mattermost pattern with PostOrderBlocks
        if (state.posts.postsInChannel[post.channel_id]) {
          state.posts.postsInChannel[post.channel_id].forEach((chunk) => {
            chunk.order = chunk.order.filter((id) => id !== postId);
          });
          // Remove empty chunks
          state.posts.postsInChannel[post.channel_id] =
            state.posts.postsInChannel[post.channel_id].filter(
              (chunk) => chunk.order.length > 0,
            );
        }

        // Remove from thread
        if (post.root_id && state.posts.postsInThread[post.root_id]) {
          state.posts.postsInThread[post.root_id] = state.posts.postsInThread[
            post.root_id
          ].filter((id) => id !== postId);
        }

        delete state.posts.posts[postId];
      }
    },

    // Channel Categories (following Mattermost patterns)
    setChannelCategories: (
      state,
      action: PayloadAction<{
        teamId: string;
        categories: ChannelCategory[];
        order: string[];
      }>,
    ) => {
      const { teamId, categories, order } = action.payload;

      // Store categories by ID
      categories.forEach((category) => {
        state.channels.categories[category.id] = category;
      });

      // Store category IDs for team
      state.channels.categoriesInTeam[teamId] = categories.map((c) => c.id);

      // Store user's custom order
      state.channels.categoryOrder[teamId] = order;
    },

    updateChannelCategory: (state, action: PayloadAction<ChannelCategory>) => {
      const category = action.payload;
      state.channels.categories[category.id] = category;
    },

    reorderCategories: (
      state,
      action: PayloadAction<{ teamId: string; categoryOrder: string[] }>,
    ) => {
      const { teamId, categoryOrder } = action.payload;
      state.channels.categoryOrder[teamId] = categoryOrder;
    },

    // Simple favorites toggle (Mattermost pattern)
    toggleChannelFavorite: (
      state,
      action: PayloadAction<{
        channelId: string;
        teamId: string;
        isFavorite: boolean;
      }>,
    ) => {
      const { channelId, teamId, isFavorite } = action.payload;

      // Find favorites category for this team
      const favoritesCategory = Object.values(state.channels.categories).find(
        (cat) => cat.team_id === teamId && cat.type === "favorites",
      );

      if (favoritesCategory) {
        if (isFavorite) {
          // Add to favorites if not already there
          if (!favoritesCategory.channel_ids.includes(channelId)) {
            favoritesCategory.channel_ids.push(channelId);
          }
        } else {
          // Remove from favorites
          favoritesCategory.channel_ids = favoritesCategory.channel_ids.filter(
            (id) => id !== channelId,
          );
        }
      }
    },

    // Toggle category collapsed state (Mattermost pattern)
    toggleCategoryCollapsed: (
      state,
      action: PayloadAction<{ categoryId: string; isCollapsed: boolean }>,
    ) => {
      const { categoryId, isCollapsed } = action.payload;

      if (state.channels.categories[categoryId]) {
        state.channels.categories[categoryId].collapsed = isCollapsed;
      }
    },

    // Posts Scroll & Navigation Actions (Mattermost-like)
    setChannelScrollPosition: (
      state,
      action: PayloadAction<{
        channelId: string;
        atBottom: boolean;
        isScrolling: boolean;
      }>,
    ) => {
      const { channelId, atBottom, isScrolling } = action.payload;

      if (!state.posts.channelPagination[channelId]) {
        state.posts.channelPagination[channelId] = {
          hasOlderPosts: false,
          hasNewerPosts: false,
          oldestPostId: null,
          newestPostId: null,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: 0,
          newMessageLineIndex: null,
          focusedPostId: null,
          atBottom: true,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };
      }

      state.posts.channelPagination[channelId].atBottom = atBottom;
      state.posts.channelPagination[channelId].isScrolling = isScrolling;
    },

    setNewMessageLineIndex: (
      state,
      action: PayloadAction<{ channelId: string; index: number | null }>,
    ) => {
      const { channelId, index } = action.payload;

      if (!state.posts.channelPagination[channelId]) {
        state.posts.channelPagination[channelId] = {
          hasOlderPosts: false,
          hasNewerPosts: false,
          oldestPostId: null,
          newestPostId: null,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: 0,
          newMessageLineIndex: null,
          focusedPostId: null,
          atBottom: true,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };
      }

      state.posts.channelPagination[channelId].newMessageLineIndex = index;
    },

    setFocusedPost: (
      state,
      action: PayloadAction<{ channelId: string; postId: string | null }>,
    ) => {
      const { channelId, postId } = action.payload;

      if (!state.posts.channelPagination[channelId]) {
        state.posts.channelPagination[channelId] = {
          hasOlderPosts: false,
          hasNewerPosts: false,
          oldestPostId: null,
          newestPostId: null,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: 0,
          newMessageLineIndex: null,
          focusedPostId: null,
          atBottom: true,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };
      }

      state.posts.channelPagination[channelId].focusedPostId = postId;
    },

    setScrollToIndex: (
      state,
      action: PayloadAction<{ channelId: string; index: number | null }>,
    ) => {
      const { channelId, index } = action.payload;

      if (!state.posts.channelPagination[channelId]) {
        state.posts.channelPagination[channelId] = {
          hasOlderPosts: false,
          hasNewerPosts: false,
          oldestPostId: null,
          newestPostId: null,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: 0,
          newMessageLineIndex: null,
          focusedPostId: null,
          atBottom: true,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };
      }

      state.posts.channelPagination[channelId].scrollToIndex = index;
    },

    // Clear actions
    clearCurrentUser: (state) => {
      state.users.currentUserId = "";
      state.users.profiles = {};
      state.users.profilesInChannel = {};
      state.users.statuses = {};
    },
    clearEntities: () => initialState,
  },

  // Handle async thunks
  extraReducers: (builder) => {
    builder
      .addCase(loadChannelsForTeam.fulfilled, (state, action) => {
        const {
          teamId,
          channels,
          members,
          users,
          userStatuses,
          unreads,
          groupChannelData,
          skipped,
        } = action.payload;

        if (skipped) {
          // Data already loaded, no action needed
          return;
        }

        // Normalize and store members
        members?.forEach((member: ChannelMember) => {
          state.channels.myMembers[member.channel_id] = member;
        });

        // Store initial unreads calculated from channel/member data
        if (unreads) {
          Object.assign(state.channels.unreads, unreads);
        }

        // Store users and statuses using extracted function
        storeUsersAndStatuses(state, users, userStatuses);

        // Store group channel data if available
        if (groupChannelData) {
          const { profilesByChannelId, memberCounts } = groupChannelData;

          // Store the member counts for each channel
          Object.assign(state.channels.memberCounts, memberCounts);

          // Store user profiles in channel mapping
          Object.entries(profilesByChannelId).forEach(
            ([channelId, profiles]) => {
              state.users.profilesInChannel[channelId] = profiles.map(
                (p) => p.id,
              );
            },
          );
        }

        // Store all channel IDs for this team (API already filters group channels by membership)
        const channelIds: string[] = [];
        channels?.forEach((channel: Channel) => {
          state.channels.channels[channel.id] = channel;
          channelIds.push(channel.id);
        });

        // Store channel IDs for this team
        state.channels.channelsInTeam[teamId] = channelIds;
      })
      .addCase(loadChannelsForTeam.rejected, (state, action) => {
        console.error("Failed to load channels for team:", action.payload);
      })
      // Add single channel thunk
      .addCase(addSingleChannelToTeam.fulfilled, (state, action) => {
        const {
          teamId,
          channel,
          member,
          users,
          userStatuses,
          unreadData,
          groupChannelData,
        } = action.payload;
        const currentUserId = state.users.currentUserId;

        // Store channel (ADD to existing team's channel list)
        state.channels.channels[channel.id] = channel;
        if (!state.channels.channelsInTeam[teamId]) {
          state.channels.channelsInTeam[teamId] = [];
        }
        if (!state.channels.channelsInTeam[teamId].includes(channel.id)) {
          state.channels.channelsInTeam[teamId].push(channel.id);
        }

        // Store member in membersInChannel (always)
        if (!state.channels.membersInChannel[channel.id]) {
          state.channels.membersInChannel[channel.id] = {};
        }
        state.channels.membersInChannel[channel.id][member.user_id] = member;

        // Store in myMembers only if it's the current user
        if (member.user_id === currentUserId) {
          state.channels.myMembers[channel.id] = member;
        }

        // Store unread data
        if (unreadData) {
          state.channels.unreads[channel.id] = unreadData;
        }

        // Add to appropriate category
        const categoryType =
          channel.type === "D" || channel.type === "G"
            ? "direct_messages"
            : "channels";
        const category = Object.values(state.channels.categories).find(
          (cat) => cat.team_id === teamId && cat.type === categoryType,
        );
        if (category && !category.channel_ids.includes(channel.id)) {
          category.channel_ids.push(channel.id);
        }

        // Store users and statuses using extracted function
        storeUsersAndStatuses(state, users, userStatuses);

        // Store group channel data if available
        if (groupChannelData) {
          const { profilesByChannelId, memberCounts } = groupChannelData;

          // Store the member counts for each channel
          Object.assign(state.channels.memberCounts, memberCounts);

          // Store user profiles in channel mapping
          Object.entries(profilesByChannelId).forEach(
            ([channelId, profiles]) => {
              state.users.profilesInChannel[channelId] = profiles.map(
                (p) => p.id,
              );
            },
          );
        }
      })
      .addCase(addSingleChannelToTeam.rejected, (state, action) => {
        console.error("Failed to add single channel to team:", action.payload);
      })
      // Channel categories thunks
      .addCase(loadChannelCategories.fulfilled, (state, action) => {
        const { teamId, categories, order } = action.payload;

        // Store categories by ID
        categories.forEach((category) => {
          state.channels.categories[category.id] = category;
        });

        // Store category IDs for team
        state.channels.categoriesInTeam[teamId] = categories.map((c) => c.id);

        // Store user's custom order
        state.channels.categoryOrder[teamId] = order;
      })
      .addCase(loadChannelCategories.rejected, (state, action) => {
        console.error("Failed to load channel categories:", action.payload);
      })
      // Team members thunks
      .addCase(loadTeamMembers.fulfilled, (state, action) => {
        const { teamId, members, skipped } = action.payload;

        // Skip if already loaded
        if (skipped) {
          return;
        }

        // Store members in team
        const membersObj: Record<string, TeamMember> = {};
        (members || []).forEach((member) => {
          membersObj[member.user_id] = member;
        });
        state.teams.membersInTeam[teamId] = membersObj;
      })
      .addCase(loadTeamMembers.rejected, (state, action) => {
        console.error("Failed to load team members:", action.payload);
      })
      // Team user profiles thunk
      .addCase(loadTeamUserProfiles.fulfilled, (state, action) => {
        const { profiles } = action.payload;

        // Store user profiles in users.profiles
        (profiles || []).forEach((profile) => {
          state.users.profiles[profile.id] = profile;
        });
      })
      .addCase(loadTeamUserProfiles.rejected, (state, action) => {
        console.error("Failed to load team user profiles:", action.payload);
      })
      // Channel members thunks
      .addCase(loadChannelMembers.fulfilled, (state, action) => {
        const { channelId, members, skipped } = action.payload;

        // Skip if already loaded
        if (skipped) {
          return;
        }

        // Store members in channel
        const membersObj: Record<string, ChannelMember> = {};
        (members || []).forEach((member) => {
          membersObj[member.user_id] = member;
        });
        state.channels.membersInChannel[channelId] = membersObj;
      })
      .addCase(loadChannelMembers.rejected, (state, action) => {
        console.error("Failed to load channel members:", action.payload);
      })
      .addCase(updateChannelCategoriesAction.fulfilled, (state, action) => {
        const { categories } = action.payload;

        // Update categories in store
        categories.forEach((category) => {
          state.channels.categories[category.id] = category;
        });
      })
      .addCase(updateChannelCategoriesAction.rejected, (state, action) => {
        console.error("Failed to update channel categories:", action.payload);
      })
      // Mute channel thunk
      .addCase(muteChannelAction.fulfilled, (state, action) => {
        const { channelId, userId, muted } = action.payload;

        // Update notify_props in channel member (membersInChannel)
        if (state.channels.membersInChannel[channelId]?.[userId]) {
          if (
            !state.channels.membersInChannel[channelId][userId].notify_props
          ) {
            state.channels.membersInChannel[channelId][userId].notify_props =
              {};
          }
          state.channels.membersInChannel[channelId][
            userId
          ].notify_props.mark_unread = muted ? "mention" : "all";
        }

        // ALSO update myMembers (what the selector reads from)
        if (
          state.channels.myMembers[channelId] &&
          state.channels.myMembers[channelId].user_id === userId
        ) {
          if (!state.channels.myMembers[channelId].notify_props) {
            state.channels.myMembers[channelId].notify_props = {};
          }
          state.channels.myMembers[channelId].notify_props.mark_unread = muted
            ? "mention"
            : "all";
        }
      })
      .addCase(muteChannelAction.rejected, (state, action) => {
        console.error("Failed to mute channel:", action.payload);
      })
      // Leave channel thunk
      .addCase(leaveChannelAction.fulfilled, (state, action) => {
        const { channelId, userId } = action.payload;

        // Remove from channel members
        if (state.channels.membersInChannel[channelId]) {
          delete state.channels.membersInChannel[channelId][userId];
        }

        // If current user is leaving, remove from team's channel list
        if (userId === state.users.currentUserId) {
          // Find which team this channel belongs to and remove it
          Object.keys(state.channels.channelsInTeam).forEach((teamId) => {
            state.channels.channelsInTeam[teamId] =
              state.channels.channelsInTeam[teamId].filter(
                (id) => id !== channelId,
              );
          });

          // Also remove from categories
          Object.values(state.channels.categories).forEach((category) => {
            category.channel_ids = category.channel_ids.filter(
              (id) => id !== channelId,
            );
          });

          // Note: Channel switching will be handled in the hook using selectChannelByRules
          // We don't modify currentChannelId here to respect separation of concerns
        }
      })
      .addCase(leaveChannelAction.rejected, (state, action) => {
        console.error("Failed to leave channel:", action.payload);
      })
      // Posts/Messages thunks
      .addCase(loadPostsAroundLastUnread.pending, (state, action) => {
        const { channelId } = action.meta.arg;

        // Set loading state for contextual loading
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: false,
            hasNewerPosts: false,
            oldestPostId: null,
            newestPostId: null,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: 0,
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: true,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        }
        state.posts.channelPagination[channelId].isLoading = true;
      })
      .addCase(loadPostsAroundLastUnread.fulfilled, (state, action) => {
        const {
          channelId,
          posts,
          order,
          users,
          userStatuses,
          hasNext,
          hasPrev,
          nextPostId,
          prevPostId,
          contextual,
        } = action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Store posts order for channel (newest first - Mattermost pattern)
        const sortedOrder = [...order].sort((a, b) => {
          const postA = posts[a];
          const postB = posts[b];
          return postB.create_at - postA.create_at; // newest first
        });

        // Create chunk - EXACT Mattermost pattern with PostOrderBlock[]
        state.posts.postsInChannel[channelId] = [
          {
            order: sortedOrder,
            recent: !hasNext, // recent = true quand hasNext = false
            oldest: !hasPrev, // oldest = true quand hasPrev = false
          },
        ];

        // Update pagination metadata for contextual loading
        const pagination = state.posts.channelPagination[channelId] || {
          hasOlderPosts: false,
          hasNewerPosts: false,
          oldestPostId: null,
          newestPostId: null,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: 0,
          newMessageLineIndex: null,
          focusedPostId: null,
          atBottom: true,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };

        pagination.hasOlderPosts = hasPrev;
        pagination.hasNewerPosts = hasNext;
        pagination.oldestPostId = prevPostId;
        pagination.newestPostId = nextPostId;
        pagination.isLoading = false;
        pagination.lastLoadedAt = Date.now();

        // For contextual loading, determine if we should scroll to unread divider
        if (contextual) {
          // Calculate unread divider position
          const member = state.channels.myMembers[channelId];
          const lastViewedAt = member?.last_viewed_at;

          if (lastViewedAt && order.length > 0) {
            const unreadIndex = order.findIndex((postId) => {
              const post = posts[postId];
              return post && post.create_at > lastViewedAt;
            });

            if (unreadIndex !== -1) {
              pagination.newMessageLineIndex = unreadIndex;
              pagination.scrollToIndex = unreadIndex;
              pagination.atBottom = false;
            }
          }
        }

        state.posts.channelPagination[channelId] = pagination;

        // Store users and statuses using existing function
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPostsAroundLastUnread.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error(
          "Failed to load posts around last unread:",
          action.payload,
        );

        // Reset loading state and set error
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoading = false;
          state.posts.channelPagination[channelId].error =
            (action.payload as string) ||
            "Failed to load posts around last unread";
        }
      })
      .addCase(loadPostsAround.pending, (state, action) => {
        const { channelId } = action.meta.arg;

        state.posts.channelPagination[channelId].isLoading = true;
      })
      .addCase(loadPostsAround.fulfilled, (state, action) => {
        const { channelId } = action.meta.arg;
        const { posts, atLatestMessage, atOldestMessage, users, userStatuses } =
          action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts.posts);

        // EXACT Mattermost pattern: Replace posts order for permalink/focused post loading
        state.posts.postsInChannel[channelId] = [
          {
            order: posts.order,
            recent: atLatestMessage,
            oldest: atOldestMessage,
          },
        ];

        // Update pagination metadata - EXACT Mattermost pattern
        state.posts.channelPagination[channelId] = {
          hasOlderPosts: !atOldestMessage,
          hasNewerPosts: !atLatestMessage,
          oldestPostId: posts.prev_post_id,
          newestPostId: posts.next_post_id,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: Date.now(),
          newMessageLineIndex: null,
          focusedPostId: action.meta.arg.focusedPostId, // Mark the focused post
          atBottom: atLatestMessage,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };

        // Store user profiles and statuses
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPostsAround.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error(
          "Failed to load posts around focused post:",
          action.payload,
        );

        // Reset loading state
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoading = false;
        }
      })
      .addCase(syncPostsInChannel.pending, (state, action) => {
        const { channelId } = action.meta.arg;

        // Set loading state for sync
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: true,
            hasNewerPosts: true,
            oldestPostId: null,
            newestPostId: null,
            isLoading: true,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: Date.now(),
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: false,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        } else {
          state.posts.channelPagination[channelId].isLoading = true;
        }
      })
      .addCase(syncPostsInChannel.fulfilled, (state, action) => {
        const {
          channelId,
          posts,
          order,
          users,
          userStatuses,
          hasNext,
          hasPrev,
          nextPostId,
          prevPostId,
        } = action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Merge new posts with existing ones (since this is a sync operation) - EXACT Mattermost pattern
        const existingChunks = state.posts.postsInChannel[channelId] || [];

        if (existingChunks.length > 0) {
          // Find the recent chunk
          let recentChunk =
            existingChunks.find((chunk) => chunk.recent) || existingChunks[0];

          // Add new posts to the recent chunk
          order.forEach((postId) => {
            if (!recentChunk.order.includes(postId)) {
              recentChunk.order.unshift(postId); // newest first
            }
          });
        } else {
          // Create new chunk with synced posts
          state.posts.postsInChannel[channelId] = [
            {
              order: [...order].sort((a, b) => {
                const postA = posts[a];
                const postB = posts[b];
                return postB.create_at - postA.create_at; // newest first
              }),
              recent: !hasNext,
              oldest: !hasPrev,
            },
          ];
        }

        // Update pagination metadata
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: !hasPrev,
            hasNewerPosts: !hasNext,
            oldestPostId: prevPostId,
            newestPostId: nextPostId,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: Date.now(),
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: true, // Usually sync brings us to latest
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        } else {
          state.posts.channelPagination[channelId] = {
            ...state.posts.channelPagination[channelId],
            hasNewerPosts: !hasNext,
            newestPostId: nextPostId,
            isLoading: false,
            lastLoadedAt: Date.now(),
            error: null,
          };
        }

        // Store user profiles and statuses
        users.forEach((user: UserProfile) => {
          state.users.profiles[user.id] = user;
        });
        Object.assign(state.users.statuses, userStatuses);
      })
      .addCase(syncPostsInChannel.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error("Failed to sync posts in channel:", action.payload);

        // Reset loading state
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoading = false;
        }
      })
      .addCase(loadPostsForChannel.pending, (state, action) => {
        const { channelId } = action.meta.arg;

        // Set loading state
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: false,
            hasNewerPosts: false,
            oldestPostId: null,
            newestPostId: null,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: 0,
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: true,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        }
        state.posts.channelPagination[channelId].isLoading = true;
      })
      .addCase(loadPostsForChannel.fulfilled, (state, action) => {
        const {
          channelId,
          posts,
          order,
          users,
          userStatuses,
          hasNext,
          hasPrev,
          nextPostId,
          prevPostId,
        } = action.payload as {
          channelId: string;
          posts: Record<string, Post>;
          order: string[];
          users: UserProfile[];
          userStatuses: Record<string, UserStatus>;
          hasNext: boolean;
          hasPrev: boolean;
          nextPostId: string | null;
          prevPostId: string | null;
          page?: number;
          perPage?: number;
        };

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Store posts order for channel - EXACT Mattermost pattern
        state.posts.postsInChannel[channelId] = [
          {
            order,
            recent: !hasNext, // recent = true quand hasNext = false
            oldest: !hasPrev, // oldest = true quand hasPrev = false
          },
        ];

        // Update pagination metadata
        state.posts.channelPagination[channelId] = {
          hasOlderPosts: hasPrev,
          hasNewerPosts: hasNext,
          oldestPostId: prevPostId,
          newestPostId: nextPostId,
          isLoading: false,
          isLoadingOlder: false,
          isLoadingNewer: false,
          lastLoadedAt: Date.now(),
          newMessageLineIndex: null,
          focusedPostId: null,
          atBottom: true,
          isScrolling: false,
          scrollToIndex: null,
          error: null,
        };

        // Store users and statuses using existing function
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPostsForChannel.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error("Failed to load posts for channel:", action.payload);

        // Reset loading state
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoading = false;
        }
      })
      .addCase(loadPostsBefore.pending, (state, action) => {
        const { channelId } = action.meta.arg;

        // Set loading older posts flag - EXACT Mattermost pattern
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: false,
            hasNewerPosts: false,
            oldestPostId: null,
            newestPostId: null,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: 0,
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: false,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        }
        state.posts.channelPagination[channelId].isLoadingOlder = true;
      })
      .addCase(loadPostsBefore.fulfilled, (state, action) => {
        const {
          channelId,
          posts,
          order,
          users,
          userStatuses,
          hasNext,
          hasPrev,
          nextPostId,
          prevPostId,
        } = action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Get existing chunks or create new ones - EXACT Mattermost pattern
        const existingChunks = state.posts.postsInChannel[channelId] || [];

        if (existingChunks.length > 0) {
          // Find the oldest chunk (with oldest: true or last chunk)
          let oldestChunk =
            existingChunks.find((chunk) => chunk.oldest) ||
            existingChunks[existingChunks.length - 1];

          // Merge posts with deduplication - exact Mattermost pattern
          const existingPostIds = new Set(oldestChunk.order);
          const newPostIds = order.filter(
            (postId) => !existingPostIds.has(postId),
          );
          const combinedOrder = [...oldestChunk.order, ...newPostIds];

          // Sort by create_at to ensure proper chronological order
          const sortedOrder = combinedOrder.sort((a, b) => {
            const postA = state.posts.posts[a];
            const postB = state.posts.posts[b];
            if (!postA || !postB) return 0;
            return postB.create_at - postA.create_at; // newest first
          });

          // Update the oldest chunk
          oldestChunk.order = sortedOrder;
          oldestChunk.oldest = !hasPrev; // oldest = true quand hasPrev = false
        } else {
          // Create new chunk - EXACT Mattermost pattern
          const sortedOrder = order.sort((a, b) => {
            const postA = posts[a];
            const postB = posts[b];
            return postB.create_at - postA.create_at; // newest first
          });

          state.posts.postsInChannel[channelId] = [
            {
              order: sortedOrder,
              recent: !hasNext, // recent = true quand hasNext = false
              oldest: !hasPrev, // oldest = true quand hasPrev = false
            },
          ];
        }

        // Update pagination metadata (loading older posts)
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoading = false;
          state.posts.channelPagination[channelId].isLoadingOlder = false;
        }

        // Store users and statuses using existing function
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPostsBefore.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error("Failed to load posts before:", action.payload);

        // Reset loading older posts flag - EXACT Mattermost pattern
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoadingOlder = false;
        }
      })
      .addCase(loadPostsAfter.pending, (state, action) => {
        const { channelId } = action.meta.arg;

        // Set loading newer posts flag - EXACT Mattermost pattern
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: false,
            hasNewerPosts: false,
            oldestPostId: null,
            newestPostId: null,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: 0,
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: false,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        }
        state.posts.channelPagination[channelId].isLoadingNewer = true;
      })
      .addCase(loadPostsAfter.fulfilled, (state, action) => {
        const {
          channelId,
          posts,
          order,
          users,
          userStatuses,
          hasNext,
          hasPrev,
          nextPostId,
          prevPostId,
        } = action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Get existing chunks or create new ones - EXACT Mattermost pattern
        const existingChunks = state.posts.postsInChannel[channelId] || [];

        if (existingChunks.length > 0) {
          // Find the recent chunk (with recent: true or first chunk)
          let recentChunk =
            existingChunks.find((chunk) => chunk.recent) || existingChunks[0];

          // Merge newer posts with deduplication - exact Mattermost pattern
          const existingPostIds = new Set(recentChunk.order);

          // Only add new posts that don't already exist (reverse order for newer posts)
          const newPostIds = order
            .reverse()
            .filter((postId) => !existingPostIds.has(postId));

          // Combine new posts (at beginning) with existing posts
          const combinedOrder = [...newPostIds, ...recentChunk.order];

          // Sort by create_at to ensure proper chronological order - exact Mattermost pattern
          const sortedOrder = combinedOrder.sort((a, b) => {
            const postA = state.posts.posts[a];
            const postB = state.posts.posts[b];
            if (!postA || !postB) return 0;
            return postB.create_at - postA.create_at; // newest first
          });

          // Update the recent chunk
          recentChunk.order = sortedOrder;
          recentChunk.recent = !hasNext; // recent = true quand hasNext = false
        } else {
          // Create new chunk - EXACT Mattermost pattern
          const sortedOrder = order.reverse().sort((a, b) => {
            const postA = state.posts.posts[a];
            const postB = state.posts.posts[b];
            if (!postA || !postB) return 0;
            return postB.create_at - postA.create_at; // newest first
          });

          state.posts.postsInChannel[channelId] = [
            {
              order: sortedOrder,
              recent: !hasNext, // recent = true quand hasNext = false
              oldest: !hasPrev, // oldest = true quand hasPrev = false
            },
          ];
        }

        // Update pagination metadata (loading newer posts)
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].hasNewerPosts = hasNext;
          state.posts.channelPagination[channelId].newestPostId = nextPostId;
          state.posts.channelPagination[channelId].isLoading = false;
          state.posts.channelPagination[channelId].isLoadingNewer = false;
        }

        // Store users and statuses using existing function
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPostsAfter.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error("Failed to load posts after:", action.payload);

        // Reset loading newer posts flag - EXACT Mattermost pattern
        if (state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId].isLoadingNewer = false;
        }
      })
      .addCase(loadPostThread.fulfilled, (state, action) => {
        const { postId, posts, order, users, userStatuses } = action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Store thread order
        state.posts.postsInThread[postId] = order;

        // Store users and statuses using existing function
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPostThread.rejected, (state, action) => {
        console.error("Failed to load post thread:", action.payload);
      })
      .addCase(loadPosts.pending, (state, action) => {
        const { channelId, type } = action.meta.arg;

        // Set appropriate loading state - EXACT Mattermost pattern
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: true,
            hasNewerPosts: false,
            oldestPostId: null,
            newestPostId: null,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: 0,
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: true,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        }

        // Set loading state based on direction
        if (type === "BEFORE_ID") {
          state.posts.channelPagination[channelId].isLoadingOlder = true;
        } else {
          state.posts.channelPagination[channelId].isLoadingNewer = true;
        }
      })
      .addCase(loadPosts.fulfilled, (state, action) => {
        const { channelId, posts, order, users, userStatuses, direction } =
          action.payload;
        const { type } = action.meta.arg;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Get existing chunks or create new ones - EXACT Mattermost pattern
        const existingChunks = state.posts.postsInChannel[channelId] || [];

        if (existingChunks.length > 0) {
          if (direction === "before") {
            // Find the oldest chunk (with oldest: true or last chunk)
            let oldestChunk =
              existingChunks.find((chunk) => chunk.oldest) ||
              existingChunks[existingChunks.length - 1];

            // Merge posts with deduplication - exact Mattermost pattern
            const existingPostIds = new Set(oldestChunk.order);
            const newPostIds = order.filter(
              (postId) => !existingPostIds.has(postId),
            );
            const combinedOrder = [...oldestChunk.order, ...newPostIds];

            // Sort by create_at to ensure proper chronological order
            const sortedOrder = combinedOrder.sort((a, b) => {
              const postA = state.posts.posts[a];
              const postB = state.posts.posts[b];
              if (!postA || !postB) return 0;
              return postB.create_at - postA.create_at; // newest first
            });

            // Update the oldest chunk
            oldestChunk.order = sortedOrder;
            oldestChunk.oldest = !action.payload.hasPrev;
          } else {
            // Find the recent chunk (with recent: true or first chunk)
            let recentChunk =
              existingChunks.find((chunk) => chunk.recent) || existingChunks[0];

            // Merge newer posts with deduplication - exact Mattermost pattern
            const existingPostIds = new Set(recentChunk.order);
            const newPostIds = order
              .reverse()
              .filter((postId) => !existingPostIds.has(postId));
            const combinedOrder = [...newPostIds, ...recentChunk.order];

            // Sort by create_at to ensure proper chronological order
            const sortedOrder = combinedOrder.sort((a, b) => {
              const postA = state.posts.posts[a];
              const postB = state.posts.posts[b];
              if (!postA || !postB) return 0;
              return postB.create_at - postA.create_at; // newest first
            });

            // Update the recent chunk
            recentChunk.order = sortedOrder;
            recentChunk.recent = !action.payload.hasNext;
          }
        } else {
          // Create new chunk - EXACT Mattermost pattern
          const sortedOrder = [...order].sort((a, b) => {
            const postA = posts[a];
            const postB = posts[b];
            return postB.create_at - postA.create_at; // newest first
          });

          state.posts.postsInChannel[channelId] = [
            {
              order: sortedOrder,
              recent: !action.payload.hasNext,
              oldest: !action.payload.hasPrev,
            },
          ];
        }

        // Update pagination metadata
        if (state.posts.channelPagination[channelId]) {
          if (type === "BEFORE_ID") {
            state.posts.channelPagination[channelId].isLoadingOlder = false;
            state.posts.channelPagination[channelId].hasOlderPosts =
              action.payload.hasPrev;
            state.posts.channelPagination[channelId].oldestPostId =
              action.payload.prevPostId;
          } else {
            state.posts.channelPagination[channelId].isLoadingNewer = false;
            state.posts.channelPagination[channelId].hasNewerPosts =
              action.payload.hasNext;
            state.posts.channelPagination[channelId].newestPostId =
              action.payload.nextPostId;
          }
          state.posts.channelPagination[channelId].isLoading = false;
          state.posts.channelPagination[channelId].lastLoadedAt = Date.now();
        }

        // Store users and statuses using existing function
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadPosts.rejected, (state, action) => {
        const { channelId, type } = action.meta.arg;
        console.error("Failed to load posts:", action.payload);

        // Reset loading states
        if (state.posts.channelPagination[channelId]) {
          if (type === "BEFORE_ID") {
            state.posts.channelPagination[channelId].isLoadingOlder = false;
          } else {
            state.posts.channelPagination[channelId].isLoadingNewer = false;
          }
          state.posts.channelPagination[channelId].isLoading = false;
          state.posts.channelPagination[channelId].error =
            (action.payload as string) || "Failed to load posts";
        }
      })
      .addCase(loadUnreads.pending, (state, action) => {
        const channelId = action.meta.arg;
        
        // Initialize pagination if not exists
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: false,
            hasNewerPosts: false,
            oldestPostId: "",
            newestPostId: "",
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: 0,
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: true,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        }
        
        // Mark as loading unreads
        state.posts.channelPagination[channelId].isLoading = true;
        state.posts.channelPagination[channelId].error = null;
      })
      .addCase(loadUnreads.fulfilled, (state, action) => {
        const channelId = action.meta.arg;
        const {
          posts,
          recentPosts,
          users,
          userStatuses,
          atLatestMessage,
          atOldestMessage,
        } = action.payload;

        // Store posts in normalized storage - EXACT Mattermost pattern
        Object.assign(state.posts.posts, posts.posts);

        // If we have recent posts too, store them as well
        if (recentPosts) {
          Object.assign(state.posts.posts, recentPosts.posts);
        }

        // EXACT Mattermost pattern: Create posts order for unread loading
        // Note: Mattermost may merge posts and recentPosts order here
        let finalOrder = posts.order;

        if (recentPosts && recentPosts.order.length > 0) {
          // Merge orders avoiding duplicates - recentPosts should be newer
          const existingIds = new Set(posts.order);
          const newPostIds = recentPosts.order.filter(
            (id) => !existingIds.has(id),
          );
          finalOrder = [...newPostIds, ...posts.order];
        }

        state.posts.postsInChannel[channelId] = [
          {
            order: finalOrder,
            recent: recentPosts
              ? recentPosts.next_post_id === ""
              : atLatestMessage,
            oldest: atOldestMessage,
          },
        ];

        // Update pagination metadata - EXACT Mattermost pattern
        const finalAtLatest = recentPosts
          ? recentPosts.next_post_id === ""
          : atLatestMessage;

        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: !atOldestMessage,
            hasNewerPosts: !finalAtLatest,
            oldestPostId: posts.prev_post_id,
            newestPostId: recentPosts?.next_post_id || posts.next_post_id,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: Date.now(),
            newMessageLineIndex: null, // Will be calculated based on unread position
            focusedPostId: null,
            atBottom: finalAtLatest,
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        } else {
          const pagination = state.posts.channelPagination[channelId];
          pagination.hasOlderPosts = !atOldestMessage;
          pagination.hasNewerPosts = !finalAtLatest;
          pagination.oldestPostId = posts.prev_post_id;
          pagination.newestPostId =
            recentPosts?.next_post_id || posts.next_post_id;
          pagination.isLoading = false;
          pagination.lastLoadedAt = Date.now();
          pagination.atBottom = finalAtLatest;
          pagination.error = null;
        }

        // Store users and statuses
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(getPostsUnread.fulfilled, (state, action) => {
        const { channelId } = action.meta.arg;
        const { posts, recentPosts, users, userStatuses } = action.payload;

        // Store posts in normalized storage - EXACT Mattermost pattern
        Object.assign(state.posts.posts, posts.posts);

        if (recentPosts) {
          Object.assign(state.posts.posts, recentPosts.posts);
        }

        // Store users and statuses
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(getPostsUnread.rejected, (state, action) => {
        const { channelId } = action.meta.arg;
        console.error("Failed to get posts unread:", action.payload);
      })
      .addCase(loadUnreads.rejected, (state, action) => {
        console.error("Failed to load unread posts:", action.payload);
      })
      .addCase(loadLatestPosts.fulfilled, (state, action) => {
        const {
          channelId,
          posts,
          order,
          users,
          userStatuses,
          atLatestMessage,
          atOldestMessage,
        } = action.payload;

        // Store posts in normalized storage
        Object.assign(state.posts.posts, posts);

        // Create or replace chunk with latest posts - EXACT Mattermost pattern
        const sortedOrder = [...order].sort((a, b) => {
          const postA = posts[a];
          const postB = posts[b];
          return postB.create_at - postA.create_at; // newest first
        });

        state.posts.postsInChannel[channelId] = [
          {
            order: sortedOrder,
            recent: true, // Always true for latest posts
            oldest: atOldestMessage,
          },
        ];

        // Update pagination metadata
        if (!state.posts.channelPagination[channelId]) {
          state.posts.channelPagination[channelId] = {
            hasOlderPosts: !atOldestMessage,
            hasNewerPosts: false, // Always false for latest
            oldestPostId: sortedOrder[sortedOrder.length - 1] || null,
            newestPostId: sortedOrder[0] || null,
            isLoading: false,
            isLoadingOlder: false,
            isLoadingNewer: false,
            lastLoadedAt: Date.now(),
            newMessageLineIndex: null,
            focusedPostId: null,
            atBottom: true, // Always at bottom for latest
            isScrolling: false,
            scrollToIndex: null,
            error: null,
          };
        } else {
          const pagination = state.posts.channelPagination[channelId];
          pagination.hasOlderPosts = !atOldestMessage;
          pagination.hasNewerPosts = false;
          pagination.oldestPostId = sortedOrder[sortedOrder.length - 1] || null;
          pagination.newestPostId = sortedOrder[0] || null;
          pagination.isLoading = false;
          pagination.lastLoadedAt = Date.now();
          pagination.atBottom = true;
        }

        // Store users and statuses
        storeUsersAndStatuses(state, users, userStatuses);
      })
      .addCase(loadLatestPosts.rejected, (state, action) => {
        console.error("Failed to load latest posts:", action.payload);
      })
      .addCase(createPost.fulfilled, (state, action) => {
        const { post, channelId, isReply } = action.payload;

        // Store the post in normalized storage
        state.posts.posts[post.id] = post;

        if (isReply && post.root_id) {
          // Add to thread
          if (!state.posts.postsInThread[post.root_id]) {
            state.posts.postsInThread[post.root_id] = [];
          }
          state.posts.postsInThread[post.root_id].push(post.id);
        } else {
          // Add to channel - EXACT Mattermost pattern with PostOrderBlocks
          if (!state.posts.postsInChannel[channelId]) {
            state.posts.postsInChannel[channelId] = [];
          }

          const chunks = state.posts.postsInChannel[channelId];
          let recentChunk = chunks.find((chunk) => chunk.recent);

          // Create recent chunk if none exists
          if (!recentChunk) {
            recentChunk = {
              order: [],
              recent: true,
              oldest: chunks.length === 0,
            };
            chunks.push(recentChunk);
          }

          // Add new post at the beginning (newest first)
          recentChunk.order.unshift(post.id);

          // Update pagination metadata - new post means we're at the newest
          if (state.posts.channelPagination[channelId]) {
            state.posts.channelPagination[channelId].newestPostId = post.id;
            state.posts.channelPagination[channelId].hasNewerPosts = false;
          }
        }
      })
      .addCase(createPost.rejected, (state, action) => {
        console.error("Failed to create post:", action.payload);
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        const { post } = action.payload;

        // Update the post in normalized storage
        state.posts.posts[post.id] = post;
      })
      .addCase(updatePost.rejected, (state, action) => {
        console.error("Failed to update post:", action.payload);
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        const { postId } = action.payload;

        const deletedPost = state.posts.posts[postId];
        if (deletedPost) {
          // Remove from normalized storage
          delete state.posts.posts[postId];

          // Remove from channel posts - EXACT Mattermost pattern with PostOrderBlocks
          if (deletedPost.channel_id) {
            const chunks = state.posts.postsInChannel[deletedPost.channel_id];
            if (chunks) {
              chunks.forEach((chunk) => {
                chunk.order = chunk.order.filter((id) => id !== postId);
              });
              // Remove empty chunks
              state.posts.postsInChannel[deletedPost.channel_id] =
                chunks.filter((chunk) => chunk.order.length > 0);
            }
          }

          // Remove from thread posts
          if (deletedPost.root_id) {
            const threadPosts = state.posts.postsInThread[deletedPost.root_id];
            if (threadPosts) {
              state.posts.postsInThread[deletedPost.root_id] =
                threadPosts.filter((id) => id !== postId);
            }
          }
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        console.error("Failed to delete post:", action.payload);
      })
      .addCase(addReaction.fulfilled, (state, action) => {
        const { postId, emojiName, userId } = action.payload;

        const post = state.posts.posts[postId];
        if (post) {
          if (!post.metadata.reactions) {
            post.metadata.reactions = [];
          }

          const existingReactionIndex = post.metadata.reactions.findIndex(
            (r) => r.emoji_name === emojiName && r.user_id === userId,
          );
          if (existingReactionIndex === -1) {
            post.metadata.reactions.push({
              emoji_name: emojiName,
              user_id: userId,
              post_id: postId,
              create_at: Date.now(),
            });
          }
        }
      })
      .addCase(addReaction.rejected, (state, action) => {
        console.error("Failed to add reaction:", action.payload);
      })
      .addCase(removeReaction.fulfilled, (state, action) => {
        const { postId, emojiName, userId } = action.payload;

        const post = state.posts.posts[postId];
        if (post && post.metadata.reactions) {
          post.metadata.reactions = post.metadata.reactions.filter(
            (r) => !(r.emoji_name === emojiName && r.user_id === userId),
          );
        }
      })
      .addCase(removeReaction.rejected, (state, action) => {
        console.error("Failed to remove reaction:", action.payload);
      });
  },
});

export const {
  // Users
  setCurrentUserId,
  setUser,
  setUsers,
  setUserStatus,
  setUsersInChannel,
  setUsersStatus,

  // Teams
  setCurrentTeamId,
  setTeam,
  updateTeam,
  setTeams,
  setTeamMember,
  setTeamMembers,
  setTeamUnreads,
  incrementTeamUnreadCount,
  resetTeamUnreadCount,
  updateTeamMemberRole,
  removeUserFromTeamAction,

  // Team Stats
  setTeamStats,
  incrementTeamMemberCount,
  decrementTeamMemberCount,
  adjustTeamMemberCount,

  // Channels
  setCurrentChannelId,
  setChannel,
  setChannels,
  setChannelMember,
  setChannelsInTeam,
  addChannelToTeam,
  removeChannelFromTeam,
  setChannelUnread,
  setChannelUnreads,
  incrementChannelUnreadCount,
  resetChannelUnreadCount,

  // Channel Categories
  setChannelCategories,
  updateChannelCategory,
  reorderCategories,
  toggleChannelFavorite,
  toggleCategoryCollapsed,

  // Posts
  setPost,
  setPosts,
  removePost,

  // Scroll Management
  setChannelScrollPosition,
  setNewMessageLineIndex,
  setFocusedPost,
  setScrollToIndex,

  // Clear
  clearCurrentUser,
  clearEntities,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;
