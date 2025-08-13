import React, { useCallback } from 'react';
import { MessageInput } from './MessageInput';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentChannelId } from '../../store/selectors';
import { sendMessage } from '../../services/messageService';

interface ThreadInputProps {
  rootPostId: string;
}

/**
 * Input pour écrire dans un thread
 * Force le rootId - le nouveau message apparaîtra automatiquement via threadsSlice
 */
export const ThreadInput: React.FC<ThreadInputProps> = ({
  rootPostId,
}) => {
  const channelId = useAppSelector(selectCurrentChannelId);

  const handleSendMessage = useCallback(async (message: string, fileIds?: string[]) => {
    if (!message.trim() && (!fileIds || fileIds.length === 0)) return;
    
    try {
      // Envoyer le message avec rootId forcé
      // Le nouveau message sera automatiquement ajouté au thread via threadsSlice
      await sendMessage(channelId, message, rootPostId, fileIds);
    } catch (error) {
      console.error('Failed to send thread message:', error);
      // TODO: Show error toast or notification
    }
  }, [channelId, rootPostId]);

  return (
    <MessageInput
      placeholder="Reply to thread..."
      channelId={channelId}
      onSend={handleSendMessage}
      autoFocus={true}
    />
  );
};