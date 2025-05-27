import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, useTheme, useMediaQuery, Typography } from "@mui/material";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import MessageThread from "./MessageThread";
import { useMessages } from "../../hooks/useMessages";
import { TypingIndicator } from "../common/TypingIndicator";
import { useTypingEventsForChannel } from "../../hooks/useTypingEventsForChannel";
import { MessageReply } from "./MessageReply";
import { useChannels, useTeams } from "../../hooks";
import { useAuth } from "../../context/AuthContext";

export interface MessageContainerProps {
  channelId: string;
  currentUserId: string;
  showInput?: boolean;
  showThread?: boolean;
}

/**
 * A unified container component that manages message list, input, and thread views
 * with responsive layout handling between desktop and mobile
 */
function MessageContainer({
  channelId,
  currentUserId,
  showInput = true,
  showThread = true,
}: MessageContainerProps) {
  // Theme for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Internal state
  const [replyToMessage, setReplyToMessage] = useState<any>(undefined);
  const [threadMessageId, setThreadMessageId] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Get message service for the current channel
  const messageService = useMessages(channelId, currentUserId);

  // Handle reply to message
  const handleReplyMessage = useCallback((message: any) => {
    setReplyToMessage(message);
  }, []);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyToMessage(undefined);
  }, []);

  // Handle sending a message
  const handleSendMessage = useCallback(
    (message: string) => {
      // Create the new message using the service
      console.log(`Sending message to channel ${channelId}: ${message}`);
      messageService
        .createMessage({
          channel_id: channelId,
          message: message,
          root_id: replyToMessage?.id, // Include root_id if replying to a message
        })
        .then(() => {
          // Clear reply after sending
          handleCancelReply();
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    },
    [channelId, messageService, replyToMessage, handleCancelReply],
  );

  // Handle thread message sent - refresh main message list to update thread counts
  const handleThreadMessageSent = useCallback(
    (message?: any) => {
      // Refresh the main channel messages to update thread reply counts
      if (message && message.root_id) {
        console.debug(
          `MessageContainer: Thread reply sent, refreshing message list`,
          {
            messageId: message.id,
            rootId: message.root_id,
          },
        );

        // Trigger a message list refresh
        messageService.refetch();
      }
    },
    [messageService],
  );

  // Handle opening thread
  const handleOpenThread = useCallback((messageId: string) => {
    setThreadMessageId(messageId);
  }, []);

  // Handle closing thread, with optional external handler
  const handleCloseThread = () => {
    setThreadMessageId(undefined);
  };

  useEffect(() => {
    console.debug(
      "MessageContainer: Channel changed to",
      channelId,
      "- messageService data:",
      messageService.messages?.length || 0,
      "messages",
    );
    handleCancelReply();
  }, [channelId, messageService.messages]);

  // Calculate if thread is visible (either internally or externally managed)
  const isThreadVisible = showThread && threadMessageId !== undefined;

  // Apply different layouts for desktop vs mobile
  const isThreadFullscreen = isMobile && isThreadVisible;

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: isThreadVisible ? "row" : "column" },
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative", // Added to ensure proper positioning of children
        pt: "0px", // Ensure no top padding so we fill available space
      }}
    >
      {/* Message list area - hidden on mobile when thread is visible */}
      <Box
        sx={{
          flexGrow: 1,
          flexBasis: { xs: "100%", md: isThreadVisible ? "75%" : "100%" },
          display: isThreadFullscreen ? "none" : "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%", // Ensure full width
          position: "relative", // Needed for absolutely positioned input
          transition: theme.transitions.create("flex-basis", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          pb: "76px", // Space for absolutely positioned input
        }}
      >
        {/* Message list with scrolling */}
        <MessageList
          channelId={channelId}
          currentUserId={currentUserId}
          onReplyMessage={handleReplyMessage}
          onOpenThread={showThread ? handleOpenThread : undefined}
        />

        <MessageReply
          message={replyToMessage}
          handleClose={handleCancelReply}
        />

        {/* Message input - absolutely positioned at bottom */}
        {showInput && (
          <Box
            sx={{
              p: 2,
              pt: 1,
              mt: 2,
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              borderColor: "divider",
              zIndex: 10,
            }}
          >
            <TypingIndicator channelId={channelId} />

            <MessageInput
              channelId={channelId}
              replyToMessageId={replyToMessage?.id}
              placeholder={`Type a message...`}
              onSendMessage={handleSendMessage}
            />
          </Box>
        )}
      </Box>

      {/* Thread area - conditionally displayed */}
      {isThreadVisible && threadMessageId && (
        <Box
          sx={{
            flexBasis: { xs: "100%", md: "25%" },
            minWidth: { md: "350px" },
            maxWidth: { md: "450px" },
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderLeft: { md: "1px solid" },
            borderColor: "divider",
            transition: theme.transitions.create(["width", "flex-basis"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflow: "hidden", // Ensure the thread doesn't overflow
          }}
        >
          <MessageThread
            rootMessageId={threadMessageId}
            channelId={channelId}
            currentUserId={currentUserId}
            onClose={handleCloseThread}
            isMobile={isMobile}
            onMessageSent={handleThreadMessageSent}
          />
        </Box>
      )}
    </Box>
  );
}

export const Messages = ({
  showInput = true,
  showThread = true,
}: {
  showInput?: boolean;
  showThread?: boolean;
}) => {
  const { activeTeam } = useTeams();
  const { activeChannel } = useChannels(activeTeam?.id);
  const channelId = activeChannel?.id;
  const { user } = useAuth();

  if (!user || !channelId) return null;

  return (
    <MessageContainer
      channelId={channelId}
      currentUserId={user.id}
      showInput={showInput}
      showThread={showThread}
    />
  );
};

export default Messages;
