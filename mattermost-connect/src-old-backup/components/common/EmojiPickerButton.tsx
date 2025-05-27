// EmojiPickerButton.tsx
import React, { useState, useRef } from 'react';
import {
  IconButton, 
  ClickAwayListener,
  Box,
  IconButtonProps
} from '@mui/material';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import { PopperPlacementType } from '@mui/material/Popper';
import { EmojiPicker, EmojiPickerProps } from './EmojiPicker';

export interface EmojiPickerButtonProps {
  // Fonction appelée quand un emoji est sélectionné
  onEmojiSelect: (emoji: string, emojiName: string, skinTone?: number) => void;
  
  // Personnalisation de l'apparence
  icon?: React.ReactNode;
  buttonProps?: Partial<IconButtonProps>;
  buttonSize?: 'small' | 'medium' | 'large';
  buttonColor?: 'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning';
  
  // Configuration du picker
  placement?: PopperPlacementType;
  pickerProps?: Partial<Omit<EmojiPickerProps, 'open' | 'anchorEl' | 'onClose' | 'onEmojiSelect'>>;
}

/**
 * Bouton qui ouvre un EmojiPicker lorsqu'il est cliqué
 * Gère automatiquement l'état ouvert/fermé et le ClickAwayListener
 */
export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  onEmojiSelect,
  icon,
  buttonProps = {},
  buttonSize = 'small',
  buttonColor = 'default',
  placement = 'left-end',
  pickerProps = {}
}) => {
  // État pour gérer l'ouverture/fermeture
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Déterminer si le picker est ouvert
  const isEmojiPickerOpen = Boolean(anchorEl);
  
  // Gestionnaire pour ouvrir le picker
  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };
  
  // Gestionnaire pour fermer le picker
  const handleCloseEmojiPicker = () => {
    setAnchorEl(null);
  };
  
  // Gestionnaire pour la sélection d'emoji
  const handleEmojiSelect = (emoji: string, emojiName: string, skinTone?: number) => {
    onEmojiSelect(emoji, emojiName, skinTone);
    handleCloseEmojiPicker();
  };
  
  return (
    <ClickAwayListener onClickAway={handleCloseEmojiPicker}>
      <Box sx={{ display: 'inline-flex' }}>
        <IconButton
          ref={buttonRef}
          onClick={handleOpenEmojiPicker}
          color={isEmojiPickerOpen ? 'primary' : buttonColor}
          size={buttonSize}
          {...buttonProps}
        >
          {icon || <InsertEmoticonIcon />}
        </IconButton>
        
        <EmojiPicker
          open={isEmojiPickerOpen}
          anchorEl={anchorEl}
          onClose={handleCloseEmojiPicker}
          onEmojiSelect={handleEmojiSelect}
          placement={placement}
          {...pickerProps}
        />
      </Box>
    </ClickAwayListener>
  );
};

export default EmojiPickerButton;