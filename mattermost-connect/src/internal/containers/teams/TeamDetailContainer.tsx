// src/internal/containers/teams/TeamDetailContainer.tsx
/**
 * Container component for team details that manages data fetching and state
 */
import React, { useCallback } from "react";
import { useTeam } from "../../../hooks/useTeams";
import { BaseComponentProps } from "../../types/componentTypes";
import TeamDetailUI from "../../components/teams/TeamDetailUI";
import { ConfirmDialog } from "../../components/common";

export interface TeamDetailContainerProps extends BaseComponentProps {
  /** Team ID to display */
  teamId: string;
  /** Whether to show team actions */
  showActions?: boolean;
  /** Size variant */
  variant?: "compact" | "normal" | "expanded";
  /** Callback when team is deleted */
  onDelete?: () => void;
  /** Callback when team is left */
  onLeave?: () => void;
  /** Callback when team is updated */
  onUpdate?: () => void;
}

const TeamDetailContainer: React.FC<TeamDetailContainerProps> = ({
  teamId,
  showActions = true,
  variant = "normal",
  onDelete,
  onLeave,
  onUpdate,
  className,
  sx,
  id,
}) => {
  // State for dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = React.useState(false);

  // Get team data from hook
  const { team, stats, isLoading, error, deleteTeam, leaveTeam, updateTeam } =
    useTeam(teamId);

  // Get member count from stats
  const memberCount = stats?.total_member_count || 0;

  // Determine if user is admin (simplified approach - would need user role data)
  // This is a placeholder implementation
  const isAdmin = true; // Replace with actual logic based on user roles

  // Handle edit team
  const handleEdit = useCallback(() => {
    // Typically would open an edit dialog
    console.log("Edit team");
  }, []);

  // Handle delete team confirmation
  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);

    try {
      await deleteTeam();

      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  }, [deleteTeam, onDelete]);

  // Handle leave team confirmation
  const handleLeaveConfirm = useCallback(async () => {
    setLeaveDialogOpen(false);

    try {
      await leaveTeam();

      if (onLeave) {
        onLeave();
      }
    } catch (error) {
      console.error("Error leaving team:", error);
    }
  }, [leaveTeam, onLeave]);

  // Handle view members
  const handleViewMembers = useCallback(() => {
    // Typically would navigate to members view or open dialog
    console.log("View members");
  }, []);

  // Handle settings
  const handleSettings = useCallback(() => {
    // Typically would navigate to settings view or open dialog
    console.log("Open settings");
  }, []);

  // Don't render if no team data
  if (!team && !isLoading) {
    return null;
  }

  return (
    <>
      {team && (
        <TeamDetailUI
          team={team}
          memberCount={memberCount}
          isAdmin={isAdmin}
          showActions={showActions}
          variant={variant}
          onEdit={handleEdit}
          onDelete={() => setDeleteDialogOpen(true)}
          onLeave={() => setLeaveDialogOpen(true)}
          onViewMembers={handleViewMembers}
          onSettings={handleSettings}
          className={className}
          sx={sx}
          id={id}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Team"
        message={`Are you sure you want to delete the team "${team?.display_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        open={leaveDialogOpen}
        title="Leave Team"
        message={`Are you sure you want to leave the team "${team?.display_name}"?`}
        confirmText="Leave"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleLeaveConfirm}
        onCancel={() => setLeaveDialogOpen(false)}
      />
    </>
  );
};

export default TeamDetailContainer;
