/**
 * Loading divider component with animated progress indicator
 * Displays loading state for older/newer/initial message loading with smooth animations
 */
import React from 'react';
import { Box, CircularProgress, Typography, SxProps, Theme } from '@mui/material';
import { motion } from 'framer-motion';

interface LoadingDividerProps {
  type?: 'older' | 'newer' | 'initial';
  message?: string;
  visible?: boolean;
  sx?: SxProps<Theme>;
}

const containerStyles: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  py: 3,
  px: 2,
};

const textStyles: SxProps<Theme> = {
  mt: 1.5,
  color: 'text.secondary',
  fontSize: '0.875rem',
  fontWeight: 400,
};

const MotionBox = motion.create(Box);

export const LoadingDivider: React.FC<LoadingDividerProps> = ({
  type = 'initial',
  message,
  visible = true,
  sx,
}) => {
  if (!visible) {
    return null;
  }

  const defaultMessage = {
    older: 'Loading older messages...',
    newer: 'Loading newer messages...',
    initial: 'Loading messages...',
  }[type];

  const displayMessage = message || defaultMessage;

  return (
    <MotionBox
      sx={{ ...containerStyles, ...sx }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <CircularProgress 
        size={24} 
        thickness={4}
        sx={{ 
          color: 'primary.main',
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      {displayMessage && (
        <Typography sx={textStyles}>
          {displayMessage}
        </Typography>
      )}
    </MotionBox>
  );
};