// src/components/TeamSelector/TeamSelector.tsx
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { Team } from "../../types";

// Material-UI Components
import {
  Box,
  Typography,
  Skeleton,
  Alert,
  SxProps,
  Theme,
} from "@mui/material";

// Import variants
import TeamList from "./variants/TeamList";
import TeamGrid from "./variants/TeamGrid";
import TeamTabs from "./variants/TeamTabs";
import TeamSidebar from "./variants/TeamSidebar";

/**
 * Type for the display variant of the TeamSelector
 */
export type TeamSelectorVariant = "list" | "grid" | "tabs" | "sidebar";

/**
 * Props for the TeamSelector component
 */
export interface TeamSelectorProps {
  /** Currently selected team ID */
  selectedTeamId?: string;

  /** Callback when a team is selected */
  onSelectTeam?: (team: Team) => void;

  /** Display variant */
  variant?: TeamSelectorVariant;

  /** Show team icons (if available) */
  showIcons?: boolean;

  /** Show team descriptions */
  showDescriptions?: boolean;

  /** Show team member count badges */
  showMemberCount?: boolean;

  /** Use team order from server instead of alphabetical */
  useServerOrder?: boolean;

  /** Max number of characters for team name before truncating (0 for no limit) */
  maxNameLength?: number;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Custom styling for team items */
  teamItemSx?: SxProps<Theme>;

  /** Custom styling for selected team */
  selectedTeamSx?: SxProps<Theme>;
}

/**
 * A component that displays a list of teams and allows selection
 */
const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeamId,
  onSelectTeam,
  variant = "list",
  showIcons = true,
  showDescriptions = false,
  showMemberCount = false,
  useServerOrder = false,
  maxNameLength = 0,
  className,
  style,
  sx,
  teamItemSx,
  selectedTeamSx,
}) => {
  const { isConnected, getTeams } = useMattermost();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load teams when component mounts
  useEffect(() => {
    if (!isConnected) return;

    const fetchTeams = async () => {
      setLoading(true);
      try {
        const teamsData = await getTeams();

        // Sort teams if needed
        let sortedTeams = [...teamsData];
        if (!useServerOrder) {
          sortedTeams.sort((a, b) =>
            a.display_name.localeCompare(b.display_name),
          );
        }

        setTeams(sortedTeams);
        setError(null);
      } catch (err) {
        console.error("Error loading teams:", err);
        setError(err instanceof Error ? err.message : "Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    void fetchTeams();
  }, [isConnected, getTeams, useServerOrder]);

  // Handle team selection
  const handleTeamSelect = (team: Team) => {
    if (onSelectTeam) {
      onSelectTeam(team);
    }
  };

  // Render loading skeletons
  const renderSkeletons = () => {
    // Return different skeleton layouts based on variant
    switch (variant) {
      case "grid":
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, p: 2 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} sx={{ width: 100, textAlign: "center" }}>
                <Skeleton
                  variant="circular"
                  width={60}
                  height={60}
                  sx={{ mx: "auto" }}
                />
                <Skeleton
                  variant="text"
                  width={80}
                  sx={{ mx: "auto", mt: 1 }}
                />
              </Box>
            ))}
          </Box>
        );
      case "tabs":
        return (
          <Box sx={{ display: "flex", p: 1 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                width={120}
                height={32}
                sx={{ mx: 0.5 }}
              />
            ))}
          </Box>
        );
      case "sidebar":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              p: 1,
              alignItems: "center",
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="circular"
                width={40}
                height={40}
                sx={{ my: 1 }}
              />
            ))}
          </Box>
        );
      case "list":
      default:
        return (
          <Box sx={{ p: 1 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                height={40}
                sx={{ my: 0.5 }}
              />
            ))}
          </Box>
        );
    }
  };

  // Render the appropriate variant
  const renderVariant = () => {
    const sharedProps = {
      teams,
      selectedTeamId,
      onSelectTeam: handleTeamSelect,
      showIcons,
      showDescriptions,
      showMemberCount,
      maxNameLength,
      teamItemSx,
      selectedTeamSx,
    };

    switch (variant) {
      case "grid":
        return <TeamGrid {...sharedProps} />;
      case "tabs":
        return <TeamTabs {...sharedProps} />;
      case "sidebar":
        return <TeamSidebar {...sharedProps} />;
      case "list":
      default:
        return <TeamList {...sharedProps} />;
    }
  };

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: variant === "sidebar" ? "column" : "column",
        width: "100%",
        height: variant === "tabs" ? "auto" : "100%",
        bgcolor: "background.paper",
        ...sx,
      }}
    >
      {loading ? (
        renderSkeletons()
      ) : error ? (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      ) : teams.length === 0 ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No teams available
          </Typography>
        </Box>
      ) : (
        renderVariant()
      )}
    </Box>
  );
};

export default TeamSelector;
