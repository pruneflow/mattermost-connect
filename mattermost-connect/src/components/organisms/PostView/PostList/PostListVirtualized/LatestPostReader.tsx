import React from 'react';

interface LatestPostReaderProps {
  channelId: string;
  onPostsRead: () => void;
}

/**
 * EXACT Mattermost LatestPostReader component for tracking latest post read status
 * Similar to webapp/channels/src/components/post_view/post_list_virtualized/latest_post_reader.tsx
 */
export const LatestPostReader: React.FC<LatestPostReaderProps> = ({
  channelId,
  onPostsRead,
}) => {
  // EXACT Mattermost logic for tracking when posts are read
  // This is used to mark channel as read when user sees latest posts
  
  React.useEffect(() => {
    // Mark posts as read when component mounts with channelId
    if (channelId) {
      onPostsRead();
    }
  }, [channelId, onPostsRead]);

  // This component doesn't render anything visible - just tracks read status
  return null;
};

LatestPostReader.displayName = 'LatestPostReader';