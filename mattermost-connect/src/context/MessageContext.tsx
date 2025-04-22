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
 * Interface for the MessageContext
 * Provides message-specific functionality separate from channel operations
 */
export interface MessageContextType {
  // Reply state (moved from ChannelContext)
  replyTo: Message | null;
  isReplying: boolean;
  setReplyTo: (message: Message | null) => void;
  clearReply: () => void;
  replyToMessage: (
    messageId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;
  sendMessage: (message: string, fileIds?: string[]) => Promise<Message | null>;
  editMessage: (
    messageId: string,
    newMessage: string,
  ) => Promise<Message | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;

  // Message reactions
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  hasReacted: (messageId: string, emoji: string) => Promise<boolean>;

  // Message threads
  getThreadReplies: (rootMessageId: string) => Promise<Message[]>;
  isThreadLoading: Record<string, boolean>;
  threadMessages: Record<string, Message[]>;
  expandThread: (messageId: string) => Promise<Message[]>;

  // Emoji and GIF functionality
  frequentEmojis: string[];
  searchGifs: (query: string) => Promise<any[]>;
  getGifs: (category: string) => Promise<any[]>;

  // Message utility functions
  formatMessageText: (text: string) => string;
  enrichMessageWithMetadata: (message: Message) => Promise<Message>;
}

// Create the context with a default value of null
export const MessageContext = createContext<MessageContextType | null>(null);

/**
 * Custom hook to access the MessageContext
 * Throws an error if used outside of a MessageProvider
 */
export function useMessageContext(): MessageContextType {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within a MessageProvider");
  }
  return context;
}

/**
 * Props for MessageProvider component
 */
export interface MessageProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
}

/**
 * Provider component for message-specific functionality
 * Handles reactions, threads, and message formatting
 */
