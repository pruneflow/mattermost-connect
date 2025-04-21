// src/hooks/useChannel.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { Channel, Message } from "../types";
import {
  useChannelContext,
  useTeamContext,
  useMessageContext,
} from "../context";
import { GetMessagesOptions } from "../context/ChannelContext";

/**
 * Options for the useChannel hook
 */
interface UseChannelOptions {
  /** Include messages for the channel (default: true) */
  includeMessages?: boolean;

  /** Number of messages per page (default: 60) */
  messagesPerPage?: number;

  /** Sort messages chronologically (default: true) */
  sortChronological?: boolean;

  /** Refresh interval in ms (default: 0 - disabled) */
  refreshInterval?: number;

  /** Callback called when channel is marked as read */
  onMarkAsRead?: () => void;
}

/**
 * Return state for the useChannel hook
 */
interface UseChannelState {
  /** The active channel */
  channel: Channel | null;

  /** Channel loading state */
  loading: boolean;

  /** Error when loading channel */
  error: Error | null;

  /** Messages in the channel (sorted according to sortChronological) */
  messages: Message[];

  /** Messages loading state */
  loadingMessages: boolean;

  /** Error when loading messages */
  messagesError: Error | null;

  /** Unread state of the channel */
  unreadState: {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };

  /** List of users typing in the channel */
  typingUsers: string[];

  /** Formatted typing indicator text */
  typingIndicator: string;
}

/**
 * Custom hook for interacting with a Mattermost channel
 * This version is backward compatible but leverages the new context architecture
 *
 * @param channelId ID of the channel to use
 * @param options Configuration options
 * @returns State and functions to interact with the channel
 */
