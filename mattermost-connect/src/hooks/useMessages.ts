import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { Message, FileInfo } from '../api/types';

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (channelId: string) => [...messageKeys.lists(), { channelId }] as const,
  details: () => [...messageKeys.all, 'detail'] as const,
  detail: (id: string) => [...messageKeys.details(), id] as const,
  infinite: (channelId: string) => [...messageKeys.list(channelId), 'infinite'] as const,
  thread: (messageId: string) => [...messageKeys.all, 'thread', messageId] as const,
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

/**
 * Hook for working with messages in a channel
 */
// Create a specific hook for thread messages
export function useThreadMessages(rootId: string | undefined, channelId: string | undefined) {
  const queryClient = useQueryClient();
  const [hasMore, setHasMore] = useState(false);
  
  // Define a specific query key for thread messages
  const threadQueryKey = [...messageKeys.all, 'thread', rootId || ''];
  
  // Fetch thread messages using a direct request to the thread endpoint
  const threadQuery = useQuery({
    queryKey: threadQueryKey,
    queryFn: async () => {
      if (!rootId || !channelId) {
        return {
          parentMessage: null,
          threadMessages: []
        };
      }
      
      try {
        console.debug(`API call to fetch thread: ${rootId} in channel ${channelId}`, {
          timestamp: new Date().toISOString()
        });
        
        // Use direct fetch to ensure we hit the right endpoint
        const baseUrl = api.getBaseUrl();
        const token = localStorage.getItem('mattermost_token');
        
        // Correctly construct the thread API URL
        const threadUrl = `${baseUrl}/api/v4/posts/${rootId}/thread`;
        console.debug(`Thread URL: ${threadUrl}`);
        
        const fetchResponse = await fetch(threadUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (!fetchResponse.ok) {
          console.error(`Thread fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
          throw new Error(`Failed to fetch thread: ${fetchResponse.status}`);
        }
        
        const data = await fetchResponse.json();
        console.debug(`Thread data received with ${Object.keys(data.posts || {}).length} posts`, {
          timestamp: new Date().toISOString()
        });
        
        // Extract messages from the response
        const { order = [], posts = {} } = data;
        
        // Convert to array of messages
        const messages = order
          .map(postId => posts[postId])
          .filter(post => !!post);
          
        // Find the parent message
        const parentMessage = posts[rootId];
        
        if (!parentMessage) {
          console.warn(`Parent message with id ${rootId} not found in thread response`);
        } else {
          console.debug(`Found parent message with id ${parentMessage.id}`);
          
          // Add or update reply count on parent message
          // @ts-ignore - We're adding a dynamic property
          parentMessage.reply_count = messages.length - 1; // All messages minus parent
          // @ts-ignore - We're adding a dynamic property
          parentMessage.has_replies = messages.length > 1;
          
          console.debug(`Parent message has reply_count=${parentMessage.reply_count}`);
        }
        
        // Exclude the parent message from thread messages and sort by creation date
        const threadMessages = messages
          .filter(message => message.id !== rootId)
          .sort((a, b) => a.create_at - b.create_at); // Sort chronologically (oldest first)
        
        console.debug(`Thread messages count: ${threadMessages.length}`, {
          messagesCount: messages.length,
          threadMessagesCount: threadMessages.length,
          timestamp: new Date().toISOString()
        });
        
        // Return both parent and thread messages
        return {
          parentMessage,
          threadMessages
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
    mutationFn: async ({ message, fileIds }: { message: string, fileIds?: string[] }) => {
      const response = await api.post('posts', {
        channel_id: channelId,
        message,
        root_id: rootId,
        file_ids: fileIds || []
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
              parentMessage: null // Will be fetched later if needed
            };
          }

          // Ensure threadMessages is an array
          const threadMessages = Array.isArray(oldData.threadMessages)
            ? oldData.threadMessages
            : [];

          // Check if message already exists to prevent duplicates
          const messageExists = threadMessages.some((m: any) => m.id === newMessage.id);

          if (!messageExists) {
            console.debug(`Adding new message ${newMessage.id} to thread cache`);
            return {
              ...oldData,
              threadMessages: [...threadMessages, newMessage]
                .sort((a, b) => a.create_at - b.create_at) // Sort chronologically (oldest first)
            };
          }

          console.debug(`Message ${newMessage.id} already exists in thread cache`);
          return oldData;
        }
      );

      // Also update the parent message's reply count in the main message list
      if (channelId && rootId) {
        try {
          console.debug(`Updating reply count for parent message ${rootId} in channel ${channelId}`);

          // First verify the current cache state
          const currentMessages = queryClient.getQueryData<Message[]>(messageKeys.list(channelId));
          const hasValidCache = Array.isArray(currentMessages);

          if (hasValidCache) {
            // If we have valid cache, update it
            queryClient.setQueryData<Message[]>(
              messageKeys.list(channelId),
              (oldMessages = []) => {
                if (!Array.isArray(oldMessages) || oldMessages.length === 0) {
                  console.debug(`No valid messages cache to update for channel ${channelId}`);
                  return [];
                }

                // Find the parent message in the list
                const parentIndex = oldMessages.findIndex(msg => msg.id === rootId);

                if (parentIndex === -1) {
                  console.debug(`Parent message ${rootId} not found in channel messages cache`);
                  return oldMessages; // Parent not found, don't change anything
                }

                // Create a new array with the updated message
                const updatedMessages = [...oldMessages];

                // Clone the message to avoid mutating the cache directly
                const updatedMsg = { ...updatedMessages[parentIndex] };

                // Update or initialize reply_count
                // @ts-ignore - We're adding a dynamic property
                updatedMsg.reply_count = ((updatedMsg.reply_count || 0) + 1);
                // @ts-ignore - We're adding a dynamic property
                updatedMsg.has_replies = true;

                console.debug(`Updated parent message reply_count to ${updatedMsg.reply_count}`);

                // Replace the old message with the updated one
                updatedMessages[parentIndex] = updatedMsg;

                return updatedMessages;
              }
            );
          } else {
            console.debug(`No messages cache exists yet for channel ${channelId}`);
            // Force a refetch of the channel messages to get updated thread counts
            queryClient.invalidateQueries({
              queryKey: messageKeys.list(channelId)
            });
          }
        } catch (error) {
          console.error(`Error updating parent message reply count:`, error);
        }
      }
    }
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
    threadKey: threadQueryKey  // Expose the query key for external cache manipulation
  };
}

export function useMessages(channelId: string | undefined, params: MessageParams = {}) {
  const queryClient = useQueryClient();
  
  // Default params
  const defaultParams = {
    page: 0,
    perPage: 50, // Default page size
    includeDeleted: false,
    ...params,
  };
  
  // State for infinite query
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Skip query if channelId is undefined
  const enabled = !!channelId;

  // Fetch messages for channel
  const messagesQuery = useQuery({
    queryKey: messageKeys.list(channelId || ''),
    queryFn: async () => {
      // Build query parameters
      const queryParams: Record<string, any> = {
        page: defaultParams.page,
        per_page: defaultParams.perPage,
      };
      
      if (defaultParams.since) {
        queryParams.since = defaultParams.since;
      }
      
      if (defaultParams.before) {
        queryParams.before = defaultParams.before;
      }
      
      if (defaultParams.after) {
        queryParams.after = defaultParams.after;
      }
      
      if (defaultParams.includeDeleted) {
        queryParams.include_deleted = true;
      }
      
      // Add root_id if specified for thread messages
      if (defaultParams.root_id) {
        queryParams.root_id = defaultParams.root_id;
      }
      
      // Either fetch messages for the channel or get thread messages
      let response;
      if (defaultParams.root_id) {
        // Fetch thread messages using the thread endpoint
        // Important: Use the correct API URL format WITHOUT /api/v4/ prefix
        console.debug(`useMessages: Fetching thread for root_id=${defaultParams.root_id}`);
        try {
          // IMPORTANT: Force a direct call to the thread endpoint
          // We're avoiding any caching or interceptors by making a direct fetch
          // This is critical for thread functionality
          const baseUrl = api.getBaseUrl();
          const token = localStorage.getItem('mattermost_token');
          
          console.debug(`useMessages: Attempting direct fetch of thread with URL: ${baseUrl}/api/v4/posts/${defaultParams.root_id}/thread`);
          
          // Make a direct fetch call to ensure we hit the right endpoint
          const fetchResponse = await fetch(`${baseUrl}/api/v4/posts/${defaultParams.root_id}/thread`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch thread: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }
          
          // Parse the response as JSON
          const data = await fetchResponse.json();
          response = { data, status: fetchResponse.status };
          
          console.debug(`useMessages: Thread fetch successful for root_id=${defaultParams.root_id}`, 
            { responseStatus: response.status, responseData: response.data });
        } catch (error) {
          console.error(`useMessages: Error fetching thread for root_id=${defaultParams.root_id}`, error);
          throw error;
        }
      } else {
        // Fetch channel messages
        console.debug(`useMessages: Fetching channel messages for channelId=${channelId}`, queryParams);
        response = await api.get(`channels/${channelId}/posts`, queryParams);
      }
      
      // Mattermost API returns posts in a different structure
      // { order: string[], posts: { [messageId]: Message } }
      const { order = [], posts = {} } = response.data;
      
      // Convert to array of messages
      const messages = order
        .map(postId => posts[postId])
        .filter(post => !!post);
      
      // For thread messages, we want all the replies excluding the parent message
      if (defaultParams.root_id) {
        console.debug(`useMessages: Processing thread data for root_id=${defaultParams.root_id}`, 
          { 
            messagesLength: messages.length, 
            messageIds: messages.map(m => m.id),
            responseStructure: {
              hasOrder: Array.isArray(response.data.order),
              orderLength: Array.isArray(response.data.order) ? response.data.order.length : 0,
              hasPosts: !!response.data.posts,
              postsCount: response.data.posts ? Object.keys(response.data.posts).length : 0
            }
          });
          
        // Fix: Better handling for parent message in thread responses
        // Check if we received a valid response with the parent post
        let parentMessage;
        
        // First try to find the parent message by ID in the posts object
        if (response.data.posts && response.data.posts[defaultParams.root_id]) {
          parentMessage = response.data.posts[defaultParams.root_id];
          console.debug(`useMessages: Found parent message in response.data.posts by ID match`, 
            { parentId: parentMessage.id });
        } 
        // If not found, try to find it in the messages array
        else {
          parentMessage = messages.find(message => message.id === defaultParams.root_id);
          if (parentMessage) {
            console.debug(`useMessages: Found parent message in messages array`, 
              { parentId: parentMessage.id });
          } else {
            console.warn(`useMessages: Parent message not found in response for root_id=${defaultParams.root_id}`);
          }
        }
        
        // Exclude the parent message from the thread messages (it will be displayed separately)
        const threadMessages = messages.filter(
          message => message.id !== defaultParams.root_id
        );
        
        console.debug(`useMessages: Found parent message for thread?`, 
          { found: !!parentMessage, parentMessageId: parentMessage?.id });
        
        // Attach the parent message as a non-enumerable property for components that need it
        if (parentMessage) {
          Object.defineProperty(threadMessages, 'parentMessage', {
            value: parentMessage,
            enumerable: false,
            configurable: true
          });
          console.debug(`useMessages: Attached parent message to threadMessages`);
        } else {
          console.warn(`useMessages: No parent message found with id=${defaultParams.root_id}`);
        }
        
        // For thread messages, we generally don't need to handle pagination
        setHasMore(false);
        
        console.debug(`useMessages: Returning ${threadMessages.length} thread messages`);
        // Return just the thread replies
        return threadMessages;
      }
      
      // For normal channel messages:
      // We need to preserve thread reply information while filtering for display
      
      // Before filtering, calculate reply counts for each message
      const replyCountMap = new Map<string, number>();
      
      // Count replies for each parent message
      messages.forEach(message => {
        if (message.root_id) {
          // This is a reply, increment count for parent
          const rootId = message.root_id;
          replyCountMap.set(rootId, (replyCountMap.get(rootId) || 0) + 1);
        }
      });
      
      // Filter out messages that are replies in threads
      const filteredMessages = messages.filter(message => !message.root_id);
      
      // Enhance messages with reply count data
      filteredMessages.forEach(message => {
        // Add reply_count property if it doesn't exist
        if (replyCountMap.has(message.id)) {
          // @ts-ignore - We're adding a dynamic property
          message.reply_count = replyCountMap.get(message.id);
          
          // Also add a hasReplies flag for easier checks
          // @ts-ignore - We're adding a dynamic property
          message.has_replies = true;
          
          console.debug(`Enhanced message ${message.id} with reply_count=${replyCountMap.get(message.id)}`);
        }
      });
      
      console.debug(`Filtered ${messages.length - filteredMessages.length} thread replies from main message list`);
      
      // If we got less than perPage, there are no more messages
      if (filteredMessages.length < defaultParams.perPage) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      return filteredMessages;
    },
    enabled,
  });
  
  // Function to load more messages
  const loadMore = async () => {
    if (!channelId || !hasMore || loadingMore || messagesQuery.isLoading) {
      return;
    }
    
    setLoadingMore(true);
    
    try {
      const currentMessages = messagesQuery.data || [];
      
      // Find the oldest message to use as 'before' parameter
      if (currentMessages.length > 0) {
        // Sort by creation time to find oldest
        const sortedMessages = [...currentMessages].sort((a, b) => a.create_at - b.create_at);
        const oldestMessage = sortedMessages[0];
        
        // Build query parameters for older messages
        const queryParams: Record<string, any> = {
          before: oldestMessage.id,
          per_page: defaultParams.perPage,
        };
        
        if (defaultParams.includeDeleted) {
          queryParams.include_deleted = true;
        }
        
        // Fetch older messages
        const response = await api.get(
          `channels/${channelId}/posts`,
          queryParams
        );
        
        // Mattermost API returns posts in a different structure
        // { order: string[], posts: { [messageId]: Message } }
        const { order = [], posts = {} } = response.data;
        
        // Convert to array of messages
        const olderMessages = order
          .map(postId => posts[postId])
          .filter(post => !!post);
        
        // If we got less than perPage, there are no more messages
        if (olderMessages.length < defaultParams.perPage) {
          setHasMore(false);
        }
        
        // Merge old and new messages, avoiding duplicates
        const messageMap = new Map<string, Message>();
        [...currentMessages, ...olderMessages].forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        const mergedMessages = Array.from(messageMap.values());
        
        // Update messages in cache
        queryClient.setQueryData(
          messageKeys.list(channelId),
          mergedMessages
        );
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: CreateMessageParams) => {
      const response = await api.post<Message>('posts', messageData);
      return response.data;
    },
    onSuccess: (newMessage) => {
      // If this is a thread reply, ONLY update thread cache and parent message count
      // DON'T add it to the main message list
      if (newMessage.root_id) {
        console.debug(`New thread reply created for root_id=${newMessage.root_id} - updating only thread cache`);

        // Add to thread cache
        queryClient.setQueryData<Message[]>(
          messageKeys.thread(newMessage.root_id),
          (oldMessages = []) => {
            // First check if oldMessages is an array and that we don't already have this message
            if (Array.isArray(oldMessages) && !oldMessages.some(msg => msg.id === newMessage.id)) {
              // Get the parent message from the existing data if available
              const parentMsg = (oldMessages as any).parentMessage;

              // Create new array with the new message
              const updatedMessages = [...oldMessages, newMessage];

              // Re-attach the parent message as a non-enumerable property if we had it before
              if (parentMsg) {
                Object.defineProperty(updatedMessages, 'parentMessage', {
                  value: parentMsg,
                  enumerable: false,
                  configurable: true
                });
              }

              return updatedMessages;
            }
            return oldMessages || [];
          }
        );

        // Update the parent message's reply count in the channel messages list
        queryClient.setQueryData<Message[]>(
          messageKeys.list(newMessage.channel_id),
          (oldMessages = []) => {
            if (!oldMessages) return [];

            // Find the parent message in the list
            return oldMessages.map(msg => {
              // If this is the parent message, update its reply count
              if (msg.id === newMessage.root_id) {
                console.debug(`Updating parent message ${msg.id} reply count`);

                // Clone the message to avoid mutating the cache directly
                const updatedMsg = { ...msg };

                // Update or initialize reply_count
                // @ts-ignore - We're adding a dynamic property
                updatedMsg.reply_count = ((updatedMsg.reply_count || 0) + 1);
                // @ts-ignore - We're adding a dynamic property
                updatedMsg.has_replies = true;

                console.debug(`Updated parent message reply_count to ${updatedMsg.reply_count}`);

                return updatedMsg;
              }
              return msg;
            });
          }
        );

        // Also update the thread query cache directly
        const threadKey = [...messageKeys.all, 'thread', newMessage.root_id];
        queryClient.setQueryData(
          threadKey,
          (oldData: any = { threadMessages: [] }) => {
            return {
              ...oldData,
              threadMessages: [...(oldData.threadMessages || []), newMessage]
            };
          }
        );

        console.debug(`Thread reply created: Updated all caches for root_id=${newMessage.root_id}`, {
          newMessageId: newMessage.id,
          timestamp: new Date().toISOString()
        });
      } else {
        // Only add normal messages (not thread replies) to the main message list
        queryClient.setQueryData<Message[]>(
          messageKeys.list(newMessage.channel_id),
          (oldMessages = []) => {
            return [...oldMessages, newMessage];
          }
        );
      }
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Message> & { id: string }) => {
      const response = await api.put<Message>(`posts/${id}`, updates);
      return response.data;
    },
    onSuccess: (updatedMessage) => {
      // Update message in cache
      queryClient.setQueryData<Message[]>(
        messageKeys.list(updatedMessage.channel_id),
        (oldMessages = []) => {
          return oldMessages.map(message => 
            message.id === updatedMessage.id ? updatedMessage : message
          );
        }
      );
      
      // Update individual message cache
      queryClient.setQueryData(
        messageKeys.detail(updatedMessage.id),
        updatedMessage
      );
      
      // If this is a thread message, also update thread cache
      if (updatedMessage.root_id) {
        queryClient.setQueryData<Message[]>(
          messageKeys.thread(updatedMessage.root_id),
          (oldMessages = []) => {
            // Get the parent message from the existing data if available
            const parentMsg = (oldMessages as any).parentMessage;
            
            // Create updated messages array
            const updatedMessages = oldMessages.map(message => 
              message.id === updatedMessage.id ? updatedMessage : message
            );
            
            // Re-attach the parent message as a non-enumerable property
            if (parentMsg) {
              Object.defineProperty(updatedMessages, 'parentMessage', {
                value: parentMsg.id === updatedMessage.id ? updatedMessage : parentMsg,
                enumerable: false,
                configurable: true
              });
            }
            
            return updatedMessages;
          }
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
      const messages = queryClient.getQueryData<Message[]>(messageKeys.list(channelId || '')) || [];
      const message = messages.find(m => m.id === messageId);
      
      if (message) {
        // Update messages cache
        queryClient.setQueryData<Message[]>(
          messageKeys.list(message.channel_id),
          (oldMessages = []) => {
            return oldMessages.filter(m => m.id !== messageId);
          }
        );
        
        // If this was a thread message, also update thread cache
        if (message.root_id) {
          queryClient.setQueryData<Message[]>(
            messageKeys.thread(message.root_id),
            (oldMessages = []) => {
              // Get the parent message from existing data
              const parentMsg = (oldMessages as any).parentMessage;
              
              // Create filtered messages array
              const filteredMessages = oldMessages.filter(m => m.id !== messageId);
              
              // Re-attach the parent message as non-enumerable property
              // Only if parent message wasn't the one deleted
              if (parentMsg && parentMsg.id !== messageId) {
                Object.defineProperty(filteredMessages, 'parentMessage', {
                  value: parentMsg,
                  enumerable: false,
                  configurable: true
                });
              }
              
              return filteredMessages;
            }
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
        throw new Error('Channel ID is required to upload a file');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('files', file);
      formData.append('channel_id', channelId);
      
      // Upload file
      const response = await fetch(`${api.getBaseUrl()}/api/v4/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('mattermost_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      // Parse response
      const data = await response.json();
      return data.file_infos[0];
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emojiName }: { messageId: string; emojiName: string }) => {
      try {
        // First try to get the current user from the query cache
        const currentUser = queryClient.getQueryData<any>(['users', 'me']);
        let userId = currentUser?.id;
        
        // If not found, try to get it from localStorage
        if (!userId) {
          const userJson = localStorage.getItem('mattermost_user');
          if (userJson) {
            try {
              const user = JSON.parse(userJson);
              userId = user.id;
            } catch (e) {
              console.error('Failed to parse user from localStorage', e);
            }
          }
        }
        
        // If still no userId, make a direct API call
        if (!userId) {
          const meResponse = await api.get<any>('users/me');
          userId = meResponse.data.id;
        }
        
        // Final check before proceeding
        if (!userId) {
          throw new Error('User ID is required to add a reaction');
        }
        
        const response = await api.post('reactions', {
          user_id: userId,
          post_id: messageId,
          emoji_name: emojiName,
        });
        
        return response.data;
      } catch (error) {
        console.error('Failed to add reaction:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate messages to refresh reactions
      if (channelId) {
        queryClient.invalidateQueries({ queryKey: messageKeys.list(channelId) });
      }
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emojiName }: { messageId: string; emojiName: string }) => {
      await api.delete(`users/me/posts/${messageId}/reactions/${emojiName}`);
      return { messageId, emojiName };
    },
    onSuccess: () => {
      // Invalidate messages to refresh reactions
      if (channelId) {
        queryClient.invalidateQueries({ queryKey: messageKeys.list(channelId) });
      }
    },
  });

  // View channel mutation (mark as read)
  const viewChannelMutation = useMutation({
    mutationFn: async () => {
      if (!channelId) {
        throw new Error('Channel ID is required to view a channel');
      }
      
      // Use the correct endpoint for marking a channel as viewed
      await api.post(`channels/members/me/view`, {
        channel_id: channelId
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
    
    // Pagination
    hasMore,
    loadingMore,
    loadMore,
    
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