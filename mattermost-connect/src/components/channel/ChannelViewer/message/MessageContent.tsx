// src/components/ChannelViewer/message/MessageContent.tsx
import React from "react";
import { Box } from "@mui/material";
import { MessageContentProps } from "./MessageTypes";
import Attachment, {
  AttachmentGroup,
} from "../../../message/Attachment/Attachment";

/**
 * Displays the content of a message including text and attachments
 */
const MessageContent: React.FC<MessageContentProps> = ({
  message,
  formattedText,
  sx,
}) => {
  // Check if message has attachments
  const hasAttachments = !!(
    message &&
    message.metadata &&
    message.metadata.files &&
    message.metadata.files.length > 0
  );

  return (
    <Box sx={{ ...sx }}>
      {/* Text content */}
      <Box dangerouslySetInnerHTML={{ __html: formattedText }} />

      {/* Attachments */}
      {hasAttachments && message.metadata?.files && (
        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
          <AttachmentGroup files={message.metadata.files} />
        </Box>
      )}
    </Box>
  );
};

export default MessageContent;
