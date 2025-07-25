import { Post } from '../api/types';

// Mattermost timeout for grouping consecutive posts (5 minutes)
export const POST_COLLAPSE_TIMEOUT = 5 * 60 * 1000; // 300000ms

/**
 * Determines if two consecutive posts should be grouped together
 * Following Mattermost logic: same user, within timeout, not webhook, not system
 */
export const areConsecutivePostsBySameUser = (
  post: Post,
  previousPost: Post | null
): boolean => {
  if (!previousPost) {
    return false;
  }

  const isSameUser = post.user_id === previousPost.user_id;
  const isWithinTimeout = post.create_at - previousPost.create_at <= POST_COLLAPSE_TIMEOUT;
  const isNotWebhook = !(post.props && post.props.from_webhook);
  const isNotSystemMessage = !post.type.startsWith('system_');
  const prevIsNotSystemMessage = !previousPost.type.startsWith('system_');

  return (
    isSameUser &&
    isWithinTimeout &&
    isNotWebhook &&
    isNotSystemMessage &&
    prevIsNotSystemMessage
  );
};

export const isConsecutivePost = (post: Post, previousPost: Post | "") => {
  let consecutivePost = false;

  if (previousPost && post && !post.metadata?.priority?.priority) {
    consecutivePost = areConsecutivePostsBySameUser(post, previousPost);
  }
  return consecutivePost;
}

/**
 * Checks if a post is a system message
 */
export const isSystemMessage = (post: Post): boolean => {
  if(!post || !post.type) return false
  return post.type.startsWith('system_');
};

/**
 * Checks if a post is from a webhook
 */
export const isWebhookMessage = (post: Post): boolean => {
  return !!(post.props && post.props.from_webhook);
};

/**
 * Checks if a post is ephemeral
 */
export const isEphemeralMessage = (post: Post): boolean => {
  return post.type === 'system_ephemeral';
};