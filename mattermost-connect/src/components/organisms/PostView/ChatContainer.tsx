import React, {useState, useCallback, useRef} from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { VirtualizedMessageList } from './MessageList/VirtualizedMessageList';
import { MessageInput } from '../../molecules/MessageInput';
import { useAppSelector } from "../../../hooks";
import { selectCurrentChannelId } from "../../../store/selectors";
import { useMessages } from "../../../hooks/useMessages";
import useUnreadCounts from "../../../hooks/useUnreadCounts";
import {useVirtualizedMessages} from "./hooks/useVirtualizedMessages";
import {useAutoScroll} from "./hooks/useAutoScroll";

export interface ChatContainerProps {
  autoLoad?: boolean;
  lastViewedAt?: number;
  sx?: SxProps<Theme>;
}

const containerStyles: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

const messageListContainerStyles: SxProps<Theme> = {
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
};

const inputContainerStyles: SxProps<Theme> = {
  borderTop: 1,
  borderColor: 'divider',
  backgroundColor: 'background.paper',
  p: 2,
};

export const ChatContainer: React.FC<ChatContainerProps> = ({
  autoLoad = false,
  lastViewedAt,
  sx,
}) => {
  const channelId = useAppSelector(selectCurrentChannelId);
  const [unreadChunkTimeStamp, setUnreadChunkTimeStamp] = useState<number | undefined>(lastViewedAt);
  const [shouldStartFromBottomWhenUnread, setShouldStartFromBottomWhenUnread] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { markChannelAsRead } = useUnreadCounts();

  // Use custom hooks
  const { virtualizer } =
      useVirtualizedMessages({
        channelId,
        scrollElement: scrollElementRef.current,
      });

  // Auto-scroll hook
  const { scrollToBottom, isAtBottom } = useAutoScroll({
    virtualizer,
    scrollElement: scrollElementRef.current,
    shouldStartFromBottomWhenUnread,
    unreadChunkTimeStamp,
  });
  
  const { sendMessage } = useMessages({ channelId });
  
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    try {
      await sendMessage(message);
      await markChannelAsRead(channelId)
      console.debug("isAtBottom", isAtBottom(scrollElementRef.current))
      scrollToBottom(scrollElementRef.current)
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error toast or notification
    }
  }, [sendMessage]);

  const handleChangeUnreadChunkTimeStamp = useCallback((newTimestamp: number) => {
    setUnreadChunkTimeStamp(newTimestamp);
  }, []);

  const handleToggleShouldStartFromBottomWhenUnread = useCallback(() => {
    setShouldStartFromBottomWhenUnread(prev => !prev);
  }, []);

  return (
    <Box sx={{ ...containerStyles, ...sx }} role="main">
      {/* Message List */}
      <Box sx={messageListContainerStyles}>
        <VirtualizedMessageList
          channelId={channelId}
          autoLoad={autoLoad}
          unreadChunkTimeStamp={unreadChunkTimeStamp}
          shouldStartFromBottomWhenUnread={shouldStartFromBottomWhenUnread}
          onChangeUnreadChunkTimeStamp={handleChangeUnreadChunkTimeStamp}
          onToggleShouldStartFromBottomWhenUnread={handleToggleShouldStartFromBottomWhenUnread}
          scrollElementRef={scrollElementRef}
        />
      </Box>

      {/* Message Input */}
      <Box sx={inputContainerStyles}>
        <MessageInput
          placeholder="Type a message..."
          onSend={handleSendMessage}
          autoFocus={false}
        />
      </Box>
    </Box>
  );
};