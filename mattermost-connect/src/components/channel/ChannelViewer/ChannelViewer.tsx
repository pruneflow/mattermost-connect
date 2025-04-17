// src/components/channel/ChannelViewer/ChannelViewer.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
import { WebSocketEventType } from "../../../services/notification.service";

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
  const {
    isConnected,
    service,
    currentUser,
    setReplyTo,
    typingUsers,
    activeChannel,
    setActiveChannel,
    markChannelAsRead,
    notificationService,
    highlightMessageId,
    setHighlightMessageId,
  } = useMattermost();

  // État
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [messagesToHighlight, setMessagesToHighlight] = useState<Set<string>>(
    new Set(),
  );

  // Refs pour optimisation
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const stableChannelId = useRef<string | undefined>(channelId);
  const messageMap = useRef<Record<string, MessageType>>({});
  const highlightTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const eventHandlersInitialized = useRef<boolean>(false);
  const isMounted = useRef<boolean>(true);

  // ID utilisateur à utiliser (des props ou du contexte)
  const userIdToUse = currentUserId || currentUser?.id;

  // Mettre à jour la référence stable quand channelId change
  useEffect(() => {
    isMounted.current = true;
    stableChannelId.current = channelId;
  }, [channelId]);

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      isMounted.current = false;

      // Nettoyer tous les timeouts
      Object.values(highlightTimeouts.current).forEach(clearTimeout);
      highlightTimeouts.current = {};
    };
  }, []);

  // Vérification optimisée si l'utilisateur est au bas du scrolling
  const isScrolledToBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // Considérer qu'on est au bas s'il reste moins de 50px à scroller
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Charger les informations du canal
  useEffect(() => {
    if (!isConnected || !channelId) return;

    // Référence pour éviter des appels inutiles
    const currentChannelId = stableChannelId.current;

    const fetchChannel = async () => {
      try {
        // Vérifier que le composant est encore monté et que le canal n'a pas changé
        if (
          !isMounted.current ||
          currentChannelId !== stableChannelId.current
        ) {
          console.debug(
            "!isMounted.current || currentChannelId !== stableChannelId.current",
          );
          return;
        }

        // Si le canal actif correspond déjà à ce que nous voulons, l'utiliser directement
        if (activeChannel && activeChannel.id === channelId) {
          console.debug("activeChannel is set and same id ");
          if (!channel || channel.id !== activeChannel.id) {
            console.debug("set channel from activeChannel");
            setChannel(activeChannel);
          }
          console.debug(
            "return from this activeChannel && activeChannel.id === channelId",
          );
          return; // Important: sortir tôt pour éviter des appels supplémentaires
        }

        // Éviter de recharger le même canal
        if (channel && channel.id === channelId) {
          console.debug("channel is already set");
          return;
        }
        console.debug("set from fetching channelData");
        setLoading(true);
        const channelData = await service.getChannel(channelId);
        setChannel(channelData);
        setActiveChannel(channelData);
        setError(null);
      } catch (err) {
        if (!isMounted.current || currentChannelId !== stableChannelId.current)
          return;
        console.error("Error loading channel:", err);
        setError(err instanceof Error ? err.message : "Failed to load channel");
      } finally {
        setLoading(false);
      }
    };

    void fetchChannel();

    // Retirer channel de la liste des dépendances pour briser la boucle
  }, [isConnected, channelId, service, setActiveChannel, activeChannel]);

  // Charger les messages de façon optimisée
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const currentChannelId = stableChannelId.current;
    console.debug("loading", loading);
    if (loading && currentChannelId === channelId) {
      console.debug(
        "return from this loading && currentChannelId === channelId",
      );
      return;
    }

    const fetchMessages = async () => {
      console.debug("Fetching messages for channel:", channelId);
      setLoading(true);

      try {
        const response = await service.getChannelMessages(channelId, {
          perPage: loadMessageCount,
        });

        if (!isMounted.current || currentChannelId !== stableChannelId.current)
          return;

        // Conversion et tri des messages
        const postsArray = Object.values(response.posts || {});
        const sortedPosts = postsArray.sort(
          (a, b) => a.create_at - b.create_at,
        );

        if (
          JSON.stringify(sortedPosts.map((p) => p.id)) ===
          JSON.stringify(messages.map((m) => m.id))
        ) {
          setLoading(false);
          return;
        }

        // Mise à jour de la map de référence
        sortedPosts.forEach((post) => {
          messageMap.current[post.id] = post;
        });

        setMessages(sortedPosts);

        if (sortedPosts.length > 0) {
          lastMessageIdRef.current = sortedPosts[sortedPosts.length - 1].id;
        }

        setHasMoreMessages(sortedPosts.length >= loadMessageCount);
        setError(null);
      } catch (err) {
        if (!isMounted.current || currentChannelId !== stableChannelId.current)
          return;
        console.error("Error loading messages:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      } finally {
        if (isMounted.current && currentChannelId === stableChannelId.current) {
          setLoading(false);
        }
      }
    };

    void fetchMessages();

    // Réinitialiser les compteurs et les états
    setNewMessagesCount(0);
    setShowNewMessagesBanner(false);

    if (highlightMessageId) {
      setMessagesToHighlight(new Set([highlightMessageId]));
    } else {
      setMessagesToHighlight(new Set());
    }
  }, [isConnected, channel, service, loadMessageCount, highlightMessageId]);

  // Fonctions pour gérer les événements WebSocket, mémorisées avec useCallback
  const handleNewMessage = useCallback(
    (data: any) => {
      try {
        const post = JSON.parse(data.post);

        // Vérifier si le message appartient à ce canal
        if (post.channel_id !== stableChannelId.current) return;

        // Ajouter à la map de référence
        messageMap.current[post.id] = post;

        // Ajouter le message à l'état seulement s'il n'existe pas déjà
        setMessages((prevMessages) => {
          // Si le message existe déjà, ne pas modifier l'état
          if (prevMessages.some((msg) => msg.id === post.id)) {
            return prevMessages;
          }

          // Ajouter et trier
          return [...prevMessages, post].sort(
            (a, b) => a.create_at - b.create_at,
          );
        });

        // Si l'utilisateur n'est pas en bas, afficher le compteur
        const isBottom = isScrolledToBottom();
        if (!isBottom && post.user_id !== userIdToUse) {
          setNewMessagesCount((prev) => prev + 1);
          setShowNewMessagesBanner(true);
        }

        // Si c'est un message de l'utilisateur actuel, scroller vers le bas
        if (post.user_id === userIdToUse) {
          scrollToBottom();
        }

        // Mettre en évidence les nouveaux messages
        setMessagesToHighlight((prev) => {
          const newSet = new Set(prev);
          newSet.add(post.id);
          return newSet;
        });

        // Supprimer la mise en évidence après un délai
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
    },
    [userIdToUse, isScrolledToBottom],
  );

  const handleEditedMessage = useCallback((data: any) => {
    try {
      const post = JSON.parse(data.post);

      // Vérifier si le message appartient à ce canal
      if (post.channel_id !== stableChannelId.current) return;

      // Mettre à jour la map de référence
      messageMap.current[post.id] = post;

      // Mettre à jour le message
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === post.id ? { ...msg, ...post } : msg,
        ),
      );

      // Mettre en évidence le message édité
      setMessagesToHighlight((prev) => {
        const newSet = new Set(prev);
        newSet.add(post.id);
        return newSet;
      });

      // Supprimer la mise en évidence après un délai
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
  }, []);

  const handleDeletedMessage = useCallback((data: any) => {
    try {
      const post = JSON.parse(data.post);

      // Vérifier si le message appartient à ce canal
      if (post.channel_id !== stableChannelId.current) return;

      // Supprimer de la map de référence
      delete messageMap.current[post.id];

      // Supprimer le message de la liste
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== post.id),
      );
    } catch (error) {
      console.error("Error processing deleted message:", error);
    }
  }, []);

  // Écouteurs d'événements WebSocket optimisés
  useEffect(() => {
    if (!channelId || !notificationService || eventHandlersInitialized.current)
      return;

    console.debug(
      "Setting up WebSocket event listeners for channel:",
      channelId,
    );
    eventHandlersInitialized.current = true;

    // S'abonner aux événements en utilisant des fonctions mémorisées
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

    // Nettoyer les écouteurs au démontage ou au changement de canal
    return () => {
      console.debug("Cleaning up WebSocket event listeners");
      unsubscribePosted();
      unsubscribeEdited();
      unsubscribeDeleted();
      eventHandlersInitialized.current = false;

      // Nettoyer tous les timeouts
      Object.values(highlightTimeouts.current).forEach(clearTimeout);
      highlightTimeouts.current = {};
    };
  }, [
    channelId,
    notificationService,
    handleNewMessage,
    handleEditedMessage,
    handleDeletedMessage,
  ]);

  // Auto-scroll quand les messages changent
  useEffect(() => {
    if (
      autoScrollToBottom &&
      messagesEndRef.current &&
      messages.length > 0 &&
      !loading
    ) {
      // Utiliser un court délai pour s'assurer que le rendu est terminé
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          // Défilement vers le bas en utilisant scrollHeight
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
          // Fallback
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages, autoScrollToBottom, loading]);

  // Gérer le défilement
  useEffect(() => {
    const handleScroll = () => {
      if (!messagesContainerRef.current) return;

      const isBottom = isScrolledToBottom();
      setIsAtBottom(isBottom);
      setShowScrollToBottom(!isBottom);

      // Si l'utilisateur atteint le bas, réinitialiser le compteur
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

  // Mise en évidence des messages
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

      // Nettoyer le timeout existant s'il y en a un
      if (highlightTimeouts.current[highlightMessageId]) {
        clearTimeout(highlightTimeouts.current[highlightMessageId]);
      }

      // Définir un nouveau timeout
      highlightTimeouts.current[highlightMessageId] = setTimeout(() => {
        setMessagesToHighlight((prev) => {
          const updated = new Set(prev);
          updated.delete(highlightMessageId);
          return updated;
        });

        delete highlightTimeouts.current[highlightMessageId];
        setHighlightMessageId(undefined);
      }, 3000);
    }
  }, [highlightMessageId, loading, messages.length, setHighlightMessageId]);

  // Marquer le canal comme lu
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const markAsViewed = async () => {
      try {
        await markChannelAsRead(channelId);
      } catch (error) {
        console.error("Erreur lors du marquage du canal comme lu:", error);
      }
    };

    // Marquer comme lu immédiatement
    void markAsViewed();

    // Également marquer comme lu périodiquement
    const interval = setInterval(() => {
      void markAsViewed();
    }, 30000); // 30 secondes

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, channelId, markChannelAsRead]);

  // Charger plus de messages (optimisé avec useCallback)
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !isConnected || !channelId || messages.length === 0)
      return;

    setLoadingMore(true);
    try {
      // Récupérer les messages avant le premier message affiché
      const firstMessage = messages[0];

      const response = await service.getChannelMessages(channelId, {
        perPage: loadMessageCount,
        before: firstMessage.id,
      });

      if (!isMounted.current) return;

      // Conversion et tri des nouveaux messages
      const newPostsArray = Object.values(response.posts || {});
      const sortedNewPosts = newPostsArray.sort(
        (a, b) => a.create_at - b.create_at,
      );

      // Mettre à jour la map de référence
      sortedNewPosts.forEach((post) => {
        messageMap.current[post.id] = post;
      });

      // Mettre à jour l'état avec les nouveaux messages
      setMessages((prevMessages) => [...sortedNewPosts, ...prevMessages]);
      setHasMoreMessages(sortedNewPosts.length >= loadMessageCount);
    } catch (err) {
      if (!isMounted.current) return;
      console.error("Error loading more messages:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load more messages",
      );
    } finally {
      if (isMounted.current) {
        setLoadingMore(false);
      }
    }
  }, [
    loadingMore,
    isConnected,
    channelId,
    messages,
    service,
    loadMessageCount,
  ]);

  // Fonction pour scroller vers le bas (mémorisée)
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
      setNewMessagesCount(0);
      setShowNewMessagesBanner(false);
    }
  }, []);

  // Gestionnaire pour les réponses aux messages (mémorisé)
  const handleReply = useCallback(
    (messageToReply: MessageType) => {
      // Utiliser le contexte central pour définir le message de réponse
      setReplyTo(messageToReply);

      // Mise au point sur le MessageComposer
      setTimeout(() => {
        const composerInput = document.querySelector(".message-composer-input");
        if (composerInput) {
          (composerInput as HTMLElement).focus();
        }
      }, 100);
    },
    [setReplyTo],
  );

  // Gestionnaire pour l'édition d'un message (mémorisé)
  const handleEditMessage = useCallback(
    async (messageToEdit: MessageType) => {
      if (!service.editMessage) {
        console.error("Edit message functionality not available");
        return;
      }

      try {
        console.log("Editing message:", messageToEdit);
        // Dans une implémentation complète, vous pourriez:
        // 1. Ouvrir une boîte de dialogue avec le texte actuel
        // 2. Permettre à l'utilisateur de modifier le texte
        // 3. Envoyer la mise à jour via l'API
        // const updatedMessage = await service.editMessage(messageToEdit.id, newText);
        // 4. Mettre à jour l'état local des messages
      } catch (error) {
        console.error("Error editing message:", error);
      }
    },
    [service.editMessage],
  );

  // Gestionnaire pour la suppression d'un message (mémorisé)
  const handleDeleteMessage = useCallback(
    async (messageToDelete: MessageType) => {
      if (!service.deleteMessage) {
        console.error("Delete message functionality not available");
        return;
      }

      try {
        await service.deleteMessage(messageToDelete.id);

        // Supprimer de la map de référence
        delete messageMap.current[messageToDelete.id];

        // Mettre à jour la liste des messages
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== messageToDelete.id),
        );
      } catch (error) {
        console.error("Error deleting message:", error);
        setError("Failed to delete message. Please try again.");
      }
    },
    [service.deleteMessage],
  );

  // Mémorisation de la liste de messages pour éviter des re-renders inutiles
  const messageListMemo = useMemo(
    () => (
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
    ),
    [
      messages,
      readOnly,
      userIdToUse,
      messageRenderer,
      handleReply,
      handleEditMessage,
      handleDeleteMessage,
      messagesToHighlight,
      messageProps,
    ],
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
              {messageListMemo}
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
            bottom: 100,
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
