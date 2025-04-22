// src/components/channel/ChannelList/ChannelList.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  useChannelContext,
  useConnection,
  useMattermost,
  useUserContext,
  useTeamContext,
} from "../../../context";
import { Channel } from "../../../types";

// Material-UI Components
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Collapse,
  Skeleton,
  SxProps,
  Theme,
  useTheme,
} from "@mui/material";

// Material-UI Icons
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";

// Channel Item Component
import ChannelItem from "./ChannelItem";

/**
 * Props for the ChannelList component
 */
export interface ChannelListProps {
  /** The team ID to fetch channels for */
  teamId?: string;

  /** Callback when a channel is selected */
  onSelectChannel?: (channel: Channel) => void;

  /** Show private channels */
  showPrivateChannels?: boolean;

  /** Show direct messages */
  showDirectMessages?: boolean;

  /** Show search bar */
  showSearch?: boolean;

  /** Group channels by type */
  groupByType?: boolean;

  /** Additional CSS class name */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Custom styling for section headers */
  sectionHeaderSx?: SxProps<Theme>;

  /** Custom styling for search input */
  searchSx?: SxProps<Theme>;

  /** Custom styling for channel items container */
  channelsContainerSx?: SxProps<Theme>;
}

/**
 * A component that displays a list of channels from a Mattermost team,
 * with filtering, search and grouping capabilities
 */
