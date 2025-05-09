// src/internal/components/messages/MessageReactionsUI.tsx
/**
 * Component that displays message reactions
 */
import React, { useState } from "react";
import { Box, Tooltip, CircularProgress, alpha, Zoom } from "@mui/material";
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
  const [clickedReaction, setClickedReaction] = useState<string | null>(null);
  const [loadingReactions, setLoadingReactions] = useState<Record<string, boolean>>({});

  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Handle reaction click with visual feedback
  const handleReactionClick = (emoji: string) => {
    if (onReactionClick && !loadingReactions[emoji]) {
      setClickedReaction(emoji);
      setLoadingReactions(prev => ({ ...prev, [emoji]: true }));
      
      // Call the actual handler
      onReactionClick(emoji);
      
      // Reset UI states after a short delay
      setTimeout(() => {
        setClickedReaction(null);
        setLoadingReactions(prev => {
          const newLoading = { ...prev };
          delete newLoading[emoji];
          return newLoading;
        });
      }, 300);
    }
  };

  // Create tooltip content showing users who reacted
  const getTooltipContent = (userIds: string[]): string => {
    if (userIds.length === 0) return "";
    
    // Limit display to 3 users maximum
    const displayCount = Math.min(userIds.length, 3);
    const remainingCount = userIds.length - displayCount;
    
    // If current user reacted, mention them first
    let displayUsers = userIds
      .slice(0, displayCount)
      .map(id => {
        if (id === currentUserId) return "Vous";
        // Ideally we'd get user names from a service here
        return `Utilisateur ${id.substring(0, 5)}...`;
      });
    
    let tooltipText = displayUsers.join(", ");
    
    // Add "+ X others" if needed
    if (remainingCount > 0) {
      tooltipText += ` et ${remainingCount} autre${remainingCount > 1 ? "s" : ""}`;
    }
    
    // Add action hint
    const isUserReacted = currentUserId && userIds.includes(currentUserId);
    if (isUserReacted) {
      tooltipText += ". Cliquez pour retirer votre réaction.";
    } else {
      tooltipText += ". Cliquez pour réagir.";
    }
    
    return tooltipText;
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.8,
        ...sx,
      }}
      id={id}
    >
      {reactions.map((reaction) => {
        const isUserReacted = currentUserId
          ? reaction.userIds.includes(currentUserId)
          : false;
        const isClicked = clickedReaction === reaction.emoji_name;
        const isLoading = loadingReactions[reaction.emoji_name] || false;

        return (
          <Tooltip
            key={reaction.emoji_name}
            title={getTooltipContent(reaction.userIds)}
            arrow
            placement="top"
            TransitionComponent={Zoom}
          >
            <Box
              onClick={() => handleReactionClick(reaction.emoji_name)}
              role="button"
              aria-label={isUserReacted ? `Retirer la réaction ${reaction.emoji_name}` : `Ajouter la réaction ${reaction.emoji_name}`}
              aria-pressed={isUserReacted}
              sx={{
                borderRadius: "16px",
                border: "1px solid",
                borderColor: isUserReacted ? "primary.main" : "divider",
                px: 1.2,
                py: 0.6,
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: 0.7,
                boxShadow: isUserReacted ? 1 : 0,
                bgcolor: (theme) =>
                  isUserReacted
                    ? alpha(theme.palette.primary.main, 0.15)
                    : alpha(theme.palette.background.paper, 0.8),
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                transform: isClicked ? "scale(0.9)" : "scale(1)",
                "&:hover": {
                  bgcolor: (theme) => 
                    isUserReacted
                      ? alpha(theme.palette.primary.main, 0.25)
                      : alpha(theme.palette.primary.main, 0.1),
                  boxShadow: 2,
                  transform: "scale(1.05)",
                },
                position: "relative",
              }}
            >
              <span role="img" aria-label={reaction.emoji_name}>
                {reaction.emoji_name}
              </span>
              
              <span style={{ 
                fontWeight: isUserReacted ? 600 : 400,
                color: isUserReacted ? 'var(--primary-color, #1976d2)' : 'var(--text-secondary, #666)',
                minWidth: '14px',
                textAlign: 'center'
              }}>
                {isLoading ? (
                  <CircularProgress size={12} thickness={2} />
                ) : (
                  reaction.count
                )}
              </span>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default MessageReactionsUI;