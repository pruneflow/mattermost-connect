import React from 'react';
import { Fab, useTheme, useMediaQuery } from '@mui/material';
import { KeyboardArrowDown as ScrollToBottomIcon } from '@mui/icons-material';

type Props = {
  isScrolling: boolean;
  atBottom?: boolean;
  onClick: () => void;
};

const ScrollToBottomArrows: React.FC<Props> = ({ isScrolling, atBottom, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:768px)');

  // only show on mobile
  if (!isMobile) {
    return null;
  }

  const isVisible = isScrolling && atBottom === false;

  return (
    <Fab
      onClick={onClick}
      size="medium"
      color="primary"
      sx={{
        position: 'fixed',
        bottom: theme.spacing(10),
        right: theme.spacing(2),
        zIndex: theme.zIndex.fab,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: theme.transitions.create(['opacity', 'transform'], {
          duration: theme.transitions.duration.shorter,
          easing: theme.transitions.easing.easeInOut,
        }),
        visibility: isVisible ? 'visible' : 'hidden',
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
          transform: isVisible ? 'scale(1.05)' : 'scale(0.8)',
        },
        boxShadow: theme.shadows[6],
        '&:active': {
          boxShadow: theme.shadows[12],
        },
        // Style pour s'adapter au thème Mattermost
        ...(theme.palette.mode === 'dark' && {
          backgroundColor: theme.palette.grey[800],
          color: theme.palette.common.white,
          '&:hover': {
            backgroundColor: theme.palette.grey[700],
          },
        }),
      }}
      aria-label="Scroll to bottom"
    >
      <ScrollToBottomIcon
        sx={{
          fontSize: '1.5rem',
          transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.short,
          }),
          transform: isVisible ? 'translateY(0)' : 'translateY(2px)',
        }}
      />
    </Fab>
  );
};

export default ScrollToBottomArrows;