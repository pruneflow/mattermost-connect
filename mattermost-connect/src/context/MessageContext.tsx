// src/context/MessageContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { Message } from "../types";
import { assertServiceInitialized, ServiceContainer } from "../services";
import { useUserContext } from "./UserContext";
import { useChannelContext } from "./ChannelContext";

/**
 * Options pour la pagination des messages
 */
export interface GetMessagesOptions {
  /** Nombre de messages par page */
  perPage?: number;
  /** Numéro de page */
  page?: number;
  /** Récupérer les messages depuis ce timestamp */
  since?: number;
  /** Récupérer les messages avant cet ID de message */
  before?: string;
  /** Récupérer les messages après cet ID de message */
  after?: string;
}

/**
 * Interface pour le MessageContext
 * Fournit les fonctionnalités liées aux messages
 */
export interface MessageContextType {
  // État des messages
  messages: Message[];
  isMessagesLoading: boolean;
  messagesError: Error | null;
  highlightMessageId?: string;

  // État de réponse
  replyTo: Message | null;
  isReplying: boolean;

  // Méthodes pour les messages
  loadMessages: (
    channelId?: string,
    options?: GetMessagesOptions,
  ) => Promise<Message[]>;
  sendMessage: (message: string, fileIds?: string[]) => Promise<Message | null>;
  editMessage: (
    messageId: string,
    newMessage: string,
  ) => Promise<Message | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  setHighlightMessageId: (messageId?: string) => void;

  // Méthodes pour les réponses
  setReplyTo: (message: Message | null) => void;
  clearReply: () => void;
  replyToMessage: (
    messageId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;

  // Méthodes pour les réactions
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  hasReacted: (messageId: string, emoji: string) => Promise<boolean>;

  // Méthodes pour les threads
  getThreadReplies: (rootMessageId: string) => Promise<Message[]>;
  isThreadLoading: Record<string, boolean>;
  threadMessages: Record<string, Message[]>;
  expandThread: (messageId: string) => Promise<Message[]>;

  // Méthodes pour les emojis et GIFs
  frequentEmojis: string[];
  searchGifs: (query: string) => Promise<any[]>;
  getGifs: (category: string) => Promise<any[]>;

  // Méthodes utilitaires
  formatMessageText: (text: string) => string;
  enrichMessageWithMetadata: (message: Message) => Promise<Message>;
  navigateToMessage: (channelId: string, messageId?: string) => Promise<void>;
}

// Création du contexte avec une valeur par défaut null
export const MessageContext = createContext<MessageContextType | null>(null);

/**
 * Hook personnalisé pour accéder au MessageContext
 */
export function useMessageContext(): MessageContextType {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
}

/**
 * Props pour le MessageProvider
 */
export interface MessageProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
}

/**
 * Provider pour la gestion des messages
 */
