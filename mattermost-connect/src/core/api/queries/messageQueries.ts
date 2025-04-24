// src/core/api/queries/messageQueries.ts
/**
 * React Query hooks for message operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { QUERY_KEYS, invalidateQueries } from "../queryClient";
import { Message, useMessageStore } from "../../store/messageStore";
import { useAuthStore } from "../../store/authStore";

/**
 * Pagination options for fetching messages
 */
export interface MessagePaginationOptions {
  /** Page number */
  page?: number;
  /** Number of messages per page */
  perPage?: number;
  /** Fetch messages since a timestamp */
  since?: number;
  /** Fetch messages before a specific message ID */
  before?: string;
  /** Fetch messages after a specific message ID */
  after?: string;
  /** Force refresh instead of using cache */
  forceRefresh?: boolean;
}

/**
 * Fetches messages for a channel
 * @param channelId Channel ID
 * @param options Pagination options
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
        // Build query params
        const { page = 0, perPage = 60, since = 0, before, after } = options;
        let endpoint = `channels/${channelId}/posts?page=${page}&per_page=${perPage}`;

        if (since) endpoint += `&since=${since}`;
        if (before) endpoint += `&before=${before}`;
        if (after) endpoint += `&after=${after}`;

        // Fetch messages
        const response = await apiClient.get(endpoint);

        // Transform response
        const { posts, order } = response.data;
        const messages = order
          .map((postId: string) => posts[postId])
          .filter(Boolean);

        // Update store
        if (!before && !after && !since && page === 0) {
          setMessages(channelId, messages);
        }

        return messages;
      } catch (error) {
        setError(channelId, error as Error);
        throw error;
      }
    },
    // Don't run query if channelId is not provided
    enabled: !!channelId,
    // Cache data for 30 seconds
    staleTime: 30 * 1000,
    // Refetch automatically when window gains focus
    refetchOnWindowFocus: true,
  });
};

/**
 * Fetches thread messages for a root message
 * @param rootMessageId Root message ID
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
        const response = await apiClient.get(`posts/${rootMessageId}/thread`);

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
    // Don't run query if rootMessageId is not provided
    enabled: !!rootMessageId,
    // Cache data for 30 seconds
    staleTime: 30 * 1000,
  });
};

/**
 * Sends a new message
 */
export const useSendMessageMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(newMessage.channel_id),
      });

      // Update message store
      const { addMessage } = useMessageStore.getState();
      addMessage(newMessage);
    },
  });
};

/**
 * Replies to a message in a thread
 */
export const useReplyToMessageMutation = () => {
  const queryClient = useQueryClient();

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
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.messages.thread(newMessage.root_id),
        });
      }

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(newMessage.channel_id),
      });

      // Update message store
      const { addMessage, setReplyToMessage } = useMessageStore.getState();
      addMessage(newMessage);
      setReplyToMessage(null);
    },
  });
};

/**
 * Edits an existing message
 */
export const useEditMessageMutation = () => {
  const queryClient = useQueryClient();

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
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.messages.thread(updatedMessage.root_id),
        });
      }

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(updatedMessage.channel_id),
      });

      // Update message store
      const { updateMessage } = useMessageStore.getState();
      updateMessage(updatedMessage);
    },
  });
};

/**
 * Deletes a message
 */
export const useDeleteMessageMutation = () => {
  const queryClient = useQueryClient();

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
      const message = useMessageStore.getState().getMessageById(messageId);

      // Invalidate queries
      if (message?.root_id) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.messages.thread(message.root_id),
        });
      }

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      // Update message store
      const { deleteMessage } = useMessageStore.getState();
      deleteMessage(messageId, channelId);
    },
  });
};

/**
 * Adds a reaction to a message
 */
export const useAddReactionMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      if (!messageId || !emoji || !currentUser) {
        throw new Error("Message ID, emoji, and current user are required");
      }

      await apiClient.post("reactions", {
        post_id: messageId,
        emoji_name: emoji,
        user_id: currentUser.id,
      });

      return { messageId, emoji, userId: currentUser.id };
    },
    onSuccess: ({ messageId, emoji, userId }) => {
      // Update message store
      const { addReaction } = useMessageStore.getState();
      addReaction(messageId, userId, emoji);
    },
  });
};

/**
 * Removes a reaction from a message
 */
export const useRemoveReactionMutation = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      channelId,
    }: {
      messageId: string;
      emoji: string;
      channelId: string;
    }) => {
      if (!messageId || !emoji || !currentUser) {
        throw new Error("Message ID, emoji, and current user are required");
      }

      await apiClient.delete(
        `users/${currentUser.id}/posts/${messageId}/reactions/${emoji}`,
      );

      return { messageId, emoji, userId: currentUser.id, channelId };
    },
    onSuccess: ({ messageId, emoji, userId }) => {
      // Update message store
      const { removeReaction } = useMessageStore.getState();
      removeReaction(messageId, userId, emoji);
    },
  });
};

/**
 * Pins a message in a channel
 */
export const usePinMessageMutation = () => {
  const queryClient = useQueryClient();

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
    onSuccess: ({ messageId, channelId }) => {
      // Invalidate channel messages query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      // Update message store by refetching the message
      const refetchMessage = async () => {
        try {
          const response = await apiClient.get<Message>(`posts/${messageId}`);
          const updatedMessage = response.data;

          // Update the message in store
          const { updateMessage } = useMessageStore.getState();
          updateMessage(updatedMessage);
        } catch (error) {
          console.error("Error refetching pinned message:", error);
        }
      };

      refetchMessage();
    },
  });
};

/**
 * Unpins a message from a channel
 */
export const useUnpinMessageMutation = () => {
  const queryClient = useQueryClient();

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
    onSuccess: ({ messageId, channelId }) => {
      // Invalidate channel messages query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages.byChannel(channelId),
      });

      // Update message store by refetching the message
      const refetchMessage = async () => {
        try {
          const response = await apiClient.get<Message>(`posts/${messageId}`);
          const updatedMessage = response.data;

          // Update the message in store
          const { updateMessage } = useMessageStore.getState();
          updateMessage(updatedMessage);
        } catch (error) {
          console.error("Error refetching unpinned message:", error);
        }
      };

      refetchMessage();
    },
  });
};

/**
 * Fetches pinned messages for a channel
 * @param channelId Channel ID
 * @returns Query hook for pinned messages
 */
export const usePinnedMessagesQuery = (channelId: string | undefined) => {
  return useQuery({
    queryKey: channelId
      ? ["pinnedMessages", channelId]
      : ["pinnedMessages", "undefined"],
    queryFn: async () => {
      if (!channelId) {
        return [];
      }

      const response = await apiClient.get(`channels/${channelId}/pinned`);

      // Transform response
      const { posts, order } = response.data;
      return order.map((postId: string) => posts[postId]).filter(Boolean);
    },
    enabled: !!channelId,
    staleTime: 60 * 1000, // 1 minute
  });
};

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
  });
};

/**
 * Fetches file information
 * @param fileId File ID
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
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
