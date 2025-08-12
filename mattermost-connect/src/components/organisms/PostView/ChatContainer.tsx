import React, {useState, useCallback, useRef, useEffect} from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { MessageInput } from '../../molecules/MessageInput';
import { useAppSelector } from "../../../hooks";
import { selectCurrentChannelId } from "../../../store/selectors";
import { sendMessage, loadUnreadPosts } from "../../../services/messageService";
import { selectChannelHasPosts, selectIsLoadingUnreads } from "../../../store/selectors/postsSelectors";
import { VirtualizedMessageContainer } from "./VirtualizedMessageContainer";
import { scrollToBottom } from "../../../utils/scrollUtils";
import { markAsRead } from "../../../services/channelService";

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

const ChatContainerComponent: React.FC<ChatContainerProps> = ({
  autoLoad = false,
  lastViewedAt,
  sx,
}) => {
  console.debug("🔄 ChatContainer re-render");
  console.debug("🔍 ChatContainer props:", {
    autoLoad,
    lastViewedAt, 
    sx: !!sx,
    sxStringified: JSON.stringify(sx)
  });

  const channelId = useAppSelector(selectCurrentChannelId);
  console.debug("🔍 channelId from selector:", channelId);
  const [unreadChunkTimeStamp, setUnreadChunkTimeStamp] = useState<number | undefined>(lastViewedAt);
  const [shouldStartFromBottomWhenUnread, setShouldStartFromBottomWhenUnread] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  // Initial load effect for channel messages
  const hasPosts = useAppSelector(state => selectChannelHasPosts(state, channelId));
  const isLoadingUnreads = useAppSelector(state => selectIsLoadingUnreads(state, channelId));
  const loadedChannelsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (
      channelId && 
      !loadedChannelsRef.current.has(channelId) && 
      !hasPosts && 
      !isLoadingUnreads
    ) {
      console.log('Loading initial posts for channel:', channelId);
      loadedChannelsRef.current.add(channelId);
      void loadUnreadPosts(channelId);
    }
  }, [channelId, hasPosts, isLoadingUnreads]);

  console.debug("🔍 sendMessage service:", {
    sendMessageType: typeof sendMessage,
    channelId
  });
  
  const handleSendMessage = useCallback(async (message: string, fileIds?: string[]) => {
    if (!message.trim() && (!fileIds || fileIds.length === 0)) return;
    
    try {
      await sendMessage(channelId, message, '', fileIds);
      await markAsRead(channelId);
      scrollToBottom(scrollElementRef.current)
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error toast or notification
    }
  }, [sendMessage, markAsRead, channelId]);

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
        <VirtualizedMessageContainer
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
          channelId={channelId}
          onSend={handleSendMessage}
          autoFocus={false}
        />
      </Box>
    </Box>
  );
};

export const ChatContainer = React.memo(ChatContainerComponent);