// src/components/MessageComposer/MessageComposer.tsx
import React, { useState, useRef, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";

// Material-UI Components
import {
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  InputAdornment,
  CircularProgress,
  Paper,
  Tooltip,
  SxProps,
  Theme,
  useTheme,
} from "@mui/material";

// Material-UI Icons
import {
  Send as SendIcon,
  AttachFile as AttachmentIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Code as CodeIcon,
} from "@mui/icons-material";

// Related components
import AttachmentPreview from "./AttachmentPreview";

/**
 * Props for the MessageComposer component
 */
export interface MessageComposerProps {
  /** Channel ID to send messages to */
  channelId?: string;

  /** Placeholder text for the input */
  placeholder?: string;

  /** Whether to allow file attachments */
  allowAttachments?: boolean;

  /** Whether to show the send button */
  showSendButton?: boolean;

  /** Maximum height of the text area before scrolling */
  maxHeight?: string | number;

  /** Callback when a message is sent */
  onMessageSent?: (message: any) => void;

  /** Whether to disable sending on Enter key (Shift+Enter will always add a new line) */
  disableEnterKey?: boolean;

  /** Initial message text */
  initialText?: string;

  /** Whether the composer is disabled */
  disabled?: boolean;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Styling for text input */
  inputSx?: SxProps<Theme>;

  /** Styling for toolbar */
  toolbarSx?: SxProps<Theme>;

  /** Styling for button area */
  buttonsSx?: SxProps<Theme>;
}

/**
 * A component for composing and sending messages in a channel
 */
const MessageComposer: React.FC<MessageComposerProps> = ({
  channelId,
  placeholder = "Type a message...",
  allowAttachments = true,
  showSendButton = true,
  maxHeight = "150px",
  onMessageSent,
  disableEnterKey = false,
  initialText = "",
  disabled = false,
  className,
  style,
  sx,
  inputSx,
  toolbarSx,
  buttonsSx,
}) => {
  const theme = useTheme();
  const { service, isConnected } = useMattermost();
  const [message, setMessage] = useState(initialText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when channel changes
  useEffect(() => {
    setMessage("");
    setFiles([]);
    setError(null);
  }, [channelId]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textFieldRef.current) {
      // Reset height to calculate scroll height correctly
      textFieldRef.current.style.height = "auto";

      // Set new height based on content
      const scrollHeight = textFieldRef.current.scrollHeight;
      const maxHeightNum =
        typeof maxHeight === "string" ? parseInt(maxHeight, 10) : maxHeight;

      textFieldRef.current.style.height =
        Math.min(scrollHeight, maxHeightNum) + "px";
    }
  }, [message, maxHeight]);

  // Send the message
  const sendMessage = async () => {
    if (!isConnected || !channelId || !message.trim() || disabled) return;

    setSending(true);
    setError(null);

    try {
      // Send the text message
      const response = await service?.postMessage(channelId, message);

      // Handle file attachments if present
      if (files.length > 0 && response) {
        await handleFileAttachments(response.id);
      }

      // Reset form
      setMessage("");
      setFiles([]);

      // Trigger callback if provided
      if (onMessageSent && response) {
        onMessageSent(response);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle file attachments
  const handleFileAttachments = async (postId: string) => {
    if (!postId || files.length === 0 || !service?.uploadFiles) return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("channel_id", channelId || "");
      formData.append("post_id", postId);

      // Add all files
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Upload using the service
      await service.uploadFiles(formData);
    } catch (err) {
      console.error("Error uploading files:", err);
      setError(err instanceof Error ? err.message : "Failed to upload files");
    }
  };

  // Handle keyboard events (Enter to send, Shift+Enter for new line)
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey && !disableEnterKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  // Insert formatting into the message
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textFieldRef.current) return;

    const input = textFieldRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selectedText = message.substring(start, end);

    // If text is selected, wrap it with formatting
    // Otherwise, insert formatting and place cursor between tags
    if (selectedText) {
      const formattedText = prefix + selectedText + suffix;
      const newMessage =
        message.substring(0, start) + formattedText + message.substring(end);
      setMessage(newMessage);

      // Set cursor position after formatting is applied
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      const newMessage =
        message.substring(0, start) + prefix + suffix + message.substring(end);
      setMessage(newMessage);

      // Place cursor between tags
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    }
  };

  return (
    <Paper
      elevation={0}
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: "column",
        p: 2,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        ...sx,
      }}
    >
      {/* File attachments preview */}
      {allowAttachments && files.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {files.map((file, index) => (
              <AttachmentPreview
                key={index}
                file={file}
                onRemove={() => removeFile(index)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {/* Formatting toolbar */}
      <Box
        sx={{
          display: "flex",
          mb: 1,
          ...toolbarSx,
        }}
      >
        <Tooltip title="Bold">
          <IconButton
            size="small"
            onClick={() => insertFormatting("**")}
            disabled={disabled || sending}
          >
            <BoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Italic">
          <IconButton
            size="small"
            onClick={() => insertFormatting("*")}
            disabled={disabled || sending}
          >
            <ItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Code">
          <IconButton
            size="small"
            onClick={() => insertFormatting("`")}
            disabled={disabled || sending}
          >
            <CodeIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Code Block">
          <IconButton
            size="small"
            onClick={() => insertFormatting("```\n", "\n```")}
            disabled={disabled || sending}
          >
            <CodeIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main input area */}
      <Box sx={{ display: "flex" }}>
        <TextField
          inputRef={textFieldRef}
          multiline
          fullWidth
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending || !isConnected}
          slotProps={{
            input: {
              sx: {
                maxHeight,
                overflowY: "auto",
                ...inputSx,
              },
              endAdornment: (
                <InputAdornment position="end" sx={{ alignSelf: "flex-end" }}>
                  {allowAttachments && (
                    <Tooltip title="Attach files">
                      <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || sending || !isConnected}
                        size="small"
                      >
                        <AttachmentIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
        />

        {/* Hidden file input */}
        {allowAttachments && (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={disabled || sending || !isConnected}
          />
        )}

        {/* Send button */}
        {showSendButton && (
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              ml: 1,
              ...buttonsSx,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              disabled={disabled || sending || !message.trim() || !isConnected}
              endIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </Box>
        )}
      </Box>

      {/* Keyboard shortcut hint */}
      {!disableEnterKey && (
        <Typography
          variant="caption"
          color="text.secondary"
          align="right"
          sx={{ mt: 1 }}
        >
          Press{" "}
          <kbd
            style={{
              backgroundColor: theme.palette.action.hover,
              padding: "2px 5px",
              borderRadius: 3,
            }}
          >
            Enter
          </kbd>{" "}
          to send,
          <kbd
            style={{
              backgroundColor: theme.palette.action.hover,
              padding: "2px 5px",
              borderRadius: 3,
              margin: "0 4px",
            }}
          >
            Shift
          </kbd>{" "}
          +
          <kbd
            style={{
              backgroundColor: theme.palette.action.hover,
              padding: "2px 5px",
              borderRadius: 3,
            }}
          >
            Enter
          </kbd>{" "}
          for new line
        </Typography>
      )}
    </Paper>
  );
};

export default MessageComposer;
