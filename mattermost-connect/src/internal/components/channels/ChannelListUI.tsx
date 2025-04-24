// src/internal/components/channels/ChannelListUI.tsx
/**
 * Component that displays a list of channels
 */
import React, { useMemo } from "react";
import {
  List,
  Box,
  Grid,
  Tabs,
  Paper,
  Button,
  CircularProgress,
  Tab,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Channel } from "../../../index";
import { ListComponentProps } from "../../types/componentTypes";
import ChannelItemUI from "./ChannelItemUI";
import { EmptyState, SearchInput, SectionHeader } from "../common";

export interface ChannelListUIProps extends ListComponentProps<Channel> {
  /** Unread counts by channel ID */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
  /** Whether to allow creating new channels */
  allowCreate?: boolean;
  /** Whether to show a search input */
  showSearch?: boolean;
  /** Whether to group channels by type */
  groupByType?: boolean;
  /** Whether to show favorite channels separately */
  showFavorites?: boolean;
  /** Display names for direct/group messages by channel ID */
  displayNamesByChannel?: Record<string, string[]>;
  /** Favorite channels by ID */
  favoriteChannels?: Set<string>;
  /** Muted channels by ID */
  mutedChannels?: Set<string>;
  /** Density of the list */
  density?: "compact" | "comfortable" | "spacious";
  /** Callback when create channel button is clicked */
  onCreateChannel?: () => void;
  /** Callback when a channel action is performed */
  onChannelAction?: (action: string, channel: Channel) => void;
  /** Callback when favorite is toggled */
  onToggleFavorite?: (channel: Channel) => void;
}

