// src/components/ChannelList/ChannelList.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { Channel } from "../../types";

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

  /** Currently selected channel ID */
  selectedChannelId?: string;

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
  selectedChannelId,
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
  const { service, isConnected } = useMattermost();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

  // Load channels when teamId changes
  useEffect(() => {
    if (!isConnected || !teamId) return;

    const fetchChannels = async () => {
      setLoading(true);
      try {
        const channelsData = await service?.getChannels(teamId);
        setChannels(channelsData || []);
        setError(null);
      } catch (err) {
        console.error("Error loading channels:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load channels",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchChannels();
  }, [isConnected, teamId, service]);

  // Toggle a section's expanded state
  const toggleSection = (section: "public" | "private" | "direct") => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter channels based on search and visibility settings
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
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
  }, [channels, showPrivateChannels, showDirectMessages, searchQuery]);

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

  // Render loading skeletons
  const renderSkeletons = () => (
    <Box sx={{ px: 2, py: 1 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Box key={index} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Skeleton variant="circular" width={24} height={24} sx={{ mr: 2 }} />
          <Skeleton
            variant="text"
            width={`${Math.random() * 40 + 50}%`}
            height={32}
          />
        </Box>
      ))}
    </Box>
  );

  // Render a section of channels
  const renderChannelSection = (
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
            {channelsList.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isSelected={channel.id === selectedChannelId}
                onClick={() => onSelectChannel && onSelectChannel(channel)}
              />
            ))}
          </List>
        </Collapse>
      </>
    );
  };

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
            slotProps={{
              input: {
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
              },
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
      {loading ? (
        renderSkeletons()
      ) : error ? (
        <Box sx={{ p: 2, color: "error.main" }}>
          <Typography variant="body2" color="error">
            {error}
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
                <Typography variant="body2" color="text.secondary">
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
