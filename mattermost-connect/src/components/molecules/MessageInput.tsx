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

interface MessageInputProps {
  placeholder?: string;
  initialValue?: string;
  onSend: (message: string) => void;
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
  onSend,
  onCancel,
  mode = 'default',
  autoFocus = false,
  sx,
}) => {
  const [message, setMessage] = useState(initialValue);
  const [showFormatting, setShowFormatting] = useState(true);
  const textFieldRef = useRef<HTMLInputElement>(null);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSend(message.trim());
      if (mode === 'default') {
        setMessage('');
      }
    }
  }, [message, onSend, mode]);

  const handleCancel = useCallback(() => {
    setMessage(initialValue);
    onCancel?.();
  }, [initialValue, onCancel]);

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
            <IconButton size="small">
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <EmojiPickerButton onEmojiSelect={handleEmojiSelect} size="small" />
          
          {mode === 'default' && (
            <Tooltip title="Send message">
              <IconButton 
                size="small" 
                onClick={handleSend}
                disabled={!message.trim()}
                color="primary"
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      
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
            disabled={!message.trim()}
          >
            Save
          </Button>
        </Box>
      )}
    </Box>
  );
};