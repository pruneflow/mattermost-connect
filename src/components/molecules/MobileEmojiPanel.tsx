/**
 * Mobile emoji panel for touch-friendly emoji selection
 * Fixed panel at bottom with expandable height and animation
 */
import React, { useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Slide,
  useTheme,
  alpha,
  ClickAwayListener,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInFull as ExpandIcon,
  CloseFullscreen as CollapseIcon,
} from '@mui/icons-material';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAppSelector, useAppDispatch } from '../../hooks';
import {
  selectIsEmojiPanelOpen,
  selectIsEmojiPanelExpanded,
  selectSelectedMessageId,
} from '../../store/selectors/messageUI';
import {
  closeEmojiPanel,
  toggleEmojiPanelSize,
} from '../../store/slices/messageUISlice';
import { toggleReactionOnPost, addRecentEmoji } from '../../services/reactionService';
import { emojiEvents, EMOJI_EVENTS } from '../../services/emojiEvents';
import { createEmojiNameWithTone, getUserPreferredSkinTone } from '../../utils/emojiMartAdapter';

const PANEL_HEIGHT_COMPACT = 300;
const PANEL_HEIGHT_EXPANDED = 500;
const PANEL_Z_INDEX = 1300;

export const MobileEmojiPanel: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  
  const isOpen = useAppSelector(selectIsEmojiPanelOpen);
  const isExpanded = useAppSelector(selectIsEmojiPanelExpanded);
  const selectedPostId = useAppSelector(selectSelectedMessageId);

  // Inject styles into Shadow DOM
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const emojiPicker = document.querySelector('em-emoji-picker');
        if (emojiPicker && emojiPicker.shadowRoot) {
          const shadowRoot = emojiPicker.shadowRoot;
          
          // Check if style already exists
          let existingStyle = shadowRoot.querySelector('#mobile-width-override');
          if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'mobile-width-override';
            style.textContent = `
              #root {
                width: 100% !important;
              }
              .scroll {
                width: 100% !important;
              }
              .scroll > div:first-child {
                width: 100% !important;
              }
            `;
            shadowRoot.appendChild(style);
          }
        }
      }, 100); // Small delay to ensure DOM is ready
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    dispatch(closeEmojiPanel());
  }, [dispatch]);

  const handleClickAway = useCallback(() => {
    dispatch(closeEmojiPanel());
  }, [dispatch]);

  const handleToggleSize = useCallback(() => {
    dispatch(toggleEmojiPanelSize());
  }, [dispatch]);

  const handleEmojiSelect = useCallback((emoji: any) => {
    // Créer le nom avec skin tone si applicable
    const baseName = emoji.id || emoji.name;
    const skinTone = emoji.skin || getUserPreferredSkinTone();
    const emojiNameWithTone = createEmojiNameWithTone(baseName, skinTone);
    
    if (selectedPostId) {
      //Add the reaction directly
      void toggleReactionOnPost(selectedPostId, emojiNameWithTone);
    } else {
      // JUst emit the event if we don't have any post id selected
      emojiEvents.emit(EMOJI_EVENTS.EMOJI_SELECTED, emojiNameWithTone);
    }
    
    addRecentEmoji(emojiNameWithTone);
    dispatch(closeEmojiPanel());
  }, [selectedPostId, dispatch]);

  const panelHeight = isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COMPACT;
  const pickerHeight = panelHeight - 60; // Subtract header height

  const panelStyles = useMemo(() => ({
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: `${panelHeight}px`,
    zIndex: PANEL_Z_INDEX,
    backgroundColor: theme.palette.background.paper,
    borderTopLeftRadius: theme.shape.borderRadius * 2,
    borderTopRightRadius: theme.shape.borderRadius * 2,
    boxShadow: theme.shadows[8],
    display: 'flex',
    flexDirection: 'column' as const,
  }), [theme, panelHeight]);

  const headerStyles = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: 2,
    py: 1,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  }), [theme]);

  const pickerContainerStyles = useMemo(() => ({
    flex: 1,
    overflow: 'hidden',
    '& .EmojiMart': {
      border: 'none',
      backgroundColor: 'transparent',
    },
    '& em-emoji-picker': {
      width: '100% !important',
    },
    '& section#root': {
      width: '100% !important',
    },
    '& .scroll': {
      width: '100% !important',
    },
    '& .scroll > div:first-child': {
      width: '100% !important',
    },
  }), []);

  if (!isOpen) {
    return null;
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Box>
          <Paper sx={panelStyles} elevation={0}>
        {/* Header */}
        <Box sx={headerStyles}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            Add reaction
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleToggleSize}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                },
              }}
            >
              {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
            
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Emoji Picker */}
        <Box sx={pickerContainerStyles}>
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme={theme.palette.mode}
            set="native"
            previewPosition="none"
            maxFrequentRows={2}
            perLine={10}
            emojiSize={20}
            emojiButtonSize={32}
            style={{
              width: '100%',
              height: `${pickerHeight}px`,
              border: 'none',
              backgroundColor: 'transparent',
            }}
          />
        </Box>
          </Paper>
        </Box>
      </Slide>
    </ClickAwayListener>
  );
};

export default MobileEmojiPanel;