export const MessageProvider: React.FC<MessageProviderProps> = ({
  children,
  services,
}) => {
  // Récupération des contextes dépendants
  const { currentUser } = useUserContext();
  const { activeChannel, navigateToChannel } = useChannelContext();

  const activeChannelId = activeChannel?.id || null;

  // État des messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<Error | null>(null);
  const [highlightMessageId, setHighlightMessageIdState] = useState<
    string | undefined
  >(undefined);

  // État de réponse
  const [replyTo, setReplyToState] = useState<Message | null>(null);

  // État des threads
  const [threadMessages, setThreadMessages] = useState<
    Record<string, Message[]>
  >({});
  const [isThreadLoading, setIsThreadLoading] = useState<
    Record<string, boolean>
  >({});

  // État des emojis
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>([
    "👍",
    "❤️",
    "😂",
    "🎉",
    "🔥",
    "👏",
    "✅",
    "🙏", // Emojis par défaut
  ]);

  // Références pour suivi d'état
  const messagesRef = useRef<Message[]>([]);
  const threadMessagesRef = useRef<Record<string, Message[]>>({});
  const isLoadingRef = useRef<boolean>(false);

  /**
   * Charge les messages pour un canal
   */
  const loadMessages = useCallback(
    async (
      channelId?: string,
      options: GetMessagesOptions = {},
    ): Promise<Message[]> => {
      const targetChannelId = channelId || activeChannelId;

      if (
        !targetChannelId ||
        !services?.mattermostService ||
        isLoadingRef.current
      ) {
        return [];
      }

      setIsMessagesLoading(true);
      setMessagesError(null);
      isLoadingRef.current = true;

      try {
        const response = await services.mattermostService.getChannelMessages(
          targetChannelId,
          options,
        );

        // Convertir posts object en tableau
        const messageArray = response.order
          .map((postId) => response.posts[postId])
          .filter(Boolean);

        // Trier les messages
        const sortedMessages = messageArray.sort(
          (a, b) => a.create_at - b.create_at,
        );

        // Mise à jour état et références
        setMessages(sortedMessages);
        messagesRef.current = sortedMessages;

        return sortedMessages;
      } catch (error) {
        console.error(
          `Error loading messages for channel ${targetChannelId}:`,
          error,
        );
        const typedError =
          error instanceof Error ? error : new Error(String(error));
        setMessagesError(typedError);
        return [];
      } finally {
        setIsMessagesLoading(false);
        isLoadingRef.current = false;
      }
    },
    [services, activeChannelId],
  );

  /**
   * Définit l'ID du message à mettre en évidence
   */
  const setHighlightMessageId = useCallback((messageId?: string) => {
    setHighlightMessageIdState(messageId);
  }, []);

  /**
   * Définit le message cible pour une réponse
   */
  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToState(message);
  }, []);

  /**
   * Efface l'état de réponse
   */
  const clearReply = useCallback(() => {
    setReplyToState(null);
  }, []);

  /**
   * Envoyer un message au canal actif
   */
  const sendMessage = useCallback(
    async (message: string, fileIds?: string[]): Promise<Message | null> => {
      if (
        !activeChannelId ||
        (!message.trim() && (!fileIds || fileIds.length === 0)) ||
        !services?.mattermostService
      ) {
        return null;
      }

      try {
        const newMessage = await services.mattermostService.postMessage(
          activeChannelId,
          message,
          fileIds,
        );

        // Recharger les messages pour mettre à jour la liste
        void loadMessages(activeChannelId);
        return newMessage;
      } catch (error) {
        console.error("Error sending message:", error);
        return null;
      }
    },
    [services, activeChannelId, loadMessages],
  );

  /**
   * Répondre à un message
   */
  const replyToMessage = useCallback(
    async (
      messageId: string,
      message: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      if (
        !activeChannelId ||
        !messageId ||
        (!message.trim() && (!fileIds || fileIds.length === 0)) ||
        !services?.mattermostService?.replyToMessage
      ) {
        return null;
      }

      try {
        const reply = await services.mattermostService.replyToMessage(
          activeChannelId,
          messageId,
          message,
          fileIds,
        );

        // Effacer l'état de réponse
        clearReply();

        // Mettre à jour les threads si nécessaire
        if (threadMessages[messageId]) {
          setThreadMessages((prev) => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), reply],
          }));
        }

        return reply;
      } catch (error) {
        console.error(`Error replying to message ${messageId}:`, error);
        return null;
      }
    },
    [services, activeChannelId, clearReply, threadMessages],
  );

  /**
   * Modifie un message existant
   */
  const editMessage = useCallback(
    async (messageId: string, newMessage: string): Promise<Message | null> => {
      if (
        !messageId ||
        !newMessage.trim() ||
        !services?.mattermostService?.editMessage
      ) {
        return null;
      }

      try {
        assertServiceInitialized(
          services.mattermostService,
          "mattermostService",
        );

        const updatedMessage = await services.mattermostService.editMessage(
          messageId,
          newMessage,
        );

        // Mettre à jour les messages locaux
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? updatedMessage : msg)),
        );

        // Mettre à jour le thread si nécessaire
        if (updatedMessage.root_id) {
          const rootId = updatedMessage.root_id;
          if (threadMessages[rootId]) {
            setThreadMessages((prev) => {
              const threadMsgs = [...prev[rootId]];
              const msgIndex = threadMsgs.findIndex(
                (msg) => msg.id === messageId,
              );
              if (msgIndex !== -1) {
                threadMsgs[msgIndex] = updatedMessage;
              }
              return {
                ...prev,
                [rootId]: threadMsgs,
              };
            });
          }
        }

        return updatedMessage;
      } catch (error) {
        console.error(`Error editing message ${messageId}:`, error);
        return null;
      }
    },
    [services, threadMessages],
  );

  /**
   * Supprime un message
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!messageId || !services?.mattermostService?.deleteMessage) {
        return false;
      }

      try {
        assertServiceInitialized(
          services.mattermostService,
          "mattermostService",
        );

        const result =
          await services.mattermostService.deleteMessage(messageId);

        // Si la suppression est réussie, mettre à jour les références locales
        if (result.success) {
          // Mettre à jour les messages du canal
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

          // Mettre à jour les threads
          Object.keys(threadMessages).forEach((rootId) => {
            const threadMsgs = threadMessages[rootId];
            const msgIndex = threadMsgs.findIndex(
              (msg) => msg.id === messageId,
            );

            if (msgIndex !== -1) {
              setThreadMessages((prev) => {
                const newThreadMsgs = [...prev[rootId]];
                newThreadMsgs.splice(msgIndex, 1);
                return {
                  ...prev,
                  [rootId]: newThreadMsgs,
                };
              });
            }
          });

          // Annuler la réponse si nécessaire
          if (replyTo?.id === messageId) {
            clearReply();
          }
        }

        return result.success;
      } catch (error) {
        console.error(`Error deleting message ${messageId}:`, error);
        return false;
      }
    },
    [services, threadMessages, replyTo, clearReply],
  );

  /**
   * Ajoute une réaction à un message
   */
  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!messageId || !emoji || !services?.mattermostService) {
        return false;
      }

      try {
        await services.mattermostService.addReaction(messageId, emoji);
        return true;
      } catch (error) {
        console.error(
          `Error adding reaction ${emoji} to message ${messageId}:`,
          error,
        );
        return false;
      }
    },
    [services],
  );

  /**
   * Supprime une réaction d'un message
   */
  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (
        !messageId ||
        !emoji ||
        !services?.mattermostService ||
        !currentUser ||
        !activeChannelId
      ) {
        return false;
      }

      try {
        await services.mattermostService.removeReaction(
          activeChannelId,
          messageId,
          emoji,
        );
        return true;
      } catch (error) {
        console.error(
          `Error removing reaction ${emoji} from message ${messageId}:`,
          error,
        );
        return false;
      }
    },
    [services, currentUser, activeChannelId],
  );

  /**
   * Vérifie si l'utilisateur actuel a réagi avec un emoji spécifique
   */
  const hasReacted = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (
        !messageId ||
        !emoji ||
        !services?.mattermostService ||
        !currentUser ||
        !activeChannelId
      ) {
        return false;
      }

      try {
        return await services.mattermostService.hasReacted(
          activeChannelId,
          messageId,
          emoji,
        );
      } catch (error) {
        console.error(
          `Error checking reaction ${emoji} for message ${messageId}:`,
          error,
        );
        return false;
      }
    },
    [services, currentUser, activeChannelId],
  );

  /**
   * Récupère les réponses dans un thread
   */
  const getThreadReplies = useCallback(
    async (rootMessageId: string): Promise<Message[]> => {
      if (!rootMessageId || !services?.mattermostService || !activeChannelId) {
        return [];
      }

      // Retourner les messages du thread en cache si disponibles
      if (threadMessagesRef.current[rootMessageId]) {
        return threadMessagesRef.current[rootMessageId];
      }

      // Marquer comme en cours de chargement
      setIsThreadLoading((prev) => ({
        ...prev,
        [rootMessageId]: true,
      }));

      try {
        // Rechercher les messages du thread dans les messages actuels
        const threadResponses = messages.filter(
          (msg) => msg.root_id === rootMessageId,
        );

        // Mise à jour état et références
        setThreadMessages((prev) => {
          const updated = {
            ...prev,
            [rootMessageId]: threadResponses,
          };
          threadMessagesRef.current = updated;
          return updated;
        });

        return threadResponses;
      } catch (error) {
        console.error(
          `Error loading thread replies for message ${rootMessageId}:`,
          error,
        );
        return [];
      } finally {
        setIsThreadLoading((prev) => ({
          ...prev,
          [rootMessageId]: false,
        }));
      }
    },
    [services, activeChannelId, messages],
  );

  /**
   * Développe un thread pour voir les réponses
   */
  const expandThread = useCallback(
    async (messageId: string): Promise<Message[]> => {
      return getThreadReplies(messageId);
    },
    [getThreadReplies],
  );

  /**
   * Recherche des GIFs
   */
  const searchGifs = useCallback(
    async (query: string): Promise<any[]> => {
      if (!query || !services?.mattermostService) {
        return [];
      }

      try {
        if (typeof services.mattermostService.searchGifs === "function") {
          return await services.mattermostService.searchGifs(query);
        }
        return [];
      } catch (error) {
        console.error("Error searching GIFs:", error);
        return [];
      }
    },
    [services],
  );

  /**
   * Récupère des GIFs par catégorie
   */
  const getGifs = useCallback(
    async (category: string): Promise<any[]> => {
      if (!category || !services?.mattermostService) {
        return [];
      }

      try {
        if (typeof services.mattermostService.getGifs === "function") {
          return await services.mattermostService.getGifs(category);
        }
        return [];
      } catch (error) {
        console.error(`Error fetching GIFs for category ${category}:`, error);
        return [];
      }
    },
    [services],
  );

  /**
   * Formate le texte des messages
   */
  const formatMessageText = useCallback((text: string): string => {
    if (!text) return "";
    // Utiliser un utilitaire de formatage approprié
    return text;
  }, []);

  /**
   * Enrichit un message avec des métadonnées supplémentaires
   */
  const enrichMessageWithMetadata = useCallback(
    async (message: Message): Promise<Message> => {
      if (!message || !services?.fileService) {
        return message;
      }

      // Cloner le message pour éviter la mutation
      const enrichedMessage = { ...message };

      // Traiter les pièces jointes si présentes
      if (enrichedMessage.file_ids?.length) {
        const metadata = enrichedMessage.metadata || { files: [] };

        for (const fileId of enrichedMessage.file_ids) {
          try {
            // Vérifier si ce fichier est déjà dans les métadonnées
            if (metadata.files?.some((file) => file.id === fileId)) {
              continue;
            }

            // Pour les fichiers image, obtenir une URL de prévisualisation
            const isImage = true; // Vérification simplifiée
            if (isImage) {
              const previewUrl =
                await services.fileService.fetchThumbnail(fileId);
              metadata.files = [
                ...(metadata.files || []),
                {
                  id: fileId,
                  name: "file", // Placeholder
                  url: previewUrl,
                },
              ];
            }
          } catch (error) {
            console.error(`Error enriching file attachment ${fileId}:`, error);
          }
        }

        enrichedMessage.metadata = metadata;
      }

      return enrichedMessage;
    },
    [services],
  );

  /**
   * Naviguer vers un message spécifique
   */
  const navigateToMessage = useCallback(
    async (channelId: string, messageId?: string): Promise<void> => {
      if (!channelId || !services) return;

      try {
        // D'abord naviguer vers le canal
        await navigateToChannel(channelId);

        // Charger les messages du canal
        await loadMessages(channelId);

        // Si messageId fourni, le mettre en évidence
        if (messageId) {
          setHighlightMessageId(messageId);
        }
      } catch (error) {
        console.error(
          `Error navigating to message ${messageId} in channel ${channelId}:`,
          error,
        );
      }
    },
    [services, navigateToChannel, loadMessages, setHighlightMessageId],
  );

  // Déduire isReplying de replyTo
  const isReplying = useMemo(() => replyTo !== null, [replyTo]);

  // Charger les messages quand le canal actif change
  React.useEffect(() => {
    if (activeChannelId && !isMessagesLoading) {
      void loadMessages(activeChannelId);
    }
  }, [activeChannelId, isMessagesLoading, loadMessages]);

  // Charger les emojis fréquents
  React.useEffect(() => {
    if (!services?.mattermostService) return;

    const loadFrequentEmojis = async () => {
      try {
        if (
          typeof services.mattermostService.getFrequentEmojis === "function"
        ) {
          const emojis = await services.mattermostService.getFrequentEmojis();
          if (emojis && emojis.length > 0) {
            setFrequentEmojis(emojis);
          }
        }
      } catch (error) {
        console.error("Error loading frequent emojis:", error);
      }
    };

    void loadFrequentEmojis();
  }, [services]);

  // Mettre à jour la référence des messages
  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Valeur du contexte
  const contextValue = useMemo<MessageContextType>(
    () => ({
      // État des messages
      messages,
      isMessagesLoading,
      messagesError,
      highlightMessageId,

      // État de réponse
      replyTo,
      isReplying,

      // Méthodes des messages
      loadMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      setHighlightMessageId,

      // Méthodes de réponse
      setReplyTo,
      clearReply,
      replyToMessage,

      // Méthodes de réaction
      addReaction,
      removeReaction,
      hasReacted,

      // Méthodes de thread
      getThreadReplies,
      isThreadLoading,
      threadMessages,
      expandThread,

      // Méthodes emoji et GIF
      frequentEmojis,
      searchGifs,
      getGifs,

      // Méthodes utilitaires
      formatMessageText,
      enrichMessageWithMetadata,
      navigateToMessage,
    }),
    [
      messages,
      isMessagesLoading,
      messagesError,
      highlightMessageId,
      replyTo,
      isReplying,
      loadMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      setHighlightMessageId,
      setReplyTo,
      clearReply,
      replyToMessage,
      addReaction,
      removeReaction,
      hasReacted,
      getThreadReplies,
      isThreadLoading,
      threadMessages,
      expandThread,
      frequentEmojis,
      searchGifs,
      getGifs,
      formatMessageText,
      enrichMessageWithMetadata,
      navigateToMessage,
    ],
  );

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};