const ChannelListUI: React.FC<ChannelListUIProps> = ({
  items,
  activeId,
  variant = "list",
  density = "comfortable",
  isLoading = false,
  emptyMessage = "No channels found",
  unreadCounts = {},
  allowCreate = false,
  showSearch = false,
  groupByType = true,
  showFavorites = true,
  displayNamesByChannel = {},
  favoriteChannels = new Set(),
  mutedChannels = new Set(),
  searchTerm = "",
  onItemClick,
  onCreateChannel,
  onChannelAction,
  onToggleFavorite,
  className,
  sx,
  id,
}) => {
  // Determine if we're using compact mode based on density
  const compact = density === "compact";

  // Handle channel click
  const handleChannelClick = (channel: Channel) => {
    if (onItemClick) {
      onItemClick(channel);
    }
  };

  // Handle create channel click
  const handleCreateChannel = () => {
    if (onCreateChannel) {
      onCreateChannel();
    }
  };

  // Find the active channel's index in tabs mode for proper tab selection
  const activeTabIndex = useMemo(() => {
    if (variant === "tabs" && activeId && items) {
      const index = items.findIndex((channel) => channel.id === activeId);
      return index >= 0 ? index : 0;
    }
    return 0;
  }, [activeId, items, variant]);

  // Group channels by type if needed
  const groupedChannels = useMemo(() => {
    if (!groupByType) {
      return { all: items };
    }

    const grouped: Record<string, Channel[]> = {
      favorites: [],
      public: [],
      private: [],
      direct: [],
      group: [],
    };

    // First pass for favorites if showing them separately
    if (showFavorites) {
      items.forEach((channel) => {
        if (favoriteChannels.has(channel.id)) {
          grouped.favorites.push(channel);
        }
      });
    }

    // Second pass for remaining channels
    items.forEach((channel) => {
      // Skip if already in favorites
      if (showFavorites && favoriteChannels.has(channel.id)) {
        return;
      }

      // Group by type
      switch (channel.type) {
        case "O":
          grouped.public.push(channel);
          break;
        case "P":
          grouped.private.push(channel);
          break;
        case "D":
          grouped.direct.push(channel);
          break;
        case "G":
          grouped.group.push(channel);
          break;
        default:
          break;
      }
    });

    return grouped;
  }, [items, groupByType, showFavorites, favoriteChannels]);

  // Render loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={100}
        className={className}
        sx={sx}
        id={id}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  // Render empty state
  if (!items || items.length === 0) {
    return (
      <EmptyState
        title={emptyMessage || "No items found"}
        description="Join or create a channel to get started"
        actionText={allowCreate ? "Create Channel" : undefined}
        onAction={allowCreate ? handleCreateChannel : undefined}
        className={className}
        sx={sx}
        id={id}
      />
    );
  }

  // Get section title by type
  const getSectionTitle = (type: string): string => {
    switch (type) {
      case "favorites":
        return "Favorites";
      case "public":
        return "Public Channels";
      case "private":
        return "Private Channels";
      case "direct":
        return "Direct Messages";
      case "group":
        return "Group Messages";
      default:
        return "Channels";
    }
  };

  // Render based on variant
  switch (variant) {
    case "sidebar":
      return (
        <Box
          className={className}
          sx={{
            width: "240px",
            overflow: "auto",
            borderRight: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            ...sx,
          }}
          id={id}
        >
          {showSearch && (
            <Box sx={{ p: 1 }}>
              <SearchInput
                value={searchTerm}
                placeholder="Search channels..."
                size="small"
                fullWidth
              />
            </Box>
          )}

          {groupByType ? (
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
              {Object.entries(groupedChannels).map(([type, channels]) => {
                if (channels.length === 0) return null;

                return (
                  <Box key={type} sx={{ mb: 1 }}>
                    <SectionHeader
                      title={getSectionTitle(type)}
                      divider={false}
                      sx={{ px: 2, py: 0.5 }}
                    />
                    <List disablePadding dense>
                      {channels.map((channel) => (
                        <ChannelItemUI
                          key={channel.id}
                          item={channel}
                          isActive={channel.id === activeId}
                          variant="sidebar"
                          unreadCount={
                            unreadCounts[channel.id]?.messageCount || 0
                          }
                          mentionCount={
                            unreadCounts[channel.id]?.mentionCount || 0
                          }
                          isFavorite={favoriteChannels.has(channel.id)}
                          isMuted={mutedChannels.has(channel.id)}
                          displayNames={displayNamesByChannel[channel.id]}
                          compact={compact}
                          onClick={handleChannelClick}
                        />
                      ))}
                    </List>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <List disablePadding dense sx={{ flexGrow: 1, overflow: "auto" }}>
              {items.map((channel) => (
                <ChannelItemUI
                  key={channel.id}
                  item={channel}
                  isActive={channel.id === activeId}
                  variant="sidebar"
                  unreadCount={unreadCounts[channel.id]?.messageCount || 0}
                  mentionCount={unreadCounts[channel.id]?.mentionCount || 0}
                  isFavorite={favoriteChannels.has(channel.id)}
                  isMuted={mutedChannels.has(channel.id)}
                  displayNames={displayNamesByChannel[channel.id]}
                  compact={compact}
                  onClick={handleChannelClick}
                />
              ))}
            </List>
          )}

          {allowCreate && (
            <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider" }}>
              <Button
                fullWidth
                startIcon={<AddIcon />}
                onClick={handleCreateChannel}
                size="small"
              >
                Create Channel
              </Button>
            </Box>
          )}
        </Box>
      );

    case "tabs":
      return (
        <Box
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
        >
          <Paper square elevation={0}>
            {/* Fixed: using numeric index value for Tabs instead of channel ID */}
            <Tabs
              value={activeTabIndex}
              variant="scrollable"
              scrollButtons="auto"
              textColor="primary"
              indicatorColor="primary"
            >
              {items.map((channel, index) => (
                <Tab
                  key={channel.id}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {/* Reusing channel item UI content but simplified for tab */}
                      <ChannelItemUI
                        item={channel}
                        isActive={channel.id === activeId}
                        variant="tabs"
                        unreadCount={
                          unreadCounts[channel.id]?.messageCount || 0
                        }
                        mentionCount={
                          unreadCounts[channel.id]?.mentionCount || 0
                        }
                        isFavorite={favoriteChannels.has(channel.id)}
                        isMuted={mutedChannels.has(channel.id)}
                        displayNames={displayNamesByChannel[channel.id]}
                        onClick={() => handleChannelClick(channel)}
                      />
                    </Box>
                  }
                  // Use index as value instead of channel.id
                  value={index}
                />
              ))}

              {allowCreate && (
                <Tab
                  icon={<AddIcon />}
                  iconPosition="start"
                  label="New"
                  onClick={handleCreateChannel}
                  // Value should be at the end of the array
                  value={items.length}
                />
              )}
            </Tabs>
          </Paper>
        </Box>
      );

    case "grid":
      return (
        <Box
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
        >
          {showSearch && (
            <Box sx={{ mb: 2 }}>
              <SearchInput
                value={searchTerm}
                placeholder="Search channels..."
                fullWidth
              />
            </Box>
          )}

          {groupByType ? (
            <Box>
              {Object.entries(groupedChannels).map(([type, channels]) => {
                if (channels.length === 0) return null;

                return (
                  <Box key={type} sx={{ mb: 3 }}>
                    <SectionHeader
                      title={getSectionTitle(type)}
                      divider={true}
                      sx={{ mb: 1 }}
                    />
                    <Grid container spacing={2}>
                      {channels.map((channel) => (
                        <Grid
                          size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                          key={channel.id}
                        >
                          <ChannelItemUI
                            item={channel}
                            isActive={channel.id === activeId}
                            variant="grid"
                            unreadCount={
                              unreadCounts[channel.id]?.messageCount || 0
                            }
                            mentionCount={
                              unreadCounts[channel.id]?.mentionCount || 0
                            }
                            isFavorite={favoriteChannels.has(channel.id)}
                            isMuted={mutedChannels.has(channel.id)}
                            displayNames={displayNamesByChannel[channel.id]}
                            compact={compact}
                            onClick={handleChannelClick}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Grid container spacing={2}>
              {items.map((channel) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={channel.id}>
                  <ChannelItemUI
                    item={channel}
                    isActive={channel.id === activeId}
                    variant="grid"
                    unreadCount={unreadCounts[channel.id]?.messageCount || 0}
                    mentionCount={unreadCounts[channel.id]?.mentionCount || 0}
                    isFavorite={favoriteChannels.has(channel.id)}
                    isMuted={mutedChannels.has(channel.id)}
                    displayNames={displayNamesByChannel[channel.id]}
                    compact={compact}
                    onClick={handleChannelClick}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {allowCreate && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateChannel}
              >
                Create Channel
              </Button>
            </Box>
          )}
        </Box>
      );

    case "list":
    default:
      return (
        <Box
          className={className}
          sx={{
            width: "100%",
            ...sx,
          }}
          id={id}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            {showSearch && (
              <Box sx={{ flexGrow: 1 }}>
                <SearchInput
                  value={searchTerm}
                  placeholder="Search channels..."
                  fullWidth
                />
              </Box>
            )}

            {allowCreate && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateChannel}
                sx={{ ml: 1 }}
                size="small"
              >
                Create
              </Button>
            )}
          </Box>

          {groupByType ? (
            <Box>
              {Object.entries(groupedChannels).map(([type, channels]) => {
                if (channels.length === 0) return null;

                return (
                  <Box key={type} sx={{ mb: 2 }}>
                    <SectionHeader
                      title={getSectionTitle(type)}
                      divider={true}
                    />
                    <List disablePadding>
                      {channels.map((channel) => (
                        <ChannelItemUI
                          key={channel.id}
                          item={channel}
                          isActive={channel.id === activeId}
                          showActions={true}
                          variant="list"
                          unreadCount={
                            unreadCounts[channel.id]?.messageCount || 0
                          }
                          mentionCount={
                            unreadCounts[channel.id]?.mentionCount || 0
                          }
                          isFavorite={favoriteChannels.has(channel.id)}
                          showFavoriteToggle={true}
                          isMuted={mutedChannels.has(channel.id)}
                          displayNames={displayNamesByChannel[channel.id]}
                          compact={compact}
                          onClick={handleChannelClick}
                          onAction={onChannelAction}
                          onToggleFavorite={onToggleFavorite}
                        />
                      ))}
                    </List>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <List disablePadding>
              {items.map((channel) => (
                <ChannelItemUI
                  key={channel.id}
                  item={channel}
                  isActive={channel.id === activeId}
                  showActions={true}
                  variant="list"
                  unreadCount={unreadCounts[channel.id]?.messageCount || 0}
                  mentionCount={unreadCounts[channel.id]?.mentionCount || 0}
                  isFavorite={favoriteChannels.has(channel.id)}
                  showFavoriteToggle={true}
                  isMuted={mutedChannels.has(channel.id)}
                  displayNames={displayNamesByChannel[channel.id]}
                  compact={compact}
                  onClick={handleChannelClick}
                  onAction={onChannelAction}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </List>
          )}
        </Box>
      );
  }
};

export default ChannelListUI;
