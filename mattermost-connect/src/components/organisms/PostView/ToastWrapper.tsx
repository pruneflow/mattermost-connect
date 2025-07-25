import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../../../hooks';
import { 
  selectPostsForChannel,
  selectChannelMyMembers,
} from '../../../store/selectors';
import { Post } from '../../../api/types';
import { Box, Alert, Button } from '@mui/material';
import { ArrowDownward, History, NewReleases } from '@mui/icons-material';

interface ToastWrapperProps {
  channelId: string;
  atLatestPost?: boolean;
  atBottom?: boolean;
  lastViewedAt?: number;
  onScrollToLatest?: () => void;
  onScrollToNewMessages?: () => void;
  onJumpToRecentMessages?: () => void;
}

interface ToastState {
  unreadCount: number;
  showArchiveToast: boolean;
  showNewMessagesToast: boolean;
  showUnreadToast: boolean;
  hideNewMessageToast: boolean;
  hideArchiveToast: boolean;
}

const ToastWrapper: React.FC<ToastWrapperProps> = ({
  channelId,
  atLatestPost = false,
  atBottom = true,
  onScrollToLatest,
  onScrollToNewMessages,
  onJumpToRecentMessages,
}) => {
  const channelMembers = useAppSelector(selectChannelMyMembers);
  const channelMember = channelMembers[channelId];
  const posts = useAppSelector((state) => selectPostsForChannel(state, channelId));

  const [toastState, setToastState] = useState<ToastState>({
    unreadCount: 0,
    showArchiveToast: false,
    showNewMessagesToast: false,
    showUnreadToast: false,
    hideNewMessageToast: false,
    hideArchiveToast: false,
  });


  // Calculate if we have new messages below current view
  const newMessagesBelow = useMemo(() => {
    if (atLatestPost || !posts.length || !channelMember?.last_viewed_at) {
      return 0;
    }

    // Simple calculation: count posts newer than last viewed
    const newerPosts = posts.filter((post: Post) => 
      post.create_at > channelMember.last_viewed_at
    );
    
    return newerPosts.length;
  }, [atLatestPost, posts, channelMember?.last_viewed_at]);

  // Handle escape key to hide toasts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToastState(prev => ({
          ...prev,
          hideNewMessageToast: true,
          hideArchiveToast: true,
        }));
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Update unread counts when props change
  useEffect(() => {
    setToastState(prev => ({
      ...prev,
      unreadCount: newMessagesBelow,
    }));
  }, [newMessagesBelow]);

  // Toast handlers
  const handleJumpToRecent = useCallback(() => {
    if (onJumpToRecentMessages) {
      onJumpToRecentMessages();
    }
    setToastState(prev => ({ ...prev, hideArchiveToast: true }));
  }, [onJumpToRecentMessages]);

  const handleScrollToNewMessages = useCallback(() => {
    if (onScrollToNewMessages) {
      onScrollToNewMessages();
    }
    setToastState(prev => ({ ...prev, hideNewMessageToast: true }));
  }, [onScrollToNewMessages]);

  const handleScrollToLatest = useCallback(() => {
    if (onScrollToLatest) {
      onScrollToLatest();
    }
    setToastState(prev => ({ ...prev, hideNewMessageToast: true }));
  }, [onScrollToLatest]);

  // Determine which toast to show (following Mattermost priority logic)
  const getToastToRender = useCallback(() => {
    const { unreadCount, hideNewMessageToast, hideArchiveToast } = toastState;

    // New messages toast (when there are unread messages below)
    if (unreadCount > 0 && !hideNewMessageToast && !atBottom) {
      return (
        <Alert
          severity="warning"
          icon={<NewReleases />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleScrollToNewMessages}
              sx={{ minWidth: 'auto' }}
            >
              {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
            </Button>
          }
          sx={{
            mb: 1,
            '& .MuiAlert-message': { 
              display: 'flex', 
              alignItems: 'center',
              gap: 1 
            }
          }}
        >
          New messages below
        </Alert>
      );
    }

    // Scroll to bottom toast (when not at latest posts)
    if (!atLatestPost && !atBottom && unreadCount === 0) {
      return (
        <Alert
          severity="info"
          icon={<ArrowDownward />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleScrollToLatest}
              sx={{ minWidth: 'auto' }}
            >
              More messages below
            </Button>
          }
          sx={{
            mb: 1,
            '& .MuiAlert-message': { 
              display: 'flex', 
              alignItems: 'center',
              gap: 1 
            }
          }}
        >
          Scroll to see new messages
        </Alert>
      );
    }

    return null;
  }, [
    toastState,
    atLatestPost,
    atBottom,
    handleJumpToRecent,
    handleScrollToNewMessages,
    handleScrollToLatest,
  ]);

  const toastToRender = getToastToRender();

  if (!toastToRender) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80, // Below AppBar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1300,
        width: 'auto',
        maxWidth: 400,
        px: 2,
      }}
    >
      {toastToRender}
    </Box>
  );
};

export default ToastWrapper;