// src/components/ChannelViewer/ChannelViewer.tsx
import React, { useState, useEffect, useRef } from "react";
import { useMattermost } from "../../context/MattermostProvider";
import { Channel, Message as MessageType, User } from "../../types";

// Material-UI Components
import {
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Skeleton,
  Alert,
  SxProps,
  Theme,
  Paper,
  IconButton,
} from "@mui/material";

// Material-UI Icons
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Related components
import Message from "./Message";
import ChannelHeader from "./ChannelHeader";
import MessageComposer from "../MessageComposer/MessageComposer";

/**
 * Props for the ChannelViewer component
 */
export interface ChannelViewerProps {
  /** Channel ID to display */
  channelId?: string;

  /** Whether the channel is read-only */
  readOnly?: boolean;

  /** Whether to show the channel header */
  showHeader?: boolean;

  /** Number of messages to load at once */
  loadMessageCount?: number;

  /** Whether to auto-scroll to bottom on new messages */
  autoScrollToBottom?: boolean;

  /** Custom message renderer */
  messageRenderer?: (props: {
    message: MessageType;
    author: User | null;
    formattedText: string;
  }) => React.ReactNode;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Styling for the header */
  headerSx?: SxProps<Theme>;

  /** Styling for the messages container */
  messagesContainerSx?: SxProps<Theme>;

  /** Custom message component props */
  messageProps?: Partial<React.ComponentProps<typeof Message>>;

  /** Current user ID (used to determine message ownership) */
  currentUserId?: string;

  /** Flag indicating if the component should render its own message composer
   * If false, it's expected that a parent component will render MessageComposer
   */
  showMessageComposer?: boolean;
}

/**
 * A component that displays messages from a Mattermost channel
 */
