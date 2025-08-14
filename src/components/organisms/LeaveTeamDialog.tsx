/**
 * Leave team confirmation dialog with team information and confirmation input
 * Requires typing team name for confirmation and shows clear consequences
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
  Avatar,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  ExitToApp as ExitIcon,
} from '@mui/icons-material';
import { useLayout } from '../../hooks';
import { handleError } from '../../services/errorService';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectTeamById, selectCurrentUserId } from '../../store/selectors';
import { client } from '../../api/client';
import { getTeamInitials, getTeamColor, getTeamIconUrl } from '../../utils/teamUtils';

export interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
}

export const LeaveTeamDialog: React.FC<LeaveTeamDialogProps> = ({
  open,
  onClose,
  teamId,
}) => {
  const { isMobile } = useLayout();
  const dispatch = useAppDispatch();
  
  const team = useAppSelector(selectTeamById(teamId));
  const currentUserId = useAppSelector(selectCurrentUserId);
  
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const expectedConfirmation = team?.name || '';
  const isConfirmed = confirmationText === expectedConfirmation;

  const handleClose = useCallback(() => {
    setConfirmationText('');
    onClose();
  }, [onClose]);

  const handleConfirmationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(e.target.value);
  }, []);

  const handleLeaveTeam = useCallback(async () => {
    if (!team || !currentUserId || !isConfirmed) return;
    
    try {
      setIsLeaving(true);
      await client.removeFromTeam(team.id, currentUserId);
      // Team member removal handled by WebSocket event
      handleClose();
    } catch (error) {
      handleError(error, {
        component: 'LeaveTeamDialog',
        action: 'leaveTeam',
        showToast: true
      });
    } finally {
      setIsLeaving(false);
    }
  }, [team, currentUserId, isConfirmed, dispatch, handleError, handleClose]);

  const renderDialog = () => {
    if (!team) return null;
    
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
              Leave Team
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
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ maxWidth: 500 }}>
            {/* Team info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar
                src={getTeamIconUrl(team) || undefined}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: getTeamColor(team.name),
                  fontSize: '24px',
                  fontWeight: 600,
                }}
              >
                {getTeamInitials(team)}
              </Avatar>
              
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {team.display_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{team.name}
                </Typography>
              </Box>
            </Box>

            {/* Warning message */}
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight={500} gutterBottom>
                Are you sure you want to leave this team?
              </Typography>
              <Typography variant="body2">
                This action cannot be undone. You will lose access to all channels and conversations in this team.
                To rejoin, you will need to be invited again by a team member.
              </Typography>
            </Alert>

            {/* Consequences list */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                What happens when you leave:
              </Typography>
              <Box component="ul" sx={{ 
                m: 0, 
                pl: 3,
                '& li': { 
                  mb: 0.5,
                  color: 'text.secondary'
                }
              }}>
                <li>You will be removed from all team channels</li>
                <li>You will lose access to all team conversations and files</li>
                <li>Your messages will remain but you won't be able to edit or delete them</li>
                <li>You will need to be re-invited to rejoin this team</li>
              </Box>
            </Box>

            {/* Confirmation input */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                To confirm, type the team name <strong>{team.name}</strong> below:
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={`Type "${team.name}" to confirm`}
                value={confirmationText}
                onChange={handleConfirmationChange}
                error={confirmationText.length > 0 && !isConfirmed}
                helperText={
                  confirmationText.length > 0 && !isConfirmed 
                    ? `Please type "${team.name}" exactly as shown`
                    : ''
                }
                disabled={isLeaving}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}>
          <Button 
            onClick={handleLeaveTeam} 
            variant="contained"
            color="error"
            startIcon={isLeaving ? <CircularProgress size={16} /> : <ExitIcon />}
            disabled={!isConfirmed || isLeaving}
          >
            {isLeaving ? 'Leaving...' : 'Leave Team'}
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

export default LeaveTeamDialog;