const ChannelList: React.FC<ChannelListProps> = ({
  teamId,
  onSelectChannel,
  showPrivateChannels = true,
  showDirectMessages = true,
  showSearch = true,
  groupByType = true,
  className,
  style,
  sx,
  sectionHeaderSx,
  searchSx,
  channelsContainerSx,
}) => {
  const theme = useTheme();
  const { services } = useMattermost();
  const { isConnected } = useConnection();
  const { currentUser, getUserDisplayName } = useUserContext();
  const {
    activeChannel,
    setActiveChannel,
    loadChannels,
    channels,
    isChannelsLoading,
    channelsError,
  } = useChannelContext();
  const { activeTeam } = useTeamContext();

  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State for collapsible sections
  const [openSections, setOpenSections] = useState<{
    public: boolean;
    private: boolean;
    direct: boolean;
  }>({
    public: true,
    private: true,
    direct: true,
  });

  // Determine the team ID to use (from props or context)
  const effectiveTeamId = teamId || activeTeam?.id;

  // Load channels when teamId changes or component mounts
  useEffect(() => {
    if (!isConnected || !effectiveTeamId) return;

    // Use the context method to load channels
    const fetchChannels = async () => {
      console.log(`[ChannelList] Loading channels for team ${effectiveTeamId}`);

      try {
        // Use loadChannels from the context which handles setting activeChannel internally
        await loadChannels(effectiveTeamId);

        // Load user information for direct messages if there are any direct channels
        const teamChannels = channels[effectiveTeamId] || [];
        if (teamChannels.length > 0) {
          if (activeChannel) {
            const activeChannelIsInTeam = teamChannels.find(
              (c) => c.id === activeChannel.id,
            );
            if (!activeChannelIsInTeam) {
              setActiveChannel(teamChannels[0]);
            }
          } else {
            setActiveChannel(teamChannels[0]);
          }
        }
        const directChannels = teamChannels.filter(
          (c) => c.type === "D" || c.type === "G",
        );

        if (directChannels.length > 0) {
          await services?.userService?.loadDirectMessageUsers(directChannels);
        }
      } catch (err) {
        console.error("Error loading channels:", err);
      }
    };

    void fetchChannels();
  }, [isConnected, effectiveTeamId, loadChannels, channels]);

  // Toggle a section's expanded state
  const toggleSection = useCallback(
    (section: "public" | "private" | "direct") => {
      setOpenSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    },
    [],
  );

  // Filter channels based on search and visibility settings - memoized
  const filteredChannels = useMemo(() => {
    // Get channels for the current team from context
    const teamChannels = effectiveTeamId ? channels[effectiveTeamId] || [] : [];

    return teamChannels.filter((channel) => {
      // Filter by channel type
      if (channel.type === "P" && !showPrivateChannels) return false;
      if ((channel.type === "D" || channel.type === "G") && !showDirectMessages)
        return false;

      // Filter by search query
      if (searchQuery && searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return (
          channel.display_name.toLowerCase().includes(query) ||
          (channel.header && channel.header.toLowerCase().includes(query)) ||
          (channel.purpose && channel.purpose.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [
    channels,
    effectiveTeamId,
    showPrivateChannels,
    showDirectMessages,
    searchQuery,
  ]);

  // Group channels by type if requested
  const groupedChannels = useMemo(() => {
    if (groupByType) {
      return {
        public: filteredChannels.filter((c) => c.type === "O"),
        private: filteredChannels.filter((c) => c.type === "P"),
        direct: filteredChannels.filter(
          (c) => c.type === "D" || c.type === "G",
        ),
      };
    }
    return { all: filteredChannels };
  }, [filteredChannels, groupByType]);

  // Function to get display name for a channel
  const getChannelDisplayName = useCallback(
    (channel: Channel): string => {
      // For standard channels, use the display_name
      if (channel.type !== "D" && channel.type !== "G") {
        return channel.display_name;
      }

      // For direct messages, use user display name
      if (channel.name && channel.name.includes("__") && currentUser) {
        const parts = channel.name.split("__");
        // Find user ID that's not the current user
        const otherUserId = parts.find((id) => id !== currentUser.id);
        if (otherUserId) {
          return getUserDisplayName(otherUserId);
        }
      }

      // Fallback to channel display name
      return channel.display_name;
    },
    [currentUser, getUserDisplayName],
  );

  // Render loading skeletons
  const renderSkeletons = useCallback(
    () => (
      <Box sx={{ px: 2, py: 1 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Box
            key={index}
            sx={{ display: "flex", alignItems: "center", mb: 1 }}
          >
            <Skeleton
              variant="circular"
              width={24}
              height={24}
              sx={{ mr: 2 }}
            />
            <Skeleton
              variant="text"
              width={`${Math.random() * 40 + 50}%`}
              height={32}
            />
          </Box>
        ))}
      </Box>
    ),
    [],
  );

  // Render a section of channels
  const renderChannelSection = useCallback(
    (
      title: string | null,
      channelsList: Channel[],
      sectionKey: "public" | "private" | "direct" | "all",
    ) => {
      if (!channelsList || channelsList.length === 0) return null;

      const isExpandable = sectionKey !== "all";
      const isExpanded = isExpandable
        ? openSections[sectionKey as keyof typeof openSections]
        : true;

      return (
        <>
          {title && (
            <ListItemButton
              onClick={() =>
                isExpandable &&
                toggleSection(sectionKey as "public" | "private" | "direct")
              }
              sx={{
                px: 2,
                py: 1,
                "&:hover": {
                  backgroundColor: isExpandable
                    ? theme.palette.action.hover
                    : "transparent",
                },
                ...sectionHeaderSx,
              }}
            >
              <ListItemText
                primary={
                  <Typography
                    component={"div"}
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    {title} ({channelsList.length})
                  </Typography>
                }
              />
              {isExpandable &&
                (isExpanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                ))}
            </ListItemButton>
          )}

          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {channelsList.map((channel) => {
                const handleSelectChannel = () => {
                  onSelectChannel && onSelectChannel(channel);
                  setActiveChannel(channel);
                };
                const displayName = getChannelDisplayName(channel);
                return (
                  <ChannelItem
                    key={channel.id}
                    channel={{
                      ...channel,
                      display_name: displayName,
                    }}
                    isSelected={channel.id === activeChannel?.id}
                    onClick={handleSelectChannel}
                  />
                );
              })}
            </List>
          </Collapse>
        </>
      );
    },
    [
      activeChannel,
      getChannelDisplayName,
      onSelectChannel,
      openSections,
      sectionHeaderSx,
      setActiveChannel,
      theme.palette.action.hover,
      toggleSection,
    ],
  );

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        ...sx,
      }}
    >
      {/* Search bar */}
      {showSearch && (
        <Box sx={{ p: 1.5, ...searchSx }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="clear search"
                    onClick={() => setSearchQuery("")}
                    edge="end"
                    size="small"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}

      <Divider />

      {/* Main content area */}
      {isChannelsLoading[effectiveTeamId || ""] ? (
        renderSkeletons()
      ) : channelsError && channelsError[effectiveTeamId || ""] ? (
        <Box sx={{ p: 2, color: "error.main" }}>
          <Typography component={"div"} variant="body2" color="error">
            {channelsError[effectiveTeamId || ""]?.message ||
              "Error loading channels"}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            ...channelsContainerSx,
          }}
        >
          <List disablePadding>
            {groupByType ? (
              <>
                {renderChannelSection(
                  "Public Channels",
                  groupedChannels.public || [],
                  "public",
                )}
                {renderChannelSection(
                  "Private Channels",
                  groupedChannels.private || [],
                  "private",
                )}
                {renderChannelSection(
                  "Direct Messages",
                  groupedChannels.direct || [],
                  "direct",
                )}
              </>
            ) : (
              renderChannelSection(null, groupedChannels.all || [], "all")
            )}

            {filteredChannels.length === 0 && (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography
                  component={"div"}
                  variant="body2"
                  color="text.secondary"
                >
                  {searchQuery ? "No channels found" : "No channels available"}
                </Typography>
              </Box>
            )}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default ChannelList;
