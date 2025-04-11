// src/components/ChannelViewer/message/Message.tsx
import React, { useState, useEffect, useRef } from "react";
import { useMattermost } from "../../../context/MattermostProvider";
import {
  Box,
  Paper,
  Skeleton,
  Theme,
  Typography,
  alpha,
  Zoom,
} from "@mui/material";
import { MessageProps } from "./MessageTypes";
import { formatMessageText, formatTimestamp } from "../../../utils";
import MessageHeader from "./MessageHeader";
import MessageContent from "./MessageContent";
import MessageActions from "./MessageActions";
import MessageReactions from "./MessageReactions";
import ReferencedMessage from "./ReferencedMessage";
import { User, Message as MessageType } from "../../../types";

/**
 * A component that renders a single message in the channel view
 */
const Message: React.FC<MessageProps> = ({
  message,
  renderer,
  isFromCurrentUser = false,
  showActions = true,
  onReply,
  onEdit,
  onDelete,
  className,
  style,
  sx,
  bubbleSx,
  authorSx,
  contentSx,
  actionsSx,
  avatarSx,
  highlight = false,
}) => {
  const { service } = useMattermost();
  const [author, setAuthor] = useState<User | null>(null);
  const [formattedText, setFormattedText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referencedMessage, setReferencedMessage] =
    useState<MessageType | null>(null);
  const [referencedAuthor, setReferencedAuthor] = useState<User | null>(null);

  const messageRef = useRef<HTMLDivElement>(null);

  // Function to determine if the message is a reply
  const isReplyMessage = (msg: MessageType): boolean => {
    // In Mattermost, replies have a root_id which is the ID of the parent message
    // Sometimes, the information can also be in props.quoted_message_id
    return !!msg.root_id || !!(msg.props && msg.props.quoted_message_id);
  };

  // Check if the message is a reply to another message
  useEffect(() => {
    // Identify the parent message ID
    const parentMessageId =
      message?.root_id || (message?.props && message?.props.quoted_message_id);

    if (parentMessageId) {
      const fetchReferencedMessage = async () => {
        try {
          // First, try a direct call to retrieve the specific message
          // This approach depends on the available API
          try {
            // Some API implementations allow retrieving a specific message
            // Note: To adapt based on the actual service implementation
            if (typeof service.getPost === "function") {
              const parentPost = await service.getPost(
                parentMessageId as string,
              );
              setReferencedMessage(parentPost);

              if (parentPost.user_id) {
                const users = await service.getUsers({
                  ids: [parentPost.user_id],
                });
                if (users && users.length > 0) {
                  setReferencedAuthor(users[0]);
                }
              }
              return;
            }
          } catch (directError) {
            console.log(
              "Direct attempt failed, trying alternative approach",
              directError,
            );
          }

          // Alternative approach: retrieve channel messages and look for the parent message
          const response = await service.getChannelMessages(
            message.channel_id,
            {
              perPage: 100, // Increase to increase chances of finding the parent
            },
          );

          if (response.posts && response.posts[parentMessageId as string]) {
            setReferencedMessage(response.posts[parentMessageId as string]);

            if (response.posts[parentMessageId as string].user_id) {
              const users = await service.getUsers({
                ids: [response.posts[parentMessageId as string].user_id],
              });
              if (users && users.length > 0) {
                setReferencedAuthor(users[0]);
              }
            }
          } else {
            console.log(
              `Parent message ${parentMessageId} not found in results`,
            );
          }
        } catch (error) {
          console.error("Error retrieving referenced message:", error);
        }
      };

      void fetchReferencedMessage();
    }
  }, [message, service]);

  // Load author information
  useEffect(() => {
    if (!message || !message.user_id) {
      setLoading(false);
      return;
    }

    const fetchAuthor = async () => {
      try {
        const users = await service?.getUsers({ ids: [message.user_id] });
        if (users && users.length > 0) {
          setAuthor(users[0]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error loading author info:", err);
        setLoading(false);
      }
    };

    void fetchAuthor();
  }, [message, service]);

  // Format message text
  useEffect(() => {
    if (!message?.message) {
      setFormattedText("");
      return;
    }

    setFormattedText(formatMessageText(message.message));
  }, [message]);

  useEffect(() => {
    if (highlight && messageRef.current) {
      // Faire défiler jusqu'au message si nécessaire
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlight]);

  // If a custom renderer is provided, use it
  if (renderer) {
    return <>{renderer({ message, author, formattedText })}</>;
  }

  // Render loading skeleton
  if (loading) {
    return (
      <Box
        sx={{ display: "flex", mb: 2, ...sx }}
        className={className}
        style={style}
      >
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ width: "100%" }}>
          <Skeleton variant="text" width={120} height={24} />
          <Skeleton variant="rounded" height={40} width="80%" sx={{ mt: 1 }} />
        </Box>
      </Box>
    );
  }

  // Format timestamp
  const timestamp = formatTimestamp(message?.create_at || 0);

  // Determine message alignment and styling based on sender
  const messageAlignment = isFromCurrentUser ? "flex-end" : "flex-start";
  const bubbleColor = (theme: Theme) =>
    isFromCurrentUser
      ? alpha(theme.palette.primary.main, 0.1)
      : theme.palette.background.paper;
  const bubbleBorder = isFromCurrentUser
    ? "1px solid rgba(25, 118, 210, 0.2)"
    : "1px solid rgba(0, 0, 0, 0.12)";

  return (
    <>
      <Zoom in={true} style={{ transitionDelay: "100ms" }}>
        <Box
          id={`message-${message.id}`}
          ref={messageRef}
          className={`${className} ${highlight ? "highlight" : ""}`}
          style={style}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: messageAlignment,
            mb: 2,
            maxWidth: { xs: "95%", sm: "85%" },
            alignSelf: messageAlignment,
            width: "auto",
            position: "relative",
            ...(highlight && {
              animation: "highlightMessage 2s ease-in-out",
            }),
            ...sx,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Message header with author info and timestamp */}
          <MessageHeader
            author={author}
            timestamp={timestamp}
            isFromCurrentUser={isFromCurrentUser}
            sx={authorSx}
            avatarSx={avatarSx}
          />

          {/* Message content */}
          <Box sx={{ display: "flex", position: "relative" }}>
            {/* Message bubble */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: bubbleColor,
                border: bubbleBorder,
                maxWidth: "100%",
                wordBreak: "break-word",
                ...bubbleSx,
              }}
            >
              {/* Referenced message (if this is a reply) */}
              {isReplyMessage(message) && referencedMessage && (
                <ReferencedMessage
                  message={referencedMessage}
                  author={referencedAuthor}
                />
              )}

              {/* Fallback for replies where we couldn't retrieve the referenced message */}
              {isReplyMessage(message) && !referencedMessage && (
                <Box
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderLeft: "4px solid",
                    borderColor: "divider",
                    backgroundColor: (theme) =>
                      alpha(theme.palette.background.default, 0.5),
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="div"
                    sx={{ fontStyle: "italic" }}
                  >
                    This is a reply to a previous message that is no longer
                    available
                  </Typography>
                </Box>
              )}

              {/* Message content */}
              <MessageContent
                message={message}
                formattedText={formattedText}
                sx={contentSx}
              />
            </Paper>

            {/* Message actions */}
            {showActions && (
              <MessageActions
                message={message}
                isHovered={isHovered}
                isFromCurrentUser={isFromCurrentUser}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                sx={actionsSx}
              />
            )}
          </Box>

          {/* Message reactions */}
          <MessageReactions
            message={message}
            isFromCurrentUser={isFromCurrentUser}
          />
        </Box>
      </Zoom>
    </>
  );
};

export default Message;
