import React, { useRef, useCallback, useEffect, useState } from "react";
import { Box, SxProps, Theme } from "@mui/material";
import { MessageItem } from "./MessageItem";
import { ScrollToBottomFab } from "./ScrollToBottomFab";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useVirtualizedMessages } from "../hooks/useVirtualizedMessages";
import { useMessages } from "../../../../hooks/useMessages";
import useUnreadCounts from "../../../../hooks/useUnreadCounts";

export interface MessageListProps {
  channelId: string;
  autoLoad?: boolean;
  unreadChunkTimeStamp?: number;
  shouldStartFromBottomWhenUnread: boolean;
  onChangeUnreadChunkTimeStamp: (timestamp: number) => void;
  onToggleShouldStartFromBottomWhenUnread: () => void;
  sx?: SxProps<Theme>;
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

export const VirtualizedMessageList: React.FC<MessageListProps> = ({
  channelId,
  autoLoad = false,
  unreadChunkTimeStamp,
  shouldStartFromBottomWhenUnread,
  sx,
}) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const lastReadPostIdRef = useRef<string | null>(null);

  const { markChannelAsRead } = useUnreadCounts();
  // Use custom hooks
  const { virtualizer, virtualItems, isReady, measureAnchorPosition } =
    useVirtualizedMessages({
      channelId,
      autoLoad,
      scrollElement: scrollElementRef.current,
    });

  const {
    loadOlderPosts,
    loadNewerPosts,
    isLoadingOlder,
    isLoadingNewer,
    atLatestPost,
  } = useMessages({
    channelId,
  });

  // Auto-scroll hook
  const { scrollToBottom, isAtBottom } = useAutoScroll({
    virtualizer,
    scrollElement: scrollElementRef.current,
    shouldStartFromBottomWhenUnread,
    unreadChunkTimeStamp,
  });

  // Wrapper functions with scroll preservation
  const handleLoadOlder = useCallback(async () => {
    // Étape 1: Enregistrer la position avant le prepend
    measureAnchorPosition();

    // Étape 2: Charger les posts plus anciens (ce qui déclenchera un nouveau render)
    await loadOlderPosts();

    // Étape 3: La restauration se fait automatiquement via useLayoutEffect
  }, [measureAnchorPosition, loadOlderPosts]);

  const handleLoadNewer = useCallback(async () => {
    // Pour load newer, on garde généralement la position actuelle ou on va vers le bas
    await loadNewerPosts();
  }, [loadNewerPosts]);

  // Fonction pour marquer comme lu si on est en bas avec les derniers messages
  const handleMarkAsReadIfAtBottom = useCallback(() => {
    if (
      !atLatestPost ||
      !scrollElementRef.current ||
      !isAtBottom(scrollElementRef.current)
    )
      return;

    const virtualItemsVisible = virtualizer.getVirtualItems();
    if (virtualItemsVisible.length === 0) return;

    // Trouver le dernier élément virtuel visible qui est un post
    const lastVisibleVirtualItem =
      virtualItemsVisible[virtualItemsVisible.length - 1];
    const lastVisibleItem = virtualItems[lastVisibleVirtualItem.index];

    if (!lastVisibleItem || lastVisibleItem.type !== "post") return;

    const lastPostId = lastVisibleItem.id;

    // Éviter les appels redondants
    if (lastReadPostIdRef.current === lastPostId) return;
    lastReadPostIdRef.current = lastPostId;
    void markChannelAsRead(channelId);
    console.debug(
      "[VirtualizedMessageList] Marked channel as read, lastPostId:",
      lastPostId,
    );
  }, [
    atLatestPost,
    virtualItems,
    virtualizer,
    channelId,
    markChannelAsRead,
    isAtBottom,
  ]);

  // Handle scroll events
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = element;


      // Auto-load logic (if enabled)
      if (autoLoad) {
        // Load older posts when near top - with scroll preservation
        if (scrollTop < 200 && !isLoadingOlder) {
          handleLoadOlder();
        }

        // Load newer posts when near bottom
        if (scrollHeight - scrollTop - clientHeight < 200 && !isLoadingNewer) {
          handleLoadNewer();
        }
      }

      // Mark as read if at bottom with latest posts
      handleMarkAsReadIfAtBottom();
    },
    [
      autoLoad,
      handleLoadOlder,
      handleLoadNewer,
      isLoadingOlder,
      isLoadingNewer,
      handleMarkAsReadIfAtBottom,
    ],
  );

  // Reset lastReadPostId when changing channel
  useEffect(() => {
    lastReadPostIdRef.current = null;
  }, [channelId]);

  // Scroll initial automatique : vers nouveaux messages ou vers le bas
  // Seulement au changement de channel, pas à chaque re-render
  useEffect(() => {
    if (!isReady) return;

    // Chercher un séparateur "new-messages" dans virtualItems
    const newMessageIndex = virtualItems.findIndex(
      (item) => item.type === "new-messages-separator",
    );
    console.debug(
      "[VirtualizedMessageList] Initial scroll - found separator at index:",
      newMessageIndex,
    );

    if (newMessageIndex >= 0) {
      // Scroll vers le séparateur de nouveaux messages
      virtualizer.scrollToIndex(newMessageIndex, { align: "start" });
    } else {
      // Pas de nouveaux messages, scroll vers le bas
      scrollToBottom();
      void markChannelAsRead(channelId);
    }
  }, [channelId, isReady]); // Retirer les autres dépendances pour éviter les re-déclenchements

  return (
    <Box sx={{ ...containerStyles, ...sx }}>
      <Box
        ref={scrollElementRef}
        sx={scrollContainerStyles}
        onScroll={handleScroll}
        role="log"
        aria-label="Message list"
      >
        <Box
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const itemId = virtualItems[virtualItem.index];

            return (
              <Box
                key={virtualItem.key}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualItem.size,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageItem
                  item={itemId}
                  channelId={channelId}
                  onLoadOlder={handleLoadOlder}
                  onLoadNewer={handleLoadNewer}
                  isOlderLoading={isLoadingOlder}
                  isNewerLoading={isLoadingNewer}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Scroll to bottom FAB */}
      <ScrollToBottomFab
        visible={!isAtBottom(scrollElementRef.current)}
        onClick={scrollToBottom}
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
