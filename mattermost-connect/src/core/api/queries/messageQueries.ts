// src/core/api/queries/messageQueries.ts
/**
 * React Query hooks for message operations
 * Organized by query type and optimized for caching
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { Message, MessagePaginationOptions } from "../../../types";
import { useMessageStore } from "../../store/messageStore";
import { useAuthStore } from "../../store/authStore";
import { createQueryOptions, createMutationOptions } from "../queryUtils";
import { buildUrlWithParams } from "../apiUtils";

// ====================
// SECTION: MESSAGE RETRIEVAL
// ====================

/**
 * Fetches messages for a channel
 * @param channelId - Channel ID
 * @param options - Pagination options
 * @returns Query hook for messages
 */
export const useMessagesQuery = (
  channelId: string | undefined,
  options: MessagePaginationOptions = {},
) => {
  const { setMessages, setLoading, setError } = useMessageStore();

  return useQuery({
    queryKey: channelId
      ? [...QUERY_KEYS.messages.byChannel(channelId), options]
      : ["messages", "byChannel", "undefined", options],
    queryFn: async () => {
      if (!channelId) {
        return [];
      }

      setLoading(channelId, true);
      try {
        // Build query parameters
        const { page = 0, perPage = 60, since = 0, before, after } = options;
        const params = { page, per_page: perPage };

        if (since) params.since = since;
        if (before) params.before = before;
        if (after) params.after = after;

        // Build URL with parameters
        const url = buildUrlWithParams(`channels/${channelId}/posts`, params);

        // Fetch messages
        const response = await apiClient.get<{
          posts: Record<string, Message>;
          order: string[];
        }>(url);

        // Transform response
        const { posts, order } = response.data;
        const messages = order
          .map((postId: string) => posts[postId])
          .filter(Boolean);

        // Update store only for base queries
        // (not for queries with before/after/since)
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
    // Message-specific options based on standard configurations
    ...createQueryOptions("message", {
      enabled: !!channelId,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds
    }),
  });
};

/**
 * Fetches thread messages for a root message
 * @param rootMessageId - Root message ID
 * @returns Query hook for thread messages
 */
export const useThreadMessagesQuery = (rootMessageId: string | undefined) => {
  const { setThreadMessages, setThreadLoading } = useMessageStore();

  return useQuery({
    queryKey: rootMessageId
      ? QUERY_KEYS.messages.thread(rootMessageId)
      : ["messages", "thread", "undefined"],
    queryFn: async () => {
      if (!rootMessageId) {
        return [];
      }

      setThreadLoading(rootMessageId, true);
      try {
        // Fetch thread messages
        const response = await apiClient.get<{
          posts: Record<string, Message>;
          order: string[];
        }>(`posts/${rootMessageId}/thread`);

        // Transform response
        const { posts, order } = response.data;
        const messages = order
          .map((postId: string) => posts[postId])
          .filter((message: Message) => message.id !== rootMessageId); // Exclude root message

        // Update store
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
    // Thread-specific options
    ...createQueryOptions("message", {
      enabled: !!rootMessageId,
      staleTime: 30 * 1000, // 30 seconds
    }),
  });
};

/**
 * Fetches pinned messages for a channel
 * @param channelId - Channel ID
 * @returns Query hook for pinned messages
 */
export const usePinnedMessagesQuery = (channelId: string | undefined) => {
  const { setPinnedMessages } = useMessageStore();

  return useQuery({
    queryKey: channelId
      ? ["pinnedMessages", channelId]
      : ["pinnedMessages", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        return [];
      }

      const response = await apiClient.get<{
        posts: Record<string, Message>;
        order: string[];
      }>(`channels/${channelId}/pinned`);

      // Transform response
      const { posts, order } = response.data;
      const pinnedMessages = order
        .map((postId: string) => posts[postId])
        .filter(Boolean);

      // Update store
      setPinnedMessages(channelId, pinnedMessages);

      return pinnedMessages;
    },
    // Pinned messages specific options
    ...createQueryOptions("message", {
      enabled: !!channelId,
      staleTime: 60 * 1000, // 1 minute for pinned messages (change less frequently)
    }),
  });
};

/**
 * Fetches file information
 * @param fileId - File ID
 * @returns Query hook for file information
 */
export const useFileInfoQuery = (fileId: string | undefined) => {
  return useQuery({
    queryKey: fileId ? ["fileInfo", fileId] : ["fileInfo", "undefined"],
    queryFn: async () => {
      if (!fileId) {
        throw new Error("File ID is required");
      }

      const response = await apiClient.get(`files/${fileId}/info`);
      return response.data;
    },
    // File info specific options
    ...createQueryOptions("message", {
      enabled: !!fileId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  });
};

// ====================
// SECTION: MESSAGE SENDING OPERATIONS
// ====================

/**
 * Sends a new message
 */
export const useSendMessageMutation = () => {
  const queryClient = useQueryClient();
  const { addMessage } = useMessageStore();

  return useMutation({
    mutationFn: async ({
      channelId,
      message,
      fileIds = [],
    }: {
      channelId: string;
      message: string;
      fileIds?: string[];
    }) => {
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
      // Invalidate channel messages query
      invalidateQueries.channelMessages(newMessage.channel_id);

      // Update store
      addMessage(newMessage);
    },
    // Standard mutation options
    ...createMutationOptions(),
  });
};

/**
 * Replies to a message in a thread
 */
export const useReplyToMessageMutation = () => {
  const queryClient = useQueryClient();
  const { addMessage, setReplyToMessage } = useMessageStore();

  return useMutation({
    mutationFn: async ({
      channelId,
      rootMessageId,
      message,
      fileIds = [],
    }: {
      channelId: string;
      rootMessageId: string;
      message: string;
      fileIds?: string[];
    }) => {
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
      // Invalidate queries
      if (newMessage.root_id) {
        invalidateQueries.thread(newMessage.root_id);
      }

      invalidateQueries.channelMessages(newMessage.channel_id);

      // Update store
      addMessage(newMessage);
      setReplyToMessage(null);
    },
    // Standard mutation options
    ...createMutationOptions(),
  });
};

// ====================
// SECTION: MESSAGE MODIFICATION OPERATIONS
// ====================

/**
 * Edits an existing message
 */
export const useEditMessageMutation = () => {
  const queryClient = useQueryClient();
  const { updateMessage } = useMessageStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      message,
    }: {
      messageId: string;
      message: string;
    }) => {
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
      // Invalidate queries
      if (updatedMessage.root_id) {
        invalidateQueries.thread(updatedMessage.root_id);
      }

      invalidateQueries.channelMessages(updatedMessage.channel_id);

      // Update store
      updateMessage(updatedMessage);
    },
    // Standard mutation options
    ...createMutationOptions(),
  });
};

/**
 * Deletes a message
 */
export const useDeleteMessageMutation = () => {
  const queryClient = useQueryClient();
  const { getMessageById, deleteMessage } = useMessageStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
    }: {
      messageId: string;
      channelId: string;
    }) => {
      if (!messageId) {
        throw new Error("Message ID is required");
      }

      await apiClient.delete(`posts/${messageId}`);
      return { messageId, channelId };
    },
    onSuccess: ({ messageId, channelId }) => {
      // Get message from store to check if it's part of a thread
      const message = getMessageById(messageId);

      // Invalidate queries
      if (message?.root_id) {
        invalidateQueries.thread(message.root_id);
      }

      invalidateQueries.channelMessages(channelId);

      // Update store
      deleteMessage(messageId, channelId);
    },
    // Standard mutation options
    ...createMutationOptions(),
  });
};

