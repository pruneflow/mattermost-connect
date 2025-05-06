// src/internal/containers/teams/TeamMembersContainer.tsx
/**
 * Container for team members management
 * Handles loading, pagination, searching, and member actions
 */
import React, { useCallback, useEffect, useState } from "react";
import { useTeam } from "../../../hooks/useTeams";
import { useAuth } from "../../../hooks";
import { Team, User } from "../../../types";
import { useDialog } from "../../hooks/useDialog";
import { useListContainer } from "../base/ListContainer";
import TeamMembersUI from "../../components/teams/TeamMembersUI";
import { SxProps, Theme } from "@mui/material";

export interface TeamMembersContainerProps {
  /** Team ID for connected mode */
  teamId: string;
  /** Team object (optional if teamId is provided) */
  team?: Team;
  /** Whether to show search functionality */
  showSearch?: boolean;
  /** Whether to show pagination controls */
  showPagination?: boolean;
  /** Number of members to show per page */
  perPage?: number;
  /** Whether to allow inviting new members */
  allowInvite?: boolean;
  /** Callback when a member action is performed (notification only) */
  onAction?: (
    action:
      | "view_profile"
      | "remove_member"
      | "make_admin"
      | "remove_admin"
      | "invite_members"
      | "leave_team",
    userId: string,
  ) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Container for team members management
 * Handles loading, pagination, searching, and member actions
 */
const TeamMembersContainer: React.FC<TeamMembersContainerProps> = (props) => {
  const {
    teamId,
    team: propTeam,
    showSearch = true,
    showPagination = true,
    perPage = 20,
    allowInvite = true,
    onAction,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();
  const { currentUser } = useAuth();

  // Use useTeam hook directly instead of useContainerTeam
  const {
    team: fetchedTeam,
    members,
    formattedMembers,
    isLoading,
    error,
    refreshMembers,
    update,
  } = useTeam(teamId);

  const team = propTeam || fetchedTeam;

  // Check if current user is admin
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);

  useEffect(() => {
    if (currentUser && members) {
      const userMember = members.find((m) => m.user_id === currentUser.id);
      setIsTeamAdmin(!!userMember?.scheme_admin);
    }
  }, [currentUser, members]);

  // Setup list container for members
  const [listState, listAPI] = useListContainer(
    {
      items: formattedMembers || [],
      idField: "user_id",
      displayField: "username",
      searchFields: ["username", "display_name", "email"],
      emptyMessage: "No members found in this team.",
      onItemSelect: (member) => {
        handleMemberAction("view_profile", member.user_id);
      },
    },
    {
      paginationOptions: { initialPerPage: perPage },
      enableSearch: showSearch,
      enablePagination: showPagination,
    },
  );

  // Handle search term changes
  const handleSearchChange = useCallback(
    (term: string) => {
      listAPI.setSearchTerm(term);
    },
    [listAPI],
  );

  // Handle pagination changes
  const handlePageChange = useCallback(
    (page: number) => {
      listAPI.setPage(page);
    },
    [listAPI],
  );

  // Handle per page size changes
  const handlePerPageChange = useCallback(
    (newPerPage: number) => {
      listAPI.setPerPage(newPerPage);
    },
    [listAPI],
  );

  // Handle invite members action
  const handleInviteMembers = useCallback(() => {
    if (onAction) {
      onAction("invite_members", teamId);
    }
  }, [onAction, teamId]);

  // Handle member removal with confirmation
  const handleRemoveMember = useCallback(
    async (userId: string) => {
      // Check if it's the current user (leaving team)
      if (currentUser?.id === userId) {
        const confirmed = await dialog.confirmAsync({
          title: "Leave Team",
          message: `Are you sure you want to leave the team "${team?.display_name}"?`,
          confirmText: "Leave Team",
          isDestructive: true,
        });

        if (!confirmed) return;

        // Logic to leave team would go here
        // ...

        // Notify parent component
        if (onAction) {
          onAction("leave_team", userId);
        }
      } else {
        // Remove other team member
        const confirmed = await dialog.confirmAsync({
          title: "Remove Member",
          message: `Are you sure you want to remove this member from the team?`,
          confirmText: "Remove",
          isDestructive: true,
        });

        if (!confirmed) return;

        // Logic to remove member would go here
        // ...

        // Refresh members list
        refreshMembers();

        // Notify parent component
        if (onAction) {
          onAction("remove_member", userId);
        }
      }
    },
    [dialog, team, currentUser, onAction, refreshMembers],
  );

  // Handle changing member role (make/remove admin)
  const handleChangeMemberRole = useCallback(
    async (userId: string, makeAdmin: boolean) => {
      const action = makeAdmin ? "make_admin" : "remove_admin";
      const actionText = makeAdmin
        ? "make this member a team admin"
        : "remove admin privileges from this member";

      const confirmed = await dialog.confirmAsync({
        title: makeAdmin ? "Make Team Admin" : "Remove Admin",
        message: `Are you sure you want to ${actionText}?`,
        confirmText: makeAdmin ? "Make Admin" : "Remove Admin",
      });

      if (!confirmed) return;

      // Logic to change member role would go here
      // ...

      // Refresh members list
      refreshMembers();

      // Notify parent component
      if (onAction) {
        onAction(action, userId);
      }
    },
    [dialog, onAction, refreshMembers],
  );

  // General member action handler
  const handleMemberAction = useCallback(
    (action: string, userId: string) => {
      switch (action) {
        case "remove_member":
          handleRemoveMember(userId);
          break;
        case "make_admin":
          handleChangeMemberRole(userId, true);
          break;
        case "remove_admin":
          handleChangeMemberRole(userId, false);
          break;
      }
    },
    [handleRemoveMember, handleChangeMemberRole, onAction],
  );

  // Create UI props for the presentation component
  const uiProps = {
    team: team!,
    members: listState.items,
    isLoading: isLoading || listState.isLoading,
    isAdmin: isTeamAdmin,
    hasError: !!error,
    error,
    allowInvite,
    page: listState.page,
    perPage: listState.perPage,
    totalMembers: formattedMembers?.length || 0,
    searchTerm: listState.searchTerm,
    showSearch,
    showPagination,
    onSearchChange: handleSearchChange,
    onPageChange: handlePageChange,
    onPerPageChange: handlePerPageChange,
    onInviteMembers: handleInviteMembers,
    onRemoveMember: handleRemoveMember,
    onChangeMemberRole: handleChangeMemberRole,
    onAction: handleMemberAction,
    className,
    sx,
    id,
  };

  // Don't render anything if no team available
  if (!team) {
    return null;
  }

  return <TeamMembersUI {...uiProps} />;
};

export default TeamMembersContainer;
