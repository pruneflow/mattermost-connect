// src/components/team/TeamSelector/TeamSelector.tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMattermost } from "../../../context";
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

import { assertServiceInitialized } from "../../../services";

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
  const isMountedRef = useRef(true);
  const instanceIdRef = useRef(
    `team-selector-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // Variables pour le débogage et comprendre le cycle de vie du composant
  const renderCountRef = useRef(0);
  const effectRunCountRef = useRef(0);
  const fetchCountRef = useRef(0);

  // Incrémenter le compteur de rendu à chaque rendu
  renderCountRef.current += 1;

  console.log(
    `[TeamSelector] Render #${renderCountRef.current}, isMounted=${isMountedRef.current}`,
  );

  const { services, setActiveTeam, activeTeam } = useMattermost();
  console.log(
    `[TeamSelector] activeTeam=${activeTeam?.display_name || "null"}`,
  );

  assertServiceInitialized(services, "TeamSelector requires services");
  assertServiceInitialized(
    services.mattermostService,
    "TeamSelector requires MattermostService",
  );
  assertServiceInitialized(
    services.notificationService,
    "TeamSelector requires NotificationService",
  );

  const mattermostService = services.mattermostService;
  const notificationService = services.notificationService;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamUnreadCounts, setTeamUnreadCounts] = useState<
    Record<string, { msg_count: number; mention_count: number }>
  >({});

  // Référence pour les appels fetchTeams
  const fetchingRef = useRef<boolean>(false);
  const teamsLoadedRef = useRef<boolean>(false);

  useLayoutEffect(() => {
    const instanceId = instanceIdRef.current;
    console.log(
      `[TeamSelector ${instanceId}] MOUNTED, setting isMountedRef=true`,
    );
    isMountedRef.current = true;

    return () => {
      console.log(
        `[TeamSelector ${instanceId}] UNMOUNTED, setting isMountedRef=false`,
      );
      isMountedRef.current = false;
    };
  }, []);

  // 1. Mémoriser la fonction de sélection d'équipe avec useCallback
  const handleTeamSelect = useCallback(
    (team: Team) => {
      console.log(
        `[TeamSelector] Team selected: ${team.display_name}, isMounted=${isMountedRef.current}`,
      );
      // Enlever la vérification d'isMounted ici
      setActiveTeam(team);
      if (onSelectTeam) {
        onSelectTeam(team);
      }
    },
    [onSelectTeam, setActiveTeam],
  );

  // Fonction pour charger les équipes avec une gestion robuste du montage
  const fetchTeams = useCallback(async () => {
    // Éviter les appels en parallèle
    if (fetchingRef.current) {
      console.log(`[TeamSelector] fetchTeams: Already fetching, skipping`);
      return;
    }

    const fetchId = ++fetchCountRef.current;
    console.log(
      `[TeamSelector] fetchTeams #${fetchId} started, isMounted=${isMountedRef.current}`,
    );

    fetchingRef.current = true;

    // Afficher le chargement seulement si nous n'avons pas déjà des équipes
    if (!teamsLoadedRef.current && isMountedRef.current) {
      setLoading(true);
    }

    try {
      console.log(`[TeamSelector] fetchTeams #${fetchId}: Calling API...`);
      const teamsData = await mattermostService.getTeams();
      console.log(
        `[TeamSelector] fetchTeams #${fetchId}: Got ${teamsData.length} teams, isMounted=${isMountedRef.current}`,
      );

      // Vérifier si le composant est toujours monté - POINT CRITIQUE
      if (!isMountedRef.current) {
        console.log(
          `[TeamSelector] fetchTeams #${fetchId}: Component unmounted, aborting`,
        );
        return;
      }

      if (teamsData && teamsData.length > 0) {
        // Sort teams if needed
        let sortedTeams = [...teamsData];
        if (!useServerOrder) {
          sortedTeams.sort((a, b) =>
            a.display_name.localeCompare(b.display_name),
          );
        }

        console.log(
          `[TeamSelector] fetchTeams #${fetchId}: Setting teams state...`,
        );
        setTeams(sortedTeams);
        teamsLoadedRef.current = true;

        console.log(
          `[TeamSelector] fetchTeams #${fetchId}: Current activeTeam=${activeTeam?.display_name || "null"}, selectedTeamId=${selectedTeamId || "none"}`,
        );

        // Seulement définir une équipe active s'il n'y en a pas déjà une
        if (!activeTeam && !selectedTeamId) {
          console.log(
            `[TeamSelector] fetchTeams #${fetchId}: Auto-selecting first team ${sortedTeams[0].display_name}`,
          );
          setActiveTeam(sortedTeams[0]);
        } else if (selectedTeamId) {
          // Si selectedTeamId est fourni, l'utiliser pour sélectionner l'équipe
          const selectedTeam = sortedTeams.find((t) => t.id === selectedTeamId);
          if (selectedTeam) {
            console.log(
              `[TeamSelector] fetchTeams #${fetchId}: Selecting team from prop ${selectedTeam.display_name}`,
            );
            setActiveTeam(selectedTeam);
          }
        }

        setError(null);
      }
    } catch (err) {
      console.error(
        `[TeamSelector] fetchTeams #${fetchId}: Error loading teams:`,
        err,
      );
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load teams");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
      console.log(`[TeamSelector] fetchTeams #${fetchId} completed`);
    }
  }, [
    useServerOrder,
    mattermostService,
    activeTeam,
    setActiveTeam,
    selectedTeamId,
  ]);

  // 2. Effet pour charger les équipes une seule fois
  useEffect(() => {
    const effectId = ++effectRunCountRef.current;
    console.log(
      `[TeamSelector] useEffect #${effectId} for teams loading started`,
    );

    // Charger les équipes
    fetchTeams().catch((err) => {
      console.error(`[TeamSelector] Error in fetchTeams:`, err);
    });

    // Nettoyage avec marquer comme démonté
    return () => {
      console.log(
        `[TeamSelector] useEffect #${effectId} cleanup: marking as unmounted`,
      );
      isMountedRef.current = false;
    };
  }, [fetchTeams]);

  // 3. Effet pour réinitialiser le flag de montage si le composant est réellement monté
  // Ceci est crucial car si le composant est re-rendu mais pas démonté, nous devons réinitialiser le flag
  useEffect(() => {
    console.log(
      `[TeamSelector] Component mounted/remounted, resetting isMountedRef`,
    );
    isMountedRef.current = true;

    return () => {
      console.log(
        `[TeamSelector] Component unmounted, setting isMountedRef=false`,
      );
      isMountedRef.current = false;
    };
  }, []);

  // 3. Fonction optimisée pour récupérer les non-lus pour toutes les équipes
  const fetchTeamUnreadCounts = useCallback(async () => {
    if (teams.length === 0 || !isMountedRef.current) return;

    // Éviter les appels redondants si déjà en cours
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const unreadCounts: Record<
        string,
        { msg_count: number; mention_count: number }
      > = {};

      // Pour chaque équipe, récupérer l'état des non-lus
      for (const team of teams) {
        // Vérifier à nouveau si le composant est monté après chaque itération
        if (!isMountedRef.current) return;

        // Vérifie si la méthode getTeamUnreadCount existe dans le service
        if (
          typeof (mattermostService as any).getTeamUnreadCount === "function"
        ) {
          const unreadData = await (
            mattermostService as any
          ).getTeamUnreadCount(team.id);

          unreadCounts[team.id] = {
            msg_count: unreadData.msg_count || 0,
            mention_count: unreadData.mention_count || 0,
          };
        }
      }

      if (isMountedRef.current) {
        setTeamUnreadCounts(unreadCounts);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des non-lus par équipe:",
        error,
      );
    } finally {
      fetchingRef.current = false;
    }
  }, [mattermostService, teams]);

  // 4. Récupération initiale des non-lus - avec vérification de montage
  useEffect(() => {
    if (teams.length === 0) return;

    console.log(
      `[TeamSelector] Starting unread counts fetch for ${teams.length} teams`,
    );

    const loadUnreadCounts = async () => {
      if (isMountedRef.current) {
        await fetchTeamUnreadCounts();
      }
    };

    void loadUnreadCounts();
  }, [teams.length, fetchTeamUnreadCounts]);

  // 5. S'abonner aux mises à jour de l'état des non-lus - optimisé pour une seule inscription
  useEffect(() => {
    if (!notificationService) return;

    console.log(`[TeamSelector] Setting up notifications listener`);

    // Fonction de gestionnaire d'événements - définie une seule fois
    const handleUnreadUpdated = () => {
      if (isMountedRef.current) {
        console.log(`[TeamSelector] Received unread_updated notification`);
        void fetchTeamUnreadCounts();
      }
    };

    // S'abonner aux mises à jour une seule fois
    const unsubscribe = notificationService.addEventListener(
      "unread_updated",
      handleUnreadUpdated,
    );

    // Nettoyer l'abonnement à la désactivation du composant
    return () => {
      console.log(`[TeamSelector] Cleaning up notifications listener`);
      unsubscribe();
    };
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

// Utiliser React.memo pour éviter les re-rendus inutiles
export default React.memo(TeamSelector);
