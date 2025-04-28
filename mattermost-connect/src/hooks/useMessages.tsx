// src/hooks/useMessages.tsx
/**
 * Hooks for message functionality
 * Optimized and modular hooks for different message use cases
 */
import { useCallback, useState, useMemo, useEffect } from "react";
import { Message, MessagePaginationOptions, ReactionCount } from "../types";
import {
  useMessageStore,
  getSortedChannelMessages,
  getSortedThreadMessages,
  useAuthStore,
} from "../core/store";
import {
  useMessagesQuery,
  useThreadMessagesQuery,
  useSendMessageMutation,
  useReplyToMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  usePinnedMessagesQuery,
  useUploadFilesMutation,
} from "../core/api/queries/messageQueries";
import { debounce } from "../utils/performance";

/**
 * Main hook for channel messages management
 * @param channelId - Channel ID
 * @param options - Pagination options
 * @returns Message state and actions
 */
export function useMessages(
  channelId: string | undefined,
  options: MessagePaginationOptions = { channelId: "your-channel-id" },
) {
  // Get state from store
  const {
    highlightedMessageId,
    replyToMessage,
    editingMessageId,
    setHighlightedMessage,
    setReplyToMessage,
    setEditingMessage,
    addReaction,
    removeReaction,
    hasUserReacted,
    getReactionCounts,
  } = useMessageStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Message queries
  const messagesQuery = useMessagesQuery(channelId, options);
  const pinnedMessagesQuery = usePinnedMessagesQuery(channelId);

  // Message mutations
  const sendMessageMutation = useSendMessageMutation();
  const editMessageMutation = useEditMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const pinMessageMutation = usePinMessageMutation();
  const unpinMessageMutation = useUnpinMessageMutation();
  const uploadFilesMutation = useUploadFilesMutation();

  /**
   * Refreshes the messages list
   * @returns Promise resolving to refreshed messages
   */
  const refreshMessages = useCallback(async () => {
    return messagesQuery.refetch().then((result) => result.data || []);
  }, [messagesQuery]);

  /**
   * Sends a new message
   * @param content - Message content
   * @param fileIds - Optional file IDs to attach
   * @returns Promise resolving to the sent message
   */
  const sendMessage = useCallback(
    async (content: string, fileIds: string[] = []) => {
      if (!channelId) {
        throw new Error("Channel ID is required to send a message");
      }

      return sendMessageMutation.mutateAsync({
        channelId,
        message: content,
        fileIds,
      });
    },
    [channelId, sendMessageMutation],
  );

  /**
   * Edits a message
   * @param messageId - Message ID
   * @param content - New content
   * @returns Promise resolving to the edited message
   */
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      return editMessageMutation.mutateAsync({ messageId, message: content });
    },
    [editMessageMutation],
  );

  /**
   * Deletes a message
   * @param messageId - Message ID
   * @returns Promise resolving when deletion completes
   */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        throw new Error("Channel ID is required to delete a message");
      }

      return deleteMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, deleteMessageMutation],
  );

  /**
   * Pins a message
   * @param messageId - Message ID
   * @returns Promise resolving when action completes
   */
  const pinMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        throw new Error("Channel ID is required to pin a message");
      }

      return pinMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, pinMessageMutation],
  );

  /**
   * Unpins a message
   * @param messageId - Message ID
   * @returns Promise resolving when action completes
   */
  const unpinMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        throw new Error("Channel ID is required to unpin a message");
      }

      return unpinMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, unpinMessageMutation],
  );

  /**
   * Uploads files to attach to a message
   * @param files - Files to upload
   * @returns Promise resolving with the uploaded file IDs
   */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!channelId) {
        throw new Error("Channel ID is required to upload files");
      }

      const result = (await uploadFilesMutation.mutateAsync({
        channelId,
        files,
      })) as unknown as { file_infos: Array<{ id: string }> };

      if (result && result.file_infos) {
        return result.file_infos.map((info: any) => info.id);
      } else {
        return [];
      }
    },
    [channelId, uploadFilesMutation],
  );

  /**
   * Adds or removes a reaction on a message
   * @param messageId - Message ID
   * @param emoji - Emoji name
   * @returns Promise resolving when action completes
   */
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const alreadyReacted = hasUserReacted(messageId, currentUser.id, emoji);

      if (alreadyReacted) {
        removeReaction(messageId, currentUser.id, emoji);
      } else {
        addReaction(messageId, currentUser.id, emoji);
      }
    },
    [currentUser, addReaction, removeReaction, hasUserReacted],
  );

  /**
   * Gets sorted messages for the channel
   * @returns Sorted messages
   */
  const getSortedMessages = useCallback(() => {
    if (!channelId) return [];
    return getSortedChannelMessages(channelId);
  }, [channelId]);

  // Use memoized values for better performance
  const messages = useMemo(() => getSortedMessages(), [getSortedMessages]);
  const pinnedMessages = useMemo(
    () => pinnedMessagesQuery.data || [],
    [pinnedMessagesQuery.data],
  );

  /**
   * Gets reaction counts for a message
   * @param messageId - Message ID
   * @returns Reaction counts by emoji
   */
  const getMessageReactionCounts = useCallback(
    (messageId: string): ReactionCount[] => {
      return getReactionCounts(messageId);
    },
    [getReactionCounts],
  );

  return {
    // State
    messages,
    pinnedMessages,
    highlightedMessageId,
    replyToMessage,
    editingMessageId,
    isLoading: messagesQuery.isLoading || messagesQuery.isFetching,
    isSending: sendMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isUploading: uploadFilesMutation.isPending,
    isPinning: pinMessageMutation.isPending || unpinMessageMutation.isPending,
    error: messagesQuery.error,

    // Actions
    refreshMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    uploadFiles,
    toggleReaction,
    setHighlightedMessage,
    setReplyToMessage,
    setEditingMessage,
    getMessageReactionCounts,
    hasUserReacted: (messageId: string, emoji: string) =>
      currentUser ? hasUserReacted(messageId, currentUser.id, emoji) : false,
  };
}

