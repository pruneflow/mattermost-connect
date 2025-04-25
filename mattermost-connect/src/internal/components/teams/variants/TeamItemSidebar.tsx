// src/internal/components/teams/variants/TeamItemSidebar.tsx
/**
 * Sidebar item component for displaying a team in the TeamSidebar variant
 */
import React from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Zoom,
  Typography,
  Divider,
} from "@mui/material";
import { People as MembersIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import TeamAvatar from "../TeamAvatar";
import { hasUnreadMessages, hasUnreadMentions } from "../utils";

export interface TeamItemSidebarProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Whether the team is selected */
  isSelected?: boolean;
  /** Callback when team is clicked */
  onClick?: (team: Team) => void;
  /** Show team description */
  showDescription?: boolean;
  /** Show member count */
  showMemberCount?: boolean;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
}

/**
 * Team item component for sidebar view
 */
const TeamItemSidebar: React.FC<TeamItemSidebarProps> = ({
  team,
  isSelected = false,
  onClick,
  showDescription = false,
  showMemberCount = false,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  // Check for unread messages or mentions
  const hasMessages = hasUnreadMessages(team, unreadCounts);
  const hasMentions = hasUnreadMentions(team, unreadCounts);

  // Get the mention count if any
  const mentionCount =
    hasMentions && unreadCounts && unreadCounts[team.id]
      ? unreadCounts[team.id].mentionCount
      : 0;

  // Handle team click
  const handleClick = () => {
    if (onClick) {
      onClick(team);
    }
  };

  return (
    <Box
      className={className}
      sx={{
        position: "relative",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        ...sx,
      }}
      id={id}
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
      {!isSelected && hasMessages && !hasMentions && (
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
              {hasMentions && (
                <span style={{ color: "#ff4444", marginLeft: "8px" }}>
                  ({mentionCount} mentions)
                </span>
              )}
            </Typography>
            {showDescription && team.description && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography
                  component={"div"}
                  variant="body2"
                  color="text.secondary"
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
                <MembersIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography
                  component={"div"}
                  variant="caption"
                  color="text.secondary"
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
          onClick={handleClick}
          sx={{
            p: 0.5,
            borderRadius: 2,
            border: isSelected ? 2 : hasMentions ? 2 : 0,
            borderColor: isSelected
              ? "primary.main"
              : hasMentions
                ? "error.main"
                : undefined,
            transform: isSelected ? "scale(1.1)" : "scale(1)",
            transition: "all 0.2s ease-in-out",
          }}
        >
          <TeamAvatar
            team={team}
            size="medium"
            mentionCount={mentionCount}
            showMentionBadge={hasMentions}
          />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default TeamItemSidebar;
