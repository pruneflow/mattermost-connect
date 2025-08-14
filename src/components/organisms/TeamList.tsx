/**
 * Team list component with multiple layout options and team management
 * Supports vertical, horizontal, and tabs layouts with team dialogs and navigation
 */
import React, { useState, useCallback } from "react";
import {
  Box,
  List,
  Tooltip,
} from "@mui/material";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectTeams } from "../../store/selectors";
import {
  useTeamCreation,
  useTeams,
  useTeamDialogs
} from "../../hooks";
import { handleError } from "../../services/errorService";
import { canCreateTeam } from "../../services/permissionService";
import { navigateToTeam } from "../../services/navigationService";
import { CreateTeamDialog, type CreateTeamData } from "./CreateTeamDialog";
import TeamSettingsDialog from "./TeamSettingsDialog";
import ManageMembersDialog from "./ManageMembersDialog";
import TeamInfoDialog from "./TeamInfoDialog";
import LeaveTeamDialog from "./LeaveTeamDialog";
import { InvitePeopleDialog } from "./InvitePeopleDialog";
import { TeamItemSkeleton, ListSkeleton } from "../atoms";
import { TeamItem, CreateTeamButton } from "../molecules";
import { TeamTabs } from "./TeamTabs";
import type { Team } from "../../api/types";

export interface TeamListProps {
  onTeamSelect?: (team: Team) => void;
  showCreateButton?: boolean; // default: true
  layout?: "vertical" | "horizontal" | "tabs";
  compact?: boolean; // default: false
  showMenu?: boolean; // default: true - show team settings menu
}

export const TeamList: React.FC<TeamListProps> = ({
  onTeamSelect,
  showCreateButton = true,
  layout = "vertical",
  compact = false,
  showMenu = true,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const {
    selectedTeamId,
    openSettings,
    openMembers,
    openInvite,
    openInfo,
    openLeave,
    isSettingsOpen,
    isMembersOpen,
    isInviteOpen,
    isInfoOpen,
    isLeaveOpen,
    closeDialog,
  } = useTeamDialogs();

  // Hooks
  const { createTeam } = useTeamCreation();
  // UnreadCounts handled by TeamItem directly

  // Teams data from hook (read-only)
  const { currentTeamId } = useTeams();

  // Use memoized selector for teams with unread data
  const teams = useAppSelector(selectTeams);


  // Stable event handlers - const outside render
  const handleTeamClick = useCallback(
    (team: Team) => {
      try {
        navigateToTeam(team.id);
        if (onTeamSelect) {
          onTeamSelect(team);
        }
      } catch (error) {
        handleError(error, {
          component: "TeamList",
          action: "selectTeam",
          showToast: true,
        });
      }
    },
    [navigateToTeam, onTeamSelect, handleError],
  );



  const handleCreateTeamClick = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleCreateTeam = useCallback(
    async (teamData: CreateTeamData) => {
      await createTeam(teamData);
      setCreateModalOpen(false);
    },
    [createTeam],
  );

  const handleCloseModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  // Show create button if: props allows it AND user has permissions
  const shouldShowCreateButton = showCreateButton && canCreateTeam();

  const getSkeleton = useCallback(() => {
    if (layout === "vertical") {
      return <ListSkeleton count={5} showAvatar={true} />;
    } else if (layout === "horizontal") {
      return (
        <Box sx={{ display: "flex", alignItems: "center", p: 1, gap: 1 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <TeamItemSkeleton key={index} />
          ))}
        </Box>
      );
    } else {
      // tabs
      return (
        <Box sx={{ display: "flex", overflowX: "auto", p: 1, gap: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <TeamItemSkeleton key={index} />
          ))}
        </Box>
      );
    }
  }, [layout]);

  // Show skeleton while teams are not loaded yet
  if (teams.length === 0) {
    return getSkeleton();
  }

  const renderTeamList = () => {
    // Tabs layout - use TeamTabs component
    if (layout === "tabs") {
      return (
        <TeamTabs
          onTeamSelect={handleTeamClick}
          showCreateButton={shouldShowCreateButton}
          onCreate={handleCreateTeamClick}
          onOpenSettings={openSettings}
          onOpenMembers={openMembers}
          onOpenInvite={openInvite}
          onOpenInfo={openInfo}
          onLeaveTeam={openLeave}
        />
      );
    }

    // Horizontal layout container (for top navigation)
    if (layout === "horizontal") {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1,
            overflowX: "auto",
          }}
        >
          {teams.map((team) => {
            const handleClick = () => handleTeamClick(team);
            return (
              <TeamItem
                key={team.id}
                team={team}
                layout="horizontal"
                isActive={currentTeamId === team.id}
                onClick={handleClick}
              />
            );
          })}

          {shouldShowCreateButton && (
            <Tooltip title="Create new team">
              <CreateTeamButton
                layout="horizontal"
                onClick={handleCreateTeamClick}
              />
            </Tooltip>
          )}
        </Box>
      );
    }

    // Vertical layout (for sidebar)
    return (
      <Box sx={{ width: "100%" }}>

        {/* Teams list */}
        <List sx={{ width: "100%" }}>
          {teams.map((team) => {
            const handleClick = () => handleTeamClick(team);
            return (
              <TeamItem
                key={team.id}
                team={team}
                layout="vertical"
                isActive={currentTeamId === team.id}
                onClick={handleClick}
                onOpenSettings={openSettings}
                onOpenMembers={openMembers}
                onOpenInvite={openInvite}
                onOpenInfo={openInfo}
                onLeaveTeam={openLeave}
                showMenu={showMenu}
                compact={compact}
              />
            );
          })}

          {/* Create team item */}
          {shouldShowCreateButton && (
            <CreateTeamButton
              layout="vertical"
              onClick={handleCreateTeamClick}
              compact={compact}
            />
          )}
        </List>
      </Box>
    );
  };

  return (
    <>
      {renderTeamList()}
      {/* Create team modal */}
      { createModalOpen && (
        <CreateTeamDialog
          open={createModalOpen}
          onClose={handleCloseModal}
          onCreateTeam={handleCreateTeam}
        />
      )}


      { isSettingsOpen && (
        <TeamSettingsDialog
          open={isSettingsOpen}
          onClose={closeDialog}
          teamId={selectedTeamId}
        />
      )}

      { isMembersOpen && (
        <ManageMembersDialog
          open={isMembersOpen}
          onClose={closeDialog}
          teamId={selectedTeamId}
        />
      )}


      { isInfoOpen && (
        <TeamInfoDialog
          open={isInfoOpen}
          onClose={closeDialog}
          teamId={selectedTeamId}
        />
      )}


      { isLeaveOpen && (
        <LeaveTeamDialog
          open={isLeaveOpen}
          onClose={closeDialog}
          teamId={selectedTeamId}
        />
      )}

      
      {/* Conditional rendering for performance */}
      {isInviteOpen && (
        <InvitePeopleDialog
          open={isInviteOpen}
          onClose={closeDialog}
          teamId={selectedTeamId || ''}
        />
      )}
    </>
  );
};

export default TeamList;
