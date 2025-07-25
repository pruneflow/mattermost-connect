import { PostType } from '../api/types'

export const PostTypes = {
  CHANNEL_DELETED: 'system_channel_deleted' as PostType,
  CHANNEL_UNARCHIVED: 'system_channel_restored' as PostType,
  DISPLAYNAME_CHANGE: 'system_displayname_change' as PostType,
  CONVERT_CHANNEL: 'system_convert_channel' as PostType,
  EPHEMERAL: 'system_ephemeral' as PostType,
  EPHEMERAL_ADD_TO_CHANNEL: 'system_ephemeral_add_to_channel' as PostType,
  HEADER_CHANGE: 'system_header_change' as PostType,
  PURPOSE_CHANGE: 'system_purpose_change' as PostType,

  JOIN_LEAVE: 'system_join_leave' as PostType,
  JOIN_CHANNEL: 'system_join_channel' as PostType,
  GUEST_JOIN_CHANNEL: 'system_guest_join_channel' as PostType,
  LEAVE_CHANNEL: 'system_leave_channel' as PostType,
  JOIN_LEAVE_CHANNEL: 'system_join_leave_channel' as PostType,
  ADD_REMOVE: 'system_add_remove' as PostType,
  ADD_TO_CHANNEL: 'system_add_to_channel' as PostType,
  ADD_GUEST_TO_CHANNEL: 'system_add_guest_to_chan' as PostType,
  REMOVE_FROM_CHANNEL: 'system_remove_from_channel' as PostType,

  JOIN_TEAM: 'system_join_team' as PostType,
  LEAVE_TEAM: 'system_leave_team' as PostType,
  ADD_TO_TEAM: 'system_add_to_team' as PostType,
  REMOVE_FROM_TEAM: 'system_remove_from_team' as PostType,

  COMBINED_USER_ACTIVITY: 'system_combined_user_activity' as PostType,
  ME: 'me' as PostType,
  ADD_BOT_TEAMS_CHANNELS: 'add_bot_teams_channels' as PostType,
  REMINDER: 'reminder' as PostType,
  WRANGLER: 'system_wrangler' as PostType,
  GM_CONVERTED_TO_CHANNEL: 'system_gm_to_channel' as PostType,
};

export const USER_ACTIVITY_POST_TYPES = [
  PostTypes.ADD_TO_CHANNEL,
  PostTypes.JOIN_CHANNEL,
  PostTypes.LEAVE_CHANNEL,
  PostTypes.REMOVE_FROM_CHANNEL,
  PostTypes.ADD_TO_TEAM,
  PostTypes.JOIN_TEAM,
  PostTypes.LEAVE_TEAM,
  PostTypes.REMOVE_FROM_TEAM,
];

export const PostListRowListIds = {
  CHANNEL_INTRO_MESSAGE: 'channel-intro-message',
  OLDER_MESSAGES_LOADER: 'older-messages-loader',
  LOAD_OLDER_MESSAGES_TRIGGER: 'load-older-messages-trigger',
  NEWER_MESSAGES_LOADER: 'newer-messages-loader',
  LOAD_NEWER_MESSAGES_TRIGGER: 'load-newer-messages-trigger',
  START_OF_NEW_MESSAGES: 'start-of-new-messages',
};
export const Locations = {
  CENTER: 'CENTER' as const,
  RHS_ROOT: 'RHS_ROOT' as const,
  RHS_COMMENT: 'RHS_COMMENT' as const,
  SEARCH: 'SEARCH' as const,
  NO_WHERE: 'NO_WHERE' as const,
  MODAL: 'MODAL' as const,
};

