import { useMemo, useRef, useLayoutEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppSelector } from "../../../../hooks";
import { VirtualListItem } from "../../../../types/virtualList";
import { buildVirtualList } from "../../../../utils/virtualListUtils";
import {
  selectPostsInChannel,
  selectHasLoadedLatestPost,
  selectHasLoadedOldestPost,
  selectAllPosts,
} from "../../../../store/selectors/postsSelectors";
import {
  selectCurrentUserId,
  selectChannelById,
  selectMyChannelMember,
} from "../../../../store/selectors";
import {EnrichedChannel} from "../../../../api/types";

interface UseVirtualizedMessagesProps {
  channelId: string;
  autoLoad: boolean;
  scrollElement: HTMLDivElement | null;
  estimatedItemHeight?: number;
  overscan?: number;
}

interface UseVirtualizedMessagesReturn {
  virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  virtualItems: VirtualListItem[];
  totalCount: number;
  isReady: boolean;
  measureAnchorPosition: () => void;
}

const DEFAULT_ESTIMATED_HEIGHT = 60;
const DEFAULT_OVERSCAN = 100;

export const useVirtualizedMessages = ({
  channelId,
  autoLoad,
  scrollElement,
  estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
}: UseVirtualizedMessagesProps): UseVirtualizedMessagesReturn => {
  const measurementCache = useRef<Map<string, number>>(new Map());

  // Refs pour sauvegarder la position et l'ID de l'élément ancre avant le prepend
  const prevTopRef = useRef<number | null>(null);
  const anchorIdRef = useRef<string | null>(null);

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
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentChannel = useAppSelector((state) =>
    selectChannelById(state, channelId),
  );
  const channelMember = useAppSelector(selectMyChannelMember(channelId));

  let lastViewedAt = channelMember?.last_viewed_at || 0;
  if (currentChannel) {
    lastViewedAt = currentChannel.last_post_at ? lastViewedAt : currentChannel.last_post_at;
  }
  const unreadCount = currentChannel?.unreadCount || 0;
  console.debug("lastViewedAt", lastViewedAt)
  // Build virtual list with all separators and load buttons
  const virtualItems = useMemo((): VirtualListItem[] => {
    return buildVirtualList(
      postIds,
      allPosts,
      lastViewedAt,
      atOldestPost,
      atLatestPost,
      currentUserId || "",
      currentChannel?.type || "O",
      unreadCount,
    );
  }, [
    postIds,
    allPosts,
    lastViewedAt,
    atOldestPost,
    atLatestPost,
    currentUserId,
    currentChannel?.type,
    channelMember?.last_viewed_at,
    unreadCount,
  ]);

  // New messages are now handled directly in buildVirtualList

  // Custom size estimator with caching
  const getItemSize = useMemo(() => {
    return (index: number) => {
      const item = virtualItems[index];
      if (!item) return estimatedItemHeight;

      // Create cache key based on all factors that affect size
      let cacheKey = item.id;
      if (item.type === "post" && item.data?.post) {
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
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: virtualItems.length,
    getScrollElement: () => scrollElement,
    estimateSize: getItemSize,
    overscan,
    getItemKey: (index) => virtualItems[index]?.id || index,
    // Enable dynamic sizing
    measureElement: (element) => {
      const htmlElement = element as HTMLElement;
      const index = htmlElement.dataset.index ? parseInt(htmlElement.dataset.index) : 0;
      const item = virtualItems[index];
      if (item && element) {
        const height = element.getBoundingClientRect().height;

        // Use same cache key logic as getItemSize
        let cacheKey = item.id;
        if (item.type === "post" && item.data?.post) {
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
  // Enregistrer la position avant le prepend
  const measureAnchorPosition = () => {
    if (!scrollElement || !virtualizer || virtualItems.length === 0) return;


    const visibleItems = virtualizer.getVirtualItems();
    /** We take second élément because first element will be a date and if we load
     * and it's the same date then the scroll measurement will not work
     */
    const anchorItem = visibleItems[2];
    
    if (anchorItem && virtualItems[anchorItem.index]) {
      const anchorElement = virtualItems[anchorItem.index];
      console.debug("anchorElement", anchorElement)
      const anchor = document.getElementById(anchorElement.id);
      
      if (anchor) {
        prevTopRef.current = anchor.getBoundingClientRect().top;
        anchorIdRef.current = anchorElement.id;
        console.log('🔍 Anchor position measured for ID:', anchorElement.id, 'position:', prevTopRef.current);
      }
    }
  };

  // Après le render (posts mis à jour) => recaler le scroll
  useLayoutEffect(() => {
    if (prevTopRef.current === null || !anchorIdRef.current || !scrollElement) return;

    const anchor = document.getElementById(anchorIdRef.current);

    if (anchor) {
      const newTop = anchor.getBoundingClientRect().top;
      const diff = newTop - prevTopRef.current;
      scrollElement.scrollTop += diff;
      
      console.log('✅ Scroll adjusted for ID:', anchorIdRef.current, 'diff:', diff, 'new scrollTop:', scrollElement.scrollTop);
    }

    // Reset pour la prochaine fois
    prevTopRef.current = null;
    anchorIdRef.current = null;
  }, [virtualItems, scrollElement]);

  const isReady = useMemo(() => {
    return virtualItems.length > 0 && !!scrollElement;
  }, [virtualItems.length, scrollElement]);

  return {
    virtualizer,
    virtualItems,
    totalCount: virtualItems.length,
    isReady,
    measureAnchorPosition,
  };
};
