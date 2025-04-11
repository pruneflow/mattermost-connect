// src/components/ChannelViewer/ChannelViewer.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMattermost } from "../../../context/MattermostProvider";
import { Channel, Message as MessageType, User } from "../../../types";

// Material-UI Components
import { Box, Button, Divider, Snackbar, SxProps, Theme } from "@mui/material";
import { ArrowDownward as ScrollDownIcon } from "@mui/icons-material";

// Related components
import Message from "../../message/MessageViewer";
import ChannelHeader from "./components/ChannelHeader";
import { ChannelLoadingState } from "./components/ChannelLoadingState";
import { ChannelErrorState } from "./components/ChannelErrorState";
import { ChannelEmptyState } from "./components/ChannelEmptyState";
import { ChannelLoadMoreButton } from "./components/ChannelLoadMoreButton";
import { MessageList } from "../../message/MessageViewer/MessageList";

import { TypingIndicator } from "../../notification";
import {
  notificationService,
  WebSocketEventType,
} from "../../../services/notification.service";

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

  /** Highlight a specific message (used for navigation from notifications) */
  highlightMessageId?: string;
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
  highlightMessageId,
}) => {
  const {
    isConnected,
    service,
    currentUser,
    setReplyTo,
    typingUsers,
    setActiveChannel,
  } = useMattermost();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  /** Real Time */
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [messagesToHighlight, setMessagesToHighlight] = useState<Set<string>>(
    new Set(),
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const autoScrollRef = useRef<boolean>(autoScrollToBottom);
  const highlightTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // User ID to use (from props or from context)
  const userIdToUse = currentUserId || currentUser?.id;

  const isScrolledToBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // We consider that we are at the bottom if there is only 50px left to scroll
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Load channel information
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const fetchChannel = async () => {
      try {
        const channelData = await service.getChannel(channelId);
        setChannel(channelData);
        setActiveChannel(channelData);
        setError(null);
      } catch (err) {
        console.error("Error loading channel:", err);
        setError(err instanceof Error ? err.message : "Failed to load channel");
      }
    };

    void fetchChannel();
  }, [isConnected, channelId, service, setActiveChannel]);

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

        if (sortedPosts.length > 0) {
          lastMessageIdRef.current = sortedPosts[sortedPosts.length - 1].id;
        }

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

    setNewMessagesCount(0);
    setShowNewMessagesBanner(false);

    if (highlightMessageId) {
      setMessagesToHighlight(new Set([highlightMessageId]));
    } else {
      setMessagesToHighlight(new Set());
    }
  }, [isConnected, channelId, service, loadMessageCount, highlightMessageId]);

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
    if (!channelId) return;

    // Fonction pour traiter un nouveau message
    const handleNewMessage = (data: any) => {
      try {
        const post = JSON.parse(data.post);

        // Vérifier si le message appartient à ce canal
        if (post.channel_id !== channelId) return;

        // Vérifier si on a déjà ce message (éviter les doublons)
        if (messages.some((msg) => msg.id === post.id)) return;

        // Ajouter le nouveau message à la liste
        setMessages((prevMessages) => {
          // Assurer le tri par date
          const updatedMessages = [...prevMessages, post].sort(
            (a, b) => a.create_at - b.create_at,
          );

          return updatedMessages;
        });

        // Si l'utilisateur n'est pas en bas, afficher le compteur de nouveaux messages
        if (!isAtBottom && post.user_id !== userIdToUse) {
          setNewMessagesCount((prev) => prev + 1);
          setShowNewMessagesBanner(true);
        }

        // Si c'est un message de l'utilisateur actuel, toujours scroller vers le bas
        if (post.user_id === userIdToUse) {
          scrollToBottom();
        }

        // Mettre en évidence les nouveaux messages
        setMessagesToHighlight((prev) => new Set(prev).add(post.id));

        // Définir un timeout pour supprimer la mise en évidence après 3 secondes
        if (highlightTimeouts.current[post.id]) {
          clearTimeout(highlightTimeouts.current[post.id]);
        }

        highlightTimeouts.current[post.id] = setTimeout(() => {
          setMessagesToHighlight((prev) => {
            const updated = new Set(prev);
            updated.delete(post.id);
            return updated;
          });

          delete highlightTimeouts.current[post.id];
        }, 3000);
      } catch (error) {
        console.error("Error processing new message:", error);
      }
    };

    // Fonction pour traiter un message édité
    const handleEditedMessage = (data: any) => {
      try {
        const post = JSON.parse(data.post);

        // Vérifier si le message appartient à ce canal
        if (post.channel_id !== channelId) return;

        // Mettre à jour le message
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === post.id ? { ...msg, ...post } : msg,
          ),
        );

        // Mettre en évidence le message édité
        setMessagesToHighlight((prev) => new Set(prev).add(post.id));

        // Définir un timeout pour supprimer la mise en évidence
        if (highlightTimeouts.current[post.id]) {
          clearTimeout(highlightTimeouts.current[post.id]);
        }

        highlightTimeouts.current[post.id] = setTimeout(() => {
          setMessagesToHighlight((prev) => {
            const updated = new Set(prev);
            updated.delete(post.id);
            return updated;
          });

          delete highlightTimeouts.current[post.id];
        }, 3000);
      } catch (error) {
        console.error("Error processing edited message:", error);
      }
    };

    // Fonction pour traiter un message supprimé
    const handleDeletedMessage = (data: any) => {
      try {
        const post = JSON.parse(data.post);

        // Vérifier si le message appartient à ce canal
        if (post.channel_id !== channelId) return;

        // Supprimer le message de la liste
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== post.id),
        );
      } catch (error) {
        console.error("Error processing deleted message:", error);
      }
    };

    // S'abonner aux événements
    const unsubscribePosted = notificationService.addEventListener(
      WebSocketEventType.POSTED,
      handleNewMessage,
    );

    const unsubscribeEdited = notificationService.addEventListener(
      WebSocketEventType.POST_EDITED,
      handleEditedMessage,
    );

    const unsubscribeDeleted = notificationService.addEventListener(
      WebSocketEventType.POST_DELETED,
      handleDeletedMessage,
    );

    // Nettoyer les abonnements lors du démontage
    return () => {
      unsubscribePosted();
      unsubscribeEdited();
      unsubscribeDeleted();

      // Nettoyer tous les timeouts
      Object.values(highlightTimeouts.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
      highlightTimeouts.current = {};
    };
  }, [channelId, messages, isAtBottom, userIdToUse]);

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
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages, autoScrollToBottom]);

  useEffect(() => {
    const handleScroll = () => {
      if (!messagesContainerRef.current) return;

      const isBottom = isScrolledToBottom();
      setIsAtBottom(isBottom);

      // Afficher/masquer le bouton de retour en bas
      setShowScrollToBottom(!isBottom);

      // Si l'utilisateur défile vers le bas et atteint le bas, réinitialiser
      // le compteur de nouveaux messages et masquer la bannière
      if (isBottom && newMessagesCount > 0) {
        setNewMessagesCount(0);
        setShowNewMessagesBanner(false);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);

      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isScrolledToBottom, newMessagesCount]);

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

  useEffect(() => {
    if (highlightMessageId && !loading && messages.length > 0) {
      setMessagesToHighlight(new Set([highlightMessageId]));

      // Faire défiler jusqu'au message à mettre en évidence
      const messageElement = document.getElementById(
        `message-${highlightMessageId}`,
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (highlightTimeouts.current[highlightMessageId]) {
        clearTimeout(highlightTimeouts.current[highlightMessageId]);
      }

      highlightTimeouts.current[highlightMessageId] = setTimeout(() => {
        setMessagesToHighlight((prev) => {
          const updated = new Set(prev);
          updated.delete(highlightMessageId);
          return updated;
        });

        delete highlightTimeouts.current[highlightMessageId];
      }, 3000);
    }
  }, [highlightMessageId, loading, messages.length]);

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

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
      setNewMessagesCount(0);
      setShowNewMessagesBanner(false);
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

            <Box sx={{ flexGrow: 1 }}>
              {/* Message list */}
              <MessageList
                messages={messages}
                readOnly={readOnly}
                currentUserId={userIdToUse}
                messageRenderer={messageRenderer}
                handleReply={handleReply}
                handleEditMessage={handleEditMessage}
                handleDeleteMessage={handleDeleteMessage}
                messagesToHighlight={messagesToHighlight}
                messageProps={messageProps}
              />
              <div ref={messagesEndRef} />
            </Box>
          </>
        )}
      </Box>

      {/* Typing indicator */}
      {channelId &&
        typingUsers &&
        typingUsers[channelId] &&
        typingUsers[channelId].length > 0 && (
          <TypingIndicator channelId={channelId} />
        )}

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={scrollToBottom}
          startIcon={<ScrollDownIcon />}
          sx={{
            position: "absolute",
            bottom: 70,
            right: 20,
            zIndex: 10,
            borderRadius: "20px",
            boxShadow: 3,
          }}
        >
          {newMessagesCount > 0
            ? `New messages (${newMessagesCount})`
            : "Bottom"}
        </Button>
      )}
      {/* New messages banner */}
      <Snackbar
        open={showNewMessagesBanner}
        message={`${newMessagesCount} new message${newMessagesCount > 1 ? "s" : ""}`}
        action={
          <Button color="primary" size="small" onClick={scrollToBottom}>
            View
          </Button>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          bottom: { xs: 80, md: 70 },
          "& .MuiSnackbarContent-root": {
            bgcolor: "primary.main",
          },
        }}
      />
    </Box>
  );
};

export default ChannelViewer;