/**
 * Specialized hook for thread management
 * @param rootMessageId - Root message ID
 * @param channelId - Channel ID
 * @returns Thread state and actions
 */
export function useThread(
  rootMessageId: string | undefined,
  channelId: string,
) {
  // Get state from store
  const {
    setReplyToMessage,
    addReaction,
    removeReaction,
    hasUserReacted,
    getReactionCounts,
  } = useMessageStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Thread messages query
  const threadMessagesQuery = useThreadMessagesQuery(rootMessageId);

  // Thread-related mutations
  const replyToMessageMutation = useReplyToMessageMutation();
  const editMessageMutation = useEditMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const uploadFilesMutation = useUploadFilesMutation();

  /**
   * Refreshes thread messages
   * @returns Promise resolving to refreshed thread messages
   */
  const refreshThreadMessages = useCallback(async () => {
    return threadMessagesQuery.refetch().then((result) => result.data || []);
  }, [threadMessagesQuery]);

  /**
   * Replies to the thread
   * @param content - Reply content
   * @param fileIds - Optional file IDs to attach
   * @returns Promise resolving to the sent reply
   */
  const replyToThread = useCallback(
    async (content: string, fileIds: string[] = []) => {
      if (!rootMessageId) {
        throw new Error("Root message ID is required to reply to a thread");
      }

      return replyToMessageMutation.mutateAsync({
        channelId,
        rootMessageId,
        message: content,
        fileIds,
      });
    },
    [channelId, rootMessageId, replyToMessageMutation],
  );

  /**
   * Edits a message in the thread
   * @param messageId - Message ID
   * @param content - New content
   * @returns Promise resolving to the edited message
   */
  const editThreadMessage = useCallback(
    async (messageId: string, content: string) => {
      return editMessageMutation.mutateAsync({ messageId, message: content });
    },
    [editMessageMutation],
  );

  /**
   * Deletes a message from the thread
   * @param messageId - Message ID
   * @returns Promise resolving when deletion completes
   */
  const deleteThreadMessage = useCallback(
    async (messageId: string) => {
      return deleteMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, deleteMessageMutation],
  );

  /**
   * Uploads files to attach to a thread reply
   * @param files - Files to upload
   * @returns Promise resolving with the uploaded file IDs
   */
  const uploadThreadFiles = useCallback(
    async (files: File[]) => {
      const result = (await uploadFilesMutation.mutateAsync({
        channelId,
        files,
      })) as unknown as { file_infos: Array<{ id: string }> };

      if (result && result.file_infos) {
        return result.file_infos.map((info: any) => info.id);
      } else {
        return [];
      }
    },
    [channelId, uploadFilesMutation],
  );

  /**
   * Adds or removes a reaction on a thread message
   * @param messageId - Message ID
   * @param emoji - Emoji name
   * @returns Promise resolving when action completes
   */
  const toggleThreadReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const alreadyReacted = hasUserReacted(messageId, currentUser.id, emoji);

      if (alreadyReacted) {
        removeReaction(messageId, currentUser.id, emoji);
      } else {
        addReaction(messageId, currentUser.id, emoji);
      }
    },
    [currentUser, addReaction, removeReaction, hasUserReacted],
  );

  /**
   * Gets sorted messages for the thread
   * @returns Sorted thread messages
   */
  const getThreadMessages = useCallback(() => {
    if (!rootMessageId) return [];
    return getSortedThreadMessages(rootMessageId);
  }, [rootMessageId]);

  // Use memoized values for better performance
  const threadMessages = useMemo(
    () => getThreadMessages(),
    [getThreadMessages],
  );

  /**
   * Gets reaction counts for a thread message
   * @param messageId - Message ID
   * @returns Reaction counts by emoji
   */
  const getThreadReactionCounts = useCallback(
    (messageId: string): ReactionCount[] => {
      return getReactionCounts(messageId);
    },
    [getReactionCounts],
  );

  return {
    // State
    threadMessages,
    isLoading: threadMessagesQuery.isLoading || threadMessagesQuery.isFetching,
    isReplying: replyToMessageMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isUploading: uploadFilesMutation.isPending,
    error: threadMessagesQuery.error,

    // Actions
    refreshThreadMessages,
    replyToThread,
    editThreadMessage,
    deleteThreadMessage,
    uploadThreadFiles,
    toggleThreadReaction,
    setReplyToMessage,
    getThreadReactionCounts,
    hasUserReacted: (messageId: string, emoji: string) =>
      currentUser ? hasUserReacted(messageId, currentUser.id, emoji) : false,
  };
}

