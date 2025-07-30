import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppSelector } from '../../../../hooks';
import { VirtualListItem } from '../../../../types/virtualList';
import { buildVirtualList } from '../../../../utils/virtualListUtils';
import { 
  selectPostsInChannel, 
  selectHasLoadedLatestPost, 
  selectHasLoadedOldestPost,
  selectAllPosts,
  selectLastViewedAt
} from "../../../../store/selectors/postsSelectors";

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

const DEFAULT_ESTIMATED_HEIGHT = 100;
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
  const postIds = useAppSelector(state => selectPostsInChannel(state, channelId));
  const allPosts = useAppSelector(selectAllPosts);
  const atOldestPost = useAppSelector(state => selectHasLoadedOldestPost(state, channelId));
  const atLatestPost = useAppSelector(state => selectHasLoadedLatestPost(state, channelId));
  const lastViewedAt = useAppSelector(state => selectLastViewedAt(state, channelId));

  // Build virtual list with all separators and load buttons
  const virtualItems = useMemo((): VirtualListItem[] => {
    return buildVirtualList(
      postIds,
      allPosts,
      lastViewedAt,
      atOldestPost,
      atLatestPost
    );
  }, [postIds, allPosts, lastViewedAt, atOldestPost, atLatestPost]);

  // New messages are now handled directly in buildVirtualList

  // Custom size estimator with caching
  const getItemSize = useMemo(() => {
    return (index: number) => {
      const item = virtualItems[index];
      if (!item) return estimatedItemHeight;
      
      // Check cache first
      const cached = measurementCache.current.get(item.id);
      if (cached) return cached;
      
      // Estimate based on item type
      let estimatedSize = estimatedItemHeight;
      
      switch (item.type) {
        case 'load-more':
          estimatedSize = 60; // Load more buttons
          break;
        case 'loading':
          estimatedSize = 80; // Loading indicators
          break;
        case 'date-separator':
          estimatedSize = 40; // Date dividers
          break;
        case 'new-messages-separator':
          estimatedSize = 50; // New message separator
          break;
        case 'post':
        default:
          estimatedSize = estimatedItemHeight; // Regular posts
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
        measurementCache.current.set(item.id, height);
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