export const MessageProvider: React.FC<MessageProviderProps> = ({
  children,
  services,
}) => {
  // Get dependency contexts
  const { currentUser } = useUserContext();
  const { activeChannel } = useChannelContext();

  const activeChannelId = activeChannel?.id || null;

  // Reply state (moved from ChannelContext)
  const [replyTo, setReplyToState] = useState<Message | null>(null);

  // Thread state
  const [threadMessages, setThreadMessages] = useState<
    Record<string, Message[]>
  >({});
  const [isThreadLoading, setIsThreadLoading] = useState<
    Record<string, boolean>
  >({});

  // Emoji state
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>([
    "👍",
    "❤️",
    "😂",
    "🎉",
    "🔥",
    "👏",
    "✅",
    "🙏", // Default emojis
  ]);

  // Refs for tracking state
  const threadMessagesRef = useRef<Record<string, Message[]>>({});

  /**
   * Set reply target message
   */
  const setReplyTo = useCallback((message: Message | null) => {
    setReplyToState(message);
  }, []);

  /**
   * Clear the reply state
   */
  const clearReply = useCallback(() => {
    setReplyToState(null);
  }, []);

  // Implémentation dans le provider
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
        const reply = await services!.mattermostService!.replyToMessage(
          activeChannelId,
          messageId,
          message,
          fileIds,
        );

        // Effacer l'état de réponse
        clearReply();

        return reply;
      } catch (error) {
        console.error(`Error replying to message ${messageId}:`, error);
        return null;
      }
    },
    [services, clearReply, activeChannelId],
  );

  const sendMessage = useCallback(
    async (message: string, fileIds?: string[]): Promise<Message | null> => {
      if (
        !activeChannelId ||
        (!message.trim() && (!fileIds || fileIds.length === 0)) ||
        !services?.mattermostService?.postMessage
      ) {
        return null;
      }

      try {
        return await services.mattermostService.postMessage(
          activeChannelId,
          message,
          fileIds,
        );
      } catch (error) {
        console.error("Error sending message:", error);
        return null;
      }
    },
    [services, activeChannelId],
  );

  /**
   * Édite un message existant
   * @param messageId ID du message à éditer
   * @param newMessage Nouveau contenu du message
   * @returns Le message modifié ou null en cas d'erreur
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

        const updatedMessage = await services!.mattermostService!.editMessage(
          messageId,
          newMessage,
        );

        // Vérifier si le message a été édité et s'il fait partie d'un thread
        if (updatedMessage && updatedMessage.root_id) {
          // Vérifier si nous avons des messages pour ce thread
          const rootId = updatedMessage.root_id;
          if (threadMessages[rootId]) {
            setThreadMessages((prev) => {
              // Créer une copie du tableau de messages du thread
              const threadMsgs = [...prev[rootId]];
              // Trouver et remplacer le message modifié
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
    [services, threadMessages, setThreadMessages],
  );

  /**
   * Supprime un message
   * @param messageId ID du message à supprimer
   * @returns true si la suppression a réussi, false sinon
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
          await services!.mattermostService!.deleteMessage(messageId);

        // Si la suppression est réussie, mettre à jour les références locales
        if (result.success) {
          // Parcourir tous les threads pour trouver et supprimer le message
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

          // Si c'était un message auquel on voulait répondre, annuler la réponse
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
    [services, threadMessages, setThreadMessages, replyTo, clearReply],
  );

  // Derive isReplying from replyTo
  const isReplying = useMemo(() => replyTo !== null, [replyTo]);

  /**
   * Add a reaction to a message
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
   * Remove a reaction from a message
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
   * Check if the current user has reacted with a specific emoji
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
   * Get replies to a message thread
   */
  const getThreadReplies = useCallback(
    async (rootMessageId: string): Promise<Message[]> => {
      if (!rootMessageId || !services?.mattermostService) {
        return [];
      }

      // Return cached thread messages if available
      if (threadMessagesRef.current[rootMessageId]) {
        return threadMessagesRef.current[rootMessageId];
      }

      // Mark as loading
      setIsThreadLoading((prev) => ({
        ...prev,
        [rootMessageId]: true,
      }));

      try {
        // For now, we'll stub this with an empty array
        // In a real implementation, you would call a specific API method to get thread replies
        // Example: const response = await services.mattermostService.getPostThread(rootMessageId);

        const messages: Message[] = [];

        // Update state and refs
        setThreadMessages((prev) => {
          const updated = {
            ...prev,
            [rootMessageId]: messages,
          };
          threadMessagesRef.current = updated;
          return updated;
        });

        return messages;
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
    [services],
  );

  /**
   * Expand a thread to view replies
   */
  const expandThread = useCallback(
    async (messageId: string): Promise<Message[]> => {
      return getThreadReplies(messageId);
    },
    [getThreadReplies],
  );

  /**
   * Search for GIFs with a query
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
   * Get GIFs by category
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
   * Format message text with Markdown and mentions
   * This is a simplified version - a real implementation would use a proper parser
   */
  const formatMessageText = useCallback((text: string): string => {
    if (!text) return "";

    // In a real implementation, you would use the formatMessageText utility
    // But for this example, we'll return the text as is
    return text;
  }, []);

  /**
   * Enrich a message with additional metadata like reactions and attachments
   */
  const enrichMessageWithMetadata = useCallback(
    async (message: Message): Promise<Message> => {
      if (!message || !services?.fileService) {
        return message;
      }

      // Clone the message to avoid mutation
      const enrichedMessage = { ...message };

      // If the message has file attachments, add preview URLs
      if (enrichedMessage.file_ids?.length) {
        const metadata = enrichedMessage.metadata || { files: [] };

        // Get file information for each attachment
        for (const fileId of enrichedMessage.file_ids) {
          try {
            // Check if this file is already in metadata
            if (metadata.files?.some((file) => file.id === fileId)) {
              continue;
            }

            // For image files, get a preview URL
            const isImage = true; // Simplified check
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

  // Load frequent emojis on initialization
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
        // Keep default emojis on error
      }
    };

    void loadFrequentEmojis();
  }, [services]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<MessageContextType>(
    () => ({
      // Reply state (moved from ChannelContext)
      replyTo,
      isReplying,
      setReplyTo,
      clearReply,
      replyToMessage,
      sendMessage,
      editMessage,
      deleteMessage,

      // Reaction methods
      addReaction,
      removeReaction,
      hasReacted,

      // Thread methods
      getThreadReplies,
      isThreadLoading,
      threadMessages,
      expandThread,

      // Emoji and GIF methods
      frequentEmojis,
      searchGifs,
      getGifs,

      // Utility methods
      formatMessageText,
      enrichMessageWithMetadata,
    }),
    [
      // Reply state dependencies
      replyTo,
      isReplying,
      setReplyTo,
      clearReply,

      // Other dependencies
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
    ],
  );

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};
