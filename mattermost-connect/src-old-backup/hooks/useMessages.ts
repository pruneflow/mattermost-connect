import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { Message } from '../api/types';
import { WebSocketSingleton } from './useWebSocket';

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (channelId: string) => [...messageKeys.lists(), channelId] as const,
  contextual: (channelId: string, userId: string) => [...messageKeys.list(channelId), 'contextual', userId] as const,
};

interface UseMessagesOptions {
  channelId: string;
  userId?: string;
  enabled?: boolean;
}

interface MessagesPaginationResponse {
  order: string[];
  posts: Record<string, Message>;
  next_post_id: string | null;
  prev_post_id: string | null;
  has_next: boolean;
  first_inaccessible_post_time?: number;
}

/**
 * Hook to manage messages for a specific channel with optimized performance
 */
export function useMessages(channelIdOrOptions?: string | UseMessagesOptions, userId?: string, enabled = true) {
  // Handle both old and new API
  const options: UseMessagesOptions = typeof channelIdOrOptions === 'string' 
    ? { channelId: channelIdOrOptions, userId, enabled } 
    : channelIdOrOptions || { channelId: '', userId, enabled };
  
  const { channelId, userId: resolvedUserId = userId, enabled: isEnabled = enabled } = options;
  const queryClient = useQueryClient();
  
  // State for channel-specific management
  const [lastViewedAt, setLastViewedAt] = useState<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastViewedMessageId, setLastViewedMessageId] = useState<string | null>(null);
  const [lastViewCallTime, setLastViewCallTime] = useState(0);
  const [unreadDividerMessageId, setUnreadDividerMessageId] = useState<string | null>(null);

  // Reset state when channel changes
  useEffect(() => {
    // Batch state updates to minimize re-renders
    setLastViewedAt(null);
    setIsAtBottom(true);
    setLastViewedMessageId(null);
    setLastViewCallTime(0);
    setUnreadDividerMessageId(null);
  }, [channelId]);

  // EXACT Mattermost implementation - getPostsUnread 
  const messagesQuery = useQuery({
    queryKey: messageKeys.contextual(channelId, resolvedUserId || ''),
    queryFn: async () => {
      if (!resolvedUserId) throw new Error('User ID required for contextual messages');
      
      try {
        // EXACT Mattermost API call: getPostsUnread with exact parameters
        const DEFAULT_LIMIT_BEFORE = 30;
        const DEFAULT_LIMIT_AFTER = 30;
        const fetchThreads = false; // Don't fetch threads for main channel view
        const collapsedThreads = true;
        const collapsedThreadsExtended = false;
        
        const unreadResponse = await api.get(`/users/${resolvedUserId}/channels/${channelId}/posts/unread`, {
          limit_before: DEFAULT_LIMIT_BEFORE,
          limit_after: DEFAULT_LIMIT_AFTER,
          skipFetchThreads: !fetchThreads,
          collapsedThreads: collapsedThreads,
          collapsedThreadsExtended: collapsedThreadsExtended
        });
        
        const unreadData = unreadResponse.data as MessagesPaginationResponse;
        
        // Mattermost structure: PostList with order array + posts object
        if (unreadData.order && unreadData.posts) {
          return unreadData;
        }
        
        // Fallback: use regular getPosts like Mattermost does
        const fallbackResponse = await api.get(`/channels/${channelId}/posts`, {
          page: 0,
          per_page: 60,
          skipFetchThreads: !fetchThreads,
          collapsedThreads: collapsedThreads,
          collapsedThreadsExtended: collapsedThreadsExtended
        });
        return fallbackResponse.data as MessagesPaginationResponse;
        
      } catch (error) {
        // Final fallback
        const response = await api.get(`/channels/${channelId}/posts?page=0&per_page=60`);
        return response.data as MessagesPaginationResponse;
      }
    },
    enabled: isEnabled && !!channelId && !!resolvedUserId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Calculer hasNewerMessages et hasOlderMessages basé sur Mattermost API response
  // Il y a des messages plus récents si next_post_id n'est pas null
  const hasNewerMessages = !!(messagesQuery.data?.next_post_id && messagesQuery.data.next_post_id !== '');
  
  // Il y a des messages plus anciens si prev_post_id n'est pas null  
  const hasOlderMessages = !!(messagesQuery.data?.prev_post_id && messagesQuery.data.prev_post_id !== '');

  // Process messages from API response - Mattermost way: use order array + filter threads
  const messages = useMemo(() => {
    if (!messagesQuery.data?.order || !messagesQuery.data?.posts) {
      return [];
    }
    
    // Follow Mattermost approach: use order array to maintain exact API ordering
    const processedMessages = messagesQuery.data.order
      .map(id => messagesQuery.data?.posts[id])
      .filter(Boolean)
      // Filter out thread replies (messages with root_id) from main channel view
      .filter(message => !message.root_id || message.root_id === '')
      // Keep the order from API (already chronological)
      .sort((a, b) => a.create_at - b.create_at);
      
    return processedMessages;
  }, [messagesQuery.data]);

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (!isEnabled || !channelId) return;

    const unsubscribePosted = WebSocketSingleton.subscribeToEvent('posted', (event) => {
      try {
        const post = JSON.parse(event.data?.post || '{}') as Message;
        if (post.channel_id === channelId) {
          queryClient.setQueryData<MessagesPaginationResponse>(
            messageKeys.contextual(channelId, userId || ''),
            (oldData) => {
              if (!oldData) return oldData;
              
              // Avoid duplicates
              if (oldData.posts[post.id]) return oldData;
              
              // Mattermost way: maintain order array + posts object structure
              return {
                ...oldData,
                order: [...oldData.order, post.id].sort((a, b) => {
                  const msgA = oldData.posts[a] || (a === post.id ? post : null);
                  const msgB = oldData.posts[b] || (b === post.id ? post : null);
                  if (!msgA || !msgB) return 0;
                  return msgA.create_at - msgB.create_at;
                }),
                posts: { ...oldData.posts, [post.id]: post },
                // Update pagination markers if this is the newest message
                next_post_id: null
              };
            }
          );
        }
      } catch (error) {
        console.error('Error handling posted event:', error);
      }
    });

    const unsubscribeUpdated = WebSocketSingleton.subscribeToEvent('post_updated', (event) => {
      try {
        const post = JSON.parse(event.data?.post || '{}') as Message;
        if (post.channel_id === channelId) {
          queryClient.setQueryData<MessagesPaginationResponse>(
            messageKeys.contextual(channelId, userId || ''),
            (oldData) => {
              if (!oldData || !oldData.posts[post.id]) return oldData;
              
              return {
                ...oldData,
                posts: { ...oldData.posts, [post.id]: post }
              };
            }
          );
        }
      } catch (error) {
        console.error('Error handling post_updated event:', error);
      }
    });

    const unsubscribeDeleted = WebSocketSingleton.subscribeToEvent('post_deleted', (event) => {
      try {
        const { post } = event.data || {};
        const postData = typeof post === 'string' ? JSON.parse(post) : post;
        
        if (postData.channel_id === channelId) {
          queryClient.setQueryData<MessagesPaginationResponse>(
            messageKeys.contextual(channelId, userId || ''),
            (oldData) => {
              if (!oldData) return oldData;
              
              const newOrder = oldData.order.filter(id => id !== postData.id);
              const newPosts = { ...oldData.posts };
              delete newPosts[postData.id];
              
              return {
                ...oldData,
                order: newOrder,
                posts: newPosts
              };
            }
          );
        }
      } catch (error) {
        console.error('Error handling post_deleted event:', error);
      }
    });

    return () => {
      unsubscribePosted();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [channelId, resolvedUserId, queryClient, isEnabled]);

  // EXACT Mattermost pagination - getPostsBefore
  const loadOlderMessages = useCallback(async () => {
    if (!messagesQuery.data || messagesQuery.isLoading || !hasOlderMessages) return;
    
    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    try {
      // EXACT Mattermost getPostsBefore API call
      const response = await api.get(`/channels/${channelId}/posts`, {
        before: oldestMessage.id,
        page: 0,
        per_page: 60,
        skipFetchThreads: true,
        collapsedThreads: true,
        collapsedThreadsExtended: false
      });
      
      const data = response.data as MessagesPaginationResponse;
      
      if (data.order && data.posts) {
        queryClient.setQueryData<MessagesPaginationResponse>(
          messageKeys.contextual(channelId, resolvedUserId || ''),
          (oldData) => {
            if (!oldData) return oldData;
            
            // EXACT Mattermost merge logic for older messages
            const existingIds = new Set(oldData.order);
            const newOrderIds = data.order.filter(id => !existingIds.has(id));
            
            return {
              ...oldData,
              order: [...newOrderIds, ...oldData.order], // Prepend older messages
              posts: { ...data.posts, ...oldData.posts },
              prev_post_id: data.prev_post_id,
              has_next: data.has_next,
              first_inaccessible_post_time: Math.max(
                oldData.first_inaccessible_post_time || 0,
                data.first_inaccessible_post_time || 0
              ) || undefined
            };
          }
        );
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    }
  }, [channelId, resolvedUserId, messages, messagesQuery.data, messagesQuery.isLoading, queryClient, hasOlderMessages]);

  // EXACT Mattermost pagination - getPostsAfter
  const loadNewerMessages = useCallback(async () => {
    if (!messagesQuery.data || messagesQuery.isLoading || !messagesQuery.data.next_post_id) return;
    
    const newestMessage = messages[messages.length - 1];
    if (!newestMessage) return;

    try {
      // EXACT Mattermost getPostsAfter API call
      const response = await api.get(`/channels/${channelId}/posts`, {
        after: newestMessage.id,
        page: 0,
        per_page: 60,
        skipFetchThreads: true,
        collapsedThreads: true,
        collapsedThreadsExtended: false
      });
      
      const data = response.data as MessagesPaginationResponse;
      
      if (data.order && data.posts) {
        queryClient.setQueryData<MessagesPaginationResponse>(
          messageKeys.contextual(channelId, resolvedUserId || ''),
          (oldData) => {
            if (!oldData) return oldData;
            
            // EXACT Mattermost merge logic for newer messages
            const existingIds = new Set(oldData.order);
            const newOrderIds = data.order.filter(id => !existingIds.has(id));
            
            return {
              ...oldData,
              order: [...oldData.order, ...newOrderIds], // Append newer messages
              posts: { ...oldData.posts, ...data.posts },
              next_post_id: data.next_post_id,
              first_inaccessible_post_time: Math.max(
                oldData.first_inaccessible_post_time || 0,
                data.first_inaccessible_post_time || 0
              ) || undefined
            };
          }
        );
      }
    } catch (error) {
      console.error('Error loading newer messages:', error);
    }
  }, [channelId, resolvedUserId, messages, messagesQuery.data, messagesQuery.isLoading, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, fileIds, rootId }: { content: string; fileIds?: string[]; rootId?: string }) => {
      const response = await api.post('/posts', {
        channel_id: channelId,
        message: content,
        file_ids: fileIds || [],
        ...(rootId && { root_id: rootId })
      });
      return response.data;
    },
    onSuccess: () => {
      // WebSocket will update UI
    },
    onError: (error) => {
      console.error('Error sending message:', error);
    }
  });

  // Reaction mutations
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emojiName }: { messageId: string; emojiName: string }) => {
      if (!resolvedUserId) {
        throw new Error('User ID is required for adding reactions');
      }
      
      console.log('🔥 Adding reaction:', { user_id: resolvedUserId, post_id: messageId, emoji_name: emojiName });
      
      await api.post('/reactions', {
        user_id: resolvedUserId,
        post_id: messageId,
        emoji_name: emojiName
      });
    },
    onSuccess: (_, { emojiName }) => {
      console.log(`✅ Reaction ${emojiName} added - WebSocket will update UI`);
    }
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emojiName }: { messageId: string; emojiName: string }) => {
      await api.delete(`/users/${resolvedUserId}/posts/${messageId}/reactions/${emojiName}`);
    },
    onSuccess: (_, { emojiName }) => {
      console.log(`✅ Reaction ${emojiName} removed - WebSocket will update UI`);
    }
  });

  // Mark channel as viewed - DISABLED FOR NOW
  const markChannelAsViewed = useCallback(async (messageCreateAt?: number) => {
    // Disabled - all API calls to /channels/members/me/view removed
    console.log('markChannelAsViewed called but disabled');
    return;
    
    // if (!channelId || !userId) return;
    // const currentTime = Date.now();
    // if (currentTime - lastViewCallTime < 1000) return;
    // try {
    //   await api.post('/channels/members/me/view', {
    //     channel_id: channelId,
    //     prev_viewed_at: messageCreateAt || 0
    //   });
    //   setLastViewCallTime(currentTime);
    //   WebSocketSingleton.emitLocalEvent('channel_viewed', {
    //     channel_id: channelId,
    //     user_id: userId,
    //     total_msg_count: 0,
    //     total_msg_count_root: 0
    //   });
    // } catch (error) {
    //   console.error('❌ Error marking channel as viewed:', error);
    // }
  }, [channelId, resolvedUserId, lastViewCallTime]);

  // Note: Channel viewing disabled for now - will be re-implemented later
  // useEffect(() => {
  //   if (!isEnabled || !channelId || !resolvedUserId) return;
  //   void markChannelAsViewed();
  // }, [isEnabled, channelId, resolvedUserId]);

  return {
    messages,
    loading: messagesQuery.isLoading,
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    hasMore: hasOlderMessages,
    hasOlderMessages,
    hasNewerMessages,
    loadingMore: messagesQuery.isLoading,
    
    // Actions
    sendMessage: (content: string, fileIds?: string[]) => 
      sendMessageMutation.mutateAsync({ content, fileIds }),
    addReaction: (params: { messageId: string; emojiName: string }) => 
      addReactionMutation.mutateAsync(params),
    removeReaction: (params: { messageId: string; emojiName: string }) => 
      removeReactionMutation.mutateAsync(params),
    createMessage: (message: any) => 
      sendMessageMutation.mutateAsync({ 
        content: message.message, 
        fileIds: message.file_ids,
        rootId: message.root_id 
      }),
    
    loadOlderMessages,
    loadNewerMessages,
    loadMore: loadOlderMessages,
    loadNewer: loadNewerMessages,
    markAsRead: markChannelAsViewed,
    markChannelAsViewed,
    refetch: messagesQuery.refetch,
    
    // Mutations for MessageActions compatibility
    updateMessage: async (messageUpdate: { id: string; message: string }) => {
      await api.put(`/posts/${messageUpdate.id}`, { id: messageUpdate.id, message: messageUpdate.message });
    },
    deleteMessage: async (messageId: string) => {
      await api.delete(`/posts/${messageId}`);
    },
    
    // Channel view method for MessageContainer compatibility
    viewChannel: markChannelAsViewed,
    
    // State
    isAtBottom,
    setIsAtBottom,
    lastViewedMessageId,
    setLastViewedMessageId,
    unreadDividerMessageId,
    setUnreadDividerMessageId,
    lastViewedAt,
    
    // Scroll and positioning utilities
    updateScrollPosition: setIsAtBottom,
    getUnreadDividerPosition: (channelMemberLastViewed?: number) => {
      if (!channelMemberLastViewed || messages.length === 0) return -1;
      
      // Mattermost logic: find first unread message
      const firstUnreadIndex = messages.findIndex(msg => msg.create_at > channelMemberLastViewed);
      
      // No unread messages found
      if (firstUnreadIndex === -1) return -1;
      
      // If first message is unread, no divider (show at top)
      if (firstUnreadIndex === 0) return -1;
      
      // Return index where divider should be placed (after last read message)
      return firstUnreadIndex - 1;
    },
    
    // Mutation states
    isSending: sendMessageMutation.isPending,
    isAddingReaction: addReactionMutation.isPending,
    isRemovingReaction: removeReactionMutation.isPending
  };
}

