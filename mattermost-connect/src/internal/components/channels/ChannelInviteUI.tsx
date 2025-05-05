// src/internal/components/channels/ChannelInviteUI.tsx
/**
 * UI component for inviting users to a channel
 * Provides user search, selection, and invitation options
 */
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Grid,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  PersonAdd as InviteIcon,
  Mail as EmailIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { Channel, User } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { SearchInput } from "../common";
import UserAvatar from "../../../components/users/UserAvatar";

export interface ChannelInviteUIProps extends BaseComponentProps {
  /** Channel to invite to */
  channel: Channel;
  /** Selected users to invite */
  selectedUsers: User[];
  /** Generated invite link */
  inviteLink?: string;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Current search term */
  searchTerm: string;
  /** Search results */
  searchResults: User[];
  /** Whether search is in progress */
  isSearching?: boolean;
  /** Callback when search term changes */
  onSearchChange: (term: string) => void;
  /** Callback when a user is selected */
  onSelectUser: (user: User) => void;
  /** Callback when a user is removed from selection */
  onRemoveUser: (userId: string) => void;
  /** Callback when inviting by email */
  onInviteByEmail: (emails: string[]) => void;
  /** Callback when sending invites to selected users */
  onSendInvites: () => void;
  /** Callback when generating invite link */
  onGenerateLink: () => void;
  /** Callback when invitation is cancelled */
  onCancel: () => void;
}

/**
 * UI component for inviting users to a channel
 */
const ChannelInviteUI: React.FC<ChannelInviteUIProps> = ({
  channel,
  selectedUsers,
  inviteLink,
  isLoading = false,
  searchTerm,
  searchResults,
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
  // State for email input and tab value
  const [email, setEmail] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle adding email to list
  const handleAddEmail = () => {
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailList((prev) => [...prev, email]);
      setEmail("");
    }
  };

  // Handle removing email from list
  const handleRemoveEmail = (emailToRemove: string) => {
    setEmailList((prev) => prev.filter((e) => e !== emailToRemove));
  };

  // Handle key press for email input
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  // Handle sending email invites
  const handleSendEmailInvites = () => {
    if (emailList.length > 0) {
      onInviteByEmail(emailList);
    }
  };

  // Handle copy link to clipboard
  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <Paper
      className={className}
      sx={{
        width: "100%",
        maxWidth: 700,
        mx: "auto",
        ...sx,
      }}
      id={id}
    >
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">
          Invite People to {channel.display_name}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Invite team members to join this channel
        </Typography>
      </Box>

      <Divider />

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab label="Add Users" icon={<InviteIcon />} iconPosition="start" />
        <Tab label="Send Email" icon={<EmailIcon />} iconPosition="start" />
        <Tab label="Invite Link" icon={<LinkIcon />} iconPosition="start" />
      </Tabs>

      <Divider />

      {/* Tab content */}
      <Box sx={{ p: 2 }}>
        {/* Add Users Tab */}
        {tabValue === 0 && (
          <>
            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Users ({selectedUsers.length})
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {selectedUsers.map((user) => (
                    <Chip
                      key={user.id}
                      avatar={<UserAvatar userId={user.id} size="small" />}
                      label={user.username}
                      onDelete={() => onRemoveUser(user.id)}
                      disabled={isLoading}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Search input */}
            <Box sx={{ mb: 2 }}>
              <SearchInput
                value={searchTerm}
                onSearch={onSearchChange}
                placeholder="Search for users by name or username"
                disabled={isLoading}
                fullWidth
              />
              <Typography variant="caption" color="textSecondary">
                Type at least 2 characters to start searching
              </Typography>
            </Box>

            {/* Search results */}
            <Box sx={{ mb: 2, minHeight: 200 }}>
              {isSearching ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : searchResults.length > 0 ? (
                <List disablePadding>
                  {searchResults.map((user) => (
                    <ListItem
                      key={user.id}
                      onClick={() => onSelectUser(user)}
                      sx={{ cursor: "pointer" }}
                    >
                      <ListItemAvatar>
                        <UserAvatar userId={user.id} size="medium" showStatus />
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.username}
                        secondary={
                          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                          user.email
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : searchTerm.length >= 2 ? (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography color="textSecondary">
                    No users found matching "{searchTerm}"
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography color="textSecondary">
                    Search for users to add to this channel
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<InviteIcon />}
                onClick={onSendInvites}
                disabled={isLoading || selectedUsers.length === 0}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Add ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </Box>
          </>
        )}

        {/* Email Invitation Tab */}
        {tabValue === 1 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Invite by Email
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Send email invitations to people who aren't in your team yet
              </Typography>

              <TextField
                fullWidth
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleEmailKeyPress}
                disabled={isLoading}
                placeholder="Enter email address"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleAddEmail}
                        disabled={
                          !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                        }
                        edge="end"
                      >
                        <InviteIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Email list */}
            {emailList.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Email List ({emailList.length})
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {emailList.map((emailAddress) => (
                    <Chip
                      key={emailAddress}
                      label={emailAddress}
                      onDelete={() => handleRemoveEmail(emailAddress)}
                      disabled={isLoading}
                      icon={<EmailIcon fontSize="small" />}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Action buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EmailIcon />}
                onClick={handleSendEmailInvites}
                disabled={isLoading || emailList.length === 0}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Send ${emailList.length} invitation${emailList.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </Box>
          </>
        )}

        {/* Invite Link Tab */}
        {tabValue === 2 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Invitation Link
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Create a link that allows anyone with it to join this channel
              </Typography>

              {inviteLink ? (
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      fullWidth
                      value={inviteLink}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip
                              title={
                                linkCopied ? "Copied!" : "Copy to clipboard"
                              }
                            >
                              <IconButton onClick={handleCopyLink} edge="end">
                                {linkCopied ? (
                                  <CheckIcon color="success" />
                                ) : (
                                  <CopyIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={onGenerateLink}
                      disabled={isLoading}
                    >
                      Generate New Link
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onGenerateLink}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={24} /> : <LinkIcon />
                  }
                >
                  Generate Invite Link
                </Button>
              )}
            </Box>

            {/* Notes about invite links */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Invite links can be used by multiple people and don't expire
                unless a new link is generated or the channel is deleted.
              </Typography>
            </Alert>

            {/* Action buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isLoading}
              >
                Close
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default ChannelInviteUI;
