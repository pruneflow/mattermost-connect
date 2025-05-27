// Mattermost API endpoints configuration
// Based on official Mattermost API v4 documentation

export const MATTERMOST_API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/users/login',
    LOGOUT: '/users/logout',
    GET_ME: '/users/me',
  },

  // Users endpoints
  USERS: {
    GET_USER: (userId: string) => `/users/${userId}`,
    GET_USERS: '/users',
    GET_USER_STATUS: (userId: string) => `/users/${userId}/status`,
    UPDATE_USER_STATUS: (userId: string) => `/users/${userId}/status`,
    GET_USERS_IN_CHANNEL: (channelId: string) => `/channels/${channelId}/members`,
  },

  // Teams endpoints
  TEAMS: {
    GET_MY_TEAMS: '/users/me/teams',
    GET_TEAM: (teamId: string) => `/teams/${teamId}`,
    GET_TEAMS_UNREAD: (userId: string) => `/users/${userId}/teams/unread`,
    GET_TEAM_MEMBER: (teamId: string, userId: string) => `/teams/${teamId}/members/${userId}`,
  },

  // Channels endpoints
  CHANNELS: {
    GET_MY_CHANNELS: '/users/me/channels',
    GET_CHANNELS_FOR_TEAM: (teamId: string) => `/users/me/teams/${teamId}/channels`,
    GET_CHANNEL: (channelId: string) => `/channels/${channelId}`,
    GET_CHANNEL_UNREAD: (userId: string, channelId: string) => `/users/${userId}/channels/${channelId}/unread`,
    GET_CHANNEL_MEMBER: (channelId: string, userId: string) => `/channels/${channelId}/members/${userId}`,
    VIEW_CHANNEL: (userId: string) => `/channels/members/${userId}/view`,
  },

  // Posts endpoints
  POSTS: {
    GET_POSTS: (channelId: string) => `/channels/${channelId}/posts`,
    GET_POSTS_UNREAD: (userId: string, channelId: string) => `/users/${userId}/channels/${channelId}/posts/unread`,
    CREATE_POST: '/posts',
    UPDATE_POST: (postId: string) => `/posts/${postId}`,
    DELETE_POST: (postId: string) => `/posts/${postId}`,
    GET_POST_THREAD: (postId: string) => `/posts/${postId}/thread`,
  },

  // WebSocket
  WEBSOCKET: '/websocket',
} as const;

// WebSocket event types
export const WEBSOCKET_EVENTS = {
  // Connection events
  HELLO: 'hello',
  AUTHENTICATION_CHALLENGE: 'authentication_challenge',
  STATUS_OK: 'status_ok',
  STATUS_FAIL: 'status_fail',

  // User events
  USER_ADDED: 'user_added',
  USER_REMOVED: 'user_removed',
  USER_UPDATED: 'user_updated',

  // Channel events
  CHANNEL_CREATED: 'channel_created',
  CHANNEL_DELETED: 'channel_deleted',
  CHANNEL_UPDATED: 'channel_updated',
  CHANNEL_MEMBER_UPDATED: 'channel_member_updated',
  CHANNEL_VIEWED: 'channel_viewed',

  // Post events
  POSTED: 'posted',
  POST_EDITED: 'post_edited',
  POST_DELETED: 'post_deleted',

  // Typing events
  TYPING: 'typing',

  // Reaction events
  REACTION_ADDED: 'reaction_added',
  REACTION_REMOVED: 'reaction_removed',

  // Team events
  TEAM_ADDED: 'team_added',
  TEAM_UPDATED: 'team_updated',

  // Status events
  STATUS_CHANGE: 'status_change',
} as const;

export type WebSocketEventType = typeof WEBSOCKET_EVENTS[keyof typeof WEBSOCKET_EVENTS];