// src/internal/components/messages/MessageInputUI.tsx
/**
 * Component for composing and sending messages
 */
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Collapse,
  Fade,
  CircularProgress,
  Chip,
  Button,
  Popover,
  Divider,
  Typography,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon,
  Close as CloseIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberListIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
} from "@mui/icons-material";
import { BaseComponentProps } from "../../types/componentTypes";
import { Message } from "../../../types";
import { TypingIndicator } from "../common";

export interface MessageInputUIProps extends BaseComponentProps {
  /** Current message text */
  messageText: string;
  /** File IDs attached to the message */
  fileIds?: string[];
  /** Message being replied to (if any) */
  replyToMessage?: Message | null;
  /** Message being edited (if any) */
  editingMessage?: Message | null;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether to allow file attachments */
  showFileUpload?: boolean;
  /** Whether to show emoji picker */
  suggestEmojis?: boolean;
  /** Whether to suggest mentions */
  suggestMentions?: boolean;
  /** Whether to suggest channels */
  suggestChannels?: boolean;
  /** Whether to show formatting toolbar */
  showFormatting?: boolean;
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Whether a message is being sent */
  isSending?: boolean;
  /** Whether a file is being uploaded */
  isUploading?: boolean;
  /** Whether the emoji picker is visible */
  showEmojiPicker?: boolean;
  /** IDs of users currently typing */
  typingUsers?: string[];
  /** Input element ref */
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  /** Callback when text changes */
  onTextChange?: (text: string) => void;
  /** Callback when message is submitted */
  onSend?: () => void;
  /** Callback when file upload is triggered */
  onFileUpload?: (files: File[]) => void;
  /** Callback when file is removed */
  onRemoveFile?: (fileId: string) => void;
  /** Callback when emoji is selected */
  onEmojiSelect?: (emoji: string) => void;
  /** Callback to toggle emoji picker visibility */
  onToggleEmojiPicker?: () => void;
  /** Callback when reply is cancelled */
  onCancelReply?: () => void;
  /** Callback when edit is cancelled */
  onCancelEdit?: () => void;
  /** Component to render file upload UI */
  fileUploadRenderer?: React.ReactNode | ((props: any) => React.ReactNode);
}

/**
 * Message Input UI Component
 *
 * Provides a rich text input for composing and sending messages
 */
