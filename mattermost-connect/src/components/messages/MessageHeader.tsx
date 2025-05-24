import React from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { UserAvatar } from "../common";
import { MessageActions } from "./MessageActions";
import { formatDate, formatTime } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";
import { useMessages } from "../../hooks";
import { findEmojiByName } from "../../utils/emojiMartAdapter";

interface MessageHeaderProps {
  messageId: string;
  channelId: string;
  username: string;
  userId: string;
  timestamp: string;
  messageText: string;
  reactions?: Record<string, string[]>;
  showDate?: boolean;
  showAvatar?: boolean;
  showActions?: boolean;
  actionsVisible?: boolean;
  onReply?: () => void;
  onEdit?: (newText: string) => void;
  onDelete?: () => void;
}

export function MessageHeader({
  messageId,
  channelId,
  username,
  userId,
  timestamp,
  messageText,
  reactions = {},
  showDate = true,
  showAvatar = true,
  showActions = true,
  actionsVisible = false,
  onReply,
  onEdit,
  onDelete,
}: MessageHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Auth context for current user ID
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Messages hook for reaction actions
  const { addReaction, removeReaction, isLoading } = useMessages(channelId);

  // Toggle reaction
  const toggleReaction = async (emoji: string, emojiName: string) => {
    if (!currentUserId || !messageId) return;

    try {
      // Note: emojiName contient déjà le modificateur de teinte si nécessaire
      // car il est construit par createEmojiNameWithTone dans EmojiPickerMart
      const mattermostEmojiName = emojiName;

      // Check if user has already added this reaction
      const hasReacted =
        reactions[mattermostEmojiName]?.includes(currentUserId);

      if (hasReacted) {
        // Remove reaction
        await removeReaction({ messageId, emojiName: mattermostEmojiName });
      } else {
        // Add reaction
        await addReaction({ messageId, emojiName: mattermostEmojiName });
      }

      // Le picker se ferme automatiquement
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  if (isMobile) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          mb: 0.5,
          position: "relative",
        }}
      >
        {/* Avatar */}
        {showAvatar && (
          <UserAvatar
            userId={userId}
            size={32}
            sx={{ flexShrink: 0 }}
          />
        )}

        {/* Username and actions container */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: "text.primary",
              fontSize: "0.875rem",
            }}
          >
            {username}
          </Typography>

          {/* Actions - mobile version (emoji picker + menu) */}
          {showActions && (
            <MessageActions
              messageId={messageId}
              channelId={channelId}
              messageText={messageText}
              reactions={reactions}
              toggleReaction={toggleReaction}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              visible={actionsVisible}
              isMobile={true}
            />
          )}
        </Box>

        {/* Time (bottom right of message container, will be positioned by parent) */}
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.75rem",
            position: "absolute",
            bottom: -16,
            right: 4,
            lineHeight: 1,
          }}
        >
          {formatTime(parseInt(timestamp))}
        </Typography>
      </Box>
    );
  }

  // Desktop version - simple header with username and timestamp
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        mb: 0.5,
        position: "relative",
      }}
    >
      {/* Avatar */}
      {showAvatar && (
        <UserAvatar
          userId={userId}
          size={36}
          sx={{ flexShrink: 0, marginRight: 1 }}
        />
      )}

      {/* Username */}
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          color: "text.primary",
          fontSize: "0.875rem",
        }}
      >
        {username}
      </Typography>

      {/* Timestamp */}
      {showDate && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.75rem",
            ml: 0.5,
          }}
        >
          {formatDate(parseInt(timestamp))}
        </Typography>
      )}

      {/* Actions - desktop version (hover overlay) */}
      {showActions && (
        <MessageActions
          messageId={messageId}
          channelId={channelId}
          messageText={messageText}
          reactions={reactions}
          toggleReaction={toggleReaction}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          visible={actionsVisible}
          isMobile={false}
        />
      )}
    </Box>
  );
}

export default MessageHeader;
