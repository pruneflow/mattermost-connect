// src/hooks/useChannel.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { Channel, Message, MessagesResponse } from "../types";
import { useMattermost } from "../context";
import { assertServiceInitialized } from "../services/factory";

/**
 * Options pour le hook useChannel
 */
interface UseChannelOptions {
  /** Inclure les messages du canal (défaut: true) */
  includeMessages?: boolean;

  /** Nombre de messages par page (défaut: 60) */
  messagesPerPage?: number;

  /** Trier les messages par ordre chronologique (défaut: true) */
  sortChronological?: boolean;

  /** Intervalle de rafraîchissement des messages en ms (défaut: 0 - désactivé) */
  refreshInterval?: number;

  /** Callback appelé lorsque le canal est marqué comme lu */
  onMarkAsRead?: () => void;
}

/**
 * État de retour du hook useChannel
 */
interface UseChannelState {
  /** Le canal actif */
  channel: Channel | null;

  /** État de chargement du canal */
  loading: boolean;

  /** Erreur éventuelle */
  error: Error | null;

  /** Messages du canal (triés selon sortChronological) */
  messages: Message[];

  /** État de chargement des messages */
  loadingMessages: boolean;

  /** Erreur lors du chargement des messages */
  messagesError: Error | null;

  /** État non lu du canal */
  unreadState: {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };

  /** Liste des utilisateurs en train de taper */
  typingUsers: string[];

  /** Indicateur de frappe formaté */
  typingIndicator: string;
}

/**
 * Hook personnalisé pour interagir avec un canal Mattermost
 *
 * @param channelId ID du canal à utiliser
 * @param options Options de configuration
 * @returns État et fonctions pour interagir avec le canal
 */
