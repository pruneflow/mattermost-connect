import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppSelector } from "../../../../hooks";
import { VirtualListItem } from "../../../../types/virtualList";
import { buildVirtualList } from "../../../../utils/virtualListUtils";
import {
  selectPostsInChannel,
  selectHasLoadedLatestPost,
  selectHasLoadedOldestPost,
  selectAllPosts,
  selectLastViewedAt,
} from "../../../../store/selectors/postsSelectors";
import { selectCurrentUserId, selectChannelById } from "../../../../store/selectors";

interface UseVirtualizedMessagesProps {
  channelId: string;
  autoLoad: boolean;
  scrollElement: HTMLDivElement | null;
  estimatedItemHeight?: number;
  overscan?: number;
}

interface UseVirtualizedMessagesReturn {
  virtualizer: ReturnType<typeof useVirtualizer>;
  virtualItems: VirtualListItem[];
  totalCount: number;
  isReady: boolean;
}

const DEFAULT_ESTIMATED_HEIGHT = 60;
const DEFAULT_OVERSCAN = 20;

export const useVirtualizedMessages = ({
  channelId,
  autoLoad,
  scrollElement,
  estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}: UseVirtualizedMessagesProps): UseVirtualizedMessagesReturn => {
  const measurementCache = useRef<Map<string, number>>(new Map());

  // Get data from Redux - direct selectors following existing pattern
  const postIds = useAppSelector((state) =>
    selectPostsInChannel(state, channelId),
  );
  const allPosts = useAppSelector(selectAllPosts);
  const atOldestPost = useAppSelector((state) =>
    selectHasLoadedOldestPost(state, channelId),
  );
  const atLatestPost = useAppSelector((state) =>
    selectHasLoadedLatestPost(state, channelId),
  );
  const lastViewedAt = useAppSelector((state) =>
    selectLastViewedAt(state, channelId),
  );
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentChannel = useAppSelector(state => selectChannelById(state, channelId));

  // Build virtual list with all separators and load buttons
  const virtualItems = useMemo((): VirtualListItem[] => {
    return buildVirtualList(
      postIds,
      allPosts,
      lastViewedAt,
      atOldestPost,
      atLatestPost,
      currentUserId || '',
      currentChannel?.type || 'O'
    );
  }, [postIds, allPosts, lastViewedAt, atOldestPost, atLatestPost, currentUserId, currentChannel?.type]);

  // New messages are now handled directly in buildVirtualList

  // Custom size estimator with caching  
  const getItemSize = useMemo(() => {
    return (index: number) => {
      const item = virtualItems[index];
      if (!item) return estimatedItemHeight;

      // Create cache key based on all factors that affect size
      let cacheKey = item.id;
      if (item.type === 'post' && item.data?.post) {
        const post = item.data.post;
        const messageLength = post.message?.length || 0;
        const reactionCount = post.metadata?.reactions?.length || 0;
        const replyCount = post.reply_count || 0;
        const fileCount = post.file_ids?.length || 0;
        const showHeader = item.data.showHeader ?? true;
        
        // Cache key includes all size-affecting factors
        cacheKey = `${item.id}-${messageLength}-${reactionCount}-${replyCount}-${fileCount}-${showHeader}`;
      }
      
      // Check cache with appropriate key
      const cached = measurementCache.current.get(cacheKey);
      if (cached) return cached;

      // Estimate based on item type with better sizing
      let estimatedSize = estimatedItemHeight;

      switch (item.type) {
        case "load-more":
          estimatedSize = 60; // Load more buttons
          break;
        case "loading":
          estimatedSize = 80; // Loading indicators
          break;
        case "date-separator":
          estimatedSize = 60; // Date dividers with margins (12px top + 12px bottom + content ~36px)
          break;
        case "new-messages-separator":
          estimatedSize = 50; // New message separator
          break;
        case "start-of-channel":
          estimatedSize = 200; // Start of channel divider with icon, name, description
          break;
        case "post":
          // Better estimation for posts based on bubble layout
          if (item.data?.post) {
            const post = item.data.post;
            const showHeader = item.data.showHeader ?? true;
            const isOwnMessage = item.data.isOwnMessage ?? false;
            
            // Base bubble height - includes padding and timestamp
            let postSize = 50; // Bubble padding (1.5 * 2) + timestamp height

            // Add header height only for non-own messages
            if (showHeader && !isOwnMessage) {
              postSize += 50; // MessageHeader height
            }

            // Add height for message content (rough estimate with bubble padding)
            const messageLines = Math.ceil((post.message?.length || 0) / 70); // Shorter lines in bubbles
            postSize += messageLines * 20;

            // Add height for reactions if present (outside bubble)
            if (post.metadata?.reactions?.length) {
              postSize += 40; // More space for reactions outside bubble
            }

            // Add height for thread replies info (inside bubble)
            if (post.reply_count && post.reply_count > 0) {
              postSize += 25;
            }

            // Add height for file attachments if present
            if (post.file_ids?.length) {
              postSize += post.file_ids.length * 60; // Rough estimate per file
            }

            // Minimum and maximum sizes for bubble layout
            const minSize = 45; // Minimum bubble size
            estimatedSize = Math.max(minSize, Math.min(postSize, 300));
          } else {
            estimatedSize = estimatedItemHeight;
          }
          break;
        default:
          estimatedSize = estimatedItemHeight;
          break;
      }
      return estimatedSize;
    };
  }, [virtualItems, estimatedItemHeight]);

  // Virtualizer setup
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollElement,
    estimateSize: getItemSize,
    overscan,
    getItemKey: (index) => virtualItems[index]?.id || index,
    // Enable dynamic sizing
    measureElement: (element) => {
      const index = element.dataset.index ? parseInt(element.dataset.index) : 0;
      const item = virtualItems[index];
      if (item && element) {
        const height = element.getBoundingClientRect().height;
        
        // Use same cache key logic as getItemSize
        let cacheKey = item.id;
        if (item.type === 'post' && item.data?.post) {
          const post = item.data.post;
          const messageLength = post.message?.length || 0;
          const reactionCount = post.metadata?.reactions?.length || 0;
          const replyCount = post.reply_count || 0;
          const fileCount = post.file_ids?.length || 0;
          const showHeader = item.data.showHeader ?? true;
          cacheKey = `${item.id}-${messageLength}-${reactionCount}-${replyCount}-${fileCount}-${showHeader}`;
        }
        
        measurementCache.current.set(cacheKey, height);
      }
      return element?.getBoundingClientRect().height ?? estimatedItemHeight;
    },
  });

  const isReady = useMemo(() => {
    return virtualItems.length > 0 && !!scrollElement;
  }, [virtualItems.length, scrollElement]);

  return {
    virtualizer,
    virtualItems,
    totalCount: virtualItems.length,
    isReady,
  };
};
