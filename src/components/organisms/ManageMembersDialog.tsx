/**
 * Manage team members dialog with search, pagination, and role management
 * Provides member listing, role changes, and invitation functionality
 */
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
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { useLayout, useTeamMembers, useTeamDialogs } from '../../hooks';
import { canManageTeam, canInviteUser, canAddUserToTeam } from '../../services/permissionService';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeamById, selectCurrentUserId } from '../../store/selectors';
import { SearchInput } from '../atoms/SearchInput';
import { UserAvatar } from '../atoms/UserAvatar';
import { InvitePeopleDialog } from './InvitePeopleDialog';
import { userMatchesSearchTerm } from '../../utils/searchUtils';
import { displayUsername, getRoleChips, canChangeRole, isTeamAdmin, isSystemAdmin } from '../../utils/userUtils';
import type { UserProfile } from '../../api/types';

// ============================================================================
// RENDER FUNCTIONS (outside component for performance)
// ============================================================================

const renderRoleChips = (
  chips: any[], 
  canChange: boolean, 
  user: UserProfile,
  isMobile: boolean,
  isUpdating: boolean,
  onRoleMenuOpen: (e: React.MouseEvent<HTMLElement>, user: UserProfile) => void
) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
    {chips.map((chip, chipIndex) => (
      <Chip
        key={chipIndex}
        label={chip.label}
        color={chip.color}
        variant={chip.variant}
        size="small"
        sx={{ 
          fontSize: '0.75rem',
          borderRadius: 2,
        }}
      />
    ))}
    {canChange && (
      <IconButton
        size="small"
        onClick={(e) => onRoleMenuOpen(e, user)}
        disabled={isUpdating}
        sx={{
          ml: isMobile ? 0 : 0.5,
          color: 'text.secondary',
          '&:hover': {
            bgcolor: 'action.hover',
          }
        }}
      >
        <ArrowDownIcon fontSize="small" />
      </IconButton>
    )}
  </Box>
);

// ============================================================================
// COMPONENT
// ============================================================================

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
  const { openInvite, isInviteOpen, closeDialog } = useTeamDialogs();
  
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
  const canInvite = team ? (canInviteUser(team.id) || canAddUserToTeam(team.id)) : false;

  // Memoized member data with chips for performance
  const members = React.useMemo(() => {
    return activeMembers.map(user => {
      const teamMember = teamMembers[user.id];
      return {
        user,
        chips: getRoleChips(user, teamMembers),
        canChange: canChangeRole(user, teamMembers, currentUserId || '', canManage),
        isTeamAdmin: teamMember?.roles?.includes('team_admin') ?? false,
      };
    });
  }, [activeMembers, teamMembers, currentUserId, canManage]);

  useEffect(() => {
    if (open && teamId) {
      loadTeamMembers(0);
    }
  }, [open, teamId, loadTeamMembers]);

  const filteredMembers = React.useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(({ user }) => userMatchesSearchTerm(user, searchTerm));
  }, [members, searchTerm]);

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
    if (team) {
      openInvite(team);
    }
  }, [team, openInvite]);

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
{team.display_name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {canInvite && !isMobile && (
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

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 1 
            }}>
              <Typography variant="body2" color="text.secondary">
                {stats?.total_member_count || 0} {stats?.total_member_count === 1 ? 'member' : 'members'}
                {searchTerm && ` • ${filteredMembers.length} ${filteredMembers.length === 1 ? 'result' : 'results'}`}
              </Typography>
              {canInvite && isMobile && (
                <IconButton
                  onClick={handleInvitePeople}
                  size="small"
                  sx={{ 
                    color: 'primary.main',
                    '&:hover': { 
                      bgcolor: 'primary.main',
                      color: 'white'
                    }
                  }}
                >
                  <PersonAddIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          <Divider />

          <Box sx={{ minHeight: 300 }}>
            {membersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {filteredMembers.map(({ user, chips, canChange }, index) => (
                  <React.Fragment key={user.id}>
                    <ListItem 
                      sx={{ 
                        py: 1.5,
                        px: 3,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? 1 : 2,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        width: '100%'
                      }}>
                        {/* Avatar with status */}
                        <UserAvatar 
                          userId={user.id} 
                          size="medium" 
                          showStatus={true}
                        />
                        
                        {/* User information */}
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
                        
                        {/* Role chips on desktop only */}
                        {!isMobile && renderRoleChips(chips, canChange, user, isMobile, isUpdating, handleRoleMenuOpen)}
                      </Box>

                      {isMobile && (
                        <Box sx={{ 
                          ml: 6 // Align with content (avatar width + gap)
                        }}>
                          {renderRoleChips(chips, canChange, user, isMobile, isUpdating, handleRoleMenuOpen)}
                        </Box>
                      )}
                    </ListItem>
                    
                    {/* Divider between each member except the last */}
                    {index < filteredMembers.length - 1 && (
                      <Divider sx={{ mx: 3 }} />
                    )}
                  </React.Fragment>
                ))}
                
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
        {selectedMember && !isSystemAdmin(selectedMember) && (() => {
          const selectedMemberData = members.find(m => m.user.id === selectedMember.id);
          const isSelectedTeamAdmin = selectedMemberData?.isTeamAdmin ?? false;
          
          return (
            <>
              {!isSelectedTeamAdmin && (
                <MenuItem onClick={handleMakeAdmin}>
                  Make Team Admin
                </MenuItem>
              )}
              {isSelectedTeamAdmin && (
                <MenuItem onClick={handleMakeMember}>
                  Make Member
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleRemoveMember} sx={{ color: 'error.main' }}>
                Remove from Team
              </MenuItem>
            </>
          );
        })()}
      </Menu>

      {/* Invite People Dialog - Conditional rendering for performance */}
      {team && isInviteOpen && (
        <InvitePeopleDialog
          open={isInviteOpen}
          onClose={closeDialog}
          teamId={team.id}
        />
      )}
    </>
  );
};

export default ManageMembersDialog;