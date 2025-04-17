// src/components/message/MessageViewer/MessageReactions.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, CircularProgress, alpha } from "@mui/material";
import { MessageReactionsProps } from "./MessageTypes";
import { useMattermost } from "../../../context/MattermostProvider";
import { getEmojiFromName } from "../EmojiPicker";
import {
  notificationService,
  WebSocketEventType,
} from "../../../services/notification.service";

/**
 * Displays reactions to a message with ability to add/remove reactions
 */
const MessageReactions: React.FC<MessageReactionsProps> = ({
  message,
  isFromCurrentUser = false,
  sx,
}) => {
  const { service, currentUser } = useMattermost();
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>(
    {},
  );
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Initialize reactions from message
  useEffect(() => {
    if (!message.metadata?.reactions || !message.metadata.reactions.length) {
      setReactionCounts({});
      return;
    }

    // Group reactions by emoji name and count them
    const counts: Record<string, number> = {};
    const userReacted: Record<string, boolean> = {};

    message.metadata.reactions.forEach((reaction) => {
      console.debug("Use effect reaction", reaction);
      const { emoji_name, user_id } = reaction;

      // Count total reactions for this emoji
      counts[emoji_name] = (counts[emoji_name] || 0) + 1;

      // Check if current user has reacted with this emoji
      if (currentUser && user_id === currentUser.id) {
        userReacted[emoji_name] = true;
      }
    });

    setReactionCounts(counts);
    setUserReactions(userReacted);
  }, [message.metadata?.reactions, currentUser]);

  // Listen for reaction added/removed events
  useEffect(() => {
    const handleReactionAdded = (data: any) => {
      if (!data) return;
      const { reaction } = data;
      const react = JSON.parse(reaction);
      console.debug("reaction", react);
      if (!react || react.post_id !== message.id) return;
      const { emoji_name, user_id } = react;

      // Update reaction counts
      setReactionCounts((prev) => {
        const newCounts = { ...prev };
        newCounts[emoji_name] = (newCounts[emoji_name] || 0) + 1;
        return newCounts;
      });

      // If current user added this reaction, update userReactions
      if (currentUser && user_id === currentUser.id) {
        setUserReactions((prev) => ({
          ...prev,
          [emoji_name]: true,
        }));
      }
    };

    const handleReactionRemoved = (data: any) => {
      if (!data) return;
      const { reaction } = data;
      const react = JSON.parse(reaction);
      console.debug("reaction removed", react);
      if (!react || react.post_id !== message.id) return;

      const { emoji_name, user_id } = react;

      // Update reaction counts
      setReactionCounts((prev) => {
        const newCounts = { ...prev };
        if (newCounts[emoji_name] > 1) {
          newCounts[emoji_name]--;
        } else {
          delete newCounts[emoji_name];
        }
        return newCounts;
      });

      // If current user removed this reaction, update userReactions
      if (currentUser && user_id === currentUser.id) {
        setUserReactions((prev) => {
          const newUserReactions = { ...prev };
          delete newUserReactions[emoji_name];
          return newUserReactions;
        });
      }
    };

    // Subscribe to reaction events
    const unsubscribeAdded = notificationService.addEventListener(
      WebSocketEventType.REACTION_ADDED,
      handleReactionAdded,
    );

    const unsubscribeRemoved = notificationService.addEventListener(
      WebSocketEventType.REACTION_REMOVED,
      handleReactionRemoved,
    );

    return () => {
      unsubscribeAdded();
      unsubscribeRemoved();
    };
  }, [message.id, currentUser]);

  // Toggle reaction when user clicks
  const handleReactionClick = useCallback(
    async (emojiName: string) => {
      if (!currentUser || !service) return;

      // Set loading state for this emoji
      setLoading((prev) => ({ ...prev, [emojiName]: true }));

      try {
        if (userReactions[emojiName]) {
          // User already reacted with this emoji, so remove the reaction
          await service.removeReaction(
            message.channel_id,
            message.id,
            emojiName,
          );
        } else {
          // User hasn't reacted with this emoji yet, so add the reaction
          await service.addReaction(message.id, emojiName);
        }

        // Local state updates will be handled by WebSocket events
        // But we can also update optimistically for better UX
        if (userReactions[emojiName]) {
          // Optimistically remove reaction
          setReactionCounts((prev) => {
            const newCounts = { ...prev };
            if (newCounts[emojiName] > 1) {
              newCounts[emojiName]--;
            } else {
              delete newCounts[emojiName];
            }
            return newCounts;
          });

          setUserReactions((prev) => {
            const newUserReactions = { ...prev };
            delete newUserReactions[emojiName];
            return newUserReactions;
          });
        } else {
          // Optimistically add reaction
          setReactionCounts((prev) => ({
            ...prev,
            [emojiName]: (prev[emojiName] || 0) + 1,
          }));

          setUserReactions((prev) => ({
            ...prev,
            [emojiName]: true,
          }));
        }
      } catch (error) {
        console.error("Error toggling reaction:", error);
      } finally {
        // Clear loading state
        setLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[emojiName];
          return newLoading;
        });
      }
    },
    [message, userReactions, service, currentUser],
  );

  // If no reactions, don't render anything
  if (Object.keys(reactionCounts).length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        mt: 0.5,
        justifyContent: isFromCurrentUser ? "flex-end" : "flex-start",
        maxWidth: { xs: "95%", sm: "85%" },
        alignSelf: isFromCurrentUser ? "flex-end" : "flex-start",
        ...sx,
      }}
    >
      {Object.entries(reactionCounts).map(([emojiName, count]) => {
        const isLoading = loading[emojiName] || false;
        const emoji = getEmojiFromName(emojiName) || emojiName;

        return (
          <Box
            key={`${emojiName}-${count}`}
            onClick={() => !isLoading && handleReactionClick(emojiName)}
            sx={{
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              px: 1,
              py: 0.5,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              cursor: "pointer",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              },
              position: "relative",
            }}
          >
            {emoji}{" "}
            <Typography component={"div"} variant="caption" sx={{ ml: 0.5 }}>
              {isLoading ? (
                <CircularProgress size={10} thickness={2} sx={{ ml: 0.5 }} />
              ) : (
                count
              )}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default MessageReactions;