const MessageInputUI: React.FC<MessageInputUIProps> = ({
  messageText = "",
  fileIds = [],
  replyToMessage = null,
  editingMessage = null,
  placeholder = "Type a message...",
  showFileUpload = true,
  suggestEmojis = true,
  suggestMentions = true,
  suggestChannels = true,
  showFormatting = true,
  isLoading = false,
  isSending = false,
  isUploading = false,
  showEmojiPicker = false,
  typingUsers = [],
  inputRef: propInputRef,
  onTextChange,
  onSend,
  onFileUpload,
  onRemoveFile,
  onEmojiSelect,
  onToggleEmojiPicker,
  onCancelReply,
  onCancelEdit,
  fileUploadRenderer,
  className,
  sx,
  id,
}) => {
  // Local input ref if none provided
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = propInputRef || localInputRef;

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for formatting toolbar visibility
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);

  // Emoji anchor for popover
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(
    null,
  );

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onTextChange) {
      onTextChange(e.target.value);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Submit on Enter (but not with Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if ((!messageText.trim() && fileIds.length === 0) || isLoading) return;

    if (onSend) {
      onSend();
    }
  };

  // Handle file selection
  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onFileUpload) return;

    const fileArray = Array.from(files);
    onFileUpload(fileArray);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  // Handle emoji button click
  const handleEmojiButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setEmojiAnchorEl(event.currentTarget);
    if (onToggleEmojiPicker) {
      onToggleEmojiPicker();
    }
  };

  // Handle emoji picker close
  const handleEmojiPickerClose = () => {
    setEmojiAnchorEl(null);
    if (onToggleEmojiPicker && showEmojiPicker) {
      onToggleEmojiPicker();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    if (onEmojiSelect) {
      onEmojiSelect(emoji);
    }
    handleEmojiPickerClose();
  };

  // Formatting functions
  const insertFormatting = (opening: string, closing: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = messageText.substring(start, end);
    const beforeText = messageText.substring(0, start);
    const afterText = messageText.substring(end);

    const newText = beforeText + opening + selectedText + closing + afterText;

    if (onTextChange) {
      onTextChange(newText);
    }

    // Focus and set cursor position after formatting is inserted
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + opening.length, end + opening.length);
    }, 0);
  };

  // Format handlers
  const handleBoldClick = () => insertFormatting("**", "**");
  const handleItalicClick = () => insertFormatting("*", "*");
  const handleCodeClick = () => insertFormatting("`", "`");
  const handleBulletListClick = () => insertFormatting("\n- ", "");
  const handleNumberListClick = () => insertFormatting("\n1. ", "");
  const handleLinkClick = () => insertFormatting("[", "](url)");

  // Check if we're in edit or reply mode
  const isEditing = editingMessage !== null;
  const isReplying = replyToMessage !== null;

  // Get display name for reply
  const replyToUserName = replyToMessage?.user_id || "User";

  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return "";
    return text.length <= maxLength
      ? text
      : text.substring(0, maxLength) + "...";
  };

  // Disabled state
  const isDisabled = isSending || isUploading;

  return (
    <Paper
      className={className}
      elevation={2}
      sx={{
        p: 1,
        ...sx,
      }}
      id={id}
    >
      {/* Reply indicator */}
      {isReplying && replyToMessage && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            mb: 1,
            borderRadius: 1,
            bgcolor: "action.hover",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Chip
              label={`Replying to ${replyToUserName}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Box
              sx={{
                typography: "body2",
                color: "text.secondary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: {
                  xs: 150,
                  sm: 300,
                  md: 450,
                },
              }}
            >
              {truncateText(replyToMessage.message)}
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={onCancelReply}
            disabled={isDisabled}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* File attachments area */}
      {fileIds && fileIds.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {/* Here you would render the file attachments */}
          {/* This would integrate with a FileAttachmentList component */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {fileIds.map((fileId) => (
              <Chip
                key={fileId}
                label={`File ${fileId}`}
                onDelete={() => onRemoveFile && onRemoveFile(fileId)}
                disabled={isDisabled}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Typing indicator */}
      {typingUsers && typingUsers.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <TypingIndicator
            userIds={typingUsers}
            userNames={{}} // Would be populated from container
          />
        </Box>
      )}

      {/* Formatting toolbar */}
      <Collapse in={showFormattingToolbar && showFormatting}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1,
            p: 0.5,
            borderRadius: 1,
            bgcolor: "background.default",
          }}
        >
          <Tooltip title="Bold">
            <IconButton
              size="small"
              onClick={handleBoldClick}
              disabled={isDisabled}
            >
              <BoldIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic">
            <IconButton
              size="small"
              onClick={handleItalicClick}
              disabled={isDisabled}
            >
              <ItalicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Code">
            <IconButton
              size="small"
              onClick={handleCodeClick}
              disabled={isDisabled}
            >
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bullet List">
            <IconButton
              size="small"
              onClick={handleBulletListClick}
              disabled={isDisabled}
            >
              <BulletListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Numbered List">
            <IconButton
              size="small"
              onClick={handleNumberListClick}
              disabled={isDisabled}
            >
              <NumberListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Link">
            <IconButton
              size="small"
              onClick={handleLinkClick}
              disabled={isDisabled}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Collapse>

      {/* Main input area */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end", // Align to bottom for multi-line input
        }}
      >
        {/* Toggle formatting button */}
        {showFormatting && (
          <Tooltip
            title={
              showFormattingToolbar ? "Hide formatting" : "Show formatting"
            }
          >
            <IconButton
              size="small"
              onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
              sx={{ mb: 0.5 }}
              disabled={isDisabled}
            >
              {showFormattingToolbar ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Text input */}
        <TextField
          fullWidth
          multiline
          inputRef={inputRef}
          placeholder={placeholder}
          value={messageText}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          variant="outlined"
          size="small"
          disabled={isDisabled}
          InputProps={{
            sx: {
              borderRadius: 2,
              backgroundColor: "background.paper",
            },
          }}
          sx={{
            flex: 1,
          }}
        />

        {/* Action buttons */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            ml: 1,
          }}
        >
          {/* Attachment button */}
          {showFileUpload && (
            <Tooltip title="Attach file">
              <IconButton
                size="small"
                onClick={handleFileClick}
                disabled={isDisabled}
                sx={{ mb: 0.5 }}
              >
                <AttachIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Emoji button */}
          {suggestEmojis && (
            <Tooltip title="Add emoji">
              <IconButton
                size="small"
                onClick={handleEmojiButtonClick}
                disabled={isDisabled}
                sx={{ mb: 0.5 }}
              >
                <EmojiIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Send button or cancel button for editing */}
          {isEditing ? (
            <>
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={onCancelEdit}
                  disabled={isDisabled}
                  sx={{ mb: 0.5 }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save changes">
                <IconButton
                  color="primary"
                  size="small"
                  onClick={handleSubmit}
                  disabled={!messageText.trim() || isDisabled}
                  sx={{ mb: 0.5 }}
                >
                  {isSending ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Send message">
              <IconButton
                color="primary"
                size="small"
                onClick={handleSubmit}
                disabled={
                  (!messageText.trim() && fileIds.length === 0) || isDisabled
                }
                sx={{ mb: 0.5 }}
              >
                {isSending ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,application/pdf,text/*,application/zip,application/x-zip-compressed"
        />
      </Box>

      {/* Emoji picker popover */}
      <Popover
        open={showEmojiPicker && Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={handleEmojiPickerClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {/* This would integrate with an EmojiPicker component */}
        <Box sx={{ p: 2, width: 300, height: 300 }}>
          <Typography variant="body2">Emoji picker would go here</Typography>
        </Box>
      </Popover>

      {/* File upload UI */}
      {typeof fileUploadRenderer === "function" &&
        fileUploadRenderer({ onUpload: onFileUpload })}
    </Paper>
  );
};

export default React.memo(MessageInputUI);
