/**
 * Virtualized message list component with auto-loading and scroll management
 * Handles efficient rendering of large message lists with virtual scrolling and auto-loading
 */
import React, { useRef, useCallback, useEffect, RefObject } from "react";
import { Box, SxProps, Theme } from "@mui/material";
import { ScrollToBottomFab } from "./ScrollToBottomFab";
import { VirtualItemRenderer } from "./VirtualItemRenderer";
import { scrollToBottom, isAtBottom } from "../../../../utils/scrollUtils";
import type { Virtualizer } from '@tanstack/react-virtual';
import { VirtualListItem } from "../../../../types/virtualList";
import { loadOlderPosts, loadNewerPosts } from "../../../../services/messageService";
import { markAsRead } from "../../../../services/channelService";
import { useAppSelector } from "../../../../hooks/useAppSelector";
import {
  selectIsLoadingNewerPosts,
  selectIsLoadingOlderPosts,
  selectHasLoadedLatestPost
} from "../../../../store/selectors/postsSelectors";
export interface MessageListProps {
  channelId: string;
  autoLoad?: boolean;
  unreadChunkTimeStamp?: number;
  shouldStartFromBottomWhenUnread: boolean;
  onChangeUnreadChunkTimeStamp: (timestamp: number) => void;
  onToggleShouldStartFromBottomWhenUnread: () => void;
  sx?: SxProps<Theme>;
  scrollElementRef: RefObject<HTMLDivElement>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  virtualItems: VirtualListItem[];
  isReady: boolean;
  measureAnchorPosition: () => void;
}

const containerStyles: SxProps<Theme> = {
  height: "100%",
  width: "100%",
  position: "relative",
  overflow: "hidden",
};

const scrollContainerStyles: SxProps<Theme> = {
  height: "100%",
  width: "100%",
  overflow: "auto",
};

