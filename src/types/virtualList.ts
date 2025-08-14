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