// src/internal/containers/channels/ChannelDetailContainer.tsx
/**
 * Container for channel details
 * Handles channel information display and channel actions
 */
import React, { useCallback, useMemo, useState } from "react";
import { useDetailContainer } from "../base/DetailContainer";
import { useContainerChannel } from "../../hooks/useContainerChannel";
import { Channel } from "../../../types";
import ChannelDetailUI from "../../components/channels/ChannelDetailUI";
import ChannelMembersContainer from "./ChannelMembersContainer";
import ChannelSettingsContainer from "./ChannelSettingsContainer";
import { useDialog } from "../../hooks/useDialog";

export interface ChannelDetailContainerProps {
  /** Channel ID */
  channelId: string;
  /** Channel object (if already available) */
  channel?: Channel;
  /** Display variant */
  variant?: "standard" | "compact" | "card";
  /** Custom tabs to display */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  /** Initially active tab */
  activeTab?: string;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Available actions for this channel */
  availableActions?: string[];
  /** Callback when an action is performed */
  onAction?: (action: string, channel: Channel) => void;
  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void;
  /** CSS class name */
  className?: string;
  /** Material UI's sx prop for styling */
  sx?: any;
  /** ID for the component */
  id?: string;
}

/**
 * Container for channel details
 * Manages tabs, actions, and detail views for a channel
 */
const ChannelDetailContainer: React.FC<ChannelDetailContainerProps> = (
  props,
) => {
  const {
    channelId,
    channel: propChannel,
    variant = "standard",
    tabs: customTabs = [],
    activeTab: initialActiveTab = "info",
    showActions = true,
    availableActions = ["edit", "delete", "leave", "mute", "favorite"],
    onAction,
    onTabChange,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use channel container hook
  const {
    channel: fetchedChannel,
    members,
    formattedChannel,
    updateChannelWithConfirm,
    deleteChannelWithConfirm,
    leaveChannelWithConfirm,
    toggleFavorite,
    toggleMuted,
    formatChannelData,
    isFavorite,
    isChannelMuted,
    isDirect,
    isGroup,
  } = useContainerChannel(channelId);

  const channel = propChannel || fetchedChannel;

  // State for settings edit mode
  const [isSettingsEditMode, setIsSettingsEditMode] = useState(false);

  // Use detail container hook
  const [detailState, detailAPI] = useDetailContainer({
    itemId: channelId,
    item: channel,
    editMode: false,
    onLoadItem: async (id) => {
      // Just return the channel, loading is handled by the useChannel hook
      return channel;
    },
    onUpdateItem: async (id, data) => {
      return await updateChannelWithConfirm(data);
    },
    onDeleteItem: async (id) => {
      const confirmed = await deleteChannelWithConfirm();
      if (!confirmed) {
        throw new Error("Operation cancelled by user");
      }
    },
    showActions,
    availableActions,
  });

  // Handle tab change
  const handleTabChange = useCallback(
    (newTabId: string) => {
      detailAPI.setActiveTab(newTabId);

      if (onTabChange) {
        onTabChange(newTabId);
      }

      // If changing away from settings tab and it's in edit mode, prompt to save
      if (
        detailState.activeTab === "settings" &&
        isSettingsEditMode &&
        newTabId !== "settings"
      ) {
        dialog
          .confirmAsync({
            title: "Unsaved Changes",
            message:
              "You have unsaved changes in settings. Are you sure you want to leave?",
            confirmText: "Leave",
            cancelText: "Stay",
          })
          .then((confirmed) => {
            if (confirmed) {
              setIsSettingsEditMode(false);
            } else {
              // Revert tab change
              detailAPI.setActiveTab("settings");
              if (onTabChange) {
                onTabChange("settings");
              }
            }
          });
      }
    },
    [detailAPI, onTabChange, detailState.activeTab, isSettingsEditMode, dialog],
  );

  // Handle channel actions
  const handleAction = useCallback(
    async (action: string) => {
      if (!channel) return;

      // Handle built-in actions
      switch (action) {
        case "edit":
          if (detailState.activeTab === "settings") {
            setIsSettingsEditMode(true);
            return;
          }
          break;
        case "favorite":
          await toggleFavorite();
          break;
        case "mute":
          await toggleMuted();
          break;
        case "leave":
          await leaveChannelWithConfirm();
          break;
        default:
          // Use detail container's performAction for standard actions
          await detailAPI.performAction(action);
      }

      // Call the onAction callback if provided
      if (onAction) {
        onAction(action, channel);
      }
    },
    [
      channel,
      detailAPI,
      detailState.activeTab,
      toggleFavorite,
      toggleMuted,
      leaveChannelWithConfirm,
      onAction,
    ],
  );

  // Handle member actions
  const handleMemberAction = useCallback(
    (action: string, userId: string) => {
      if (onAction && channel) {
        onAction(`member_${action}`, { ...channel, memberId: userId });
      }
    },
    [onAction, channel],
  );

  // Handle settings update
  const handleSettingsUpdate = useCallback(
    (updatedChannel: Channel) => {
      setIsSettingsEditMode(false);
      if (onAction) {
        onAction("settings_updated", updatedChannel);
      }
    },
    [onAction],
  );

  // Handle settings cancel
  const handleSettingsCancel = useCallback(() => {
    setIsSettingsEditMode(false);
  }, []);

  // Generate tab content based on active tab
  const getTabContent = useCallback(() => {
    if (!channel) return null;

    switch (detailState.activeTab) {
      case "members":
        return (
          <ChannelMembersContainer
            channelId={channelId}
            channel={channel}
            onAction={handleMemberAction}
          />
        );
      case "settings":
        return (
          <ChannelSettingsContainer
            channelId={channelId}
            channel={channel}
            editMode={isSettingsEditMode}
            onUpdate={handleSettingsUpdate}
            onCancel={handleSettingsCancel}
          />
        );
      default:
        return null;
    }
  }, [
    channel,
    channelId,
    detailState.activeTab,
    isSettingsEditMode,
    handleMemberAction,
    handleSettingsUpdate,
    handleSettingsCancel,
  ]);

  // Get default tabs or use custom tabs
  const getTabs = useCallback(() => {
    if (customTabs && customTabs.length > 0) {
      return customTabs;
    }

    // Default tabs based on channel type
    const tabs = [
      {
        id: "info",
        label: "Info",
        content: null, // Default content handled by ChannelDetailUI
      },
    ];

    // Only show members tab for non-direct channels
    if (!isDirect) {
      tabs.push({
        id: "members",
        label: "Members",
        content: getTabContent(),
      });
    }

    // Settings tab for all channels
    tabs.push({
      id: "settings",
      label: "Settings",
      content: getTabContent(),
    });

    return tabs;
  }, [customTabs, isDirect, getTabContent]);

  // Prepare UI props
  const uiProps = {
    channel: detailState.item as Channel | null,
    formattedChannel,
    members,
    isLoading: detailState.isLoading,
    hasError: detailState.hasError,
    error: detailState.error,
    isEditMode: isSettingsEditMode || detailState.isEditMode,
    isFavorite: channelId ? isFavorite(channelId) : false,
    isMuted: channelId ? isChannelMuted(channelId) : false,
    isDirect,
    isGroup,
    variant,
    tabs: getTabs(),
    activeTab: detailState.activeTab || initialActiveTab,
    showActions,
    availableActions: detailAPI.getAvailableActions(),
    onAction: handleAction,
    onTabChange: handleTabChange,
    className,
    sx,
    id,
  };

  return <ChannelDetailUI {...uiProps} />;
};

export default ChannelDetailContainer;
