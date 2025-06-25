import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserProfile, Team, Channel, Post, TeamMember, ChannelMember, UserStatus, TeamStats, ChannelCategory } from '../../api/types';
import { client } from '../../api/client';

// ============================================================================
// ASYNC THUNKS - Centralized Data Loading (Mattermost pattern)
// ============================================================================

/**
 * Update team member scheme roles (like Mattermost)
 */
export const updateTeamMemberRoles = createAsyncThunk(
  'entities/updateTeamMemberRoles',
  async ({ teamId, userId, isSchemeAdmin }: { teamId: string; userId: string; isSchemeAdmin: boolean }, { dispatch, rejectWithValue }) => {
    try {
      // Utilise l'endpoint /schemeRoles comme Mattermost
      await client.updateTeamMemberSchemeRoles(teamId, userId, true, isSchemeAdmin);
      
      // Calculate roles string for store update
      const roles = isSchemeAdmin ? 'team_admin team_user' : 'team_user';
      
      // Update store with new roles
      dispatch(updateTeamMemberRole({ teamId, userId, roles }));
      
      return { teamId, userId, roles };
    } catch (error) {
      return rejectWithValue({ teamId, userId, error: error instanceof Error ? error.message : 'Failed to update member roles' });
    }
  }
);

/**
 * Load user statuses by IDs with debounced batching (Mattermost pattern)
 */
export const loadUserStatuses = createAsyncThunk(
  'entities/loadUserStatuses',
  async (userIds: string[], { rejectWithValue }) => {
    try {
      if (userIds.length === 0) {
        return { statuses: [] };
      }

      console.log(`Loading statuses for ${userIds.length} users`);
      const statuses = await client.getStatusesByIds(userIds);
      
      return { statuses: statuses || [] };
    } catch (error) {
      return rejectWithValue({ userIds, error: error instanceof Error ? error.message : 'Failed to load user statuses' });
    }
  }
);

/**
 * Remove user from team
 */
export const removeUserFromTeam = createAsyncThunk(
  'entities/removeUserFromTeam',
  async ({ teamId, userId }: { teamId: string; userId: string }, { dispatch, rejectWithValue }) => {
    try {
      await client.removeFromTeam(teamId, userId);
      
      // Update store - remove user from team
      dispatch(removeUserFromTeamAction({ teamId, userId }));
      
      return { teamId, userId };
    } catch (error) {
      return rejectWithValue({ teamId, userId, error: error instanceof Error ? error.message : 'Failed to remove user from team' });
    }
  }
);

/**
 * Load channel categories for team (Mattermost pattern)
 */
export const loadChannelCategories = createAsyncThunk(
  'entities/loadChannelCategories',
  async (teamId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ teamId, error: 'No current user' });
      }

      // Single API call returns categories with order (Mattermost pattern)
      const categoriesResponse = await client.getChannelCategories(currentUserId, teamId);

      return {
        teamId,
        categories: categoriesResponse.categories,
        order: categoriesResponse.order
      };
    } catch (error) {
      return rejectWithValue({ teamId, error: error instanceof Error ? error.message : 'Failed to load channel categories' });
    }
  }
);

/**
 * Toggle channel favorite status (Mattermost pattern)  
 */
export const toggleChannelFavoriteAction = createAsyncThunk(
  'entities/toggleChannelFavorite',
  async ({ channelId, teamId, isFavorite }: { channelId: string; teamId: string; isFavorite: boolean }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ channelId, teamId, error: 'No current user' });
      }

      // Find favorites category (always exists in Mattermost)
      const favoritesCategory = Object.values(state.entities.channels.categories).find(
        cat => cat.team_id === teamId && cat.type === 'favorites'
      );

      if (!favoritesCategory) {
        return rejectWithValue({ channelId, teamId, error: 'Favorites category not found' });
      }

      // Update channel_ids array
      const updatedChannelIds = isFavorite 
        ? [...favoritesCategory.channel_ids.filter(id => id !== channelId), channelId]
        : favoritesCategory.channel_ids.filter(id => id !== channelId);

      const updatedCategory = {
        ...favoritesCategory,
        channel_ids: updatedChannelIds
      };

      // API call to update category
      await client.updateChannelCategory(currentUserId, teamId, updatedCategory);

      // Optimistic update
      dispatch(toggleChannelFavorite({ channelId, teamId, isFavorite }));

      return { channelId, teamId, isFavorite };
    } catch (error) {
      return rejectWithValue({ channelId, teamId, error: error instanceof Error ? error.message : 'Failed to toggle favorite' });
    }
  }
);