/**
 * Specialized hook for pinned messages
 * @param channelId - Channel ID
 * @returns Pinned messages state and actions
 */
export function usePinnedMessages(channelId: string | undefined) {
  const pinnedMessagesQuery = usePinnedMessagesQuery(channelId);
  const pinMessageMutation = usePinMessageMutation();
  const unpinMessageMutation = useUnpinMessageMutation();

  /**
   * Pins a message
   * @param messageId - Message ID
   * @returns Promise resolving when action completes
   */
  const pinMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        throw new Error("Channel ID is required to pin a message");
      }

      return pinMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, pinMessageMutation],
  );

  /**
   * Unpins a message
   * @param messageId - Message ID
   * @returns Promise resolving when action completes
   */
  const unpinMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        throw new Error("Channel ID is required to unpin a message");
      }

      return unpinMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, unpinMessageMutation],
  );

  return {
    // State
    pinnedMessages: pinnedMessagesQuery.data || [],
    isLoading: pinnedMessagesQuery.isLoading,
    isPinning: pinMessageMutation.isPending || unpinMessageMutation.isPending,

    // Actions
    pinMessage,
    unpinMessage,
    refreshPinnedMessages: pinnedMessagesQuery.refetch,
  };
}

/**
 * Specialized hook for message composition
 * @param channelId - Channel ID
 * @param initialText - Initial text (optional)
 * @returns Message composer state and actions
 */
