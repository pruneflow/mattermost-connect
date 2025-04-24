// src/components/team/TeamSelector/variants/TeamSidebar.tsx
import React from "react";
import { Team } from "../../../../types";

// Material-UI Components
import {
  Box,
  Stack,
  Avatar,
  Tooltip,
  Badge,
  IconButton,
  Zoom,
  SxProps,
  Theme,
  Typography,
  Divider,
} from "@mui/material";

// Material-UI Icons
import { People as MembersIcon } from "@mui/icons-material";

// Utils
import { generateColorFromString, getTeamInitials } from "../../../../utils";

/**
 * Props for the TeamSidebar component
 */
export interface TeamSidebarProps {
  /** Teams to display */
  teams: Team[];

  /** Currently selected team ID */
  selectedTeamId?: string;

  /** Callback when a team is selected */
  onSelectTeam: (team: Team) => void;

  /** Show team descriptions */
  showDescriptions?: boolean;

  /** Show team member count badges */
  showMemberCount?: boolean;

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
 * A vertical sidebar with team icons
 */
const TeamSidebar: React.FC<TeamSidebarProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showDescriptions = false,
  showMemberCount = false,
  teamItemSx,
  selectedTeamSx,
  teamUnreadCounts = {},
}) => {
  // Select first team if none is selected
  const currentTeamId = selectedTeamId || (teams.length > 0 ? teams[0].id : "");

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Team icons sidebar */}
      <Box
        sx={{
          width: "100px",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? theme.palette.grey[900]
              : theme.palette.grey[100],
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 2,
          pb: 2,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Stack spacing={2} sx={{ width: "100%", alignItems: "center" }}>
          {teams.map((team) => {
            const isSelected = team.id === currentTeamId;
            const unreadState = teamUnreadCounts[team.id] || {
              msg_count: 0,
              mention_count: 0,
            };
            const hasUnreadMentions = unreadState.mention_count > 0;
            const hasUnreadMessages = unreadState.msg_count > 0;

            return (
              <Box
                key={team.id}
                sx={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 4,
                      height: 20,
                      bgcolor: "primary.main",
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                    }}
                  />
                )}

                {/* Unread messages indicator */}
                {!isSelected && hasUnreadMessages && !hasUnreadMentions && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 4,
                      height: 20,
                      bgcolor: "primary.light",
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                    }}
                  />
                )}

                <Tooltip
                  title={
                    <Box>
                      <Typography component={"div"} variant="body2">
                        {team.display_name}
                        {hasUnreadMentions && (
                          <span style={{ color: "#ff4444", marginLeft: "8px" }}>
                            ({unreadState.mention_count} mentions)
                          </span>
                        )}
                      </Typography>
                      {showDescriptions && team.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography
                            component={"div"}
                            variant="body2"
                            color="white"
                          >
                            {team.description}
                          </Typography>
                        </>
                      )}
                      {showMemberCount && team.member_count && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mt: 1,
                          }}
                        >
                          <MembersIcon
                            fontSize="small"
                            sx={{ mr: 0.5, color: "white" }}
                          />
                          <Typography
                            component={"div"}
                            variant="caption"
                            color="white"
                          >
                            {team.member_count} members
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                  placement="right"
                  slots={{ transition: Zoom }}
                >
                  <IconButton
                    onClick={() => onSelectTeam(team)}
                    sx={{
                      p: 0.5,
                      borderRadius: 2,
                      border: isSelected ? 2 : hasUnreadMentions ? 2 : 0,
                      borderColor: isSelected
                        ? "primary.main"
                        : hasUnreadMentions
                          ? "error.main"
                          : undefined,
                      transform: isSelected ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.2s ease-in-out",
                      ...(isSelected ? (selectedTeamSx as any) : {}),
                      ...(teamItemSx as any),
                    }}
                  >
                    <Badge
                      overlap="circular"
                      badgeContent={
                        hasUnreadMentions ? unreadState.mention_count : null
                      }
                      color="error"
                      max={99}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: generateColorFromString(team.name),
                          fontSize: "1rem",
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        {getTeamInitials(team.display_name)}
                      </Avatar>
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};

export default TeamSidebar;