/**
 * Hook to manage thread messages for a specific thread
 */
export function useThreadMessages(threadId?: string, enabledOrChannelId?: boolean | string) {
  // Legacy compatibility: if second param is string, ignore it for now
  const enabled = typeof enabledOrChannelId === 'boolean' ? enabledOrChannelId : true;
  const queryClient = useQueryClient();

  // Fetch thread messages
  const threadQuery = useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const response = await api.get(`/posts/${threadId}/thread`);
      return response.data as MessagesPaginationResponse;
    },
    enabled: enabled && !!threadId,
    staleTime: 30000,
  });

  // Process thread messages
  const messages = useMemo(() => {
    if (!threadQuery.data?.order || !threadQuery.data?.posts) return [];
    
    return threadQuery.data.order
      .map(id => threadQuery.data?.posts[id])
      .filter(Boolean)
      .sort((a, b) => a.create_at - b.create_at);
  }, [threadQuery.data]);

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ content, channelId }: { content: string; channelId: string }) => {
      const response = await api.post('/posts', {
        channel_id: channelId,
        message: content,
        root_id: threadId
      });
      return response.data;
    },
    onSuccess: () => {
      // Refetch thread messages
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    }
  });

  return {
    messages,
    threadMessages: messages,
    parentMessage: messages[0], // First message is usually the parent
    loading: threadQuery.isLoading,
    isLoading: threadQuery.isLoading,
    error: threadQuery.error,
    createReply: (content: string, channelId: string) => 
      sendReplyMutation.mutateAsync({ content, channelId }),
    isSending: sendReplyMutation.isPending,
    isReplying: sendReplyMutation.isPending,
    refetch: threadQuery.refetch,
    threadKey: ['thread', threadId]
  };
}