/**
 * Message input component for composing and editing messages
 * Supports file attachments, emoji picker, and send/cancel actions
 */
import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Divider,
  Tooltip,
  SxProps,
  Theme,
} from "@mui/material";
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Code as CodeIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  FormatSize as ShowFormattingIcon,
  FormatClear as HideFormattingIcon,
  Close as CancelIcon,
  Check as SaveIcon,
} from "@mui/icons-material";
import { EmojiPickerButton } from "../common/EmojiPickerButton";
import { HorizontalFileContainer } from "../common/HorizontalFileContainer";
import { FilePreviewContainer } from "./FilePreviewContainer";
import { FileAttachmentList } from "./FileAttachmentList";
import { FileStatus } from "./FileItem";
import { FileInfo } from "../../api/types";

interface MessageInputProps {
  placeholder?: string;
  initialValue?: string;
  channelId?: string;
  postId?: string;
  files?: FileInfo[];
  onSend: (message: string, fileIds?: string[]) => void;
  onCancel?: () => void;
  mode?: "default" | "edit";
  autoFocus?: boolean;
  sx?: SxProps<Theme>;
}

const containerStyles: SxProps<Theme> = {
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "background.paper",
  overflow: "hidden",
};

const inputStyles: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      border: "none",
    },
    "& .MuiInputBase-input": {
      color: "text.primary", // Force la couleur du texte
    },
  },
};

const toolbarStyles: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  px: 1,
  py: 0.5,
  borderTop: 1,
  borderColor: "divider",
  bgcolor: "background.default",
};

const leftToolbarStyles: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  flex: 1,
};