const ChannelViewer: React.FC<ChannelViewerProps> = ({
  channelId,
  readOnly = false,
  showHeader = true,
  loadMessageCount = 50,
  autoScrollToBottom = true,
  messageRenderer,
  className,
  style,
  sx,
  headerSx,
  messagesContainerSx,
  messageProps,
  currentUserId,
  showMessageComposer = false, // Par défaut, ne pas montrer le message composer interne
}) => {
  const { isConnected, service, currentUser } = useMattermost();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // État pour la gestion des réponses
  const [replyTo, setReplyTo] = useState<MessageType | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // User ID to use (from props or from context)
  const userIdToUse = currentUserId || currentUser?.id;

  // Load channel information
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const fetchChannel = async () => {
      try {
        const channelData = await service.getChannel(channelId);
        setChannel(channelData);
        setError(null);
      } catch (err) {
        console.error("Error loading channel:", err);
        setError(err instanceof Error ? err.message : "Failed to load channel");
      }
    };

    void fetchChannel();
  }, [isConnected, channelId, service]);

  // Load messages
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await service.getChannelMessages(channelId, {
          perPage: loadMessageCount,
        });

        // Convert posts object to array and sort by creation time
        const postsArray = Object.values(response.posts || {});
        const sortedPosts = postsArray.sort(
          (a, b) => a.create_at - b.create_at,
        );

        setMessages(sortedPosts);
        setHasMoreMessages(sortedPosts.length >= loadMessageCount);
        setError(null);
      } catch (err) {
        console.error("Error loading messages:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchMessages();
  }, [isConnected, channelId, service, loadMessageCount]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (autoScrollToBottom && messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScrollToBottom]);

  // Load more messages (when scrolling up)
  const loadMoreMessages = async () => {
    if (loadingMore || !isConnected || !channelId || messages.length === 0)
      return;

    setLoadingMore(true);
    try {
      // Get messages before the first displayed message
      const firstMessage = messages[0];

      const response = await service.getChannelMessages(channelId, {
        perPage: loadMessageCount,
        before: firstMessage.id,
      });

      // Convert and sort the new messages
      const newPostsArray = Object.values(response.posts || {});
      const sortedNewPosts = newPostsArray.sort(
        (a, b) => a.create_at - b.create_at,
      );

      // Update state with new messages
      setMessages([...sortedNewPosts, ...messages]);
      setHasMoreMessages(sortedNewPosts.length >= loadMessageCount);
    } catch (err) {
      console.error("Error loading more messages:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load more messages",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  // Gestionnaire pour les réponses aux messages
  const handleReply = (messageToReply: MessageType) => {
    setReplyTo(messageToReply);
    // Mise au point sur le MessageComposer si nécessaire
    setTimeout(() => {
      const composerInput = document.querySelector(".message-composer-input");
      if (composerInput) {
        (composerInput as HTMLElement).focus();
      }
    }, 100);
  };

  // Gestionnaire pour l'envoi d'une réponse
  const handleSendReply = async (responseText: string) => {
    if (!replyTo || !channelId) return;

    try {
      // Utiliser la nouvelle méthode de réponse si disponible
      if (service.replyToMessage) {
        await service.replyToMessage(channelId, replyTo.id, responseText);
      } else {
        // Sinon, utiliser postMessage avec des propriétés personnalisées
        await service.postMessage(channelId, responseText);
      }

      // Rafraîchir les messages après l'envoi
      const response = await service.getChannelMessages(channelId, {
        perPage: loadMessageCount,
      });

      const postsArray = Object.values(response.posts || {});
      const sortedPosts = postsArray.sort((a, b) => a.create_at - b.create_at);

      setMessages(sortedPosts);

      // Réinitialiser l'état de réponse
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending reply:", error);
      setError("Failed to send reply. Please try again.");
    }
  };

  // Gestionnaire pour l'édition d'un message
  const handleEditMessage = async (messageToEdit: MessageType) => {
    // Cette fonctionnalité serait implémentée dans une interface dédiée
    console.log("Editing message:", messageToEdit);
    // Vous pourriez ouvrir un dialogue ou modifier le message sur place
  };

  // Gestionnaire pour la suppression d'un message
  const handleDeleteMessage = async (messageToDelete: MessageType) => {
    if (!service.deleteMessage) {
      console.error("Delete message functionality not available");
      return;
    }

    try {
      await service.deleteMessage(messageToDelete.id);

      // Mettre à jour la liste des messages en retirant le message supprimé
      setMessages(messages.filter((msg) => msg.id !== messageToDelete.id));
    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Failed to delete message. Please try again.");
    }
  };

  // Annuler la réponse
  const cancelReply = () => {
    setReplyTo(null);
  };

  // Render loading skeletons
  const renderSkeletons = () => (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Box key={index} sx={{ display: "flex", mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ width: "100%" }}>
            <Skeleton variant="text" width={120} height={24} />
            <Skeleton
              variant="rectangular"
              height={40}
              width={`${Math.random() * 50 + 30}%`}
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.default",
        ...sx,
      }}
    >
      {/* Channel header */}
      {showHeader && channel && (
        <ChannelHeader channel={channel} sx={headerSx} />
      )}

      <Divider />

      {/* Messages area */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flexGrow: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          p: 2,
          ...messagesContainerSx,
        }}
      >
        {/* Loading state */}
        {loading ? (
          renderSkeletons()
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              color: "text.secondary",
            }}
          >
            <InfoIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography component={"div"} variant="body1">
              No messages in this channel
            </Typography>
            <Typography component={"div"} variant="body2" sx={{ mt: 1 }}>
              Be the first to start a conversation!
            </Typography>
          </Box>
        ) : (
          // Messages list
          <>
            {/* Load more button */}
            {hasMoreMessages && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={loadMoreMessages}
                  disabled={loadingMore}
                  startIcon={
                    loadingMore ? (
                      <CircularProgress size={16} />
                    ) : (
                      <ExpandMoreIcon />
                    )
                  }
                >
                  {loadingMore ? "Loading..." : "Load more messages"}
                </Button>
              </Box>
            )}

            {/* Message list */}
            <Box sx={{ flexGrow: 1 }}>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  renderer={messageRenderer}
                  isFromCurrentUser={message.user_id === userIdToUse}
                  showActions={!readOnly}
                  onReply={handleReply}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  {...messageProps}
                />
              ))}
              <div ref={messagesEndRef} />
            </Box>
          </>
        )}
      </Box>

      {/* Message composer with reply context - only shown if showMessageComposer is true */}
      {showMessageComposer && !readOnly && channelId && (
        <Box sx={{ position: "relative" }}>
          {/* Reply context notification */}
          {replyTo && (
            <Paper
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography component={"div"} variant="body2" sx={{ ml: 1 }}>
                  Replying to:{" "}
                  <strong>
                    {replyTo.message.length > 50
                      ? replyTo.message.substring(0, 50) + "..."
                      : replyTo.message}
                  </strong>
                </Typography>
              </Box>
              <IconButton size="small" onClick={cancelReply}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          )}

          {/* Composer component */}
          <MessageComposer
            channelId={channelId}
            placeholder={replyTo ? "Type your reply..." : "Type a message..."}
            allowAttachments={true}
            initialText=""
            className="message-composer-input"
            onMessageSent={replyTo ? handleSendReply : undefined}
          />
        </Box>
      )}
    </Box>
  );
};

export default ChannelViewer;
