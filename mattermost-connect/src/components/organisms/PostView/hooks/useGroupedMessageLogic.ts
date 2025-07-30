import { useMemo } from 'react';
import { useAppSelector } from '../../../../hooks';
import { selectPostById, selectPostsInChannel } from '../../../../store/selectors/postsSelectors';
import { shouldGroupMessage } from '../../../../utils/virtualListUtils';

/**
 * Hook to determine if a message should be part of a grouped message display
 * Based on consecutive posts from same user within time threshold
 */
export const useGroupedMessageLogic = (postId: string, channelId: string): boolean => {
  const post = useAppSelector(state => selectPostById(state, postId));
  const postIds = useAppSelector(state => selectPostsInChannel(state, channelId));
  
  // Get previous post ID to select the previous post
  const previousPostId = useMemo(() => {
    if (!postIds || postIds.length === 0) return null;
    const currentIndex = postIds.indexOf(postId);
    return currentIndex > 0 ? postIds[currentIndex - 1] : null;
  }, [postIds, postId]);
  
  const previousPost = useAppSelector(state => 
    previousPostId ? selectPostById(state, previousPostId) : null
  );

  return useMemo(() => {
    if (!post || !previousPost) return false;

    // Use the grouping logic from utils
    return shouldGroupMessage(post, previousPost);
  }, [post, previousPost]);
};