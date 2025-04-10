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
  CircularProgress,
} from "@mui/material";

// Material-UI Icons
import {
  Send as SendIcon,
  Attachment as AttachmentIcon,
  EmojiEmotions as EmojiIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Components
import AttachmentPreview, { MattermostFile } from "./AttachmentPreview";
import { EmojiPicker, EmojiSelectionResult, PickerMode } from "../EmojiPicker";
import { EmojiProvider } from "../../context/EmojiProvider";

/**
 * Submission mode for the MessageComposer
 */
export enum MessageComposerMode {
  /** Component handles API calls automatically (default) */
  AUTO = "auto",
  /** Component only collects data and calls onMessageSent with the data */
  MANUAL = "manual",
}

/**
 * File upload status tracking
 */
interface FileUploadStatus {
  file: File;
  id?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

/**
 * Message data structure returned when using manual mode
 */
export interface MessageData {
  /** Message text content */
  message: string;
  /** Channel ID where the message will be sent */
  channelId: string;
  /** File attachments to send with the message */
  attachments: File[];
  /** File IDs of uploaded attachments */
  fileIds?: string[];
  /** If this is a reply to another message, the ID of that message */
  replyToMessageId?: string;
}

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

  /**
   * Mode controlling how the component handles message submission
   * - AUTO: component handles API calls automatically (default)
   * - MANUAL: component only collects data and calls onMessageSent with the data
   */
  mode?: MessageComposerMode;

  /**
   * Callback when a message is sent
   * In AUTO mode: Called after successful message submission with the message text
   * In MANUAL mode: Called with all message data, component expects parent to handle submission
   */
  onMessageSent?: ((message: string) => void) | ((data: MessageData) => void);

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;
}

/**
 * A component that allows users to compose and send messages in a channel
 * with support for file attachments and emoji selection
 */
const MessageComposer: React.FC<MessageComposerProps> = ({
  channelId,
  placeholder = "Type a message...",
  allowAttachments = true,
  disabled = false,
  initialText = "",
  mode = MessageComposerMode.AUTO,
  onMessageSent,
  className,
  style,
  sx,
}) => {
  const theme = useTheme();
  const { service, replyTo, clearReply, isReplying } = useMattermost();

  // State
  const [message, setMessage] = useState(initialText);
  const [attachmentStatus, setAttachmentStatus] = useState<FileUploadStatus[]>(
    [],
  );
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const isSubmittingRef = useRef(false); // Pour éviter les soumissions multiples

  // Calculated properties
  const files = attachmentStatus.map((status) => status.file);
  const hasUploadsInProgress = attachmentStatus.some(
    (status) => status.uploading,
  );
  const uploadedFileIds = attachmentStatus
    .filter((status) => status.uploaded && status.id)
    .map((status) => status.id as string);

  // Focus on the text field when the component is mounted
  useEffect(() => {
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, []);

  // Reset when the channel changes
  useEffect(() => {
    setMessage(initialText);
    setAttachmentStatus([]);
    setError(null);
  }, [channelId, initialText]);

  // Upload files as they are added
  useEffect(() => {
    // Find files that need to be uploaded
    const filesToUpload = attachmentStatus.filter(
      (status) => !status.uploading && !status.uploaded && !status.error,
    );

    if (filesToUpload.length > 0 && !uploadInProgress && service?.uploadFiles) {
      const uploadFiles = async () => {
        setUploadInProgress(true);

        // Mark files as uploading
        setAttachmentStatus((prev) =>
          prev.map((status) =>
            filesToUpload.some((f) => f.file === status.file)
              ? { ...status, uploading: true }
              : status,
          ),
        );

        try {
          // Create FormData with files to upload
          const formData = new FormData();
          filesToUpload.forEach((fileStatus) => {
            formData.append("files", fileStatus.file);
          });
          formData.append("channel_id", channelId);

          // Upload the files
          const response = await service.uploadFiles(formData);

          // Update the status of uploaded files
          if (response && response.file_infos) {
            setAttachmentStatus((prev) => {
              return prev.map((status) => {
                // Find matching file info by comparing file name and size
                const fileInfo = response.file_infos.find(
                  (info: any) =>
                    info.name === status.file.name &&
                    (!info.size || info.size === status.file.size),
                );
                console.debug("fileInfo", fileInfo);
                console.debug("status", status);
                if (
                  fileInfo &&
                  filesToUpload.some((f) => f.file.name === status.file.name)
                ) {
                  return {
                    ...status,
                    uploading: false,
                    uploaded: true,
                    file: {
                      ...status.file,
                      id: fileInfo.id,
                    },
                  };
                }
                return status;
              });
            });
          }
        } catch (err) {
          console.error("Error uploading files:", err);

          // Mark files with error
          setAttachmentStatus((prev) =>
            prev.map((status) =>
              filesToUpload.some((f) => f.file === status.file)
                ? {
                    ...status,
                    uploading: false,
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : status,
            ),
          );

          setError("Failed to upload one or more files");
        } finally {
          setUploadInProgress(false);
        }
      };

      void uploadFiles();
    }
  }, [attachmentStatus, uploadInProgress, service, channelId]);
  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);

      // Add new files to attachment status
      setAttachmentStatus((prev) => [
        ...prev,
        ...newFiles.map((file) => ({
          file,
          uploading: false,
          uploaded: false,
        })),
      ]);
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
    setAttachmentStatus((prev) =>
      prev.filter((status) => status.file !== fileToRemove),
    );
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
    // Validation de base
    if (!message.trim() && attachmentStatus.length === 0) return;

    // Protection contre les soumissions multiples
    if (isSubmittingRef.current || sending) return;

    // Vérifier si tous les uploads sont terminés
    if (hasUploadsInProgress) {
      setError("Please wait for all files to finish uploading");
      return;
    }

    isSubmittingRef.current = true;

    // En mode manual, on laisse le parent gérer l'envoi du message
    if (mode === MessageComposerMode.MANUAL) {
      try {
        const messageData: MessageData = {
          message: message.trim(),
          channelId,
          attachments: files,
          fileIds: uploadedFileIds,
          replyToMessageId: isReplying && replyTo ? replyTo.id : undefined,
        };

        // Appeler le callback avec les données du message
        if (onMessageSent) {
          (onMessageSent as (data: MessageData) => void)(messageData);
        }

        // Réinitialiser l'état
        setMessage("");
        setAttachmentStatus([]);

        // Effacer l'état de réponse
        if (isReplying && clearReply) {
          clearReply();
        }
      } catch (err) {
        console.error("Error in manual send mode:", err);
        setError(
          err instanceof Error ? err.message : "Error processing message",
        );
      } finally {
        isSubmittingRef.current = false;
      }
      return;
    }

    // Mode auto: le composant gère l'envoi du message
    try {
      setSending(true);
      setError(null);

      let response;

      if (isReplying && replyTo && replyTo.id) {
        // Envoi d'une réponse à un message
        if (service.replyToMessage) {
          response = await service.replyToMessage(
            channelId,
            replyTo.id,
            message,
            uploadedFileIds,
          );
        } else {
          throw new Error("Reply functionality is not available");
        }
      } else {
        // Message normal avec les IDs de fichiers uploadés
        response = await service.postMessage(
          channelId,
          message,
          uploadedFileIds,
        );
      }

      // Reset state
      setMessage("");
      setAttachmentStatus([]);

      // Call the callback if provided (in auto mode, just the message text)
      if (onMessageSent) {
        (onMessageSent as (message: string) => void)(message);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);

      // Toujours nettoyer l'état de réponse, que l'envoi réussisse ou échoue
      if (isReplying && clearReply) {
        clearReply();
      }

      // Réinitialiser le verrou de soumission
      isSubmittingRef.current = false;
    }
  };

  // Handle keypress (send on Enter)
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  console.debug("attachmentStatus", attachmentStatus);
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
      {attachmentStatus.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 1,
          }}
        >
          {attachmentStatus.map((status, index) => (
            <AttachmentPreview
              key={index}
              file={status.file}
              onRemove={() => handleRemoveAttachment(status.file)}
              isUploading={status.uploading}
              isUploaded={status.uploaded}
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
                  <CircularProgress size={16} sx={{ mr: 1 }} />
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
                disabled={disabled || sending || uploadInProgress}
              >
                {uploadInProgress ? (
                  <CircularProgress size={24} />
                ) : (
                  <AttachmentIcon />
                )}
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
                hasUploadsInProgress ||
                (!message.trim() && attachmentStatus.length === 0)
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
