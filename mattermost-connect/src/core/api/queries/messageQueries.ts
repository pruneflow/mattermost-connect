// src/core/api/queries/messageQueries.ts
/**
 * React Query hooks for message operations
 * Standardized queries for message-related operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { createQueryOptions, createMutationOptions } from "../queryUtils";
import { buildUrlWithParams } from "../apiUtils";
import { emitEvent } from "../eventUtils";
import { EventType, ErrorSource } from "../../../types";
import { handleError, useMessageStore } from "../../store";
import { messageService } from "../../services/messageService";

import {
  Message,
  MessagePaginationOptions,
  SendMessageParams,
} from "../../../types";
import { useAuthStore } from "../../store";

/**
 * Parameters for message API requests with pagination
 */
interface MessagesQueryParams {
  page: number;
  per_page: number;
  since?: number;
  before?: string;
  after?: string;
  [key: string]: any;
}

/**
 * Response format for message endpoints that return multiple posts
 */
interface PostsResponse {
  posts: Record<string, Message>;
  order: string[];
}

/**
 * Response format for file upload
 */
interface UploadFilesResponse {
  file_infos: Array<{
    id: string;
    [key: string]: any;
  }>;
}

/**
 * Result type for message context queries
 */
interface MessageContext {
  before: Message[];
  target: Message | null;
  after: Message[];
}

/**
 * Custom query keys specific to message operations
 */
const MESSAGE_KEYS = {
  pinned: (channelId: string) => ["messages", "pinned", channelId] as const,
  search: (channelId: string, term: string) =>
    ["messages", "search", channelId, term] as const,
  context: (channelId: string, messageId: string) =>
    ["messages", "context", channelId, messageId] as const,
  fileInfo: (fileId: string) => ["fileInfo", fileId] as const,
};

/**
 * Hook for fetching messages in a channel
 */
export function useMessagesQuery(
  channelId: string | undefined,
  options: MessagePaginationOptions = {},
) {
  const { setMessages, setLoading, setError } = useMessageStore();

  return useQuery<Message[], Error>({
    queryKey: channelId
      ? ([...QUERY_KEYS.messages.byChannel(channelId), options] as const)
      : ["messages-placeholder"],

    queryFn: async () => {
      if (!channelId) return [];

      setLoading(channelId, true);

      try {
        const { page = 0, perPage = 60, since = 0, before, after } = options;
        const params: MessagesQueryParams = { page, per_page: perPage };

        if (since) params.since = since;
        if (before) params.before = before;
        if (after) params.after = after;

        const url = buildUrlWithParams(`channels/${channelId}/posts`, params);
        const response = await apiClient.get<PostsResponse>(url);

        const { posts, order } = response.data;
        const messages = order
          .map((postId) => posts[postId])
          .filter((msg): msg is Message => !!msg);

        // Only update store for base queries
        if (!before && !after && !since && page === 0) {
          setMessages(channelId, messages);
        }

        return messages;
      } catch (error) {
        setError(channelId, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          method: "fetchMessages",
          options,
        });
        throw error;
      } finally {
        setLoading(channelId, false);
      }
    },

    enabled: !!channelId,
    ...createQueryOptions("message", {
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds
    }),
  });
}

/**
 * Hook for fetching thread messages
 */
export function useThreadMessagesQuery(rootMessageId: string | undefined) {
  const { setThreadMessages, setThreadLoading, setError } = useMessageStore();

  return useQuery<Message[], Error>({
    queryKey: rootMessageId
      ? QUERY_KEYS.messages.thread(rootMessageId)
      : ["thread-messages-placeholder"],

    queryFn: async () => {
      if (!rootMessageId) return [];

      setThreadLoading(rootMessageId, true);

      try {
        const response = await apiClient.get<PostsResponse>(
          `posts/${rootMessageId}/thread`,
        );

        const { posts, order } = response.data;
        const messages = order
          .map((postId) => posts[postId])
          .filter((msg): msg is Message => !!msg && msg.id !== rootMessageId);

        setThreadMessages(rootMessageId, messages);
        return messages;
      } catch (error) {
        setError(rootMessageId, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          rootMessageId,
          method: "fetchThreadMessages",
        });
        throw error;
      } finally {
        setThreadLoading(rootMessageId, false);
      }
    },

    enabled: !!rootMessageId,
    ...createQueryOptions("message", {
      staleTime: 30 * 1000, // 30 seconds
    }),
  });
}

