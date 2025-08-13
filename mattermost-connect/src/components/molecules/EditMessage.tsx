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
  sx?: SxProps<Theme>;
}

export const EditMessage: React.FC<EditMessageProps> = ({
  postId,
  initialMessage,
  files = [],
  onCancel,
  onSave,
  channelId,
  sx,
}) => {
  const handleSave = useCallback(
    async (message: string, updatedFileIds?: string[]) => {
      try {
        console.debug("updatedFileIds", updatedFileIds);
        await updateMessage(postId, message, updatedFileIds);
        onSave();
      } catch (error) {
        console.error("Failed to update message:", error);
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
      sx={sx}
    />
  );
};
