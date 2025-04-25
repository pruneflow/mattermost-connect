// src/internal/containers/teams/TeamSelector.tsx
/**
 * Container component for team selection that manages data fetching and state
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Alert,
  Typography,
  Skeleton,
  SxProps,
  Theme,
} from "@mui/material";
import { useTeams } from "../../../hooks/useTeams";
import { BaseComponentProps } from "../../types/componentTypes";
import { Team } from "../../../index";

// Import variants
import TeamList from "../../components/teams/variants/TeamList";
import TeamGrid from "../../components/teams/variants/TeamGrid";
import TeamTabs from "../../components/teams/variants/TeamTabs";
import TeamSidebar from "../../components/teams/variants/TeamSidebar";

export type TeamSelectorVariant = "list" | "grid" | "tabs" | "sidebar";

export interface TeamSelectorProps extends BaseComponentProps {
  /** Selected team ID */
  selectedTeamId?: string;
  /** Callback when a team is selected */
  onSelectTeam?: (team: Team) => void;
  /** Display variant */
  variant?: TeamSelectorVariant;
  /** Whether to show team icons */
  showIcons?: boolean;
  /** Whether to show team descriptions */
  showDescriptions?: boolean;
  /** Whether to show team member counts */
  showMemberCount?: boolean;
  /** Max length of team names before truncation */
  maxNameLength?: number;
  /** Whether to allow team creation */
  allowCreate?: boolean;
  /** Whether to show search input */
  showSearch?: boolean;
  /** Custom styling for team items */
  teamItemSx?: SxProps<Theme>;
  /** Custom styling for selected team */
  selectedTeamSx?: SxProps<Theme>;
}

/**
 * Component for selecting teams with different display variants
 */
const TeamSelector: React.FC<TeamSelectorProps> = ({
  selectedTeamId,
  onSelectTeam,
  variant = "list",
  showIcons = true,
  showDescriptions = false,
  showMemberCount = false,
  maxNameLength = 0,
  allowCreate = false,
  showSearch = false,
  className,
  sx,
  id,
}) => {
  // Get teams data using the hook
  const { teams, activeTeam, setActiveTeam, isLoading, error } = useTeams();

  // Local search state
  const [searchTerm, setSearchTerm] = useState("");

  // Map unread counts (this would come from a real data source in a full implementation)
  const unreadCounts = useMemo(() => {
    // Placeholder for actual unread counts that would come from a store
    const counts: Record<
      string,
      { messageCount: number; mentionCount: number }
    > = {};

    // This is a placeholder. In a real app, we would get actual unread counts
    teams.forEach((team) => {
      counts[team.id] = {
        messageCount: 0, // Replace with actual unread counts
        mentionCount: 0, // Replace with actual mention counts
      };
    });

    return counts;
  }, [teams]);

  // Filter teams based on search term
  const filteredTeams = useMemo(() => {
    if (!searchTerm) return teams;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return teams.filter(
      (team) =>
        team.display_name.toLowerCase().includes(lowerSearchTerm) ||
        team.name.toLowerCase().includes(lowerSearchTerm) ||
        (team.description &&
          team.description.toLowerCase().includes(lowerSearchTerm)),
    );
  }, [teams, searchTerm]);

  // Handle team selection
  const handleTeamSelect = useCallback(
    (team: Team) => {
      setActiveTeam(team);
      if (onSelectTeam) {
        onSelectTeam(team);
      }
    },
    [setActiveTeam, onSelectTeam],
  );

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle create team
  const handleCreateTeam = useCallback(() => {
    console.log("Creating new team");
    // In a real implementation, this would open a dialog or navigate to a creation form
  }, []);

  // Sync selected team ID with active team
  useEffect(() => {
    if (selectedTeamId && teams.length > 0) {
      const selected = teams.find((team) => team.id === selectedTeamId);
      if (selected && selected.id !== activeTeam?.id) {
        setActiveTeam(selected);
      }
    }
  }, [selectedTeamId, teams, activeTeam, setActiveTeam]);

  // Render skeletons while loading
  const renderSkeletons = useCallback(() => {
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
  }, [variant]);

  // Conditional rendering based on state
  const renderContent = () => {
    if (isLoading) {
      return renderSkeletons();
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          {error instanceof Error ? error.message : "Failed to load teams"}
        </Alert>
      );
    }

    if (teams.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No teams available
          </Typography>
        </Box>
      );
    }

    // Common props for all variants
    const commonProps = {
      teams: filteredTeams,
      selectedTeamId: selectedTeamId || activeTeam?.id,
      onSelectTeam: handleTeamSelect,
      unreadCounts,
    };

    // Render the appropriate variant
    switch (variant) {
      case "grid":
        return (
          <TeamGrid
            {...commonProps}
            showIcons={showIcons}
            showDescriptions={showDescriptions}
            showMemberCount={showMemberCount}
            maxNameLength={maxNameLength}
            allowCreate={allowCreate}
            showSearch={showSearch}
            searchTerm={searchTerm}
            onSearch={handleSearch}
            onCreateTeam={handleCreateTeam}
          />
        );
      case "tabs":
        return (
          <TeamTabs
            {...commonProps}
            showIcons={showIcons}
            maxNameLength={maxNameLength}
            allowCreate={allowCreate}
            onCreateTeam={handleCreateTeam}
          />
        );
      case "sidebar":
        return (
          <TeamSidebar
            {...commonProps}
            showDescriptions={showDescriptions}
            showMemberCount={showMemberCount}
            allowCreate={allowCreate}
            onCreateTeam={handleCreateTeam}
          />
        );
      case "list":
      default:
        return (
          <TeamList
            {...commonProps}
            showIcons={showIcons}
            showDescriptions={showDescriptions}
            showMemberCount={showMemberCount}
            maxNameLength={maxNameLength}
            allowCreate={allowCreate}
            showSearch={showSearch}
            searchTerm={searchTerm}
            onSearch={handleSearch}
            onCreateTeam={handleCreateTeam}
          />
        );
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: variant === "sidebar" ? "column" : "column",
        width: "100%",
        height: variant === "tabs" ? "auto" : "100%",
        bgcolor: "background.paper",
        ...sx,
      }}
      id={id}
    >
      {renderContent()}
    </Box>
  );
};

export default TeamSelector;
