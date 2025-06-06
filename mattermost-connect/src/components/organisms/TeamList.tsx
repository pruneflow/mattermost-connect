import React, { useState, useCallback } from "react";
import {
  Box,
  List,
  Tooltip,
} from "@mui/material";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectTeams } from "../../store/selectors";
import {
  usePermissions,
  useErrorHandler,
  useNavigation,
  useTeamCreation,
  useTeams, useChannels
} from "../../hooks";
import { CreateTeamDialog, type CreateTeamData } from "./CreateTeamDialog";
import { TeamSettingsDialog } from "./TeamSettingsDialog";
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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSettingsOpen, setTeamSettingsOpen] = useState(false);

  // Hooks
  const { canCreateTeam } = usePermissions();
  const { handleError } = useErrorHandler();
  const { navigateToTeam } = useNavigation();
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


  const handleOpenSettings = useCallback((team: Team) => {
    setSelectedTeamId(team.id);
    setTeamSettingsOpen(true);
  }, []);

  const handleCloseTeamSettings = useCallback(() => {
    setTeamSettingsOpen(false);
    setSelectedTeamId(null);
  }, []);

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

  // Note: Error handling is done by AppProvider

  const renderTeamList = () => {
    // Tabs layout - use TeamTabs component
    if (layout === "tabs") {
      return (
        <TeamTabs
          onTeamSelect={handleTeamClick}
          showCreateButton={shouldShowCreateButton}
          onCreate={handleCreateTeamClick}
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
            const handleSettings = () => handleOpenSettings(team);
            return (
              <TeamItem
                key={team.id}
                team={team}
                layout="vertical"
                isActive={currentTeamId === team.id}
                onClick={handleClick}
                onOpenSettings={handleSettings}
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
      <CreateTeamDialog
        open={createModalOpen}
        onClose={handleCloseModal}
        onCreateTeam={handleCreateTeam}
      />

      {/* Team settings modal */}
      <TeamSettingsDialog
        key="team-settings-dialog"
        open={teamSettingsOpen}
        onClose={handleCloseTeamSettings}
        teamId={selectedTeamId}
      />
    </>
  );
};

export default TeamList;
