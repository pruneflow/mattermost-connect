// src/internal/containers/teams/TeamDetailContainer.tsx
import React, { useCallback, useMemo } from "react";
import { useDetailContainer } from "../base/DetailContainer";
import { useContainerTeam } from "../../hooks/useContainerTeam";
import { Team } from "../../../types";
import TeamDetailUI from "../../components/teams/TeamDetailUI";

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

const TeamDetailContainer: React.FC<TeamDetailContainerProps> = (props) => {
  const {
    teamId,
    team: propTeam,
    variant = "standard",
    tabs = [],
    activeTab: initialActiveTab = "info",
    showActions = true,
    availableActions = ["edit", "delete", "manage-members"],
    onAction,
    onTabChange,
    className,
    sx,
    id,
  } = props;

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
    },
    [detailAPI, onTabChange],
  );

  const handleAction = useCallback(
    async (action: string) => {
      if (!team) return;

      await detailAPI.performAction(action);

      if (onAction) {
        onAction(action, team);
      }
    },
    [team, detailAPI, onAction],
  );

  const formattedTeamData = useMemo(() => {
    if (!team) return null;
    return formatTeamData(team);
  }, [team, formatTeamData]);

  const getDefaultTabs = useCallback(() => {
    if (tabs && tabs.length > 0) {
      return tabs;
    }

    return [
      {
        id: "info",
        label: "Info",
      },
      {
        id: "members",
        label: "Members",
      },
      {
        id: "channels",
        label: "Channels",
      },
    ];
  }, [tabs]);

  const uiProps = {
    team: detailState.item as Team | null,
    formattedTeam: formattedTeamData,
    stats,
    members: formattedMembers,
    isLoading: detailState.isLoading,
    hasError: detailState.hasError,
    error: detailState.error,
    isEditMode: detailState.isEditMode,
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
