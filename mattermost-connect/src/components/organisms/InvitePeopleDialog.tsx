import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Box,
  Typography,
  Autocomplete,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useTeamInvitations } from '../../hooks/useTeamInvitations';
import { useUserSearch } from '../../hooks/useUserSearch';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectTeamsById } from '../../store/selectors';
import { UserAvatar } from '../atoms/UserAvatar';
import { displayUsername, isBot, isSystemAdmin } from '../../utils/userUtils';
import type { UserProfile } from '../../api/types';

interface InvitePeopleDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
}

export const InvitePeopleDialog: React.FC<InvitePeopleDialogProps> = ({
  open,
  onClose,
  teamId,
}) => {
  const teams = useAppSelector(selectTeamsById);
  
  const {
    sendEmailInvitations,
    addMembersToTeam,
    getInviteLink,
    copyInviteLink,
    validateEmails,
    isLoading,
  } = useTeamInvitations(teamId);

  const {
    searchUsersNotInTeam,
    searchResults,
    isSearching,
    clearSearch,
  } = useUserSearch();

  const {
    canInviteUser,
    canAddUserToTeam,
    canInviteGuest,
  } = usePermissions();

  const team = teams[teamId];
  
  // Check permissions for this team
  const canSendEmailInvitations = canInviteUser(teamId);
  const canAddExistingUsers = canAddUserToTeam(teamId);
  const canInviteGuestUsers = canInviteGuest();
  
  // Local state
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [feedback, setFeedback] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const handleCloseFeedback = () => setFeedback(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);

  // Handle user search and selection
  const handleUserSearchChange = useCallback((event: React.SyntheticEvent, value: string) => {
    setUserSearchTerm(value);
    searchUsersNotInTeam(value, teamId);
  }, [searchUsersNotInTeam, teamId]);

  const handleUserSelectionChange = useCallback((event: React.SyntheticEvent, newValue: UserProfile[]) => {
    setSelectedUsers(newValue);
  }, []);

  // Custom option renderer for user search results
  const renderUserOption = useCallback((props: any, user: UserProfile) => {
    const userIsBot = isBot(user);
    const userIsSystemAdmin = isSystemAdmin(user);
    
    return (
      <ListItem {...props} key={user.id}>
        <ListItemAvatar>
          <UserAvatar user={user} size="small" />
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {displayUsername(user, 'full_name_nickname', true)}
              </Typography>
              {userIsSystemAdmin && (
                <Chip
                  label="System Admin"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )}
              {userIsBot && (
                <Chip
                  label="Bot"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )}
            </Box>
          }
          secondary={user.email}
          secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
        />
      </ListItem>
    );
  }, []);

  // Custom tag renderer for selected users
  const renderUserTags = useCallback((value: UserProfile[], getTagProps: any) =>
    value.map((user, index) => {
      const { key, ...chipProps } = getTagProps({ index });
      return (
        <Chip
          key={key}
          avatar={<UserAvatar user={user} size="xs" />}
          label={`@${user.username}`}
          size="small"
          {...chipProps}
        />
      );
    }), []);

  // Handle email input and validation
  const handleEmailInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(event.target.value);
  }, []);

  const handleEmailInputKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const email = emailInput.trim();
      if (email && !emails.includes(email)) {
        const { valid, invalid } = validateEmails([email]);
        if (valid.length > 0) {
          setEmails(prev => [...prev, ...valid]);
          setEmailInput('');
        } else if (invalid.length > 0) {
          setFeedback({ message: `Invalid email: ${email}`, severity: 'error' });
        }
      }
    }
  }, [emailInput, emails, validateEmails]);

  const handleRemoveEmail = useCallback((emailToRemove: string) => {
    setEmails(prev => prev.filter(email => email !== emailToRemove));
  }, []);

  // Handle invite link
  const handleGetInviteLink = useCallback(async () => {
    setIsLoadingLink(true);
    try {
      const link = await getInviteLink();
      if (link) {
        setInviteLink(link);
      }
    } catch (error) {
      setFeedback({ message: 'Failed to get invite link', severity: 'error' });
    } finally {
      setIsLoadingLink(false);
    }
  }, [getInviteLink]);

  const handleCopyInviteLink = useCallback(async () => {
    const success = await copyInviteLink();
    if (success) {
      setFeedback({ message: 'Invite link copied to clipboard', severity: 'success' });
    } else {
      setFeedback({ message: 'Failed to copy invite link', severity: 'error' });
    }
  }, [copyInviteLink]);

  // Handle invitations
  const handleSendInvitations = useCallback(async () => {
    const hasUsers = selectedUsers.length > 0 && canAddExistingUsers;
    const hasEmails = emails.length > 0 && canSendEmailInvitations;

    if (!hasUsers && !hasEmails) {
      if (selectedUsers.length > 0 && !canAddExistingUsers) {
        setFeedback({ message: 'You do not have permission to add users to this team', severity: 'error' });
      } else if (emails.length > 0 && !canSendEmailInvitations) {
        setFeedback({ message: 'You do not have permission to send email invitations', severity: 'error' });
      } else {
        setFeedback({ message: 'Please select users or enter email addresses', severity: 'error' });
      }
      return;
    }

    try {
      let results = [];

      // Add existing users to team
      if (hasUsers) {
        const userIds = selectedUsers.map(user => user.id);
        const result = await addMembersToTeam(userIds);
        results.push(result);
      }

      // Send email invitations
      if (hasEmails) {
        const result = await sendEmailInvitations(emails);
        results.push(result);
      }

      // Show combined results
      const allSuccessful = results.every(r => r.success);
      const messages = results.map(r => r.message).filter(Boolean);
      
      if (allSuccessful) {
        setFeedback({ message: messages.join('. '), severity: 'success' });
        // Reset form
        setSelectedUsers([]);
        setEmails([]);
        setUserSearchTerm('');
        clearSearch();
        // Close dialog after success
        setTimeout(() => onClose(), 1500);
      } else {
        setFeedback({ message: messages.join('. '), severity: 'error' });
      }
    } catch (error) {
      setFeedback({ message: 'Failed to send invitations', severity: 'error' });
    }
  }, [selectedUsers, emails, canAddExistingUsers, canSendEmailInvitations, addMembersToTeam, sendEmailInvitations, onClose, clearSearch]);

  // Load invite link on open
  React.useEffect(() => {
    if (open && !inviteLink) {
      handleGetInviteLink();
    }
  }, [open, inviteLink, handleGetInviteLink]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedUsers([]);
      setEmails([]);
      setUserSearchTerm('');
      setEmailInput('');
      clearSearch();
    }
  }, [open, clearSearch]);

  // Check if user has any invitation permissions
  const hasAnyInvitePermissions = canAddExistingUsers || canSendEmailInvitations;

  // Check what user can invite
  const canInvite = (selectedUsers.length > 0 && canAddExistingUsers) || (emails.length > 0 && canSendEmailInvitations);

  // Show permission warning if no permissions
  if (!hasAnyInvitePermissions) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Invite People to {team?.display_name || 'Team'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            You do not have permission to invite people to this team. Contact your team administrator for assistance.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Invite People to {team?.display_name || 'Team'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Add existing users */}
          {canAddExistingUsers && (
            <Box mb={3}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Add Members
              </Typography>
              <Autocomplete
                multiple
                options={searchResults}
                getOptionLabel={(user) => displayUsername(user, 'full_name_nickname', true)}
                value={selectedUsers}
                inputValue={userSearchTerm}
                onInputChange={handleUserSearchChange}
                onChange={handleUserSelectionChange}
                loading={isSearching}
                renderOption={renderUserOption}
                renderTags={renderUserTags}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search users by name or username"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonAddIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <>
                          {isSearching && <CircularProgress color="inherit" size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                noOptionsText={
                  userSearchTerm.length < 2 
                    ? "Type at least 2 characters to search"
                    : isSearching 
                      ? "Searching..."
                      : "No users found"
                }
                filterOptions={(x) => x} // Disable client-side filtering
              />
            </Box>
          )}

          {/* Divider only if both sections are visible */}
          {canAddExistingUsers && canSendEmailInvitations && (
            <Divider sx={{ my: 2 }} />
          )}

          {/* Email invitations */}
          {canSendEmailInvitations && (
            <Box mb={3}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Send Email Invitations
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter email addresses and press Enter"
                value={emailInput}
                onChange={handleEmailInputChange}
                onKeyPress={handleEmailInputKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText="Press Enter or comma to add multiple emails"
              />
              
              {emails.length > 0 && (
                <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                  {emails.map((email) => (
                    <Chip
                      key={email}
                      label={email}
                      size="small"
                      onDelete={() => handleRemoveEmail(email)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Divider before invite link if any invitation section is visible */}
          {(canAddExistingUsers || canSendEmailInvitations) && (
            <Divider sx={{ my: 2 }} />
          )}

          {/* Invite link */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Invite Link
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <TextField
                fullWidth
                value={inviteLink}
                placeholder={isLoadingLink ? "Loading..." : "Click to generate invite link"}
                InputProps={{
                  readOnly: true,
                  endAdornment: inviteLink && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleCopyInviteLink}
                        size="small"
                        title="Copy invite link"
                      >
                        <CopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onClick={!inviteLink ? handleGetInviteLink : undefined}
                sx={{ cursor: !inviteLink ? 'pointer' : 'default' }}
              />
              {isLoadingLink && <CircularProgress size={20} />}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Share this link to let people join the team
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendInvitations}
            disabled={!canInvite || isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            {isLoading ? 'Inviting...' : 'Send Invitations'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback snackbar */}
      {feedback && (
        <Snackbar
          open={true}
          autoHideDuration={4000}
          onClose={handleCloseFeedback}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseFeedback}
            severity={feedback.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {feedback.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

export default InvitePeopleDialog;