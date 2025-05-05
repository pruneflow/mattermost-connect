// src/internal/containers/teams/TeamMembersContainer.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useListContainer } from "../base/ListContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { Team, User } from "../../../types";
import TeamMembersUI from "../../components/teams/TeamMembersUI";
import { useDialog } from "../../hooks/useDialog";
import { useAuth } from "../../../hooks";

export interface TeamMembersContainerProps {
  teamId: string;
  team?: Team;
  onAction?: (action: string, userId: string) => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

/**
 * Container for team members management
 * Handles loading, pagination, searching, and member actions
 */
const TeamMembersContainer: React.FC<TeamMembersContainerProps> = (props) => {
  const { teamId, team: propTeam, onAction, className, sx, id } = props;

  const dialog = useDialog();
  const { currentUser } = useAuth();

  const {
    team: fetchedTeam,
    members,
    formattedMembers,
    isUpdating,
  } = useContainerTeam(teamId);

  const team = propTeam || fetchedTeam;

  // Check if current user is admin
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);

  useEffect(() => {
    if (currentUser && members) {
      const userMember = members.find((m) => m.user_id === currentUser.id);
      setIsTeamAdmin(!!userMember?.scheme_admin);
    }
  }, [currentUser, members]);

  const [listState, listAPI] = useListContainer({
    items: formattedMembers || [],
    idField: "user_id",
    displayField: "username",
    searchFields: ["username", "display_name", "email"],
    emptyMessage: "No members found in this team.",
    onItemSelect: (member) => {
      if (onAction) {
        onAction("view_profile", member.user_id);
      }
    },
  });

  const handleSearchChange = useCallback(
    (term: string) => {
      listAPI.setSearchTerm(term);
    },
    [listAPI],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      listAPI.setPage(page);
    },
    [listAPI],
  );

  const handlePerPageChange = useCallback(
    (perPage: number) => {
      listAPI.setPerPage(perPage);
    },
    [listAPI],
  );

  const handleInviteMembers = useCallback(() => {
    if (onAction) {
      onAction("invite_members", teamId);
    }
  }, [onAction, teamId]);

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      if (currentUser?.id === userId) {
        const confirmed = await dialog.confirmAsync({
          title: "Leave Team",
          message: `Are you sure you want to leave the team "${team?.display_name}"?`,
          confirmText: "Leave Team",
          isDestructive: true,
        });

        if (!confirmed) return;

        if (onAction) {
          onAction("leave_team", userId);
        }
      } else {
        const confirmed = await dialog.confirmAsync({
          title: "Remove Member",
          message: `Are you sure you want to remove this member from the team?`,
          confirmText: "Remove",
          isDestructive: true,
        });

        if (!confirmed) return;

        if (onAction) {
          onAction("remove_member", userId);
        }
      }
    },
    [dialog, team, currentUser, onAction],
  );

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

      if (onAction) {
        onAction(action, userId);
      }
    },
    [dialog, onAction],
  );

  const uiProps = {
    team: team!,
    members: listState.items,
    isLoading: listState.isLoading || isUpdating,
    isAdmin: isTeamAdmin,
    page: listState.page,
    perPage: listState.perPage,
    totalMembers: formattedMembers?.length || 0,
    searchTerm: listState.searchTerm,
    onSearchChange: handleSearchChange,
    onPageChange: handlePageChange,
    onPerPageChange: handlePerPageChange,
    onInviteMembers: handleInviteMembers,
    onRemoveMember: handleRemoveMember,
    onChangeMemberRole: handleChangeMemberRole,
    className,
    sx,
    id,
  };

  if (!team) {
    return null;
  }

  return <TeamMembersUI {...uiProps} />;
};

export default TeamMembersContainer;