/**
 * Hook for fetching pinned messages in a channel
 */
export function usePinnedMessagesQuery(channelId: string | undefined) {
  const { setPinnedMessages, setLoadingId, setErrorForId } = useMessageStore();

  return useQuery<Message[], Error>({
    queryKey: channelId
      ? MESSAGE_KEYS.pinned(channelId)
      : ["pinned-messages-placeholder"],

    queryFn: async () => {
      if (!channelId) return [];

      setLoadingId(`pinned_${channelId}`, true);
      try {
        const response = await apiClient.get<PostsResponse>(
          `channels/${channelId}/pinned`,
        );

        const { posts, order } = response.data;
        const pinnedMessages = order
          .map((postId) => posts[postId])
          .filter((msg): msg is Message => !!msg);

        setPinnedMessages(channelId, pinnedMessages);
        return pinnedMessages;
      } catch (error) {
        setErrorForId(`pinned_${channelId}`, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          method: "fetchPinnedMessages",
        });
        throw error;
      } finally {
        setLoadingId(`pinned_${channelId}`, false);
      }
    },

    enabled: !!channelId,
    ...createQueryOptions("message", {
      staleTime: 60 * 1000, // 1 minute
    }),
  });
}

/**
 * Hook for fetching file information
 */
export function useFileInfoQuery(fileId: string | undefined) {
  const { setLoadingId, setErrorForId } = useMessageStore();

  return useQuery<any, Error>({
    queryKey: fileId
      ? MESSAGE_KEYS.fileInfo(fileId)
      : ["file-info-placeholder"],

    queryFn: async () => {
      if (!fileId) throw new Error("File ID is required");

      setLoadingId(`file_${fileId}`, true);
      try {
        const response = await apiClient.get(`files/${fileId}/info`);
        return response.data;
      } catch (error) {
        setErrorForId(`file_${fileId}`, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          fileId,
          method: "fetchFileInfo",
        });
        throw error;
      } finally {
        setLoadingId(`file_${fileId}`, false);
      }
    },

    enabled: !!fileId,
    ...createQueryOptions("message", {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  });
}

/**
 * Hook for searching messages in a channel
 */
export function useSearchMessagesQuery(
  channelId: string | undefined,
  searchTerm: string | undefined,
) {
  const { setLoading, setError } = useMessageStore();

  return useQuery<Message[], Error>({
    queryKey:
      channelId && searchTerm
        ? MESSAGE_KEYS.search(channelId, searchTerm)
        : ["search-messages-placeholder"],

    queryFn: async () => {
      if (!channelId || !searchTerm || searchTerm.trim() === "") return [];

      setLoading(channelId, true);
      try {
        const params = {
          terms: searchTerm,
          is_or_search: true,
          include_deleted_channels: false,
          page: 0,
          per_page: 20,
        };

        const response = await apiClient.post<PostsResponse>(
          `teams/posts/search`,
          params,
        );

        const { posts, order } = response.data;
        return order
          .map((postId) => posts[postId])
          .filter(
            (post): post is Message => !!post && post.channel_id === channelId,
          );
      } catch (error) {
        setError(channelId, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          searchTerm,
          method: "searchMessages",
        });
        throw error;
      } finally {
        setLoading(channelId, false);
      }
    },

    enabled: !!(channelId && searchTerm && searchTerm.trim() !== ""),
    ...createQueryOptions("message", {
      staleTime: 30 * 1000, // 30 seconds
      retry: false,
    }),
  });
}

/**
 * Hook for fetching message context (messages before and after a specific message)
 */
