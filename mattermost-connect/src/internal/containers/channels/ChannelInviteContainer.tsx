// src/internal/containers/channels/ChannelInviteContainer.tsx
/**
 * Container for channel invitations
 * Handles user search and invitation process
 */
import React, { useCallback, useState } from "react";
import { useChannel, useUserSearch } from "../../../hooks";
import { apiClient } from "../../../core/api/client";
import { Channel, User } from "../../../types";
import ChannelInviteUI from "../../components/channels/ChannelInviteUI";
import { useDialog } from "../../hooks/useDialog";
import { useDebouncedCallback } from "../../utils/performanceUtils";

export interface ChannelInviteContainerProps {
  /** Channel ID */
  channelId: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Callback when invitation succeeds */
  onInviteSuccess?: () => void;
  /** Callback when invitation is cancelled */
  onCancel?: () => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for channel invitations
 * Manages user search and invitation process
 */
const ChannelInviteContainer: React.FC<ChannelInviteContainerProps> = (
  props,
) => {
  const {
    channelId,
    channel: propChannel,
    onInviteSuccess,
    onCancel,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use channel hook for data
  const {
    channel: fetchedChannel,
    members,
    isLoading: isChannelLoading,
  } = useChannel(channelId);

  const channel = propChannel || fetchedChannel;

  // State for selected users and operations
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
  } = useUserSearch(searchTerm, { notInChannel: channelId });

  // Filtered search results (exclude team members and already selected users)
  const filteredResults = React.useMemo(() => {
    if (!searchResults || !members) return [];

    // Exclude existing channel members and already selected users
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
      if (!channel) return;

      try {
        setIsSendingInvites(true);

        // API call for sending email invites
        await apiClient.post(`/channels/${channelId}/invite/email`, { emails });

        await dialog.showSuccess(
          "Invitations Sent",
          `Successfully sent invitations to ${emails.length} email address${emails.length !== 1 ? "es" : ""}.`,
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
    [channel, channelId, dialog, onInviteSuccess],
  );

  // Handle sending invites to selected users
  const handleSendInvites = useCallback(async () => {
    if (!channel || selectedUsers.length === 0) return;

    try {
      setIsSendingInvites(true);

      // API call for inviting users
      await apiClient.post(`/channels/${channelId}/members`, {
        user_ids: selectedUsers.map((u) => u.id),
      });

      await dialog.showSuccess(
        "Invitations Sent",
        `Successfully added ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""} to the channel.`,
      );

      if (onInviteSuccess) {
        onInviteSuccess();
      }
    } catch (error) {
      await dialog.showError(
        "Failed to Add Users",
        error instanceof Error
          ? error.message
          : "An error occurred while adding users to the channel.",
      );
    } finally {
      setIsSendingInvites(false);
    }
  }, [channel, channelId, selectedUsers, dialog, onInviteSuccess]);

  // Handle generating invite link
  const handleGenerateLink = useCallback(async () => {
    if (!channel) return;

    try {
      setIsGeneratingLink(true);

      // API call to generate an invite link
      const response = await apiClient.post<{ invite_link: string }>(
        `/channels/${channelId}/invite-link`,
      );

      setInviteLink(response.data.invite_link);
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
  }, [channel, channelId, dialog]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Prepare UI props
  const uiProps = {
    channel: channel!,
    users: filteredResults,
    selectedUsers,
    inviteLink,
    isLoading:
      isSearching || isSendingInvites || isGeneratingLink || isChannelLoading,
    searchTerm,
    searchResults: filteredResults,
    isSearching,
    onSearchChange: handleSearchChange,
    onSelectUser: handleSelectUser,
    onRemoveUser: handleRemoveUser,
    onInviteByEmail: handleInviteByEmail,
    onSendInvites: handleSendInvites,
    onGenerateLink: handleGenerateLink,
    onCancel: handleCancel,
    className,
    sx,
    id,
  };

  if (!channel) {
    return null;
  }

  return <ChannelInviteUI {...uiProps} />;
};

export default ChannelInviteContainer;