/**
 * Update channel categories (for drag & drop)
 */
export const updateChannelCategoriesAction = createAsyncThunk(
  'entities/updateChannelCategories',
  async ({ teamId, categories }: { teamId: string; categories: ChannelCategory[] }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ teamId, error: 'No current user' });
      }

      await client.updateChannelCategories(currentUserId, teamId, categories);
      
      return { teamId, categories };
    } catch (error) {
      return rejectWithValue({ teamId, error: error instanceof Error ? error.message : 'Failed to update categories' });
    }
  }
);

/**
 * Reorder channel categories (for drag & drop)
 */
export const reorderCategoriesAction = createAsyncThunk(
  'entities/reorderCategories',
  async ({ teamId, categoryOrder }: { teamId: string; categoryOrder: string[] }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ teamId, error: 'No current user' });
      }

      // API call to update category order
      await client.updateChannelCategoryOrder(currentUserId, teamId, categoryOrder);
      
      // Optimistic update
      dispatch(reorderCategories({ teamId, categoryOrder }));
      
      return { teamId, categoryOrder };
    } catch (error) {
      return rejectWithValue({ teamId, error: error instanceof Error ? error.message : 'Failed to reorder categories' });
    }
  }
);

/**
 * Toggle channel category collapsed state (Mattermost pattern)
 */
export const toggleCategoryCollapsedAction = createAsyncThunk(
  'entities/toggleCategoryCollapsed',
  async ({ categoryId, isCollapsed }: { categoryId: string; isCollapsed: boolean }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ categoryId, error: 'No current user' });
      }

      const category = state.entities.channels.categories[categoryId];
      if (!category) {
        return rejectWithValue({ categoryId, error: 'Category not found' });
      }

      // Create updated category with new collapsed state
      const updatedCategory = {
        ...category,
        collapsed: isCollapsed
      };

      // API call to update category
      await client.updateChannelCategory(currentUserId, category.team_id, updatedCategory);
      
      // Optimistic update
      dispatch(toggleCategoryCollapsed({ categoryId, isCollapsed }));
      
      return { categoryId, isCollapsed };
    } catch (error) {
      return rejectWithValue({ categoryId, error: error instanceof Error ? error.message : 'Failed to toggle category collapsed state' });
    }
  }
);

/**
 * Mark channel as unread (Mattermost pattern)
 */
export const markChannelAsUnreadAction = createAsyncThunk(
  'entities/markChannelAsUnread',
  async ({ channelId }: { channelId: string }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ channelId, error: 'No current user' });
      }

      // Get the latest posts in the channel to find the most recent one
      const posts = await client.getPosts(channelId, 0, 1);
      
      if (!posts.posts || Object.keys(posts.posts).length === 0) {
        return rejectWithValue({ channelId, error: 'No posts found in channel' });
      }

      // Get the latest post ID
      const latestPostId = posts.order[0];
      
      // Mark channel as unread from this post
      const channelUnread = await client.markPostAsUnread(currentUserId, latestPostId);
      
      // Update local store with the returned unread counts
      dispatch(setChannelUnreads({ 
        [channelId]: { 
          msg_count: channelUnread.msg_count, 
          mention_count: channelUnread.mention_count 
        } 
      }));
      
      return { channelId, channelUnread };
    } catch (error) {
      return rejectWithValue({ channelId, error: error instanceof Error ? error.message : 'Failed to mark channel as unread' });
    }
  }
);

