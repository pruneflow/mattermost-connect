// src/components/message/MessageComposer/MessageComposer.tsx
import React, { useEffect, useRef, useState } from "react";
import { useMattermost, useMessageContext } from "../../../context";
import {
  Box,
  Collapse,
  Popper,
  SxProps,
  Theme,
  Typography,
} from "@mui/material";
import { ReplyContext } from "./components/ReplyContext";
import { AttachmentPreview } from "./components/AttachmentPreview";
import { ComposerInput } from "./components/ComposerInput";
import { ComposerToolbar } from "./components/ComposerToolbar";
import { EmojiPicker, PickerMode } from "../EmojiPicker";
import { EmojiProvider } from "../../../context/EmojiProvider";
import { MattermostFile } from "../Attachment/Attachment";
import { assertServiceInitialized } from "../../../services";
import { EmojiSelectionResult } from "../../../types";

export enum MessageComposerMode {
  AUTO = "auto",
  MANUAL = "manual",
}

export interface FileUploadStatus {
  file: File;
  mattermostFile?: MattermostFile;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

export interface MessageData {
  message: string;
  channelId: string;
  attachments: File[];
  fileIds?: string[];
  replyToMessageId?: string;
}

export interface MessageComposerProps {
  channelId: string;
  placeholder?: string;
  allowAttachments?: boolean;
  disabled?: boolean;
  initialText?: string;
  mode?: MessageComposerMode;
  onMessageSent?: ((message: string) => void) | ((data: MessageData) => void);
  className?: string;
  style?: React.CSSProperties;
  sx?: SxProps<Theme>;
}

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
  const { services } = useMattermost();
  const { replyTo, clearReply, isReplying } = useMessageContext();

  assertServiceInitialized(services, "MessageComposer requires services");
  assertServiceInitialized(
    services.mattermostService,
    "MessageComposer requires MattermostService",
  );

  const mattermostService = services.mattermostService;

  // État pour le texte du message
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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  // Propriétés calculées
  const files = attachmentStatus.map((status) => status.file);
  const hasUploadsInProgress = attachmentStatus.some(
    (status) => status.uploading,
  );
  const uploadedFileIds = attachmentStatus
    .filter((status) => status.uploaded && status.mattermostFile?.id)
    .map((status) => status.mattermostFile!.id);

  // Vérifier si le message est vide (pour désactiver le bouton d'envoi)
  const isEmpty = !message.trim() && attachmentStatus.length === 0;

  // Focus sur le champ de texte à l'initialisation
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

    if (filesToUpload.length > 0 && !uploadInProgress) {
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
          const response = await mattermostService.uploadFiles(formData);

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

                if (
                  fileInfo &&
                  filesToUpload.some((f) => f.file.name === status.file.name)
                ) {
                  // Create a MattermostFile object with the server response
                  const mattermostFile: MattermostFile = {
                    id: fileInfo.id,
                    name: fileInfo.name,
                    type: fileInfo.type || status.file.type,
                    size: fileInfo.size || status.file.size,
                    url: fileInfo.url,
                  };

                  return {
                    ...status,
                    uploading: false,
                    uploaded: true,
                    mattermostFile, // Store the MattermostFile separately
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
  }, [attachmentStatus, uploadInProgress, channelId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
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

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveAttachment = (fileToRemove: File) => {
    setAttachmentStatus((prev) =>
      prev.filter((status) => status.file !== fileToRemove),
    );
  };

  const handleEmojiSelect = (result: EmojiSelectionResult) => {
    setMessage((prev) => prev + result.emoji);
    setShowEmojiPicker(false);
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const closeEmojiPicker = () => {
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachmentStatus.length === 0) return;

    // Protect against multiple submissions
    if (isSubmittingRef.current || sending) return;

    // Check if all uploads are finished
    if (hasUploadsInProgress) {
      setError("Please wait for all files to finish uploading");
      return;
    }

    isSubmittingRef.current = true;

    // In manual mode, let the parent handle sending
    if (mode === MessageComposerMode.MANUAL) {
      try {
        const messageData: MessageData = {
          message: message.trim(),
          channelId,
          attachments: files,
          fileIds: uploadedFileIds,
          replyToMessageId: isReplying && replyTo ? replyTo.id : undefined,
        };

        // Call the onMessageSent callback with the message data
        if (onMessageSent) {
          (onMessageSent as (data: MessageData) => void)(messageData);
        }

        // Reset state
        setMessage("");
        setAttachmentStatus([]);

        // Clear the reply state
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

    // Auto mode: the component handles sending
    try {
      setSending(true);
      setError(null);

      if (isReplying && replyTo && replyTo.id) {
        // Send a reply
        if (mattermostService.replyToMessage) {
          await mattermostService.replyToMessage(
            channelId,
            replyTo.id,
            message,
            uploadedFileIds,
          );
        } else {
          console.debug("Reply functionality is not available");
        }
      } else {
        // Regular message with uploaded file IDs
        await mattermostService.postMessage(
          channelId,
          message,
          uploadedFileIds,
        );
      }

      // Reset state
      setMessage("");
      setAttachmentStatus([]);

      // Call the onMessageSent callback (in auto mode, just the message text)
      if (onMessageSent) {
        (onMessageSent as (message: string) => void)(message);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);

      // Always clear the reply state whether send succeeds or fails
      if (isReplying && clearReply) {
        clearReply();
      }

      // Reset the submit lock
      isSubmittingRef.current = false;
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
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
        {replyTo && <ReplyContext replyTo={replyTo} clearReply={clearReply} />}
      </Collapse>

      {/* Attachment previews */}
      <AttachmentPreview
        attachmentStatus={attachmentStatus}
        handleRemoveAttachment={handleRemoveAttachment}
      />

      {/* Message input area */}
      <Box sx={{ display: "flex", alignItems: "flex-end" }} ref={toolbarRef}>
        {/* Text field */}
        <ComposerInput
          placeholder={placeholder}
          message={message}
          setMessage={setMessage}
          disabled={disabled}
          sending={sending}
          textFieldRef={textFieldRef}
          handleKeyPress={handleKeyPress}
        />

        {/* Toolbar */}
        <ComposerToolbar
          allowAttachments={allowAttachments}
          disabled={disabled}
          sending={sending}
          hasUploadsInProgress={hasUploadsInProgress}
          isEmpty={isEmpty}
          fileInputRef={fileInputRef}
          uploadInProgress={uploadInProgress}
          toggleEmojiPicker={toggleEmojiPicker}
          handleAttachmentClick={handleAttachmentClick}
          handleSendMessage={handleSendMessage}
          handleFileChange={handleFileChange}
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

      {/* Emoji picker - using Popper instead of Fade for performance */}
      <Popper
        open={showEmojiPicker}
        anchorEl={toolbarRef.current}
        placement="top-end"
        style={{ zIndex: 1200 }}
      >
        <EmojiProvider>
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={closeEmojiPicker}
            mode={PickerMode.MESSAGE}
          />
        </EmojiProvider>
      </Popper>
    </Box>
  );
};

export default MessageComposer;
