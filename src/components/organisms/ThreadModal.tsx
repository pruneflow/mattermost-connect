/**
 * Thread modal component with responsive drawer layout
 * Opens on right side with expandable width and thread message management
 */
import React, { useEffect } from 'react';
import {
  Drawer,
  Box,
  SxProps,
  Theme,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectIsAnyThreadOpen, selectThreadPostId, selectIsThreadExpanded } from '../../store/selectors/messageUI';
import { closeThread } from '../../store/slices/messageUISlice';
import { loadThread } from '../../store/slices/threadsSlice';
import { ThreadHeader } from '../molecules/ThreadHeader';
import { ThreadMessageList } from '../molecules/ThreadMessageList';
import { ThreadInput } from '../molecules/ThreadInput';

const contentStyles: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

const messageListContainerStyles: SxProps<Theme> = {
  flex: 1,
  overflow: 'hidden',
  position: 'relative',
};

const inputContainerStyles: SxProps<Theme> = {
  borderTop: 1,
  borderColor: 'divider',
  backgroundColor: 'background.paper',
  p: 2,
};

export const ThreadModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const isOpen = useAppSelector(selectIsAnyThreadOpen);
  const threadPostId = useAppSelector(selectThreadPostId);
  const isExpanded = useAppSelector(selectIsThreadExpanded);

  const drawerWidth = React.useMemo(() => {
    if (isMobile) {
      return '100%';
    }
    return isExpanded ? 'min(60vw, 96rem)' : '464px';
  }, [isMobile, isExpanded]);

  // Load thread when modal opens
  useEffect(() => {
    if (isOpen && threadPostId) {
      dispatch(loadThread({ rootPostId: threadPostId }));
    }
  }, [dispatch, isOpen, threadPostId]);

  const handleClose = () => {
    dispatch(closeThread());
  };

  if (!threadPostId) {
    return null;
  }

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={handleClose}
      variant="temporary"
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          maxWidth: drawerWidth,
        },
      }}
      ModalProps={{
        keepMounted: false,
      }}
    >
      <Box sx={contentStyles}>
        {/* Fixed header at top */}
        <ThreadHeader
          rootPostId={threadPostId}
          onClose={handleClose}
          showExpandButton={!isMobile}
        />

        {/* Message list - scrollable area */}
        <Box sx={messageListContainerStyles}>
          <ThreadMessageList rootPostId={threadPostId} />
        </Box>

        {/* Fixed input at bottom */}
        <Box sx={inputContainerStyles}>
          <ThreadInput rootPostId={threadPostId} />
        </Box>
      </Box>
    </Drawer>
  );
};