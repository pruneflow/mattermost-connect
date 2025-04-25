import React from "react";
import { Badge, BadgeProps, styled } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface UnreadBadgeProps extends BaseComponentProps {
  /** Number of unread items */
  count?: number;
  /** Number of mentions */
  mentionCount?: number;
  /** Whether the badge should be shown if count is 0 */
  showZero?: boolean;
  /** Maximum number to display before showing '+' */
  max?: number;
  /** Color of the badge */
  color?: BadgeProps["color"];
  /** Badge sizing variant */
  size?: "small" | "medium";
  /** Whether mention count should have priority */
  mentionPriority?: boolean;
  /** Children to wrap with the badge */
  children?: React.ReactNode;
}

// Styled badge for mentions (higher priority)
const MentionBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    fontWeight: "bold",
  },
}));

// Styled badge for normal unread count
const CountBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

/**
 * A badge component that displays unread counts or mentions with appropriate styling
 *
 * @param count - Number of unread items
 * @param mentionCount - Number of mentions (higher priority than count)
 * @param showZero - Whether to show the badge when count is 0
 * @param max - Maximum number to display before showing '+'
 * @param color - Color of the badge
 * @param size - Size variant of the badge (not passed to Badge component)
 * @param mentionPriority - Whether mention count should take priority over unread count
 * @param children - Content to wrap with the badge
 * @param className - Classname add to the component
 * @param sx - Custom sx style
 * @param id - Id pass to the component
 */
const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  count = 0,
  mentionCount = 0,
  showZero = false,
  max = 99,
  color = "primary",
  size = "medium",
  mentionPriority = true,
  children,
  className,
  sx,
  id,
}) => {
  // Determine which count to show based on priority
  const showMention = mentionCount > 0;
  const showCount = (count > 0 || showZero) && !showMention;

  // Don't render any badge if there's nothing to show
  if (!showMention && !showCount) {
    return <>{children}</>;
  }

  // Adjust badge size based on size prop
  const badgeSx = {
    "& .MuiBadge-badge": {
      fontSize: size === "small" ? "0.6rem" : "0.75rem",
      height: size === "small" ? 16 : 20,
      minWidth: size === "small" ? 16 : 20,
      padding: size === "small" ? "0 4px" : "0 6px",
    },
    ...sx,
  };

  // Use mention badge if there are mentions (higher priority)
  if (showMention && mentionPriority) {
    return (
      <MentionBadge
        badgeContent={mentionCount > max ? `${max}+` : mentionCount}
        color="error"
        max={max}
        className={className}
        sx={badgeSx}
        id={id}
      >
        {children}
      </MentionBadge>
    );
  }

  // Otherwise use regular count badge
  return (
    <CountBadge
      badgeContent={count > max ? `${max}+` : count}
      color={color}
      max={max}
      className={className}
      sx={badgeSx}
      id={id}
      invisible={!showZero && count === 0}
    >
      {children}
    </CountBadge>
  );
};

export default UnreadBadge;
