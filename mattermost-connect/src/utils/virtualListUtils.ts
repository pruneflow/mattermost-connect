import { Post } from '@mattermost/types/posts';
import { VirtualListItem } from '../types/virtualList';

// Stable empty array to avoid unnecessary rerenders
const EMPTY_VIRTUAL_LIST: VirtualListItem[] = [];

/**
 * Utility functions for building virtualized message lists
 * Optimized single-pass approach for better performance
 */

/**
 * Check if two dates are on the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

/**
 * Build base virtual list with posts and date separators only
 * Single optimized pass through the posts
 */
export const buildVirtualList = (
  postIds: string[],
  posts: Record<string, Post>,
  currentUserId: string,
  channelType: string
): VirtualListItem[] => {
  // Early return with stable empty array if no posts
  if (!postIds || postIds.length === 0) {
    return EMPTY_VIRTUAL_LIST;
  }
  
  const result: VirtualListItem[] = [];
  
  // Single pass through posts with date separators only
  // Reverse the order so oldest posts are first (chat order)
  const orderedPostIds = [...postIds].reverse();
  let lastDate: Date | null = null;
  let lastPost: Post | null = null;
  
  orderedPostIds.forEach((postId) => {
    const post = posts[postId];
    if (!post) return;
    
    const postDate = new Date(post.create_at);
    
    // 1. Inject date separator if needed
    if (!lastDate || !isSameDay(lastDate, postDate)) {
      result.push({
        type: 'date-separator',
        id: `date-${postDate.getTime()}`,
        data: { date: postDate }
      });
      lastDate = postDate;
    }
    
    // 2. Calculate if this message should show header (not part of a group)
    // In Direct Messages (DM), never show headers
    const showHeader = channelType === 'D' 
      ? false
      : (!lastPost || 
         lastPost.user_id !== post.user_id ||
         (post.create_at - lastPost.create_at) > 5 * 60 * 1000); // 5 minutes
    
    // 3. Add the post itself with grouping and ownership info
    result.push({
      type: 'post',
      id: postId,
      data: { 
        post,
        showHeader,
        isOwnMessage: post.user_id === currentUserId
      }
    });
    
    // Update lastPost for next iteration
    lastPost = post;
  });
  
  return result;
};

/**
 * Inject new messages separator at the correct position in virtual list
 */
export const injectNewMessagesSeparator = (
  virtualItems: VirtualListItem[],
  posts: Record<string, Post>,
  lastViewedAt: number,
  unreadCount: number = 0
): VirtualListItem[] => {
  if (!lastViewedAt || virtualItems.length === 0) {
    return virtualItems;
  }

  const result = [...virtualItems];
  let insertIndex = -1;

  // Find the first unread post
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (item.type === 'post' && item.data?.post) {
      const post = posts[item.id];
      if (post && post.create_at > lastViewedAt) {
        insertIndex = i;
        break;
      }
    }
  }

  // Insert separator before first unread post
  if (insertIndex >= 0) {
    result.splice(insertIndex, 0, {
      type: 'new-messages-separator',
      id: `new-messages-${lastViewedAt}`,
      data: { unreadCount }
    });
  }

  return result;
};

