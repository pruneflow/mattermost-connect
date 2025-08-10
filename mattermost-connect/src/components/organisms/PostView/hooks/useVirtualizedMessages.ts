import { useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppSelector } from "../../../../hooks";
import { VirtualListItem } from "../../../../types/virtualList";
import { buildVirtualList, injectNewMessagesSeparator } from "../../../../utils/virtualListUtils";

import {
  selectVirtualizedMessagesData,
  DEFAULT_VIRTUALIZED_MESSAGES_DATA,
} from "../../../../store/selectors/virtualizedMessagesSelector";

interface UseVirtualizedMessagesProps {
  channelId: string;
  scrollElementRef: React.RefObject<HTMLDivElement>;
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

export const useVirtualizedMessages = ({
  channelId,
  scrollElementRef,
  estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
}: UseVirtualizedMessagesProps): UseVirtualizedMessagesReturn => {
  const measurementCache = useRef<Map<string, number>>(new Map());

  // Refs pour sauvegarder la position et l'ID de l'élément ancre avant le prepend
  const prevTopRef = useRef<number | null>(null);
  const anchorIdRef = useRef<string | null>(null);
  
  // Ref to access current virtualItems without creating dependency
  const virtualItemsRef = useRef<VirtualListItem[]>([]);
  
  // Ref to access current virtualizer without creating dependency
  const virtualizerRef = useRef<ReturnType<typeof useVirtualizer<HTMLDivElement, Element>> | null>(null);

  // Use single optimized selector call - eliminates multiple useAppSelector calls
  const messagesData = useAppSelector(state => 
    channelId ? selectVirtualizedMessagesData(state, channelId) : DEFAULT_VIRTUALIZED_MESSAGES_DATA
  );



  // Destructure all data from single selector call
  const {
    postIds,
    channelPosts: allPosts,
    atLatestPost,
    atOldestPost,
    currentUserId,
    channelType,
    unreadCount,
    lastViewedAt,
  } = messagesData;

  console.debug("lastViewedAt", lastViewedAt, unreadCount)
  
  // Debug logs to track what causes re-renders
  const prevMessagesDataRef = useRef(messagesData);
  console.debug("🔄 useVirtualizedMessages re-render", {
    channelId,
    scrollElement: !!scrollElementRef.current,
    messagesDataRef: messagesData === prevMessagesDataRef.current ? "SAME" : "DIFFERENT"
  });
  if (prevMessagesDataRef.current !== messagesData) {
    const prev = prevMessagesDataRef.current;
    const changes = [];
    
    if (prev.postIds !== messagesData.postIds) changes.push(`postIds: ${prev.postIds?.length || 0} → ${messagesData.postIds?.length || 0}`);
    if (prev.channelPosts !== messagesData.channelPosts) changes.push(`channelPosts: ${Object.keys(prev.channelPosts || {}).length} → ${Object.keys(messagesData.channelPosts || {}).length}`);
    if (prev.atLatestPost !== messagesData.atLatestPost) changes.push(`atLatestPost: ${prev.atLatestPost} → ${messagesData.atLatestPost}`);
    if (prev.atOldestPost !== messagesData.atOldestPost) changes.push(`atOldestPost: ${prev.atOldestPost} → ${messagesData.atOldestPost}`);
    if (prev.currentUserId !== messagesData.currentUserId) changes.push(`currentUserId: ${prev.currentUserId} → ${messagesData.currentUserId}`);
    if (prev.channelType !== messagesData.channelType) changes.push(`channelType: ${prev.channelType} → ${messagesData.channelType}`);
    if (prev.unreadCount !== messagesData.unreadCount) changes.push(`unreadCount: ${prev.unreadCount} → ${messagesData.unreadCount}`);
    if (prev.lastViewedAt !== messagesData.lastViewedAt) changes.push(`lastViewedAt: ${prev.lastViewedAt} → ${messagesData.lastViewedAt}`);
    
    console.debug("🔍 messagesData changed:", changes.join(", "));
    prevMessagesDataRef.current = messagesData;
  }
  // Build core virtual list structure (posts, separators) without load buttons
  const coreVirtualItems = useMemo((): VirtualListItem[] => {
    console.debug("🔄 coreVirtualItems recalculating");
    return buildVirtualList(
      postIds as string[],
      allPosts,
      currentUserId || "",
      channelType || "O",
    );
  }, [
    postIds,
    allPosts,
    currentUserId,
    channelType,
  ]);

  // Add load buttons based on atOldestPost/atLatestPost flags
  const withLoaders = useMemo((): VirtualListItem[] => {
    console.debug("🔄 withLoaders recalculating");
    // Don't add loaders if no core content yet
    if (coreVirtualItems.length === 0) {
      return coreVirtualItems;
    }
    
    const result = [...coreVirtualItems];
    
    // Add start/load-older button at beginning
    if (atOldestPost) {
      result.unshift({
        type: 'start-of-channel',
        id: 'start-of-channel'
      });
    } else {
      result.unshift({
        type: 'load-more',
        id: 'load-older',
        data: { loadDirection: 'older' }
      });
    }
    
    // Add load-newer button at end if needed
    if (!atLatestPost) {
      result.push({
        type: 'load-more',
        id: 'load-newer',
        data: { loadDirection: 'newer' }
      });
    }
    
    return result;
  }, [coreVirtualItems, atOldestPost, atLatestPost]);

  const virtualItems = useMemo((): VirtualListItem[] => {
    console.debug("🔄 virtualItems recalculating");
    if(!unreadCount || unreadCount === 0 || withLoaders.length === 0) return withLoaders;
    return injectNewMessagesSeparator(withLoaders, allPosts, lastViewedAt, unreadCount);
  }, [withLoaders, unreadCount, lastViewedAt, allPosts]);

  // Update ref whenever virtualItems changes
  virtualItemsRef.current = virtualItems;

  // Stable callback functions for virtualizer
  const getScrollElement = useCallback(() => scrollElementRef.current, []);
  
  const getItemKey = useCallback((index: number) => virtualItemsRef.current[index]?.id || index, []);
  
  const measureElement = useCallback((element: Element) => {
    const htmlElement = element as HTMLElement;
    const index = htmlElement.dataset.index ? parseInt(htmlElement.dataset.index) : 0;
    const item = virtualItemsRef.current[index]; // Use ref to avoid dependency
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
  }, [estimatedItemHeight]);

  // Custom size estimator with caching - using ref to avoid circular dependency
  const getItemSize = useCallback((index: number) => {
      const item = virtualItemsRef.current[index]; // Access via ref to avoid dependency
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
  }, [estimatedItemHeight]); // Only depend on stable estimatedItemHeight

  // Memoize count to prevent virtualizer recreation when virtualItems array changes but length stays same
  const count = useMemo(() => virtualItems.length, [virtualItems]);

  // Direct object creation - callbacks are already stable via useCallback and refs
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count,
    getScrollElement,
    estimateSize: getItemSize,
    overscan: 100,
    getItemKey,
    measureElement,
  });

  // Update virtualizer ref
  virtualizerRef.current = virtualizer;
  
  // Stable measureAnchorPosition function 
  const measureAnchorPosition = useCallback(() => {
    const currentVirtualizer = virtualizerRef.current;
    if (!scrollElementRef.current || !currentVirtualizer || virtualItemsRef.current.length === 0) return;

    const visibleItems = currentVirtualizer.getVirtualItems();
    /** We take second élément because first element will be a date and if we load
     * and it's the same date then the scroll measurement will not work
     */
    const anchorItem = visibleItems[2];
    
    if (anchorItem && virtualItemsRef.current[anchorItem.index]) {
      const anchorElement = virtualItemsRef.current[anchorItem.index];
      console.debug("anchorElement", anchorElement)
      const anchor = document.getElementById(anchorElement.id);
      
      if (anchor) {
        prevTopRef.current = anchor.getBoundingClientRect().top;
        anchorIdRef.current = anchorElement.id;
        console.log('🔍 Anchor position measured for ID:', anchorElement.id, 'position:', prevTopRef.current);
      }
    }
  }, []);

  // Après le render (posts mis à jour) => recaler le scroll
  useLayoutEffect(() => {
    if (prevTopRef.current === null || !anchorIdRef.current || !scrollElementRef.current) return;

    const anchor = document.getElementById(anchorIdRef.current);

    if (anchor) {
      const newTop = anchor.getBoundingClientRect().top;
      const diff = newTop - prevTopRef.current;
      scrollElementRef.current!.scrollTop += diff;
      
      console.log('✅ Scroll adjusted for ID:', anchorIdRef.current, 'diff:', diff, 'new scrollTop:', scrollElementRef.current!.scrollTop);
    }

    // Reset pour la prochaine fois
    prevTopRef.current = null;
    anchorIdRef.current = null;
  }, [virtualItems, scrollElementRef]);

  const isReady = useMemo(() => {
    return virtualItems.length > 0 && !!scrollElementRef.current;
  }, [virtualItems.length, scrollElementRef]);

  // Memoize the return object to prevent re-renders
  return useMemo(() => ({
    virtualizer,
    virtualItems,
    totalCount: virtualItems.length,
    isReady,
    measureAnchorPosition,
  }), [virtualizer, virtualItems, isReady, measureAnchorPosition]);
};