export function useMessageContextQuery(
  channelId: string | undefined,
  messageId: string | undefined,
  count: number = 10,
) {
  const { setLoading, setError } = useMessageStore();

  return useQuery<MessageContext, Error>({
    queryKey:
      channelId && messageId
        ? MESSAGE_KEYS.context(channelId, messageId)
        : ["message-context-placeholder"],

    queryFn: async () => {
      if (!channelId || !messageId) {
        return { before: [], target: null, after: [] };
      }

      setLoading(channelId, true);
      try {
        // Fetch messages before target
        const beforeParams: MessagesQueryParams = {
          page: 0,
          per_page: count,
          before: messageId,
        };

        const beforeUrl = buildUrlWithParams(
          `channels/${channelId}/posts`,
          beforeParams,
        );
        const beforeResponse = await apiClient.get<PostsResponse>(beforeUrl);

        // Fetch target message
        const targetResponse = await apiClient.get<Message>(
          `posts/${messageId}`,
        );

        // Fetch messages after target
        const afterParams: MessagesQueryParams = {
          page: 0,
          per_page: count,
          after: messageId,
        };

        const afterUrl = buildUrlWithParams(
          `channels/${channelId}/posts`,
          afterParams,
        );
        const afterResponse = await apiClient.get<PostsResponse>(afterUrl);

        // Transform responses
        const before = beforeResponse.data.order
          .map((postId) => beforeResponse.data.posts[postId])
          .filter((msg): msg is Message => !!msg);

        const target = targetResponse.data;

        const after = afterResponse.data.order
          .map((postId) => afterResponse.data.posts[postId])
          .filter((msg): msg is Message => !!msg);

        return { before, target, after };
      } catch (error) {
        setError(channelId, error as Error);
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId,
          messageId,
          method: "fetchMessageContext",
        });
        throw error;
      } finally {
        setLoading(channelId, false);
      }
    },

    enabled: !!(channelId && messageId),
    ...createQueryOptions("message", {
      staleTime: 30 * 1000, // 30 seconds
    }),
  });
}

/**
 * Hook for sending a new message
 */
export function useSendMessageMutation() {
  const { addMessage } = useMessageStore();

  return useMutation<Message, Error, SendMessageParams>({
    mutationFn: async ({ channelId, message, fileIds = [] }) => {
      if (!channelId || (!message && fileIds.length === 0)) {
        throw new Error("Channel ID and either message or files are required");
      }

      const response = await apiClient.post<Message>("posts", {
        channel_id: channelId,
        message: message || "",
        file_ids: fileIds,
      });

      return response.data;
    },

    onSuccess: (newMessage) => {
      // Invalidate channel messages
      invalidateQueries.channelMessages(newMessage.channel_id);

      // Update store
      addMessage(newMessage);

      // Notify about message sent
      messageService.notifyMessageEvent(newMessage, "sent");
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId: variables.channelId,
          method: "sendMessage",
        });
      },
    }),
  });
}

/**
 * Interface for replying to a message
 */
interface ReplyMessageParams {
  channelId: string;
  rootMessageId: string;
  message: string;
  fileIds?: string[];
}

/**
 * Hook for replying to a message in a thread
 */
export function useReplyToMessageMutation() {
  const { addMessage, setReplyToMessage } = useMessageStore();

  return useMutation<Message, Error, ReplyMessageParams>({
    mutationFn: async ({ channelId, rootMessageId, message, fileIds = [] }) => {
      if (!channelId || !rootMessageId || (!message && fileIds.length === 0)) {
        throw new Error(
          "Channel ID, root message ID, and either message or files are required",
        );
      }

      const response = await apiClient.post<Message>("posts", {
        channel_id: channelId,
        root_id: rootMessageId,
        message: message || "",
        file_ids: fileIds,
      });

      return response.data;
    },

    onSuccess: (newMessage) => {
      // Invalidate thread messages
      if (newMessage.root_id) {
        invalidateQueries.thread(newMessage.root_id);
      }

      // Invalidate channel messages
      invalidateQueries.channelMessages(newMessage.channel_id);

      // Update store
      addMessage(newMessage);
      setReplyToMessage(null);

      // Notify about message sent
      messageService.notifyMessageEvent(newMessage, "sent");
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId: variables.channelId,
          rootMessageId: variables.rootMessageId,
          method: "replyToMessage",
        });
      },
    }),
  });
}

/**
 * Interface for editing a message
 */
interface EditMessageParams {
  messageId: string;
  message: string;
}

/**
 * Hook for editing an existing message
 */
export function useEditMessageMutation() {
  const { updateMessage, setEditingMessage } = useMessageStore();

  return useMutation<Message, Error, EditMessageParams>({
    mutationFn: async ({ messageId, message }) => {
      if (!messageId || !message) {
        throw new Error("Message ID and content are required");
      }

      // Get the original message first
      const response = await apiClient.get<Message>(`posts/${messageId}`);
      const originalMessage = response.data;

      // Update the message
      const patchResponse = await apiClient.put<Message>(
        `posts/${messageId}/patch`,
        {
          message,
          file_ids: originalMessage.file_ids,
          has_reactions: originalMessage.has_reactions,
          props: originalMessage.props,
        },
      );

      return patchResponse.data;
    },

    onSuccess: (updatedMessage) => {
      // Invalidate thread if this is a reply
      if (updatedMessage.root_id) {
        invalidateQueries.thread(updatedMessage.root_id);
      }

      // Invalidate channel messages
      invalidateQueries.channelMessages(updatedMessage.channel_id);

      // Update store
      updateMessage(updatedMessage);
      setEditingMessage(null);

      // Notify about message updated
      messageService.notifyMessageEvent(updatedMessage, "updated");
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId: variables.messageId,
          method: "editMessage",
        });
      },
    }),
  });
}

