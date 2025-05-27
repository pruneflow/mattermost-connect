import React, { useMemo } from "react";
import { Box, Chip, Tooltip } from "@mui/material";

import { useReactionToggle } from "../../hooks/useReactionToggle";
import { useAuth } from "../../context/AuthContext";
import {
  processReactions,
  getEmojiImageUrl,
} from "../../utils/emojiMartAdapter";

export interface MessageReactionsProps {
  messageId: string;
  channelId: string;
  reactions?: Record<string, string[]>; // emoji_name -> user_ids (conservé pour la compatibilité, mais ignoré)
  compact?: boolean;
}

function MessageReactions({
  messageId,
  channelId,
  compact = false,
}: MessageReactionsProps) {
  // Auth context for current user ID
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Use the centralized reaction toggle logic
  const { toggleReaction, reactions } = useReactionToggle({ channelId, messageId });

  // Format reaction count
  const formatReactionCount = (count: number): string => {
    return count > 99 ? "99+" : count.toString();
  };

  // Process and prepare reactions for display avec mémoisation
  const processedReactions = useMemo(() => {
    // N'effectuer le traitement que s'il y a des réactions
    if (!reactions || Object.keys(reactions).length === 0) {
      return [];
    }
    return processReactions(reactions);
  }, [reactions]);

  // Prepare reactions for display avec mémoisation
  const reactionItems = useMemo(() => {
    return processedReactions
      .filter(({ count }) => count > 0)
      .sort((a, b) => {
        // Sort by whether current user has reacted, then by count, then by name
        const aHasReacted = currentUserId
          ? a.userIds.includes(currentUserId)
          : false;
        const bHasReacted = currentUserId
          ? b.userIds.includes(currentUserId)
          : false;

        if (aHasReacted !== bHasReacted) {
          return aHasReacted ? -1 : 1;
        }
        if (a.count !== b.count) {
          return b.count - a.count;
        }
        return a.name.localeCompare(b.name);
      });
  }, [processedReactions, currentUserId]);

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.75,
        alignItems: "center",
      }}
    >
      {/* Display reactions */}
      {reactionItems.length > 0 ? (
        reactionItems.map((reactionItem) => {
          const { name, emoji, unified, count, userIds } = reactionItem;
          const hasReacted = currentUserId
            ? userIds.includes(currentUserId)
            : false;
          return (
            <Tooltip
              key={name}
              title={`${name} - ${count} ${count === 1 ? "reaction" : "reactions"}`}
              arrow
            >
              <Chip
                size="small"
                onClick={() => toggleReaction(emoji, name)}
                sx={{
                  bgcolor: hasReacted ? "primary.main" : "action.hover",
                  color: hasReacted ? "primary.contrastText" : "text.primary",
                  fontWeight: hasReacted ? "bold" : "normal",
                  borderRadius: 16,
                  px: 1,
                  py: 0.5,
                  height: compact ? 24 : 28,
                  "&:hover": {
                    bgcolor: hasReacted ? "primary.dark" : "action.selected",
                    opacity: 0.9,
                  },
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  border: "1px solid",
                  borderColor: hasReacted ? "primary.main" : "action.hover",
                  display: "flex", // Ensure the Chip is visible
                  visibility: "visible", // Force visibility
                }}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {unified ? (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <img
                          src={getEmojiImageUrl(unified)}
                          alt={name}
                          style={{
                            width: compact ? "14px" : "16px",
                            height: compact ? "14px" : "16px",
                          }}
                          onError={(e) => {
                            // Fallback to Unicode emoji on image load error
                            (e.target as HTMLImageElement).style.display =
                              "none";
                            (e.target as HTMLImageElement).insertAdjacentHTML(
                              "afterend",
                              `<span style="font-size: ${compact ? "12px" : "14px"}">${emoji}</span>`,
                            );
                          }}
                        />
                        <span style={{ marginLeft: "4px" }}>
                          {formatReactionCount(count)}
                        </span>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: compact ? "12px" : "14px",
                            marginRight: "4px",
                          }}
                        >
                          {emoji}
                        </span>
                        <span>{formatReactionCount(count)}</span>
                      </Box>
                    )}
                  </Box>
                }
              />
            </Tooltip>
          );
        })
      ) : (
        // This helps debug if reactions array is empty
        <Box sx={{ display: "none" }}>No reactions to display</Box>
      )}
    </Box>
  );
}

// SUPPRIMÉ React.memo car il empêche les mises à jour depuis le cache React Query
// Les réactions viennent maintenant du cache via useMessages, pas des props
export default MessageReactions;
