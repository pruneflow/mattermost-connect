/**
 * Emoji picker button component with popover interface
 * Provides emoji selection with recent emoji tracking and positioning options
 */
import React, { useState, useCallback, useRef } from 'react';
import { IconButton, Popover, Box, SxProps, Theme } from '@mui/material';
import { EmojiEmotions as EmojiIcon } from '@mui/icons-material';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { addRecentEmoji } from '../../services/reactionService';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  openToLeft?: boolean;
  sx?: SxProps<Theme>;
  inThread?: boolean
}

export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  onEmojiSelect,
  size = 'medium',
  disabled = false,
  openToLeft = false,
  inThread = false,
  sx,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleEmojiSelect = useCallback((emoji: any) => {
    const emojiName = emoji.id;
    onEmojiSelect(emojiName);
    addRecentEmoji(emojiName);
    handleClose();
  }, [onEmojiSelect, addRecentEmoji, handleClose]);

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        size={size}
        sx={sx}
      >
        <EmojiIcon />
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPaper-root': {
            transform: `translateX(-${inThread ? !openToLeft ? 200 : 350 : openToLeft ? 350 : 0}px) !important`,
          }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="light"
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            emojiSize={20}
            perLine={8}
            maxFrequentRows={2}
          />
        </Box>
      </Popover>
    </>
  );
};