// src/components/teams/TeamDetail.tsx
/**
 * Component that displays details about a team
 */
import React from "react";
import { SxProps, Theme } from "@mui/material/styles";
import TeamDetailContainer from "../../internal/containers/teams/TeamDetailContainer";
import TeamDetailUI from "../../internal/components/teams/TeamDetailUI";
import { Team } from "../../index";

export interface TeamDetailProps {
  /** Team ID to display */
  teamId?: string;
  /** Team data (if no teamId is provided) */
  team?: Team;
  /** Whether to show team actions */
  showActions?: boolean;
  /** Size variant */
  variant?: "compact" | "normal" | "expanded";
  /** Team member count (only used with direct team prop) */
  memberCount?: number;
  /** Whether the current user is an admin (only used with direct team prop) */
  isAdmin?: boolean;
  /** Callback when team is deleted */
  onDelete?: () => void;
  /** Callback when team is left */
  onLeave?: () => void;
  /** Callback when team is updated */
  onUpdate?: () => void;
  /** Callback when edit button is clicked (only used with direct team prop) */
  onEdit?: () => void;
  /** Callback when view members button is clicked (only used with direct team prop) */
  onViewMembers?: () => void;
  /** Callback when settings button is clicked (only used with direct team prop) */
  onSettings?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** MUI system props for custom styling */
  sx?: SxProps<Theme>;
  /** ID attribute for the component */
  id?: string;
}

/**
 * Team details component that can display information about a team
 *
 * This component can work in two modes:
 * 1. Connected mode (with teamId): Fetches team data from the store
 * 2. Standalone mode (with team object): Uses provided data directly
 *
 * @example
 * ```tsx
 * // Connected mode
 * <TeamDetail
 *   teamId="team123"
 *   variant="expanded"
 *   onDelete={() => console.log('Team deleted')}
 * />
 *
 * // Standalone mode
 * <TeamDetail
 *   team={teamObject}
 *   memberCount={15}
 *   isAdmin={true}
 *   variant="normal"
 * />
 * ```
 */
const TeamDetail: React.FC<TeamDetailProps> = ({
  teamId,
  team,
  showActions = true,
  variant = "normal",
  memberCount,
  isAdmin,
  onDelete,
  onLeave,
  onUpdate,
  onEdit,
  onViewMembers,
  onSettings,
  className,
  sx,
  id,
}) => {
  // If teamId is provided, use the container for connected functionality
  if (teamId) {
    return (
      <TeamDetailContainer
        teamId={teamId}
        showActions={showActions}
        variant={variant}
        onDelete={onDelete}
        onLeave={onLeave}
        onUpdate={onUpdate}
        className={className}
        sx={sx}
        id={id}
      />
    );
  }

  // If no team data is provided, don't render anything
  if (!team) {
    return null;
  }

  // Otherwise, use the UI component directly with provided props
  return (
    <TeamDetailUI
      team={team}
      memberCount={memberCount}
      isAdmin={isAdmin}
      showActions={showActions}
      variant={variant}
      onEdit={onEdit}
      onDelete={onDelete}
      onLeave={onLeave}
      onViewMembers={onViewMembers}
      onSettings={onSettings}
      className={className}
      sx={sx}
      id={id}
    />
  );
};

export default TeamDetail;
