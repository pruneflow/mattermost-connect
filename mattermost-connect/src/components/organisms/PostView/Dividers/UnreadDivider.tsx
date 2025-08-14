/**
 * Unread divider component with floating new message indicator
 * Shows animated floating button with unread message count and scroll action
 */
import React from 'react';
import { Box, Button, Typography, SxProps, Theme } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface UnreadDividerProps {
  newMessagesCount: number;
  onScrollToUnread: () => void;
  visible?: boolean;
  sx?: SxProps<Theme>;
}

const containerStyles: SxProps<Theme> = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1200,
  pointerEvents: 'none',
};

const buttonStyles: SxProps<Theme> = {
  backgroundColor: 'primary.main',
  color: 'primary.contrastText',
  borderRadius: 3,
  px: 3,
  py: 1.5,
  textTransform: 'none',
  fontSize: '0.875rem',
  fontWeight: 600,
  pointerEvents: 'auto',
  boxShadow: (theme) => theme.shadows[8],
  '&:hover': {
    backgroundColor: 'primary.dark',
    transform: 'translateY(-2px)',
    boxShadow: (theme) => theme.shadows[12],
  },
  '&:active': {
    transform: 'translateY(0px)',
  },
  transition: 'all 0.2s ease-in-out',
};

const MotionBox = motion.create(Box);

export const UnreadDivider: React.FC<UnreadDividerProps> = ({
  newMessagesCount,
  onScrollToUnread,
  visible = true,
  sx,
}) => {
  if (newMessagesCount <= 0) {
    return null;
  }

  const messageText = newMessagesCount === 1 
    ? '1 new message' 
    : `${newMessagesCount} new messages`;

  return (
    <AnimatePresence>
      {visible && (
        <MotionBox
          sx={{ ...containerStyles, ...sx }}
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: 0.3,
          }}
        >
          <Button
            onClick={onScrollToUnread}
            sx={buttonStyles}
            endIcon={<ArrowDownIcon />}
            component={motion.button}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Typography variant="inherit" component="span">
              {messageText}
            </Typography>
          </Button>
        </MotionBox>
      )}
    </AnimatePresence>
  );
};