import React, { useEffect, useRef, useState } from "react";
import { useMattermost } from "../../../context/MattermostProvider";
import { Box, Collapse, Fade, SxProps, Theme, Typography } from "@mui/material";
import { ReplyContext } from "./components/ReplyContext";
import { AttachmentPreview } from "./components/AttachmentPreview";
import { ComposerInput } from "./components/ComposerInput";
import { ComposerToolbar } from "./components/ComposerToolbar";
import { EmojiPicker, EmojiSelectionResult, PickerMode } from "../EmojiPicker";
import { EmojiProvider } from "../../../context/EmojiProvider";
import { MattermostFile } from "../Attachment/Attachment";

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
  const { service, replyTo, clearReply, isReplying } = useMattermost();

  // État
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
  const isSubmittingRef = useRef(false);

  const files = attachmentStatus.map((status) => status.file);
  // Propriétés calculées
  const hasUploadsInProgress = attachmentStatus.some(
    (status) => status.uploading,
  );
  const uploadedFileIds = attachmentStatus
    .filter((status) => status.uploaded && status.mattermostFile?.id)
    .map((status) => status.mattermostFile!.id);

  // Vérifier si le message est vide (pour désactiver le bouton d'envoi)
  const isEmpty = !message.trim() && attachmentStatus.length === 0;

  // Effets
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
  }, [attachmentStatus, uploadInProgress, service, channelId]);

  // Gestionnaires d'événements
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

      if (isReplying && replyTo && replyTo.id) {
        // Envoi d'une réponse à un message
        if (service.replyToMessage) {
          await service.replyToMessage(
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
        await service.postMessage(channelId, message, uploadedFileIds);
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
      {/* Contexte de réponse */}
      <Collapse in={isReplying}>
        {replyTo && <ReplyContext replyTo={replyTo} clearReply={clearReply} />}
      </Collapse>

      {/* Prévisualisation des pièces jointes */}
      <AttachmentPreview
        attachmentStatus={attachmentStatus}
        handleRemoveAttachment={handleRemoveAttachment}
      />

      {/* Zone de saisie du message */}
      <Box sx={{ display: "flex", alignItems: "flex-end" }}>
        {/* Champ de texte */}
        <ComposerInput
          placeholder={placeholder}
          message={message}
          setMessage={setMessage}
          disabled={disabled}
          sending={sending}
          textFieldRef={textFieldRef}
          handleKeyPress={handleKeyPress}
        />

        {/* Barre d'outils */}
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

      {/* Message d'erreur */}
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

      {/* Emoji picker */}
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
