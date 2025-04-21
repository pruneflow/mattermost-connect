// src/context/ChannelContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { Channel, Message } from "../types";
import { ServiceContainer } from "../services/factory";
import { useConnection } from "./ConnectionContext";
import { useUserContext } from "./UserContext";
import { useTeamContext } from "./TeamContext";
import { WebSocketEventType } from "../services/notification/notification.service";

/**
 * Options for messages pagination
 */
export interface GetMessagesOptions {
  /** Number of messages per page */
  perPage?: number;
  /** Page number to retrieve */
  page?: number;
  /** Get messages since this timestamp */
  since?: number;
  /** Get messages before this message ID */
  before?: string;
  /** Get messages after this message ID */
  after?: string;
}

/**
 * Interface for the ChannelContext
 * Provides channel and messaging functionality
 */
export interface ChannelContextType {
  // Current channel state
  activeChannel: Channel | null;
  isActiveChannelLoading: boolean;
  activeChannelError: Error | null;

  // Messages state
  messages: Message[];
  isMessagesLoading: boolean;
  messagesError: Error | null;
  highlightMessageId?: string;

  // Unread state
  unreadState: {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };

  // Typing state
  typingIndicator: string;

  // Channel methods
  setActiveChannel: (channel: Channel | null) => void;
  loadChannel: (channelId: string) => Promise<Channel | null>;
  getChannelUnreadState: (channelId: string) => {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };
  markAsRead: (channelId?: string) => Promise<boolean>;

  // Message methods
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
  setReplyTo: (message: Message | null) => void;
  replyToMessage: (
    messageId: string,
    message: string,
    fileIds?: string[],
  ) => Promise<Message | null>;
  setHighlightMessageId: (messageId?: string) => void;

  // Navigation method
  navigateToMessage: (channelId: string, messageId?: string) => Promise<void>;
}

// Create the context with a default value of null
export const ChannelContext = createContext<ChannelContextType | null>(null);

/**
 * Custom hook to access the ChannelContext
 * Throws an error if used outside of a ChannelProvider
 */
export function useChannelContext(): ChannelContextType {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error("useChannelContext must be used within a ChannelProvider");
  }
  return context;
}

/**
 * Props for ChannelProvider component
 */
export interface ChannelProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}

/**
 * Provider component for channel management
 * Handles channel selection, messages, and unread states
 */
