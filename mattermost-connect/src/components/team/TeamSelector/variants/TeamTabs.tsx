// src/components/team/TeamSelector/variants/TeamTabs.tsx
import React from "react";
import { Team } from "../../../../types";

// Material-UI Components
import {
  Tabs,
  Tab,
  Box,
  Badge,
  Avatar,
  SxProps,
  Theme,
  useTheme,
  useMediaQuery,
} from "@mui/material";

// Utils
import {
  formatTeamName,
  generateColorFromString,
  getTeamInitials,
} from "../../../../utils";

/**
 * Props for the TeamTabs component
 */
export interface TeamTabsProps {
  /** Teams to display */
  teams: Team[];

  /** Currently selected team ID */
  selectedTeamId?: string;

  /** Callback when a team is selected */
  onSelectTeam: (team: Team) => void;

  /** Show team icons (if available) */
  showIcons?: boolean;

  /** Show team descriptions */
  showDescriptions?: boolean;

  /** Show team member count badges */
  showMemberCount?: boolean;

  /** Max number of characters for team name before truncating (0 for no limit) */
  maxNameLength?: number;

  /** Custom styling for team items */
  teamItemSx?: SxProps<Theme>;

  /** Custom styling for selected team */
  selectedTeamSx?: SxProps<Theme>;
}

/**
 * A horizontal tabs view of teams
 */
const TeamTabs: React.FC<TeamTabsProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  showMemberCount = false,
  maxNameLength = 0,
  teamItemSx,
  selectedTeamSx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Select first team if none is selected
  const currentTeamId = selectedTeamId || (teams.length > 0 ? teams[0].id : "");

  // Handle tab change
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    const team = teams.find((t) => t.id === newValue);
    if (team) {
      onSelectTeam(team);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
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
          "& .MuiTabs-flexContainer": {
            height: "100%",
          },
          "& .MuiTabs-indicator": {
            height: 3,
          },
        }}
      >
        {teams.map((team) => {
          const isSelected = team.id === currentTeamId;

          // Create label with optional icon and member count
          const teamLabel = (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 1,
              }}
            >
              {showIcons && (
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    fontSize: "0.75rem",
                    bgcolor: generateColorFromString(team.name),
                  }}
                >
                  {getTeamInitials(team.display_name)}
                </Avatar>
              )}

              {formatTeamName(team.display_name, maxNameLength)}

              {showMemberCount && team.member_count && !isMobile && (
                <Badge
                  badgeContent={team.member_count}
                  color="primary"
                  max={999}
                  sx={{ ml: 1.5 }}
                />
              )}
            </Box>
          );

          return (
            <Tab
              key={team.id}
              value={team.id}
              label={teamLabel}
              sx={{
                minHeight: 48,
                py: 1,
                px: 2,
                fontWeight: isSelected ? 600 : 400,
                "&.Mui-selected": {
                  color: "primary.main",
                  ...(selectedTeamSx as any),
                },
                ...(teamItemSx as any),
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
};

export default TeamTabs;
