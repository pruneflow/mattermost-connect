// src/internal/components/channels/ChannelListUI.tsx
/**
 * UI component for displaying a list of channels
 */
import React, { useState } from "react";
import {
  List,
  ListItem,
  Box,
  Collapse,
  Divider,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Channel } from "../../../types";
import { ListComponentProps } from "../../types/componentTypes";
import SearchInput from "../common/SearchInput";
import ChannelItemContainer from "../../containers/channels/ChannelItemContainer";

export interface ChannelListUIProps extends ListComponentProps<Channel> {
  /** Whether to allow creating new channels */
  allowCreate?: boolean;
  /** Whether to show a search input */
  showSearch?: boolean;
  /** Whether to group channels by type */
  groupByType?: boolean;
  /** Whether to show favorite channels separately */
  showFavorites?: boolean;
  /** Display names by channel ID (for direct messages) */
  displayNamesByChannel?: Record<string, string[]>;
  /** Callback when create channel button is clicked */
  onCreateChannel?: () => void;
  /** Callback when a channel action is performed */
  onChannelAction?: (action: string, channel: Channel) => void;
  /** Callback when a search is perform */
  onSearchChange: (value: string) => void;
}

/**
 * UI component for displaying a list of channels with grouping, searching, and actions
 */
const ChannelListUI: React.FC<ChannelListUIProps> = ({
  items,
  activeId,
  variant = "list",
  density = "comfortable",
  isLoading = false,
  emptyMessage = "No channels available",
  allowCreate = false,
  showSearch = false,
  searchTerm = "",
  groupByType = true,
  showFavorites = true,
  onItemClick,
  onCreateChannel,
  onChannelAction,
  onSearchChange,
  className,
  sx,
  id,
}) => {
  // State for expanded sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    favorites: true,
    public: true,
    private: true,
    direct: true,
    group: true,
  });

  // Toggle section expansion
  const toggleExpanded = (section: string) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Group channels by type
  const groupedChannels = React.useMemo(() => {
    const grouped: Record<string, Channel[]> = {
      favorites: [],
      public: [],
      private: [],
      direct: [],
      group: [],
    };

    items.forEach((channel) => {
      // Add to appropriate type group
      if (channel.type === "D") {
        grouped.direct.push(channel);
      } else if (channel.type === "G") {
        grouped.group.push(channel);
      } else if (channel.type === "O") {
        grouped.public.push(channel);
      } else if (channel.type === "P") {
        grouped.private.push(channel);
      }

      // Favorites would be determined by the container now
    });

    return grouped;
  }, [items]);

  // Get padding based on density
  const getPadding = () => {
    switch (density) {
      case "compact":
        return "4px 8px";
      case "spacious":
        return "12px 16px";
      case "comfortable":
      default:
        return "8px 12px";
    }
  };

  // Render a section header
  const renderSectionHeader = (
    title: string,
    count: number,
    section: string,
  ) => {
    if (count === 0) return null;

    return (
      <ListItem
        sx={{
          p: 1,
          pl: 2,
          cursor: "pointer",
        }}
        onClick={() => toggleExpanded(section)}
      >
        <Typography variant="body2" color="text.secondary">
          {title} ({count})
        </Typography>
        {expanded[section] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItem>
    );
  };

  // Render a channel item using ChannelItemContainer
  const renderChannelItem = (channel: Channel) => {
    const isActive = channel.id === activeId;

    return (
      <ChannelItemContainer
        key={channel.id}
        channel={channel}
        variant={variant}
        isActive={isActive}
        showActions={true}
        compact={density === "compact"}
        onClick={onItemClick}
        onAction={onChannelAction}
      />
    );
  };

  // Render a skeleton loading item
  const renderSkeletonItem = (index: number) => {
    return (
      <ListItem
        key={`skeleton-${index}`}
        disablePadding
        sx={{
          borderRadius: 1,
          mb: 0.5,
        }}
      >
        <Box
          sx={{
            p: getPadding(),
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            width: "100%",
          }}
        >
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Box
            sx={{
              width: `${Math.random() * 30 + 50}%`,
              height: 20,
              bgcolor: "rgba(0, 0, 0, 0.1)",
              borderRadius: 1,
            }}
          />
        </Box>
      </ListItem>
    );
  };

  // Render search field
  const renderSearch = () => {
    if (!showSearch) return null;

    return (
      <Box sx={{ p: 1, mb: 1 }}>
        <SearchInput
          value={searchTerm}
          onSearch={(value) => onSearchChange && onSearchChange(value)}
          placeholder="Search channels"
          fullWidth
          size="small"
        />
      </Box>
    );
  };

  // Render create button
  const renderCreateButton = () => {
    if (!allowCreate) return null;

    return (
      <Box sx={{ p: 1, mb: 1 }}>
        <ListItem
          disablePadding
          sx={{
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              p: getPadding(),
              borderRadius: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              cursor: "pointer",
            }}
            onClick={onCreateChannel}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Create Channel</Typography>
          </Box>
        </ListItem>
      </Box>
    );
  };

  // Common header for all views - includes search and create button
  const renderHeader = () => {
    return (
      <>
        {renderSearch()}
        {renderCreateButton()}
      </>
    );
  };

  // Render the channel list content - this eliminates duplication
  const renderChannelList = () => {
    return (
      <List disablePadding>
        {groupByType ? (
          <>
            {/* Public channels section */}
            {groupedChannels.public.length > 0 && (
              <>
                {renderSectionHeader(
                  "Public Channels",
                  groupedChannels.public.length,
                  "public",
                )}
                <Collapse in={expanded.public}>
                  {groupedChannels.public.map(renderChannelItem)}
                </Collapse>
                <Divider sx={{ my: 1 }} />
              </>
            )}

            {/* Private channels section */}
            {groupedChannels.private.length > 0 && (
              <>
                {renderSectionHeader(
                  "Private Channels",
                  groupedChannels.private.length,
                  "private",
                )}
                <Collapse in={expanded.private}>
                  {groupedChannels.private.map(renderChannelItem)}
                </Collapse>
                <Divider sx={{ my: 1 }} />
              </>
            )}

            {/* Direct messages section */}
            {groupedChannels.direct.length > 0 && (
              <>
                {renderSectionHeader(
                  "Direct Messages",
                  groupedChannels.direct.length,
                  "direct",
                )}
                <Collapse in={expanded.direct}>
                  {groupedChannels.direct.map(renderChannelItem)}
                </Collapse>
                <Divider sx={{ my: 1 }} />
              </>
            )}

            {/* Group messages section */}
            {groupedChannels.group.length > 0 && (
              <>
                {renderSectionHeader(
                  "Group Messages",
                  groupedChannels.group.length,
                  "group",
                )}
                <Collapse in={expanded.group}>
                  {groupedChannels.group.map(renderChannelItem)}
                </Collapse>
              </>
            )}
          </>
        ) : (
          // Flat list, no grouping
          items.map(renderChannelItem)
        )}
      </List>
    );
  };

  // Render empty state content
  const renderEmptyContent = () => {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          p: 3,
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mb: 2 }}
        >
          {emptyMessage}
        </Typography>
      </Box>
    );
  };

  // Render loading skeleton content
  const renderLoadingContent = () => {
    return (
      <>
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 100,
              height: 20,
              bgcolor: "rgba(0, 0, 0, 0.1)",
              borderRadius: 1,
            }}
          />
        </Box>
        {Array.from({ length: 7 }).map((_, index) => renderSkeletonItem(index))}
      </>
    );
  };

  // Determine container and content based on state
  let container: React.ReactNode;
  let content: React.ReactNode;

  // Set content based on loading and item states
  if (isLoading && items.length === 0) {
    content = renderLoadingContent();
  } else if (items.length === 0) {
    content = renderEmptyContent();
  } else {
    content = renderChannelList();
  }

  // Determine the container based on variant
  switch (variant) {
    case "sidebar":
      container = (
        <Paper
          elevation={0}
          className={className}
          sx={{
            height: "100%",
            borderRadius: 0,
            ...sx,
          }}
          id={id}
        >
          {renderHeader()}
          {content}
        </Paper>
      );
      break;
    case "list":
    default:
      container = (
        <Box
          className={className}
          sx={{
            height: "100%",
            ...sx,
          }}
          id={id}
        >
          {renderHeader()}
          {content}
        </Box>
      );
      break;
  }

  return container;
};

export default ChannelListUI;
