// src/internal/containers/messages/MessageThreadContainer.tsx
/**
 * Container component for a message thread that manages the root message and replies
 */
import React, { useCallback, useMemo, useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import { useThread } from "../../../hooks/useMessages";
import { BaseComponentProps } from "../../types/componentTypes";
import MessageItemUI from "../../components/messages/MessageItemUI";
import MessageInputUI from "../../components/messages/MessageInputUI";
import { Message } from "../../../index";
import { getUserStatus, useUserStore } from "../../../core/store/userStore";
import { useAuthStore } from "../../../core/store/authStore";
import { useTypingIndicator } from "../../../hooks/useWebSocket";

export interface MessageThreadContainerProps extends BaseComponentProps {
  /** Root message ID */
  rootMessageId: string;
  /** Channel ID */
  channelId: string;
  /** Whether to show an input for replying */
  showReplyInput?: boolean;
  /** Whether to allow file attachments */
  allowAttachments?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Emoji picker component */
  emojiPickerComponent?: React.ReactNode;
  /** Callback when a reply is sent */
  onReplySent?: (message: Message) => void;
  /** Callback when thread is closed */
  onClose?: () => void;
}

const MessageThreadContainer: React.FC<MessageThreadContainerProps> = ({
  rootMessageId,
  channelId,
  showReplyInput = true,
  allowAttachments = true,
  allowEmojis = true,
  maxAttachments = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  emojiPickerComponent,
  onReplySent,
  className,
  sx,
  id,
}) => {
  // Get thread data and functions from hook
  const {
    threadMessages,
    isEditing,
    replyToThread,
    editThreadMessage,
    deleteThreadMessage,
    uploadThreadFiles,
  } = useThread(rootMessageId, channelId);

  // Get user store for display names and status
  const { getUserById, getUserDisplayName } = useUserStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Get typing indicator hook
  const sendTypingEvent = useTypingIndicator(channelId);

  // State for edited message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editFormMessage, setEditFormMessage] = useState("");

  // State for sending state
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Find root message
  const rootMessage = useMemo(() => {
    // In a real implementation, you would fetch this separately
    // if it's not already in the thread messages
    return threadMessages.find((message) => message.id === rootMessageId);
  }, [threadMessages, rootMessageId]);

  // Build user display names map
  const userDisplayNames = useMemo(() => {
    const displayNames: Record<string, string> = {};

    // Add root message user
    if (rootMessage) {
      displayNames[rootMessage.user_id] = getUserDisplayName(
        rootMessage.user_id,
      );
    }

    // Add thread message users
    threadMessages.forEach((message) => {
      if (!displayNames[message.user_id]) {
        displayNames[message.user_id] = getUserDisplayName(message.user_id);
      }
    });

    return displayNames;
  }, [threadMessages, rootMessage, getUserDisplayName]);

  // Build user image URLs map
  const userImageUrls = useMemo(() => {
    const imageUrls: Record<string, string> = {};

    // Add all users from thread
    const allMessages = rootMessage
      ? [rootMessage, ...threadMessages]
      : threadMessages;

    allMessages.forEach((message) => {
      const user = getUserById(message.user_id);
      if (user && user.last_picture_update && !imageUrls[message.user_id]) {
        imageUrls[message.user_id] =
          `/api/v4/users/${user.id}/image?_=${user.last_picture_update}`;
      }
    });

    return imageUrls;
  }, [threadMessages, rootMessage, getUserById]);

  // Build user statuses map
  const userStatuses = useMemo(() => {
    const statuses: Record<string, "online" | "away" | "dnd" | "offline"> = {};

    // Add all users from thread
    const allMessages = rootMessage
      ? [rootMessage, ...threadMessages]
      : threadMessages;

    allMessages.forEach((message) => {
      if (!statuses[message.user_id]) {
        statuses[message.user_id] = getUserStatus(message.user_id);
      }
    });

    return statuses;
  }, [threadMessages, rootMessage, getUserStatus]);

  // Handle edit message
  const handleEditMessage = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditFormMessage(message.message);
  }, []);

  // Handle edit save
  const handleEditSave = useCallback(
    async (text: string) => {
      if (!editingMessageId) return;

      try {
        await editThreadMessage(editingMessageId, text);
        setEditingMessageId(null);
        setEditFormMessage("");
      } catch (error) {
        console.error("Error editing message:", error);
      }
    },
    [editingMessageId, editThreadMessage],
  );

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditFormMessage("");
  }, []);

  // Handle delete message
  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      try {
        await deleteThreadMessage(message.id);
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    },
    [deleteThreadMessage],
  );

  // Handle send reply
  const handleSendReply = useCallback(
    async (text: string, files: File[]) => {
      if (!text && files.length === 0) return;

      setIsSending(true);

      try {
        // Upload files if any
        let fileIds: string[] = [];
        if (files.length > 0) {
          setIsUploading(true);
          fileIds = await uploadThreadFiles(files);
          setIsUploading(false);
        }

        // Send reply
        const sentMessage = await replyToThread(text, fileIds);

        if (onReplySent) {
          onReplySent(sentMessage);
        }
      } catch (error) {
        console.error("Error sending reply:", error);
      } finally {
        setIsSending(false);
      }
    },
    [replyToThread, uploadThreadFiles, onReplySent],
  );

  // Handle typing
  const handleTyping = useCallback(() => {
    if (sendTypingEvent) {
      sendTypingEvent(rootMessageId);
    }
  }, [sendTypingEvent, rootMessageId]);

  // Render edit form
  const renderEditForm = useCallback(
    (_message: Message) => {
      return (
        <MessageInputUI
          initialValue={editFormMessage}
          isEditing={true}
          isSending={isEditing}
          onSubmit={(text) => handleEditSave(text)}
          onCancel={handleEditCancel}
        />
      );
    },
    [editFormMessage, isEditing, handleEditSave, handleEditCancel],
  );

  // Don't render if no root message ID or channel ID
  if (!rootMessageId || !channelId) {
    return null;
  }

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        ...sx,
      }}
      id={id}
    >
      {/* Thread header - could be extracted into a separate component */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Thread</Typography>
      </Box>

      {/* Root message */}
      {rootMessage && (
        <>
          <Box sx={{ p: 2 }}>
            <MessageItemUI
              item={rootMessage}
              isActive={false}
              showActions={true}
              userDisplayName={
                userDisplayNames[rootMessage.user_id] || "Unknown User"
              }
              userImageUrl={userImageUrls[rootMessage.user_id]}
              userStatus={userStatuses[rootMessage.user_id]}
              currentUserId={currentUser?.id}
              onEdit={() => handleEditMessage(rootMessage)}
              onDelete={() => handleDeleteMessage(rootMessage)}
              editFormComponent={
                editingMessageId === rootMessage.id
                  ? renderEditForm(rootMessage)
                  : undefined
              }
              isEditing={editingMessageId === rootMessage.id}
            />
          </Box>
          <Divider />
        </>
      )}

      {/* Thread messages */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {threadMessages.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No replies yet
          </Typography>
        ) : (
          threadMessages.map((message) => (
            <MessageItemUI
              key={message.id}
              item={message}
              isActive={false}
              showActions={true}
              userDisplayName={
                userDisplayNames[message.user_id] || "Unknown User"
              }
              userImageUrl={userImageUrls[message.user_id]}
              userStatus={userStatuses[message.user_id]}
              showReactions={true}
              currentUserId={currentUser?.id}
              onEdit={() => handleEditMessage(message)}
              onDelete={() => handleDeleteMessage(message)}
              editFormComponent={
                editingMessageId === message.id
                  ? renderEditForm(message)
                  : undefined
              }
              isEditing={editingMessageId === message.id}
            />
          ))
        )}
      </Box>

      {/* Reply input */}
      {showReplyInput && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <MessageInputUI
            placeholder="Reply in thread..."
            allowAttachments={allowAttachments}
            allowEmojis={allowEmojis}
            isUploading={isUploading}
            isSending={isSending}
            maxAttachments={maxAttachments}
            maxFileSize={maxFileSize}
            onSubmit={handleSendReply}
            onTyping={handleTyping}
            emojiPickerComponent={emojiPickerComponent}
          />
        </Box>
      )}
    </Box>
  );
};

export default MessageThreadContainer;
