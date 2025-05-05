// src/internal/components/teams/TeamMembersUI.tsx
/**
 * Team Members UI Component
 * Displays and manages team members with search, pagination, and actions
 */
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  TextField,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  ArrowUpward as PromoteIcon,
  ArrowDownward as DemoteIcon,
  Delete as RemoveIcon,
} from "@mui/icons-material";
import { Team, TeamMember } from "../../../types";
import { BaseComponentProps } from "../../types/componentTypes";
import { PaginationControls } from "../common";
import { UserAvatarContainer } from "../../containers/users";

export interface TeamMembersUIProps extends BaseComponentProps {
  // Data props
  team: Team;
  members: TeamMember[];
  // State props
  isLoading?: boolean;
  isAdmin?: boolean;
  // Pagination props
  page?: number;
  perPage?: number;
  totalMembers?: number;
  // Search props
  searchTerm?: string;
  // Callback props
  onSearchChange?: (term: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  onInviteMembers?: () => void;
  onRemoveMember?: (userId: string) => void;
  onChangeMemberRole?: (userId: string, makeAdmin: boolean) => void;
}

/**
 * Component for displaying and managing team members
 * Provides search, pagination, and member actions
 */
const TeamMembersUI: React.FC<TeamMembersUIProps> = ({
  team,
  members,
  isLoading = false,
  isAdmin = false,
  page = 1,
  perPage = 20,
  totalMembers = 0,
  searchTerm = "",
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
  // State for member action menu
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = React.useState<string | null>(
    null,
  );

  // Open member action menu
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    userId: string,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(userId);
  };

  // Close member action menu
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  // Handle member removal
  const handleRemoveMember = (userId: string) => {
    handleMenuClose();
    if (onRemoveMember) {
      onRemoveMember(userId);
    }
  };

  // Handle member role change
  const handleRoleChange = (userId: string, makeAdmin: boolean) => {
    handleMenuClose();
    if (onChangeMemberRole) {
      onChangeMemberRole(userId, makeAdmin);
    }
  };

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalMembers / perPage);

  return (
    <Box className={className} sx={sx} id={id}>
      {/* Header with team name and member count */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" component="h2">
          {team.display_name} - Team Members{" "}
          {totalMembers > 0 && `(${totalMembers})`}
        </Typography>

        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={onInviteMembers}
            disabled={isLoading}
          >
            Invite Members
          </Button>
        )}
      </Box>

      {/* Search Bar */}
      <Box mb={3}>
        <TextField
          placeholder="Search members..."
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
          disabled={isLoading}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            },
          }}
        />
      </Box>

      {/* Loading indicator */}
      {isLoading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress size={40} />
        </Box>
      )}

      {/* Members Table */}
      {!isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography py={3} color="text.secondary">
                      {searchTerm
                        ? "No members match your search criteria."
                        : "No members found in this team."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <UserAvatarContainer
                          userId={member.user_id}
                          size="small"
                          showStatus
                        />
                        <Box ml={2}>
                          <Typography variant="body1">
                            {member.display_name ||
                              member.username ||
                              "Unknown"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{member.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.scheme_admin ? "Admin" : "Member"}
                        color={member.scheme_admin ? "primary" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isAdmin && (
                        <IconButton
                          edge="end"
                          onClick={(e) => handleMenuOpen(e, member.user_id)}
                          size="small"
                          disabled={isLoading}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Box mt={2}>
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

      {/* Member Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedMember &&
        members.find((m) => m.user_id === selectedMember)?.scheme_admin ? (
          <MenuItem onClick={() => handleRoleChange(selectedMember, false)}>
            <ListItemIcon>
              <DemoteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Remove Admin Privileges</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleRoleChange(selectedMember!, true)}>
            <ListItemIcon>
              <PromoteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Make Team Admin</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => handleRemoveMember(selectedMember!)}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <RemoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove from Team</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TeamMembersUI;
