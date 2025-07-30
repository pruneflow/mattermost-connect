import React, { useState, useCallback } from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { VirtualizedMessageList } from './MessageList/VirtualizedMessageList';
import { MessageInput } from '../../molecules/MessageInput';
import { useAppSelector } from "../../../hooks";
import { selectCurrentChannelId } from "../../../store/selectors";

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
  
  const handleSendMessage = useCallback((message: string) => {
    // TODO: Implement send message logic
    console.log('Sending message:', message);
  }, []);

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