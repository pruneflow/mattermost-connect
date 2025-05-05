// src/internal/hooks/useContainerTeam.ts
import { useCallback, useMemo } from "react";
import { useTeams, useTeam } from "../../hooks";
import { Team, TeamType } from "../../types";

export interface TeamDisplayData {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: TeamType;
  isOpen: boolean;
  memberCount: number | null;
  url: string;
  color: string;
}

interface Action {
  id: string;
  label: string;
  destructive?: boolean;
}

export function useContainerTeam(teamId?: string) {
  const { teams, formattedTeams, activeTeam, selectTeam } = useTeams();
  const {
    team,
    stats,
    members,
    formattedMembers,
    update,
    deleteTeam,
    isUpdating,
    isDeleting,
  } = useTeam(teamId);

  const formatTeamData = useCallback(
    (teamData: Team): TeamDisplayData => {
      const formattedTeam = formattedTeams.find((t) => t.id === teamData.id);

      return {
        id: teamData.id,
        name: teamData.name,
        displayName: teamData.display_name,
        description: teamData.description || "",
        type: teamData.type,
        isOpen: teamData.type === "O",
        memberCount: stats?.total_member_count || null,
        url: `/${teamData.name}`,
        color: stringToColor(teamData.name),
      };
    },
    [formattedTeams, stats],
  );

  const getTeamActions = useCallback((team: Team, isAdmin: boolean = false) => {
    const actions: Action[] = [
      { id: "view", label: "View Team" },
      { id: "channels", label: "Browse Channels" },
    ];

    if (isAdmin) {
      actions.push(
        { id: "edit", label: "Edit Team" },
        { id: "manage-members", label: "Manage Members" },
        { id: "delete", label: "Delete Team", destructive: true },
      );
    } else {
      actions.push({ id: "leave", label: "Leave Team", destructive: true });
    }

    return actions;
  }, []);

  const isActionAllowed = useCallback(
    (actionId: string, team: Team, isAdmin: boolean = false): boolean => {
      switch (actionId) {
        case "view":
        case "channels":
          return true;
        case "edit":
        case "manage-members":
        case "delete":
          return isAdmin;
        case "leave":
          return !isAdmin;
        default:
          return false;
      }
    },
    [],
  );

  // Helper function to convert string to color
  const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).substr(-2);
    }
    return color;
  };

  return {
    // Team data
    team,
    teams,
    activeTeam,
    stats,
    members,
    formattedMembers,

    // Team operations
    selectTeam,
    updateTeam: update,
    deleteTeam,

    // Helper functions
    formatTeamData,
    getTeamActions,
    isActionAllowed,

    // State
    isUpdating,
    isDeleting,
  };
}
