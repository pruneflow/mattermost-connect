// src/components/TeamSelector/variants/TeamList.tsx
import React from "react";
import { Team } from "../../../types";

// Material-UI Components
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge,
  Tooltip,
  Divider,
  SxProps,
  Theme,
} from "@mui/material";

// Material-UI Icons
import { People as MembersIcon } from "@mui/icons-material";

// Utils
import {
  generateColorFromString,
  truncateText,
} from "../../../utils/formatting";

/**
 * Props for the TeamList component
 */
export interface TeamListProps {
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
 * A vertical list view of teams
 */
const TeamList: React.FC<TeamListProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showIcons = true,
  showDescriptions = false,
  showMemberCount = false,
  maxNameLength = 0,
  teamItemSx,
  selectedTeamSx,
}) => {
  // Get the initials from team name
  const getTeamInitials = (team: Team): string => {
    const words = team.display_name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) + words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  // Format the team name if maxNameLength is set
  const formatTeamName = (name: string): string => {
    if (!maxNameLength || name.length <= maxNameLength) return name;
    return truncateText(name, maxNameLength);
  };

  return (
    <List
      component="nav"
      sx={{
        width: "100%",
        padding: 1,
      }}
    >
      {teams.map((team) => {
        const isSelected = team.id === selectedTeamId;

        return (
          <React.Fragment key={team.id}>
            <ListItemButton
              selected={isSelected}
              onClick={() => onSelectTeam(team)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                "&.Mui-selected": {
                  backgroundColor: (theme) => theme.palette.action.selected,
                  color: "primary.main",
                  "&:hover": {
                    backgroundColor: (theme) => theme.palette.action.hover,
                  },
                  ...(selectedTeamSx as any),
                },
                ...(teamItemSx as any),
              }}
            >
              {showIcons && (
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: generateColorFromString(team.name),
                      fontSize: "0.875rem",
                    }}
                  >
                    {getTeamInitials(team)}
                  </Avatar>
                </ListItemIcon>
              )}

              <ListItemText
                primary={formatTeamName(team.display_name)}
                secondary={
                  showDescriptions && team.description ? team.description : null
                }
                slotProps={{
                  primary: {
                    fontWeight: isSelected ? 600 : 400,
                    variant: "body1",
                  },
                  secondary: { noWrap: true, variant: "body2" },
                }}
              />

              {showMemberCount && team.member_count && (
                <Tooltip title="Members">
                  <Badge
                    badgeContent={team.member_count}
                    color="primary"
                    max={999}
                    sx={{ ml: 1 }}
                  >
                    <MembersIcon fontSize="small" />
                  </Badge>
                </Tooltip>
              )}
            </ListItemButton>

            {/* Add divider between teams if descriptions are shown */}
            {showDescriptions && teams.indexOf(team) < teams.length - 1 && (
              <Divider variant="middle" sx={{ my: 1 }} />
            )}
          </React.Fragment>
        );
      })}
    </List>
  );
};

export default TeamList;
