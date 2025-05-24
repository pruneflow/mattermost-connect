/**
 * Core types for Mattermost API
 * Contains only the essential fields we actually use
 */

// Base type for entities with ID
export interface WithId {
  id: string;
}

// Base type for entities with timestamps
export interface WithTimestamps {
  create_at: number;
  update_at: number;
  delete_at?: number;
}

// User type
export interface User extends WithId, WithTimestamps {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  position: string;
  roles: string;
  locale: string;
  props?: Record<string, any>;
  is_bot?: boolean;
}

// User status
export type UserStatus = 'online' | 'away' | 'dnd' | 'offline';

// User status object
export interface UserStatusObject {
  user_id: string;
  status: UserStatus;
  manual: boolean;
  last_activity_at: number;
}

// Team type
export interface Team extends WithId, WithTimestamps {
  name: string;
  display_name: string;
  description: string;
  email: string;
  type: 'O' | 'I'; // Open or Invite-only
  company_name: string;
  allowed_domains: string;
  invite_id: string;
  allow_open_invite: boolean;
}

// Team member type
export interface TeamMember extends WithTimestamps {
  team_id: string;
  user_id: string;
  roles: string;
  scheme_admin: boolean;
}

// Channel type
export interface Channel extends WithId, WithTimestamps {
  team_id: string;
  name: string;
  display_name: string;
  header: string;
  purpose: string;
  type: 'O' | 'P' | 'D' | 'G'; // Open, Private, Direct, Group
  last_post_at: number;
  total_msg_count: number;
  creator_id: string;
}

// Channel member type
export interface ChannelMember extends WithTimestamps {
  channel_id: string;
  user_id: string;
  roles: string;
  last_viewed_at: number;
  msg_count: number;
  mention_count: number;
  notify_props: Record<string, any>;
  last_update_at: number;
}

// Message (Post in Mattermost API)
export interface Message extends WithId, WithTimestamps {
  channel_id: string;
  user_id: string;
  root_id: string;
  parent_id: string;
  original_id: string;
  message: string;
  type: string;
  props: Record<string, any>;
  hashtags: string;
  file_ids: string[];
  metadata?: MessageMetadata;
  // Thread properties
  reply_count?: number;
  has_replies?: boolean;
  // Reactions
  reactions?: Record<string, string[]>;
}

// Message metadata
export interface MessageMetadata {
  embeds?: MessageEmbed[];
  emojis?: Record<string, string>;
  files?: MessageFile[];
  images?: Record<string, MessageImage>;
  reactions?: MessageReaction[];
}

// Message embed
export interface MessageEmbed {
  type: string;
  url: string;
  data: Record<string, any>;
}

// Message file
export interface MessageFile {
  id: string;
  user_id: string;
  post_id: string;
  name: string;
  extension: string;
  size: number;
  mime_type: string;
  width: number;
  height: number;
  has_preview_image: boolean;
}

// Message image
export interface MessageImage {
  width: number;
  height: number;
  format: string;
  frame_count: number;
}

// Message reaction
export interface MessageReaction {
  user_id: string;
  post_id: string;
  emoji_name: string;
  create_at: number;
}

// File info
export interface FileInfo extends WithId {
  user_id: string;
  name: string;
  extension: string;
  size: number;
  mime_type: string;
  width: number;
  height: number;
  has_preview_image: boolean;
  create_at: number;
  update_at: number;
  delete_at: number;
}

// Preference
export interface Preference {
  user_id: string;
  category: string;
  name: string;
  value: string;
}

// Unread counts
export interface UnreadCount {
  team_id: string;
  msg_count: number;
  mention_count: number;
}

// Channel unread counts
export interface ChannelUnreadCount {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
}

// Direct channel info
export interface DirectChannelInfo {
  isDirect: boolean;
  isGroup: boolean;
  displayName: string;
  userIds: string[];
  otherUserId?: string;
  userStatus?: UserStatus;
}

// Authentication
export interface LoginCredentials {
  username: string;
  password: string;
  serverUrl?: string;
}

// Login response
export interface LoginResponse {
  token: string;
  user: User;
}

// WebSocket Event
export interface WebSocketEvent {
  event?: string;
  status?: string;
  seq_reply?: number;
  data?: {
    channel_id?: string;
    team_id?: string;
    user_id?: string;
    post?: string;
    status?: string;
    [key: string]: any;
  };
  broadcast?: {
    channel_id?: string;
    team_id?: string;
    user_id?: string;
    omit_users?: null | string[];
    [key: string]: any;
  };
  seq?: number;
}