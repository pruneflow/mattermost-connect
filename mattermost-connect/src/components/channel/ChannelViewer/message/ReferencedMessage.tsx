// src/components/ChannelViewer/message/ReferencedMessage.tsx
import React from "react";
import { Box, Typography, alpha } from "@mui/material";
import { ReferencedMessageProps } from "./MessageTypes";
import { formatTimestamp } from "../../../../utils";

/**
 * Displays a referenced message in a reply
 */
const ReferencedMessage: React.FC<ReferencedMessageProps> = ({
  message,
  author,
  sx,
}) => {
  // Function to navigate to the referenced message
  const navigateToReferencedMessage = () => {
    const messageElement = document.getElementById(`message-${message.id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the message briefly
      messageElement.classList.add("highlight");
      setTimeout(() => {
        messageElement.classList.remove("highlight");
      }, 2000);
    }
  };

  return (
    <Box
      onClick={navigateToReferencedMessage}
      sx={{
        p: 1.5,
        mb: 2,
        borderLeft: "4px solid",
        borderColor: "primary.light",
        backgroundColor: (theme) =>
          alpha(theme.palette.background.default, 0.7),
        borderRadius: 1,
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: (theme) => alpha(theme.palette.primary.light, 0.1),
          transform: "translateY(-2px)",
        },
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: "bold" }}
          component="div"
        >
          {author
            ? `${author.first_name || ""} ${author.last_name || ""}`.trim() ||
              author.username
            : "Unknown User"}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ ml: 1 }}
        >
          {formatTimestamp(message.create_at || 0)}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        component="div"
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          fontSize: "0.875rem",
        }}
      >
        {message.message}
      </Typography>
    </Box>
  );
};

export default ReferencedMessage;
