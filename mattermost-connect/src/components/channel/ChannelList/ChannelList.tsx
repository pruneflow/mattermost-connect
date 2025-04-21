// Implémentation modifiée du ChannelList.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useMattermost } from "../../../context";
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
  const {
    services,
    isConnected,
    currentUser,
    setActiveChannel,
    activeChannel,
    getUserDisplayName,
  } = useMattermost();

  const userService = services?.userService;

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pour éviter les appels répétés
  const directUsersLoadedRef = useRef<boolean>(false);

  const isMountedRef = useRef(true);
  const loadingAttemptRef = useRef(0);

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

  // Fonction pour obtenir le nom d'affichage d'un canal
  const getChannelDisplayName = useCallback(
    (channel: Channel): string => {
      // Pour les canaux normaux, utiliser le nom d'affichage standard
      if (channel.type !== "D" && channel.type !== "G") {
        return channel.display_name;
      }

      // Pour les canaux directs, utiliser le service utilisateur
      if (
        channel.name &&
        channel.name.includes("__") &&
        currentUser &&
        userService
      ) {
        const parts = channel.name.split("__");
        // Trouver l'ID qui n'est pas celui de l'utilisateur actuel
        const otherUserId = parts.find((id) => id !== currentUser.id);
        return getUserDisplayName(otherUserId!);
      }

      // Fallback sur le nom d'affichage par défaut
      return channel.display_name;
    },
    [currentUser, userService],
  );

  // Load channels when teamId changes - optimized to prevent multiple calls
  useEffect(() => {
    isMountedRef.current = true;

    const attemptId = ++loadingAttemptRef.current;
    const fetchChannels = async () => {
      // Prévenir les appels multiples
      if (!teamId) {
        console.log(`[ChannelList] No teamId provided, skipping load`);
        return;
      }

      console.log(
        `[ChannelList] Loading channels for team ${teamId}, attempt #${attemptId}`,
      );

      setLoading(true);
      try {
        const channelsData =
          await services?.mattermostService.getChannels(teamId);

        if (isMountedRef.current) {
          if (channelsData && channelsData.length > 0) {
            console.log(
              `[ChannelList] Setting channels state with ${channelsData.length} channels`,
            );
            if (activeChannel) {
              const activeChannelIsInTeam = channelsData.find(
                (c) => c.id === activeChannel.id,
              );
              if (!activeChannelIsInTeam) {
                setActiveChannel(channelsData[0]);
              }
            } else {
              setActiveChannel(channelsData[0]);
            }
            setChannels(channelsData);

            if (userService && !directUsersLoadedRef.current) {
              const directChannels = channelsData.filter(
                (c) => c.type === "D" || c.type === "G",
              );

              if (directChannels.length > 0) {
                // Extraire les IDs utilisateurs de tous les canaux directs
                const userIds = new Set<string>();
                directChannels.forEach((channel) => {
                  if (
                    channel.name &&
                    channel.name.includes("__") &&
                    currentUser
                  ) {
                    const parts = channel.name.split("__");
                    parts.forEach((part) => {
                      if (part !== currentUser.id) {
                        userIds.add(part);
                      }
                    });
                  }
                });

                // Utiliser getUsers pour charger tous les utilisateurs en une seule fois
                if (userIds.size > 0) {
                  await userService.getUsers(Array.from(userIds));
                  directUsersLoadedRef.current = true;
                }
              }
            }
          }
        } else {
          console.log(
            `[ChannelList] Component unmounted, discarding channel data`,
          );
        }

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

    // Réinitialiser le flag de chargement des utilisateurs à chaque changement d'équipe
    return () => {
      console.log(`[ChannelList] Unmounting, attempt #${attemptId}`);
      isMountedRef.current = false;
    };
  }, [isConnected, teamId, services, setActiveChannel, userService]);

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
          <Typography component={"div"} variant="body2" color="error">
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
