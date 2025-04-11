// src/components/ChannelViewer/ChannelViewer.tsx
import React, { useState, useEffect, useRef } from "react";
import { useMattermost } from "../../../context/MattermostProvider";
import { Channel, Message as MessageType, User } from "../../../types";

// Material-UI Components
import { Box, Divider, SxProps, Theme } from "@mui/material";

// Related components
import Message from "../../message/MessageViewer";
import ChannelHeader from "./components/ChannelHeader";
import { ChannelLoadingState } from "./components/ChannelLoadingState";
import { ChannelErrorState } from "./components/ChannelErrorState";
import { ChannelEmptyState } from "./components/ChannelEmptyState";
import { ChannelLoadMoreButton } from "./components/ChannelLoadMoreButton";
import { MessageList } from "../../message/MessageViewer/MessageList";

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
}) => {
  const { isConnected, service, currentUser, setReplyTo } = useMattermost();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

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
      // Utilisation d'un court délai pour s'assurer que le rendu est terminé
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          // Défilement complet vers le bas en utilisant scrollHeight
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
          // Fallback au cas où la référence du conteneur n'est pas disponible
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [messages, autoScrollToBottom]);

  useEffect(() => {
    if (
      !loading &&
      autoScrollToBottom &&
      messages.length > 0 &&
      messagesContainerRef.current
    ) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [loading, autoScrollToBottom, messages.length]);

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
    // Utiliser le contexte central pour définir le message de réponse
    setReplyTo(messageToReply);

    // Mise au point sur le MessageComposer si nécessaire
    setTimeout(() => {
      const composerInput = document.querySelector(".message-composer-input");
      if (composerInput) {
        (composerInput as HTMLElement).focus();
      }
    }, 100);
  };

  // Gestionnaire pour l'édition d'un message
  const handleEditMessage = async (messageToEdit: MessageType) => {
    if (!service.editMessage) {
      console.error("Edit message functionality not available");
      return;
    }

    try {
      // Pour l'instant, cette fonction pourrait ouvrir une boîte de dialogue d'édition
      // Ou implémenter l'édition en ligne
      console.log("Editing message:", messageToEdit);

      // Dans une implémentation complète, vous pourriez:
      // 1. Ouvrir une boîte de dialogue avec le texte actuel
      // 2. Permettre à l'utilisateur de modifier le texte
      // 3. Envoyer la mise à jour via l'API
      // const updatedMessage = await service.editMessage(messageToEdit.id, newText);

      // 4. Mettre à jour l'état local des messages
      // setMessages(messages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg));
    } catch (error) {
      console.error("Error editing message:", error);
    }
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
          <ChannelLoadingState />
        ) : error ? (
          <ChannelErrorState error={error} />
        ) : messages.length === 0 ? (
          <ChannelEmptyState />
        ) : (
          // Messages list
          <>
            {/* Load more button */}
            <ChannelLoadMoreButton
              hasMoreMessages={hasMoreMessages}
              loadingMore={loadingMore}
              loadMoreMessages={loadMoreMessages}
            />

            {/* Message list */}
            <MessageList
              messages={messages}
              readOnly={readOnly}
              currentUserId={userIdToUse}
              messageRenderer={messageRenderer}
              handleReply={handleReply}
              handleEditMessage={handleEditMessage}
              handleDeleteMessage={handleDeleteMessage}
              messageProps={messageProps}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default ChannelViewer;
