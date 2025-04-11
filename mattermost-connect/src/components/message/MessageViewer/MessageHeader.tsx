// src/components/ChannelViewer/message/MessageHeader.tsx
import React from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { MessageHeaderProps } from "./MessageTypes";
import { getInitials, generateColorFromString } from "../../../utils";

/**
 * Displays the header of a message including author info and timestamp
 */
const MessageHeader: React.FC<MessageHeaderProps> = ({
  author,
  timestamp,
  isFromCurrentUser = false,
  sx,
  avatarSx,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        mb: 0.5,
        ml: isFromCurrentUser ? 0 : 1,
        mr: isFromCurrentUser ? 1 : 0,
        alignSelf: isFromCurrentUser ? "flex-end" : "flex-start",
        ...sx,
      }}
    >
      {!isFromCurrentUser && (
        <Avatar
          sx={{
            width: 24,
            height: 24,
            mr: 1,
            bgcolor: generateColorFromString(author?.username),
            fontSize: "0.75rem",
            ...avatarSx,
          }}
        >
          {getInitials(
            author && author.first_name
              ? `${author.first_name} ${author.last_name}`
              : author
                ? author.username
                : "",
          )}
        </Avatar>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 500 }}
        component={"div"}
      >
        {author
          ? `${author.first_name || ""} ${author.last_name || ""} ${
              author.username ? `(@${author.username})` : ""
            }`.trim()
          : "Unknown User"}
      </Typography>

      <Typography
        component={"div"}
        variant="caption"
        color="text.secondary"
        sx={{ ml: 1 }}
      >
        {timestamp}
      </Typography>
    </Box>
  );
};

export default MessageHeader;
