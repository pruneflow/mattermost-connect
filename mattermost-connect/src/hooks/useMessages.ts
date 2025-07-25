import { useCallback } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updatePost, deletePost, toggleReaction } from '../store/slices/entitiesSlice';

export const useMessages = () => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.entities.users.currentUserId);

  const updateMessage = useCallback(async (postId: string, message: string) => {
    try {
      await dispatch(updatePost({ postId, message })).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  }, [dispatch]);

  const deleteMessage = useCallback(async (postId: string) => {
    try {
      await dispatch(deletePost({ postId })).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, [dispatch]);

  const copyMessage = useCallback(async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch (error) {
      console.error('Failed to copy message:', error);
      throw error;
    }
  }, []);

  return {
    updateMessage,
    deleteMessage,
    copyMessage,
  };
};

// Hook spécifique pour les réactions
export const useReactionToggle = (postId: string) => {
  const dispatch = useAppDispatch();

  const toggleReactionHandler = useCallback(async (emojiName: string) => {
    try {
      await dispatch(toggleReaction({ postId, emojiName })).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      throw error;
    }
  }, [dispatch, postId]);

  return {
    toggleReaction: toggleReactionHandler,
  };
};