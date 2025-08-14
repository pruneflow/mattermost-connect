/**
 * Edit message component for in-place message editing
 * Provides message input with save/cancel functionality for post updates
 */
import React, { useCallback } from "react";
import { SxProps, Theme } from "@mui/material";
import { MessageInput } from "./MessageInput";
import { updateMessage } from "../../services/messageService";
import { FileInfo } from "../../api/types";

interface EditMessageProps {
  postId: string;
  initialMessage: string;
  files?: FileInfo[];
  onCancel: () => void;
  onSave: () => void;
  channelId: string;
  inThread?: boolean;
  sx?: SxProps<Theme>;
}

export const EditMessage: React.FC<EditMessageProps> = ({
  postId,
  initialMessage,
  files = [],
  onCancel,
  onSave,
  channelId,
  inThread = false,
  sx,
}) => {
  const handleSave = useCallback(
    async (message: string, updatedFileIds?: string[]) => {
      try {
        await updateMessage(postId, message, updatedFileIds);
        onSave();
      } catch (error) {
      }
    },
    [updateMessage, postId, onSave],
  );

  return (
    <MessageInput
      mode="edit"
      channelId={channelId}
      initialValue={initialMessage}
      postId={postId}
      files={files}
      onSend={handleSave}
      onCancel={onCancel}
      placeholder="Edit your message..."
      autoFocus
      inThread={inThread}
      sx={sx}
    />
  );
};
