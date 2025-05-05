// src/internal/components/messages/MessageThreadUI.tsx
/**
 * Component that displays a message thread with the root message and replies
 */
import React from "react";
import { Box, Divider, IconButton, Paper, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Message } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";

export interface MessageThreadUIProps extends BaseComponentProps {
  /** Root message */
  rootMessage: Message | null;
  /** Thread messages */
  threadMessages: Message[];
  /** Whether the thread is loading */
  isLoading?: boolean;
  /** Whether a reply is being sent */
  isReplying?: boolean;
  /** Callback when the thread is closed */
  onClose?: () => void;
  /** Function to render the message list */
  renderMessageList: () => React.ReactNode;
  /** Function to render the message input */
  renderMessageInput: () => React.ReactNode;
}

/**
 * Message Thread UI Component
 *
 * Displays a thread view with the root message, replies, and input for new replies
 */
const MessageThreadUI: React.FC<MessageThreadUIProps> = ({
  rootMessage,
  threadMessages,
  isLoading = false,
  isReplying = false,
  onClose,
  renderMessageList,
  renderMessageInput,
  className,
  sx,
  id,
}) => {
  if (!rootMessage) {
    return (
      <Box
        className={className}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          ...sx,
        }}
        id={id}
      >
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography color="text.secondary">
            {isLoading ? "Loading thread..." : "Thread not found"}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Paper
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        ...sx,
      }}
      id={id}
      elevation={0}
    >
      {/* Thread header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6">Thread</Typography>
        {onClose && (
          <IconButton onClick={onClose} edge="end" aria-label="close thread">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Thread content */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Messages list */}
        <Box sx={{ flex: 1, overflow: "auto" }}>{renderMessageList()}</Box>

        {/* Divider */}
        <Divider />

        {/* Message input */}
        <Box sx={{ p: 2 }}>{renderMessageInput()}</Box>
      </Box>
    </Paper>
  );
};

export default React.memo(MessageThreadUI);
