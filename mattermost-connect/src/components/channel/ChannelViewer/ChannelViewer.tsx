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
} from "../../../context";
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
import { WebSocketEventType } from "../../../services";

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
  // Utiliser les hooks de contexte spécifiques au lieu du hook général
  const { services } = useMattermost();
  const { isConnected } = useConnection();
  const { currentUser } = useUserContext();
  const {
    activeChannel,
    setActiveChannel,
    messages,
    loadMessages,
    setReplyTo,
    highlightMessageId,
    setHighlightMessageId,
    markAsRead: markChannelAsRead,
    typingIndicator,
  } = useChannelContext();

  const notificationService = services?.notificationService;
  const mattermostService = services?.mattermostService;

  // État
  const [channel, setChannel] = useState<Channel | null>(null);
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
          return;
        }

        // Si le canal actif correspond déjà à ce que nous voulons, l'utiliser directement
        if (activeChannel && activeChannel.id === channelId) {
          if (!channel || channel.id !== activeChannel.id) {
            setChannel(activeChannel);
          }
          return; // Important: sortir tôt pour éviter des appels supplémentaires
        }

        // Éviter de recharger le même canal
        if (channel && channel.id === channelId) {
          return;
        }
        setLoading(true);
        const channelData = await mattermostService?.getChannel(channelId);
        if (channelData) {
          setChannel(channelData);
          setActiveChannel(channelData);
          setError(null);
        }
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
  }, [isConnected, channelId, services, setActiveChannel, activeChannel]);

  // Charger les messages de façon optimisée
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const currentChannelId = stableChannelId.current;
    if (loading && currentChannelId === channelId) {
      return;
    }

    const fetchMessages = async () => {
      console.debug("Fetching messages for channel:", channelId);
      setLoading(true);

      try {
        const options = {
          perPage: loadMessageCount,
        };

        // Utiliser loadMessages du ChannelContext au lieu de l'appel direct à mattermostService
        const messagesList = await loadMessages(channelId, options);

        if (
          !isMounted.current ||
          currentChannelId !== stableChannelId.current ||
          !messagesList
        )
          return;

        if (
          JSON.stringify(messagesList.map((p) => p.id)) ===
          JSON.stringify(messages.map((m) => m.id))
        ) {
          setLoading(false);
          return;
        }

        // Mise à jour de la map de référence
        messagesList.forEach((post) => {
          messageMap.current[post.id] = post;
        });

        // Le state messages est maintenant géré par le contexte, pas besoin de le définir localement
        // setMessages(messagesList);

        if (messagesList.length > 0) {
          lastMessageIdRef.current = messagesList[messagesList.length - 1].id;
        }

        setHasMoreMessages(messagesList.length >= loadMessageCount);
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
  }, [
    isConnected,
    channel,
    loadMessages,
    loadMessageCount,
    highlightMessageId,
    messages,
  ]);

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

  // Fonctions pour gérer les événements WebSocket, mémorisées avec useCallback
  const handleNewMessage = useCallback(
    (data: any) => {
      try {
        const post = JSON.parse(data.post);

        // Vérifier si le message appartient à ce canal
        if (post.channel_id !== stableChannelId.current) return;

        // Ajouter à la map de référence
        messageMap.current[post.id] = post;

        // Nous n'avons plus besoin de mettre à jour messages localement, puisqu'il est géré par le contexte
        // Le contexte se chargera de la mise à jour quand il recevra l'événement WebSocket

        const wasAtBottom = isScrolledToBottom();

        if (post.user_id === userIdToUse) {
          // Laisser un peu de temps pour le rendu
          setTimeout(() => {
            scrollToBottom(true); // Force le défilement pour les messages de l'utilisateur
          }, 50);
        }
        // Sinon, si l'utilisateur n'est pas en bas, montrer le compteur
        else if (!wasAtBottom) {
          setNewMessagesCount((prev) => prev + 1);
          setShowNewMessagesBanner(true);
        }
        // Si l'utilisateur était en bas, défiler automatiquement
        else {
          // Laisser un peu de temps pour le rendu
          setTimeout(() => {
            scrollToBottom(false);
          }, 50);
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
    [userIdToUse, isScrolledToBottom, scrollToBottom],
  );

  const handleEditedMessage = useCallback((data: any) => {
    try {
      const post = JSON.parse(data.post);

      // Vérifier si le message appartient à ce canal
      if (post.channel_id !== stableChannelId.current) return;

      // Mettre à jour la map de référence
      messageMap.current[post.id] = post;

      // Contexte gère la mise à jour des messages

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

      // Contexte gère la suppression du message
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
    // Ne défiler automatiquement que si autoScrollToBottom est activé
    // messages contient des éléments, n'est pas en chargement
    // et soit on était déjà en bas, soit c'est le premier chargement
    if (autoScrollToBottom && messages.length > 0 && !loading) {
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
  }, [messages, autoScrollToBottom, loading, scrollToBottom, currentUser]);

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

      const options = {
        perPage: loadMessageCount,
        before: firstMessage.id,
      };

      // Utiliser loadMessages du ChannelContext
      const messagesList = await loadMessages(channelId, options);

      if (!isMounted.current || !messagesList) return;

      // Mise à jour de la map de référence
      messagesList.forEach((post) => {
        messageMap.current[post.id] = post;
      });

      setHasMoreMessages(messagesList.length >= loadMessageCount);
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
      if (!mattermostService?.editMessage) {
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
    [mattermostService?.editMessage],
  );

  // Gestionnaire pour la suppression d'un message (mémorisé)
  const handleDeleteMessage = useCallback(
    async (messageToDelete: MessageType) => {
      if (!mattermostService?.deleteMessage) {
        console.error("Delete message functionality not available");
        return;
      }

      try {
        await mattermostService?.deleteMessage(messageToDelete.id);

        // Supprimer de la map de référence
        delete messageMap.current[messageToDelete.id];

        // La mise à jour de la liste des messages est gérée par le contexte
      } catch (error) {
        console.error("Error deleting message:", error);
        setError("Failed to delete message. Please try again.");
      }
    },
    [mattermostService?.deleteMessage],
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

export default ChannelViewer;
