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
  };
  channels: {
    currentChannelId: string;
    channels: Record<string, Channel>;
    myMembers: Record<string, ChannelMember>;
    channelsInTeam: Record<string, string[]>;
  };
  posts: {
    posts: Record<string, Post>;
    postsInChannel: Record<string, string[]>;
    postsInThread: Record<string, string[]>;
  };
}

// Restore user from localStorage if exists
const getInitialUserState = () => {
  try {
    const userJson = localStorage.getItem('mattermostUser');
    if (userJson) {
      const user = JSON.parse(userJson);
      return {
        currentUserId: user.id,
        profiles: { [user.id]: user },
        profilesInChannel: {},
        statuses: {},
      };
    }
  } catch (error) {
    console.warn('Failed to restore user from localStorage:', error);
  }
  
  return {
    currentUserId: '',
    profiles: {},
    profilesInChannel: {},
    statuses: {},
  };
};

const initialState: EntitiesState = {
  users: getInitialUserState(),
  teams: {
    currentTeamId: '',
    teams: {},
    myMembers: {},
  },
  channels: {
    currentChannelId: '',
    channels: {},
    myMembers: {},
    channelsInTeam: {},
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

    // Teams
    setCurrentTeamId: (state, action: PayloadAction<string>) => {
      state.teams.currentTeamId = action.payload;
    },
    setTeam: (state, action: PayloadAction<Team>) => {
      state.teams.teams[action.payload.id] = action.payload;
    },
    setTeams: (state, action: PayloadAction<Team[]>) => {
      action.payload.forEach(team => {
        state.teams.teams[team.id] = team;
      });
    },
    setTeamMember: (state, action: PayloadAction<TeamMember>) => {
      state.teams.myMembers[action.payload.team_id] = action.payload;
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
  
  // Teams
  setCurrentTeamId,
  setTeam,
  setTeams,
  setTeamMember,
  
  // Channels
  setCurrentChannelId,
  setChannel,
  setChannels,
  setChannelMember,
  setChannelsInTeam,
  
  // Posts
  setPost,
  setPosts,
  removePost,
  
  // Clear
  clearCurrentUser,
  clearEntities,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;