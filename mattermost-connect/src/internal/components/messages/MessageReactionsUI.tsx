// src/internal/components/messages/MessageReactionsUI.tsx
/**
 * Component that displays message reactions
 */
import React from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";
import { ReactionCount } from "../../../types";

export interface MessageReactionsUIProps extends BaseComponentProps {
  /** Reactions data */
  reactions: Array<ReactionCount>;
  /** Current user ID to highlight reactions from current user */
  currentUserId?: string;
  /** Callback when a reaction is clicked */
  onReactionClick?: (emoji: string) => void;
}

const MessageReactionsUI: React.FC<MessageReactionsUIProps> = ({
  reactions,
  currentUserId,
  onReactionClick,
  className,
  sx,
  id,
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Handle reaction click
  const handleReactionClick = (emoji: string) => {
    if (onReactionClick) {
      onReactionClick(emoji);
    }
  };

  // Create tooltip content showing users who reacted
  const getTooltipContent = (userIds: string[]): string => {
    if (userIds.length === 0) return "";
    if (userIds.length === 1) return "1 person reacted with this emoji";
    return `${userIds.length} people reacted with this emoji`;
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        ...sx,
      }}
      id={id}
    >
      {reactions.map((reaction) => {
        const isUserReacted = currentUserId
          ? reaction.userIds.includes(currentUserId)
          : false;

        return (
          <Tooltip
            key={reaction.emoji_name}
            title={getTooltipContent(reaction.userIds)}
            arrow
          >
            <Chip
              label={`${reaction.emoji_name} ${reaction.count}`}
              size="small"
              variant={isUserReacted ? "filled" : "outlined"}
              color={isUserReacted ? "primary" : "default"}
              onClick={() => handleReactionClick(reaction.emoji_name)}
              sx={{
                height: 24,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: isUserReacted
                    ? "primary.light"
                    : "action.hover",
                },
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default MessageReactionsUI;
