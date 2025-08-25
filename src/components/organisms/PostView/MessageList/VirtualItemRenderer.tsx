/**
 * Virtual item renderer component for efficient message list rendering
 * Handles virtual scrolling with TanStack Virtual and optimized message item rendering
 */
import React, { useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import type { Virtualizer } from '@tanstack/react-virtual';
import { VirtualListItem } from '../../../../types/virtualList';
import { MessageItem } from './MessageItem';

interface VirtualItemRendererProps {
  totalSize: number;
  visibleItems: any[]; // VirtualItem[] from @tanstack/react-virtual - what to render and where
  dataItems: VirtualListItem[]; // Our data - posts, separators, load buttons
  channelId: string;
  onLoadOlder: () => Promise<void>;
  onLoadNewer: () => Promise<void>;
  isOlderLoading: boolean;
  isNewerLoading: boolean;
  isLongPress?: React.RefObject<boolean>;
  measureElement?: (element: Element) => void;
}

interface VirtualItemComponentProps {
  virtualItem: any; // VirtualItem from @tanstack/react-virtual
  item: VirtualListItem;
  channelId: string;
  onLoadOlder: () => Promise<void>;
  onLoadNewer: () => Promise<void>;
  isOlderLoading: boolean;
  isNewerLoading: boolean;
  isLongPress?: React.RefObject<boolean>;
  measureElement?: (element: Element) => void;
}

// Memoized individual virtual item component
const VirtualItemComponent = React.memo<VirtualItemComponentProps>(({
  virtualItem,
  item,
  channelId,
  onLoadOlder,
  onLoadNewer,
  isOlderLoading,
  isNewerLoading,
  isLongPress,
  measureElement,
}) => {
  return (
    <Box
      key={virtualItem.key}
      ref={measureElement}
      id={item.id}
      data-index={virtualItem.index}
      data-post-id={item.type === 'post' ? item.id : undefined}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        minHeight: virtualItem.size, // Changed from height to minHeight
        transform: `translateY(${virtualItem.start}px)`,
      }}
    >
      <MessageItem
        item={item}
        channelId={channelId}
        onLoadOlder={onLoadOlder}
        onLoadNewer={onLoadNewer}
        isOlderLoading={isOlderLoading}
        isNewerLoading={isNewerLoading}
        isLongPress={isLongPress}
      />
    </Box>
  );
});

VirtualItemComponent.displayName = 'VirtualItemComponent';

export const VirtualItemRenderer: React.FC<VirtualItemRendererProps> = React.memo(({
  totalSize,
  visibleItems,
  dataItems,
  channelId,
  onLoadOlder,
  onLoadNewer,
  isOlderLoading,
  isNewerLoading,
  isLongPress,
  measureElement
}) => {
  // Memoized render function to prevent recreation
  const renderVirtualItems = useCallback(() => {
    return visibleItems.map((virtualItem) => {
      const item = dataItems[virtualItem.index];
      if (!item) return null;

      return (
        <VirtualItemComponent
          key={virtualItem.key}
          virtualItem={virtualItem}
          item={item}
          channelId={channelId}
          onLoadOlder={onLoadOlder}
          onLoadNewer={onLoadNewer}
          isOlderLoading={isOlderLoading}
          isNewerLoading={isNewerLoading}
          isLongPress={isLongPress}
          measureElement={measureElement}
        />
      );
    });
  }, [
    visibleItems,
    dataItems,
    channelId,
    onLoadOlder,
    onLoadNewer,
    isOlderLoading,
    isNewerLoading,
    measureElement,
  ]);

  // Memoized container style
  const containerStyle = useMemo(() => ({
    height: totalSize,
    width: "100%",
    position: "relative" as const,
  }), [totalSize]);

  return (
    <Box style={containerStyle}>
      {renderVirtualItems()}
    </Box>
  );
});

VirtualItemRenderer.displayName = 'VirtualItemRenderer';