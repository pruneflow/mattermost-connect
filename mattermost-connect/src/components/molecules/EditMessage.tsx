import React, { useCallback } from 'react';
import { SxProps, Theme } from '@mui/material';
import { MessageInput } from './MessageInput';
import { updateMessage } from '../../services/messageService';

interface EditMessageProps {
  postId: string;
  initialMessage: string;
  onCancel: () => void;
  onSave: () => void;
  sx?: SxProps<Theme>;
}

export const EditMessage: React.FC<EditMessageProps> = ({
  postId,
  initialMessage,
  onCancel,
  onSave,
  sx,
}) => {

  const handleSave = useCallback(async (message: string) => {
    try {
      await updateMessage(postId, message);
      onSave();
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  }, [updateMessage, postId, onSave]);

  return (
    <MessageInput
      mode="edit"
      initialValue={initialMessage}
      onSend={handleSave}
      onCancel={onCancel}
      placeholder="Edit your message..."
      autoFocus
      sx={sx}
    />
  );
};