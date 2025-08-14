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
  Popover,
} from "@mui/material";
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatStrikethrough as StrikethroughIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  FormatSize as ShowFormattingIcon,
  FormatClear as HideFormattingIcon,
  Close as CancelIcon,
  Check as SaveIcon,
  MoreHoriz as MoreIcon,
} from "@mui/icons-material";
import { EmojiPickerButton } from "../common/EmojiPickerButton";
import { HorizontalFileContainer } from "../common/HorizontalFileContainer";
import { FilePreviewContainer } from "./FilePreviewContainer";
import { FileAttachmentList } from "./FileAttachmentList";
import { FileStatus } from "./FileItem";
import { FileInfo } from "../../api/types";
import useUserPreferences from "../../hooks/useUserPreferences";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectShowAdvancedTextEditor } from "../../store/selectors";
import { selectIsThreadExpanded } from "../../store/selectors/messageUI";
import { useMenu } from "../../hooks/useMenu";
import { useTheme, useMediaQuery } from "@mui/material";

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
  inThread?: boolean;
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
  inThread = false,
  sx,
}) => {
  const { updatePreferenceValue } = useUserPreferences();
  const showFormatting = useAppSelector(selectShowAdvancedTextEditor);
  const isThreadExpanded = useAppSelector(selectIsThreadExpanded);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const moreMenu = useMenu('formatting-more-menu');
  
  const [message, setMessage] = useState(initialValue);
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
          if (selectedText) {
            // If text was selected, select the formatted text
            textField.setSelectionRange(
              start + before.length,
              start + before.length + selectedText.length,
            );
          } else {
            // If no text selected, position cursor between formatting tags
            textField.setSelectionRange(
              start + before.length,
              start + before.length,
            );
          }
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
  const handleStrikethrough = useCallback(
    () => insertFormatting("~~"),
    [insertFormatting],
  );
  const handleCode = useCallback(
    () => insertFormatting("`"),
    [insertFormatting],
  );
  const handleLink = useCallback(() => {
    const textField = textFieldRef.current;
    if (textField) {
      const start = textField.selectionStart || 0;
      const end = textField.selectionEnd || 0;
      const selectedText = message.slice(start, end);
      const linkText = selectedText || "link text";
      const newMessage =
        message.slice(0, start) +
        `[${linkText}](url)` +
        message.slice(end);
      setMessage(newMessage);

      setTimeout(() => {
        textField.focus();
        if (selectedText) {
          // Select "url" part for easy replacement
          const urlStart = start + linkText.length + 3; // "[text](" length
          textField.setSelectionRange(urlStart, urlStart + 3);
        } else {
          // Select "link text" for easy replacement
          textField.setSelectionRange(start + 1, start + 1 + linkText.length);
        }
      }, 0);
    }
  }, [message]);

  const toggleFormatting = useCallback(() => {
    const newValue = !showFormatting;
    // Inverted logic: 'false' means show advanced editor, 'true' means hide it
    void updatePreferenceValue("advanced_text_editor", "post", (!newValue).toString());
  }, [updatePreferenceValue, showFormatting]);

  const hasFiles = files.length > 0 || editFiles.length > 0;
  const isCompact = !showFormatting && !hasFiles;
  const shouldUseMoreMenu = showFormatting && (isMobile || (inThread && !isThreadExpanded));

  const handleMoreItalic = useCallback(() => {
    handleItalic();
    moreMenu.closeMenu();
  }, [handleItalic, moreMenu.closeMenu]);

  const handleMoreStrikethrough = useCallback(() => {
    handleStrikethrough();
    moreMenu.closeMenu();
  }, [handleStrikethrough, moreMenu.closeMenu]);

  const handleMoreLink = useCallback(() => {
    handleLink();
    moreMenu.closeMenu();
  }, [handleLink, moreMenu.closeMenu]);

  const handleMoreCode = useCallback(() => {
    handleCode();
    moreMenu.closeMenu();
  }, [handleCode, moreMenu.closeMenu]);

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
          inputRef={textFieldRef}
          multiline
          minRows={mode === "edit" ? 8 : 1}
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

                {shouldUseMoreMenu ? (
                  <Tooltip title="More formatting">
                    <IconButton size="small" onClick={moreMenu.openMenu}>
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Italic">
                      <IconButton size="small" onClick={handleItalic}>
                        <ItalicIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Strikethrough">
                      <IconButton size="small" onClick={handleStrikethrough}>
                        <StrikethroughIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title="Link">
                      <IconButton size="small" onClick={handleLink}>
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Code">
                      <IconButton size="small" onClick={handleCode}>
                        <CodeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
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

      {/* More formatting menu */}
      <Popover
        open={moreMenu.isOpen}
        anchorEl={moreMenu.anchorEl}
        onClose={moreMenu.closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1,
              bgcolor: 'background.paper',
              boxShadow: 2,
              borderRadius: 1,
            }
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Italic">
            <IconButton size="small" onClick={handleMoreItalic}>
              <ItalicIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Strikethrough">
            <IconButton size="small" onClick={handleMoreStrikethrough}>
              <StrikethroughIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="Link">
            <IconButton size="small" onClick={handleMoreLink}>
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Code">
            <IconButton size="small" onClick={handleMoreCode}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Popover>
    </Box>
  );
};
