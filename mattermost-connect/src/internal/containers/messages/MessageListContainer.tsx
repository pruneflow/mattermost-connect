// src/internal/containers/messages/MessageListContainer.tsx
/**
 * Container component for message list that manages data fetching and state
 */
import React, { useCallback, useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { useMessages } from "../../../hooks/useMessages";
import {
  useWebSocketMessageEvents,
  useWebSocketTypingEvents,
  useTypingIndicator,
} from "../../../hooks/useWebSocket";
import { BaseComponentProps } from "../../types/componentTypes";
import MessageListUI from "../../components/messages/MessageListUI";
import MessageInputUI from "../../components/messages/MessageInputUI";
import { Message } from "../../../index";
import { getUserStatus, useUserStore } from "../../../core/store/userStore";
import { useMessageStore } from "../../../core/store/messageStore";
import { useAuthStore } from "../../../core/store/authStore";
import { useChannelUnreadCount } from "../../../hooks/useUnreadCounts";

export interface MessageListContainerProps extends BaseComponentProps {
  /** Channel ID to display messages for */
  channelId: string;
  /** Whether to show message input */
  showInput?: boolean;
  /** Whether to allow file uploads */
  allowFileUploads?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Custom emoji picker component */
  emojiPickerComponent?: React.ReactNode;
  /** Callback when message is sent */
  onMessageSent?: (message: Message) => void;
  /** Callback when message is edited */
  onMessageEdited?: (message: Message) => void;
  /** Callback when message is deleted */
  onMessageDeleted?: (messageId: string) => void;
}

const MessageListContainer: React.FC<MessageListContainerProps> = ({
  channelId,
  showInput = true,
  allowFileUploads = true,
  allowEmojis = true,
  maxAttachments = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  emojiPickerComponent,
  onMessageSent,
  onMessageEdited,
  onMessageDeleted,
  className,
  sx,
  id,
}) => {
  // Get message data from hooks
  const {
    messages,
    pinnedMessages,
    highlightedMessageId,
    replyToMessage,
    editingMessageId,
    isLoading,
    isEditing,
    error,
    refreshMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    uploadFiles,
    setReplyToMessage,
    setEditingMessage,
  } = useMessages(channelId);

  // Get unread counts from specialized hook
  const { markAsRead } = useChannelUnreadCount(channelId);

  // Get user store for display names and status
  const { getUserById, getUserDisplayName } = useUserStore();

  // Get current user
  const { currentUser } = useAuthStore();

  // Get typing users safely using a local state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // State for whether message is being sent
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // State for edit form message
  const [editFormMessage, setEditFormMessage] = useState("");

  // Reference to the message being edited
  const editingMessageRef = useRef<Message | null>(null);

  // Mark channel as read when viewing messages
  useEffect(() => {
    if (channelId) {
      // Small delay to allow UI to render first
      const timer = setTimeout(() => {
        markAsRead();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [channelId, markAsRead]);

  // Listening for WebSocket message events
  useWebSocketMessageEvents(
    (data) => {
      if (data.channel_id === channelId) {
        refreshMessages();
      }
    },
    [channelId, refreshMessages],
  );

  // Listening for typing events
  useWebSocketTypingEvents(
    channelId,
    (data) => {
      setTypingUsers((prevUsers) => {
        // Add user if not already there
        if (!prevUsers.includes(data.user_id)) {
          const newUsers = [...prevUsers, data.user_id];

          // Auto-remove after 5 seconds (typical typing indicator lifetime)
          setTimeout(() => {
            setTypingUsers((users) =>
              users.filter((id) => id !== data.user_id),
            );
          }, 5000);

          return newUsers;
        }
        return prevUsers;
      });
    },
    [channelId],
  );

  // Update editing form when message changes
  useEffect(() => {
    if (editingMessageId) {
      const message = messages.find((m) => m.id === editingMessageId);
      if (message) {
        setEditFormMessage(message.message);
        editingMessageRef.current = message;
      }
    } else {
      setEditFormMessage("");
      editingMessageRef.current = null;
    }
  }, [editingMessageId, messages]);

  // Map pinned message IDs to a set for easy lookup
  const pinnedMessageIdsSet = React.useMemo(() => {
    return new Set<string>((pinnedMessages || []).map((m: any) => m.id));
  }, [pinnedMessages]);

  // Build user display names map
  const userDisplayNames = React.useMemo(() => {
    const displayNames: Record<string, string> = {};

    messages.forEach((message) => {
      if (!displayNames[message.user_id]) {
        displayNames[message.user_id] = getUserDisplayName(message.user_id);
      }
    });

    // Also add typing users to ensure their names are available
    typingUsers.forEach((userId) => {
      if (!displayNames[userId]) {
        displayNames[userId] = getUserDisplayName(userId);
      }
    });

    return displayNames;
  }, [messages, typingUsers, getUserDisplayName]);

  // Build user image URLs map
  const userImageUrls = React.useMemo(() => {
    const imageUrls: Record<string, string> = {};

    messages.forEach((message) => {
      const user = getUserById(message.user_id);
      if (user && user.last_picture_update && !imageUrls[message.user_id]) {
        imageUrls[message.user_id] =
          `/api/v4/users/${user.id}/image?_=${user.last_picture_update}`;
      }
    });

    return imageUrls;
  }, [messages, getUserById]);

  // Build user statuses map
  const userStatuses = React.useMemo(() => {
    const statuses: Record<string, "online" | "away" | "dnd" | "offline"> = {};

    messages.forEach((message) => {
      if (!statuses[message.user_id]) {
        statuses[message.user_id] = getUserStatus(message.user_id);
      }
    });

    return statuses;
  }, [messages]);

  // Handle loading more past messages
  const handleLoadMorePast = useCallback(() => {
    // This would implement pagination
    console.log("Load more past messages");
  }, []);

  // Handle edit message
  const handleEditMessage = useCallback(
    (message: Message) => {
      setEditingMessage(message.id);
    },
    [setEditingMessage],
  );

  // Handle reply to message
  const handleReplyToMessage = useCallback(
    (message: Message) => {
      setReplyToMessage(message);
    },
    [setReplyToMessage],
  );

  // Handle delete message
  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      try {
        await deleteMessage(message.id);

        if (onMessageDeleted) {
          onMessageDeleted(message.id);
        }
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    },
    [deleteMessage, onMessageDeleted],
  );

  // Handle toggle pin
  const handleTogglePin = useCallback(
    async (message: Message) => {
      try {
        const isPinned = pinnedMessageIdsSet.has(message.id);

        if (isPinned) {
          await unpinMessage(message.id);
        } else {
          await pinMessage(message.id);
        }
      } catch (error) {
        console.error("Error toggling pin:", error);
      }
    },
    [pinMessage, unpinMessage, pinnedMessageIdsSet],
  );

  // Handle add reaction
  const handleAddReaction = useCallback((message: Message) => {
    // This would open an emoji picker for the specific message
    console.log("Add reaction to message:", message.id);
  }, []);

  // Handle reaction click
  const handleReactionClick = useCallback((message: Message, emoji: string) => {
    // This would toggle the reaction
    console.log("Toggle reaction:", emoji, "on message:", message.id);
  }, []);

  // Handle message sending
  const handleSendMessage = useCallback(
    async (text: string, files: File[]) => {
      if ((!text && files.length === 0) || isSendingMessage) return;

      setIsSendingMessage(true);

      try {
        // Upload files if any
        let fileIds: string[] = [];
        if (files.length > 0) {
          fileIds = await uploadFiles(files);
        }

        // Send the message
        const sentMessage = await sendMessage(text, fileIds);

        if (onMessageSent) {
          onMessageSent(sentMessage);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [sendMessage, uploadFiles, isSendingMessage, onMessageSent],
  );

  // Handle edit save
  const handleEditSave = useCallback(
    async (text: string) => {
      if (!editingMessageId || !editingMessageRef.current) return;

      try {
        const updatedMessage = await editMessage(editingMessageId, text);
        setEditingMessage(null);

        if (onMessageEdited) {
          onMessageEdited(updatedMessage);
        }
      } catch (error) {
        console.error("Error editing message:", error);
      }
    },
    [editingMessageId, editMessage, setEditingMessage, onMessageEdited],
  );

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingMessage(null);
  }, [setEditingMessage]);

  // Handle reply cancel
  const handleReplyCancel = useCallback(() => {
    setReplyToMessage(null);
  }, [setReplyToMessage]);

  // Get typing indicator hook
  const sendTypingEvent = useTypingIndicator(channelId);

  // Handle user typing
  const handleTyping = useCallback(() => {
    if (sendTypingEvent) {
      sendTypingEvent();
    }
  }, [sendTypingEvent]);

  // Render edit form
  const renderEditForm = useCallback(
    (message: Message) => {
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

  // Get reply-to user name
  const replyToUserName = replyToMessage
    ? userDisplayNames[replyToMessage.user_id] || "User"
    : "User";

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
      {/* Message list */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <MessageListUI
          messages={messages}
          isLoading={isLoading}
          highlightedMessageId={highlightedMessageId}
          editingMessageId={editingMessageId}
          error={error}
          userDisplayNames={userDisplayNames}
          userImageUrls={userImageUrls}
          userStatuses={userStatuses}
          pinnedMessageIds={pinnedMessageIdsSet}
          currentUserId={currentUser?.id}
          onMessageClick={() => {}}
          onLoadMorePast={handleLoadMorePast}
          onEditMessage={handleEditMessage}
          onReplyToMessage={handleReplyToMessage}
          onDeleteMessage={handleDeleteMessage}
          onTogglePin={handleTogglePin}
          onAddReaction={handleAddReaction}
          onReactionClick={handleReactionClick}
          renderEditForm={renderEditForm}
          typingUserIds={typingUsers}
          sx={{ height: "100%" }}
        />
      </Box>

      {/* Message input */}
      {showInput && (
        <Box sx={{ mt: 2 }}>
          <MessageInputUI
            placeholder="Type a message..."
            allowAttachments={allowFileUploads}
            allowEmojis={allowEmojis}
            isReply={!!replyToMessage}
            replyToMessage={replyToMessage}
            isUploading={false}
            isSending={isSendingMessage}
            maxAttachments={maxAttachments}
            maxFileSize={maxFileSize}
            onSubmit={handleSendMessage}
            onCancelReply={handleReplyCancel}
            onTyping={handleTyping}
            emojiPickerComponent={emojiPickerComponent}
            replyToUserName={replyToUserName}
          />
        </Box>
      )}
    </Box>
  );
};

export default MessageListContainer;