// ====================
// SECTION: PINNING OPERATIONS
// ====================

/**
 * Pins a message in a channel
 */
export const usePinMessageMutation = () => {
  const queryClient = useQueryClient();
  const { updateMessage } = useMessageStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
    }: {
      messageId: string;
      channelId: string;
    }) => {
      if (!messageId) {
        throw new Error("Message ID is required");
      }

      await apiClient.post(`posts/${messageId}/pin`);
      return { messageId, channelId };
    },
    onSuccess: async ({ messageId, channelId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["pinnedMessages", channelId],
      });

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      // Update message in store by fetching it first
      try {
        const response = await apiClient.get<Message>(`posts/${messageId}`);
        updateMessage(response.data);
      } catch (error) {
        console.error("Error refetching pinned message:", error);
      }
    },
    // Standard mutation options
    ...createMutationOptions(),
  });
};

/**
 * Unpins a message from a channel
 */
export const useUnpinMessageMutation = () => {
  const queryClient = useQueryClient();
  const { updateMessage } = useMessageStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      channelId,
    }: {
      messageId: string;
      channelId: string;
    }) => {
      if (!messageId) {
        throw new Error("Message ID is required");
      }

      await apiClient.post(`posts/${messageId}/unpin`);
      return { messageId, channelId };
    },
    onSuccess: async ({ messageId, channelId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["pinnedMessages", channelId],
      });

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      // Update message in store by fetching it first
      try {
        const response = await apiClient.get<Message>(`posts/${messageId}`);
        updateMessage(response.data);
      } catch (error) {
        console.error("Error refetching unpinned message:", error);
      }
    },
    // Standard mutation options
    ...createMutationOptions(),
  });
};

// ====================
// SECTION: ATTACHMENT OPERATIONS
// ====================

/**
 * Uploads files to be attached to a message
 */
