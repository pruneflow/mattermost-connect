// src/internal/components/teams/variants/TeamTabs.tsx
/**
 * Component that displays teams in a tabbed format
 */
import React from "react";
import { Box, Tabs, Tab, Paper } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import TeamItemTabs from "./TeamItemTabs";

export interface TeamTabsProps extends BaseComponentProps {
  /** Teams to display */
  teams: Team[];
  /** Currently selected team ID */
  selectedTeamId?: string;
  /** Callback when a team is selected */
  onSelectTeam: (team: Team) => void;
  /** Whether to show icons */
  showIcons?: boolean;
  /** Max name length before truncation */
  maxNameLength?: number;
  /** Whether to allow team creation */
  allowCreate?: boolean;
  /** Callback when create team is clicked */
  onCreateTeam?: () => void;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
}

/**
 * A horizontal tabs view of teams
 */
const TeamTabs: React.FC<TeamTabsProps> = ({
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
  // Select first team if none is selected
  const currentTeamId = selectedTeamId || (teams.length > 0 ? teams[0].id : "");

  // Handle tab change
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    const team = teams.find((t) => t.id === newValue);
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

  return (
    <Box
      className={className}
      sx={{
        width: "100vw",
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
        value={currentTeamId}
        onChange={handleChange}
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
        {teams.map((team) => (
          <TeamItemTabs
            key={team.id}
            team={team}
            isActive={team.id === currentTeamId}
            onClick={onSelectTeam}
            showIcon={showIcons}
            maxNameLength={maxNameLength}
            unreadCounts={unreadCounts}
          />
        ))}

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
