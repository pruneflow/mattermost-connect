/**
 * Virtualized message container managing virtual list creation and state
 * Orchestrates virtual list building, unread separators, and scroll position management
 */
import React, { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { Range } from '@tanstack/react-virtual'
import { useMediaQuery, useTheme } from "@mui/material";
import { useAppSelector } from "../../../hooks";
import { VirtualListItem } from "../../../types/virtualList";
import { buildVirtualList, injectNewMessagesSeparator } from "../../../utils/virtualListUtils";
import {
  DEFAULT_VIRTUALIZED_MESSAGES_DATA,
  selectVirtualizedMessagesData
} from "../../../store/selectors/virtualizedMessagesSelector";
import { selectEditingPostId } from "../../../store/selectors/messageUI";
import { VirtualizedMessageList } from "./MessageList/VirtualizedMessageList";

interface VirtualizedMessageContainerProps {
  channelId: string;
  autoLoad?: boolean;
  scrollElementRef: RefObject<HTMLDivElement>;
}

const DEFAULT_ESTIMATED_HEIGHT = 60;

export const VirtualizedMessageContainer: React.FC<VirtualizedMessageContainerProps> = ({
  channelId,
  autoLoad = false,
  scrollElementRef,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const editingPostId = useAppSelector(selectEditingPostId);
  
  const [coreVirtualItems, setCoreVirtualItems] = useState<VirtualListItem[]>([]);
  const [withLoaders, setWithLoaders] = useState<VirtualListItem[]>([]);
  const [virtualItems, setVirtualItems] = useState<VirtualListItem[]>([]);
  
  const prevTopRef = useRef<number | null>(null);
  const anchorIdRef = useRef<string | null>(null);
  const visibleRangeRef = React.useRef([0, 0]);
  
  // Use single optimized selector call - eliminates multiple useAppSelector calls
  const messagesData = useAppSelector(state => 
    channelId ? selectVirtualizedMessagesData(state, channelId) : DEFAULT_VIRTUALIZED_MESSAGES_DATA
  );

  // Destructure all data from single selector call
  const {
    postIds,
    channelPosts,
    atLatestPost,
    atOldestPost,
    currentUserId,
    channelType,
    unreadCount,
    lastViewedAt,
  } = messagesData;

  

  // Build core virtual list structure (posts, separators) without load buttons
  useEffect(() => {
    const items = buildVirtualList(
      postIds as string[],
      channelPosts,
      currentUserId || "",
      channelType || "O",
    );
    setCoreVirtualItems(items);
  }, [postIds, channelPosts, currentUserId, channelType]);

  // Add load buttons based on atOldestPost/atLatestPost flags
  useEffect(() => {
    
    if (coreVirtualItems.length === 0) {
      setWithLoaders(coreVirtualItems);
      return;
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
    
    setWithLoaders(result);
  }, [coreVirtualItems, atOldestPost, atLatestPost]);

  // Add unread separator if needed
  useEffect(() => {
    
    if (!unreadCount || unreadCount === 0 || withLoaders.length === 0) {
      setVirtualItems(withLoaders);
      return;
    }
    
    const result = injectNewMessagesSeparator(withLoaders, channelPosts, lastViewedAt, unreadCount);
    setVirtualItems(result);
  }, [withLoaders, unreadCount, lastViewedAt]);

  const measureAnchorPosition = () => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement || !virtualizer || virtualItems.length === 0) return;
    const visibleRange = visibleRangeRef.current;
    const visibleItems = virtualizer.getVirtualItems();

    let anchorItem = visibleItems[2];
    
    if (visibleRange && visibleRange.length >= 2) {
      // Take the middle index of the visible range for more natural scrolling
      const [startIndex, endIndex] = visibleRange;
      const middleRangeIndex = Math.floor((startIndex + endIndex) / 2);
      anchorItem = visibleItems[middleRangeIndex];
      /*if(virtualizer.scrollDirection === "backward") {
        anchorItem = visibleItems[startIndex]
      }
      else {
        anchorItem = visibleItems[endIndex]
      }*/
    }

    if (anchorItem && virtualItems[anchorItem.index]) {
      const anchorElement = virtualItems[anchorItem.index];
      const anchor = document.getElementById(anchorElement.id);
      
      if (anchor) {
        // Store both the ID and the exact position relative to viewport
        prevTopRef.current = anchor.getBoundingClientRect().top;
        anchorIdRef.current = anchorElement.id;
      }
    }
  };


  // Simple size estimator
  const getItemSize = (index: number, isMobile: boolean) => {
    const item = virtualItems[index];
    if (!item) return DEFAULT_ESTIMATED_HEIGHT;

    switch (item.type) {
      case "load-more":
        return 60;
      case "loading":
        return 80;
      case "date-separator":
        return 60;
      case "new-messages-separator":
        return 50;
      case "start-of-channel":
        return 200;
      case "post":
        if (item.data?.post) {
          const post = item.data.post;
          const showHeader = item.data.showHeader ?? true;
          const isOwnMessage = item.data.isOwnMessage ?? false;
          const isEditing = editingPostId === post.id;

          let postSize = 50; // Base bubble height

          if (showHeader && !isOwnMessage) {
            postSize += 50; // Header height
          }

          if (isEditing) {
            postSize += 300;
          } else {
            const divideBy = isMobile ? 26 : 140;
            const messageLines = Math.ceil((post.message?.length || 0) / divideBy);
            const brCount = (post.message?.match(/\n/g) || []).length;
            let totalSize = (messageLines + (brCount > 0 ? brCount + 1 : 0));
            postSize += totalSize * 20;
          }

          if (post.metadata?.reactions?.length) {
            postSize += 50;
          }

          if (post.reply_count && post.reply_count > 0) {
            postSize += 40;
          }

          if (post.metadata?.files?.length || post.file_ids?.length) {
            const fileCount = post.metadata?.files?.length || post.file_ids?.length || 0;
            const filesHeight = isMobile
              ? fileCount * 88 + 8
              : 80 + 8 + 16;
            postSize += filesHeight;
          }

          return postSize
        }
        return DEFAULT_ESTIMATED_HEIGHT;
      default:
        return DEFAULT_ESTIMATED_HEIGHT;
    }
  };

  const getEstimatedSize = useCallback((index: number) => getItemSize(index, isMobile), [isMobile, editingPostId, virtualItems]);

  // Create virtualizer
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: virtualItems.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: getEstimatedSize,
    overscan: 90,
    getItemKey: (index: number) => virtualItems[index]?.id || index,
/*    scrollToFn: scrollToFn,*/
    rangeExtractor: React.useCallback((range: Range) => {
      visibleRangeRef.current = [range.startIndex, range.endIndex]

      return defaultRangeExtractor(range)
    }, []),
    measureElement: (element) => {
      return element.getBoundingClientRect().height;
    }
  });

  // Scroll back to anchor using element ID to find new index
  useLayoutEffect(() => {
    if (anchorIdRef.current !== null) {
      // Find the element by ID
      const anchorElement = document.getElementById(anchorIdRef.current);
      if (anchorElement) {
        // Get the new index from data-index attribute
        const dataIndex = anchorElement.getAttribute('data-index');
        if (dataIndex) {
          const newIndex = parseInt(dataIndex);
          // Use TanStack Virtual's scroll to the new index
          virtualizer.scrollToIndex(newIndex, { 
            align: 'end',  // Use 'start' instead of 'center' for more precise positioning
            behavior: 'auto'  // Use 'auto' to avoid animation conflicts
          });
        }
      }
      
      // Reset anchor
      anchorIdRef.current = null;
    }
  }, [virtualItems, virtualizer]);




  const isReady = virtualItems.length > 0 && !!scrollElementRef.current;

  return (
    <VirtualizedMessageList
      channelId={channelId}
      autoLoad={autoLoad}
      scrollElementRef={scrollElementRef}
      virtualizer={virtualizer}
      virtualItems={virtualItems}
      isReady={isReady}
      measureAnchorPosition={measureAnchorPosition}
    />
  );
};