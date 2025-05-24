import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { api } from "../api/client";
import { Message, FileInfo } from "../api/types";
import { useAuth } from "../context/AuthContext";

// Query keys
export const messageKeys = {
  all: ["messages"] as const,
  lists: () => [...messageKeys.all, "list"] as const,
  list: (channelId: string) => [...messageKeys.lists(), { channelId }] as const,
  details: () => [...messageKeys.all, "detail"] as const,
  detail: (id: string) => [...messageKeys.details(), id] as const,
  infinite: (channelId: string) =>
    [...messageKeys.list(channelId), "infinite"] as const,
  thread: (messageId: string) =>
    [...messageKeys.all, "thread", messageId] as const,
};

// Message pagination parameters
interface MessageParams {
  page?: number;
  perPage?: number;
  since?: number;
  before?: string;
  after?: string;
  includeDeleted?: boolean;
  root_id?: string;
}

// Create message parameters
interface CreateMessageParams {
  channel_id: string;
  message: string;
  root_id?: string;
  file_ids?: string[];
  props?: Record<string, any>;
}

// Utility function to process message response and avoid code duplication
const processMessageResponse = (
  responseData: any,
  existingMessages: Message[] = [],
) => {
  const { order = [], posts = {} } = responseData;

  // Convert to array of messages
  const allMessages = order
    .map((postId: any) => posts[postId])
    .filter((post: any) => !!post);

  // Filter out thread replies for main message list
  const filteredMessages = allMessages.filter(
    (message: any) => !message.root_id,
  );

  // Calculate reply counts for messages
  const replyCountMap = new Map<string, number>();
  allMessages.forEach((message: any) => {
    if (message.root_id) {
      const rootId = message.root_id;
      replyCountMap.set(rootId, (replyCountMap.get(rootId) || 0) + 1);
    }
  });

  // Enhance messages with reply count data
  filteredMessages.forEach((message: any) => {
    if (replyCountMap.has(message.id)) {
      // @ts-ignore - We're adding a dynamic property
      message.reply_count = replyCountMap.get(message.id);
      // @ts-ignore - We're adding a dynamic property
      message.has_replies = true;
    }
  });

  // Merge with existing messages, avoiding duplicates
  const messageMap = new Map<string, Message>();
  [...existingMessages, ...filteredMessages].forEach((msg) => {
    messageMap.set(msg.id, msg);
  });

  const mergedMessages = Array.from(messageMap.values());

  // Extract pagination info
  const paginationInfo = {
    hasNext: responseData.has_next || false,
    hasPrev: responseData.prev_post_id ? true : false,
    nextPostId: responseData.next_post_id,
    prevPostId: responseData.prev_post_id,
  };

  return {
    messages: mergedMessages,
    pagination: paginationInfo,
  };
};

/**
 * Hook for working with messages in a channel
 */
