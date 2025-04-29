// src/hooks/useMessages.tsx
/**
 * Message hooks
 * Provides access to message functionality
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useMessagesQuery,
  useThreadMessagesQuery,
  usePinnedMessagesQuery,
  useSendMessageMutation,
  useReplyToMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useAddReactionMutation,
  useRemoveReactionMutation,
  useUploadFilesMutation,
  useFileInfoQuery,
} from "../core/api/queries/messageQueries";
import { useMessageStore } from "../core/store/messageStore";
import { useUserStore } from "../core/store/userStore";
import { messageService } from "../core/services/messageService";
import {
  Message,
  MessageAttachment,
  MessageReaction,
  SendMessageParams,
  MessagePaginationOptions,
} from "../types";
import { useAuthStore } from "../core/store/authStore";
import { handleError } from "../core/store/errorStore";
import { ErrorSource } from "../types";

/**
 * Hook for messages in a channel
 * @param channelId Channel ID
 * @param options Pagination options
 * @returns Message operations and data
 */
export function useMessages(
  channelId: string | undefined,
  options: MessagePaginationOptions = {},
) {
  const { currentUser } = useAuthStore();

  // Get messages using React Query
  const messagesQuery = useMessagesQuery(channelId, options);

  // Get message state from store
  const {
    getChannelMessages,
    getMessageById,
    hasUserReacted,
    setReplyToMessage,
    setEditingMessage,
    editingMessageId,
    replyToMessage,
    isChannelLoading,
  } = useMessageStore();

  // Get user store
  const { getUserById } = useUserStore();

  // Get message mutations
  const sendMutation = useSendMessageMutation();
  const deleteMutation = useDeleteMessageMutation();
  const pinMutation = usePinMessageMutation();
  const unpinMutation = useUnpinMessageMutation();
  const addReactionMutation = useAddReactionMutation();
  const removeReactionMutation = useRemoveReactionMutation();
  const uploadMutation = useUploadFilesMutation();

  // Messages from store or query
  const messages = useMemo(() => {
    if (!channelId) return [];

    const storeMessages = getChannelMessages(channelId);

    // If we have paginated options, use query results
    if (
      (options.page && options.page > 0) ||
      options.perPage ||
      options.since ||
      options.before ||
      options.after
    ) {
      return messagesQuery.data || [];
    }

    return storeMessages.length > 0 ? storeMessages : messagesQuery.data || [];
  }, [channelId, getChannelMessages, messagesQuery.data, options]);

  // Sort messages by date, oldest first
  const sortedMessages = useMemo(() => {
    return messageService.sortMessages(messages);
  }, [messages]);

  // Group messages by date for display
  const messagesByDate = useMemo(() => {
    return messageService.groupMessagesByDate(sortedMessages);
  }, [sortedMessages]);

  /**
   * Sends a message to the channel
   * @param text Message text
   * @param fileIds Optional file IDs to attach
   */
  const sendMessage = useCallback(
    async (text: string, fileIds: string[] = []): Promise<Message | null> => {
      if (!channelId) return null;

      try {
        // Validate message
        if (!messageService.validateMessage(text) && fileIds.length === 0) {
          throw new Error("Invalid message content");
        }

        const params: SendMessageParams = {
          channelId,
          message: text,
          fileIds,
        };

        return await sendMutation.mutateAsync(params);
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return null;
      }
    },
    [channelId, sendMutation],
  );

  /**
   * Uploads files to the channel
   * @param files Files to upload
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!channelId) return [];

      try {
        const result = await uploadMutation.mutateAsync({ channelId, files });

        if (result && result.file_infos) {
          return result.file_infos.map((file) => file.id);
        }

        return [];
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return [];
      }
    },
    [channelId, uploadMutation],
  );

  /**
   * Deletes a message
   * @param messageId Message ID
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!channelId) return false;

      try {
        await deleteMutation.mutateAsync({ messageId, channelId });
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [channelId, deleteMutation],
  );

  /**
   * Toggles pin status for a message
   * @param messageId Message ID
   * @param isPinned Whether the message is currently pinned
   */
  const togglePin = useCallback(
    async (messageId: string, isPinned: boolean): Promise<boolean> => {
      if (!channelId) return false;

      try {
        if (isPinned) {
          await unpinMutation.mutateAsync({ messageId, channelId });
        } else {
          await pinMutation.mutateAsync({ messageId, channelId });
        }
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [channelId, pinMutation, unpinMutation],
  );

  /**
   * Toggles reaction on a message
   * @param messageId Message ID
   * @param emoji Emoji name
   */
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!channelId || !currentUser) return false;

      try {
        const hasReacted = hasUserReacted(messageId, currentUser.id, emoji);

        if (hasReacted) {
          await removeReactionMutation.mutateAsync({
            messageId,
            emoji,
            channelId,
          });
        } else {
          await addReactionMutation.mutateAsync({
            messageId,
            emoji,
            channelId,
          });
        }
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [
      channelId,
      currentUser,
      hasUserReacted,
      addReactionMutation,
      removeReactionMutation,
    ],
  );

  /**
   * Sets message to reply to
   * @param message Message to reply to
   */
  const replyTo = useCallback(
    (message: Message | null) => {
      setReplyToMessage(message);
    },
    [setReplyToMessage],
  );

  /**
   * Sets message to edit
   * @param messageId Message ID to edit
   */
  const startEditing = useCallback(
    (messageId: string | null) => {
      setEditingMessage(messageId);
    },
    [setEditingMessage],
  );

  /**
   * Formats message text with mentions and emojis
   * @param text Message text
   */
  const formatMessageText = useCallback((text: string): string => {
    // Get users for mention processing
    const usersMap: Record<string, any> = {};

    // We could create a usersMap from the store, but in this case
    // we delegate to the messageService for formatting
    return messageService.formatMessageText(text, usersMap);
  }, []);

  /**
   * Refreshes messages
   */
  const refreshMessages = useCallback(() => {
    return messagesQuery.refetch();
  }, [messagesQuery]);

  return {
    // Data
    messages: sortedMessages,
    messagesByDate,
    replyToMessage,
    editingMessageId,

    // State
    isLoading: messagesQuery.isLoading || isChannelLoading(channelId || ""),
    isFetching: messagesQuery.isFetching,
    error: messagesQuery.error,
    isSending: sendMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploading: uploadMutation.isPending,

    // Actions
    sendMessage,
    deleteMessage,
    togglePin,
    toggleReaction,
    uploadFiles,
    replyTo,
    startEditing,
    refreshMessages,

    // Helpers
    formatMessageText,
    hasUserReacted: (messageId: string, emoji: string) => {
      return currentUser
        ? hasUserReacted(messageId, currentUser.id, emoji)
        : false;
    },
    getMessageById,
  };
}

/**
 * Hook for a message thread
 * @param rootMessageId Root message ID
 * @returns Thread messages and operations
 */
export function useThread(rootMessageId: string | undefined) {
  const { currentUser } = useAuthStore();

  // Get thread messages using React Query
  const threadQuery = useThreadMessagesQuery(rootMessageId);

  // Get message state from store
  const { getThreadMessages, getMessageById, hasUserReacted, isThreadLoading } =
    useMessageStore();

  // Get thread mutations
  const replyMutation = useReplyToMessageMutation();
  const addReactionMutation = useAddReactionMutation();
  const removeReactionMutation = useRemoveReactionMutation();
  const uploadMutation = useUploadFilesMutation();

  // Root message from store
  const rootMessage = useMemo(() => {
    if (!rootMessageId) return null;
    return getMessageById(rootMessageId);
  }, [rootMessageId, getMessageById]);

  // Channel ID from root message
  const channelId = useMemo(() => {
    return rootMessage?.channel_id;
  }, [rootMessage]);

  // Thread messages from store or query
  const threadMessages = useMemo(() => {
    if (!rootMessageId) return [];

    const storeMessages = getThreadMessages(rootMessageId);
    return storeMessages.length > 0 ? storeMessages : threadQuery.data || [];
  }, [rootMessageId, getThreadMessages, threadQuery.data]);

  // Sort thread messages by date, oldest first
  const sortedThreadMessages = useMemo(() => {
    return messageService.sortMessages(threadMessages);
  }, [threadMessages]);

  /**
   * Sends a reply to the thread
   * @param text Reply text
   * @param fileIds Optional file IDs to attach
   */
  const sendReply = useCallback(
    async (text: string, fileIds: string[] = []): Promise<Message | null> => {
      if (!rootMessageId || !channelId) return null;

      try {
        // Validate message
        if (!messageService.validateMessage(text) && fileIds.length === 0) {
          throw new Error("Invalid message content");
        }

        return await replyMutation.mutateAsync({
          channelId,
          rootMessageId,
          message: text,
          fileIds,
        });
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return null;
      }
    },
    [rootMessageId, channelId, replyMutation],
  );

  /**
   * Uploads files to attach to a reply
   * @param files Files to upload
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!channelId) return [];

      try {
        const result = await uploadMutation.mutateAsync({ channelId, files });

        if (result && result.file_infos) {
          return result.file_infos.map((file) => file.id);
        }

        return [];
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return [];
      }
    },
    [channelId, uploadMutation],
  );

  /**
   * Toggles reaction on a message
   * @param messageId Message ID
   * @param emoji Emoji name
   */
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!channelId || !currentUser) return false;

      try {
        const hasReacted = hasUserReacted(messageId, currentUser.id, emoji);

        if (hasReacted) {
          await removeReactionMutation.mutateAsync({
            messageId,
            emoji,
            channelId,
          });
        } else {
          await addReactionMutation.mutateAsync({
            messageId,
            emoji,
            channelId,
          });
        }
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [
      channelId,
      currentUser,
      hasUserReacted,
      addReactionMutation,
      removeReactionMutation,
    ],
  );

  /**
   * Refreshes thread messages
   */
  const refreshThread = useCallback(() => {
    return threadQuery.refetch();
  }, [threadQuery]);

  return {
    // Data
    rootMessage,
    threadMessages: sortedThreadMessages,
    replyCount: rootMessage?.reply_count || 0,

    // State
    isLoading: threadQuery.isLoading || isThreadLoading(rootMessageId || ""),
    isFetching: threadQuery.isFetching,
    error: threadQuery.error,
    isReplying: replyMutation.isPending,
    isUploading: uploadMutation.isPending,

    // Actions
    sendReply,
    uploadFiles,
    toggleReaction,
    refreshThread,

    // Helpers
    hasUserReacted: (messageId: string, emoji: string) => {
      return currentUser
        ? hasUserReacted(messageId, currentUser.id, emoji)
        : false;
    },
  };
}