/**
 * Move channel to another category (Mattermost pattern)
 */
export const moveChannelToCategoryAction = createAsyncThunk(
  'entities/moveChannelToCategory',
  async ({ channelId, fromCategoryId, toCategoryId }: { channelId: string; fromCategoryId: string; toCategoryId: string }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ channelId, error: 'No current user' });
      }

      const fromCategory = state.entities.channels.categories[fromCategoryId];
      const toCategory = state.entities.channels.categories[toCategoryId];

      if (!fromCategory || !toCategory) {
        return rejectWithValue({ channelId, error: 'Category not found' });
      }

      // Remove channel from source category
      const updatedFromCategory = {
        ...fromCategory,
        channel_ids: fromCategory.channel_ids.filter(id => id !== channelId)
      };

      // Add channel to destination category
      const updatedToCategory = {
        ...toCategory,
        channel_ids: [...toCategory.channel_ids, channelId]
      };

      // API call to update both categories
      await client.updateChannelCategories(currentUserId, fromCategory.team_id, [
        updatedFromCategory,
        updatedToCategory
      ]);
      
      // Optimistic updates
      dispatch(updateChannelCategory(updatedFromCategory));
      dispatch(updateChannelCategory(updatedToCategory));
      
      return { channelId, fromCategoryId, toCategoryId };
    } catch (error) {
      return rejectWithValue({ channelId, error: error instanceof Error ? error.message : 'Failed to move channel to category' });
    }
  }
);

/**
 * Reorder channels within a category (Mattermost pattern)
 */
export const reorderChannelsAction = createAsyncThunk(
  'entities/reorderChannels',
  async ({ categoryId, newChannelOrder }: { categoryId: string; newChannelOrder: string[] }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { entities: EntitiesState };
      const currentUserId = state.entities.users.currentUserId;
      
      if (!currentUserId) {
        return rejectWithValue({ categoryId, error: 'No current user' });
      }

      const category = state.entities.channels.categories[categoryId];
      if (!category) {
        return rejectWithValue({ categoryId, error: 'Category not found' });
      }

      // Update category with new channel order
      const updatedCategory = {
        ...category,
        channel_ids: newChannelOrder
      };

      // API call to update category
      await client.updateChannelCategory(currentUserId, category.team_id, updatedCategory);
      
      // Optimistic update
      dispatch(updateChannelCategory(updatedCategory));
      
      return { categoryId, newChannelOrder };
    } catch (error) {
      return rejectWithValue({ categoryId, error: error instanceof Error ? error.message : 'Failed to reorder channels' });
    }
  }
);

/**
 * Load channels for specific team with store verification
 * Only fetches if channels not already loaded for this team
 */
