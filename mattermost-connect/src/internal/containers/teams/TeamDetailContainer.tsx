// src/internal/containers/teams/TeamDetailContainer.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useDetailContainer } from "../base/DetailContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { Team } from "../../../types";
import TeamDetailUI from "../../components/teams/TeamDetailUI";
import TeamMembersContainer from "./TeamMembersContainer";
import TeamSettingsContainer from "./TeamSettingsContainer";
import { useDialog } from "../../hooks/useDialog";

export interface TeamDetailContainerProps {
  teamId: string;
  team?: Team;
  variant?: "standard" | "compact" | "card";
  tabs?: Array<{
    id: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab?: string;
  showActions?: boolean;
  availableActions?: string[];
  onAction?: (action: string, team: Team) => void;
  onTabChange?: (tabId: string) => void;
  className?: string;
  sx?: React.CSSProperties;
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
    className,
    sx,
    id,
  } = props;

  const dialog = useDialog();

  const {
    team: fetchedTeam,
    stats,
    members,
    formattedMembers,
    updateTeam,
    deleteTeam,
    formatTeamData,
  } = useContainerTeam(teamId);

  const team = propTeam || fetchedTeam;

  // State for the edit mode of settings tab
  const [isSettingsEditMode, setIsSettingsEditMode] = useState(false);

  const [detailState, detailAPI] = useDetailContainer({
    itemId: teamId,
    item: team,
    editMode: false,
    onLoadItem: async (id) => {
      // This would normally call a refresh function
      return fetchedTeam;
    },
    onUpdateItem: async (id, data) => {
      return await updateTeam(data);
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
    },
    showActions,
    availableActions,
  });

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

  const handleAction = useCallback(
    async (action: string) => {
      if (!team) return;

      if (action === "edit") {
        if (detailState.activeTab === "settings") {
          setIsSettingsEditMode(true);
          return;
        }
      }

      await detailAPI.performAction(action);

      if (onAction) {
        onAction(action, team);
      }
    },
    [team, detailAPI, onAction, detailState.activeTab],
  );

  const handleMemberAction = useCallback(
    (action: string, userId: string) => {
      if (onAction && team) {
        onAction(`member_${action}`, { ...team, memberId: userId });
      }
    },
    [onAction, team],
  );

  const handleSettingsUpdate = useCallback(
    (updatedTeam: Team) => {
      setIsSettingsEditMode(false);
      if (onAction) {
        onAction("settings_updated", updatedTeam);
      }
    },
    [onAction],
  );

  const handleSettingsCancel = useCallback(() => {
    setIsSettingsEditMode(false);
  }, []);

  const formattedTeamData = useMemo(() => {
    if (!team) return null;
    return formatTeamData(team);
  }, [team, formatTeamData]);

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

  const uiProps = {
    team: detailState.item as Team | null,
    formattedTeam: formattedTeamData,
    stats,
    members: formattedMembers,
    isLoading: detailState.isLoading,
    hasError: detailState.hasError,
    error: detailState.error,
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

  return <TeamDetailUI {...uiProps} />;
};

export default TeamDetailContainer;
