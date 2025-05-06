// src/components/channels/ChannelList.tsx
/**
 * Component that displays a list of channels with different viewing options
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import ChannelListContainer from "../../internal/containers/channels/ChannelListContainer";
import { Channel } from "../../types";

export interface ChannelListProps {
  /** Team ID for the channels */
  teamId: string;
  /** How to display the channels (list, grid, sidebar, tabs) */
  variant?: "list" | "grid" | "sidebar" | "tabs";
  /** Density of items (compact, comfortable, spacious) */
  density?: "compact" | "comfortable" | "spacious";
  /** Whether to allow creating new channels */
  allowCreate?: boolean;
  /** Whether to show a search input */
  showSearch?: boolean;
  /** Whether to group channels by type */
  groupByType?: boolean;
  /** Whether to show favorite channels separately */
  showFavorites?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Callback when a channel is selected */
  onChannelSelect?: (channel: Channel) => void;
  /** Callback when create channel is successful */
  onCreateSuccess?: (channel: Channel) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * A flexible channel list component with multiple display options
 *
 * This component renders a list of channels for a given team and can be displayed in different ways:
 * - list: Traditional vertical list
 * - grid: Grid of channel cards
 * - sidebar: Compact vertical sidebar
 * - tabs: Horizontal tabs along the top
 *
 * @example
 * ```tsx
 * // Simple list view
 * <ChannelList
 *   teamId="team123"
 *   onChannelSelect={(channel) => console.log('Selected channel:', channel.display_name)}
 * />
 *
 * // Sidebar view with create option
 * <ChannelList
 *   teamId="team123"
 *   variant="sidebar"
 *   allowCreate={true}
 *   groupByType={true}
 * />
 *
 * // Grid view with search
 * <ChannelList
 *   teamId="team123"
 *   variant="grid"
 *   showSearch={true}
 *   density="comfortable"
 * />
 * ```
 */
const ChannelList: React.FC<ChannelListProps> = ({
  teamId,
  variant = "list",
  density = "comfortable",
  allowCreate = false,
  showSearch = false,
  groupByType = true,
  showFavorites = true,
  emptyMessage,
  onChannelSelect,
  onCreateSuccess,
  className,
  sx,
  id,
}) => {
  return (
    <ChannelListContainer
      teamId={teamId}
      variant={variant}
      density={density}
      allowCreate={allowCreate}
      showSearch={showSearch}
      groupByType={groupByType}
      showFavorites={showFavorites}
      onSelectChannel={onChannelSelect}
      onCreateChannel={() => {}}
      onChannelAction={(action, channel) => {
        if (action === "create_success" && onCreateSuccess) {
          onCreateSuccess(channel);
        }
      }}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default ChannelList;
