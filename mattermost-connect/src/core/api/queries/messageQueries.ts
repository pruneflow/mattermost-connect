// src/core/api/queries/messageQueries.ts
/**
 * React Query hooks for message operations
 * Optimized for message-related queries and mutations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { Message, MessagePaginationOptions } from "../../../types";
import { useMessageStore } from "../../store/messageStore";
import { createQueryOptions, createMutationOptions } from "../queryUtils";
import { buildUrlWithParams } from "../apiUtils";

// ==========================================
// COMMON TYPE DEFINITIONS
// ==========================================

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

// ==========================================
// MESSAGE QUERY HOOKS
// ==========================================

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
        throw error;
      } finally {
        setLoading(channelId, false);
      }
    },

    enabled: !!channelId,
    ...createQueryOptions("message", {
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
    }),
  });
}

/**
 * Hook for fetching thread messages
 */
export function useThreadMessagesQuery(rootMessageId: string | undefined) {
  const { setThreadMessages, setThreadLoading } = useMessageStore();

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
        console.error(
          `Error fetching thread messages for ${rootMessageId}:`,
          error,
        );
        throw error;
      } finally {
        setThreadLoading(rootMessageId, false);
      }
    },

    enabled: !!rootMessageId,
    ...createQueryOptions("message", {
      staleTime: 30 * 1000,
    }),
  });
}

/**
 * Hook for fetching pinned messages in a channel
 */
export function usePinnedMessagesQuery(channelId: string | undefined) {
  const { setPinnedMessages } = useMessageStore();

  return useQuery<Message[], Error>({
    queryKey: channelId
      ? MESSAGE_KEYS.pinned(channelId)
      : ["pinned-messages-placeholder"],

    queryFn: async () => {
      if (!channelId) return [];

      const response = await apiClient.get<PostsResponse>(
        `channels/${channelId}/pinned`,
      );

      const { posts, order } = response.data;
      const pinnedMessages = order
        .map((postId) => posts[postId])
        .filter((msg): msg is Message => !!msg);

      setPinnedMessages(channelId, pinnedMessages);
      return pinnedMessages;
    },

    enabled: !!channelId,
    ...createQueryOptions("message", {
      staleTime: 60 * 1000,
    }),
  });
}

/**
 * Hook for fetching file information
 */
export function useFileInfoQuery(fileId: string | undefined) {
  return useQuery<any, Error>({
    queryKey: fileId
      ? MESSAGE_KEYS.fileInfo(fileId)
      : ["file-info-placeholder"],

    queryFn: async () => {
      if (!fileId) throw new Error("File ID is required");

      const response = await apiClient.get(`files/${fileId}/info`);
      return response.data;
    },

    enabled: !!fileId,
    ...createQueryOptions("message", {
      staleTime: 5 * 60 * 1000,
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
  return useQuery<Message[], Error>({
    queryKey:
      channelId && searchTerm
        ? MESSAGE_KEYS.search(channelId, searchTerm)
        : ["search-messages-placeholder"],

    queryFn: async () => {
      if (!channelId || !searchTerm || searchTerm.trim() === "") return [];

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
    },

    enabled: !!(channelId && searchTerm && searchTerm.trim() !== ""),
    ...createQueryOptions("message", {
      staleTime: 30 * 1000,
      retry: false,
    }),
  });
}

/**
 * Hook for fetching unread messages in a channel
 */
export function useUnreadMessagesQuery(
  channelId: string | undefined,
  lastViewedAt: number | undefined,
) {
  return useQuery<Message[], Error>({
    queryKey:
      channelId && lastViewedAt
        ? QUERY_KEYS.messages.since(channelId, lastViewedAt)
        : ["unread-messages-placeholder"],

    queryFn: async () => {
      if (!channelId || !lastViewedAt) return [];

      const params: MessagesQueryParams = {
        page: 0,
        per_page: 60,
        since: lastViewedAt,
      };

      const url = buildUrlWithParams(`channels/${channelId}/posts`, params);
      const response = await apiClient.get<PostsResponse>(url);

      const { posts, order } = response.data;
      return order
        .map((postId) => posts[postId])
        .filter((msg): msg is Message => !!msg);
    },

    enabled: !!(channelId && lastViewedAt),
    ...createQueryOptions("message", {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
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
  return useQuery<MessageContext, Error>({
    queryKey:
      channelId && messageId
        ? MESSAGE_KEYS.context(channelId, messageId)
        : ["message-context-placeholder"],

    queryFn: async () => {
      if (!channelId || !messageId) {
        return { before: [], target: null, after: [] };
      }

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
      const targetResponse = await apiClient.get<Message>(`posts/${messageId}`);

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
    },

    enabled: !!(channelId && messageId),
    ...createQueryOptions("message", {
      staleTime: 30 * 1000,
    }),
  });
}

// ==========================================
// MESSAGE MUTATION HOOKS
// ==========================================

/**
 * Interface for sending a message
 */
interface SendMessageParams {
  channelId: string;
  message: string;
  fileIds?: string[];
}

/**
 * Hook for sending a new message
 */
export function useSendMessageMutation() {
  const queryClient = useQueryClient();
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
      invalidateQueries.channelMessages(newMessage.channel_id);
      addMessage(newMessage);
    },

    ...createMutationOptions(),
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
  const queryClient = useQueryClient();
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
      if (newMessage.root_id) {
        invalidateQueries.thread(newMessage.root_id);
      }

      invalidateQueries.channelMessages(newMessage.channel_id);

      addMessage(newMessage);
      setReplyToMessage(null);
    },

    ...createMutationOptions(),
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
  const queryClient = useQueryClient();
  const { updateMessage } = useMessageStore();

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
      if (updatedMessage.root_id) {
        invalidateQueries.thread(updatedMessage.root_id);
      }

      invalidateQueries.channelMessages(updatedMessage.channel_id);

      updateMessage(updatedMessage);
    },

    ...createMutationOptions(),
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
  const queryClient = useQueryClient();
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

      if (message?.root_id) {
        invalidateQueries.thread(message.root_id);
      }

      invalidateQueries.channelMessages(channelId);

      deleteMessage(messageId, channelId);
    },

    ...createMutationOptions(),
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
      queryClient.invalidateQueries({
        queryKey: MESSAGE_KEYS.pinned(channelId),
      });

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      try {
        const response = await apiClient.get<Message>(`posts/${messageId}`);
        updateMessage(response.data);
      } catch (error) {
        console.error("Error refetching pinned message:", error);
      }
    },

    ...createMutationOptions(),
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
      queryClient.invalidateQueries({
        queryKey: MESSAGE_KEYS.pinned(channelId),
      });

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      try {
        const response = await apiClient.get<Message>(`posts/${messageId}`);
        updateMessage(response.data);
      } catch (error) {
        console.error("Error refetching unpinned message:", error);
      }
    },

    ...createMutationOptions(),
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
  return useMutation<UploadFilesResponse, Error, UploadFilesParams>({
    mutationFn: async ({ channelId, files }) => {
      if (!channelId || files.length === 0) {
        throw new Error("Channel ID and files are required");
      }

      const formData = new FormData();
      formData.append("channel_id", channelId);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await apiClient.uploadFiles(formData);
      return response.data;
    },

    ...createMutationOptions(),
  });
}