// Create a specific hook for thread messages
export function useThreadMessages(
  rootId: string | undefined,
  channelId: string | undefined,
) {
  const queryClient = useQueryClient();
  const [hasMore, setHasMore] = useState(false);

  // Define a specific query key for thread messages
  const threadQueryKey = messageKeys.thread(rootId || "");

  // Fetch thread messages using a direct request to the thread endpoint
  const threadQuery = useQuery({
    queryKey: threadQueryKey,
    queryFn: async () => {
      if (!rootId || !channelId) {
        return {
          parentMessage: null,
          threadMessages: [],
        };
      }

      try {
        console.debug(
          `API call to fetch thread: ${rootId} in channel ${channelId}`,
          {
            timestamp: new Date().toISOString(),
          },
        );

        // Use api.get instead of direct fetch
        console.debug(`Thread URL: posts/${rootId}/thread`);

        const response = await api.get(`posts/${rootId}/thread`);
        const data = response.data;
        console.debug(
          `Thread data received with ${Object.keys(data.posts || {}).length} posts`,
          {
            timestamp: new Date().toISOString(),
          },
        );

        // Extract messages from the response
        const { order = [], posts = {} } = data;

        // Convert to array of messages
        const messages = order
          .map((postId) => posts[postId])
          .filter((post) => !!post);

        // Find the parent message
        const parentMessage = posts[rootId];

        if (!parentMessage) {
          console.warn(
            `Parent message with id ${rootId} not found in thread response`,
          );
        } else {
          console.debug(`Found parent message with id ${parentMessage.id}`);

          // Add or update reply count on parent message
          // @ts-ignore - We're adding a dynamic property
          parentMessage.reply_count = messages.length - 1; // All messages minus parent
          // @ts-ignore - We're adding a dynamic property
          parentMessage.has_replies = messages.length > 1;

          console.debug(
            `Parent message has reply_count=${parentMessage.reply_count}`,
          );
        }

        // Exclude the parent message from thread messages and sort by creation date
        const threadMessages = messages
          .filter((message) => message.id !== rootId)
          .sort((a, b) => a.create_at - b.create_at); // Sort chronologically (oldest first)

        console.debug(`Thread messages count: ${threadMessages.length}`, {
          messagesCount: messages.length,
          threadMessagesCount: threadMessages.length,
          timestamp: new Date().toISOString(),
        });

        // Return both parent and thread messages
        return {
          parentMessage,
          threadMessages,
        };
      } catch (error) {
        console.error(`Thread API error:`, error);
        throw error;
      }
    },
    enabled: !!rootId && !!channelId, // Only run query if we have both rootId and channelId
    staleTime: 10000, // Consider data fresh for 10 seconds only
    refetchOnWindowFocus: true, // Ensure we get updates when window is refocused
  });

  // Function to create a reply in the thread
  const createReplyMutation = useMutation({
    mutationFn: async ({
      message,
      fileIds,
    }: {
      message: string;
      fileIds?: string[];
    }) => {
      const response = await api.post("posts", {
        channel_id: channelId,
        message,
        root_id: rootId,
        file_ids: fileIds || [],
      });

      return response.data;
    },
    onSuccess: (newMessage) => {
      console.debug(`Thread reply created successfully: ${newMessage.id}`);

      // Update thread cache directly with better error handling
      queryClient.setQueryData(
        threadQueryKey,
        (oldData: any = { threadMessages: [] }) => {
          // Make sure oldData and oldData.threadMessages exist and are valid
          if (!oldData) {
            console.debug(`Thread cache not found, creating new cache entry`);
            return {
              threadMessages: [newMessage],
              parentMessage: null, // Will be fetched later if needed
            };
          }

          // Ensure threadMessages is an array
          const threadMessages = Array.isArray(oldData.threadMessages)
            ? oldData.threadMessages
            : [];

          // Check if message already exists to prevent duplicates
          const messageExists = threadMessages.some(
            (m: any) => m.id === newMessage.id,
          );

          if (!messageExists) {
            console.debug(
              `Adding new message ${newMessage.id} to thread cache`,
            );
            return {
              ...oldData,
              threadMessages: [...threadMessages, newMessage].sort(
                (a, b) => a.create_at - b.create_at,
              ), // Sort chronologically (oldest first)
            };
          }

          console.debug(
            `Message ${newMessage.id} already exists in thread cache`,
          );
          return oldData;
        },
      );

      // Note: reply_count is updated automatically via WebSocket 'posted' event
    },
  });

  return {
    data: threadQuery.data,
    parentMessage: threadQuery.data?.parentMessage,
    threadMessages: threadQuery.data?.threadMessages || [],
    isLoading: threadQuery.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error,
    hasMore,
    createReply: createReplyMutation.mutateAsync,
    isReplying: createReplyMutation.isPending,
    refetch: threadQuery.refetch,
    threadKey: threadQueryKey, // Expose the query key for external cache manipulation
  };
}

