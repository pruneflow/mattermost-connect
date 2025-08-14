/**
 * Thread header component with channel context and expand/close actions
 * Fixed header for thread modal showing channel name and control buttons
 */
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  SxProps,
  Theme,
} from '@mui/material';
import { 
  Close as CloseIcon,
  OpenInFull as ExpandIcon,
  CloseFullscreen as CollapseIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectCurrentChannelId, selectChannelById } from '../../store/selectors';
import { selectIsThreadExpanded } from '../../store/selectors/messageUI';
import { toggleThreadSize } from '../../store/slices/messageUISlice';

interface ThreadHeaderProps {
  rootPostId: string;
  onClose: () => void;
  showExpandButton?: boolean;
}

const headerStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  p: 2,
  borderBottom: 1,
  borderColor: 'divider',
  backgroundColor: 'background.paper',
  minHeight: 60,
};

const titleStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  flex: 1,
};

const actionsStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
};

export const ThreadHeader: React.FC<ThreadHeaderProps> = ({
  onClose,
  showExpandButton = true,
}) => {
  const dispatch = useAppDispatch();
  const channelId = useAppSelector(selectCurrentChannelId);
  const channel = useAppSelector(state => selectChannelById(state, channelId));
  const isExpanded = useAppSelector(selectIsThreadExpanded);

  const channelDisplayName = channel?.computedDisplayName || channel?.display_name || '';

  const handleToggleSize = () => {
    dispatch(toggleThreadSize());
  };

  return (
    <Box sx={headerStyles}>
      <Box sx={titleStyles}>
        <Typography variant="h6" component="h2" id="thread-modal-title">
          Thread in {channelDisplayName}
        </Typography>
      </Box>

      <Box sx={actionsStyles}>
        {/* Size toggle button (desktop only) */}
        {showExpandButton && (
          <IconButton
            onClick={handleToggleSize}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                backgroundColor: 'action.hover',
              },
            }}
            aria-label={isExpanded ? "Collapse thread" : "Expand thread"}
          >
            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        )}

        {/* Close button */}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              backgroundColor: 'action.hover',
            },
          }}
          aria-label="Close thread"
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
};