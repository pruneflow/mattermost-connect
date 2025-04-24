// src/hooks/useMessages.tsx
/**
 * Hook for message functionality
 */
import { useCallback } from "react";
import {
  useMessageStore,
  Message,
  getSortedChannelMessages,
  getSortedThreadMessages,
} from "../core/store/messageStore";
import {
  useMessagesQuery,
  useThreadMessagesQuery,
  useSendMessageMutation,
  useReplyToMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  usePinnedMessagesQuery,
  useUploadFilesMutation,
  useFileInfoQuery,
  MessagePaginationOptions,
} from "../core/api/queries/messageQueries";
import { useAuthStore } from "../core/store/authStore";

/**
 * Hook that provides messages functionality for a channel
 * @param channelId Channel ID
 * @param options Pagination options
 * @returns Messages state and actions
 */
export function useMessages(
  channelId: string | undefined,
  options: MessagePaginationOptions = {},
) {
  // Get state from store
  const {
    highlightedMessageId,
    replyToMessage,
    editingMessageId,
    setHighlightedMessage,
    setReplyToMessage,
    setEditingMessage,
  } = useMessageStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Get messages query
  const messagesQuery = useMessagesQuery(channelId, options);
  const pinnedMessagesQuery = usePinnedMessagesQuery(channelId);

  // Get mutations
  const sendMessageMutation = useSendMessageMutation();
  const editMessageMutation = useEditMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const pinMessageMutation = usePinMessageMutation();
  const unpinMessageMutation = useUnpinMessageMutation();
  const uploadFilesMutation = useUploadFilesMutation();

  /**
   * Refreshes the messages list
   * @returns Promise resolving to the refreshed messages
   */
  const refreshMessages = useCallback(async () => {
    return messagesQuery.refetch().then((result) => result.data || []);
  }, [messagesQuery]);

  /**
   * Sends a new message
   * @param content Message content
   * @param fileIds Optional file IDs to attach
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
   * @param messageId Message ID
   * @param content New message content
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
   * @param messageId Message ID
   * @returns Promise resolving to the deleted message ID
   */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!channelId) {
        throw new Error(
          "Channel ID is required to delete a message from context",
        );
      }

      return deleteMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, deleteMessageMutation],
  );

  /**
   * Pins a message
   * @param messageId Message ID
   * @returns Promise resolving to the pinned message ID
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
   * @param messageId Message ID
   * @returns Promise resolving to the unpinned message ID
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
   * Uploads files to be attached to a message
   * @param files Files to upload
   * @returns Promise resolving to the uploaded file IDs
   */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!channelId) {
        throw new Error("Channel ID is required to upload files");
      }

      const result = await uploadFilesMutation.mutateAsync({
        channelId,
        files,
      });

      return result.file_infos.map((info: any) => info.id);
    },
    [channelId, uploadFilesMutation],
  );

  /**
   * Gets sorted messages for the channel
   * @returns Sorted messages
   */
  const getSortedMessages = useCallback(() => {
    if (!channelId) return [];
    return getSortedChannelMessages(channelId);
  }, [channelId]);

  return {
    // State
    messages: getSortedMessages(),
    pinnedMessages: pinnedMessagesQuery.data || [],
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
    setHighlightedMessage,
    setReplyToMessage,
    setEditingMessage,
  };
}

/**
 * Hook that provides thread functionality for a root message
 * @param rootMessageId Root message ID
 * @param channelId Channel ID
 * @returns Thread state and actions
 */
