// src/internal/components/teams/variants/TeamTabs.tsx

import React from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { TeamVariantProps } from "../types";
import TeamItemTabs from "./TeamItemTabs";

/**
 * A horizontal tabs view of teams
 */
const TeamTabs: React.FC<TeamVariantProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  maxNameLength = 0,
  allowCreate = false,
  onCreateTeam,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  console.debug("selectedTeamId", selectedTeamId);
  // Handle tab change
  const handleChange = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    console.debug("handle change team", team);
    if (team) {
      onSelectTeam(team);
    }
  };

  // Handle create team button click
  const handleCreateTeam = () => {
    if (onCreateTeam) {
      onCreateTeam();
    }
  };
  console.debug("teams", teams);
  return (
    <Box
      className={className}
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        display: "block",
        position: "relative",
        zIndex: 1,
        mb: 1,
        ...sx,
      }}
      id={id}
    >
      <Tabs
        value={selectedTeamId}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Team selector tabs"
        sx={{
          minHeight: 48,
          width: "100%",
          "& .MuiTabs-flexContainer": {
            height: "100%",
          },
          "& .MuiTabs-indicator": {
            height: 3,
          },
        }}
      >
        {teams.map((team) => {
          return (
            <TeamItemTabs
              key={team.id}
              value={team.id}
              onClick={handleChange}
              team={team}
              isActive={team.id === selectedTeamId}
              showIcon={showIcons}
              maxNameLength={maxNameLength}
              unreadCounts={unreadCounts}
            />
          );
        })}

        {allowCreate && (
          <Tab
            icon={<AddIcon />}
            iconPosition="start"
            label="Create"
            onClick={handleCreateTeam}
          />
        )}
      </Tabs>
    </Box>
  );
};

export default TeamTabs;