/**
 * Interface for deleting a message
 */
interface DeleteMessageParams {
  messageId: string;
  channelId: string;
}

/**
 * Result type for delete operation
 */
interface DeleteMessageResult {
  messageId: string;
  channelId: string;
}

/**
 * Hook for deleting a message
 */
export function useDeleteMessageMutation() {
  const { getMessageById, deleteMessage } = useMessageStore();

  return useMutation<DeleteMessageResult, Error, DeleteMessageParams>({
    mutationFn: async ({ messageId, channelId }) => {
      if (!messageId) {
        throw new Error("Message ID is required");
      }

      await apiClient.delete(`posts/${messageId}`);
      return { messageId, channelId };
    },

    onSuccess: ({ messageId, channelId }) => {
      const message = getMessageById(messageId);

      // Invalidate thread if message is part of one
      if (message?.root_id) {
        invalidateQueries.thread(message.root_id);
      }

      // Invalidate channel messages
      invalidateQueries.channelMessages(channelId);

      // Remove from store
      deleteMessage(messageId, channelId);

      // Notify about message deleted if we still have the message info
      if (message) {
        messageService.notifyMessageEvent(message, "deleted");
      }
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId: variables.messageId,
          channelId: variables.channelId,
          method: "deleteMessage",
        });
      },
    }),
  });
}

/**
 * Interface for pinning/unpinning messages
 */
interface PinMessageParams {
  messageId: string;
  channelId: string;
}

/**
 * Result type for pin/unpin operations
 */
interface PinMessageResult {
  messageId: string;
  channelId: string;
}

/**
 * Hook for pinning a message
 */
export function usePinMessageMutation() {
  const queryClient = useQueryClient();
  const { updateMessage } = useMessageStore();

  return useMutation<PinMessageResult, Error, PinMessageParams>({
    mutationFn: async ({ messageId, channelId }) => {
      if (!messageId) {
        throw new Error("Message ID is required");
      }

      await apiClient.post(`posts/${messageId}/pin`);
      return { messageId, channelId };
    },

    onSuccess: async ({ messageId, channelId }) => {
      // Invalidate pinned messages query
      queryClient.invalidateQueries({
        queryKey: MESSAGE_KEYS.pinned(channelId),
      });

      // Invalidate channel messages query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      try {
        // Fetch updated message to get current state
        const response = await apiClient.get<Message>(`posts/${messageId}`);

        // Update message in store
        updateMessage(response.data);

        // Notify about message updated
        messageService.notifyMessageEvent(response.data, "updated");
      } catch (error) {
        console.error("Error refetching pinned message:", error);
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId,
          channelId,
          method: "refreshPinnedMessage",
        });
      }
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId: variables.messageId,
          channelId: variables.channelId,
          method: "pinMessage",
        });
      },
    }),
  });
}

/**
 * Hook for unpinning a message
 */
export function useUnpinMessageMutation() {
  const queryClient = useQueryClient();
  const { updateMessage } = useMessageStore();

  return useMutation<PinMessageResult, Error, PinMessageParams>({
    mutationFn: async ({ messageId, channelId }) => {
      if (!messageId) {
        throw new Error("Message ID is required");
      }

      await apiClient.post(`posts/${messageId}/unpin`);
      return { messageId, channelId };
    },

    onSuccess: async ({ messageId, channelId }) => {
      // Invalidate pinned messages query
      queryClient.invalidateQueries({
        queryKey: MESSAGE_KEYS.pinned(channelId),
      });

      // Invalidate channel messages query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      try {
        // Fetch updated message to get current state
        const response = await apiClient.get<Message>(`posts/${messageId}`);

        // Update message in store
        updateMessage(response.data);

        // Notify about message updated
        messageService.notifyMessageEvent(response.data, "updated");
      } catch (error) {
        console.error("Error refetching unpinned message:", error);
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId,
          channelId,
          method: "refreshUnpinnedMessage",
        });
      }
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId: variables.messageId,
          channelId: variables.channelId,
          method: "unpinMessage",
        });
      },
    }),
  });
}

