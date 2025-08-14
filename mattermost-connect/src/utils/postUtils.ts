import { Post, PostType } from "../api/types";
import { createIdsSelector } from "./selectorsHelper";
import { USER_ACTIVITY_POST_TYPES } from "../constants/posts";

/**
 * General utilities for Mattermost posts
 */

/**
 * Types de posts Mattermost
 */
export const POST_TYPES = [
  "system_generic",
  "system_join_leave",
  "system_add_remove",
  "system_join_channel",
  "system_leave_channel",
  "system_add_to_channel",
  "system_remove_from_channel",
  "system_header_change",
  "system_displayname_change",
  "system_purpose_change",
  "system_channel_deleted",
  "system_ephemeral",
  "system_combined_user_activity",
];

/**
 * Checks if a post is a system message
 */
export const isSystemPost = (post: Post): boolean => {
  return post.type.startsWith("system_");
};

/**
 * Checks if a post is pending sending
 */
export const isPostPending = (post: Post): boolean => {
  // A post is pending if it has a pending_post_id or doesn't have a valid ID
  return (
    (post as any).pending_post_id !== undefined ||
    !post.id ||
    post.id.length === 0 ||
    post.id.startsWith("pending_")
  );
};

/**
 * Checks if a post failed to send
 */
export const isPostFailed = (post: Post): boolean => {
  return post.failed === true;
};

/**
 * Checks if a post is a webhook
 */
export const isWebhookPost = (post: Post): boolean => {
  return post.props && post.props.from_webhook === "true";
};

/**
 * Checks if a post is edited
 */
export const isPostEdited = (post: Post): boolean => {
  return post.edit_at > 0;
};

/**
 * Checks if a post has reactions
 */
export const hasReactions = (post: Post): boolean => {
  return !!(
    post.metadata &&
    post.metadata.reactions &&
    post.metadata.reactions.length > 0
  );
};

/**
 * Checks if a post has attachments
 */
export const hasAttachments = (post: Post): boolean => {
  return !!(post.file_ids && post.file_ids.length > 0);
};

/**
 * Checks if a post is in a thread
 */
export const isThreadPost = (post: Post): boolean => {
  return post.root_id !== "";
};

/**
 * Checks if a post is the start of a thread
 */
export const isThreadRoot = (post: Post): boolean => {
  return post.root_id === "" && post.reply_count > 0;
};

/**
 * Gets the thread ID (root_id or id if it's the root)
 */
export const getThreadId = (post: Post): string => {
  return post.root_id || post.id;
};

/**
 * Checks if a post can be edited
 */
export const canEditPost = (post: Post, currentUserId: string): boolean => {
  // Only the author can edit their posts
  if (post.user_id !== currentUserId) {
    return false;
  }

  // No editing for system messages
  if (isSystemPost(post)) {
    return false;
  }

  // No editing for failed posts
  if (isPostFailed(post)) {
    return false;
  }

  return true;
};

/**
 * Checks if a post can be deleted
 */
export const canDeletePost = (post: Post, currentUserId: string): boolean => {
  // The author can always delete their posts
  if (post.user_id === currentUserId) {
    return true;
  }

  // TODO: Check admin/moderator permissions
  return false;
};

/**
 * Generates a unique ID for a pending post
 */
