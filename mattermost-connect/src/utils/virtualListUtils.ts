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
 * Build complete virtual list with all separators and load buttons
 * Single optimized pass through the posts
 */
export const buildVirtualList = (
  postIds: string[],
  posts: Record<string, Post>,
  lastViewedAt: number,
  atOldestPost: boolean,
  atLatestPost: boolean
): VirtualListItem[] => {
  // Early return with stable empty array if no posts
  if (!postIds || postIds.length === 0) {
    return EMPTY_VIRTUAL_LIST;
  }
  
  const result: VirtualListItem[] = [];
  
  // Add LoadOlder button at the beginning if needed
  if (!atOldestPost) {
    result.push({
      type: 'load-more',
      id: 'load-older',
      data: { loadDirection: 'older' }
    });
  }
  
  // Single pass through posts with all injection logic
  // Reverse the order so oldest posts are first (chat order)
  const orderedPostIds = [...postIds].reverse();
  let lastDate: Date | null = null;
  let newMessagesSeparatorInserted = false;
  
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
    
    // 2. Inject new messages separator if needed (before first unread post)
    if (!newMessagesSeparatorInserted && 
        lastViewedAt && 
        post.create_at > lastViewedAt) {
      
      // Count remaining unread posts
      const unreadCount = postIds
        .slice(postIds.indexOf(postId))
        .filter(id => posts[id] && posts[id].create_at > lastViewedAt)
        .length;
      
      result.push({
        type: 'new-messages-separator',
        id: `new-messages-${lastViewedAt}`,
        data: { unreadCount }
      });
      newMessagesSeparatorInserted = true;
    }
    
    // 3. Add the post itself
    result.push({
      type: 'post',
      id: postId
    });
  });
  
  // Add LoadNewer button at the end if needed
  if (!atLatestPost) {
    result.push({
      type: 'load-more',
      id: 'load-newer',
      data: { loadDirection: 'newer' }
    });
  }
  
  return result;
};

/**
 * Helper function to determine if a post should be part of a grouped message
 * Based on consecutive posts from same user within time threshold
 */
export const shouldGroupMessage = (
  currentPost: Post,
  previousPost: Post | null,
  timeThresholdMs: number = 5 * 60 * 1000 // 5 minutes
): boolean => {
  if (!previousPost) return false;
  
  // Don't group if different users
  if (currentPost.user_id !== previousPost.user_id) return false;
  
  // Don't group if too much time has passed
  const timeDiff = currentPost.create_at - previousPost.create_at;
  if (timeDiff > timeThresholdMs) return false;
  
  // Don't group system messages
  if (currentPost.type !== '' || previousPost.type !== '') return false;
  
  return true;
};