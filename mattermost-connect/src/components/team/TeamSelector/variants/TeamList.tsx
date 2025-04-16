// src/components/team/TeamSelector/variants/TeamList.tsx
import React from "react";
import { Team } from "../../../../types";

// Material-UI Components
import {
  List,
  ListItemButton,
  ListItemIcon,
  Avatar,
  Badge,
  Tooltip,
  Divider,
  SxProps,
  Theme,
  Box,
  Typography,
} from "@mui/material";

// Material-UI Icons
import { People as MembersIcon } from "@mui/icons-material";

// Utils
import {
  formatTeamName,
  generateColorFromString,
  getTeamInitials,
} from "../../../../utils";

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

  /** Unread counts for teams */
  teamUnreadCounts?: Record<
    string,
    { msg_count: number; mention_count: number }
  >;
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
  teamUnreadCounts = {},
}) => {
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
        const unreadState = teamUnreadCounts[team.id] || {
          msg_count: 0,
          mention_count: 0,
        };
        const hasUnreadMentions = unreadState.mention_count > 0;
        const hasUnreadMessages = unreadState.msg_count > 0;

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
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: generateColorFromString(team.name),
                      fontSize: "0.875rem",
                      boxShadow: "none",
                    }}
                  >
                    {getTeamInitials(team.display_name)}
                  </Avatar>
                </ListItemIcon>
              )}

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  overflow: "hidden",
                  mr: 1,
                }}
              >
                <Typography
                  variant="body1"
                  component="div"
                  noWrap
                  fontWeight={isSelected ? 600 : hasUnreadMessages ? 600 : 400}
                >
                  {formatTeamName(team.display_name, maxNameLength)}
                </Typography>

                {showDescriptions && team.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="div"
                    noWrap
                    sx={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {team.description}
                  </Typography>
                )}
              </Box>

              {/* Afficher le badge des mentions si présent */}
              {hasUnreadMentions && (
                <Badge
                  badgeContent={unreadState.mention_count}
                  color="error"
                  max={99}
                  sx={{ ml: 0.5 }}
                />
              )}

              {/* Afficher le badge des messages non lus si présent et pas de mentions */}
              {!hasUnreadMentions && hasUnreadMessages && (
                <Badge variant="dot" color="primary" sx={{ ml: 0.5 }} />
              )}

              {/* Afficher le nombre de membres si demandé et pas de badges non lus */}
              {showMemberCount &&
                team.member_count &&
                !hasUnreadMentions &&
                !hasUnreadMessages && (
                  <Tooltip title="Members">
                    <Badge
                      badgeContent={team.member_count}
                      color="primary"
                      max={999}
                      sx={{ ml: 0.5 }}
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
