import { useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { setLoading, setError, setSuccess } from '../store/slices/loadingSlice';
import { selectIsLoading, selectError } from '../store/slices/loadingSlice';
import type { LoadingKey } from '../types/loading.types';

/**
 * useLoading hook - Simple loading state management
 * 
 * Features:
 * - Simple loading states (no cache TTL)
 * - WebSocket events will update data freshness
 * - Prevents duplicate API calls
 */
export const useLoading = () => {
  const dispatch = useAppDispatch();
  const loadingState = useAppSelector(state => state.loading);

  /**
   * Main loading wrapper - handles loading states and error management
   */
  const withLoading = useCallback(
    async <T>(
      key: LoadingKey, 
      asyncFn: () => Promise<T>,
      options?: {
        skipIfLoading?: boolean; // Prevent duplicate requests
      }
    ): Promise<T> => {
      const { skipIfLoading = true } = options || {};

      // Prevent duplicate requests
      if (skipIfLoading && selectIsLoading({ loading: loadingState }, key)) {
        throw new Error(`Request ${key} already in progress`);
      }

      // Start loading
      dispatch(setLoading({ key, isLoading: true }));

      try {
        const result = await asyncFn();
        
        // Mark as successful
        dispatch(setSuccess({ key }));
        
        return result;
      } catch (error: any) {
        // Set error state
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        dispatch(setError({ key, error: errorMessage }));
        
        // Re-throw for component error handling
        throw error;
      }
    }, 
    [dispatch, loadingState]
  );

  // Simple getter functions
  const isLoading = useCallback(
    (key: LoadingKey): boolean => selectIsLoading({ loading: loadingState }, key),
    [loadingState]
  );

  const getError = useCallback(
    (key: LoadingKey): string | null => selectError({ loading: loadingState }, key),
    [loadingState]
  );

  const hasError = useCallback(
    (key: LoadingKey): boolean => Boolean(selectError({ loading: loadingState }, key)),
    [loadingState]
  );

  // Check if any loading operation is active
  const isAnyLoading = useCallback(
    (): boolean => Object.values(loadingState).some(item => item.isLoading),
    [loadingState]
  );

  return {
    // Main method
    withLoading,
    
    // State getters
    isLoading,
    getError,
    hasError,
    isAnyLoading,
    
    // Raw state for advanced usage
    loadingState,
  };
};