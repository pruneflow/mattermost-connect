// src/internal/components/common/UnreadBadge.tsx
/**
 * Reusable component for displaying unread message counts
 */
import React from "react";
import { Badge, Box, Typography } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { formatUnreadBadgeData } from "../../../utils/unreadCountUtils";

export interface UnreadBadgeProps extends BaseComponentProps {
  /** Number of unread messages */
  messageCount: number;
  /** Number of mention notifications */
  mentionCount: number;
  /** Whether the channel/item is muted */
  isMuted?: boolean;
  /** Whether to show a dot indicator instead of a count for unreads */
  showDotForUnreads?: boolean;
  /** Badge vertical position */
  vertical?: "top" | "bottom";
  /** Badge horizontal position */
  horizontal?: "left" | "right";
  /** Element to wrap with the badge */
  children?: React.ReactNode;
  /** Override for max count before showing + */
  maxDisplayCount?: number;
  /** Size of the badge */
  size?: "small" | "medium" | "large";
}

/**
 * Component for displaying unread message and mention counts
 *
 * Can be used as a standalone badge or to wrap other elements
 */
const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  messageCount = 0,
  mentionCount = 0,
  isMuted = false,
  showDotForUnreads = false,
  vertical = "top",
  horizontal = "right",
  children,
  maxDisplayCount = 99,
  size = "medium",
  className,
  sx,
  id,
}) => {
  // Format badge data for display
  const badgeData = formatUnreadBadgeData(messageCount, mentionCount, isMuted);

  // Handle case where we want to show a dot for unreads
  let badgeContent: React.ReactNode = badgeData.text;

  if (showDotForUnreads && messageCount > 0 && mentionCount === 0 && !isMuted) {
    badgeContent = "";
    // Empty content will make the badge show a dot
  }

  // If there's nothing to show, render children without a badge
  if (!badgeData.text && !showDotForUnreads) {
    return <>{children}</> || null;
  }

  // If used as a standalone badge (no children)
  if (!children) {
    return (
      <Box className={className} sx={sx} id={id}>
        <Badge
          badgeContent={badgeContent}
          color={badgeData.color}
          variant={
            showDotForUnreads && messageCount > 0 && mentionCount === 0
              ? "dot"
              : "standard"
          }
          sx={{
            "& .MuiBadge-badge": {
              fontSize:
                size === "small"
                  ? "0.65rem"
                  : size === "large"
                    ? "0.85rem"
                    : "0.75rem",
              height: size === "small" ? 16 : size === "large" ? 22 : 20,
              minWidth: size === "small" ? 16 : size === "large" ? 22 : 20,
            },
          }}
        >
          {/* Empty box as placeholder */}
          <Box sx={{ width: 8, height: 8 }} />
        </Badge>
      </Box>
    );
  }

  // Used as a wrapper for other elements
  return (
    <Badge
      badgeContent={badgeContent}
      color={badgeData.color}
      variant={
        showDotForUnreads && messageCount > 0 && mentionCount === 0
          ? "dot"
          : "standard"
      }
      anchorOrigin={{
        vertical,
        horizontal,
      }}
      className={className}
      sx={{
        "& .MuiBadge-badge": {
          fontSize:
            size === "small"
              ? "0.65rem"
              : size === "large"
                ? "0.85rem"
                : "0.75rem",
          height: size === "small" ? 16 : size === "large" ? 22 : 20,
          minWidth: size === "small" ? 16 : size === "large" ? 22 : 20,
        },
        ...sx,
      }}
      id={id}
    >
      {children}
    </Badge>
  );
};

export default UnreadBadge;
