/**
 * Chat container component managing message display and input for channels
 * Integrates virtualized message list, reply context, input, and thread modal
 */
import React, {useCallback, useRef, useEffect} from 'react';
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
import { MobileEmojiPanel } from "../../molecules/MobileEmojiPanel";
import { scrollToBottom } from "../../../utils/scrollUtils";
import { markAsRead } from "../../../services/channelService";

export interface ChatContainerProps {
  autoLoad?: boolean;
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
  sx,
}) => {

  const dispatch = useAppDispatch();
  const channelId = useAppSelector(selectCurrentChannelId);
  const replyToPost = useAppSelector(selectReplyToPost);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  // Initial load effect for channel messages
  const hasPosts = useAppSelector(state => selectChannelHasPosts(state, channelId));
  const isLoadingUnreads = useAppSelector(state => selectIsLoadingUnreads(state, channelId));
  const loadedChannelsRef = useRef<Set<string>>(new Set());



  const handleCloseReply = useCallback(() => {
    dispatch(stopReply());
  }, [dispatch]);

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

  useEffect(() => {
    handleCloseReply()
  }, [channelId]);

  
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


  return (
    <Box sx={{ ...containerStyles, ...sx }} role="main">
      {/* Message List */}
      <Box sx={messageListContainerStyles}>
        <VirtualizedMessageContainer
          channelId={channelId}
          autoLoad={autoLoad}
          scrollElementRef={scrollElementRef}
        />
      </Box>

      {/* Reply Context (if replying) */}
      {replyToPost && (
        <MessageReply
          postId={replyToPost.id}
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

      {/* Mobile Emoji Panel */}
      <MobileEmojiPanel />
    </Box>
  );
};

export const ChatContainer = React.memo(ChatContainerComponent);