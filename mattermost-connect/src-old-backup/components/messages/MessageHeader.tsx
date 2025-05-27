import React from "react";
import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import { UserAvatar } from "../common";
import { MessageActions } from "./MessageActions";
import { formatDate, formatTime } from "../../utils/formatters";

interface MessageHeaderProps {
  messageId: string;
  channelId: string;
  username: string;
  userId: string;
  timestamp: string;
  messageText: string;
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
        alignItems: "center",
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
