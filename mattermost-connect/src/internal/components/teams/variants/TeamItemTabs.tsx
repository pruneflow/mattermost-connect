// src/internal/components/teams/variants/TeamItemTabs.tsx
/**
 * Tab item component for displaying a team in the TeamTabs variant
 */
import React from "react";
import { Tab, Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Team } from "../../../../index";
import { BaseComponentProps } from "../../../types/componentTypes";
import { UnreadBadge } from "../../../components/common";
import TeamAvatar from "../components/TeamAvatar";
import { formatTeamName, hasUnreadMentions } from "../utils/";

export interface TeamItemTabsProps extends BaseComponentProps {
  value: string;
  /** Team data */
  team: Team;
  /** Whether this tab is currently active/selected */
  isActive?: boolean;
  /** Callback when tab is clicked */
  onClick?: (teamId: string) => void;
  /** Show team avatar/icon */
  showIcon?: boolean;
  /** Maximum name length before truncating */
  maxNameLength?: number;
  /** Unread counts for teams */
  unreadCounts?: Record<string, { msg_count: number; mention_count: number }>;
}

/**
 * Team item component for tabs view
 */
const TeamItemTabs: React.FC<TeamItemTabsProps> = ({
  value,
  team,
  isActive = false,
  showIcon = true,
  maxNameLength = 0,
  unreadCounts,
  className,
  sx,
  id,
  onClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get unread counts
  const unreadState =
    unreadCounts && unreadCounts[team.id]
      ? unreadCounts[team.id]
      : { msg_count: 0, mention_count: 0 };

  const handleClick = () => {
    if (onClick) {
      onClick(value);
    }
  };

  const teamLabel = (
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
        count={unreadState.msg_count}
        mention_count={unreadState.mention_count}
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
      id={id}
      key={team.id}
      value={value}
      label={teamLabel}
      className={className}
      onClick={handleClick}
      sx={{
        minHeight: 48,
        py: 1,
        px: 2,
        fontWeight: isActive ? 600 : unreadState.msg_count ? 600 : 400,
        color: unreadState.msg_count && !isActive ? "text.primary" : undefined,
        "&.Mui-selected": {
          color: "primary.main",
        },
        ...sx,
      }}
    />
  );
};

export default TeamItemTabs;
