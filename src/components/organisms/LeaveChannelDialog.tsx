/**
 * Leave channel confirmation dialog with channel information and warnings
 * Provides clear feedback about consequences of leaving different channel types
 */
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  ExitToApp as ExitIcon,
} from '@mui/icons-material';
import { useLayout } from '../../hooks';
import { ChannelIcon } from '../atoms/ChannelIcon';
import type { Channel } from '../../api/types';

export interface LeaveChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channel: Channel | null;
}

export const LeaveChannelDialog: React.FC<LeaveChannelDialogProps> = ({
  open,
  onClose,
  onConfirm,
  channel,
}) => {
  const { isMobile } = useLayout();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = useCallback(() => {
    if (isLeaving) return; // Prevent closing during action
    onClose();
  }, [onClose, isLeaving]);

  const handleConfirm = useCallback(async () => {
    if (!channel || isLeaving) return;
    
    try {
      setIsLeaving(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Leave channel failed
    } finally {
      setIsLeaving(false);
    }
  }, [channel, isLeaving, onConfirm, onClose]);

  const renderDialog = () => {
    if (!channel) return null;
    
    return (
      <>
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon color="warning" />
            <Typography 
              component="span"
              variant={isMobile ? "h6" : "h5"} 
              fontWeight={600}
              sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
            >
              Leave Channel
            </Typography>
          </Box>
          <IconButton 
            onClick={handleClose}
            size={isMobile ? "medium" : "small"}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { 
                bgcolor: 'action.hover'
              }
            }}
            disabled={isLeaving}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ maxWidth: 400 }}>
            {/* Channel info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <ChannelIcon 
                channel={channel}
                size="large"
              />
              
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {channel.display_name}
                </Typography>
                {channel.type !== 'D' && channel.type !== 'G' && (
                  <Typography variant="body2" color="text.secondary">
                    {channel.type === 'P' ? 'Private Channel' : 'Public Channel'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Warning message */}
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight={500} gutterBottom>
                Are you sure you want to leave this channel?
              </Typography>
              <Typography variant="body2">
                You will no longer receive notifications from this channel and it will be removed from your channel list.
                {channel.type === 'P' && ' You will need to be re-invited to rejoin this private channel.'}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}>
          <Button 
            onClick={handleConfirm} 
            variant="contained"
            color="error"
            startIcon={isLeaving ? <CircularProgress size={16} /> : <ExitIcon />}
            disabled={isLeaving}
          >
            {isLeaving ? 'Leaving...' : 'Leave Channel'}
          </Button>
          <Button 
            onClick={handleClose} 
            variant="outlined"
            disabled={isLeaving}
          >
            Cancel
          </Button>
        </DialogActions>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
        }
      }}
    >
      {renderDialog()}
    </Dialog>
  );
};

export default LeaveChannelDialog;