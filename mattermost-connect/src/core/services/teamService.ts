// src/core/services/teamService.ts
/**
 * Team service
 * Provides business logic for team operations and formatting
 */
import {
  Team,
  TeamMember,
  ErrorSource,
  User,
  FormattedTeam,
  UnreadState,
  EventType,
} from "../../types";
import { handleError } from "../store";
import { emitEvent } from "../api/eventUtils";
import { formatUserName } from "../../utils/formatters";

/**
 * Service for team-related operations
 * Separates business logic from state management
 */
class TeamService {
  /**
   * Formats a team for display
   * @param team Team to format
   * @returns Formatted team data ready for UI display
   */
  public formatTeam(team: Team): FormattedTeam {
    try {
      return {
        id: team.id,
        name: team.name,
        displayName: team.display_name,
        description: team.description || "",
        type: team.type,
        isOpen: team.type === "O",
        memberCount: null,
        url: this.getTeamUrl(team),
      };
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatTeam",
        teamId: team.id,
      });

      // Return a safe fallback with minimal data
      return {
        id: team.id || "",
        name: team.name || "",
        displayName: team.display_name || "Unknown Team",
        description: "",
        type: team.type || "O",
        isOpen: team.type === "O",
        memberCount: null,
        url: "",
      };
    }
  }

  /**
   * Formats multiple teams for display
   * @param teams Array of teams to format
   * @returns Array of formatted teams
   */
  public formatTeams(teams: Team[]): FormattedTeam[] {
    try {
      return teams.map((team) => this.formatTeam(team));
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatTeams",
        teamCount: teams.length,
      });
      return [];
    }
  }

  /**
   * Sorts teams alphabetically by display name
   * @param teams Teams to sort
   * @returns Sorted teams
   */
  public sortTeams(teams: Team[]): Team[] {
    try {
      return [...teams].sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      );
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "sortTeams",
        teamCount: teams.length,
      });
      return [...teams]; // Return unsorted copy as fallback
    }
  }

  /**
   * Constructs a URL for a team
   * @param team Team object
   * @returns Team URL
   */
  public getTeamUrl(team: Team): string {
    try {
      return `/teams/${team.name}`;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getTeamUrl",
        teamId: team.id,
      });
      return "";
    }
  }

  /**
   * Formats team members with user data
   * @param members Team members
   * @param users Users by ID
   * @returns Formatted team members with user data
   */
  public formatTeamMembers(
    members: TeamMember[],
    users: Record<string, User>,
  ): Array<TeamMember & { user?: User; displayName: string }> {
    try {
      return members.map((member) => {
        const user = users[member.user_id];
        return {
          ...member,
          user,
          displayName: this.formatUserName(user),
        };
      });
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatTeamMembers",
        memberCount: members.length,
      });
      return members.map((member) => ({
        ...member,
        displayName: "Unknown User",
      }));
    }
  }

  /**
   * Formats a user's name for display
   * @param user User object
   * @returns Formatted user name
   */
  public formatUserName(user?: User): string {
    try {
      // Use the centralized formatting utility
      return formatUserName(user);
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "formatUserName",
        userId: user?.id,
      });
      return "Unknown User";
    }
  }

  /**
   * Validates a team name
   * @param name Team name to validate
   * @returns Whether the name is valid
   */
  public validateTeamName(name: string): boolean {
    try {
      // Team names must be lowercase alphanumeric or hyphens,
      // starting and ending with a letter or number
      const nameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      return nameRegex.test(name) && name.length >= 2 && name.length <= 64;
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "validateTeamName",
        name,
      });
      return false;
    }
  }

  /**
   * Creates a URL-friendly team name from a display name
   * @param displayName Display name to convert
   * @returns URL-friendly team name
   */
  public sanitizeTeamName(displayName: string): string {
    try {
      return displayName
        .toLowerCase()
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, "") // Remove non-alphanumeric characters
        .replace(/-+/g, "-") // Replace multiple hyphens with a single one
        .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "sanitizeTeamName",
        displayName,
      });
      // Return a simple fallback
      return displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
  }

  /**
   * Checks if a user has admin role in a team
   * @param member Team member to check
   * @returns Whether the user is a team admin
   */
  public isTeamAdmin(member: TeamMember): boolean {
    try {
      return (
        member.roles.includes("team_admin") || member.scheme_admin === true
      );
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "isTeamAdmin",
        memberId: member.user_id,
      });
      return false;
    }
  }

  /**
   * Gets total unread count for a team
   * @param teamId Team ID
   * @param channelsByTeam Channels by team ID
   * @param unreadState
   * @returns Total unread counts for the team
   */
  public getTeamUnreadCounts(
    teamId: string,
    channelsByTeam: Record<string, { id: string }[]>,
    unreadState: UnreadState,
  ): { msg_count: number; mention_count: number } {
    try {
      const channels = channelsByTeam[teamId] || [];
      let totalMessages = 0;
      let totalMentions = 0;

      for (const channel of channels) {
        const unreadCount = unreadState.unreadCounts[channel.id] || {
          msg_count: 0,
          mention_count: 0,
        };

        // Skip counts for muted channels unless they have mentions
        const isMuted = unreadState.mutedChannels.has(channel.id);
        if (!isMuted || unreadCount.mention_count > 0) {
          totalMessages += unreadCount.msg_count;
          totalMentions += unreadCount.mention_count;
        }
      }

      return {
        msg_count: totalMessages,
        mention_count: totalMentions,
      };
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getTeamUnreadCounts",
        teamId,
        channelCount: channelsByTeam[teamId]?.length || 0,
      });
      return { msg_count: 0, mention_count: 0 };
    }
  }

  /**
   * Filters teams by search term
   * @param teams Teams to filter
   * @param searchTerm Search term
   * @returns Filtered teams
   */
  public filterTeamsByTerm(teams: Team[], searchTerm: string): Team[] {
    try {
      if (!searchTerm) return teams;

      const lowerTerm = searchTerm.toLowerCase();
      return teams.filter(
        (team) =>
          team.display_name.toLowerCase().includes(lowerTerm) ||
          team.name.toLowerCase().includes(lowerTerm) ||
          (team.description &&
            team.description.toLowerCase().includes(lowerTerm)),
      );
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "filterTeamsByTerm",
        searchTerm,
        teamCount: teams.length,
      });
      return teams; // Return unfiltered list as fallback
    }
  }

  /**
   * Gets display name for the user's role in a team
   * @param member Team member
   * @returns Role display name
   */
  public getTeamRoleDisplayName(member: TeamMember): string {
    try {
      if (this.isTeamAdmin(member)) {
        return "Team Admin";
      } else if (member.roles.includes("team_user")) {
        return "Team Member";
      } else {
        return "Member";
      }
    } catch (error) {
      handleError(error as Error, ErrorSource.UI, undefined, {
        method: "getTeamRoleDisplayName",
        memberId: member.user_id,
      });
      return "Member";
    }
  }

  /**
   * Notifies about team selection
   * @param team Selected team
   */
  public notifyTeamSelected(team: Team): void {
    emitEvent(EventType.TEAM_SELECTED, {
      team,
      timestamp: Date.now(),
    });
  }

  /**
   * Notifies about team changes
   * @param team Updated team
   * @param action Action performed on the team
   */
  public notifyTeamUpdate(
    team: Team,
    action: "created" | "updated" | "deleted" | "joined" | "left",
  ): void {
    const eventMap = {
      created: EventType.TEAM_CREATED,
      updated: EventType.TEAM_UPDATED,
      deleted: EventType.TEAM_DELETED,
      joined: EventType.TEAM_JOINED,
      left: EventType.TEAM_LEFT,
    };

    emitEvent(eventMap[action], {
      team,
      timestamp: Date.now(),
    });
  }
}

/**
 * Singleton instance of the team service
 */
export const teamService = new TeamService();
