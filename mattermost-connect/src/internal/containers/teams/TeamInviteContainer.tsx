// src/internal/containers/teams/TeamInviteContainer.tsx
/**
 * Container for team invitation functionality
 * Handles user search, email validation, and invitation processes
 */
import React, { useCallback, useEffect, useState } from "react";
import { useTeam } from "../../../hooks/useTeams";
import { useUserSearch } from "../../../hooks/useUsers";
import { Team, User } from "../../../types";
import TeamInviteUI from "../../components/teams/TeamInviteUI";
import { useDialog } from "../../hooks/useDialog";
import { useDebouncedCallback } from "../../utils/performanceUtils";
import { SxProps, Theme } from "@mui/material";

export interface TeamInviteContainerProps {
  /** Team ID for connected mode */
  teamId: string;
  /** Team object (optional if teamId is provided) */
  team?: Team;
  /** Whether to show email invitation option */
  showEmailInvite?: boolean;
  /** Whether to show invite link generation option */
  showInviteLink?: boolean;
  /** Callback when invitations are sent successfully (notification only) */
  onInviteSuccess?: () => void;
  /** Callback when invitation process is canceled */
  onCancel?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
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
    showEmailInvite = true,
    showInviteLink = true,
    onInviteSuccess,
    onCancel,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use useTeam hook directly instead of useContainerTeam
  const {
    team: fetchedTeam,
    members,
    isLoading: teamLoading,
  } = useTeam(teamId);

  const team = propTeam || fetchedTeam;

  // State for selected users, search term, and invite link
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteLink, setInviteLink] = useState<string | undefined>(undefined);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Use useUserSearch hook for user search
  const {
    results: searchResults,
    isLoading: isSearching,
    search,
  } = useUserSearch(searchTerm, { inTeam: teamId });

  // Filter search results to exclude team members and already selected users
  const filteredResults = React.useMemo(() => {
    if (!searchResults || !members) return [];

    // Exclude existing team members and already selected users
    const memberUserIds = members.map((m) => m.user_id);
    const selectedUserIds = selectedUsers.map((u) => u.id);
    const excludedIds = new Set([...memberUserIds, ...selectedUserIds]);

    return searchResults.filter((user) => !excludedIds.has(user.id));
  }, [searchResults, members, selectedUsers]);

  // Debounced search function to prevent excessive API calls
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

        // Validate email addresses
        const invalidEmails = emails.filter((email) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return !emailRegex.test(email);
        });

        if (invalidEmails.length > 0) {
          await dialog.showError(
            "Invalid Email Addresses",
            `The following email addresses are invalid: ${invalidEmails.join(", ")}`,
          );
          return;
        }

        // Logic to send email invites would go here
        // This would call the team service API in a real implementation
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
    if (selectedUsers.length === 0) {
      await dialog.showError(
        "No Users Selected",
        "Please select at least one user to invite.",
      );
      return;
    }

    try {
      setIsSendingInvites(true);

      // Logic to invite selected users would go here
      // This would call the team service API in a real implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await dialog.showSuccess(
        "Invitations Sent",
        `Successfully added ${selectedUsers.length} users to the team.`,
      );

      // Clear selection after successful invites
      setSelectedUsers([]);

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

      // Logic to generate an invite link would go here
      // This would call the team service API in a real implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate a fake invite link for demonstration
      const baseUrl = window.location.origin;
      const randomToken = Math.random().toString(36).substring(2, 10);
      const newInviteLink = `${baseUrl}/signup/team/${teamId}/${randomToken}`;

      setInviteLink(newInviteLink);

      await dialog.showSuccess(
        "Invite Link Generated",
        "Successfully created a team invitation link.",
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

  // Copy invite link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      await dialog.showSuccess(
        "Link Copied",
        "The invitation link has been copied to your clipboard.",
      );
    } catch (error) {
      await dialog.showError(
        "Copy Failed",
        "Failed to copy the link to clipboard. Please try again.",
      );
    }
  }, [inviteLink, dialog]);

  // Create UI props for the presentation component
  const uiProps = {
    team: team!,
    users: filteredResults,
    selectedUsers,
    inviteLink,
    isLoading:
      teamLoading || isSearching || isSendingInvites || isGeneratingLink,
    searchTerm,
    searchResults: filteredResults,
    isSearching,
    showEmailInvite,
    showInviteLink,
    onSearchChange: handleSearchChange,
    onSelectUser: handleSelectUser,
    onRemoveUser: handleRemoveUser,
    onInviteByEmail: handleInviteByEmail,
    onSendInvites: handleSendInvites,
    onGenerateLink: handleGenerateLink,
    onCopyLink: handleCopyLink,
    onCancel,
    className,
    sx,
    id,
  };

  // Don't render anything if no team available
  if (!team) {
    return null;
  }

  return <TeamInviteUI {...uiProps} />;
};

export default TeamInviteContainer;
