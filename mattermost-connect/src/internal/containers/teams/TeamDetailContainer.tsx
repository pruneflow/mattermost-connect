// src/internal/containers/teams/TeamDetailContainer.tsx
/**
 * Container for team details
 * Handles team data and actions, with tab navigation for different sections
 */
import React, { useCallback, useMemo, useState } from "react";
import { useTeam } from "../../../hooks";
import { Team } from "../../../types";
import TeamDetailUI from "../../components/teams/TeamDetailUI";
import TeamMembersContainer from "./TeamMembersContainer";
import TeamSettingsContainer from "./TeamSettingsContainer";
import { useDialog } from "../../hooks/useDialog";
import { useDetailContainer } from "../base/DetailContainer";
import { SxProps, Theme } from "@mui/material";

export interface TeamDetailContainerProps {
  /** Team ID to display */
  teamId: string;
  /** Team data (if no teamId is provided) */
  team?: Team;
  /** Size variant */
  variant?: "standard" | "compact" | "card";
  /** Custom tabs configuration */
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  /** Initial active tab */
  activeTab?: string;
  /** Whether to show team actions */
  showActions?: boolean;
  /** Available actions for the team */
  availableActions?: string[];
  /** Callback when an action is performed (notification only) */
  onAction?: (action: string, team: Team) => void;
  /** Callback when tab changes (notification only) */
  onTabChange?: (tabId: string) => void;
  /** Callback when team is deleted (notification only) */
  onDelete?: () => void;
  /** Callback when team is left (notification only) */
  onLeave?: () => void;
  /** Callback when team is updated (notification only) */
  onUpdate?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Container for team details
 * Handles team data and actions, with tab navigation for different sections
 */
const TeamDetailContainer: React.FC<TeamDetailContainerProps> = (props) => {
  const {
    teamId,
    team: propTeam,
    variant = "standard",
    tabs: customTabs = [],
    activeTab: initialActiveTab = "info",
    showActions = true,
    availableActions = ["edit", "delete", "manage-members"],
    onAction,
    onTabChange,
    onDelete,
    onLeave,
    onUpdate,
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  // Use useTeam hook directly instead of useContainerTeam
  const {
    team: fetchedTeam,
    stats,
    members,
    formattedMembers,
    update,
    deleteTeam,
    refreshTeam,
    refreshStats,
    refreshMembers,
    isLoading,
    isUpdating,
    isDeleting,
    error,
  } = useTeam(teamId);

  const team = propTeam || fetchedTeam;

  // State for the edit mode of settings tab
  const [isSettingsEditMode, setIsSettingsEditMode] = useState(false);

  // Use detail container hook for standardized detail handling
  const [detailState, detailAPI] = useDetailContainer({
    itemId: teamId,
    item: team,
    editMode: false,
    onLoadItem: async (id) => {
      await Promise.all([refreshTeam(), refreshStats(), refreshMembers()]);
      return fetchedTeam;
    },
    onUpdateItem: async (id, data) => {
      const updatedTeam = await update(data);
      if (onUpdate) onUpdate();
      return updatedTeam;
    },
    onDeleteItem: async (id) => {
      const confirmed = await dialog.confirmAsync({
        title: "Delete Team",
        message: `Are you sure you want to delete team "${team?.display_name}"? This action cannot be undone.`,
        confirmText: "Delete Team",
        isDestructive: true,
      });

      if (!confirmed) {
        throw new Error("Operation cancelled by user");
      }

      await deleteTeam();
      if (onDelete) onDelete();
    },
    showActions,
    availableActions,
  });

  // Handle tab change with unsaved changes check
  const handleTabChange = useCallback(
    (newTabId: string) => {
      // Check for unsaved changes in settings if changing away from settings tab
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
              detailAPI.setActiveTab(newTabId);
              if (onTabChange) {
                onTabChange(newTabId);
              }
            }
          });
      } else {
        detailAPI.setActiveTab(newTabId);
        if (onTabChange) {
          onTabChange(newTabId);
        }
      }
    },
    [detailAPI, dialog, detailState.activeTab, isSettingsEditMode, onTabChange],
  );

  // Handle team actions
  const handleAction = useCallback(
    async (action: string) => {
      if (!team) return;

      switch (action) {
        case "edit":
          if (detailState.activeTab === "settings") {
            setIsSettingsEditMode(true);
          } else {
            detailAPI.startEdit();
          }
          break;

        case "delete":
          try {
            await detailAPI.deleteItem();
          } catch (error) {
            // Error already handled by deleteItem
          }
          break;

        case "leave":
          const confirmed = await dialog.confirmAsync({
            title: "Leave Team",
            message: `Are you sure you want to leave team "${team?.display_name}"?`,
            confirmText: "Leave Team",
            isDestructive: true,
          });

          if (confirmed) {
            // Logic to leave team would go here
            // ...

            if (onLeave) onLeave();
          }
          break;

        default:
          // Execute generic action
          await detailAPI.performAction(action);
          break;
      }

      // Notify parent component about the action
      if (onAction) {
        onAction(action, team);
      }
    },
    [team, detailAPI, dialog, detailState.activeTab, onAction, onLeave],
  );

  // Handle member actions
  const handleMemberAction = useCallback(
    (action: string, userId: string) => {
      if (onAction && team) {
        onAction(`member_${action}`, { ...team, memberId: userId });
      }
    },
    [onAction, team],
  );

  // Handle settings update
  const handleSettingsUpdate = useCallback(
    (updatedTeam: Team) => {
      setIsSettingsEditMode(false);
      if (onAction) {
        onAction("settings_updated", updatedTeam);
      }
      if (onUpdate) {
        onUpdate();
      }
    },
    [onAction, onUpdate],
  );

  // Handle settings cancel
  const handleSettingsCancel = useCallback(() => {
    setIsSettingsEditMode(false);
  }, []);

  // Format team data for display
  const formattedTeamData = useMemo(() => {
    if (!team) return null;

    // Create standardized display format
    return {
      id: team.id,
      name: team.name,
      displayName: team.display_name,
      description: team.description || "",
      type: team.type,
      isOpen: team.type === "O",
      memberCount: stats?.total_member_count || null,
      url: `/${team.name}`,
      color: team.id, // Will be converted to a color by the UI
    };
  }, [team, stats]);

  // Generate tab content based on active tab
  const getTabContent = useCallback(() => {
    if (!team) return null;

    switch (detailState.activeTab) {
      case "members":
        return (
          <TeamMembersContainer
            teamId={teamId}
            team={team}
            onAction={handleMemberAction}
          />
        );
      case "settings":
        return (
          <TeamSettingsContainer
            teamId={teamId}
            team={team}
            editableFields={[
              "display_name",
              "description",
              "company_name",
              "allowed_domains",
              "allow_open_invite",
            ]}
            onUpdate={handleSettingsUpdate}
            onCancel={handleSettingsCancel}
          />
        );
      default:
        return null;
    }
  }, [
    team,
    teamId,
    detailState.activeTab,
    handleMemberAction,
    handleSettingsUpdate,
    handleSettingsCancel,
  ]);

  // Get default tabs or use custom tabs
  const getDefaultTabs = useCallback(() => {
    if (customTabs && customTabs.length > 0) {
      return customTabs;
    }

    return [
      {
        id: "info",
        label: "Info",
        content: null, // Default content handled by TeamDetailUI
      },
      {
        id: "members",
        label: "Members",
        content: getTabContent(),
      },
      {
        id: "settings",
        label: "Settings",
        content: getTabContent(),
      },
    ];
  }, [customTabs, getTabContent]);

  // Create UI props from container state
  const uiProps = {
    team: detailState.item as Team | null,
    formattedTeam: formattedTeamData,
    stats,
    members: formattedMembers,
    isLoading: detailState.isLoading || isLoading,
    isUpdating,
    isDeleting,
    hasError: !!error,
    error,
    isEditMode: isSettingsEditMode || detailState.isEditMode,
    variant,
    tabs: getDefaultTabs(),
    activeTab: detailState.activeTab || initialActiveTab,
    showActions,
    availableActions: detailAPI.getAvailableActions(),
    onAction: handleAction,
    onTabChange: handleTabChange,
    onEditModeToggle: detailAPI.startEdit,
    onCancelEdit: detailAPI.cancelEdit,
    className,
    sx,
    id,
  };

  // Render the UI component with all props
  return <TeamDetailUI {...uiProps} />;
};

export default TeamDetailContainer;
