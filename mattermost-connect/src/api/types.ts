export interface User {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  username: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  email_verified: boolean;
  auth_service: string;
  roles: string;
  locale: string;
  timezone: {
    useAutomaticTimezone: string;
    automaticTimezone: string;
    manualTimezone: string;
  };
  position: string;
  props: Record<string, any>;
  notify_props: {
    email: string;
    push: string;
    desktop: string;
    desktop_sound: string;
    mention_keys: string;
    channel: string;
    first_name: string;
  };
  last_password_update: number;
  last_picture_update: number;
  failed_attempts: number;
  mfa_active: boolean;
  last_activity_at: number;
}

export interface Team {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  display_name: string;
  name: string;
  description: string;
  email: string;
  type: string;
  company_name: string;
  allowed_domains: string;
  invite_id: string;
  allow_open_invite: boolean;
  scheme_id: string;
  group_constrained: boolean;
}

export interface Channel {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  team_id: string;
  type: "O" | "P" | "D" | "G"; // Open, Private, Direct, Group
  display_name: string;
  name: string;
  header: string;
  purpose: string;
  last_post_at: number;
  total_msg_count: number;
  extra_update_at: number;
  creator_id: string;
  scheme_id: string;
  group_constrained: boolean;
}

export interface Post {
  id: string;
  create_at: number;
  update_at: number;
  edit_at: number;
  delete_at: number;
  is_pinned: boolean;
  user_id: string;
  channel_id: string;
  root_id: string;
  parent_id: string;
  original_id: string;
  message: string;
  type: string;
  props: Record<string, any>;
  hashtags: string;
  pending_post_id: string;
  reply_count: number;
  last_reply_at: number;
  participants: string[] | null;
  metadata: {
    embeds: any[];
    emojis: any[];
    files: any[];
    images: any[];
    reactions: any[];
  };
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  roles: string;
  delete_at: number;
  scheme_guest: boolean;
  scheme_user: boolean;
  scheme_admin: boolean;
  explicit_roles: string;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  roles: string;
  last_viewed_at: number;
  msg_count: number;
  mention_count: number;
  notify_props: {
    desktop: string;
    email: string;
    mark_unread: string;
    push: string;
    ignore_channel_mentions: string;
  };
  last_update_at: number;
  scheme_guest: boolean;
  scheme_user: boolean;
  scheme_admin: boolean;
  explicit_roles: string;
}

export interface UserStatus {
  user_id: string;
  status: "online" | "away" | "dnd" | "offline";
  manual: boolean;
  last_activity_at: number;
}

// API Response Types
export interface LoginRequest {
  login_id: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
}

export interface APIError {
  id: string;
  message: string;
  detailed_error: string;
  request_id: string;
  status_code: number;
}

export interface TeamsUnreadResponse {
  team_id: string;
  msg_count: number;
  mention_count: number;
}

export interface ChannelUnreadResponse {
  team_id: string;
  channel_id: string;
  msg_count: number;
  mention_count: number;
  last_viewed_at: number;
}

// WebSocket Event Types
export interface WebSocketMessage {
  event: string;
  data: Record<string, any>;
  broadcast: {
    omit_users: Record<string, boolean>;
    user_id: string;
    channel_id: string;
    team_id: string;
  };
  seq: number;
}

export interface WSEventPosted {
  channel_display_name: string;
  channel_name: string;
  channel_type: string;
  post: string; // JSON stringified Post
  sender_name: string;
  team_id: string;
}

export interface WSEventChannelViewed {
  channel_id: string;
}

export interface WSEventUserUpdated {
  user: User;
}

export interface WSEventTyping {
  channel_id: string;
  parent_id: string;
  user_id: string;
}
