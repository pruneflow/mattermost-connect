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
import { MessageInputData } from "../../types/componentTypes";
import { Message } from "../../../index";
import FileUploadUI from "./FileUploadUI";
import FilePreviewUI from "./FilePreviewUI";

export interface MessageInputUIProps extends MessageInputData {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Initial value for the input */
  initialValue?: string;
  /** Whether to allow file attachments */
  allowAttachments?: boolean;
  /** Whether to allow emoji reactions */
  allowEmojis?: boolean;
  /** Whether the input is in editing state */
  isEditing?: boolean;
  /** Whether the input is in reply state */
  isReply?: boolean;
  /** Message being replied to (if any) */
  replyToMessage?: Message | null;
  /** Whether files are being uploaded */
  isUploading?: boolean;
  /** Whether the message is being sent */
  isSending?: boolean;
  /** Maximum number of files that can be attached */
  maxAttachments?: number;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Callback when a message is submitted */
  onSubmit?: (text: string, attachments: File[]) => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
  /** Callback when reply is cancelled */
  onCancelReply?: () => void;
  /** Callback when the user is typing */
  onTyping?: () => void;
  /** Emoji picker component */
  emojiPickerComponent?: React.ReactNode;
  /** User display name for the reply message */
  replyToUserName?: string;
}

const MessageInputUI: React.FC<MessageInputUIProps> = ({
  placeholder = "Type a message...",
  initialValue = "",
  allowAttachments = true,
  allowEmojis = true,
  isEditing = false,
  isReply = false,
  replyToMessage = null,
  isUploading = false,
  isSending = false,
  maxAttachments = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  onSubmit,
  onCancel,
  onCancelReply,
  onTyping,
  emojiPickerComponent,
  replyToUserName = "User",
  className,
  sx,
  id,
}) => {
  // State for message text
  const [messageText, setMessageText] = useState(initialValue);

  // State for attachments
  const [attachments, setAttachments] = useState<File[]>([]);

  // State for formatting toolbar visibility
  const [showFormatting, setShowFormatting] = useState(false);

  // State for emoji picker
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(
    null,
  );
  const emojiPickerOpen = Boolean(emojiAnchorEl);

  // Input ref for focusing
  const inputRef = useRef<HTMLInputElement>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset input when editing is cancelled
  useEffect(() => {
    if (!isEditing && !isReply) {
      setMessageText("");
    }
  }, [isEditing, isReply]);

  // Set initial value
  useEffect(() => {
    setMessageText(initialValue);
  }, [initialValue]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    // Trigger typing indicator
    if (onTyping) {
      onTyping();
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
    if ((!messageText && attachments.length === 0) || isSending || isUploading)
      return;

    if (onSubmit) {
      onSubmit(messageText, attachments);
    }

    if (!isEditing) {
      // Clear input only if not editing
      setMessageText("");
      setAttachments([]);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setMessageText("");
    setShowFormatting(false);
  };

  // Handle cancel reply
  const handleCancelReply = () => {
    if (onCancelReply) {
      onCancelReply();
    }
  };

  // Handle file input click
  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);

    // Check for max attachments
    if (attachments.length + newFiles.length > maxAttachments) {
      // Show error or alert - simplified for now
      console.error(`Maximum ${maxAttachments} files allowed`);
      return;
    }

    setAttachments([...attachments, ...newFiles]);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Handle insert formatting
  const insertFormatting = (opening: string, closing: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = messageText.substring(start, end);
    const beforeText = messageText.substring(0, start);
    const afterText = messageText.substring(end);

    const newText = beforeText + opening + selectedText + closing + afterText;
    setMessageText(newText);

    // Focus and set cursor position after formatting is inserted
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + opening.length, end + opening.length);
    }, 0);
  };

  // Handle bold click
  const handleBoldClick = () => {
    insertFormatting("**", "**");
  };

  // Handle italic click
  const handleItalicClick = () => {
    insertFormatting("*", "*");
  };

  // Handle code click
  const handleCodeClick = () => {
    insertFormatting("`", "`");
  };

  // Handle bullet list click
  const handleBulletListClick = () => {
    insertFormatting("\n- ", "");
  };

  // Handle number list click
  const handleNumberListClick = () => {
    insertFormatting("\n1. ", "");
  };

  // Handle link click
  const handleLinkClick = () => {
    insertFormatting("[", "](url)");
  };

  // Handle emoji button click
  const handleEmojiButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  // Handle emoji picker close
  const handleEmojiPickerClose = () => {
    setEmojiAnchorEl(null);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessageText(messageText + emoji);
    setEmojiAnchorEl(null);

    // Focus input after emoji is inserted
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

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
      {isReply && replyToMessage && (
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
          <IconButton size="small" onClick={handleCancelReply}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* File attachments preview */}
      {attachments.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 1,
          }}
        >
          {attachments.map((file, index) => (
            <FilePreviewUI
              key={index}
              file={file}
              isUploading={isUploading}
              onRemove={() => handleRemoveFile(index)}
            />
          ))}
        </Box>
      )}

      {/* Formatting toolbar */}
      <Collapse in={showFormatting}>
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
            <IconButton size="small" onClick={handleBoldClick}>
              <BoldIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic">
            <IconButton size="small" onClick={handleItalicClick}>
              <ItalicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Code">
            <IconButton size="small" onClick={handleCodeClick}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bullet List">
            <IconButton size="small" onClick={handleBulletListClick}>
              <BulletListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Numbered List">
            <IconButton size="small" onClick={handleNumberListClick}>
              <NumberListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Link">
            <IconButton size="small" onClick={handleLinkClick}>
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
        <Tooltip title={showFormatting ? "Hide formatting" : "Show formatting"}>
          <IconButton
            size="small"
            onClick={() => setShowFormatting(!showFormatting)}
            sx={{ mb: 0.5 }}
          >
            {showFormatting ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </Tooltip>

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
          disabled={isSending || isUploading}
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
          {allowAttachments && (
            <Tooltip title="Attach file">
              <IconButton
                size="small"
                onClick={handleFileClick}
                disabled={
                  attachments.length >= maxAttachments ||
                  isSending ||
                  isUploading
                }
                sx={{ mb: 0.5 }}
              >
                <AttachIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Emoji button */}
          {allowEmojis && (
            <Tooltip title="Add emoji">
              <IconButton
                size="small"
                onClick={handleEmojiButtonClick}
                disabled={isSending || isUploading}
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
                  onClick={handleCancel}
                  disabled={isSending}
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
                  disabled={!messageText || isSending}
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
                  (!messageText && attachments.length === 0) ||
                  isSending ||
                  isUploading
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
        open={emojiPickerOpen}
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
        {emojiPickerComponent || (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2">Emoji picker placeholder</Typography>
          </Box>
        )}
      </Popover>
    </Paper>
  );
};

export default MessageInputUI;
