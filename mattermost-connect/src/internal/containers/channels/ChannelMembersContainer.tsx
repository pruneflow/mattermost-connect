// src/internal/containers/channels/ChannelMembersContainer.tsx
/**
 * Container for channel members
 * Handles members list, roles, and member management
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useListContainer } from "../base/ListContainer";
import { useChannel } from "../../../hooks";
import { useAuthStore } from "../../../core/store/authStore";
import { Channel, ChannelMember, User } from "../../../types";
import ChannelMembersUI from "../../components/channels/ChannelMembersUI";
import { useDialog } from "../../hooks/useDialog";

export interface ChannelMembersContainerProps {
  /** Channel ID */
  channelId: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Callback when an action is performed on a member */
  onAction?: (action: string, userId: string) => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for channel members
 * Manages members list, roles, and member management
 */
const ChannelMembersContainer: React.FC<ChannelMembersContainerProps> = (
  props,
) => {
  const {
    channelId,
    channel: propChannel,
    onAction,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();
  const { currentUser } = useAuthStore();

  // Use channel hook for data and operations
  const {
    channel: fetchedChannel,
    members,
    isUpdating,
    isLoading,
  } = useChannel(channelId);

  const channel = propChannel || fetchedChannel;

  // Check if current user is admin
  const [isChannelAdmin, setIsChannelAdmin] = useState(false);

  // Determine if current user is a channel admin
  useEffect(() => {
    if (currentUser && members) {
      const userMember = members.find((m) => m.user_id === currentUser.id);
      setIsChannelAdmin(!!userMember?.scheme_admin);
    }
  }, [currentUser, members]);

  // Format members for display
  const formattedMembers = useMemo(() => {
    if (!members) return [];

    return members.map((member) => ({
      ...member,
      // Add display properties that would be populated from user store in production
      display_name: member.user_id, // Placeholder
      username: member.user_id, // Placeholder
    }));
  }, [members]);

  // Use ListContainer for list management
  const [listState, listAPI] = useListContainer({
    items: formattedMembers,
    idField: "user_id",
    displayField: "username",
    searchFields: ["username", "display_name"],
    emptyMessage: "No members found in this channel.",
    onItemSelect: (member) => {
      if (onAction) {
        onAction("view_profile", member.user_id);
      }
    },
  });

  // Handle search change
  const handleSearchChange = useCallback(
    (term: string) => {
      listAPI.setSearchTerm(term);
    },
    [listAPI],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      listAPI.setPage(page);
    },
    [listAPI],
  );

  // Handle per page change
  const handlePerPageChange = useCallback(
    (perPage: number) => {
      listAPI.setPerPage(perPage);
    },
    [listAPI],
  );

  // Handle invite members
  const handleInviteMembers = useCallback(() => {
    if (onAction) {
      onAction("invite_members", channelId);
    }
  }, [onAction, channelId]);

  // Handle remove member with confirmation
  const handleRemoveMember = useCallback(
    async (userId: string) => {
      if (!channel) return;

      if (currentUser?.id === userId) {
        // Leaving the channel
        const confirmed = await dialog.confirmAsync({
          title: "Leave Channel",
          message: `Are you sure you want to leave the channel "${channel.display_name}"?`,
          confirmText: "Leave Channel",
          isDestructive: true,
        });

        if (!confirmed) return;

        if (onAction) {
          onAction("leave_channel", userId);
        }
      } else {
        // Removing another member
        const confirmed = await dialog.confirmAsync({
          title: "Remove Member",
          message: `Are you sure you want to remove this member from the channel?`,
          confirmText: "Remove",
          isDestructive: true,
        });

        if (!confirmed) return;

        if (onAction) {
          onAction("remove_member", userId);
        }
      }
    },
    [dialog, channel, currentUser, onAction],
  );

  // Handle change member role with confirmation
  const handleChangeMemberRole = useCallback(
    async (userId: string, makeAdmin: boolean) => {
      const action = makeAdmin ? "make_admin" : "remove_admin";
      const actionText = makeAdmin
        ? "make this member a channel admin"
        : "remove admin privileges from this member";

      const confirmed = await dialog.confirmAsync({
        title: makeAdmin ? "Make Channel Admin" : "Remove Admin",
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

  // Prepare UI props
  const uiProps = {
    channel: channel!,
    members: listState.items,
    isLoading: listState.isLoading || isLoading || isUpdating,
    isAdmin: isChannelAdmin,
    page: listState.page,
    perPage: listState.perPage,
    totalMembers: formattedMembers.length,
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

  if (!channel) {
    return null;
  }

  return <ChannelMembersUI {...uiProps} />;
};

export default ChannelMembersContainer;
