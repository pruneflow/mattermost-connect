/**
 * Thread input component for replying to thread messages
 * Wraps MessageInput with thread-specific configuration and root post ID handling
 */
import React, { useCallback } from 'react';
import { MessageInput } from './MessageInput';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannelId } from '../../store/selectors';
import { sendMessage } from '../../services/messageService';

interface ThreadInputProps {
  rootPostId: string;
}

export const ThreadInput: React.FC<ThreadInputProps> = ({
  rootPostId,
}) => {
  const channelId = useAppSelector(selectCurrentChannelId);

  const handleSendMessage = useCallback(async (message: string, fileIds?: string[]) => {
    if (!message.trim() && (!fileIds || fileIds.length === 0)) return;
    
    try {
      // Send message with forced rootId
      // New message will be automatically added to thread via threadsSlice
      await sendMessage(channelId, message, rootPostId, fileIds);
    } catch (error) {
      // TODO: Show error toast or notification
    }
  }, [channelId, rootPostId]);

  return (
    <MessageInput
      placeholder="Reply to thread..."
      channelId={channelId}
      onSend={handleSendMessage}
      autoFocus={true}
      inThread={true}
      inputId={`thread-${rootPostId}`}
    />
  );
};