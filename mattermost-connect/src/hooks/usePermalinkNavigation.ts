import { useMemo, useEffect, useState } from 'react';

/**
 * Hook to extract focusedPostId from URL query parameters
 * Supports patterns like:
 * - ?focusedPost=post_123
 * - ?post=post_123
 * - #post_123 (hash-based)
 */
export const usePermalinkNavigation = () => {
  const [urlChangeCount, setUrlChangeCount] = useState(0);

  // Listen for URL changes (popstate, pushstate)
  useEffect(() => {
    const handleUrlChange = () => {
      setUrlChangeCount(prev => prev + 1);
    };

    window.addEventListener('popstate', handleUrlChange);
    
    // Custom event for pushState changes
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.history.pushState = originalPushState;
    };
  }, []);

  const focusedPostId = useMemo(() => {
    // Check query parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const focusedPost = urlParams.get('focusedPost') || urlParams.get('post');
    
    if (focusedPost) {
      return focusedPost;
    }
    
    // Check hash for post ID (e.g., #post_123)
    const hash = window.location.hash;
    if (hash.startsWith('#post_')) {
      return hash.substring(1); // Remove the '#' character
    }
    
    return null;
  }, [urlChangeCount]); // Re-compute when URL changes

  /**
   * Navigate to a specific post by updating the URL
   * This will trigger a re-render with the new focusedPostId
   */
  const navigateToPost = (postId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('focusedPost', postId);
    window.history.pushState({}, '', url.toString());
    
    // Trigger a popstate event to notify components of the URL change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  /**
   * Clear focused post from URL
   */
  const clearFocusedPost = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('focusedPost');
    url.searchParams.delete('post');
    url.hash = '';
    window.history.replaceState({}, '', url.toString());
    
    // Trigger a popstate event to notify components of the URL change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return {
    focusedPostId,
    navigateToPost,
    clearFocusedPost,
  };
};