import React, { useRef, useCallback, useEffect, RefObject } from "react";
import { Box, SxProps, Theme } from "@mui/material";
import { ScrollToBottomFab } from "./ScrollToBottomFab";
import { VirtualItemRenderer } from "./VirtualItemRenderer";
import { scrollToBottom, isAtBottom } from "../../../../utils/scrollUtils";
import { useVirtualizedMessages } from "../hooks/useVirtualizedMessages";
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
}) => {
  console.debug("🔄 VirtualizedMessageList re-render", {
    channelId,
    autoLoad,
    unreadChunkTimeStamp,
    shouldStartFromBottomWhenUnread,
  });

  const lastReadPostIdRef = useRef<string | null>(null);
  const allowAutoLoadRef = useRef<boolean>(false);
  // Use custom hooks
  const { virtualizer, virtualItems, isReady, measureAnchorPosition } =
    useVirtualizedMessages({
      channelId,
      scrollElementRef,
    });

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
    // Étape 1: Enregistrer la position avant le prepend
    measureAnchorPosition();

    // Étape 2: Charger les posts plus anciens (ce qui déclenchera un nouveau render)
    await loadOlderPosts(channelId);

    // Étape 3: La restauration se fait automatiquement via useLayoutEffect
  }, [measureAnchorPosition, channelId]);

  const handleLoadNewer = useCallback(async () => {
    // Pour load newer, on garde généralement la position actuelle ou on va vers le bas
    await loadNewerPosts(channelId);
  }, [channelId]);

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
    void markAsRead(channelId);
    console.debug(
      "[VirtualizedMessageList] Marked channel as read, lastPostId:",
      lastPostId,
    );
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
    // Désactiver l'auto-load temporairement lors du changement de channel
    allowAutoLoadRef.current = false;
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
      // Réactiver l'auto-load après 1 seconde
      setTimeout(() => {
        allowAutoLoadRef.current = true;
      }, 1000);
    } else {
      // Pas de nouveaux messages, scroll vers le bas
      handleScrollToBottom();
      void markAsRead(channelId);
      // Réactiver l'auto-load après 1 seconde
      setTimeout(() => {
        allowAutoLoadRef.current = true;
      }, 1000);
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
