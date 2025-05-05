// src/internal/hooks/useContainerTeam.ts
import { useCallback, useMemo } from "react";
import { useTeams, useTeam } from "../../hooks";
import { Team, TeamType, UpdateTeamParams } from "../../types";
import { useDelayedLoading } from "../utils/performanceUtils";
import { stringToColor } from "../../utils/mattermostUtils";

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

/**
 * Hook for team containers
 * Provides standardized access to team data and operations
 */
export function useContainerTeam(teamId?: string) {
  const { teams, formattedTeams, activeTeam, selectTeam, refreshTeams } =
    useTeams();
  const {
    team,
    stats,
    members,
    formattedMembers,
    update,
    deleteTeam,
    isLoading: teamIsLoading,
    isUpdating,
    isDeleting,
    refreshTeam,
    refreshStats,
    refreshMembers,
  } = useTeam(teamId);

  // Use delayed loading to prevent UI flash
  const isLoading = useDelayedLoading(teamIsLoading);

  /**
   * Formats a team object into a standardized display format
   */
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

  /**
   * Updates a team with partial data
   */
  const updateTeam = useCallback(
    async (
      updateData: Partial<Team> & { id?: string },
    ): Promise<Team | null> => {
      if (!teamId && !updateData.id) {
        throw new Error("Team ID is required for update");
      }

      const id = teamId || updateData.id!;
      const teamUpdateData: UpdateTeamParams = {};

      // Copy only valid update fields
      if (updateData.display_name !== undefined)
        teamUpdateData.display_name = updateData.display_name;
      if (updateData.description !== undefined)
        teamUpdateData.description = updateData.description;
      if (updateData.company_name !== undefined)
        teamUpdateData.company_name = updateData.company_name;
      if (updateData.allowed_domains !== undefined)
        teamUpdateData.allowed_domains = updateData.allowed_domains;
      if (updateData.allow_open_invite !== undefined)
        teamUpdateData.allow_open_invite = updateData.allow_open_invite;

      return await update(teamUpdateData);
    },
    [teamId, update],
  );

  /**
   * Gets available team actions based on user permissions
   */
  const getTeamActions = useCallback(
    (team: Team, isAdmin: boolean = false): Action[] => {
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
    },
    [],
  );

  /**
   * Checks if an action is allowed for the current user
   */
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

  /**
   * Refreshes all team data
   */
  const refreshAll = useCallback(async () => {
    if (teamId) {
      await Promise.all([refreshTeam(), refreshStats(), refreshMembers()]);
    } else {
      await refreshTeams();
    }
  }, [teamId, refreshTeam, refreshStats, refreshMembers, refreshTeams]);

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
    updateTeam,
    deleteTeam,
    refreshTeam,
    refreshMembers,
    refreshAll,

    // Helper functions
    formatTeamData,
    getTeamActions,
    isActionAllowed,

    // State
    isLoading,
    isUpdating,
    isDeleting,
  };
}
