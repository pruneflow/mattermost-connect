// src/components/MessageComposer/MessageComposer.tsx
import React, { useState, useRef, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider";

// Material-UI Components
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Typography,
  InputAdornment,
  useTheme,
  SxProps,
  Theme,
  Collapse,
  Fade,
} from "@mui/material";

// Material-UI Icons
import {
  Send as SendIcon,
  Attachment as AttachmentIcon,
  EmojiEmotions as EmojiIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Components
import AttachmentPreview from "./AttachmentPreview";
import { EmojiPicker, EmojiSelectionResult, PickerMode } from "../EmojiPicker";
import { EmojiProvider } from "../../context/EmojiProvider";

/**
 * Props for the MessageComposer component
 */
export interface MessageComposerProps {
  /** Channel ID where to send the message */
  channelId: string;

  /** Placeholder text for the input */
  placeholder?: string;

  /** Whether to allow file attachments */
  allowAttachments?: boolean;

  /** Whether the composer is disabled */
  disabled?: boolean;

  /** Initial text for the input */
  initialText?: string;

  /** Callback when a message is sent */
  onMessageSent?: (message: string) => void;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;
}

/**
 * A component that allows users to compose and send messages in a channel
 */
const MessageComposer: React.FC<MessageComposerProps> = ({
  channelId,
  placeholder = "Type a message...",
  allowAttachments = true,
  disabled = false,
  initialText = "",
  onMessageSent,
  className,
  style,
  sx,
}) => {
  const theme = useTheme();
  const { service, replyTo, clearReply, isReplying } = useMattermost();

  // State
  const [message, setMessage] = useState(initialText);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Focus on the text field when the component is mounted
  useEffect(() => {
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, []);

  // Reset when the channel changes
  useEffect(() => {
    setMessage(initialText);
    setAttachments([]);
    setError(null);
  }, [channelId, initialText]);

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  // Handle attachment button click
  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle removal of an attachment
  const handleRemoveAttachment = (fileToRemove: File) => {
    setAttachments((prev) => prev.filter((file) => file !== fileToRemove));
  };

  // Handle emoji selection
  const handleEmojiSelect = (result: EmojiSelectionResult) => {
    setMessage((prev) => prev + result.emoji);
    setShowEmojiPicker(false);

    // Focus back on the text field
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  // Close emoji picker
  const closeEmojiPicker = () => {
    setShowEmojiPicker(false);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    try {
      setSending(true);
      setError(null);

      // Handle attachments if present
      let fileIds: string[] = [];
      if (attachments.length > 0 && service.uploadFiles) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append("files", file);
        });

        formData.append("channel_id", channelId);

        const uploadResponse = await service.uploadFiles(formData);
        fileIds = uploadResponse.file_infos.map((file: any) => file.id);
      }

      // Send the message
      let response;

      // If replying to a message
      if (isReplying && replyTo && service.replyToMessage) {
        try {
          console.log(`Tentative de réponse au message ${replyTo.id}`);
          response = await service.replyToMessage(
            channelId,
            replyTo.id,
            message,
          );
          console.log("Réponse envoyée avec succès");
        } catch (replyError) {
          console.error(
            "Erreur lors de la réponse, tentative d'envoi comme message normal:",
            replyError,
          );
          // Fallback - envoyer comme message normal si la réponse échoue
          response = await service.postMessage(channelId, message);
        } finally {
          // Clear reply state dans tous les cas
          clearReply();
        }
      } else {
        // Regular message
        response = await service.postMessage(channelId, message);
      }

      // Reset state
      setMessage("");
      setAttachments([]);

      // Call the callback if provided
      if (onMessageSent) {
        onMessageSent(message);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Handle keypress (send on Enter)
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: 1,
        position: "relative",
        ...sx,
      }}
    >
      {/* Reply context */}
      <Collapse in={isReplying}>
        {replyTo && (
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              mb: 1,
              bgcolor: "action.hover",
              borderRadius: theme.shape.borderRadius,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="body2"
                component="div"
                color="text.secondary"
              >
                Replying to:{" "}
                <strong>
                  {replyTo.message.length > 50
                    ? replyTo.message.substring(0, 50) + "..."
                    : replyTo.message}
                </strong>
              </Typography>
            </Box>
            <IconButton size="small" onClick={clearReply}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Paper>
        )}
      </Collapse>

      {/* Attachment previews */}
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
            <AttachmentPreview
              key={index}
              file={file}
              onRemove={() => handleRemoveAttachment(file)}
            />
          ))}
        </Box>
      )}

      {/* Message input row */}
      <Box sx={{ display: "flex", alignItems: "flex-end" }}>
        {/* Text input */}
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || sending}
          inputRef={textFieldRef}
          variant="outlined"
          size="small"
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: 4,
              padding: 1,
            },
          }}
          InputProps={{
            endAdornment: sending ? (
              <InputAdornment position="end">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: "text.secondary",
                    mr: 1,
                  }}
                >
                  Sending...
                </Box>
              </InputAdornment>
            ) : null,
            className: "message-composer-input", // Classe pour faciliter la mise au point
          }}
        />

        {/* Action buttons */}
        <Box sx={{ display: "flex", ml: 1 }}>
          {/* Emoji picker button */}
          <Tooltip title="Add emoji">
            <IconButton
              color="primary"
              onClick={toggleEmojiPicker}
              disabled={disabled || sending}
              ref={emojiButtonRef}
            >
              <EmojiIcon />
            </IconButton>
          </Tooltip>

          {/* Attachment button */}
          {allowAttachments && (
            <Tooltip title="Add attachment">
              <IconButton
                color="primary"
                onClick={handleAttachmentClick}
                disabled={disabled || sending}
              >
                <AttachmentIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Send button */}
          <Tooltip title="Send message">
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={
                disabled ||
                sending ||
                (!message.trim() && attachments.length === 0)
              }
            >
              <SendIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          multiple
        />
      </Box>

      {/* Error message */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          component="div"
          sx={{ mt: 1 }}
        >
          {error}
        </Typography>
      )}

      {/* Emoji picker popover */}
      <Fade in={showEmojiPicker}>
        <Box
          sx={{
            position: "absolute",
            bottom: "100%",
            right: 16,
            zIndex: 1200,
          }}
        >
          <EmojiProvider>
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={closeEmojiPicker}
              mode={PickerMode.MESSAGE}
            />
          </EmojiProvider>
        </Box>
      </Fade>
    </Box>
  );
};

export default MessageComposer;
