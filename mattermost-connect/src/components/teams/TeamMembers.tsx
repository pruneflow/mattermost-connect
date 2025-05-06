// src/components/teams/TeamMembers.tsx
/**
 * Component that displays and manages team members
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamMembersContainer from "../../internal/containers/teams/TeamMembersContainer";

export interface TeamMembersProps {
  /** Team ID for connected mode */
  teamId: string;
  /** Whether to show search functionality */
  showSearch?: boolean;
  /** Whether to show pagination controls */
  showPagination?: boolean;
  /** Number of members to show per page */
  perPage?: number;
  /** Whether to allow inviting new members */
  allowInvite?: boolean;
  /** Callback when a member action is performed (notification only) */
  onAction?: (
    action:
      | "view_profile"
      | "remove_member"
      | "make_admin"
      | "remove_admin"
      | "invite_members"
      | "leave_team",
    userId: string,
  ) => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Team members component for displaying and managing members of a team
 *
 * This component displays a list of team members with options for searching,
 * pagination, and member management actions like removal or role changes.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TeamMembers
 *   teamId="team123"
 *   onAction={(action, userId) => {
 *     console.log(`Action ${action} for user ${userId}`);
 *   }}
 * />
 *
 * // With additional options
 * <TeamMembers
 *   teamId="team123"
 *   showSearch={true}
 *   showPagination={true}
 *   perPage={10}
 *   allowInvite={true}
 * />
 * ```
 */
const TeamMembers: React.FC<TeamMembersProps> = ({
  teamId,
  showSearch = true,
  showPagination = true,
  perPage = 20,
  allowInvite = true,
  onAction,
  className,
  sx,
  id,
}) => {
  return (
    <TeamMembersContainer
      teamId={teamId}
      showSearch={showSearch}
      showPagination={showPagination}
      perPage={perPage}
      allowInvite={allowInvite}
      onAction={onAction}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamMembers;
