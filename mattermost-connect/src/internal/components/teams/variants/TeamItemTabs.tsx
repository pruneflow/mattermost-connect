// src/internal/components/teams/variants/TeamItemTabs.tsx
/**
 * Tab item component for displaying a team in the TeamTabs variant
 */
import React from "react";
import { Tab, Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import { UnreadBadge } from "../../../components/common";
import TeamAvatar from "../TeamAvatar";
import { formatTeamName, hasUnreadMentions } from "../utils";

export interface TeamItemTabsProps extends BaseComponentProps {
  /** Team data */
  team: Team;
  /** Whether this tab is currently active/selected */
  isActive?: boolean;
  /** Callback when tab is clicked */
  onClick?: (team: Team) => void;
  /** Show team avatar/icon */
  showIcon?: boolean;
  /** Maximum name length before truncating */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { messageCount: number; mentionCount: number }>;
}

/**
 * Team item component for tabs view
 */
const TeamItemTabs: React.FC<TeamItemTabsProps> = ({
  team,
  isActive = false,
  onClick,
  showIcon = true,
  maxNameLength = 0,
  unreadCounts,
  className,
  sx,
  id,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get unread counts
  const unreadState =
    unreadCounts && unreadCounts[team.id]
      ? unreadCounts[team.id]
      : { messageCount: 0, mentionCount: 0 };

  const hasMentions = hasUnreadMentions(team, unreadCounts);

  // Handle tab click
  const handleClick = (event: React.SyntheticEvent, value: string) => {
    if (onClick) {
      onClick(team);
    }
  };

  // Create the tab label with optional icon
  const tabLabel = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexDirection: isMobile ? "column" : "row",
        gap: 1,
      }}
    >
      {showIcon && <TeamAvatar team={team} size={24} />}

      <UnreadBadge
        count={unreadState.messageCount}
        mentionCount={unreadState.mentionCount}
        showZero={false}
        mentionPriority={true}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{
            maxWidth: 120,
            textTransform: "none",
          }}
        >
          {formatTeamName(team.display_name, maxNameLength)}
        </Typography>
      </UnreadBadge>
    </Box>
  );

  return (
    <Tab
      value={team.id}
      label={tabLabel}
      className={className}
      onClick={(e) => handleClick(e, team.id)}
      sx={{
        minHeight: 48,
        py: 1,
        px: 2,
        fontWeight: isActive ? 600 : unreadState.messageCount > 0 ? 600 : 400,
        color:
          unreadState.messageCount > 0 && !isActive
            ? "text.primary"
            : undefined,
        "&.Mui-selected": {
          color: "primary.main",
        },
        ...sx,
      }}
      id={id}
    />
  );
};

export default TeamItemTabs;
