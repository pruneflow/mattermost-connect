// src/components/team/TeamSelector/TeamSelector.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useMattermost } from "../../../context/MattermostProvider";
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
 * A component that displays a list of teams and allows selection
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
  const {
    isConnected,
    service,
    currentUser,
    setActiveTeam,
    activeTeam,
    notificationService,
  } = useMattermost();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamUnreadCounts, setTeamUnreadCounts] = useState<
    Record<string, { msg_count: number; mention_count: number }>
  >({});

  // Référence pour les appels fetchTeams
  const fetchingRef = useRef<boolean>(false);
  const teamsLoadedRef = useRef<boolean>(false);

  // 1. Mémoriser la fonction de sélection d'équipe avec useCallback
  const handleTeamSelect = useCallback(
    (team: Team) => {
      setActiveTeam(team);
      if (onSelectTeam) {
        onSelectTeam(team);
      }
    },
    [onSelectTeam, setActiveTeam],
  );

  // 2. Optimiser le chargement des équipes pour éviter les appels redondants
  useEffect(() => {
    if (!isConnected || fetchingRef.current) return;

    // Référence pour savoir si le composant est toujours monté
    let isMounted = true;

    const fetchTeams = async () => {
      // Éviter les appels en parallèle
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      // Afficher le chargement seulement si nous n'avons pas déjà des équipes
      if (!teamsLoadedRef.current) {
        setLoading(true);
      }

      try {
        console.debug("Fetching teams data");
        const teamsData = await service.getTeams();

        // Vérifier si le composant est toujours monté
        if (!isMounted) return;

        if (teamsData && teamsData.length > 0) {
          // Sort teams if needed
          let sortedTeams = [...teamsData];
          if (!useServerOrder) {
            sortedTeams.sort((a, b) =>
              a.display_name.localeCompare(b.display_name),
            );
          }

          setTeams(sortedTeams);
          teamsLoadedRef.current = true;

          // Seulement définir une équipe active s'il n'y en a pas déjà une
          if (!activeTeam && !selectedTeamId) {
            setActiveTeam(sortedTeams[0]);
          } else if (selectedTeamId) {
            // Si selectedTeamId est fourni, l'utiliser pour sélectionner l'équipe
            const selectedTeam = sortedTeams.find(
              (t) => t.id === selectedTeamId,
            );
            if (selectedTeam) {
              setActiveTeam(selectedTeam);
            }
          }

          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading teams:", err);
        setError(err instanceof Error ? err.message : "Failed to load teams");
      } finally {
        if (isMounted) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    };

    void fetchTeams();

    // Nettoyage pour éviter les mises à jour sur un composant démonté
    return () => {
      isMounted = false;
    };
  }, [
    isConnected,
    useServerOrder,
    service,
    activeTeam,
    setActiveTeam,
    selectedTeamId,
  ]);

  // 3. Fonction optimisée pour récupérer les non-lus pour toutes les équipes
  const fetchTeamUnreadCounts = useCallback(async () => {
    if (!isConnected || !service || teams.length === 0 || !currentUser) return;

    // Éviter les appels redondants si déjà en cours
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      console.debug("Fetching team unread counts");
      const unreadCounts: Record<
        string,
        { msg_count: number; mention_count: number }
      > = {};

      // Pour chaque équipe, récupérer l'état des non-lus
      for (const team of teams) {
        // Vérifie si la méthode getTeamUnreadCount existe dans le service
        if (typeof (service as any).getTeamUnreadCount === "function") {
          const unreadData = await (service as any).getTeamUnreadCount(team.id);

          unreadCounts[team.id] = {
            msg_count: unreadData.msg_count || 0,
            mention_count: unreadData.mention_count || 0,
          };
        }
      }

      setTeamUnreadCounts(unreadCounts);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des non-lus par équipe:",
        error,
      );
    } finally {
      fetchingRef.current = false;
    }
  }, [isConnected, service, teams, currentUser]);

  // 4. Récupération initiale des non-lus - avec vérification de montage
  useEffect(() => {
    if (teams.length === 0 || !isConnected) return;

    let isMounted = true;

    const loadUnreadCounts = async () => {
      await fetchTeamUnreadCounts();
      if (!isMounted) return;
    };

    void loadUnreadCounts();

    return () => {
      isMounted = false;
    };
  }, [teams.length, isConnected, fetchTeamUnreadCounts]);

  // 5. S'abonner aux mises à jour de l'état des non-lus - optimisé pour une seule inscription
  useEffect(() => {
    if (!notificationService) return;

    // Fonction de gestionnaire d'événements - définie une seule fois
    const handleUnreadUpdated = () => {
      void fetchTeamUnreadCounts();
    };

    // S'abonner aux mises à jour une seule fois
    const unsubscribe = notificationService.addEventListener(
      "unread_updated",
      handleUnreadUpdated,
    );

    // Nettoyer l'abonnement à la désactivation du composant
    return unsubscribe;
  }, [notificationService, fetchTeamUnreadCounts]);

  // 6. Fonction mémorisée pour le rendu des skeletons
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

  // 7. Mémoriser le rendu des variantes avec useMemo pour éviter les re-renders inutiles
  const renderedVariant = useMemo(() => {
    const sharedProps = {
      teams,
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
    teams,
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

  // Rendu principal avec mémoisations
  const renderContent = useMemo(() => {
    if (loading) {
      return renderSkeletons();
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      );
    }

    if (teams.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography component={"div"} variant="body2" color="text.secondary">
            No teams available
          </Typography>
        </Box>
      );
    }

    return renderedVariant;
  }, [loading, error, teams.length, renderSkeletons, renderedVariant]);

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

export default React.memo(TeamSelector);
