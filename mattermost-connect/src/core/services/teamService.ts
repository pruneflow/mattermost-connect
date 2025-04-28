// src/core/services/teamService.ts
/**
 * Team service
 * Provides business logic for team operations
 */
import { Team, TeamMember, TeamStats, User } from "../../types";
import { apiClient } from "../api/client";

/**
 * Format interface for team display
 */
export interface FormattedTeam {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: "O" | "I";
  isOpen: boolean;
  memberCount?: number;
  url?: string;
}

/**
 * Service for team operations
 */
export class TeamService {
  /**
   * Formats a team for display
   * @param team Team to format
   * @returns Formatted team data
   */
  public formatTeam(team: Team): FormattedTeam {
    return {
      id: team.id,
      name: team.name,
      displayName: team.display_name,
      description: team.description || "",
      type: team.type,
      isOpen: team.type === "O",
      url: this.getTeamUrl(team),
    };
  }

  /**
   * Sorts teams alphabetically by display name
   * @param teams Teams to sort
   * @returns Sorted teams
   */
  public sortTeams(teams: Team[]): Team[] {
    return [...teams].sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    );
  }

  /**
   * Gets a team URL
   * @param team Team
   * @returns Team URL
   */
  public getTeamUrl(team: Team): string {
    return `/teams/${team.name}`;
  }

  /**
   * Formats a list of team members with user data
   * @param members Team members
   * @param users Users by ID
   * @returns Formatted team members with user data
   */
  public formatTeamMembers(
    members: TeamMember[],
    users: Record<string, User>,
  ): Array<TeamMember & { user?: User; displayName: string }> {
    return members.map((member) => {
      const user = users[member.user_id];
      return {
        ...member,
        user,
        displayName: this.formatUserName(user),
      };
    });
  }

  /**
   * Gets a formatted user name
   * @param user User object
   * @returns Formatted name
   */
  private formatUserName(user?: User): string {
    if (!user) return "Unknown User";

    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.nickname) {
      return user.nickname;
    } else {
      return user.username || "Unknown User";
    }
  }

  /**
   * Validates team name
   * @param name Team name
   * @returns Whether name is valid
   */
  public validateTeamName(name: string): boolean {
    const nameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    return nameRegex.test(name) && name.length >= 2 && name.length <= 64;
  }

  /**
   * Creates URL-friendly name from display name
   * @param displayName Display name
   * @returns URL-friendly name
   */
  public sanitizeTeamName(displayName: string): string {
    return displayName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Checks if user has admin role in team
   * @param member Team member
   * @returns Whether user is admin
   */
  public isTeamAdmin(member: TeamMember): boolean {
    return member.roles.includes("team_admin") || member.scheme_admin === true;
  }

  /**
   * Gets total unread count for a team
   * @param teamStats Team stats
   * @param unreadCounts Unread counts by channel
   * @returns Total unread counts
   */
  public getTeamUnreadCounts(
    teamId: string,
    channelsByTeam: Record<string, any[]>,
    unreadCounts: Record<string, { msg_count: number; mention_count: number }>,
  ): { msg_count: number; mention_count: number } {
    const channels = channelsByTeam[teamId] || [];
    let totalMessages = 0;
    let totalMentions = 0;

    for (const channel of channels) {
      const unreadCount = unreadCounts[channel.id] || {
        msg_count: 0,
        mention_count: 0,
      };
      totalMessages += unreadCount.msg_count;
      totalMentions += unreadCount.mention_count;
    }

    return { msg_count: totalMessages, mention_count: totalMentions };
  }
}

// Export singleton instance
export const teamService = new TeamService();