export function useChannel(
  channelId: string | null,
  options: UseChannelOptions = {},
) {
  // Options avec valeurs par défaut
  const {
    includeMessages = true,
    messagesPerPage = 60,
    sortChronological = true,
    refreshInterval = 0,
    onMarkAsRead,
  } = options;

  // Contexte Mattermost
  const {
    services,
    activeChannel,
    setActiveChannel,
    getChannelUnreadState,
    markChannelAsRead,
    getTypingUsersForChannel,
    getTypingIndicatorText,
  } = useMattermost();

  // États locaux
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Récupérer les états non lus et de frappe
  const unreadState = useMemo(
    () =>
      channelId
        ? getChannelUnreadState(channelId)
        : { msg_count: 0, mention_count: 0 },
    [channelId, getChannelUnreadState],
  );

  const typingUsers = useMemo(
    () => (channelId ? getTypingUsersForChannel(channelId) : []),
    [channelId, getTypingUsersForChannel],
  );

  const typingIndicator = useMemo(
    () => (channelId ? getTypingIndicatorText(channelId) : ""),
    [channelId, getTypingIndicatorText],
  );

  // Fonction pour charger les informations du canal
  const loadChannel = useCallback(async () => {
    if (!channelId || !services) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");

    setLoading(true);
    setError(null);

    try {
      const channelData =
        await services.mattermostService.getChannel(channelId);
      setChannel(channelData);

      // Si ce canal n'est pas déjà le canal actif, le définir
      if (!activeChannel || activeChannel.id !== channelId) {
        setActiveChannel(channelData);
      }
    } catch (err) {
      console.error(`Erreur lors du chargement du canal ${channelId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [channelId, services, activeChannel, setActiveChannel]);

  // Fonction pour charger les messages du canal
  const loadMessages = useCallback(async () => {
    if (!channelId || !services || !includeMessages) return;

    assertServiceInitialized(services.mattermostService, "mattermostService");

    setLoadingMessages(true);
    setMessagesError(null);

    try {
      const response: MessagesResponse =
        await services.mattermostService.getChannelMessages(channelId, {
          perPage: messagesPerPage,
        });

      // Convertir l'objet posts en tableau
      const messageArray = response.order
        .map((postId) => response.posts[postId])
        .filter(Boolean);

      // Trier les messages selon l'option
      const sortedMessages = sortChronological
        ? messageArray.sort((a, b) => a.create_at - b.create_at)
        : messageArray.sort((a, b) => b.create_at - a.create_at);

      setMessages(sortedMessages);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error(
        `Erreur lors du chargement des messages pour le canal ${channelId}:`,
        err,
      );
      setMessagesError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMessages(false);
    }
  }, [
    channelId,
    services,
    includeMessages,
    messagesPerPage,
    sortChronological,
  ]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback(
    async (
      messageText: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      if (!channelId || !messageText.trim() || !services) return null;

      assertServiceInitialized(services.mattermostService, "mattermostService");

      try {
        const newMessage = await services.mattermostService.postMessage(
          channelId,
          messageText,
          fileIds,
        );

        // Ajouter le nouveau message à la liste actuelle
        setMessages((prev) => {
          const updatedMessages = [...prev, newMessage];

          // Retrier si nécessaire
          if (sortChronological) {
            return updatedMessages.sort((a, b) => a.create_at - b.create_at);
          } else {
            return updatedMessages.sort((a, b) => b.create_at - a.create_at);
          }
        });

        return newMessage;
      } catch (err) {
        console.error(
          `Erreur lors de l'envoi du message dans le canal ${channelId}:`,
          err,
        );
        return null;
      }
    },
    [channelId, services, sortChronological],
  );

  // Fonction pour répondre à un message
  const replyToMessage = useCallback(
    async (
      messageId: string,
      replyText: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      if (!channelId || !messageId || !replyText.trim() || !services)
        return null;

      assertServiceInitialized(services.mattermostService, "mattermostService");

      try {
        if (!services.mattermostService.replyToMessage) {
          throw new Error("La fonctionnalité de réponse n'est pas disponible");
        }

        const reply = await services.mattermostService.replyToMessage(
          channelId,
          messageId,
          replyText,
          fileIds,
        );

        // Ajouter la réponse à la liste des messages
        setMessages((prev) => {
          const updatedMessages = [...prev, reply];

          // Retrier si nécessaire
          if (sortChronological) {
            return updatedMessages.sort((a, b) => a.create_at - b.create_at);
          } else {
            return updatedMessages.sort((a, b) => b.create_at - a.create_at);
          }
        });

        return reply;
      } catch (err) {
        console.error(
          `Erreur lors de la réponse au message ${messageId}:`,
          err,
        );
        return null;
      }
    },
    [channelId, services, sortChronological],
  );

  // Fonction pour éditer un message
  const editMessage = useCallback(
    async (messageId: string, newText: string): Promise<Message | null> => {
      if (!channelId || !messageId || !newText.trim() || !services) return null;

      assertServiceInitialized(services.mattermostService, "mattermostService");

      try {
        if (!services.mattermostService.editMessage) {
          throw new Error("La fonctionnalité d'édition n'est pas disponible");
        }

        const updatedMessage = await services.mattermostService.editMessage(
          messageId,
          newText,
        );

        // Mettre à jour le message dans la liste
        setMessages((prev) => {
          return prev.map((msg) =>
            msg.id === messageId ? updatedMessage : msg,
          );
        });

        return updatedMessage;
      } catch (err) {
        console.error(`Erreur lors de l'édition du message ${messageId}:`, err);
        return null;
      }
    },
    [channelId, services],
  );

  // Fonction pour supprimer un message
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!channelId || !messageId || !services) return false;

      assertServiceInitialized(services.mattermostService, "mattermostService");

      try {
        if (!services.mattermostService.deleteMessage) {
          throw new Error(
            "La fonctionnalité de suppression n'est pas disponible",
          );
        }

        const result =
          await services.mattermostService.deleteMessage(messageId);

        // Retirer le message de la liste si suppression réussie
        if (result.success) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }

        return result.success;
      } catch (err) {
        console.error(
          `Erreur lors de la suppression du message ${messageId}:`,
          err,
        );
        return false;
      }
    },
    [channelId, services],
  );

  // Fonction pour marquer le canal comme lu
  const markAsRead = useCallback(async (): Promise<boolean> => {
    if (!channelId) return false;

    try {
      await markChannelAsRead(channelId);

      // Appeler le callback si fourni
      if (onMarkAsRead) {
        onMarkAsRead();
      }

      return true;
    } catch (err) {
      console.error(
        `Erreur lors du marquage du canal ${channelId} comme lu:`,
        err,
      );
      return false;
    }
  }, [channelId, markChannelAsRead, onMarkAsRead]);

  // Charger le canal quand l'ID change
  useEffect(() => {
    if (channelId) {
      void loadChannel();
    } else {
      setChannel(null);
      setError(null);
    }
  }, [channelId, loadChannel]);

  // Charger les messages quand le canal change ou quand includeMessages change
  useEffect(() => {
    if (channelId && includeMessages) {
      void loadMessages();
    } else if (!includeMessages) {
      setMessages([]);
      setMessagesError(null);
    }
  }, [channelId, includeMessages, loadMessages]);

  // Configurer le rafraîchissement périodique des messages si demandé
  useEffect(() => {
    if (
      !refreshInterval ||
      refreshInterval <= 0 ||
      !channelId ||
      !includeMessages
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      // Ne charger que si le dernier chargement date d'au moins refreshInterval ms
      const now = Date.now();
      if (now - lastFetchTime >= refreshInterval) {
        void loadMessages();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [
    channelId,
    includeMessages,
    refreshInterval,
    lastFetchTime,
    loadMessages,
  ]);

  // État combiné à retourner
  const state: UseChannelState = {
    channel,
    loading,
    error,
    messages,
    loadingMessages,
    messagesError,
    unreadState,
    typingUsers,
    typingIndicator,
  };

  // Retourner l'état et les fonctions
  return {
    ...state,
    loadChannel,
    loadMessages,
    sendMessage,
    replyToMessage,
    editMessage,
    deleteMessage,
    markAsRead,
  };
}

export default useChannel;