/**
 * Hook for message reactions
 * @param messageId Message ID
 * @returns Reaction data and operations
 */
export function useMessageReactions(messageId: string | undefined) {
  const { currentUser } = useAuthStore();

  // Get message store and reactions
  const {
    getMessageById,
    getReactionsByEmoji,
    getReactionCounts,
    hasUserReacted,
  } = useMessageStore();

  // Get message mutations
  const addReactionMutation = useAddReactionMutation();
  const removeReactionMutation = useRemoveReactionMutation();

  // Message from store
  const message = useMemo(() => {
    if (!messageId) return null;
    return getMessageById(messageId);
  }, [messageId, getMessageById]);

  // Channel ID from message
  const channelId = useMemo(() => {
    return message?.channel_id;
  }, [message]);

  // Reactions grouped by emoji
  const reactionsByEmoji = useMemo(() => {
    if (!messageId) return {};
    return getReactionsByEmoji(messageId);
  }, [messageId, getReactionsByEmoji]);

  // Reaction counts
  const reactionCounts = useMemo(() => {
    if (!messageId) return [];
    return getReactionCounts(messageId);
  }, [messageId, getReactionCounts]);

  /**
   * Add a reaction to the message
   * @param emoji Emoji name
   */
  const addReaction = useCallback(
    async (emoji: string): Promise<boolean> => {
      if (!messageId || !channelId || !currentUser) return false;

      try {
        await addReactionMutation.mutateAsync({ messageId, emoji, channelId });
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [messageId, channelId, currentUser, addReactionMutation],
  );

  /**
   * Remove a reaction from the message
   * @param emoji Emoji name
   */
  const removeReaction = useCallback(
    async (emoji: string): Promise<boolean> => {
      if (!messageId || !channelId || !currentUser) return false;

      try {
        await removeReactionMutation.mutateAsync({
          messageId,
          emoji,
          channelId,
        });
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [messageId, channelId, currentUser, removeReactionMutation],
  );

  /**
   * Toggle a reaction on the message
   * @param emoji Emoji name
   */
  const toggleReaction = useCallback(
    async (emoji: string): Promise<boolean> => {
      if (!messageId || !channelId || !currentUser) return false;

      try {
        const hasReacted = hasUserReacted(messageId, currentUser.id, emoji);

        if (hasReacted) {
          await removeReactionMutation.mutateAsync({
            messageId,
            emoji,
            channelId,
          });
        } else {
          await addReactionMutation.mutateAsync({
            messageId,
            emoji,
            channelId,
          });
        }
        return true;
      } catch (error) {
        handleError(error as Error, ErrorSource.API);
        return false;
      }
    },
    [
      messageId,
      channelId,
      currentUser,
      hasUserReacted,
      addReactionMutation,
      removeReactionMutation,
    ],
  );

  return {
    // Data
    reactionsByEmoji,
    reactionCounts,

    // State
    isLoading:
      addReactionMutation.isPending || removeReactionMutation.isPending,

    // Actions
    addReaction,
    removeReaction,
    toggleReaction,

    // Helpers
    hasReacted: (emoji: string) => {
      return currentUser
        ? hasUserReacted(messageId || "", currentUser.id, emoji)
        : false;
    },
  };
}

/**
 * Hook for file information
 * @param fileId File ID
 * @returns File information
 */
export function useFileInfo(fileId: string | undefined) {
  // Get file info query
  const fileInfoQuery = useFileInfoQuery(fileId);

  /**
   * Gets the download URL for a file
   */
  const getDownloadUrl = useCallback((): string => {
    if (!fileId) return "";
    return messageService.getFileDownloadUrl(fileId);
  }, [fileId]);

  /**
   * Gets the preview URL for a file
   */
  const getPreviewUrl = useCallback((): string => {
    if (!fileId) return "";
    return messageService.getFilePreviewUrl(fileId);
  }, [fileId]);

  /**
   * Checks if file is an image
   */
  const isImage = useCallback((): boolean => {
    if (!fileInfoQuery.data?.mime_type) return false;
    return messageService.isImageFile(fileInfoQuery.data.mime_type);
  }, [fileInfoQuery.data]);

  /**
   * Checks if file is a video
   */
  const isVideo = useCallback((): boolean => {
    if (!fileInfoQuery.data?.mime_type) return false;
    return messageService.isVideoFile(fileInfoQuery.data.mime_type);
  }, [fileInfoQuery.data]);

  /**
   * Checks if file is an audio
   */
  const isAudio = useCallback((): boolean => {
    if (!fileInfoQuery.data?.mime_type) return false;
    return messageService.isAudioFile(fileInfoQuery.data.mime_type);
  }, [fileInfoQuery.data]);

  /**
   * Checks if file is a PDF
   */
  const isPdf = useCallback((): boolean => {
    if (!fileInfoQuery.data?.mime_type) return false;
    return messageService.isPdfFile(fileInfoQuery.data.mime_type);
  }, [fileInfoQuery.data]);

  return {
    // Data
    fileInfo: fileInfoQuery.data,

    // State
    isLoading: fileInfoQuery.isLoading,
    error: fileInfoQuery.error,

    // Actions
    refreshFileInfo: fileInfoQuery.refetch,

    // Helpers
    getDownloadUrl,
    getPreviewUrl,
    isImage,
    isVideo,
    isAudio,
    isPdf,
  };
}
