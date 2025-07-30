import React from 'react';
import { DateDivider } from '../../../atoms/DateDivider';
import { NewMessageSeparator } from '../../../molecules/NewMessageSeparator';
import { LoadMoreButton } from './LoadMoreButton';
import { PostMessageItem } from './PostMessageItem';
import LoadingScreen from '../../../common/LoadingScreen';
import { VirtualListItem } from '../../../../types/virtualList';

interface MessageItemProps {
  item: VirtualListItem;
  channelId: string;
  onLoadOlder: () => void;
  onLoadNewer: () => void;
  isOlderLoading: boolean;
  isNewerLoading: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  item,
  channelId,
  onLoadOlder,
  onLoadNewer,
  isOlderLoading,
  isNewerLoading,
}) => {
  switch (item.type) {
    case 'post':
      return <PostMessageItem postId={item.id} channelId={channelId} />;
      
    case 'date-separator':
      return (
        <DateDivider 
          date={item.data?.date?.getTime() || Date.now()} 
        />
      );
      
    case 'new-messages-separator':
      return (
        <NewMessageSeparator>
          {item.data?.unreadCount && item.data.unreadCount > 0 
            ? `${item.data.unreadCount} new messages`
            : 'New messages'
          }
        </NewMessageSeparator>
      );
      
    case 'load-more':
      return (
        <LoadMoreButton
          type={item.data?.loadDirection || 'older'}
          loading={item.data?.loadDirection === 'older' ? isOlderLoading : isNewerLoading}
          onClick={item.data?.loadDirection === 'older' ? onLoadOlder : onLoadNewer}
        />
      );
      
    case 'loading':
      return (
        <LoadingScreen 
          centered={true}
          style={{ padding: '16px 0' }}
        />
      );
      
    default:
      return null;
  }
};