export function useMessages(
  channelId: string | undefined,
  params: MessageParams = {},
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Auto mark channel as read when channelId changes
  React.useEffect(() => {
    if (channelId && user?.id) {
      // Import useUnreadCounts dynamically to avoid circular dependencies
      import("./useUnreadCounts").then(({ unreadKeys }) => {
        // Trigger channel_viewed to mark as read
        const markAsRead = async () => {
          try {
            await api.post(`channels/members/me/view`, {
              channel_id: channelId,
            });
            console.debug(`Auto-marked channel ${channelId} as read`);
          } catch (error) {
            console.error(
              `Failed to auto-mark channel ${channelId} as read:`,
              error,
            );
          }
        };

        markAsRead();
      });
    }
  }, [channelId, user?.id]);

  // Default params
  const defaultParams = {
    page: 0,
    perPage: 50, // Default page size
    includeDeleted: false,
    ...params,
  };

  // State for bidirectional pagination
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [hasNewerMessages, setHasNewerMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Skip query if channelId is undefined
  const enabled = !!channelId;

  // Fetch messages for channel
  const messagesQuery = useQuery({
    queryKey: messageKeys.list(channelId || ""),
    queryFn: async () => {
      // If this is for thread messages, handle separately
      if (defaultParams.root_id) {
        // Use thread endpoint for thread messages
        try {
          console.debug(
            `useMessages: Fetching thread for root_id=${defaultParams.root_id}`,
          );

          const response = await api.get(
            `posts/${defaultParams.root_id}/thread`,
          );
          const data = response.data;

          console.debug(
            `useMessages: Thread fetch successful for root_id=${defaultParams.root_id}`,
            { responseStatus: response.status, responseData: data },
          );

          const { order = [], posts = {} } = data;

          // Convert to array of messages
          const messages = order
            .map((postId) => posts[postId])
            .filter((post) => !!post);

          // Find parent message
          let parentMessage;
          if (data.posts && data.posts[defaultParams.root_id]) {
            parentMessage = data.posts[defaultParams.root_id];
          } else {
            parentMessage = messages.find(
              (message) => message.id === defaultParams.root_id,
            );
          }

          // Filter thread messages (exclude parent)
          const threadMessages = messages.filter(
            (message) => message.id !== defaultParams.root_id,
          );

          // Attach parent message as non-enumerable property
          if (parentMessage) {
            Object.defineProperty(threadMessages, "parentMessage", {
              value: parentMessage,
              enumerable: false,
              configurable: true,
            });
          }

          setHasOlderMessages(false);
          setHasNewerMessages(false);
          return threadMessages;
        } catch (error) {
          console.error(
            `useMessages: Error fetching thread for root_id=${defaultParams.root_id}`,
            error,
          );
          throw error;
        }
      }

      // For channel messages, use the unread endpoint
      if (!user?.id || !channelId) {
        throw new Error("User ID and channel ID are required");
      }

      const queryParams: Record<string, any> = {
        limit_before: 30,
        limit_after: 30,
        skipFetchThreads: false,
        collapsedThreads: true,
        collapsedThreadsExtended: false,
      };

      if (defaultParams.before) {
        queryParams.before = defaultParams.before;
      }

      if (defaultParams.after) {
        queryParams.after = defaultParams.after;
      }

      // Fetch unread messages for the channel
      console.debug(
        `useMessages: Fetching unread messages for channelId=${channelId}`,
        queryParams,
      );
      const response = await api.get(
        `users/${user.id}/channels/${channelId}/posts/unread`,
        queryParams,
      );

      // Process the response using utility function
      const { messages: processedMessages, pagination } =
        processMessageResponse(response.data);

      // Set pagination states separately
      setHasOlderMessages(pagination.hasPrev);
      setHasNewerMessages(pagination.hasNext);

      // Return the processed messages
      return processedMessages;
    },
    enabled,
  });

  // Function to load more messages (older)
  const loadMore = async () => {
    if (
      !channelId ||
      !hasOlderMessages ||
      loadingMore ||
      messagesQuery.isLoading
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      const currentMessages = messagesQuery.data || [];

      // Find the oldest message to use as 'before' parameter
      if (currentMessages.length > 0) {
        // Sort by creation time to find oldest
        const sortedMessages = [...currentMessages].sort(
          (a, b) => a.create_at - b.create_at,
        );
        const oldestMessage = sortedMessages[0];

        // Build query parameters for older messages using posts endpoint
        const queryParams: Record<string, any> = {
          before: oldestMessage.id,
          page: 0,
          per_page: 30,
          skipFetchThreads: false,
          collapsedThreads: true,
          collapsedThreadsExtended: false,
        };

        // Fetch older messages using posts endpoint
        const response = await api.get(
          `channels/${channelId}/posts`,
          queryParams,
        );

        // Process the response using utility function
        const { messages: mergedMessages, pagination } = processMessageResponse(
          response.data,
          currentMessages,
        );

        // Update pagination states
        setHasOlderMessages(pagination.hasPrev);
        // Don't change hasNewerMessages state when loading older messages

        // Update messages in cache
        queryClient.setQueryData(messageKeys.list(channelId), mergedMessages);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Function to load newer messages
  const loadNewer = async () => {
    if (
      !channelId ||
      !hasNewerMessages ||
      loadingMore ||
      messagesQuery.isLoading
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      const currentMessages = messagesQuery.data || [];

      // Find the newest message to use as 'after' parameter
      if (currentMessages.length > 0) {
        // Sort by creation time to find newest
        const sortedMessages = [...currentMessages].sort(
          (a, b) => b.create_at - a.create_at,
        );
        const newestMessage = sortedMessages[0];

        // Build query parameters for newer messages using posts endpoint
        const queryParams: Record<string, any> = {
          after: newestMessage.id,
          page: 0,
          per_page: 30,
          skipFetchThreads: false,
          collapsedThreads: true,
          collapsedThreadsExtended: false,
        };

        // Fetch newer messages using posts endpoint
        const response = await api.get(
          `channels/${channelId}/posts`,
          queryParams,
        );

        // Process the response using utility function
        const { messages: mergedMessages, pagination } = processMessageResponse(
          response.data,
          currentMessages,
        );

        // Update pagination states
        setHasNewerMessages(pagination.hasNext);
        // Don't change hasOlderMessages state when loading newer messages

        // Update messages in cache
        queryClient.setQueryData(messageKeys.list(channelId), mergedMessages);
      }
    } catch (error) {
      console.error("Failed to load newer messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: CreateMessageParams) => {
      const response = await api.post<Message>("posts", messageData);
      return response.data;
    },
    onSuccess: (newMessage) => {
      // If this is a thread reply, ONLY update thread cache and parent message count
      // DON'T add it to the main message list
      if (newMessage.root_id) {
        console.debug(
          `New thread reply created for root_id=${newMessage.root_id} - updating only thread cache`,
        );

        // Add to thread cache
        queryClient.setQueryData<Message[]>(
          messageKeys.thread(newMessage.root_id),
          (oldMessages = []) => {
            // First check if oldMessages is an array and that we don't already have this message
            if (
              Array.isArray(oldMessages) &&
              !oldMessages.some((msg) => msg.id === newMessage.id)
            ) {
              // Get the parent message from the existing data if available
              const parentMsg = (oldMessages as any).parentMessage;

              // Create new array with the new message
              const updatedMessages = [...oldMessages, newMessage];

              // Re-attach the parent message as a non-enumerable property if we had it before
              if (parentMsg) {
                Object.defineProperty(updatedMessages, "parentMessage", {
                  value: parentMsg,
                  enumerable: false,
                  configurable: true,
                });
              }

              return updatedMessages;
            }
            return oldMessages || [];
          },
        );

        // Note: reply_count is updated automatically via WebSocket 'posted' event

        console.debug(
          `Thread reply created: Updated all caches for root_id=${newMessage.root_id}`,
          {
            newMessageId: newMessage.id,
            timestamp: new Date().toISOString(),
          },
        );
      } else {
        // Only add normal messages (not thread replies) to the main message list
        queryClient.setQueryData<Message[]>(
          messageKeys.list(newMessage.channel_id),
          (oldMessages = []) => {
            return [...oldMessages, newMessage];
          },
        );
      }
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Message> & { id: string }) => {
      const response = await api.put<Message>(`posts/${id}`, {
        id,
        ...updates,
      });
      return response.data;
    },
    onSuccess: (updatedMessage) => {
      // Update message in cache
      queryClient.setQueryData<Message[]>(
        messageKeys.list(updatedMessage.channel_id),
        (oldMessages = []) => {
          return oldMessages.map((message) =>
            message.id === updatedMessage.id ? updatedMessage : message,
          );
        },
      );

      // Update individual message cache
      queryClient.setQueryData(
        messageKeys.detail(updatedMessage.id),
        updatedMessage,
      );

      // If this is a thread message, also update thread cache
      if (updatedMessage.root_id) {
        queryClient.setQueryData<Message[]>(
          messageKeys.thread(updatedMessage.root_id),
          (oldMessages = []) => {
            // Get the parent message from the existing data if available
            const parentMsg = (oldMessages as any).parentMessage;

            // Create updated messages array
            const updatedMessages = oldMessages.map((message) =>
              message.id === updatedMessage.id ? updatedMessage : message,
            );

            // Re-attach the parent message as a non-enumerable property
            if (parentMsg) {
              Object.defineProperty(updatedMessages, "parentMessage", {
                value:
                  parentMsg.id === updatedMessage.id
                    ? updatedMessage
                    : parentMsg,
                enumerable: false,
                configurable: true,
              });
            }

            return updatedMessages;
          },
        );
      }
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.delete(`posts/${messageId}`);
      return messageId;
    },
    onSuccess: (messageId) => {
      // Find the message in cache to get its channel ID
      const messages =
        queryClient.getQueryData<Message[]>(
          messageKeys.list(channelId || ""),
        ) || [];
      const message = messages.find((m) => m.id === messageId);

      if (message) {
        // Update messages cache
        queryClient.setQueryData<Message[]>(
          messageKeys.list(message.channel_id),
          (oldMessages = []) => {
            return oldMessages.filter((m) => m.id !== messageId);
          },
        );

        // If this was a thread message, also update thread cache
        if (message.root_id) {
          queryClient.setQueryData<Message[]>(
            messageKeys.thread(message.root_id),
            (oldMessages = []) => {
              // Get the parent message from existing data
              const parentMsg = (oldMessages as any).parentMessage;

              // Create filtered messages array
              const filteredMessages = oldMessages.filter(
                (m) => m.id !== messageId,
              );

              // Re-attach the parent message as non-enumerable property
              // Only if parent message wasn't the one deleted
              if (parentMsg && parentMsg.id !== messageId) {
                Object.defineProperty(filteredMessages, "parentMessage", {
                  value: parentMsg,
                  enumerable: false,
                  configurable: true,
                });
              }

              return filteredMessages;
            },
          );
        }
      }

      // Remove message from cache
      queryClient.removeQueries({ queryKey: messageKeys.detail(messageId) });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File): Promise<FileInfo> => {
      if (!channelId) {
        throw new Error("Channel ID is required to upload a file");
      }

      // Create form data
      const formData = new FormData();
      formData.append("files", file);
      formData.append("channel_id", channelId);

      // Upload file
      const response = await fetch(`${api.getBaseUrl()}/api/v4/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("mattermost_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      // Parse response
      const data = await response.json();
      return data.file_infos[0];
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      emojiName,
    }: {
      messageId: string;
      emojiName: string;
    }) => {
      try {
        // First try to get the current user from the query cache
        const currentUser = queryClient.getQueryData<any>(["users", "me"]);
        let userId = currentUser?.id;

        // If not found, try to get it from localStorage
        if (!userId) {
          const userJson = localStorage.getItem("mattermost_user");
          if (userJson) {
            try {
              const user = JSON.parse(userJson);
              userId = user.id;
            } catch (e) {
              console.error("Failed to parse user from localStorage", e);
            }
          }
        }

        // If still no userId, make a direct API call
        if (!userId) {
          const meResponse = await api.get<any>("users/me");
          userId = meResponse.data.id;
        }

        // Final check before proceeding
        if (!userId) {
          throw new Error("User ID is required to add a reaction");
        }

        const response = await api.post("reactions", {
          user_id: userId,
          post_id: messageId,
          emoji_name: emojiName,
        });

        return response.data;
      } catch (error) {
        console.error("Failed to add reaction:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate messages to refresh reactions
      if (channelId) {
        queryClient.invalidateQueries({
          queryKey: messageKeys.list(channelId),
        });
      }
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      emojiName,
    }: {
      messageId: string;
      emojiName: string;
    }) => {
      await api.delete(`users/me/posts/${messageId}/reactions/${emojiName}`);
      return { messageId, emojiName };
    },
    onSuccess: () => {
      // Invalidate messages to refresh reactions
      if (channelId) {
        queryClient.invalidateQueries({
          queryKey: messageKeys.list(channelId),
        });
      }
    },
  });

  // View channel mutation (mark as read)
  const viewChannelMutation = useMutation({
    mutationFn: async () => {
      if (!channelId) {
        throw new Error("Channel ID is required to view a channel");
      }

      // Use the correct endpoint for marking a channel as viewed
      await api.post(`channels/members/me/view`, {
        channel_id: channelId,
      });
      return channelId;
    },
  });

  return {
    // Data
    messages: messagesQuery.data || [],

    // Loading states
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,

    // Pagination - separate states for each direction
    hasOlderMessages,
    hasNewerMessages,
    loadingMore,
    loadMore,
    loadNewer,

    // Actions
    refetch: messagesQuery.refetch,
    createMessage: createMessageMutation.mutateAsync,
    updateMessage: updateMessageMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    uploadFile: uploadFileMutation.mutateAsync,
    addReaction: addReactionMutation.mutateAsync,
    removeReaction: removeReactionMutation.mutateAsync,
    viewChannel: viewChannelMutation.mutateAsync,

    // Mutation states
    isCreating: createMessageMutation.isPending,
    isUpdating: updateMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isUploading: uploadFileMutation.isPending,
  };
}
