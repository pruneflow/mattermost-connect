// src/internal/components/teams/TeamInviteUI.tsx
/**
 * Team Invite UI Component
 * Provides interface for inviting users to a team
 */
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  InputAdornment,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { Team } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { UserAvatarContainer } from "../../containers/users";

export interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface TeamInviteUIProps extends BaseComponentProps {
  // Data props
  team: Team;
  users: User[];
  selectedUsers: User[];
  inviteLink?: string;
  // State props
  isLoading?: boolean;
  searchTerm?: string;
  searchResults?: User[];
  isSearching?: boolean;
  // Callback props
  onSearchChange?: (term: string) => void;
  onSelectUser?: (user: User) => void;
  onRemoveUser?: (userId: string) => void;
  onInviteByEmail?: (emails: string[]) => void;
  onSendInvites?: () => void;
  onGenerateLink?: () => void;
  onCancel?: () => void;
}

const TeamInviteUI: React.FC<TeamInviteUIProps> = ({
  team,
  users,
  selectedUsers,
  inviteLink,
  isLoading = false,
  searchTerm = "",
  searchResults = [],
  isSearching = false,
  onSearchChange,
  onSelectUser,
  onRemoveUser,
  onInviteByEmail,
  onSendInvites,
  onGenerateLink,
  onCancel,
  className,
  sx,
  id,
}) => {
  // State for invite method tabs
  const [tabValue, setTabValue] = useState(0);
  // State for email input
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  // State for link copy tooltip
  const [linkCopied, setLinkCopied] = useState(false);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  // Handle user selection
  const handleSelectUser = (user: User) => {
    if (onSelectUser) {
      onSelectUser(user);
    }
  };

  // Handle user removal
  const handleRemoveUser = (userId: string) => {
    if (onRemoveUser) {
      onRemoveUser(userId);
    }
  };

  // Handle email input change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
  };

  // Add email to list
  const handleAddEmail = () => {
    if (emailInput.trim() && !emailList.includes(emailInput.trim())) {
      setEmailList([...emailList, emailInput.trim()]);
      setEmailInput("");
    }
  };

  // Remove email from list
  const handleRemoveEmail = (email: string) => {
    setEmailList(emailList.filter((e) => e !== email));
  };

  // Handle email key press (enter to add)
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  // Send email invites
  const handleSendEmailInvites = () => {
    if (onInviteByEmail && emailList.length > 0) {
      onInviteByEmail(emailList);
    }
  };

  // Copy invite link to clipboard
  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    }
  };

  // Helper to format username
  const formatDisplayName = (user: User): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username;
  };

  return (
    <Box className={className} sx={sx} id={id}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Invite People to {team.display_name}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Add people to your team by searching for users, sending email
          invitations, or sharing an invite link.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Invite Methods Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab
            label="Add Users"
            icon={<PersonAddIcon />}
            iconPosition="start"
          />
          <Tab label="Email Invite" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="Invite Link" icon={<LinkIcon />} iconPosition="start" />
        </Tabs>

        {/* User Search Tab Panel */}
        {tabValue === 0 && (
          <Box>
            <TextField
              placeholder="Search users by name, username, or email..."
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onSearchChange && onSearchChange("")}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              disabled={isLoading}
              sx={{ mb: 3 }}
            />

            {/* Search Results */}
            {isSearching ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : searchResults.length > 0 ? (
              <Box mb={3} maxHeight={300} overflow="auto">
                <List>
                  {searchResults.map((user) => {
                    const isSelected = selectedUsers.some(
                      (u) => u.id === user.id,
                    );
                    return (
                      <ListItem
                        key={user.id}
                        onClick={() => !isSelected && handleSelectUser(user)}
                        sx={{
                          bgcolor: isSelected ? "action.selected" : undefined,
                        }}
                      >
                        <ListItemAvatar>
                          <UserAvatarContainer userId={user.id} size="small" />
                        </ListItemAvatar>
                        <ListItemText
                          primary={formatDisplayName(user)}
                          secondary={`@${user.username}`}
                        />
                        {isSelected && (
                          <ListItemSecondaryAction>
                            <Chip
                              label="Selected"
                              color="primary"
                              size="small"
                            />
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            ) : searchTerm ? (
              <Typography color="text.secondary" align="center" py={2}>
                No users found matching "{searchTerm}".
              </Typography>
            ) : null}
          </Box>
        )}

        {/* Email Invite Tab Panel */}
        {tabValue === 1 && (
          <Box>
            <Box display="flex" mb={2}>
              <TextField
                placeholder="Enter email address"
                variant="outlined"
                fullWidth
                value={emailInput}
                onChange={handleEmailChange}
                onKeyPress={handleEmailKeyPress}
                disabled={isLoading}
              />
              <Button
                variant="contained"
                onClick={handleAddEmail}
                disabled={!emailInput.trim() || isLoading}
                sx={{ ml: 1 }}
              >
                Add
              </Button>
            </Box>

            {/* Email List */}
            {emailList.length > 0 && (
              <Box mb={3} maxHeight={200} overflow="auto">
                <List dense>
                  {emailList.map((email) => (
                    <ListItem key={email}>
                      <ListItemAvatar>
                        <EmailIcon color="action" />
                      </ListItemAvatar>
                      <ListItemText primary={email} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveEmail(email)}
                          disabled={isLoading}
                          size="small"
                        >
                          <ClearIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              disabled={emailList.length === 0 || isLoading}
              onClick={handleSendEmailInvites}
              startIcon={
                isLoading ? <CircularProgress size={20} /> : <EmailIcon />
              }
              fullWidth
            >
              {isLoading ? "Sending..." : "Send Email Invitations"}
            </Button>
          </Box>
        )}

        {/* Invite Link Tab Panel */}
        {tabValue === 2 && (
          <Box>
            {inviteLink ? (
              <Box mb={3}>
                <TextField
                  value={inviteLink}
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip
                          title={linkCopied ? "Copied!" : "Copy to clipboard"}
                          placement="top"
                        >
                          <IconButton onClick={handleCopyLink} edge="end">
                            <CopyIcon />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mt={1}
                >
                  Anyone with this link can join the team
                  {team.type === "I" ? " (if they have an account)" : ""}.
                </Typography>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" my={3}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onGenerateLink}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : <LinkIcon />
                  }
                >
                  Generate Invite Link
                </Button>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ mt: 3, mb: 3 }} />

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Users ({selectedUsers.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {selectedUsers.map((user) => (
                <Chip
                  key={user.id}
                  label={formatDisplayName(user)}
                  onDelete={() => handleRemoveUser(user.id)}
                  disabled={isLoading}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>

          {tabValue === 0 && (
            <Button
              variant="contained"
              color="primary"
              onClick={onSendInvites}
              disabled={selectedUsers.length === 0 || isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading
                ? "Sending..."
                : `Invite ${selectedUsers.length} Users`}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TeamInviteUI;
