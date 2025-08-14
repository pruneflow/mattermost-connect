/**
 * Load more button component for loading older/newer messages
 * Provides interactive button with loading state and directional indicators
 */
import React from 'react';
import { Box, Button, CircularProgress, SxProps, Theme } from '@mui/material';
import { KeyboardArrowUp as ArrowUpIcon, KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material';

interface LoadMoreButtonProps {
  type: 'older' | 'newer';
  loading: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
}

const containerStyles: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  p: 2,
};

const buttonStyles: SxProps<Theme> = {
  textTransform: 'none',
  borderRadius: 3,
  px: 3,
  py: 1,
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: (theme) => theme.shadows[2],
  },
};

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  type,
  loading,
  onClick,
  sx,
}) => {
  const isOlder = type === 'older';
  const text = isOlder ? 'Load Older Messages' : 'Load Newer Messages';
  const loadingText = isOlder ? 'Loading older...' : 'Loading newer...';
  const Icon = isOlder ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Box sx={{ ...containerStyles, ...sx }}>
      <Button
        variant="outlined"
        onClick={onClick}
        disabled={loading}
        startIcon={
          loading ? (
            <CircularProgress size={16} />
          ) : (
            <Icon fontSize="small" />
          )
        }
        sx={buttonStyles}
      >
        {loading ? loadingText : text}
      </Button>
    </Box>
  );
};