export function useThread(
  rootMessageId: string | undefined,
  channelId: string,
) {
  // Get state from store
  const { setReplyToMessage } = useMessageStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Get thread messages query
  const threadMessagesQuery = useThreadMessagesQuery(rootMessageId);

  // Get mutations
  const replyToMessageMutation = useReplyToMessageMutation();
  const editMessageMutation = useEditMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const uploadFilesMutation = useUploadFilesMutation();

  /**
   * Refreshes the thread messages
   * @returns Promise resolving to the refreshed thread messages
   */
  const refreshThreadMessages = useCallback(async () => {
    return threadMessagesQuery.refetch().then((result) => result.data || []);
  }, [threadMessagesQuery]);

  /**
   * Replies to the thread
   * @param content Reply content
   * @param fileIds Optional file IDs to attach
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
   * @param messageId Message ID
   * @param content New message content
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
   * @param messageId Message ID
   * @returns Promise resolving to the deleted message ID
   */
  const deleteThreadMessage = useCallback(
    async (messageId: string) => {
      return deleteMessageMutation.mutateAsync({ messageId, channelId });
    },
    [channelId, deleteMessageMutation],
  );

  /**
   * Uploads files to be attached to a thread reply
   * @param files Files to upload
   * @returns Promise resolving to the uploaded file IDs
   */
  const uploadThreadFiles = useCallback(
    async (files: File[]) => {
      const result = await uploadFilesMutation.mutateAsync({
        channelId,
        files,
      });

      return result.file_infos.map((info: any) => info.id);
    },
    [channelId, uploadFilesMutation],
  );

  /**
   * Gets sorted messages for the thread
   * @returns Sorted thread messages
   */
  const getThreadMessages = useCallback(() => {
    if (!rootMessageId) return [];
    return getSortedThreadMessages(rootMessageId);
  }, [rootMessageId]);

  return {
    // State
    threadMessages: getThreadMessages(),
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
    setReplyToMessage,
  };
}

/**
 * Hook that provides functionality for message reactions
 * @returns Reaction actions and state
 */
export function useMessageReactions() {
  // Get mutations
  const addReactionMutation = useAddReactionMutation();
  const removeReactionMutation = useRemoveReactionMutation();

  // Get current user
  const { currentUser } = useAuthStore();

  /**
   * Adds a reaction to a message
   * @param messageId Message ID
   * @param emoji Emoji name
   * @returns Promise resolving to the added reaction
   */
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      return addReactionMutation.mutateAsync({ messageId, emoji });
    },
    [addReactionMutation],
  );

  /**
   * Removes a reaction from a message
   * @param messageId Message ID
   * @param emoji Emoji name
   * @param channelId Channel ID
   * @returns Promise resolving to the removed reaction
   */
  const removeReaction = useCallback(
    async (messageId: string, emoji: string, channelId: string) => {
      return removeReactionMutation.mutateAsync({
        messageId,
        emoji,
        channelId,
      });
    },
    [removeReactionMutation],
  );

  /**
   * Toggles a reaction on a message
   * @param messageId Message ID
   * @param emoji Emoji name
   * @param hasReacted Whether the current user has already reacted
   * @param channelId Channel ID
   * @returns Promise resolving to the toggled reaction
   */
  const toggleReaction = useCallback(
    async (
      messageId: string,
      emoji: string,
      hasReacted: boolean,
      channelId: string,
    ) => {
      if (hasReacted) {
        return removeReaction(messageId, emoji, channelId);
      } else {
        return addReaction(messageId, emoji);
      }
    },
    [addReaction, removeReaction],
  );

  /**
   * Checks if the current user has reacted with an emoji to a message
   * @param message Message object
   * @param emoji Emoji name
   * @returns Whether the current user has reacted
   */
  const hasUserReacted = useCallback(
    (message: Message, emoji: string): boolean => {
      if (!currentUser || !message.metadata?.reactions) return false;

      return message.metadata.reactions.some(
        (reaction) =>
          reaction.emoji_name === emoji && reaction.user_id === currentUser.id,
      );
    },
    [currentUser],
  );

  return {
    // State
    isReacting:
      addReactionMutation.isPending || removeReactionMutation.isPending,
    addError: addReactionMutation.error,
    removeError: removeReactionMutation.error,

    // Actions
    addReaction,
    removeReaction,
    toggleReaction,
    hasUserReacted,
  };
}

/**
 * Hook that provides file information functionality
 * @param fileId File ID
 * @returns File info state and actions
 */
export function useFileInfo(fileId: string | undefined) {
  // Get file info query
  const fileInfoQuery = useFileInfoQuery(fileId);

  /**
   * Refreshes the file information
   * @returns Promise resolving to the refreshed file information
   */
  const refreshFileInfo = useCallback(async () => {
    return fileInfoQuery.refetch().then((result) => result.data || null);
  }, [fileInfoQuery]);

  return {
    // State
    fileInfo: fileInfoQuery.data,
    isLoading: fileInfoQuery.isLoading || fileInfoQuery.isFetching,
    error: fileInfoQuery.error,

    // Actions
    refreshFileInfo,
  };
}
