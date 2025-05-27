import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { 
  User, 
  Team, 
  Channel, 
  Post, 
  TeamMember, 
  ChannelMember,
  LoginRequest, 
  LoginResponse,
  TeamsUnreadResponse,
  ChannelUnreadResponse,
  APIError
} from '../../api/types';

// Base query with auth and error handling
const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v4',
  prepareHeaders: (headers, { getState }) => {
    // Get token from localStorage or state
    const token = localStorage.getItem('mattermostToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Enhanced base query with token refresh and error handling
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    // Token expired or invalid, clear token and redirect to login
    localStorage.removeItem('mattermostToken');
    // You could dispatch a logout action here
  }
  
  return result;
};

// API slice inspired by Mattermost Client4
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Team', 'Channel', 'Post', 'TeamMember', 'ChannelMember'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/users/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: any, meta: any) => {
        // Extract token from header
        const token = meta?.response?.headers?.get('Token');
        if (token) {
          localStorage.setItem('mattermostToken', token);
        }
        return response;
      },
      invalidatesTags: ['User'],
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/users/logout',
        method: 'POST',
      }),
      onQueryStarted: async (_, { queryFulfilled }) => {
        try {
          await queryFulfilled;
          localStorage.removeItem('mattermostToken');
        } catch (error) {
          // Even if logout fails, clear local token
          localStorage.removeItem('mattermostToken');
        }
      },
    }),

    getMe: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),

    // Teams endpoints
    getMyTeams: builder.query<Team[], void>({
      query: () => '/users/me/teams',
      providesTags: ['Team'],
    }),

    getTeamsUnread: builder.query<TeamsUnreadResponse[], string>({
      query: (userId) => `/users/${userId}/teams/unread`,
    }),

    getTeamMember: builder.query<TeamMember, { teamId: string; userId: string }>({
      query: ({ teamId, userId }) => `/teams/${teamId}/members/${userId}`,
      providesTags: ['TeamMember'],
    }),

    // Channels endpoints
    getMyChannels: builder.query<Channel[], void>({
      query: () => '/users/me/channels',
      providesTags: ['Channel'],
    }),

    getChannelsForTeam: builder.query<Channel[], string>({
      query: (teamId) => `/users/me/teams/${teamId}/channels`,
      providesTags: ['Channel'],
    }),

    getChannelUnread: builder.query<ChannelUnreadResponse, { userId: string; channelId: string }>({
      query: ({ userId, channelId }) => `/users/${userId}/channels/${channelId}/unread`,
    }),

    getChannelMember: builder.query<ChannelMember, { channelId: string; userId: string }>({
      query: ({ channelId, userId }) => `/channels/${channelId}/members/${userId}`,
      providesTags: ['ChannelMember'],
    }),

    // Posts endpoints - contextual fetch like Mattermost
    getPostsUnread: builder.query<{ posts: Post[]; order: string[] }, { userId: string; channelId: string; limitBefore?: number; limitAfter?: number }>({
      query: ({ userId, channelId, limitBefore = 30, limitAfter = 30 }) => 
        `/users/${userId}/channels/${channelId}/posts/unread?limit_before=${limitBefore}&limit_after=${limitAfter}`,
      providesTags: ['Post'],
    }),

    getPosts: builder.query<{ posts: Post[]; order: string[] }, { channelId: string; page?: number; perPage?: number; before?: string; after?: string }>({
      query: ({ channelId, page = 0, perPage = 30, before, after }) => {
        let url = `/channels/${channelId}/posts?page=${page}&per_page=${perPage}`;
        if (before) url += `&before=${before}`;
        if (after) url += `&after=${after}`;
        return url;
      },
      providesTags: ['Post'],
    }),

    createPost: builder.mutation<Post, { channel_id: string; message: string; root_id?: string }>({
      query: (post) => ({
        url: '/posts',
        method: 'POST',
        body: post,
      }),
      invalidatesTags: ['Post'],
    }),

    getPostThread: builder.query<{ posts: Post[]; order: string[] }, string>({
      query: (postId) => `/posts/${postId}/thread`,
      providesTags: ['Post'],
    }),

    updatePost: builder.mutation<Post, { id: string; message: string }>({
      query: ({ id, message }) => ({
        url: `/posts/${id}`,
        method: 'PUT',
        body: { id, message },
      }),
      invalidatesTags: ['Post'],
    }),

    deletePost: builder.mutation<void, string>({
      query: (postId) => ({
        url: `/posts/${postId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Post'],
    }),

    // Channel viewing (mark as read)
    viewChannel: builder.mutation<void, { userId: string; channelId: string }>({
      query: ({ userId, channelId }) => ({
        url: `/channels/members/${userId}/view`,
        method: 'POST',
        body: { channel_id: channelId },
      }),
    }),
  }),
});

export const {
  // Auth
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,

  // Teams
  useGetMyTeamsQuery,
  useGetTeamsUnreadQuery,
  useGetTeamMemberQuery,

  // Channels
  useGetMyChannelsQuery,
  useGetChannelsForTeamQuery,
  useGetChannelUnreadQuery,
  useGetChannelMemberQuery,

  // Posts
  useGetPostsUnreadQuery,
  useGetPostsQuery,
  useCreatePostMutation,
  useGetPostThreadQuery,
  useUpdatePostMutation,
  useDeletePostMutation,

  // Actions
  useViewChannelMutation,
} = apiSlice;