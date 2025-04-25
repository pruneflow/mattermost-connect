// src/internal/components/teams/variants/TeamItemList.tsx
/**
 * List item component for displaying a team in the TeamList variant
 */
import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  Badge,
  Tooltip,
  Typography,
  Box,
} from "@mui/material";
import { People as MembersIcon } from "@mui/icons-material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import TeamAvatar from "../TeamAvatar";
import { formatTeamName, hasUnreadMessages, hasUnreadMentions } from "../utils";

export interface TeamItemListProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Whether the team is selected */
  isSelected?: boolean;
  /** Callback when team is clicked */
  onClick?: (team: Team) => void;
  /** Show team avatar/icon */
  showIcon?: boolean;
  /** Show team description */
  showDescription?: boolean;
  /** Show member count */
  showMemberCount?: boolean;
  /** Maximum name length before truncating */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
}

/**
 * Team item component for list view
 */
const TeamItemList: React.FC<TeamItemListProps> = ({
  team,
  isSelected = false,
  onClick,
  showIcon = true,
  showDescription = false,
  showMemberCount = false,
  maxNameLength = 0,
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
    <ListItem disablePadding className={className} sx={sx} id={id}>
      <ListItemButton
        selected={isSelected}
        onClick={handleClick}
        sx={{
          borderRadius: 1,
          mb: 0.5,
          "&.Mui-selected": {
            backgroundColor: (theme) => theme.palette.action.selected,
            color: "primary.main",
            "&:hover": {
              backgroundColor: (theme) => theme.palette.action.hover,
            },
          },
        }}
      >
        {showIcon && (
          <ListItemIcon sx={{ minWidth: 40 }}>
            <TeamAvatar
              team={team}
              size="small"
              mentionCount={mentionCount}
              showMentionBadge={false}
            />
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
            fontWeight={isSelected ? 600 : hasMessages ? 600 : 400}
          >
            {formatTeamName(team.display_name, maxNameLength)}
          </Typography>

          {showDescription && team.description && (
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

        {/* Mention badge */}
        {hasMentions && (
          <Badge
            badgeContent={mentionCount}
            color="error"
            max={99}
            sx={{ ml: 0.5 }}
          />
        )}

        {/* Unread message indicator */}
        {!hasMentions && hasMessages && (
          <Badge variant="dot" color="primary" sx={{ ml: 0.5 }} />
        )}

        {/* Member count badge */}
        {showMemberCount &&
          team.member_count &&
          !hasMentions &&
          !hasMessages && (
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
    </ListItem>
  );
};

export default TeamItemList;
