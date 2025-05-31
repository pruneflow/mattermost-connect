import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, Team, Channel, Post, TeamMember, ChannelMember, UserStatus } from '../../api/types';

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
  };
  channels: {
    currentChannelId: string;
    channels: Record<string, Channel>;
    myMembers: Record<string, ChannelMember>;
    channelsInTeam: Record<string, string[]>;
    unreads: Record<string, { msg_count: number; mention_count: number }>;
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
  },
  channels: {
    currentChannelId: '',
    channels: {},
    myMembers: {},
    channelsInTeam: {},
    unreads: {},
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

    // Channels
    setCurrentChannelId: (state, action: PayloadAction<string>) => {
      state.channels.currentChannelId = action.payload;
    },
    setChannel: (state, action: PayloadAction<Channel>) => {
      state.channels.channels[action.payload.id] = action.payload;
    },
    setChannels: (state, action: PayloadAction<Channel[]>) => {
      action.payload.forEach(channel => {
        state.channels.channels[channel.id] = channel;
      });
    },
    setChannelMember: (state, action: PayloadAction<ChannelMember>) => {
      state.channels.myMembers[action.payload.channel_id] = action.payload;
    },
    setChannelsInTeam: (state, action: PayloadAction<{ teamId: string; channelIds: string[] }>) => {
      state.channels.channelsInTeam[action.payload.teamId] = action.payload.channelIds;
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

    // Clear actions
    clearCurrentUser: (state) => {
      state.users.currentUserId = '';
      state.users.profiles = {};
      state.users.profilesInChannel = {};
      state.users.statuses = {};
    },
    clearEntities: () => initialState,
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
  
  // Channels
  setCurrentChannelId,
  setChannel,
  setChannels,
  setChannelMember,
  setChannelsInTeam,
  setChannelUnread,
  setChannelUnreads,
  incrementChannelUnreadCount,
  resetChannelUnreadCount,
  
  // Posts
  setPost,
  setPosts,
  removePost,
  
  // Clear
  clearCurrentUser,
  clearEntities,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;