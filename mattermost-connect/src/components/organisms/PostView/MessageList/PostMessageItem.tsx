/**
 * Post message item wrapper component for rendering individual post messages
 * Connects post data from Redux store to Message component with display options
 */
import React from 'react';
import { useAppSelector } from '../../../../hooks';
import { selectPostById } from '../../../../store/selectors/postsSelectors';
import { Message } from '../../../molecules/Message';

interface PostMessageItemProps {
  postId: string;
  channelId: string;
  showHeader: boolean;
  isOwnMessage?: boolean;
}

export const PostMessageItem: React.FC<PostMessageItemProps> = ({ postId, showHeader, channelId, isOwnMessage }) => {
  const post = useAppSelector(state => selectPostById(state, postId));

  if (!post) {
    return null;
  }

  return (
    <Message
      post={post} 
      showHeader={showHeader}
      channelId={channelId}
      isOwnMessage={isOwnMessage}
    />
  );
};