const rightToolbarStyles: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
};

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = "Write here..",
  initialValue = "",
  channelId,
  postId,
  files: existingFiles = [],
  onSend,
  onCancel,
  mode = "default",
  autoFocus = false,
  sx,
}) => {
  const [message, setMessage] = useState(initialValue);
  const [showFormatting, setShowFormatting] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [editFiles, setEditFiles] = useState<FileInfo[]>(existingFiles);

  const textFieldRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessage(e.target.value);
    },
    [],
  );

  const canSend = React.useMemo(() => {
    const hasMessage = message.trim().length > 0;
    const hasFiles = files.length > 0 || editFiles.length > 0;
    const hasUploadingFiles = files.some((f) => f.uploading);

    return (hasMessage || hasFiles) && !hasUploadingFiles;
  }, [message, files, editFiles]);

  const handleSend = useCallback(() => {
    if (canSend) {
      const uploadedFileIds = files
        .filter((f) => f.uploaded && f.fileId)
        .map((f) => f.fileId!);
      if (mode === "edit") {
        const editFileIds: string[] = editFiles.map((f: FileInfo) => f.id);
        const updatedFilesIds = [...uploadedFileIds, ...editFileIds];
        onSend(message.trim(), updatedFilesIds);
      } else {
        onSend(message.trim(), uploadedFileIds);

        setMessage("");
        setFiles([]);
      }
    }
  }, [canSend, mode, message, files, editFiles, onSend]);

  const handleCancel = useCallback(() => {
    setMessage(initialValue);
    setFiles([]);
    setEditFiles(existingFiles);
    onCancel?.();
  }, [initialValue, existingFiles, onCancel]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);

      const newFiles: FileStatus[] = selectedFiles.map((file) => ({
        file,
        uploading: false,
        uploaded: false,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [],
  );

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== fileToRemove));
  }, []);

  const handleFilesChange = useCallback((updatedFiles: FileStatus[]) => {
    setFiles(updatedFiles);
  }, []);

  const handleRemoveExistingFile = useCallback((fileId: string) => {
    setEditFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && mode === "default") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, mode],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const textField = textFieldRef.current;
      if (textField) {
        const start = textField.selectionStart || 0;
        const end = textField.selectionEnd || 0;
        const newMessage =
          message.slice(0, start) + `:${emoji}:` + message.slice(end);
        setMessage(newMessage);

        // Restore cursor position
        setTimeout(() => {
          textField.focus();
          textField.setSelectionRange(
            start + emoji.length + 2,
            start + emoji.length + 2,
          );
        }, 0);
      } else {
        setMessage((prev) => prev + `:${emoji}:`);
      }
    },
    [message],
  );

  const insertFormatting = useCallback(
    (before: string, after: string = before) => {
      const textField = textFieldRef.current;
      if (textField) {
        const start = textField.selectionStart || 0;
        const end = textField.selectionEnd || 0;
        const selectedText = message.slice(start, end);
        const newMessage =
          message.slice(0, start) +
          before +
          selectedText +
          after +
          message.slice(end);
        setMessage(newMessage);

        // Restore cursor position
        setTimeout(() => {
          textField.focus();
          textField.setSelectionRange(
            start + before.length,
            end + before.length,
          );
        }, 0);
      }
    },
    [message],
  );

  const handleBold = useCallback(
    () => insertFormatting("**"),
    [insertFormatting],
  );
  const handleItalic = useCallback(
    () => insertFormatting("*"),
    [insertFormatting],
  );
  const handleCode = useCallback(
    () => insertFormatting("`"),
    [insertFormatting],
  );

  const toggleFormatting = useCallback(() => {
    setShowFormatting((prev) => !prev);
  }, []);

  const hasFiles = files.length > 0 || editFiles.length > 0;
  const isCompact = !showFormatting && !hasFiles;

  return (
    <Box sx={{ ...containerStyles, ...sx }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Input field */}
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
        <TextField
          ref={textFieldRef}
          multiline
          minRows={1}
          maxRows={8}
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          variant="outlined"
          autoFocus={autoFocus}
          sx={{
            ...inputStyles,
            flexGrow: 1,
            // En mode compact, l'input ne prend pas toute la largeur
            ...(isCompact && {
              maxWidth: "calc(100% - 140px)", // Laisser place aux boutons
            }),
          }}
        />

        {/* Boutons inline en mode compact */}
        {isCompact && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pb: 1 }}>
            <Tooltip title="Show formatting">
              <IconButton size="small" onClick={toggleFormatting}>
                <ShowFormattingIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, height: 24 }}
            />

            <Tooltip title="Attach file">
              <IconButton size="small" onClick={handleFileSelect}>
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <EmojiPickerButton onEmojiSelect={handleEmojiSelect} size="small" />

            {mode === "default" && (
              <Tooltip title="Send message">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleSend}
                    disabled={!canSend}
                    color="primary"
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>

      {(editFiles.length > 0 || files.length > 0) && (
        <HorizontalFileContainer showBorder={true}>
          {/* Existing files (edit mode) */}
          {mode === "edit" && editFiles.length > 0 && postId && (
            <FileAttachmentList
              postId={postId}
              files={editFiles}
              mode="edit"
              onRemove={handleRemoveExistingFile}
            />
          )}

          {/* New files preview */}
          {files.length > 0 && channelId && (
            <FilePreviewContainer
              files={files}
              channelId={channelId}
              onRemove={handleRemoveFile}
              onFilesChange={handleFilesChange}
            />
          )}
        </HorizontalFileContainer>
      )}

      {!isCompact && (
        <Box sx={toolbarStyles}>
          {/* Left side - Formatting buttons */}
          <Box sx={leftToolbarStyles}>
            {showFormatting && (
              <>
                <Tooltip title="Bold">
                  <IconButton size="small" onClick={handleBold}>
                    <BoldIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Italic">
                  <IconButton size="small" onClick={handleItalic}>
                    <ItalicIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Code">
                  <IconButton size="small" onClick={handleCode}>
                    <CodeIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>

          {/* Right side - Actions */}
          <Box sx={rightToolbarStyles}>
            <Tooltip
              title={showFormatting ? "Hide formatting" : "Show formatting"}
            >
              <IconButton size="small" onClick={toggleFormatting}>
                {showFormatting ? (
                  <HideFormattingIcon fontSize="small" />
                ) : (
                  <ShowFormattingIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Tooltip title="Attach file">
              <IconButton size="small" onClick={handleFileSelect}>
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <EmojiPickerButton onEmojiSelect={handleEmojiSelect} size="small" />

            {mode === "edit" && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <Tooltip title="Cancel">
                  <IconButton size="small" onClick={handleCancel}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Save">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleSend}
                      disabled={!canSend}
                      color="primary"
                    >
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}

            {mode === "default" && (
              <Tooltip title="Send message">
                <span>
                  <IconButton
                    size="small"
                    onClick={handleSend}
                    disabled={!canSend}
                    color="primary"
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
