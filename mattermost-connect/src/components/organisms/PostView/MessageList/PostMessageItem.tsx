import React from 'react';
import { useAppSelector } from '../../../../hooks';
import { selectPostById } from '../../../../store/selectors/postsSelectors';
import { useGroupedMessageLogic } from '../hooks/useGroupedMessageLogic';
import { Message } from '../../../molecules/Message';

interface PostMessageItemProps {
  postId: string;
  channelId: string;
}

export const PostMessageItem: React.FC<PostMessageItemProps> = ({ postId, channelId }) => {
  const post = useAppSelector(state => selectPostById(state, postId));
  const isPartOfGroupedMessage = useGroupedMessageLogic(postId, channelId);

  if (!post) {
    return null;
  }

  return (
    <Message
      post={post} 
      isPartOfGroupedMessage={isPartOfGroupedMessage}
    />
  );
};