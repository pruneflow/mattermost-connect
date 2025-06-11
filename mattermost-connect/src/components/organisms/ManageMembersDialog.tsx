import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  CircularProgress,
  Pagination,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { useLayout, usePermissions, useTeamMembers } from '../../hooks';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeamById, selectCurrentUserId } from '../../store/selectors';
import { SearchInput } from '../atoms/SearchInput';
import { UserAvatar } from '../atoms/UserAvatar';
import { displayUsername } from '../../utils/userUtils';
import type { UserProfile } from '../../api/types';

export interface ManageMembersDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
}

export const ManageMembersDialog: React.FC<ManageMembersDialogProps> = ({
  open,
  onClose,
  teamId,
}) => {
  const { isMobile } = useLayout();
  const { canManageTeam } = usePermissions();
  
  const team = useAppSelector(selectTeamById(teamId));
  const currentUserId = useAppSelector(selectCurrentUserId);
  
  const {
    teamMembers,
    activeMembers,
    stats,
    loading: membersLoading,
    currentPage,
    totalPages,
    loadTeamMembers,
    goToPage,
    updateMemberRole,
    removeMember,
  } = useTeamMembers(teamId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const canManage = team ? canManageTeam(team.id) : false;

  // Helper functions pour les rôles exactement comme Mattermost
  const isSystemAdmin = (user: UserProfile) => {
    return user.roles?.includes('system_admin') || false;
  };

  const getTeamMemberRoles = (user: UserProfile) => {
    const teamMember = teamMembers[user.id];
    return teamMember?.roles || 'team_user';
  };

  const isTeamAdmin = (user: UserProfile) => {
    return getTeamMemberRoles(user).includes('team_admin');
  };

  const getRoleDisplayName = (user: UserProfile) => {
    if (isSystemAdmin(user)) return 'System Admin';
    if (isTeamAdmin(user)) return 'Team Admin';
    return 'Member';
  };

  const canChangeRole = (user: UserProfile) => {
    // Exactement comme Mattermost: ne peut pas modifier un system admin
    if (isSystemAdmin(user)) return false;
    // Ne peut pas se modifier soi-même
    if (user.id === currentUserId) return false;
    // Doit avoir les permissions de gestion d'équipe
    return canManage;
  };

  useEffect(() => {
    if (open && teamId) {
      loadTeamMembers(0);
    }
  }, [open, teamId, loadTeamMembers]);

  const filteredMembers = activeMembers.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      displayUsername(user, 'full_name_nickname', true).toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower)
    );
  });

  const handleClose = useCallback(() => {
    setSearchTerm('');
    setRoleMenuAnchor(null);
    setSelectedMember(null);
    onClose();
  }, [onClose]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchTerm(query);
  }, []);

  const handleRoleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, member: UserProfile) => {
    setRoleMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  }, []);

  const handleRoleMenuClose = useCallback(() => {
    setRoleMenuAnchor(null);
    setSelectedMember(null);
  }, []);

  const handleInvitePeople = useCallback(() => {
    // TODO: Ouvrir le dialog d'invitation
    console.log('Open invite dialog');
  }, []);

  const handleRemoveMember = useCallback(async () => {
    if (!selectedMember) return;
    
    setIsUpdating(true);
    try {
      await removeMember(selectedMember.id);
      handleRoleMenuClose();
    } catch (error) {
      // Error is already handled by the hook
    } finally {
      setIsUpdating(false);
    }
  }, [selectedMember, removeMember, handleRoleMenuClose]);

  const handleChangeRole = useCallback(async (isSchemeAdmin: boolean) => {
    if (!selectedMember) return;
    
    setIsUpdating(true);
    try {
      await updateMemberRole(selectedMember.id, isSchemeAdmin);
      handleRoleMenuClose();
    } catch (error) {
      // Error is already handled by the hook
    } finally {
      setIsUpdating(false);
    }
  }, [selectedMember, updateMemberRole, handleRoleMenuClose]);

  const handleMakeAdmin = useCallback(() => {
    handleChangeRole(true); // isSchemeAdmin = true
  }, [handleChangeRole]);

  const handleMakeMember = useCallback(() => {
    handleChangeRole(false); // isSchemeAdmin = false
  }, [handleChangeRole]);

  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, page: number) => {
    goToPage(page - 1);
  }, [goToPage]);

  if (!team) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : '90vh',
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            px: 3,
            py: 2,
          }}
        >
          <Typography 
            component="span"
            variant="h6"
            fontWeight={600}
          >
            {team.display_name} Members
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleInvitePeople}
                size="small"
              >
                Invite People
              </Button>
            )}
            <IconButton 
              onClick={handleClose}
              size="small"
              sx={{ 
                color: 'text.secondary',
                '&:hover': { 
                  bgcolor: 'action.hover'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2 }}>
            {stats && stats.total_member_count > 10 && (
              <SearchInput
                value={searchTerm}
                placeholder="Search members..."
                onSearch={handleSearchChange}
                size="medium"
                sx={{ mb: 2 }}
              />
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {stats?.total_member_count || 0} {stats?.total_member_count === 1 ? 'member' : 'members'}
              {searchTerm && ` • ${filteredMembers.length} ${filteredMembers.length === 1 ? 'result' : 'results'}`}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ minHeight: 300 }}>
            {membersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {filteredMembers.map((user, index) => {
                  const roleDisplayName = getRoleDisplayName(user);
                  const canChange = canChangeRole(user);
                  
                  return (
                    <React.Fragment key={user.id}>
                      <ListItem 
                        sx={{ 
                          py: 1.5,
                          px: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          }
                        }}
                      >
                        {/* Avatar avec statut */}
                        <UserAvatar 
                          user={user} 
                          size="medium" 
                          showStatus={true}
                        />
                        
                        {/* Informations utilisateur */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600} noWrap>
                              @{user.username}
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary" noWrap>
                              ({displayUsername(user, 'full_name_nickname', true)})
                            </Typography>
                          </Box>
                          {user.email && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {user.email}
                            </Typography>
                          )}
                        </Box>
                        
                        {/* Rôle cliquable */}
                        <Box>
                          {canChange ? (
                            <Button
                              variant="text"
                              endIcon={<ArrowDownIcon />}
                              onClick={(e) => handleRoleMenuOpen(e, user)}
                              disabled={isUpdating}
                              sx={{
                                color: 'text.secondary',
                                textTransform: 'none',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                }
                              }}
                            >
                              {roleDisplayName}
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {roleDisplayName}
                            </Typography>
                          )}
                        </Box>
                      </ListItem>
                      
                      {/* Divider entre chaque membre sauf le dernier */}
                      {index < filteredMembers.length - 1 && (
                        <Divider sx={{ mx: 3 }} />
                      )}
                    </React.Fragment>
                  );
                })}
                
                {filteredMembers.length === 0 && !membersLoading && (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'No members found matching your search.' : 'No members found.'}
                    </Typography>
                  </Box>
                )}
              </List>
            )}
          </Box>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Pagination
                count={totalPages}
                page={currentPage + 1}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                disabled={membersLoading}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Menu
        anchorEl={roleMenuAnchor}
        open={Boolean(roleMenuAnchor)}
        onClose={handleRoleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {selectedMember && !isSystemAdmin(selectedMember) && (
          <>
            {!isTeamAdmin(selectedMember) && (
              <MenuItem onClick={handleMakeAdmin}>
                Make Team Admin
              </MenuItem>
            )}
            {isTeamAdmin(selectedMember) && (
              <MenuItem onClick={handleMakeMember}>
                Make Member
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleRemoveMember} sx={{ color: 'error.main' }}>
              Remove from Team
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default ManageMembersDialog;