export function useMessageComposer(
  channelId: string,
  initialText: string = "",
) {
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);

  const { sendMessage } = useMessages(channelId);
  const { uploadFiles } = useMessages(channelId);

  /**
   * Updates the message text
   * @param newText - New text
   */
  const updateText = useCallback((newText: string) => {
    setText(newText);
  }, []);

  /**
   * Adds files to attach
   * @param newFiles - Files to add
   */
  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  /**
   * Removes a file
   * @param fileIndex - Index of file to remove
   */
  const removeFile = useCallback((fileIndex: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== fileIndex));
  }, []);

  /**
   * Submits the message with attachments
   * @returns Promise resolving to the sent message
   */
  const submitMessage = useCallback(async () => {
    if (!text.trim() && files.length === 0) return null;

    try {
      // Upload files first if any
      let fileIds: string[] = [];
      if (files.length > 0) {
        fileIds = await uploadFiles(files);
      }

      // Send message with any attached files
      const result = await sendMessage(text, fileIds);

      // Reset form
      setText("");
      setFiles([]);

      return result;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }, [text, files, sendMessage, uploadFiles]);

  // Typing notification optimized with debounce
  const debouncedTypingNotification = useMemo(
    () =>
      debounce(() => {
        // This function should notify the server that the user is typing
        // Implemented in the WebSocket service
      }, 1000),
    [],
  );

  // Trigger typing notification when text changes
  useEffect(() => {
    if (text.length > 0) {
      debouncedTypingNotification();
    }
  }, [text, debouncedTypingNotification]);

  return {
    // State
    text,
    files,

    // Actions
    updateText,
    addFiles,
    removeFile,
    submitMessage,

    // Utilities
    reset: () => {
      setText("");
      setFiles([]);
    },
    isEmpty: text.trim() === "" && files.length === 0,
  };
}

/**
 * Specialized hook for message reactions management
 */
export function useMessageReactions() {
  const { currentUser } = useAuthStore();
  const {
    addReaction,
    removeReaction,
    hasUserReacted,
    getReactionCounts,
    getReactionsByEmoji,
  } = useMessageStore();

  /**
   * Adds a reaction to a message
   * @param messageId - Message ID
   * @param emoji - Emoji name
   */
  const addMessageReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser) {
        console.warn("Cannot add reaction: user not logged in");
        return;
      }

      addReaction(messageId, currentUser.id, emoji);
    },
    [currentUser, addReaction],
  );

  /**
   * Removes a reaction from a message
   * @param messageId - Message ID
   * @param emoji - Emoji name
   */
  const removeMessageReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser) {
        console.warn("Cannot remove reaction: user not logged in");
        return;
      }

      removeReaction(messageId, currentUser.id, emoji);
    },
    [currentUser, removeReaction],
  );

  /**
   * Toggles a reaction based on current state
   * @param messageId - Message ID
   * @param emoji - Emoji name
   */
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser) {
        console.warn("Cannot toggle reaction: user not logged in");
        return;
      }

      const hasReacted = hasUserReacted(messageId, currentUser.id, emoji);

      if (hasReacted) {
        removeMessageReaction(messageId, emoji);
      } else {
        addMessageReaction(messageId, emoji);
      }
    },
    [currentUser, hasUserReacted, addMessageReaction, removeMessageReaction],
  );

  /**
   * Checks if current user has reacted with an emoji
   * @param messageId - Message ID
   * @param emoji - Emoji name
   * @returns True if user has reacted
   */
  const userHasReacted = useCallback(
    (messageId: string, emoji: string): boolean => {
      if (!currentUser) return false;
      return hasUserReacted(messageId, currentUser.id, emoji);
    },
    [currentUser, hasUserReacted],
  );

  return {
    // State - no local state in this hook

    // Actions
    addReaction: addMessageReaction,
    removeReaction: removeMessageReaction,
    toggleReaction,

    // Selectors
    getReactionCounts,
    getReactionsByEmoji,
    hasUserReacted: userHasReacted,
  };
}
