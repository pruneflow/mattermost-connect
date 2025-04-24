// src/components/channel/ChannelViewer/ChannelViewer.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
// Importer les hooks de contexte spécifiques
import {
  useMattermost,
  useChannelContext,
  useUserContext,
  useConnection,
  useMessageContext,
  withAuthentication,
} from "../../../context";
import { Message as MessageType } from "../../../types";

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
  useChannelState,
  useChannelUnread,
} from "../../../context/ChannelContext";

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
    author: any;
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
  // Utiliser les hooks de contexte
  const { services } = useMattermost();
  const { isConnected } = useConnection();
  const { currentUser } = useUserContext();
  const { activeChannel } = useChannelState();
  const { markAsRead, typingIndicator } = useChannelUnread();

  const {
    messages,
    loadMessages,
    isMessagesLoading,
    messagesError,
    deleteMessage,
    setReplyTo,
    highlightMessageId,
    setHighlightMessageId,
  } = useMessageContext();

  // État local
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messagesToHighlight, setMessagesToHighlight] = useState<Set<string>>(
    new Set(),
  );

  // Refs pour optimisation
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const highlightTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // ID utilisateur à utiliser (des props ou du contexte)
  const userIdToUse = currentUserId || currentUser?.id;

  // Vérification optimisée si l'utilisateur est au bas du scrolling
  const isScrolledToBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // Considérer qu'on est au bas s'il reste moins de 50px à scroller
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Charger les messages lorsque le canal change
  useEffect(() => {
    if (!isConnected || !channelId) return;

    // Fonction pour charger les messages
    const fetchMessages = async () => {
      try {
        console.debug("Fetching messages for channel:", channelId);

        const options = {
          perPage: loadMessageCount,
        };

        // Utiliser la méthode loadMessages du contexte
        await loadMessages(channelId, options);

        // Réinitialiser les compteurs et affichages
        setNewMessagesCount(0);
        setShowNewMessagesBanner(false);

        // Mettre à jour hasMoreMessages en fonction du nombre de messages chargés
        setHasMoreMessages(messages.length >= loadMessageCount);

        // Conserver une référence au dernier message pour les optimisations
        if (messages.length > 0) {
          lastMessageIdRef.current = messages[messages.length - 1].id;
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    void fetchMessages();
  }, [channelId, isConnected]);

  useEffect(() => {
    // Définir les messages à mettre en évidence si nécessaire
    if (highlightMessageId) {
      setMessagesToHighlight(new Set([highlightMessageId]));
    } else {
      setMessagesToHighlight(new Set());
    }
  }, [highlightMessageId]);

  // Fonction pour scroller vers le bas (mémorisée)
  const scrollToBottom = useCallback(
    (force = false) => {
      if (!messagesContainerRef.current) return;

      const container = messagesContainerRef.current;
      const wasAtBottom = isAtBottom; // Utiliser la référence actuelle

      // Fonction pour vérifier si on est réellement au bas du conteneur
      const checkIfAtBottom = () => {
        if (!container) return false;
        const { scrollTop, scrollHeight, clientHeight } = container;
        // Considérer qu'on est en bas si on est à moins de 20px du bas
        return scrollHeight - scrollTop - clientHeight < 20;
      };

      // Définir une fonction de défilement progressive pour une meilleure fiabilité
      const performScroll = (attempt = 1) => {
        if (!container) return;

        // Force immédiatement à la position maximale
        container.scrollTop = container.scrollHeight;

        // Vérifier après un court délai si le défilement a fonctionné
        setTimeout(() => {
          if (!container) return;

          const isNowAtBottom = checkIfAtBottom();

          // Si on n'est toujours pas en bas et qu'on a moins de 3 tentatives, réessayer
          if (!isNowAtBottom && attempt < 3) {
            // Réessayer avec une valeur encore plus large pour forcer le recalcul
            container.scrollTop = container.scrollHeight + 2000;
            performScroll(attempt + 1);
          } else if (!isNowAtBottom) {
            // Dernière tentative désespérée
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({
                block: "end",
                behavior: "auto",
              });
            }
          }

          // Mettre à jour l'état visuel
          setIsAtBottom(checkIfAtBottom());
          setShowScrollToBottom(!checkIfAtBottom());

          // Réinitialiser le compteur si on est descendu en bas
          if (checkIfAtBottom() && newMessagesCount > 0) {
            setNewMessagesCount(0);
            setShowNewMessagesBanner(false);
          }
        }, 50 * attempt); // Délai progressif selon la tentative
      };

      // Exécuter le défilement uniquement si on était déjà en bas ou si on force le défilement
      if (wasAtBottom || force) {
        performScroll();
      }
    },
    [isAtBottom, newMessagesCount],
  );

  const handleScrollButtonClick = useCallback(() => {
    scrollToBottom(true); // Force le défilement quand l'utilisateur clique sur le bouton
    setNewMessagesCount(0);
    setShowNewMessagesBanner(false);
  }, [scrollToBottom]);

  // Auto-scroll quand les messages changent
  useEffect(() => {
    // Ne défiler automatiquement que si autoScrollToBottom est activé
    // messages contient des éléments, n'est pas en chargement
    // et soit on était déjà en bas, soit c'est le premier chargement
    if (autoScrollToBottom && messages.length > 0) {
      // Forcer le défilement si:
      // - C'est le chargement initial (lastMessageIdRef.current était null)
      // - L'utilisateur était déjà au bas de la conversation
      // - Le dernier message vient de l'utilisateur actuel (pour voir ses propres messages)
      const isInitialLoad = !lastMessageIdRef.current;
      const isUserMessage =
        messages.length > 0 &&
        messages[messages.length - 1].user_id === currentUser?.id;

      if (isInitialLoad) {
        scrollToBottom(true); // Force le défilement pour le chargement initial
      } else if (isUserMessage) {
        scrollToBottom(true); // Force le défilement pour les messages de l'utilisateur
      } else {
        // Sinon, défilement normal qui respecte la position
        scrollToBottom(false);
      }

      // Mettre à jour la référence pour le dernier message
      if (messages.length > 0) {
        lastMessageIdRef.current = messages[messages.length - 1].id;
      }
    }
  }, [messages, autoScrollToBottom, scrollToBottom, currentUser]);

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

  // Mise en évidence des messages sélectionnés
  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
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
  }, [highlightMessageId, messages.length, setHighlightMessageId]);

  // Marquer le canal comme lu
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const markChannelAsViewed = async () => {
      try {
        await markAsRead(channelId);
      } catch (error) {
        console.error("Erreur lors du marquage du canal comme lu:", error);
      }
    };

    // Marquer comme lu immédiatement
    void markChannelAsViewed();

    // Également marquer comme lu périodiquement
    const interval = setInterval(() => {
      void markChannelAsViewed();
    }, 30000); // 30 secondes

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, channelId, markAsRead]);

  // Charger plus de messages (optimisé avec useCallback)
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !isConnected || !channelId || messages.length === 0)
      return;

    setLoadingMore(true);
    try {
      // Récupérer les messages avant le premier message affiché
      const firstMessage = messages[0];

      const options = {
        perPage: loadMessageCount,
        before: firstMessage.id,
      };

      // Utiliser loadMessages du messageContext
      const messagesList = await loadMessages(channelId, options);

      setHasMoreMessages(messagesList.length >= loadMessageCount);
    } catch (err) {
      console.error("Error loading more messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    isConnected,
    channelId,
    messages,
    loadMessages,
    loadMessageCount,
  ]);

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
      try {
        console.log("Editing message:", messageToEdit);
        // Dans une implémentation complète, vous pourriez:
        // 1. Ouvrir une boîte de dialogue avec le texte actuel
        // 2. Permettre à l'utilisateur de modifier le texte
        // 3. Envoyer la mise à jour via l'API
        // const updatedMessage = await editMessage(messageToEdit.id, newText);
      } catch (error) {
        console.error("Error editing message:", error);
      }
    },
    [
      /* editMessage */
    ],
  );

  // Gestionnaire pour la suppression d'un message (mémorisé)
  const handleDeleteMessage = useCallback(
    async (messageToDelete: MessageType) => {
      try {
        await deleteMessage(messageToDelete.id);
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    },
    [deleteMessage],
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
        autoScrollToBottom={autoScrollToBottom}
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
      autoScrollToBottom,
    ],
  );

  // Mettre à jour les compteurs de nouveaux messages quand un message est reçu
  // Cela serait normalement géré par un écouteur d'événements WebSocket
  useEffect(() => {
    if (!services?.notificationService) return;

    const handleNewMessage = (data: any) => {
      try {
        const post = JSON.parse(data.post);

        // Vérifier si le message appartient à ce canal
        if (post.channel_id !== channelId) return;

        // Si c'est un message de l'utilisateur actuel, défiler vers le bas
        if (post.user_id === userIdToUse) {
          setTimeout(() => scrollToBottom(true), 50);
          return;
        }

        // Si on n'est pas en bas, incrémenter le compteur
        if (!isScrolledToBottom()) {
          setNewMessagesCount((prev) => prev + 1);
          setShowNewMessagesBanner(true);
        } else {
          // Si on est en bas, défiler automatiquement
          setTimeout(() => scrollToBottom(false), 50);
        }

        // Mettre en évidence le nouveau message
        setMessagesToHighlight((prev) => {
          const newSet = new Set(prev);
          newSet.add(post.id);
          return newSet;
        });

        // Enlever la mise en évidence après 3 secondes
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
        console.error("Error handling new message notification:", error);
      }
    };

    // S'abonner à l'événement "posted"
    const unsubscribePosted = services.notificationService.addEventListener(
      "posted",
      handleNewMessage,
    );

    return () => {
      // Désabonnement lors du démontage
      unsubscribePosted();
    };
  }, [services, channelId, userIdToUse, isScrolledToBottom, scrollToBottom]);

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
      {showHeader && activeChannel && (
        <ChannelHeader channel={activeChannel} sx={headerSx} />
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
        {isMessagesLoading ? (
          <ChannelLoadingState />
        ) : messagesError ? (
          <ChannelErrorState error={messagesError.message} />
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
      {channelId && typingIndicator && (
        <TypingIndicator channelId={channelId} />
      )}

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleScrollButtonClick}
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
          <Button
            color="primary"
            size="small"
            onClick={handleScrollButtonClick}
          >
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

export default withAuthentication(ChannelViewer);
