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

/**
 * Header fixe en haut de la modal Thread
 * Affiche le nom du canal, bouton toggle taille (desktop), et bouton fermer
 */
export const ThreadHeader: React.FC<ThreadHeaderProps> = ({
  rootPostId,
  onClose,
  showExpandButton = true,
}) => {
  const dispatch = useAppDispatch();
  const channelId = useAppSelector(selectCurrentChannelId);
  const channel = useAppSelector(state => selectChannelById(state, channelId));
  const isExpanded = useAppSelector(selectIsThreadExpanded);

  const channelDisplayName = channel?.display_name || channel?.name || 'Thread';

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
        {/* Bouton toggle taille (desktop uniquement) */}
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

        {/* Bouton fermer */}
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