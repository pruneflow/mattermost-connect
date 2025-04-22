// src/components/team/TeamSelector/TeamSelector.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTeamContext } from "../../../context";
import { Team } from "../../../types";

// Material-UI Components
import {
  Alert,
  Box,
  Skeleton,
  SxProps,
  Theme,
  Typography,
} from "@mui/material";

// Import variants
import TeamList from "./variants/TeamList";
import TeamGrid from "./variants/TeamGrid";
import TeamTabs from "./variants/TeamTabs";
import TeamSidebar from "./variants/TeamSidebar";

/**
 * Type for the display variant of the TeamSelector
 */
export type TeamSelectorVariant = "list" | "grid" | "tabs" | "sidebar";

/**
 * Props for the TeamSelector component
 */
export interface TeamSelectorProps {
  /** Callback when a team is selected */
  onSelectTeam?: (team: Team) => void;

  /** Display variant */
  variant?: TeamSelectorVariant;

  /** Show team icons (if available) */
  showIcons?: boolean;

  /** Show team descriptions */
  showDescriptions?: boolean;

  /** Show team member count badges */
  showMemberCount?: boolean;

  /** Use team order from server instead of alphabetical */
  useServerOrder?: boolean;

  /** Max number of characters for team name before truncating (0 for no limit) */
  maxNameLength?: number;

  /** Additional CSS class */
  className?: string;

  /** Additional inline style */
  style?: React.CSSProperties;

  /** Material-UI sx prop for additional styling */
  sx?: SxProps<Theme>;

  /** Custom styling for team items */
  teamItemSx?: SxProps<Theme>;

  /** Custom styling for selected team */
  selectedTeamSx?: SxProps<Theme>;

  /** Currently selected team ID */
  selectedTeamId?: string;
}

/**
 * Component that displays and allows selection of Mattermost teams
 *
 * Supports multiple display variants:
 * - list: Vertical list of teams
 * - grid: Grid layout of team cards
 * - tabs: Horizontal tabs
 * - sidebar: Vertical sidebar with icons
 */
