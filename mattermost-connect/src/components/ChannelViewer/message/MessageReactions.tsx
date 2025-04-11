// src/components/ChannelViewer/message/MessageReactions.tsx
import React from "react";
import { Box, Typography } from "@mui/material";
import { MessageReactionsProps } from "./MessageTypes";
import { useMattermost } from "../../../context/MattermostProvider";
import { getEmojiFromName } from "../../EmojiPicker";

/**
 * Displays reactions to a message
 */
const MessageReactions: React.FC<MessageReactionsProps> = ({
  message,
  isFromCurrentUser = false,
  sx,
}) => {
  const { currentUser } = useMattermost();

  // Check if message has reactions
  if (!message.metadata?.reactions || message.metadata.reactions.length === 0) {
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
      {message.metadata.reactions.map((reaction, idx) => (
        <Box
          key={`${reaction.emoji_name}-${idx}`}
          sx={{
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "divider",
            px: 1,
            py: 0.5,
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            bgcolor:
              reaction.user_id === currentUser?.id
                ? "primary.light"
                : "action.hover",
            cursor: "pointer",
            "&:hover": {
              bgcolor: "action.selected",
            },
          }}
        >
          {getEmojiFromName(reaction.emoji_name) || reaction.emoji_name}{" "}
          <Typography component={"div"} variant="caption" sx={{ ml: 0.5 }}>
            {1} {/* Replace with reaction count */}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default MessageReactions;
