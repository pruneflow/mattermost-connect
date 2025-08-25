/**
 * Channel item container component with Redux data subscription
 * Smart component that connects individual channels to the store using stable selectors
 */
import React from "react";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectChannelById } from "../../store/selectors";
import { ChannelItem } from "./ChannelItem";

export interface ChannelItemContainerProps {
  channelId: string;
  isActive?: boolean;
  onClick?: (channelId: string) => void;
  compact?: boolean;
  draggable?: boolean;
  showMenu?: boolean;
}

/**
 * ChannelItemContainer - Smart component that subscribes to individual channel data
 * Each container only re-renders when its specific channel data changes
 * Following the container/presenter pattern with simplified stable selector
 */
export const ChannelItemContainer: React.FC<ChannelItemContainerProps> =
  React.memo(
    ({
      channelId,
      isActive = false,
      onClick,
      compact = false,
      draggable = true,
      showMenu = true,
    }) => {
      // Subscribe to individual channel data using stable selector
      const channel = useAppSelector((state) =>
        selectChannelById(state, channelId),
      );

      // Don't render if channel doesn't exist
      if (!channel) return null;

      return (
        <ChannelItem
          channel={channel}
          isActive={isActive}
          onClick={onClick}
          compact={compact}
          draggable={draggable}
          showMenu={showMenu}
        />
      );
    },
  );

export default ChannelItemContainer;
