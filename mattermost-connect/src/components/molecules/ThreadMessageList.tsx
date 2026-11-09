/**
 * Thread message list component displaying all messages in a thread conversation
 * Auto-scrolls for user's own messages and shows reply count divider
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannelId, selectCurrentUser } from '../../store/selectors';
import {
  selectThreadPosts,
  selectIsThreadLoading,
  selectThreadError,
} from '../../store/selectors/threads';
import { Message } from './Message';
import { useScrollDetection } from '../../hooks/useScrollDetection';
import { useLongPress } from '../../hooks/useLongPress';
import { selectMessageForActions } from '../../store/slices/messageUISlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';

interface ThreadMessageListProps {
  rootPostId: string;
}

const getContainerStyles = (isLongPress: boolean): SxProps<Theme> => ({
  height: '100%',
  overflow: 'auto',
  p: 1,
  pt: 2, // Padding-top to prevent first message from being hidden by ThreadHeader
  // Prevent text selection on mobile to avoid conflicts with long press
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
});

const loadingStyles: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
};

const errorStyles: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  textAlign: 'center',
  p: 2,
};

const emptyStyles: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  textAlign: 'center',
  p: 2,
  color: 'text.secondary',
};

export const ThreadMessageList: React.FC<ThreadMessageListProps> = ({
  rootPostId,
}) => {
  const dispatch = useAppDispatch();
  const channelId = useAppSelector(selectCurrentChannelId);
  const currentUser = useAppSelector(selectCurrentUser);
  const posts = useAppSelector(selectThreadPosts(rootPostId));
  const isLoading = useAppSelector(selectIsThreadLoading(rootPostId));
  const error = useAppSelector(selectThreadError(rootPostId));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const previousPostCountRef = useRef(posts.length);
  const isScrolling = useScrollDetection(containerRef);

  // Long press handling
  const handleLongPress = useCallback((target: EventTarget) => {
    const element = target as HTMLElement;
    const messageElement = element.closest('[data-post-id]');
    if (messageElement) {
      const postId = messageElement.getAttribute('data-post-id');
      if (postId) {
        dispatch(selectMessageForActions(postId));
      }
    }
  }, [dispatch]);

  const { isLongPress, handlers } = useLongPress({
    onLongPress: handleLongPress,
    isScrolling
  });
  
  // Auto-scroll when new posts are added (only for user's own messages)
  useEffect(() => {
    const currentPostCount = posts.length;
    
    // Check if a new post was added
    if (currentPostCount > previousPostCountRef.current) {
      const latestPost = posts[posts.length - 1];
      
      // Only scroll if the latest post is from the current user
      if (latestPost && currentUser && latestPost.user_id === currentUser.id) {
        if (containerRef.current) {
          // Small delay to ensure the DOM is updated
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    }
    
    previousPostCountRef.current = currentPostCount;
  }, [posts.length, posts, currentUser]);

  // Loading display
  if (isLoading && posts.length === 0) {
    return (
      <Box sx={loadingStyles}>
        <CircularProgress />
      </Box>
    );
  }

  // Error display
  if (error) {
    return (
      <Box sx={errorStyles}>
        <Typography color="error">
          Failed to load thread: {error}
        </Typography>
      </Box>
    );
  }

  // Empty state display
  if (posts.length === 0) {
    return (
      <Box sx={emptyStyles}>
        <Typography variant="body2">
          No messages in this thread yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={getContainerStyles(isLongPress.current)} {...handlers}>
      {posts.map((post, index) => {
        const isOwnMessage = currentUser ? currentUser.id === post.user_id : false;
        const showHeader = index === 0 || posts[index - 1]?.user_id !== post.user_id;

        return (
          <div key={post.id} data-post-id={post.id}>
            <Message
              post={post}
              channelId={channelId}
              showHeader={showHeader}
              isOwnMessage={isOwnMessage}
              inThread={true}
              isLongPress={isLongPress}
              sx={{
                mb: 1,
              }}
            />
            {/* Divider with number of replies after first message (root) */}
            {index === 0 && post.reply_count > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  my: 2,
                  px: 2,
                }}
              >
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                <Typography
                  variant="body2"
                  sx={{
                    px: 2,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
              </Box>
            )}
          </div>
        );
      })}
    </Box>
  );
};