/**
 * Scroll to bottom floating action button with new message count badge
 * Animated FAB that appears when user is scrolled up with optional message count indicator
 */
import React from 'react';
import { Fab, Badge, SxProps, Theme } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollToBottomFabProps {
  visible: boolean;
  onClick: () => void;
  newMessagesCount?: number;
  sx?: SxProps<Theme>;
}

const fabStyles: SxProps<Theme> = {
  position: 'absolute',
  bottom: 80, // Above message input
  right: 16,
  zIndex: 1100,
  backgroundColor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': {
    backgroundColor: 'primary.dark',
  },
  boxShadow: (theme) => theme.shadows[6],
};

const MotionFab = motion.create(Fab);

export const ScrollToBottomFab: React.FC<ScrollToBottomFabProps> = ({
  visible,
  onClick,
  newMessagesCount = 0,
  sx,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <MotionFab
          size="small"
          onClick={onClick}
          sx={{ ...fabStyles, ...sx }}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            duration: 0.2,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {newMessagesCount > 0 ? (
            <Badge
              badgeContent={newMessagesCount > 99 ? '99+' : newMessagesCount}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.625rem',
                  height: '18px',
                  minWidth: '18px',
                  transform: 'scale(1) translate(50%, -50%)',
                  transformOrigin: '100% 0%',
                },
              }}
            >
              <ArrowDownIcon />
            </Badge>
          ) : (
            <ArrowDownIcon />
          )}
        </MotionFab>
      )}
    </AnimatePresence>
  );
};