/**
 * Message item renderer component for virtual list items
 * Handles rendering of different item types: posts, dividers, buttons, and loading states
 */
import React, { forwardRef } from 'react';
import { DateDivider } from '../../../atoms/DateDivider';
import { NewMessageSeparator } from '../../../molecules/NewMessageSeparator';
import { StartOfChannelDivider } from '../../../atoms/StartOfChannelDivider';
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
  virtualStyles?: React.CSSProperties;
  isLongPress?: React.RefObject<boolean>;
}

export const MessageItem = forwardRef<HTMLDivElement, MessageItemProps>(({
  item,
  channelId,
  onLoadOlder,
  onLoadNewer,
  isOlderLoading,
  isNewerLoading,
  isLongPress,
}, ref) => {
  const renderContent = () => {
    switch (item.type) {
      case 'post':
        return (
          <PostMessageItem 
            postId={item.id} 
            channelId={channelId} 
            showHeader={item.data?.showHeader ?? true}
            isOwnMessage={item.data?.isOwnMessage ?? false}
            isLongPress={isLongPress}
          />
        );
        
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
        
      case 'start-of-channel':
        return <StartOfChannelDivider />;
        
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

  return (
    <div 
      id={item.id} 
      ref={ref} 
      data-post-id={item.type === 'post' ? item.id : undefined}
    >
      {renderContent()}
    </div>
  );
});