export const generatePendingPostId = (): string => {
  return `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Formats post size in characters
 */
export const getPostLength = (post: Post): number => {
  return post.message ? post.message.length : 0;
};

/**
 * Checks if a post is too long
 */
export const isPostTooLong = (
  message: string,
  maxLength: number = 4000,
): boolean => {
  return message.length > maxLength;
};

/**
 * Extrait les hashtags d'un post
 */
export const extractHashtags = (message: string): string[] => {
  const hashtagRegex = /#[a-zA-Z0-9_-]+/g;
  return message.match(hashtagRegex) || [];
};

/**
 * Extrait les URLs d'un post
 */
export const extractUrls = (message: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return message.match(urlRegex) || [];
};

/**
 * Determines if a post contains mentions
 */
export const hasMentions = (message: string): boolean => {
  return /@[a-zA-Z0-9._-]+/.test(message);
};

/**
 * Determines if a post contains emojis
 */
export const hasEmojis = (message: string): boolean => {
  return /:[a-zA-Z0-9_+-]+:/.test(message);
};

// ============================================================================
// Post List Utilities - Exact copy of mattermost-redux/utils/post_list
// ============================================================================

/**
 * Get date from date line item
 */
export function getDateForDateLine(item: string): number {
  return parseInt(item.substring("date-".length), 10);
}

/**
 * Get previous post ID from list
 */
export function getPreviousPostId(
  data: string[],
  index: number,
): string | undefined {
  if (index >= data.length - 1) return undefined;
  return data[index + 1];
}

export function isCombinedUserActivityPost(item: string) {
  return (/^user-activity-(?:[^_]+_)*[^_]+$/).test(item);
}

export function getPostIdsForCombinedUserActivityPost(item: string) {
  return item.substring(COMBINED_USER_ACTIVITY.length).split('_');
}

// getLatestPostId returns the most recent valid post ID in the given list of post IDs. This function is copied from
// mattermost-redux, except it also includes additional special IDs that are only used in the web app.
export function getLatestPostId(postIds: string[]): string {
  for (let i = 0; i < postIds.length; i++) {
    const item = postIds[i];

    if (isIdNotPost(item)) {
      // This is not a post at all
      continue;
    }

    if (isCombinedUserActivityPost(item)) {
      // This is a combined post, so find the lastest post ID from it
      const combinedIds = getPostIdsForCombinedUserActivityPost(item);

      return combinedIds[0];
    }

    // This is a post ID
    return item;
  }

  return '';
}

export function getOldestPostId(postIds: string[]): string {
  // Return the last non-special ID (posts are ordered newest to oldest)
  let index = 0;
  for (const id of postIds) {
    if (
      !isDateLine(id) &&
      !isStartOfNewMessages(id) &&
      !id.includes("loader") &&
      !id.includes("trigger") &&
      index === postIds.length - 1
    ) {
      return id;
    }
    index++;
  }
  return "";
}

/**
 * Get new message index from list
 */
export function getNewMessageIndex(postIds: string[]): number {
  return postIds.findIndex((id) => isStartOfNewMessages(id));
}

/**
 * Check if ID is not a post (utility for PostListRow)
 */
export function isIdNotPost(id: string): boolean {
  return (
    isDateLine(id) ||
    isStartOfNewMessages(id) ||
    id === "channel-intro-message" ||
    id === "older-messages-loader" ||
    id === "newer-messages-loader" ||
    id === "load-older-messages-trigger" ||
    id === "load-newer-messages-trigger"
  );
}


function isJoinLeavePostForUsername(post: Post, currentUsername: string): boolean {
  if (!post.props || !currentUsername) {
    return false;
  }

  if (post.user_activity_posts) {
    for (const childPost of post.user_activity_posts) {
      if (isJoinLeavePostForUsername(childPost, currentUsername)) {
        // If any of the contained posts are for this user, the client will
        // need to figure out how to render the post
        return true;
      }
    }
  }

  return post.props.username === currentUsername ||
    post.props.addedUsername === currentUsername ||
    post.props.removedUsername === currentUsername;
}

/**
 * If the user has "Show Join/Leave Messages" disabled, this function will return true if the post should be hidden if it's of type join/leave.
 * The post object passed in must be not null/undefined.
 * @returns Returns true if a post should be hidden
 */
export function shouldFilterJoinLeavePost(
  post: Post,
  showJoinLeave: boolean,
  currentUsername: string,
): boolean {
  if (showJoinLeave) {
    return false;
  }

  // Don't filter out non-join/leave messages
  if (POST_TYPES.indexOf(post.type) === -1) {
    return false;
  }

  // Don't filter out join/leave messages about the current user
  return !isJoinLeavePostForUsername(post, currentUsername);
}

export const DATE_LINE = 'date-';

export const START_OF_NEW_MESSAGES = 'start-of-new-messages-';

export const CREATE_COMMENT = 'create-comment';

export const MAX_COMBINED_SYSTEM_POSTS = 100;

export const COMBINED_USER_ACTIVITY = 'user-activity-';

export function isFromWebhook(post: Post): boolean {
  return post.props?.from_webhook === 'true';
}

export function isStartOfNewMessages(item: string) {
  return item.startsWith(START_OF_NEW_MESSAGES);
}

export function isCreateComment(item: string) {
  return item === CREATE_COMMENT;
}

export function isDateLine(item: string) {
  return item.startsWith(DATE_LINE);
}

export function isUserActivityPost(postType: PostType): boolean {
  return USER_ACTIVITY_POST_TYPES.includes(postType);
}

export function getNewMessagesIndex(postListIds: string[]): number {
  return postListIds.findIndex(isStartOfNewMessages);
}

export function getTimestampForStartOfNewMessages(item: string) {
  return parseInt(item.substring(START_OF_NEW_MESSAGES.length), 10);
}