export const useUploadFilesMutation = () => {
  return useMutation({
    mutationFn: async ({
      channelId,
      files,
    }: {
      channelId: string;
      files: File[];
    }) => {
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
    // Standard mutation options
    ...createMutationOptions(),
  });
};

// ====================
// SECTION: UTILITIES AND EXTENSIONS
// ====================

/**
 * Searches for messages in a channel
 * @param channelId - Channel ID
 * @param searchTerm - Search term
 * @returns Query hook for search results
 */
export const useSearchMessagesQuery = (
  channelId: string | undefined,
  searchTerm: string | undefined,
) => {
  return useQuery({
    queryKey: ["messages", "search", channelId, searchTerm],
    queryFn: async () => {
      if (!channelId || !searchTerm || searchTerm.trim() === "") {
        return [];
      }

      const params = {
        terms: searchTerm,
        is_or_search: true,
        include_deleted_channels: false,
        page: 0,
        per_page: 20,
      };

      const response = await apiClient.post(`teams/posts/search`, params);

      // Filter messages to only keep those from the specified channel
      const allPosts = response.data.posts || {};
      const order = response.data.order || [];

      return order
        .map((postId: string) => allPosts[postId])
        .filter((post: Message) => post.channel_id === channelId);
    },
    // Search-specific options
    ...createQueryOptions("message", {
      enabled: !!channelId && !!searchTerm && searchTerm.trim() !== "",
      staleTime: 30 * 1000, // 30 seconds
      retry: false,
    }),
  });
};

/**
 * Fetches unread messages in a channel
 * @param channelId - Channel ID
 * @param lastViewedAt - Timestamp of last viewed
 * @returns Query hook for unread messages
 */
export const useUnreadMessagesQuery = (
  channelId: string | undefined,
  lastViewedAt: number | undefined,
) => {
  const { setMessages } = useMessageStore();

  return useQuery({
    queryKey:
      channelId && lastViewedAt
        ? QUERY_KEYS.messages.since(channelId, lastViewedAt)
        : ["messages", "unread", "undefined"],
    queryFn: async () => {
      if (!channelId || !lastViewedAt) {
        return [];
      }

      const response = await apiClient.get<{
        posts: Record<string, Message>;
        order: string[];
      }>(`channels/${channelId}/posts`, {
        params: { since: lastViewedAt },
      });

      // Transform response
      const { posts, order } = response.data;
      return order.map((postId: string) => posts[postId]).filter(Boolean);
    },
    // Unread messages specific options
    ...createQueryOptions("message", {
      enabled: !!channelId && !!lastViewedAt,
      staleTime: 0, // Always refresh unread messages
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }),
  });
};

/**
 * Fetches recent messages around a specific message
 * @param channelId - Channel ID
 * @param messageId - Central message ID
 * @param count - Number of messages before/after to fetch
 * @returns Query hook for message context
 */
export const useMessageContextQuery = (
  channelId: string | undefined,
  messageId: string | undefined,
  count: number = 10,
) => {
  return useQuery({
    queryKey: ["messages", "context", channelId, messageId, count],
    queryFn: async () => {
      if (!channelId || !messageId) {
        return { before: [], target: null, after: [] };
      }

      // Fetch messages before
      const beforeResponse = await apiClient.get<{
        posts: Record<string, Message>;
        order: string[];
      }>(`channels/${channelId}/posts`, {
        params: { before: messageId, per_page: count },
      });

      // Fetch target message
      const targetResponse = await apiClient.get<Message>(`posts/${messageId}`);

      // Fetch messages after
      const afterResponse = await apiClient.get<{
        posts: Record<string, Message>;
        order: string[];
      }>(`channels/${channelId}/posts`, {
        params: { after: messageId, per_page: count },
      });

      // Transform responses
      const before = beforeResponse.data.order
        .map((postId: string) => beforeResponse.data.posts[postId])
        .filter(Boolean);

      const target = targetResponse.data;

      const after = afterResponse.data.order
        .map((postId: string) => afterResponse.data.posts[postId])
        .filter(Boolean);

      return { before, target, after };
    },
    // Message context specific options
    ...createQueryOptions("message", {
      enabled: !!channelId && !!messageId,
      staleTime: 30 * 1000, // 30 seconds
    }),
  });
};

// Extension of query keys for new queries
if (QUERY_KEYS.messages) {
  QUERY_KEYS.messages.pinned = (channelId: string) => [
    "messages",
    "pinned",
    channelId,
  ];
  QUERY_KEYS.messages.search = (channelId: string, term: string) => [
    "messages",
    "search",
    channelId,
    term,
  ];
  QUERY_KEYS.messages.context = (channelId: string, messageId: string) => [
    "messages",
    "context",
    channelId,
    messageId,
  ];
}
