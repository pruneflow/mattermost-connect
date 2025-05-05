// src/internal/components/channels/ChannelMembersUI.tsx
/**
 * UI component for displaying and managing channel members
 */
import React from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  MoreVert as MoreIcon,
  PersonAdd as InviteIcon,
  AdminPanelSettings as AdminIcon,
  PersonRemove as RemoveIcon,
} from "@mui/icons-material";
import { Channel, ChannelMember } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { SearchInput, PaginationControls } from "../common";
import UserAvatar from "../../../components/users/UserAvatar";
import { formatUserName } from "../../../utils/formatters";

export interface ChannelMembersUIProps extends BaseComponentProps {
  /** The channel object */
  channel: Channel;
  /** List of channel members */
  members: ChannelMember[];
  /** Whether the user is an admin of this channel */
  isAdmin: boolean;
  /** Whether data is being loaded */
  isLoading?: boolean;
  /** Current page number */
  page: number;
  /** Items per page */
  perPage: number;
  /** Total number of members */
  totalMembers: number;
  /** Current search term */
  searchTerm: string;
  /** Callback when search changes */
  onSearchChange: (term: string) => void;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when per page value changes */
  onPerPageChange: (perPage: number) => void;
  /** Callback when inviting members */
  onInviteMembers: () => void;
  /** Callback when removing a member */
  onRemoveMember: (userId: string) => void;
  /** Callback when changing a member's role */
  onChangeMemberRole: (userId: string, makeAdmin: boolean) => void;
}

/**
 * UI component for displaying and managing channel members
 */
const ChannelMembersUI: React.FC<ChannelMembersUIProps> = ({
  channel,
  members,
  isAdmin,
  isLoading = false,
  page,
  perPage,
  totalMembers,
  searchTerm,
  onSearchChange,
  onPageChange,
  onPerPageChange,
  onInviteMembers,
  onRemoveMember,
  onChangeMemberRole,
  className,
  sx,
  id,
}) => {
  // Member action menu state
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(
    null,
  );

  // Open member menu
  const handleOpenMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    memberId: string,
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedMemberId(memberId);
  };

  // Close member menu
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedMemberId(null);
  };

  // Handle remove member
  const handleRemoveMember = () => {
    if (selectedMemberId) {
      onRemoveMember(selectedMemberId);
      handleCloseMenu();
    }
  };

  // Handle change member role
  const handleChangeMemberRole = (makeAdmin: boolean) => {
    if (selectedMemberId) {
      onChangeMemberRole(selectedMemberId, makeAdmin);
      handleCloseMenu();
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalMembers / perPage);

  return (
    <Paper
      className={className}
      sx={{
        width: "100%",
        ...sx,
      }}
      id={id}
    >
      {/* Header with search and invite */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">Channel Members</Typography>
        <Button
          variant="contained"
          startIcon={<InviteIcon />}
          onClick={onInviteMembers}
          disabled={isLoading}
        >
          Invite People
        </Button>
      </Box>

      <Divider />

      {/* Search bar */}
      <Box sx={{ p: 2 }}>
        <SearchInput
          value={searchTerm}
          onSearch={onSearchChange}
          placeholder="Search members..."
          disabled={isLoading}
          fullWidth
        />
      </Box>

      {/* Members list */}
      <List>
        {members.map((member) => (
          <ListItem key={member.user_id} divider>
            <ListItemAvatar>
              <UserAvatar userId={member.user_id} size="medium" showStatus />
            </ListItemAvatar>
            <ListItemText
              primary={formatUserName(member as any)}
              secondary={
                <Box
                  component="span"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  {member.scheme_admin && (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        mr: 1,
                        color: "primary.main",
                        fontSize: "0.75rem",
                      }}
                    >
                      <AdminIcon fontSize="small" sx={{ mr: 0.5 }} />
                      Channel Admin
                    </Box>
                  )}
                </Box>
              }
            />
            {isAdmin && (
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="more options"
                  onClick={(e) => handleOpenMenu(e, member.user_id)}
                  disabled={isLoading}
                >
                  <MoreIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>

      {/* Empty state */}
      {members.length === 0 && !isLoading && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="textSecondary">
            {searchTerm ? "No members match your search" : "No members found"}
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ p: 2 }}>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            perPage={perPage}
            perPageOptions={[10, 20, 50, 100]}
            onPageChange={onPageChange}
            onPerPageChange={onPerPageChange}
            disabled={isLoading}
          />
        </Box>
      )}

      {/* Member action menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        {selectedMemberId &&
        members.find((m) => m.user_id === selectedMemberId)?.scheme_admin ? (
          <MenuItem onClick={() => handleChangeMemberRole(false)}>
            Remove Admin Role
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleChangeMemberRole(true)}>
            Make Channel Admin
          </MenuItem>
        )}
        <MenuItem onClick={handleRemoveMember} sx={{ color: "error.main" }}>
          Remove From Channel
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default ChannelMembersUI;