export const ChannelProvider: React.FC<ChannelProviderProps> = ({
  children,
  services,
  refreshInterval = 0, // Default: no auto-refresh
}) => {
  // Get dependency contexts
  const connection = useConnection();
  const { currentUser, getTypingIndicatorText } = useUserContext();
  const { getChannelById } = useTeamContext();

  // Channel state
  const [activeChannel, setActiveChannelState] = useState<Channel | null>(null);
  const [isActiveChannelLoading, setIsActiveChannelLoading] =
    useState<boolean>(false);
  const [activeChannelError, setActiveChannelError] = useState<Error | null>(
    null,
  );

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<Error | null>(null);
  const [highlightMessageId, setHighlightMessageIdState] = useState<
    string | undefined
  >(undefined);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Refs for tracking state
  const activeChannelRef = useRef<Channel | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const lastMessageFetchRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);

  /**
   * Set the active channel with updates to ref for consistent access
   */
  const setActiveChannel = useCallback(
    (channel: Channel | null) => {
      setActiveChannelState(channel);
      activeChannelRef.current = channel;

      // Reset messages when changing channels
      if (
        !channel ||
        (activeChannelRef.current && channel.id !== activeChannelRef.current.id)
      ) {
        setMessages([]);
        messagesRef.current = [];
      }

      // Set current channel in notification service
      if (services?.notificationService && channel) {
        services.notificationService.setCurrentChannelId(channel.id);
      }
    },
    [services],
  );

  /**
   * Load channel details by ID
   */
  const loadChannel = useCallback(
    async (channelId: string): Promise<Channel | null> => {
      if (
        !channelId ||
        !services?.mattermostService ||
        !connection.isConnected
      ) {
        return null;
      }

      // Check if channel is already loaded in TeamContext
      const existingChannel = getChannelById(channelId);
      if (existingChannel) {
        setActiveChannel(existingChannel);
        return existingChannel;
      }

      setIsActiveChannelLoading(true);
      setActiveChannelError(null);

      try {
        const channel = await services.mattermostService.getChannel(channelId);

        // Update state and ref
        setActiveChannel(channel);

        return channel;
      } catch (error) {
        console.error(`Error loading channel ${channelId}:`, error);
        const typedError =
          error instanceof Error ? error : new Error(String(error));

        setActiveChannelError(typedError);
        return null;
      } finally {
        setIsActiveChannelLoading(false);
      }
    },
    [services, connection.isConnected, getChannelById, setActiveChannel],
  );

  /**
   * Get unread state for a channel
   */
  const getChannelUnreadState = useCallback(
    (channelId: string) => {
      if (!services?.notificationService) {
        return { msg_count: 0, mention_count: 0 };
      }

      return services.notificationService.getChannelUnreadState(channelId);
    },
    [services],
  );

  /**
   * Mark a channel as read
   */
  const markAsRead = useCallback(
    async (channelId?: string): Promise<boolean> => {
      const targetChannelId = channelId || activeChannelRef.current?.id;

      if (
        !targetChannelId ||
        !services?.mattermostService ||
        !services.notificationService
      ) {
        return false;
      }

      try {
        // If the service has a viewChannel method, call it
        if (typeof services.mattermostService.viewChannel === "function") {
          await services.mattermostService.viewChannel(targetChannelId);
        }

        // Reset unread state in notification service
        services.notificationService.resetChannelUnreadState(targetChannelId);

        return true;
      } catch (error) {
        console.error(
          `Error marking channel ${targetChannelId} as read:`,
          error,
        );
        return false;
      }
    },
    [services],
  );

  /**
   * Load messages for a channel
   */
  const loadMessages = useCallback(
    async (
      channelId?: string,
      options: GetMessagesOptions = {},
    ): Promise<Message[]> => {
      const targetChannelId = channelId || activeChannelRef.current?.id;

      if (
        !targetChannelId ||
        !services?.mattermostService ||
        isLoadingRef.current
      ) {
        return [];
      }

      // Check refresh interval
      if (refreshInterval > 0 && messagesRef.current.length > 0) {
        const now = Date.now();
        const lastFetch = lastMessageFetchRef.current || 0;

        if (now - lastFetch < refreshInterval) {
          return messagesRef.current;
        }
      }

      setIsMessagesLoading(true);
      setMessagesError(null);
      isLoadingRef.current = true;

      try {
        const response = await services.mattermostService.getChannelMessages(
          targetChannelId,
          options,
        );

        // Convert posts object to array
        const messageArray = response.order
          .map((postId) => response.posts[postId])
          .filter(Boolean);

        // Sort messages
        const sortedMessages = messageArray.sort(
          (a, b) => a.create_at - b.create_at,
        );

        // Update state and refs
        setMessages(sortedMessages);
        messagesRef.current = sortedMessages;
        lastMessageFetchRef.current = Date.now();

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
    [services, refreshInterval],
  );

  /**
   * Send a message to the current channel
   */
  const sendMessage = useCallback(
    async (message: string, fileIds?: string[]): Promise<Message | null> => {
      if (
        !activeChannelRef.current?.id ||
        (!message.trim() && (!fileIds || fileIds.length === 0)) ||
        !services?.mattermostService
      ) {
        return null;
      }

      try {
        const newMessage = await services.mattermostService.postMessage(
          activeChannelRef.current.id,
          message,
          fileIds,
        );

        // Add new message to state
        setMessages((prev) => {
          const updated = [...prev, newMessage].sort(
            (a, b) => a.create_at - b.create_at,
          );
          messagesRef.current = updated;
          return updated;
        });

        return newMessage;
      } catch (error) {
        console.error("Error sending message:", error);
        return null;
      }
    },
    [services],
  );

  /**
   * Edit an existing message
   */
  const editMessage = useCallback(
    async (messageId: string, newMessage: string): Promise<Message | null> => {
      if (!messageId || !newMessage.trim() || !services?.mattermostService) {
        return null;
      }

      try {
        const updatedMessage = await services?.mattermostService?.editMessage(
          messageId,
          newMessage,
        );

        // Update message in state
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === messageId ? updatedMessage : msg,
          );
          messagesRef.current = updated;
          return updated;
        });

        return updatedMessage;
      } catch (error) {
        console.error(`Error editing message ${messageId}:`, error);
        return null;
      }
    },
    [services],
  );

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!messageId || !services?.mattermostService) {
        return false;
      }

      try {
        const result =
          await services?.mattermostService?.deleteMessage(messageId);

        if (result.success) {
          // Remove message from state
          setMessages((prev) => {
            const updated = prev.filter((msg) => msg.id !== messageId);
            messagesRef.current = updated;
            return updated;
          });
        }

        return result.success;
      } catch (error) {
        console.error(`Error deleting message ${messageId}:`, error);
        return false;
      }
    },
    [services],
  );

  /**
   * Reply to a message
   */
  const replyToMessage = useCallback(
    async (
      messageId: string,
      message: string,
      fileIds?: string[],
    ): Promise<Message | null> => {
      if (
        !activeChannelRef.current?.id ||
        !messageId ||
        (!message.trim() && (!fileIds || fileIds.length === 0)) ||
        !services?.mattermostService
      ) {
        return null;
      }

      try {
        const reply = await services?.mattermostService?.replyToMessage(
          activeChannelRef.current.id,
          messageId,
          message,
          fileIds,
        );

        // Add reply to state
        setMessages((prev) => {
          const updated = [...prev, reply].sort(
            (a, b) => a.create_at - b.create_at,
          );
          messagesRef.current = updated;
          return updated;
        });

        // Clear reply state
        setReplyTo(null);

        return reply;
      } catch (error) {
        console.error(`Error replying to message ${messageId}:`, error);
        return null;
      }
    },
    [services],
  );

  /**
   * Set message highlight ID
   */
  const setHighlightMessageId = useCallback((messageId?: string) => {
    setHighlightMessageIdState(messageId);
  }, []);

  /**
   * Navigate to a specific channel and optionally a specific message
   */
  const navigateToMessage = useCallback(
    async (channelId: string, messageId?: string): Promise<void> => {
      if (!channelId || !services) {
        return;
      }

      try {
        // First load the channel
        const channel = await loadChannel(channelId);

        if (!channel) {
          throw new Error(`Failed to load channel ${channelId}`);
        }

        // Then load messages
        await loadMessages(channelId);

        // If messageId provided, highlight it
        if (messageId) {
          setHighlightMessageId(messageId);
        }
      } catch (error) {
        console.error(`Error navigating to channel ${channelId}:`, error);
      }
    },
    [services, loadChannel, loadMessages, setHighlightMessageId],
  );

  // Load messages when active channel changes
  useEffect(() => {
    if (activeChannel && !isMessagesLoading) {
      void loadMessages(activeChannel.id);

      // Mark channel as read when switching to it
      void markAsRead(activeChannel.id);
    }
  }, [activeChannel, isMessagesLoading, loadMessages, markAsRead]);

  // Update refs when state changes
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (
      !connection.isConnected ||
      !activeChannel ||
      !services?.notificationService
    ) {
      return;
    }

    // Handle new posts, edits, and deletions
    const handleMessageEvent = () => {
      if (activeChannel) {
        void loadMessages(activeChannel.id);
      }
    };

    // Clean up functions for event listeners
    const cleanupFunctions: Array<() => void> = [];

    // Channel events
    const events = [
      WebSocketEventType.POSTED,
      WebSocketEventType.POST_EDITED,
      WebSocketEventType.POST_DELETED,
    ];

    // Register event handlers
    events.forEach((eventType) => {
      const cleanup = services.notificationService.addEventListener(
        eventType,
        handleMessageEvent,
      );
      cleanupFunctions.push(cleanup);
    });

    // Clean up on unmount or when dependencies change
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [connection.isConnected, activeChannel, services, loadMessages]);

  // Set up message auto-refresh if enabled
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !activeChannel) {
      return;
    }

    const intervalId = setInterval(() => {
      if (activeChannel && !isLoadingRef.current) {
        void loadMessages(activeChannel.id);
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [activeChannel, refreshInterval, loadMessages]);

  // Get the current channel's unread state
  const unreadState = useMemo(() => {
    if (!activeChannel || !services?.notificationService) {
      return { msg_count: 0, mention_count: 0 };
    }

    return services.notificationService.getChannelUnreadState(activeChannel.id);
  }, [activeChannel, services]);

  // Get typing indicator for current channel
  const typingIndicator = useMemo(() => {
    if (!activeChannel) return "";
    return getTypingIndicatorText(activeChannel.id);
  }, [activeChannel, getTypingIndicatorText]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ChannelContextType>(
    () => ({
      // State
      activeChannel,
      isActiveChannelLoading,
      activeChannelError,
      messages,
      isMessagesLoading,
      messagesError,
      highlightMessageId,
      replyToMessage: replyTo,
      unreadState,
      typingIndicator,

      // Channel methods
      setActiveChannel,
      loadChannel,
      getChannelUnreadState,
      markAsRead,

      // Message methods
      loadMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      setReplyTo,
      replyToMessage,
      setHighlightMessageId,

      // Navigation
      navigateToMessage,
    }),
    [
      activeChannel,
      isActiveChannelLoading,
      activeChannelError,
      messages,
      isMessagesLoading,
      messagesError,
      highlightMessageId,
      replyTo,
      unreadState,
      typingIndicator,
      setActiveChannel,
      loadChannel,
      getChannelUnreadState,
      markAsRead,
      loadMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      setReplyTo,
      replyToMessage,
      setHighlightMessageId,
      navigateToMessage,
    ],
  );

  return (
    <ChannelContext.Provider value={contextValue}>
      {children}
    </ChannelContext.Provider>
  );
};
