import { Post } from '../api/types'

/**
 * Types for virtualized message list items
 * Modern approach replacing Mattermost's magic string IDs
 */

export interface VirtualListItem {
  type: 'post' | 'date-separator' | 'new-messages-separator' | 'load-more' | 'loading' | 'start-of-channel';
  id: string;
  data?: {
    date?: Date;
    unreadCount?: number;
    loadDirection?: 'older' | 'newer';
    isLoading?: boolean;
    post?: Post;
    showHeader?: boolean; // For post grouping
    isOwnMessage?: boolean; // For bubble layout (own vs others)
  };
}

export type VirtualListItemType = VirtualListItem['type'];

// Type guards for better type safety
export const isPostItem = (item: VirtualListItem): boolean => item.type === 'post';
export const isDateSeparator = (item: VirtualListItem): boolean => item.type === 'date-separator';
export const isNewMessagesSeparator = (item: VirtualListItem): boolean => item.type === 'new-messages-separator';
export const isLoadMoreItem = (item: VirtualListItem): boolean => item.type === 'load-more';
export const isLoadingItem = (item: VirtualListItem): boolean => item.type === 'loading';
export const isStartOfChannelItem = (item: VirtualListItem): boolean => item.type === 'start-of-channel';