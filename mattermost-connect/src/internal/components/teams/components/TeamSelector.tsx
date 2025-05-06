// src/internal/components/teams/components/TeamSelector.tsx

import React from "react";
import { Box } from "@mui/material";
import { TeamSelectorProps } from "../types";

// Import variants
import TeamList from "../variants/TeamList";
import TeamGrid from "../variants/TeamGrid";
import TeamTabs from "../variants/TeamTabs";
import TeamSidebar from "../variants/TeamSidebar";

/**
 * Pure UI component for selecting teams with different display variants
 */
const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  variant = "list",
  showIcons = true,
  showDescription = false,
  showMemberCount = false,
  maxNameLength = 0,
  allowCreate = false,
  showSearch = false,
  searchTerm = "",
  onSearch,
  unreadCounts,
  onCreateTeam,
  className,
  sx,
  id,
}) => {
  const currentTeamId = selectedTeamId || (teams.length > 0 ? teams[0].id : "");

  // Define default no-op function for onSelectTeam if it's undefined
  const handleSelectTeam = (team: Team) => {
    if (onSelectTeam) {
      onSelectTeam(team);
    }
  };

  // Common props for all variants
  const commonProps = {
    teams,
    selectedTeamId: currentTeamId,
    onSelectTeam: handleSelectTeam, // Use the wrapper function
    showIcons,
    showDescription,
    showMemberCount,
    maxNameLength,
    allowCreate,
    unreadCounts,
    onCreateTeam,
  };

  // Search props for variants that support search
  const searchProps = showSearch
    ? {
        showSearch,
        searchTerm,
        onSearch,
      }
    : {};

  // Render the appropriate variant
  const renderVariant = () => {
    switch (variant) {
      case "grid":
        return <TeamGrid {...commonProps} {...searchProps} />;
      case "tabs":
        return <TeamTabs {...commonProps} />;
      case "sidebar":
        return <TeamSidebar {...commonProps} />;
      case "list":
      default:
        return <TeamList {...commonProps} {...searchProps} />;
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
      {renderVariant()}
    </Box>
  );
};

// Import Team type at the end to avoid circular dependency issues
import { Team } from "../../../../types";

export default TeamSelector;
