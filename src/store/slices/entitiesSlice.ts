/**
 * Entities slice for managing normalized Mattermost data
 * Handles users, teams, channels, categories, and their relationships following official Mattermost patterns
 */
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import {
  UserProfile,
  Team,
  Channel,
  TeamMember,
  ChannelMember,
  UserStatus,
  TeamStats,
  ChannelCategory,
} from "../../api/types";
import { client } from "../../api/client";

// ============================================================================
// INTERNAL USER LOADING FUNCTIONS
// ============================================================================

/**
 * Load users from API and update store
 */
const loadUsers = async (userIds: string[], dispatch: any, getState: any): Promise<UserProfile[]> => {
  if (!userIds || userIds.length === 0) return [];

  const state = getState();
  const profiles = state.entities.users.profiles;

  // Filter out users we already have
  const missingUserIds = userIds.filter((id: string) => !profiles[id]);
  if (missingUserIds.length === 0) return [];

  
  // Use efficient batch loading (official Mattermost pattern)
  const users = await client.getProfilesByIds(missingUserIds);
  
  // Update store with all loaded users
  dispatch(setUsers(users || []));
  
  return users;
};

/**
 * Load user statuses from API and update store
 */
const loadStatus = async (userIds: string[], dispatch: any): Promise<Record<string, UserStatus>> => {
  if (!userIds || userIds.length === 0) return {};

  const validUserIds = userIds.filter(Boolean);
  const statuses = await client.getStatusesByIds(validUserIds);

  // Transform status array to Record<userId, UserStatus> and set in store
  const statusRecord: Record<string, UserStatus> = {};
  if (statuses && Array.isArray(statuses)) {
    statuses.forEach((status: UserStatus) => {
      statusRecord[status.user_id] = status;
    });
    dispatch(setUsersStatus(statusRecord));
  }
  
  return statusRecord;
};

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
      // Use the /schemeRoles endpoint like Mattermost
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
      const members = await client.getChannelMembers(channelId, 0, 200);

      // Extract user IDs and load their profiles if needed
      const userIds = (members || []).map((member) => member.user_id);
      // Load missing user profiles
      try {
        await loadUsers(userIds, dispatch, getState);
      } catch (userError) {
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
export const markChannelAsUnread = createAsyncThunk(
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
  getState: any,
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
    await loadStatus(missingStatusIds, dispatch);

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
  const { users: additionalUsers, userStatuses } =
    await loadMissingUsers(remainingUserIds, dispatch, getState);

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
  dispatch: any,
  getState: any,
): Promise<{
  users: UserProfile[];
  userStatuses: Record<string, UserStatus>;
}> => {
  // Load users (it handles filtering internally)
  const users = await loadUsers(userIdsToLoad, dispatch, getState);

  // Load statuses for the users that were actually loaded
  const validUserIds = users.map((user) => user.id);
  const userStatuses = await loadStatus(validUserIds, dispatch);

  return { users, userStatuses };
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
        getState,
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
        getState,
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

/**
 * Mark channel as read - API call + state updates
 */
export const markChannelAsRead = createAsyncThunk(
  "entities/markChannelAsRead",
  async (channelId: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const currentUserId = state.entities.users.currentUserId;
      const currentTeamId = state.entities.teams.currentTeamId;

      if (!currentUserId || !currentTeamId) {
        return rejectWithValue("Missing current user or team");
      }

      // Get current unread counts for this channel
      const currentUnreads = state.entities.channels.unreads[channelId];
      if (currentUnreads) {
        // Decrement team unreads by the amount this channel had (Mattermost pattern)
        dispatch(
          incrementTeamUnreadCount({
            teamId: currentTeamId,
            msgCount: -currentUnreads.msg_count, // negative to decrement
            mentionCount: -currentUnreads.mention_count, // negative to decrement
          }),
        );
      }

      // Call API to mark channel as read
      const response = await client.viewMyChannel(channelId);

      // Update channel member's last_viewed_at with the value returned by API
      const channelMember = state.entities.channels.myMembers[channelId];
      if (channelMember && response.last_viewed_at_times?.[channelId]) {
        dispatch(
          setChannelMember({
            ...channelMember,
            last_viewed_at: response.last_viewed_at_times[channelId],
          }),
        );
      }

      // Reset channel unread count
      dispatch(resetChannelUnreadCount(channelId));

      return { channelId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error",
      );
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
        }
      }
    },
    setUsers: (state, action: PayloadAction<UserProfile[]>) => {
      action.payload.forEach((user) => {
        state.users.profiles[user.id] = user;
      });
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
    setChannelMember: (state, action: PayloadAction<ChannelMember>) => {
      state.channels.myMembers[action.payload.channel_id] = action.payload;
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
      })
      .addCase(updateChannelCategoriesAction.fulfilled, (state, action) => {
        const { categories } = action.payload;

        // Update categories in store
        categories.forEach((category) => {
          state.channels.categories[category.id] = category;
        });
      })
      .addCase(updateChannelCategoriesAction.rejected, (state, action) => {
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
      });
  },
});

export const {
  // Users
  setCurrentUserId,
  setUser,
  setUsers,
  setUsersStatus,

  // Teams
  setCurrentTeamId,
  setTeam,
  updateTeam,
  setTeams,
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
  setChannelMember,
  addChannelToTeam,
  removeChannelFromTeam,
  setChannelUnreads,
  incrementChannelUnreadCount,
  resetChannelUnreadCount,

  // Channel Categories
  updateChannelCategory,
  reorderCategories,
  toggleChannelFavorite,
  toggleCategoryCollapsed,

  // Clear
  clearCurrentUser,
  clearEntities,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;
