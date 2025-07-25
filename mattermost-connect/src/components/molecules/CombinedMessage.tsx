import React, { memo, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { getPostIdsForCombinedUserActivityPost } from '../../utils/postUtils';
import { getPost, getAllPosts } from '../../store/selectors';
import { Message } from './Message';
import { Box } from '@mui/material'

interface CombinedMessageProps {
  combinedId: string;
  previousPostId?: string;
  togglePostMenu?: (opened: boolean) => void;
  isLastPost?: boolean;
  onReply?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onOpenThread?: (postId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFilePreview?: (fileId: string) => void;
}


export const CombinedMessage: React.FC<CombinedMessageProps> = memo(({
  combinedId,
  previousPostId,
  togglePostMenu,
  isLastPost,
  onReply,
  onDelete,
  onOpenThread,
  onFileDownload,
  onFilePreview,
}) => {
  // Get the individual post IDs from the combined ID - stable memoization
  const postIds = useMemo(() => getPostIdsForCombinedUserActivityPost(combinedId), [combinedId]);
  
  // Get all posts state once
  const allPosts = useAppSelector(getAllPosts);
  const previousPost = useAppSelector(state => 
    previousPostId ? getPost(state, previousPostId) : null
  );
  
  // Memoize posts array to prevent unnecessary re-renders
  const posts = useMemo(() => {
    return postIds.map(id => allPosts[id]).filter(Boolean);
  }, [postIds, allPosts]);

  // Early return if no posts
  if (!posts || posts.length === 0) {
    return null;
  }

  // Sort posts chronologically (oldest first for display) - memoized with stable dependency
  const sortedPosts = useMemo(() => {
    // Use map with index for stable sorting to avoid unnecessary re-sorts
    return posts
      .map((post, originalIndex) => ({ post, originalIndex }))
      .sort((a, b) => a.post.create_at - b.post.create_at)
      .map(({ post }) => post);
  }, [posts]);

  return (
    <Box>
      {sortedPosts.map((post, index) => {
        const isFirstInCombination = index === 0;
        const prevPostId = isFirstInCombination ? previousPost?.id : sortedPosts[index - 1]?.id;
        
        return (
          <Message
            key={post.id}
            post={post}
            previousPostId={prevPostId}
            isCompact={!isFirstInCombination}
            onReply={onReply}
            onDelete={onDelete}
            onOpenThread={onOpenThread}
            onFileDownload={onFileDownload}
            onFilePreview={onFilePreview}
          />
        );
      })}
    </Box>
  );
});

CombinedMessage.displayName = 'CombinedMessage';