export const loadChannelsForTeam = createAsyncThunk(
  'entities/loadChannelsForTeam',
  async (teamId: string, { getState, rejectWithValue }) => {
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
        client.getMyChannelMembers(teamId)
      ]);

      // Find users needed for direct/group channels
      const currentUserId = state.entities.users.currentUserId;
      const userIdsToLoad = new Set<string>();
      
      teamChannels.forEach((channel: Channel) => {
        if (channel.type === 'D' && currentUserId) {
          // For direct channels, extract other user ID
          const userIds = channel.name.split('__');
          const otherUserId = userIds.find(id => id !== currentUserId);
          if (otherUserId) {
            userIdsToLoad.add(otherUserId);
          }
        } else if (channel.type === 'G') {
          // For group channels, extract all user IDs from channel name
          // Group channel names follow format: user1__user2__user3
          const userIds = channel.name.split('__');
          userIds.forEach(id => {
            if (id && id !== currentUserId) {
              userIdsToLoad.add(id);
            }
          });
        }
      });

      // Load missing users if any
      let missingUsers: UserProfile[] = [];
      let missingUserStatuses: Record<string, UserStatus> = {};
      
      if (userIdsToLoad.size > 0) {
        const existingUserIds = Object.keys(state.entities.users.profiles);
        const missingUserIds = Array.from(userIdsToLoad).filter(id => !existingUserIds.includes(id));
        
        if (missingUserIds.length > 0) {
          console.log(`Loading ${missingUserIds.length} missing users and their statuses for direct/group channels`);
          
          // First load users (this works with invalid IDs)
          const users = await client.getProfilesByIds(missingUserIds);
          missingUsers = users;
          
          // Then load statuses using only the valid user IDs returned from getProfilesByIds
          if (users && users.length > 0) {
            const validUserIds = users.map(user => user.id);
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

      // Calculate initial unreads from channel/member data (Mattermost pattern)
      const initialUnreads: Record<string, { msg_count: number; mention_count: number }> = {};
      
      teamChannels.forEach((channel: Channel) => {
        const membership = myChannelMembers.find((member: ChannelMember) => member.channel_id === channel.id);
        
        if (membership) {
          const channelTotalMsg = (channel as any).total_msg_count || 0;
          const memberMsgCount = membership.msg_count || 0;
          const memberMentionCount = membership.mention_count || 0;
          
          // Calculate unread count: channel total - member read count
          const unreadMsgCount = Math.max(0, channelTotalMsg - memberMsgCount);
          
          initialUnreads[channel.id] = {
            msg_count: unreadMsgCount,
            mention_count: memberMentionCount
          };
        }
      });

      return {
        teamId,
        channels: teamChannels,
        members: myChannelMembers,
        users: missingUsers,
        userStatuses: missingUserStatuses,
        unreads: initialUnreads,
        skipped: false
      };
    } catch (error) {
      return rejectWithValue({ teamId, error: error instanceof Error ? error.message : 'Failed to load channels' });
    }
  }
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
    unreads: Record<string, { msg_count: number; mention_count: number }>;
    stats: Record<string, TeamStats>;
  };
  channels: {
    currentChannelId: string;
    channels: Record<string, Channel>;
    myMembers: Record<string, ChannelMember>;
    channelsInTeam: Record<string, string[]>;
    unreads: Record<string, { msg_count: number; mention_count: number }>;
    categories: Record<string, ChannelCategory>; // category_id -> ChannelCategory
    categoriesInTeam: Record<string, string[]>; // team_id -> category_ids (in order)
    categoryOrder: Record<string, string[]>; // team_id -> category_ids (user's custom order)
  };
  posts: {
    posts: Record<string, Post>;
    postsInChannel: Record<string, string[]>;
    postsInThread: Record<string, string[]>;
  };
}

const initialState: EntitiesState = {
  users: {
    currentUserId: '',
    profiles: {},
    profilesInChannel: {},
    statuses: {},
  },
  teams: {
    currentTeamId: '',
    teams: {},
    myMembers: {},
    unreads: {},
    stats: {},
  },
  channels: {
    currentChannelId: '',
    channels: {},
    myMembers: {},
    channelsInTeam: {},
    unreads: {},
    categories: {},
    categoriesInTeam: {},
    categoryOrder: {},
  },
  posts: {
    posts: {},
    postsInChannel: {},
    postsInThread: {},
  },
};

