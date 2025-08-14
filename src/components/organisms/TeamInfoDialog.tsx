/**
 * Team information dialog displaying team details and statistics
 * Shows team avatar, description, member count, privacy settings, and creation date
 */
import React, { useCallback } from 'react';
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
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  DateRange as DateIcon,
} from '@mui/icons-material';
import { useLayout, useTeamStats } from '../../hooks';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeamById } from '../../store/selectors';
import { getTeamInitials, getTeamColor, getTeamIconUrl } from '../../utils/teamUtils';

export interface TeamInfoDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
}

export const TeamInfoDialog: React.FC<TeamInfoDialogProps> = ({
  open,
  onClose,
  teamId,
}) => {
  const { isMobile } = useLayout();
  
  const team = useAppSelector(selectTeamById(teamId));
  const { stats: teamStats, loading: statsLoading } = useTeamStats(teamId || '');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

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
          <Typography 
            component="span"
            variant={isMobile ? "h6" : "h5"} 
            fontWeight={600}
            sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            Team Information
          </Typography>
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
            {/* Team header with avatar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
              <Avatar
                src={getTeamIconUrl(team) || undefined}
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: getTeamColor(team.name),
                  fontSize: '40px',
                  fontWeight: 600,
                }}
              >
                {getTeamInitials(team)}
              </Avatar>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  {team.display_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  @{team.name}
                </Typography>
                {team.description && (
                  <Typography variant="body1" color="text.primary" sx={{ mt: 1 }}>
                    {team.description}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Team statistics */}
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Team Statistics
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupIcon color="primary" />
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    {statsLoading ? 'Loading...' : `${teamStats?.total_member_count || 0} ${(teamStats?.total_member_count || 0) === 1 ? 'Member' : 'Members'}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total team members
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {team.type === 'O' ? <PublicIcon color="primary" /> : <LockIcon color="primary" />}
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    {team.type === 'O' ? 'Public Team' : 'Private Team'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {team.type === 'O' 
                      ? 'Anyone can discover and join this team'
                      : 'Only invited members can join this team'
                    }
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DateIcon color="primary" />
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Created {formatDate(team.create_at)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Team creation date
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}>
          <Button onClick={handleClose} variant="outlined">
            Close
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

export default TeamInfoDialog;