import React from 'react';
import { useAppSelector } from '../../../../hooks';
import { selectPostById } from '../../../../store/selectors/postsSelectors';
import { Message } from '../../../molecules/Message';

interface PostMessageItemProps {
  postId: string;
  channelId: string;
  showHeader: boolean;
}

export const PostMessageItem: React.FC<PostMessageItemProps> = ({ postId, showHeader, channelId }) => {
  const post = useAppSelector(state => selectPostById(state, postId));

  if (!post) {
    return null;
  }

  return (
    <Message
      post={post} 
      showHeader={showHeader}
      channelId={channelId}
    />
  );
};