const entitiesSlice = createSlice({
  name: 'entities',
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
          localStorage.setItem('mattermostUser', JSON.stringify(action.payload));
        } catch (error) {
          console.warn('Failed to update user in localStorage:', error);
        }
      }
    },
    setUsers: (state, action: PayloadAction<UserProfile[]>) => {
      action.payload.forEach(user => {
        state.users.profiles[user.id] = user;
      });
    },
    setUserStatus: (state, action: PayloadAction<UserStatus>) => {
      state.users.statuses[action.payload.user_id] = action.payload;
    },
    setUsersInChannel: (state, action: PayloadAction<{ channelId: string; userIds: string[] }>) => {
      state.users.profilesInChannel[action.payload.channelId] = action.payload.userIds;
    },
    setUsersStatus: (state, action: PayloadAction<Record<string, UserStatus>>) => {
      Object.assign(state.users.statuses, action.payload);
    },

    // Teams
    setCurrentTeamId: (state, action: PayloadAction<string>) => {
      state.teams.currentTeamId = action.payload;
    },
    setTeam: (state, action: PayloadAction<Team>) => {
      state.teams.teams[action.payload.id] = action.payload;
    },
    updateTeam: (state, action: PayloadAction<Partial<Team> & { id: string }>) => {
      const teamId = action.payload.id;
      if (state.teams.teams[teamId]) {
        Object.assign(state.teams.teams[teamId], action.payload);
      }
    },
    setTeams: (state, action: PayloadAction<Team[] | Record<string, Team>>) => {
      if (Array.isArray(action.payload)) {
        action.payload.forEach(team => {
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
    setTeamMembers: (state, action: PayloadAction<Record<string, TeamMember>>) => {
      Object.assign(state.teams.myMembers, action.payload);
    },
    setTeamUnreads: (state, action: PayloadAction<Record<string, { msg_count: number; mention_count: number }>>) => {
      Object.assign(state.teams.unreads, action.payload);
    },
    incrementTeamUnreadCount: (state, action: PayloadAction<{ 
      teamId: string; 
      msgCount?: number;
      mentionCount?: number;
    }>) => {
      const { teamId, msgCount = 1, mentionCount = 0 } = action.payload;
      
      if (!state.teams.unreads[teamId]) {
        state.teams.unreads[teamId] = { msg_count: 0, mention_count: 0 };
      }
      
      // Increment/decrement msg_count (can be negative for decrementing)
      state.teams.unreads[teamId].msg_count = Math.max(0, state.teams.unreads[teamId].msg_count + msgCount);
      
      // Increment/decrement mention_count (can be negative for decrementing)
      state.teams.unreads[teamId].mention_count = Math.max(0, state.teams.unreads[teamId].mention_count + mentionCount);
    },
    resetTeamUnreadCount: (state, action: PayloadAction<string>) => {
      const teamId = action.payload;
      if (state.teams.unreads[teamId]) {
        state.teams.unreads[teamId] = { msg_count: 0, mention_count: 0 };
      }
    },
    updateTeamMemberRole: (state, action: PayloadAction<{ teamId: string; userId: string; roles: string }>) => {
      const { teamId, userId, roles } = action.payload;
      if (state.teams.myMembers[teamId] && state.teams.myMembers[teamId].user_id === userId) {
        state.teams.myMembers[teamId].roles = roles;
      }
    },
    removeUserFromTeamAction: (state, action: PayloadAction<{ teamId: string; userId: string }>) => {
      const { teamId, userId } = action.payload;
      if (state.teams.myMembers[teamId] && state.teams.myMembers[teamId].user_id === userId) {
        delete state.teams.myMembers[teamId];
      }
      // Note: User profiles are managed separately via useTeamMembers hook
    },

    // Team Stats
    setTeamStats: (state, action: PayloadAction<{ teamId: string; stats: TeamStats }>) => {
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
        state.teams.stats[teamId].total_member_count = Math.max(0, state.teams.stats[teamId].total_member_count - 1);
        state.teams.stats[teamId].active_member_count = Math.max(0, state.teams.stats[teamId].active_member_count - 1);
      }
    },

    // Channels
    setCurrentChannelId: (state, action: PayloadAction<string>) => {
      state.channels.currentChannelId = action.payload;
    },
    setChannel: (state, action: PayloadAction<Channel>) => {
      state.channels.channels[action.payload.id] = action.payload;
    },
    setChannels: (state, action: PayloadAction<Channel[] | Record<string, Channel>>) => {
      if (Array.isArray(action.payload)) {
        action.payload.forEach(channel => {
          state.channels.channels[channel.id] = channel;
        });
      } else {
        Object.assign(state.channels.channels, action.payload);
      }
    },
    setChannelMember: (state, action: PayloadAction<ChannelMember>) => {
      state.channels.myMembers[action.payload.channel_id] = action.payload;
    },
    setChannelsInTeam: (state, action: PayloadAction<{ teamId: string; channelIds: string[] }>) => {
      state.channels.channelsInTeam[action.payload.teamId] = action.payload.channelIds;
    },
    addChannelToTeam: (state, action: PayloadAction<{ teamId: string; channelId: string }>) => {
      const { teamId, channelId } = action.payload;
      if (!state.channels.channelsInTeam[teamId]) {
        state.channels.channelsInTeam[teamId] = [];
      }
      if (!state.channels.channelsInTeam[teamId].includes(channelId)) {
        state.channels.channelsInTeam[teamId].push(channelId);
      }
    },
    removeChannelFromTeam: (state, action: PayloadAction<{ teamId: string; channelId: string }>) => {
      const { teamId, channelId } = action.payload;
      if (state.channels.channelsInTeam[teamId]) {
        state.channels.channelsInTeam[teamId] = state.channels.channelsInTeam[teamId].filter(id => id !== channelId);
      }
    },
    setChannelUnread: (state, action: PayloadAction<{ channelId: string; msg_count: number; mention_count: number }>) => {
      const { channelId, msg_count, mention_count } = action.payload;
      state.channels.unreads[channelId] = { msg_count, mention_count };
    },
    setChannelUnreads: (state, action: PayloadAction<Record<string, { msg_count: number; mention_count: number }>>) => {
      Object.assign(state.channels.unreads, action.payload);
    },
    // WebSocket event 'posted' handler - exactly like Mattermost
    incrementChannelUnreadCount: (state, action: PayloadAction<{ 
      channelId: string; 
      msgCount?: number;
      mentionCount?: number;
      fromCurrentUser?: boolean;
    }>) => {
      const { channelId, msgCount = 1, mentionCount = 0, fromCurrentUser = false } = action.payload;
      
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
      
      // Add to channel posts
      if (!state.posts.postsInChannel[post.channel_id]) {
        state.posts.postsInChannel[post.channel_id] = [];
      }
      if (!state.posts.postsInChannel[post.channel_id].includes(post.id)) {
        state.posts.postsInChannel[post.channel_id].unshift(post.id);
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
    setPosts: (state, action: PayloadAction<{ channelId: string; posts: Post[] }>) => {
      const { channelId, posts } = action.payload;
      
      posts.forEach(post => {
        state.posts.posts[post.id] = post;
      });

      // Set posts order in channel
      state.posts.postsInChannel[channelId] = posts.map(p => p.id);
    },
    removePost: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      const post = state.posts.posts[postId];
      
      if (post) {
        // Remove from channel
        if (state.posts.postsInChannel[post.channel_id]) {
          state.posts.postsInChannel[post.channel_id] = state.posts.postsInChannel[post.channel_id].filter(id => id !== postId);
        }

        // Remove from thread
        if (post.root_id && state.posts.postsInThread[post.root_id]) {
          state.posts.postsInThread[post.root_id] = state.posts.postsInThread[post.root_id].filter(id => id !== postId);
        }

        delete state.posts.posts[postId];
      }
    },

    // Channel Categories (following Mattermost patterns)
    setChannelCategories: (state, action: PayloadAction<{ teamId: string; categories: ChannelCategory[]; order: string[] }>) => {
      const { teamId, categories, order } = action.payload;
      
      // Store categories by ID
      categories.forEach(category => {
        state.channels.categories[category.id] = category;
      });
      
      // Store category IDs for team
      state.channels.categoriesInTeam[teamId] = categories.map(c => c.id);
      
      // Store user's custom order
      state.channels.categoryOrder[teamId] = order;
    },
    
    updateChannelCategory: (state, action: PayloadAction<ChannelCategory>) => {
      const category = action.payload;
      state.channels.categories[category.id] = category;
    },
    
    reorderCategories: (state, action: PayloadAction<{ teamId: string; categoryOrder: string[] }>) => {
      const { teamId, categoryOrder } = action.payload;
      state.channels.categoryOrder[teamId] = categoryOrder;
    },
    
    // Simple favorites toggle (Mattermost pattern)
    toggleChannelFavorite: (state, action: PayloadAction<{ channelId: string; teamId: string; isFavorite: boolean }>) => {
      const { channelId, teamId, isFavorite } = action.payload;
      
      // Find favorites category for this team
      const favoritesCategory = Object.values(state.channels.categories).find(
        cat => cat.team_id === teamId && cat.type === 'favorites'
      );
      
      if (favoritesCategory) {
        if (isFavorite) {
          // Add to favorites if not already there
          if (!favoritesCategory.channel_ids.includes(channelId)) {
            favoritesCategory.channel_ids.push(channelId);
          }
        } else {
          // Remove from favorites
          favoritesCategory.channel_ids = favoritesCategory.channel_ids.filter(id => id !== channelId);
        }
      }
    },

    // Toggle category collapsed state (Mattermost pattern)
    toggleCategoryCollapsed: (state, action: PayloadAction<{ categoryId: string; isCollapsed: boolean }>) => {
      const { categoryId, isCollapsed } = action.payload;
      
      if (state.channels.categories[categoryId]) {
        state.channels.categories[categoryId].collapsed = isCollapsed;
      }
    },

    // Clear actions
    clearCurrentUser: (state) => {
      state.users.currentUserId = '';
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
        const { teamId, channels, members, users, userStatuses, unreads, skipped } = action.payload;
        
        if (skipped) {
          // Data already loaded, no action needed
          return;
        }
        
        // Normalize and store channels
        const channelIds: string[] = [];
        channels?.forEach((channel: Channel) => {
          state.channels.channels[channel.id] = channel;
          channelIds.push(channel.id);
        });
        
        // Store channel IDs for this team
        state.channels.channelsInTeam[teamId] = channelIds;
        
        // Normalize and store members
        members?.forEach((member: ChannelMember) => {
          state.channels.myMembers[member.channel_id] = member;
        });
        
        // Store initial unreads calculated from channel/member data
        if (unreads) {
          Object.assign(state.channels.unreads, unreads);
        }
        
        // Store loaded users for direct/group channels
        users?.forEach((user: UserProfile) => {
          state.users.profiles[user.id] = user;
        });
        
        // Store user statuses loaded with users
        if (userStatuses) {
          Object.assign(state.users.statuses, userStatuses);
        }
      })
      .addCase(loadChannelsForTeam.rejected, (state, action) => {
        console.error('Failed to load channels for team:', action.payload);
      })
      // Channel categories thunks
      .addCase(loadChannelCategories.fulfilled, (state, action) => {
        const { teamId, categories, order } = action.payload;
        
        // Store categories by ID
        categories.forEach(category => {
          state.channels.categories[category.id] = category;
        });
        
        // Store category IDs for team
        state.channels.categoriesInTeam[teamId] = categories.map(c => c.id);
        
        // Store user's custom order
        state.channels.categoryOrder[teamId] = order;
      })
      .addCase(loadChannelCategories.rejected, (state, action) => {
        console.error('Failed to load channel categories:', action.payload);
      })
      .addCase(updateChannelCategoriesAction.fulfilled, (state, action) => {
        const { teamId, categories } = action.payload;
        
        // Update categories in store
        categories.forEach(category => {
          state.channels.categories[category.id] = category;
        });
      })
      .addCase(updateChannelCategoriesAction.rejected, (state, action) => {
        console.error('Failed to update channel categories:', action.payload);
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
  
  // Clear
  clearCurrentUser,
  clearEntities,
} = entitiesSlice.actions;


export default entitiesSlice.reducer;