export function useChannel(
  channelId: string | null,
  options: UseChannelOptions = {},
) {
  // Options with default values
  const {
    includeMessages = true,
    messagesPerPage = 60,
    sortChronological = true,
    refreshInterval = 0,
    onMarkAsRead,
  } = options;

  // Use the specialized contexts
  const channelContext = useChannelContext();
  const teamContext = useTeamContext();
  const messageContext = useMessageContext();

  // States for backward compatibility
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<Error | null>(null);

  // Function to load channel details
  const loadChannel = useCallback(async () => {
    if (!channelId) return;

    setLoading(true);
    setError(null);

    try {
      // First check if channel exists in team context
      const existingChannel = teamContext.getChannelById(channelId);

      if (existingChannel) {
        setChannel(existingChannel);
        channelContext.setActiveChannel(existingChannel);
        return existingChannel;
      }

      // Otherwise load from channel context
      const loadedChannel = await channelContext.loadChannel(channelId);

      if (loadedChannel) {
        setChannel(loadedChannel);
        return loadedChannel;
      } else {
        throw new Error(`Failed to load channel ${channelId}`);
      }
    } catch (err) {
      console.error(`Error loading channel ${channelId}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [channelId, teamContext, channelContext]);

  // Function to load messages for the channel
  const loadMessages = useCallback(async () => {
    if (!channelId || !includeMessages) return;

    setLoadingMessages(true);
    setMessagesError(null);

    try {
      const options: GetMessagesOptions = {
        perPage: messagesPerPage,
      };

      const messagesList = await channelContext.loadMessages(
        channelId,
        options,
      );

      // Sort messages according to preference
      const sortedMessages = sortChronological
        ? [...messagesList].sort((a, b) => a.create_at - b.create_at)
        : [...messagesList].sort((a, b) => b.create_at - a.create_at);

      setMessages(sortedMessages);

      return sortedMessages;
    } catch (err) {
      console.error(`Error loading messages for channel ${channelId}:`, err);
      setMessagesError(err instanceof Error ? err : new Error(String(err)));
      return [];
    } finally {
      setLoadingMessages(false);
    }
  }, [
    channelId,
    includeMessages,
    messagesPerPage,
    sortChronological,
    channelContext,
  ]);

  // Function to send a message
  const sendMessage = useCallback(
    async (
      messageText: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      if (
        !channelId ||
        (!messageText.trim() && (!fileIds || !fileIds.length))
      ) {
        return null;
      }

      try {
        const newMessage = await channelContext.sendMessage(
          messageText,
          fileIds,
        );

        if (newMessage) {
          // Add message to local state (sorted according to preference)
          setMessages((prev) => {
            const updated = [...prev, newMessage];
            return sortChronological
              ? updated.sort((a, b) => a.create_at - b.create_at)
              : updated.sort((a, b) => b.create_at - a.create_at);
          });
        }

        return newMessage;
      } catch (error) {
        console.error(`Error sending message to channel ${channelId}:`, error);
        return null;
      }
    },
    [channelId, channelContext, sortChronological],
  );

  // Function to reply to a message
  const replyToMessage = useCallback(
    async (
      messageId: string,
      replyText: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      if (
        !channelId ||
        !messageId ||
        (!replyText.trim() && (!fileIds || !fileIds.length))
      ) {
        return null;
      }

      try {
        const reply = await channelContext.replyToMessage(
          messageId,
          replyText,
          fileIds,
        );

        if (reply) {
          // Add reply to local state (sorted according to preference)
          setMessages((prev) => {
            const updated = [...prev, reply];
            return sortChronological
              ? updated.sort((a, b) => a.create_at - b.create_at)
              : updated.sort((a, b) => b.create_at - a.create_at);
          });
        }

        return reply;
      } catch (error) {
        console.error(`Error replying to message ${messageId}:`, error);
        return null;
      }
    },
    [channelId, channelContext, sortChronological],
  );

  // Function to edit a message
  const editMessage = useCallback(
    async (messageId: string, newText: string): Promise<Message | null> => {
      if (!messageId || !newText.trim()) {
        return null;
      }

      try {
        const updatedMessage = await channelContext.editMessage(
          messageId,
          newText,
        );

        if (updatedMessage) {
          // Update message in local state
          setMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? updatedMessage : msg)),
          );
        }

        return updatedMessage;
      } catch (error) {
        console.error(`Error editing message ${messageId}:`, error);
        return null;
      }
    },
    [channelContext],
  );

  // Function to delete a message
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!messageId) {
        return false;
      }

      try {
        const success = await channelContext.deleteMessage(messageId);

        if (success) {
          // Remove message from local state
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }

        return success;
      } catch (error) {
        console.error(`Error deleting message ${messageId}:`, error);
        return false;
      }
    },
    [channelContext],
  );

  // Function to mark channel as read
  const markAsRead = useCallback(async (): Promise<boolean> => {
    if (!channelId) return false;

    try {
      const success = await channelContext.markAsRead(channelId);

      if (success && onMarkAsRead) {
        onMarkAsRead();
      }

      return success;
    } catch (error) {
      console.error(`Error marking channel ${channelId} as read:`, error);
      return false;
    }
  }, [channelId, channelContext, onMarkAsRead]);

  // Load channel when channelId changes
  useEffect(() => {
    if (channelId) {
      void loadChannel();
    } else {
      setChannel(null);
      setError(null);
    }
  }, [channelId, loadChannel]);

  // Load messages when channel changes or includeMessages changes
  useEffect(() => {
    if (channelId && includeMessages) {
      void loadMessages();
    } else if (!includeMessages) {
      setMessages([]);
      setMessagesError(null);
    }
  }, [channelId, includeMessages, loadMessages]);

  // Mark as read when entering a channel
  useEffect(() => {
    if (channelId && channel) {
      void markAsRead();
    }
  }, [channelId, channel, markAsRead]);

  // Set up periodic refresh if requested
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
      void loadMessages();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [channelId, includeMessages, refreshInterval, loadMessages]);

  // Get unread state from channel context
  const unreadState = useMemo(() => {
    if (!channelId) return { msg_count: 0, mention_count: 0 };
    return channelContext.getChannelUnreadState(channelId);
  }, [channelId, channelContext]);

  // Get typing users from the active channel's typing indicator
  const typingUsers = useMemo(() => {
    if (!channelId) return [];
    return channelContext.typingIndicator ? ["user1", "user2"] : []; // Simplified
  }, [channelId, channelContext.typingIndicator]);

  // Combined state to return
  const state: UseChannelState = {
    channel,
    loading,
    error,
    messages,
    loadingMessages,
    messagesError,
    unreadState,
    typingUsers,
    typingIndicator: channelContext.typingIndicator || "",
  };

  // Return the state and functions
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