/**
 * Interface for uploading files
 */
interface UploadFilesParams {
  channelId: string;
  files: File[];
}

/**
 * Hook for uploading files to attach to a message
 */
export function useUploadFilesMutation() {
  const { setLoading, setError } = useMessageStore();

  return useMutation<UploadFilesResponse, Error, UploadFilesParams>({
    mutationFn: async ({ channelId, files }) => {
      if (!channelId || files.length === 0) {
        throw new Error("Channel ID and files are required");
      }

      setLoading(channelId, true);
      try {
        const formData = new FormData();
        formData.append("channel_id", channelId);

        files.forEach((file) => {
          formData.append("files", file);
        });

        const response = await apiClient.uploadFiles(formData);
        return response.data;
      } catch (error) {
        setError(channelId, error as Error);
        throw error;
      } finally {
        setLoading(channelId, false);
      }
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          channelId: variables.channelId,
          fileCount: variables.files.length,
          method: "uploadFiles",
        });
      },
    }),
  });
}

/**
 * Interface for adding a reaction to a message
 */
interface AddReactionParams {
  messageId: string;
  emoji: string;
  channelId: string;
}

/**
 * Hook for adding a reaction to a message
 */
export function useAddReactionMutation() {
  const { addReaction, getMessageById } = useMessageStore();
  const { currentUser } = useAuthStore.getState();

  return useMutation<void, Error, AddReactionParams>({
    mutationFn: async ({ messageId, emoji }) => {
      if (!messageId || !emoji || !currentUser) {
        throw new Error(
          "Message ID, emoji, and authenticated user are required",
        );
      }

      await apiClient.post(`reactions`, {
        user_id: currentUser.id,
        post_id: messageId,
        emoji_name: emoji,
      });
    },

    onSuccess: (_, { messageId, emoji, channelId }) => {
      if (!currentUser) return;

      // Add reaction to store
      addReaction(messageId, currentUser.id, emoji);

      // Invalidate message queries
      invalidateQueries.channelMessages(channelId);

      // If message is in a thread, invalidate thread queries too
      const message = getMessageById(messageId);
      if (message?.root_id) {
        invalidateQueries.thread(message.root_id);
      }

      // Emit reaction added event
      emitEvent(EventType.REACTION_ADDED, {
        messageId,
        userId: currentUser.id,
        emoji,
        timestamp: Date.now(),
      });
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId: variables.messageId,
          emoji: variables.emoji,
          method: "addReaction",
        });
      },
    }),
  });
}

/**
 * Interface for removing a reaction from a message
 */
interface RemoveReactionParams {
  messageId: string;
  emoji: string;
  channelId: string;
}

/**
 * Hook for removing a reaction from a message
 */
export function useRemoveReactionMutation() {
  const { removeReaction, getMessageById } = useMessageStore();
  const { currentUser } = useAuthStore.getState();

  return useMutation<void, Error, RemoveReactionParams>({
    mutationFn: async ({ messageId, emoji }) => {
      if (!messageId || !emoji || !currentUser) {
        throw new Error(
          "Message ID, emoji, and authenticated user are required",
        );
      }

      await apiClient.delete(`users/me/posts/${messageId}/reactions/${emoji}`);
    },

    onSuccess: (_, { messageId, emoji, channelId }) => {
      if (!currentUser) return;

      // Remove reaction from store
      removeReaction(messageId, currentUser.id, emoji);

      // Invalidate message queries
      invalidateQueries.channelMessages(channelId);

      // If message is in a thread, invalidate thread queries too
      const message = getMessageById(messageId);
      if (message?.root_id) {
        invalidateQueries.thread(message.root_id);
      }

      // Emit reaction removed event
      emitEvent(EventType.REACTION_REMOVED, {
        messageId,
        userId: currentUser.id,
        emoji,
        timestamp: Date.now(),
      });
    },

    ...createMutationOptions({
      onError: (error, variables) => {
        handleError(error as Error, ErrorSource.API, undefined, {
          messageId: variables.messageId,
          emoji: variables.emoji,
          method: "removeReaction",
        });
      },
    }),
  });
}