const VirtualizedMessageListComponent: React.FC<MessageListProps> = ({
  channelId,
  autoLoad = false,
  unreadChunkTimeStamp,
  shouldStartFromBottomWhenUnread,
  sx,
  scrollElementRef,
  virtualizer,
  virtualItems,
  isReady,
  measureAnchorPosition,
}) => {

  const lastReadPostIdRef = useRef<string | null>(null);
  const allowAutoLoadRef = useRef<boolean>(false);

  // Message loading states
  const isLoadingOlder = useAppSelector(state => selectIsLoadingOlderPosts(state, channelId));
  const isLoadingNewer = useAppSelector(state => selectIsLoadingNewerPosts(state, channelId));
  const atLatestPost = useAppSelector(state => selectHasLoadedLatestPost(state, channelId));

  // No auto-scroll hook needed - using direct functions

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom(scrollElementRef.current);
  }, []);

  // Wrapper functions with scroll preservation
  const handleLoadOlder = useCallback(async () => {
    measureAnchorPosition();

    await loadOlderPosts(channelId);

  }, [measureAnchorPosition, channelId]);

  const handleLoadNewer = useCallback(async () => {
    await loadNewerPosts(channelId);
  }, [channelId]);

  // Function to mark as read if at bottom with latest messages
  const handleMarkAsReadIfAtBottom = useCallback(() => {
    if (
      !atLatestPost ||
      !scrollElementRef.current ||
      !isAtBottom(scrollElementRef.current)
    )
      return;

    const virtualItemsVisible = virtualizer.getVirtualItems();
    if (virtualItemsVisible.length === 0) return;

    const lastVisibleVirtualItem =
      virtualItemsVisible[virtualItemsVisible.length - 1];
    const lastVisibleItem = virtualItems[lastVisibleVirtualItem.index];

    if (!lastVisibleItem || lastVisibleItem.type !== "post") return;

    const lastPostId = lastVisibleItem.id;

    // Avoid redundant calls
    if (lastReadPostIdRef.current === lastPostId) return;
    lastReadPostIdRef.current = lastPostId;
    void markAsRead(channelId);
  }, [
    atLatestPost,
    virtualItems,
    virtualizer,
    channelId,
    isAtBottom,
  ]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    // Auto-load logic (if enabled) - trigger when load-more buttons are visible based on scroll direction
    if (autoLoad && allowAutoLoadRef.current) {
      const virtualItemsVisible = virtualizer.getVirtualItems();
      if (virtualItemsVisible.length === 0) return;

      const scrollDirection = virtualizer.scrollDirection;

      if (scrollDirection === "backward") {
        // Scrolling up: check first visible item for load-older
        const firstVisibleItem = virtualItems[virtualItemsVisible[0].index];
        if (
          firstVisibleItem?.type === "load-more" &&
          firstVisibleItem.data?.loadDirection === "older" &&
          !isLoadingOlder
        ) {
          void handleLoadOlder();
        }
      } else if (scrollDirection === "forward") {
        // Scrolling down: check last visible item for load-newer
        const lastVisibleItem =
          virtualItems[
            virtualItemsVisible[virtualItemsVisible.length - 1].index
          ];
        if (
          lastVisibleItem?.type === "load-more" &&
          lastVisibleItem.data?.loadDirection === "newer" &&
          !isLoadingNewer
        ) {
          void handleLoadNewer();
        }
      }
    }

    // Mark as read if at bottom with latest posts
    handleMarkAsReadIfAtBottom();
  }, [
    autoLoad,
    handleLoadOlder,
    handleLoadNewer,
    isLoadingOlder,
    isLoadingNewer,
    handleMarkAsReadIfAtBottom,
  ]);

  // Reset lastReadPostId when changing channel
  useEffect(() => {
    lastReadPostIdRef.current = null;
    allowAutoLoadRef.current = false;
  }, [channelId]);

  const hasInitialScrolledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isReady || virtualItems.length === 0) return;


    const timeoutId = setTimeout(() => {
      const newMessageIndex = virtualItems.findIndex(
        (item) => item.type === "new-messages-separator",
      );

      if (newMessageIndex >= 0) {
        hasInitialScrolledRef.current.add(channelId);
        
        virtualizer.scrollToIndex(newMessageIndex, { align: "start" });
        
        setTimeout(() => {
          allowAutoLoadRef.current = true;
        }, 1000);
      } else {
        if (hasInitialScrolledRef.current.has(channelId)) return;
        hasInitialScrolledRef.current.add(channelId);

        handleScrollToBottom();
        void markAsRead(channelId);

        setTimeout(() => {
          allowAutoLoadRef.current = true;
        }, 1000);
      }
    }, 250);
    
    return () => clearTimeout(timeoutId);
  }, [channelId, isReady, virtualItems]);

  return (
    <Box sx={{ ...containerStyles, ...sx }}>
      <Box
        ref={scrollElementRef}
        sx={scrollContainerStyles}
        onScroll={handleScroll}
        role="log"
        aria-label="Message list"
      >
        <VirtualItemRenderer
          totalSize={virtualizer.getTotalSize()}
          measureElement={virtualizer.measureElement}
          visibleItems={virtualizer.getVirtualItems()}
          dataItems={virtualItems}
          channelId={channelId}
          onLoadOlder={handleLoadOlder}
          onLoadNewer={handleLoadNewer}
          isOlderLoading={isLoadingOlder}
          isNewerLoading={isLoadingNewer}
        />
      </Box>

      {/* Scroll to bottom FAB */}
      <ScrollToBottomFab
        visible={!isAtBottom(scrollElementRef.current)}
        onClick={handleScrollToBottom}
        /*newMessagesCount={newMessagesCount}*/
      />

      {/* Unread divider - positioned absolutely */}
      {/*{unreadChunkTimeStamp && newMessagesCount > 0 && (
        <UnreadDivider
          newMessagesCount={newMessagesCount}
          onScrollToUnread={() => {
            if (newMessageIndex >= 0) {
              scrollToIndex(newMessageIndex);
            }
          }}
        />
      )}*/}
    </Box>
  );
};

export const VirtualizedMessageList = React.memo(
  VirtualizedMessageListComponent,
);