const TeamSelector: React.FC<TeamSelectorProps> = ({
  onSelectTeam,
  variant = "list",
  showIcons = true,
  showDescriptions = false,
  showMemberCount = false,
  useServerOrder = false,
  maxNameLength = 0,
  className,
  style,
  sx,
  teamItemSx,
  selectedTeamSx,
  selectedTeamId,
}) => {
  // Utilisation directe du contexte d'équipe
  const {
    teams,
    activeTeam,
    isTeamsLoading,
    teamsError,
    loadTeams,
    setActiveTeam,
    unreadCounts,
  } = useTeamContext();

  // État local pour suivre si les équipes ont été chargées
  const [initialized, setInitialized] = useState(false);

  // Triez les équipes si nécessaire
  const sortedTeams = useMemo(() => {
    if (!teams || teams.length === 0) return [];

    // Utiliser l'ordre du serveur ou trier par nom
    if (useServerOrder) {
      return [...teams];
    } else {
      return [...teams].sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      );
    }
  }, [teams, useServerOrder]);

  // Chargement initial des équipes
  useEffect(() => {
    if (!initialized && (!teams || teams.length === 0)) {
      void loadTeams().then(() => {
        setInitialized(true);
      });
    } else if (teams.length > 0 && !initialized) {
      setInitialized(true);
    }
  }, [teams, loadTeams, initialized]);

  // Définir l'équipe initiale si nécessaire
  useEffect(() => {
    if (initialized && sortedTeams.length > 0) {
      // Si selectedTeamId est fourni, l'utiliser pour sélectionner l'équipe
      if (selectedTeamId && (!activeTeam || activeTeam.id !== selectedTeamId)) {
        const team = sortedTeams.find((t) => t.id === selectedTeamId);
        if (team) {
          setActiveTeam(team);
        }
      }
      // Si aucune équipe active n'est définie, définir la première équipe
      else if (!activeTeam) {
        setActiveTeam(sortedTeams[0]);
      }
    }
  }, [sortedTeams, activeTeam, selectedTeamId, setActiveTeam, initialized]);

  // Gérer la sélection d'équipe
  const handleTeamSelect = useCallback(
    (team: Team) => {
      setActiveTeam(team);
      if (onSelectTeam) {
        onSelectTeam(team);
      }
    },
    [onSelectTeam, setActiveTeam],
  );

  // Fonction pour rendre les skeletons durant le chargement
  const renderSkeletons = useCallback(() => {
    // Return different skeleton layouts based on variant
    switch (variant) {
      case "grid":
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, p: 2 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Box key={index} sx={{ width: 100, textAlign: "center" }}>
                <Skeleton
                  variant="circular"
                  width={60}
                  height={60}
                  sx={{ mx: "auto" }}
                />
                <Skeleton
                  variant="text"
                  width={80}
                  sx={{ mx: "auto", mt: 1 }}
                />
              </Box>
            ))}
          </Box>
        );
      case "tabs":
        return (
          <Box sx={{ display: "flex", p: 1 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                width={120}
                height={32}
                sx={{ mx: 0.5 }}
              />
            ))}
          </Box>
        );
      case "sidebar":
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              p: 1,
              alignItems: "center",
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="circular"
                width={40}
                height={40}
                sx={{ my: 1 }}
              />
            ))}
          </Box>
        );
      case "list":
      default:
        return (
          <Box sx={{ p: 1 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                height={40}
                sx={{ my: 0.5 }}
              />
            ))}
          </Box>
        );
    }
  }, [variant]);

  // Formatage des données de non-lu pour les variantes
  const teamUnreadCounts = useMemo(() => {
    const result: Record<string, { msg_count: number; mention_count: number }> =
      {};

    Object.entries(unreadCounts).forEach(([teamId, counts]) => {
      result[teamId] = {
        msg_count: counts.messageCount,
        mention_count: counts.mentionCount,
      };
    });

    return result;
  }, [unreadCounts]);

  // Rendu de la variante sélectionnée
  const renderedVariant = useMemo(() => {
    const sharedProps = {
      teams: sortedTeams,
      selectedTeamId: selectedTeamId || activeTeam?.id,
      onSelectTeam: handleTeamSelect,
      showIcons,
      showDescriptions,
      showMemberCount,
      maxNameLength,
      teamItemSx,
      selectedTeamSx,
      teamUnreadCounts,
    };

    switch (variant) {
      case "grid":
        return <TeamGrid {...sharedProps} />;
      case "tabs":
        return <TeamTabs {...sharedProps} />;
      case "sidebar":
        return <TeamSidebar {...sharedProps} />;
      case "list":
      default:
        return <TeamList {...sharedProps} />;
    }
  }, [
    sortedTeams,
    activeTeam?.id,
    selectedTeamId,
    handleTeamSelect,
    showIcons,
    showDescriptions,
    showMemberCount,
    maxNameLength,
    teamItemSx,
    selectedTeamSx,
    teamUnreadCounts,
    variant,
  ]);

  // Rendu du contenu basé sur l'état de chargement
  const renderContent = useMemo(() => {
    if (isTeamsLoading && !initialized) {
      return renderSkeletons();
    }

    if (teamsError) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          {teamsError.message}
        </Alert>
      );
    }

    if (sortedTeams.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography component={"div"} variant="body2" color="text.secondary">
            No teams available
          </Typography>
        </Box>
      );
    }

    return renderedVariant;
  }, [
    isTeamsLoading,
    initialized,
    teamsError,
    sortedTeams.length,
    renderSkeletons,
    renderedVariant,
  ]);

  return (
    <Box
      className={className}
      style={style}
      sx={{
        display: "flex",
        flexDirection: variant === "sidebar" ? "column" : "column",
        width: "100%",
        height: variant === "tabs" ? "auto" : "100%",
        bgcolor: "background.paper",
        ...sx,
      }}
    >
      {renderContent}
    </Box>
  );
};

// Utiliser React.memo pour éviter les re-rendus inutiles
export default React.memo(TeamSelector);
