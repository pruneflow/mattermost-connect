// src/internal/containers/teams/TeamInviteContainer.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useListContainer } from "../base/ListContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { useUserSearch } from "../../../hooks";
import { Team, User } from "../../../types";
import TeamInviteUI from "../../components/teams/TeamInviteUI";
import { useDialog } from "../../hooks/useDialog";
import { useDebouncedCallback } from "../../utils/performanceUtils";

export interface TeamInviteContainerProps {
  teamId: string;
  team?: Team;
  onInviteSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  sx?: React.CSSProperties;
  id?: string;
}

/**
 * Container for team invitation functionality
 * Handles user search, email validation, and invitation processes
 */
const TeamInviteContainer: React.FC<TeamInviteContainerProps> = (props) => {
  const {
    teamId,
    team: propTeam,
    onInviteSuccess,
    onCancel,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  const { team: fetchedTeam, members } = useContainerTeam(teamId);

  const team = propTeam || fetchedTeam;
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteLink, setInviteLink] = useState<string | undefined>(undefined);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // User search functionality
  const {
    results: searchResults,
    isLoading: isSearching,
    search,
  } = useUserSearch(searchTerm, { inTeam: teamId });

  // Filtered search results (exclude team members and already selected users)
  const filteredResults = React.useMemo(() => {
    if (!searchResults || !members) return [];

    // Exclude existing team members and already selected users
    const memberUserIds = members.map((m) => m.user_id);
    const selectedUserIds = selectedUsers.map((u) => u.id);
    const excludedIds = new Set([...memberUserIds, ...selectedUserIds]);

    return searchResults.filter((user) => !excludedIds.has(user.id));
  }, [searchResults, members, selectedUsers]);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((term: string) => {
    if (term.length >= 2) {
      search();
    }
  }, 300);

  // Handle search input change
  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      debouncedSearch(term);
    },
    [debouncedSearch],
  );

  // Handle user selection
  const handleSelectUser = useCallback((user: User) => {
    setSelectedUsers((prev) => [...prev, user]);
  }, []);

  // Handle user removal from selection
  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  // Handle email invitation
  const handleInviteByEmail = useCallback(
    async (emails: string[]) => {
      try {
        setIsSendingInvites(true);

        // This would call the actual API to send email invites
        // const result = await teamService.sendEmailInvites(teamId, emails);

        // For now, simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await dialog.showSuccess(
          "Invitations Sent",
          `Successfully sent invitations to ${emails.length} email addresses.`,
        );

        if (onInviteSuccess) {
          onInviteSuccess();
        }
      } catch (error) {
        await dialog.showError(
          "Failed to Send Invitations",
          error instanceof Error
            ? error.message
            : "An error occurred while sending invitations.",
        );
      } finally {
        setIsSendingInvites(false);
      }
    },
    [teamId, dialog, onInviteSuccess],
  );

  // Handle sending invites to selected users
  const handleSendInvites = useCallback(async () => {
    if (selectedUsers.length === 0) return;

    try {
      setIsSendingInvites(true);

      // This would call the actual API to invite users
      // const result = await teamService.inviteUsers(teamId, selectedUsers.map(u => u.id));

      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await dialog.showSuccess(
        "Invitations Sent",
        `Successfully added ${selectedUsers.length} users to the team.`,
      );

      if (onInviteSuccess) {
        onInviteSuccess();
      }
    } catch (error) {
      await dialog.showError(
        "Failed to Add Users",
        error instanceof Error
          ? error.message
          : "An error occurred while adding users to the team.",
      );
    } finally {
      setIsSendingInvites(false);
    }
  }, [teamId, selectedUsers, dialog, onInviteSuccess]);

  // Handle generating invite link
  const handleGenerateLink = useCallback(async () => {
    try {
      setIsGeneratingLink(true);

      // This would call the actual API to generate an invite link
      // const result = await teamService.generateInviteLink(teamId);

      // For now, simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate a fake invite link for demonstration
      const baseUrl = window.location.origin;
      setInviteLink(
        `${baseUrl}/signup/team/${teamId}/${Math.random().toString(36).substring(2, 10)}`,
      );
    } catch (error) {
      await dialog.showError(
        "Failed to Generate Link",
        error instanceof Error
          ? error.message
          : "An error occurred while generating the invite link.",
      );
    } finally {
      setIsGeneratingLink(false);
    }
  }, [teamId, dialog]);

  const uiProps = {
    team: team!,
    users: filteredResults,
    selectedUsers,
    inviteLink,
    isLoading: isSearching || isSendingInvites || isGeneratingLink,
    searchTerm,
    searchResults: filteredResults,
    isSearching,
    onSearchChange: handleSearchChange,
    onSelectUser: handleSelectUser,
    onRemoveUser: handleRemoveUser,
    onInviteByEmail: handleInviteByEmail,
    onSendInvites: handleSendInvites,
    onGenerateLink: handleGenerateLink,
    onCancel,
    className,
    sx,
    id,
  };

  if (!team) {
    return null;
  }

  return <TeamInviteUI {...uiProps} />;
};

export default TeamInviteContainer;
