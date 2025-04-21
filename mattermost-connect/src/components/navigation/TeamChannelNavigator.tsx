// src/components/navigation/TeamChannelNavigator.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { useMattermost } from "../../context";
import { Team, Channel } from "../../types";

// Material-UI Components
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  SxProps,
  Theme,
  Avatar,
  Skeleton,
  Alert,
  List,
  Paper,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

// Existing components
import ChannelList from "../channel/ChannelList/ChannelList";
import { getTeamInitials, generateColorFromString } from "../../utils";

/**
 * Props for the TeamChannelNavigator component
 */
interface TeamChannelNavigatorProps {
  /** Whether to close the navigation after selection (useful for drawers) */
  closeOnSelect?: boolean;

  /** Callback called when navigation should be closed */
  onClose?: () => void;

  /** Whether to show the search bar in channel lists */
  showSearch?: boolean;

  /** Whether to show private channels */
  showPrivateChannels?: boolean;

  /** Whether to show direct messages */
  showDirectMessages?: boolean;

  /** Whether to group channels by type */
  groupByType?: boolean;

  /** Additional styling */
  sx?: SxProps<Theme>;

  /** Styling for team accordions */
  teamSx?: SxProps<Theme>;

  /** Styling for channel lists */
  channelListSx?: SxProps<Theme>;
}

/**
 * A component that integrates teams and channels in a single navigation experience
 * Shows teams as accordion headers with their channels as expandable content
 */
const TeamChannelNavigator: React.FC<TeamChannelNavigatorProps> = ({
  closeOnSelect = true,
  onClose,
  showSearch = true,
  showPrivateChannels = true,
  showDirectMessages = true,
  groupByType = true,
  sx,
  teamSx,
  channelListSx,
}) => {
  const { services, activeTeam, setActiveTeam } = useMattermost();

  // State
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(
    activeTeam?.id || null,
  );

  // Track mounted state to avoid memory leaks
  const isMounted = React.useRef(true);
  const instanceIdRef = useRef(
    `team-channel-navigator-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const instanceId = instanceIdRef.current;
    console.log(
      `[TeamChannelNavigator ${instanceId}] MOUNTED, setting isMounted=true`,
    );
    isMounted.current = true;

    return () => {
      console.log(
        `[TeamChannelNavigator ${instanceId}] UNMOUNTED, setting isMounted=false`,
      );
      isMounted.current = false;
    };
  }, []);

  // Effect to load teams
  useEffect(() => {
    const loadTeams = async () => {
      if (!services || !services.mattermostService) return;

      setLoadingTeams(true);
      try {
        const teamsData = await services.mattermostService.getTeams();
        if (isMounted.current) {
          // Sort teams alphabetically by display_name
          const sortedTeams = [...teamsData].sort((a, b) =>
            a.display_name.localeCompare(b.display_name),
          );
          setTeams(sortedTeams);

          // If there's an active team, expand it by default
          if (activeTeam) {
            setExpandedTeamId(activeTeam.id);
          }
          // Otherwise expand the first team
          else if (sortedTeams.length > 0) {
            setExpandedTeamId(sortedTeams[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading teams:", error);
        if (isMounted.current) {
          setTeamsError(
            error instanceof Error ? error.message : "Failed to load teams",
          );
        }
      } finally {
        if (isMounted.current) {
          setLoadingTeams(false);
        }
      }
    };

    void loadTeams();
  }, [services]);

  // Render loading state
  const renderLoading = useMemo(
    () => (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3].map((index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={24} width="60%" />
          </Box>
        ))}
      </Box>
    ),
    [],
  );

  // Render single team accordion
  const renderTeamAccordion = useCallback(
    (team: Team) => {
      const isExpanded = expandedTeamId === team.id;
      const handleChannelSelect = () => {
        if (!activeTeam || team.id !== activeTeam.id) {
          setActiveTeam(team);
        }

        // Close the drawer if requested
        if (closeOnSelect && onClose) {
          onClose();
        }
      };

      const handleChange = () => setExpandedTeamId(isExpanded ? null : team.id);
      return (
        <Accordion
          key={team.id}
          expanded={isExpanded}
          onChange={handleChange}
          sx={{
            mb: 0.5,
            "&.Mui-expanded": {
              mt: 0,
              mb: 0.5,
            },
            ...(teamSx as any),
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              minHeight: 56,
              "&.Mui-expanded": {
                minHeight: 56,
              },
              bgcolor: isExpanded ? "action.selected" : "transparent",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  mr: 1.5,
                  bgcolor: generateColorFromString(team.name),
                  fontSize: "0.9rem",
                }}
              >
                {getTeamInitials(team.display_name)}
              </Avatar>
              <Typography variant="subtitle1" component="div">
                {team.display_name}
              </Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 0, pt: 1 }}>
            {isExpanded && (
              <ChannelList
                teamId={team.id}
                showSearch={showSearch}
                showPrivateChannels={showPrivateChannels}
                showDirectMessages={showDirectMessages}
                groupByType={groupByType}
                onSelectChannel={handleChannelSelect}
                sx={channelListSx}
              />
            )}
          </AccordionDetails>
        </Accordion>
      );
    },
    [
      expandedTeamId,
      activeTeam,
      showSearch,
      showPrivateChannels,
      showDirectMessages,
      groupByType,
      teamSx,
      channelListSx,
    ],
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        ...sx,
      }}
    >
      <Paper elevation={0} sx={{ flexGrow: 1, overflow: "auto" }}>
        {loadingTeams ? (
          renderLoading
        ) : teamsError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {teamsError}
          </Alert>
        ) : teams.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No teams available
          </Alert>
        ) : (
          <List disablePadding>{teams.map(renderTeamAccordion)}</List>
        )}
      </Paper>
    </Box>
  );
};

export default TeamChannelNavigator;
