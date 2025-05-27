import React, { forwardRef, ReactNode, RefObject } from 'react';
import { Box, CircularProgress, Typography, Divider, Button } from '@mui/material';
import { Comment as CommentIcon } from '@mui/icons-material';

interface MessageContentProps {
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptySubtitle?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef?: RefObject<HTMLDivElement>;
}

/**
 * A reusable component for displaying message content with consistent styling and behavior.
 * Used for both the main message list and thread views.
 */
const MessageContent = forwardRef<HTMLDivElement, MessageContentProps>(({
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No messages yet',
  emptySubtitle = 'Start the conversation!',
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onScroll,
  scrollRef,
}, ref) => {
  return (
    <Box 
      ref={ref}
      sx={{ 
        height: '100%', 
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden', 
        px: 3, 
        pt: 4, 
        pb: 3, // Added more bottom padding
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }} 
      onScroll={onScroll}
      data-testid="message-content-container"
    >
      {/* Loading more indicator at top */}
      {loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {/* Load More button */}
      {hasMore && !loadingMore && onLoadMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={onLoadMore}
          >
            Load More Messages
          </Button>
        </Box>
      )}
      
      {/* Initial loading state */}
      {isLoading && !loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Empty state */}
      {!isLoading && !loadingMore && isEmpty && (
        <Box sx={{ 
          textAlign: 'center', 
          p: 4, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          alignItems: 'center',
          flexGrow: 1,
        }}>
          <CommentIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {emptyMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {emptySubtitle}
          </Typography>
        </Box>
      )}
      
      {/* The actual message content */}
      {!isLoading && !isEmpty && (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      )}
      
      {/* Ref for scroll to bottom */}
      <div ref={scrollRef} style={{ height: 1, width: '100%' }} />
    </Box>
  );
});

MessageContent.displayName = 'MessageContent';

export default MessageContent;