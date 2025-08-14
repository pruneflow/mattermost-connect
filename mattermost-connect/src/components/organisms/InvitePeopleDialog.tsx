/**
 * Invite people dialog with multiple invitation methods
 * Supports adding existing users, sending email invitations, and sharing invite links
 */
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  memo,
} from "react";
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
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
} from "@mui/material";
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import { useTeamInvitations } from "../../hooks/useTeamInvitations";
import { useUserSearch } from "../../hooks/useUserSearch";
import { canInviteUser, canAddUserToTeam, canInviteGuest } from "../../services/permissionService";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectTeamsById } from "../../store/selectors";
import { UserSearchAutocomplete } from "../atoms/UserSearchAutocomplete";

interface InvitePeopleDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
}

// Custom comparator for memo to avoid re-renders from onClose function changes
const arePropsEqual = (
  prevProps: InvitePeopleDialogProps,
  nextProps: InvitePeopleDialogProps,
): boolean => {
  return (
    prevProps.open === nextProps.open &&
    prevProps.teamId === nextProps.teamId
    // Ignore onClose function reference changes
  );
};

export const InvitePeopleDialog = memo<InvitePeopleDialogProps>(({
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
    canSendEmailInvitationsServerSide,
    isLoading,
  } = useTeamInvitations(teamId);

  const { searchUsersNotInTeam, clearSearch } =
    useUserSearch();

  const team = teams[teamId];



  // Memoize permissions to prevent unnecessary recalculations
  // STEP 1: Server config check + STEP 2: User permissions check
  const permissions = useMemo(
    () => ({
      canSendEmailInvitations: canSendEmailInvitationsServerSide() && canInviteUser(teamId),
      canAddExistingUsers: canAddUserToTeam(teamId),
      canInviteGuestUsers: canInviteGuest(),
    }),
    [canInviteUser, canAddUserToTeam, canInviteGuest, canSendEmailInvitationsServerSide, teamId],
  );

  // Local state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);

  const handleCloseFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const handleUserSelectionChange = useCallback(
    (userIds: string[]) => {
      setSelectedUserIds(userIds);
    },
    [],
  );

  const handleUserSearch = useCallback(
    (term: string) => {
      searchUsersNotInTeam(term, teamId);
    },
    [searchUsersNotInTeam, teamId],
  );

  // Handle email input and validation
  const handleEmailInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEmailInput(event.target.value);
    },
    [],
  );

  const handleEmailInputKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        const email = emailInput.trim();
        if (email && !emails.includes(email)) {
          const { valid, invalid } = validateEmails([email]);
          if (valid.length > 0) {
            setEmails((prev) => [...prev, ...valid]);
            setEmailInput("");
          } else if (invalid.length > 0) {
            setFeedback({
              message: `Invalid email: ${email}`,
              severity: "error",
            });
          }
        }
      }
    },
    [emailInput, emails, validateEmails],
  );

  const handleRemoveEmail = useCallback((emailToRemove: string) => {
    setEmails((prev) => prev.filter((email) => email !== emailToRemove));
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
      setFeedback({ message: "Failed to get invite link", severity: "error" });
    } finally {
      setIsLoadingLink(false);
    }
  }, [getInviteLink]);

  const handleCopyInviteLink = useCallback(async () => {
    const success = await copyInviteLink();
    if (success) {
      setFeedback({
        message: "Invite link copied to clipboard",
        severity: "success",
      });
    } else {
      setFeedback({ message: "Failed to copy invite link", severity: "error" });
    }
  }, [copyInviteLink]);

  // Handle invitations
  const handleSendInvitations = useCallback(async () => {
    const hasUsers =
      selectedUserIds.length > 0 && permissions.canAddExistingUsers;
    const hasEmails = emails.length > 0 && permissions.canSendEmailInvitations;

    if (!hasUsers && !hasEmails) {
      if (selectedUserIds.length > 0 && !permissions.canAddExistingUsers) {
        setFeedback({
          message: "You do not have permission to add users to this team",
          severity: "error",
        });
      } else if (emails.length > 0 && !permissions.canSendEmailInvitations) {
        setFeedback({
          message: "You do not have permission to send email invitations",
          severity: "error",
        });
      } else {
        setFeedback({
          message: "Please select users or enter email addresses",
          severity: "error",
        });
      }
      return;
    }

    try {
      let results = [];

      // Add existing users to team
      if (hasUsers) {
        const result = await addMembersToTeam(selectedUserIds);
        results.push(result);
      }

      // Send email invitations
      if (hasEmails) {
        const result = await sendEmailInvitations(emails);
        results.push(result);
      }

      // Show combined results
      const allSuccessful = results.every((r) => r.success);
      const messages = results.map((r) => r.message).filter(Boolean);

      if (allSuccessful) {
        setFeedback({ message: messages.join(". "), severity: "success" });
        // Reset form
        setSelectedUserIds([]);
        setEmails([]);
        clearSearch();
        // Close dialog after success
        setTimeout(() => onClose(), 1500);
      } else {
        setFeedback({ message: messages.join(". "), severity: "error" });
      }
    } catch (error) {
      setFeedback({ message: "Failed to send invitations", severity: "error" });
    }
  }, [
    selectedUserIds,
    emails,
    permissions.canAddExistingUsers,
    permissions.canSendEmailInvitations,
    addMembersToTeam,
    sendEmailInvitations,
    onClose,
    clearSearch,
  ]);

  // Load invite link on open
  useEffect(() => {
    if (open && !inviteLink) {
      void handleGetInviteLink();
    }
  }, [open, inviteLink, handleGetInviteLink]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedUserIds([]);
      setEmails([]);
      setEmailInput("");
      clearSearch();
    }
  }, [open, clearSearch]);

  // Check if user has any invitation permissions
  const hasAnyInvitePermissions =
    permissions.canAddExistingUsers || permissions.canSendEmailInvitations;

  // Check what user can invite
  const canInvite =
    (selectedUserIds.length > 0 && permissions.canAddExistingUsers) ||
    (emails.length > 0 && permissions.canSendEmailInvitations);


  // Show permission warning if no permissions
  if (!hasAnyInvitePermissions) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 2 } },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Invite People to {team?.display_name || "Team"}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            You do not have permission to invite people to this team. Contact
            your team administrator for assistance.
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
        slotProps={{
          paper: { sx: { borderRadius: 2 } },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Invite People to {team?.display_name || "Team"}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Add existing users */}
          {permissions.canAddExistingUsers && (
            <Box mb={3}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Add Members
              </Typography>
              <UserSearchAutocomplete
                teamId={teamId}
                selectedUserIds={selectedUserIds}
                onUserSelectionChange={handleUserSelectionChange}
                search={handleUserSearch}
              />
            </Box>
          )}

          {/* Divider only if both sections are visible */}
          {permissions.canAddExistingUsers &&
            permissions.canSendEmailInvitations && <Divider sx={{ my: 2 }} />}

          {/* Email invitations */}
          {permissions.canSendEmailInvitations && (
            <Box mb={3}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Send Email Invitations
              </Typography>
              <TextField
                fullWidth
                placeholder="Enter email addresses and press Enter"
                value={emailInput}
                onChange={handleEmailInputChange}
                onKeyDown={handleEmailInputKeyPress}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                helperText="Press Enter or comma to add multiple emails"
              />
              {emails.length > 0 && (
                <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                  {emails.map((email) => {
                    const handleRemove = () => {
                      handleRemoveEmail(email);
                    };
                    return (
                      <Chip
                        key={email}
                        label={email}
                        size="small"
                        onDelete={handleRemove}
                      />
                    );
                  })}
                </Box>
              )}
            </Box>
          )}

          {/* Divider before invite link if any invitation section is visible */}
          {(permissions.canAddExistingUsers ||
            permissions.canSendEmailInvitations) && <Divider sx={{ my: 2 }} />}

          {/* Invite link */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Invite Link
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <TextField
                fullWidth
                value={inviteLink}
                placeholder={
                  isLoadingLink ? "Loading..." : "Click to generate invite link"
                }
                slotProps={{
                  input: {
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
                  },
                }}
                onClick={!inviteLink ? handleGetInviteLink : undefined}
                sx={{ cursor: !inviteLink ? "pointer" : "default" }}
              />
              {isLoadingLink && <CircularProgress size={20} />}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Share this link to let people join the team
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendInvitations}
            disabled={!canInvite || isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            {isLoading ? "Inviting..." : "Send Invitations"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback snackbar */}
      {feedback && (
        <Snackbar
          open={true}
          autoHideDuration={4000}
          onClose={handleCloseFeedback}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseFeedback}
            severity={feedback.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {feedback.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}, arePropsEqual);

InvitePeopleDialog.displayName = 'InvitePeopleDialog';

export default InvitePeopleDialog;
