import React, { useState, useCallback, useRef } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Button,
  Divider, 
  Tooltip,
  SxProps, 
  Theme 
} from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  Code as CodeIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  VisibilityOff as HideFormattingIcon,
  Visibility as ShowFormattingIcon,
} from '@mui/icons-material';
import { EmojiPickerButton } from '../common/EmojiPickerButton';
import { FilePreviewContainer } from './FilePreviewContainer';
import { FileStatus } from './FileItem';

interface MessageInputProps {
  placeholder?: string;
  initialValue?: string;
  channelId?: string;
  onSend: (message: string, fileIds?: string[]) => void;
  onCancel?: () => void;
  mode?: 'default' | 'edit';
  autoFocus?: boolean;
  sx?: SxProps<Theme>;
}

const containerStyles: SxProps<Theme> = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  overflow: 'hidden',
};

const inputStyles: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      border: 'none',
    },
  },
};

const toolbarStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.5,
  borderTop: 1,
  borderColor: 'divider',
  bgcolor: 'background.default',
};

const leftToolbarStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  flex: 1,
};

const rightToolbarStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
};

const editButtonsStyles: SxProps<Theme> = {
  display: 'flex',
  gap: 1,
  justifyContent: 'flex-end',
  mt: 1,
  px: 1,
  pb: 1,
};

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = "Type a message...",
  initialValue = "",
  channelId,
  onSend,
  onCancel,
  mode = 'default',
  autoFocus = false,
  sx,
}) => {
  const [message, setMessage] = useState(initialValue);
  const [showFormatting, setShowFormatting] = useState(true);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const textFieldRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  const canSend = React.useMemo(() => {
    const hasMessage = message.trim().length > 0;
    const hasFiles = files.length > 0;
    const hasUploadingFiles = files.some(f => f.uploading);
    
    return (hasMessage || hasFiles) && !hasUploadingFiles;
  }, [message, files]);

  const handleSend = useCallback(() => {
    if (canSend) {
      const uploadedFileIds = files
        .filter(f => f.uploaded && f.fileId)
        .map(f => f.fileId!);
      
      onSend(message.trim(), uploadedFileIds.length > 0 ? uploadedFileIds : undefined);
      
      if (mode === 'default') {
        setMessage('');
        setFiles([]);
      }
    }
  }, [canSend, message, files, onSend, mode]);

  const handleCancel = useCallback(() => {
    setMessage(initialValue);
    setFiles([]);
    onCancel?.();
  }, [initialValue, onCancel]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const newFiles: FileStatus[] = selectedFiles.map(file => ({
      file,
      uploading: false,
      uploaded: false,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveFile = useCallback((fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove));
  }, []);

  const handleFilesChange = useCallback((updatedFiles: FileStatus[]) => {
    setFiles(updatedFiles);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && mode === 'default') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, mode]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    const textField = textFieldRef.current;
    if (textField) {
      const start = textField.selectionStart || 0;
      const end = textField.selectionEnd || 0;
      const newMessage = message.slice(0, start) + `:${emoji}:` + message.slice(end);
      setMessage(newMessage);
      
      // Restore cursor position
      setTimeout(() => {
        textField.focus();
        textField.setSelectionRange(start + emoji.length + 2, start + emoji.length + 2);
      }, 0);
    } else {
      setMessage(prev => prev + `:${emoji}:`);
    }
  }, [message]);

  const insertFormatting = useCallback((before: string, after: string = before) => {
    const textField = textFieldRef.current;
    if (textField) {
      const start = textField.selectionStart || 0;
      const end = textField.selectionEnd || 0;
      const selectedText = message.slice(start, end);
      const newMessage = message.slice(0, start) + before + selectedText + after + message.slice(end);
      setMessage(newMessage);
      
      // Restore cursor position
      setTimeout(() => {
        textField.focus();
        textField.setSelectionRange(start + before.length, end + before.length);
      }, 0);
    }
  }, [message]);

  const handleBold = useCallback(() => insertFormatting('**'), [insertFormatting]);
  const handleItalic = useCallback(() => insertFormatting('*'), [insertFormatting]);
  const handleCode = useCallback(() => insertFormatting('`'), [insertFormatting]);

  const toggleFormatting = useCallback(() => {
    setShowFormatting(prev => !prev);
  }, []);

  return (
    <Box sx={{ ...containerStyles, ...sx }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <TextField
        ref={textFieldRef}
        fullWidth
        multiline
        minRows={mode === 'edit' ? 2 : 1}
        maxRows={8}
        value={message}
        onChange={handleMessageChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        variant="outlined"
        autoFocus={autoFocus}
        sx={inputStyles}
      />
      
      {/* Toolbar */}
      <Box sx={toolbarStyles}>
        {/* Left side - Formatting toggle */}
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
          
          <Tooltip title={showFormatting ? "Hide formatting" : "Show formatting"}>
            <IconButton size="small" onClick={toggleFormatting}>
              {showFormatting ? <HideFormattingIcon fontSize="small" /> : <ShowFormattingIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* Right side - Actions */}
        <Box sx={rightToolbarStyles}>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          
          <Tooltip title="Attach file">
            <IconButton size="small" onClick={handleFileSelect}>
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <EmojiPickerButton onEmojiSelect={handleEmojiSelect} size="small" />
          
          {mode === 'default' && (
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
      
      {/* File previews */}
      {files.length > 0 && channelId && (
        <FilePreviewContainer
          files={files}
          channelId={channelId}
          onRemove={handleRemoveFile}
          onFilesChange={handleFilesChange}
        />
      )}
      
      {/* Edit mode buttons */}
      {mode === 'edit' && (
        <Box sx={editButtonsStyles}>
          <Button size="small" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            size="small" 
            variant="contained" 
            onClick={handleSend}
            disabled={!canSend}
          >
            Save
          </Button>
        </Box>
      )}
    </Box>
  );
};