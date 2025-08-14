/**
 * Chat container component managing message display and input for channels
 * Integrates virtualized message list, reply context, input, and thread modal
 */
import React, {useState, useCallback, useRef, useEffect} from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { MessageInput } from '../../molecules/MessageInput';
import { MessageReply } from '../../molecules/MessageReply';
import { useAppSelector } from "../../../hooks";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { selectCurrentChannelId } from "../../../store/selectors";
import { selectReplyToPost } from "../../../store/selectors/messageUI";
import { stopReply } from "../../../store/slices/messageUISlice";
import { sendMessage, loadUnreadPosts } from "../../../services/messageService";
import { selectChannelHasPosts, selectIsLoadingUnreads } from "../../../store/selectors/postsSelectors";
import { VirtualizedMessageContainer } from "./VirtualizedMessageContainer";
import { ThreadModal } from "../ThreadModal";
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

  const dispatch = useAppDispatch();
  const channelId = useAppSelector(selectCurrentChannelId);
  const replyToPost = useAppSelector(selectReplyToPost);
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
      loadedChannelsRef.current.add(channelId);
      void loadUnreadPosts(channelId);
    }
  }, [channelId, hasPosts, isLoadingUnreads]);

  
  const handleSendMessage = useCallback(async (message: string, fileIds?: string[]) => {
    if (!message.trim() && (!fileIds || fileIds.length === 0)) return;
    
    try {
      const rootId = replyToPost?.id;
      await sendMessage(channelId, message, rootId, fileIds);
      
      if (replyToPost) {
        dispatch(stopReply());
      }
      
      await markAsRead(channelId);
      scrollToBottom(scrollElementRef.current)
    } catch (error) {
      // TODO: Show error toast or notification
    }
  }, [sendMessage, markAsRead, channelId, replyToPost, dispatch]);

  const handleChangeUnreadChunkTimeStamp = useCallback((newTimestamp: number) => {
    setUnreadChunkTimeStamp(newTimestamp);
  }, []);

  const handleToggleShouldStartFromBottomWhenUnread = useCallback(() => {
    setShouldStartFromBottomWhenUnread(prev => !prev);
  }, []);

  const handleCloseReply = useCallback(() => {
    dispatch(stopReply());
  }, [dispatch]);

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

      {/* Reply Context (if replying) */}
      {replyToPost && (
        <MessageReply
          message={replyToPost.message}
          onClose={handleCloseReply}
        />
      )}

      {/* Message Input */}
      <Box sx={inputContainerStyles}>
        <MessageInput
          placeholder="Type a message..."
          channelId={channelId}
          onSend={handleSendMessage}
          autoFocus={false}
        />
      </Box>

      {/* Thread Modal */}
      <ThreadModal />
    </Box>
  );
};

export const ChatContainer = React.memo(ChatContainerComponent);