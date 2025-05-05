// src/internal/containers/messages/MessageInputContainer.tsx
/**
 * Container for message input
 * Handles message composition, file uploads, and sending
 */
import React, { useCallback, useState, useEffect, useRef } from "react";
import { useBaseContainer } from "../base/BaseContainer";
import { useMessages, useThread } from "../../../hooks";
import { useTypingIndicator } from "../../../hooks/useWebSocket";
import { Channel, Message } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import MessageInputUI from "../../components/messages/MessageInputUI";
import FileUploadContainer from "./FileUploadContainer";

export interface MessageInputContainerProps {
  /** Channel ID */
  channelId: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Whether this input is for a thread */
  isThreadReply?: boolean;
  /** Root message ID if in thread */
  rootId?: string;
  /** Message to reply to */
  replyToMessage?: Message | null;
  /** Message being edited */
  editingMessage?: Message | null;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show file upload button */
  showFileUpload?: boolean;
  /** Whether to suggest emojis */
  suggestEmojis?: boolean;
  /** Whether to suggest mentions */
  suggestMentions?: boolean;
  /** Whether to suggest channels */
  suggestChannels?: boolean;
  /** Whether to show formatting options */
  showFormatting?: boolean;
  /** Callback when message is sent */
  onMessageSent?: (message: Message) => void;
  /** Callback when reply is canceled */
  onCancelReply?: () => void;
  /** Callback when edit is canceled */
  onCancelEdit?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for message input
 * Manages composition, file uploads, and sending messages
 */
const MessageInputContainer: React.FC<MessageInputContainerProps> = (props) => {
  const {
    channelId,
    channel,
    isThreadReply = false,
    rootId,
    replyToMessage,
    editingMessage,
    placeholder = "Write a message...",
    showFileUpload = true,
    suggestEmojis = true,
    suggestMentions = true,
    suggestChannels = true,
    showFormatting = true,
    onMessageSent,
    onCancelReply,
    onCancelEdit,
    className,
    sx,
    id,
  } = props;

  // State for input text
  const [messageText, setMessageText] = useState("");
  // State for uploaded files
  const [fileIds, setFileIds] = useState<string[]>([]);
  // State for suggestions visibility
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Use dialog for confirmations
  const dialog = useDialog();

  // Input ref for focusing
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use Typing indicator for real-time typing updates
  const { isTyping, typingUserIds, sendTypingEvent } = useTypingIndicator(
    channelId,
    rootId,
  );

  // Use messages/thread hooks based on context
  const messagesHook =
    isThreadReply && rootId ? useThread(rootId) : useMessages(channelId);

  const {
    sendMessage,
    sendReply,
    uploadFiles: uploadMessageFiles,
    isSending,
    isUploading,
  } = messagesHook as any; // Using any to accommodate both hook types

  // Use BaseContainer for common functionality
  const [baseState, baseAPI] = useBaseContainer({
    initialLoading: isSending || isUploading,
    id,
    className,
    sx,
  });

  // Initialize message text from editingMessage if present
  useEffect(() => {
    if (editingMessage) {
      setMessageText(editingMessage.message);
    } else {
      setMessageText("");
    }
  }, [editingMessage]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle text input change
  const handleTextChange = useCallback(
    (text: string) => {
      setMessageText(text);

      // Send typing indicator
      if (text.length > 0) {
        sendTypingEvent();
      }
    },
    [sendTypingEvent],
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (files: File[]) => {
      try {
        const newFileIds = await uploadMessageFiles(files);
        setFileIds((prev) => [...prev, ...newFileIds]);
        return newFileIds;
      } catch (error) {
        baseAPI.setError(
          error instanceof Error ? error : new Error("Upload failed"),
        );
        return [];
      }
    },
    [uploadMessageFiles, baseAPI],
  );

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    setFileIds((prev) => prev.filter((id) => id !== fileId));
  }, []);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageText((prev) => prev + emoji);
    setShowEmojiPicker(false);

    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle message send
  const handleSend = useCallback(async () => {
    if (messageText.trim().length === 0 && fileIds.length === 0) {
      return;
    }

    try {
      let result: Message | null = null;

      if (editingMessage) {
        // TODO: Handle message editing
        // This would call updateMessage or similar
        return;
      }

      if (isThreadReply && rootId) {
        result = await sendReply(messageText, fileIds);
      } else {
        result = await sendMessage(messageText, fileIds);
      }

      // Clear input after sending
      setMessageText("");
      setFileIds([]);

      // Callback
      if (result && onMessageSent) {
        onMessageSent(result);
      }
    } catch (error) {
      baseAPI.setError(
        error instanceof Error ? error : new Error("Failed to send message"),
      );
    }
  }, [
    messageText,
    fileIds,
    isThreadReply,
    rootId,
    editingMessage,
    sendReply,
    sendMessage,
    onMessageSent,
    baseAPI,
  ]);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    if (onCancelReply) {
      onCancelReply();
    }
  }, [onCancelReply]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    if (
      messageText !== (editingMessage?.message || "") &&
      messageText.trim() !== ""
    ) {
      dialog
        .confirmAsync({
          title: "Discard Changes",
          message: "Are you sure you want to discard your changes?",
          confirmText: "Discard",
          cancelText: "Keep Editing",
        })
        .then((confirmed) => {
          if (confirmed && onCancelEdit) {
            setMessageText("");
            onCancelEdit();
          }
        });
    } else if (onCancelEdit) {
      onCancelEdit();
    }
  }, [messageText, editingMessage, dialog, onCancelEdit]);

  // Prepare UI props
  const uiProps = {
    messageText,
    fileIds,
    replyToMessage,
    editingMessage,
    placeholder,
    showFileUpload,
    suggestEmojis,
    suggestMentions,
    suggestChannels,
    showFormatting,
    isLoading: baseState.isLoading,
    isSending,
    isUploading,
    showEmojiPicker,
    typingUsers: typingUserIds,
    inputRef,
    onTextChange: handleTextChange,
    onSend: handleSend,
    onFileUpload: handleFileUpload,
    onRemoveFile: handleRemoveFile,
    onEmojiSelect: handleEmojiSelect,
    onToggleEmojiPicker: () => setShowEmojiPicker((prev) => !prev),
    onCancelReply: handleCancelReply,
    onCancelEdit: handleCancelEdit,
    fileUploadRenderer: ({ onUpload }: { onUpload: any }) => (
      <FileUploadContainer
        channelId={channelId}
        onUploadComplete={(ids) => {
          setFileIds((prev) => [...prev, ...ids]);
        }}
        onUploadError={(error) => {
          baseAPI.setError(error);
        }}
      />
    ),
    className,
    sx,
    id,
  };

  return <MessageInputUI {...uiProps} />;
};

// Memoize to prevent unnecessary rerenders
export default React.memo(MessageInputContainer);
