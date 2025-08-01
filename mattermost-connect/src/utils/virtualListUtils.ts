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
  atLatestPost: boolean,
  currentUserId: string,
  channelType: string,
  unreadCount?: number
): VirtualListItem[] => {
  // Early return with stable empty array if no posts
  if (!postIds || postIds.length === 0) {
    return EMPTY_VIRTUAL_LIST;
  }
  
  const result: VirtualListItem[] = [];
  
  // Add StartOfChannelDivider at the beginning if we've reached the oldest post
  if (atOldestPost) {
    result.push({
      type: 'start-of-channel',
      id: 'start-of-channel'
    });
  } else {
    // Add LoadOlder button if we haven't reached the oldest post
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
    
    // 2. Inject new messages separator if needed (before first unread post)
    if (!newMessagesSeparatorInserted && 
        lastViewedAt && 
        post.create_at > lastViewedAt) {
      
      result.push({
        type: 'new-messages-separator',
        id: `new-messages-${lastViewedAt}`,
        data: { unreadCount: unreadCount || 0 }
      });
      newMessagesSeparatorInserted = true;
    }
    
    // 3. Calculate if this message should show header (not part of a group)
    // In Direct Messages (DM), never show headers
    const showHeader = channelType === 'D' 
      ? false
      : (!lastPost || 
         lastPost.user_id !== post.user_id ||
         (post.create_at - lastPost.create_at) > 5 * 60 * 1000); // 5 minutes
    
    // 4. Add the post itself with grouping and ownership info
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

