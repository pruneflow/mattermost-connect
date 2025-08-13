import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { client } from '../api/client';
import { setPost, storePostOnly, removePost, addReactionFromWebSocket, removeReactionFromWebSocket } from '../store/slices/postsSlice';
import { addPostToThread } from '../store/slices/threadsSlice';
import { selectCurrentUserId } from '../store/selectors';
import { Post } from '../api/types';

/**
 * Hook for handling message/post-related WebSocket events
 * Follows the same pattern as useChannelWebSocket, useTeamWebSocket, etc.
 * 
 * Responsibility: Handle posts data (posts.posts, posts.postsInChannel, posts.postsInThread)
 * and reactions (part of posts)
 */
export const useMessageWebSocket = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(selectCurrentUserId);

  // Handle incoming WebSocket events for messages/posts
  const handleMessageEvent = useCallback((event: string, data: Record<string, any>, broadcast?: Record<string, any>) => {
    switch (event) {
      case 'posted':
        // New message posted - handle ONLY post data, not unread counts
        // Skip if it's the current user (already handled by sendMessage)
        if (data.post) {
          try {
            const post = typeof data.post === 'string' ? JSON.parse(data.post) : data.post;
            // Skip our own messages to avoid duplicates
            if (post.user_id !== currentUserId) {
              
              if (post.root_id) {
                // Si c'est une réponse dans un thread, l'ajouter SEULEMENT au thread
                // On ajoute quand même au store global des posts pour les fichiers
                dispatch(storePostOnly(post));
                dispatch(addPostToThread({ rootPostId: post.root_id, post }));
              } else {
                // Si ce n'est pas une réponse, l'ajouter au chat standard
                dispatch(setPost(post));
              }
            }
          } catch (error) {
            console.error('Error parsing posted message:', error);
          }
        }
        break;

      case 'post_edited':
        // Message was edited
        // Skip if it's the current user (already handled by updateMessage)
        if (data.post) {
          try {
            const post = typeof data.post === 'string' ? JSON.parse(data.post) : data.post;
            // Skip our own edited messages to avoid duplicates
            if (post.user_id !== currentUserId) {
              
              if (post.root_id) {
                // Si c'est une réponse dans un thread, mettre à jour SEULEMENT le thread
                // Mettre à jour aussi le store global pour les fichiers
                dispatch(storePostOnly(post));
                dispatch(addPostToThread({ rootPostId: post.root_id, post }));
              } else {
                // Si ce n'est pas une réponse, mettre à jour le chat standard
                dispatch(setPost(post));
              }
            }
          } catch (error) {
            console.error('Error parsing edited message:', error);
          }
        }
        break;

      case 'post_deleted':
        // Message was deleted
        // Skip if it's the current user (already handled by deleteMessage)
        if (data.post) {
          try {
            const post = typeof data.post === 'string' ? JSON.parse(data.post) : data.post;
            // Skip our own deleted messages to avoid duplicates
            if (post.user_id !== currentUserId) {
              dispatch(removePost(post.id));
            }
          } catch (error) {
            console.error('Error parsing deleted message:', error);
          }
        }
        break;

      case 'reaction_added':
        // Reaction added to a message - WebSocket only (no API call)
        // Skip if it's the current user (already handled by API response)
        if (data.reaction && data.reaction.user_id !== currentUserId) {
          const reaction = data.reaction;
          dispatch(addReactionFromWebSocket({
            postId: reaction.post_id,
            emojiName: reaction.emoji_name,
            userId: reaction.user_id,
          }));
        }
        break;

      case 'reaction_removed':
        // Reaction removed from a message - WebSocket only (no API call)
        // Skip if it's the current user (already handled by API response)
        if (data.reaction && data.reaction.user_id !== currentUserId) {
          const reaction = data.reaction;
          dispatch(removeReactionFromWebSocket({
            postId: reaction.post_id,
            emojiName: reaction.emoji_name,
            userId: reaction.user_id,
          }));
        }
        break;

      case 'post_acknowledgement_added':
        // Post acknowledgement added (if using acknowledgements)
        // TODO: Implement when acknowledgements are needed
        break;

      case 'post_acknowledgement_removed':
        // Post acknowledgement removed (if using acknowledgements)
        // TODO: Implement when acknowledgements are needed
        break;

      default:
        // Unknown event type, ignore
        break;
    }
  }, [dispatch, currentUserId]);

  return {
    handleMessageEvent,
  };
};

export default useMessageWebSocket;