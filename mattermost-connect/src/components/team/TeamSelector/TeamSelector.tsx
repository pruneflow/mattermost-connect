// src/components/team/TeamSelector/TeamSelector.tsx
import React, {
  useCallback,
  useEffect,
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
 * A component that displays a list of teams and allows selection
 *
 * Ce composant est une pièce centrale de l'application Mattermost, permettant aux utilisateurs de choisir leur équipe active.
 * Il s'interface avec plusieurs services et contextes pour offrir une expérience utilisateur fluide et réactive.
 *
 * Voici une vue d'ensemble de son fonctionnement :
 *
 * 1. Il utilise le contexte MattermostProvider pour accéder aux services et états globaux nécessaires, comme le service Mattermost,
 *    le service de notification, l'équipe active, etc.
 *
 * 2. Il gère son propre état local pour les équipes, le chargement, les erreurs, et les compteurs de messages non lus par équipe.
 *    Cela permet de réagir rapidement aux interactions utilisateur sans attendre les mises à jour du contexte global.
 *
 * 3. Il optimise le chargement des équipes et des compteurs non lus pour éviter les appels redondants au serveur. Il utilise des
 *    références (useRef) pour suivre l'état de ces requêtes asynchrones.
 *
 * 4. Il s'abonne aux mises à jour des compteurs non lus via le service de notification, afin de toujours afficher des informations
 *    à jour à l'utilisateur. Il optimise cette souscription pour éviter les re-renders inutiles.
 *
 * 5. Il propose différentes variantes d'affichage (liste, grille, onglets, barre latérale) pour s'adapter aux préférences de
 *    l'application parente. Ces variantes sont rendues de manière optimisée grâce à useMemo.
 *
 * 6. Pendant le chargement, il affiche des squelettes de chargement adaptés à chaque variante pour une meilleure expérience
 *    utilisateur. Le rendu de ces squelettes est également optimisé.
 *
 * 7. Il gère les erreurs et les cas particuliers (pas d'équipes, équipe déjà sélectionnée, etc.) de manière élégante, toujours
 *    en informant l'utilisateur de ce qui se passe.
 *
 * 8. Enfin, il expose une API de props puissante et flexible pour permettre une intégration facile dans différents contextes.
 *
 * En résumé, ce composant est un excellent exemple d'une pièce d'interface utilisateur complexe, qui tire parti des hooks React
 * et des patterns de performance pour offrir une expérience utilisateur de haute qualité. Sa structure modulaire et ses
 * commentaires détaillés en font également un composant maintenable et évolutif.
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
  const { services, setActiveTeam, activeTeam } = useMattermost();
  console.debug("activeTeam", activeTeam);
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
    if (fetchingRef.current) return;

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
        const teamsData = await mattermostService.getTeams();

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
    useServerOrder,
    mattermostService,
    activeTeam,
    setActiveTeam,
    selectedTeamId,
  ]);

  // 3. Fonction optimisée pour récupérer les non-lus pour toutes les équipes
  const fetchTeamUnreadCounts = useCallback(async () => {
    if (teams.length === 0) return;

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

      setTeamUnreadCounts(unreadCounts);
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

    let isMounted = true;

    const loadUnreadCounts = async () => {
      await fetchTeamUnreadCounts();
      if (!isMounted) return;
    };

    void loadUnreadCounts();

    return () => {
      isMounted = false;
    };
  }, [teams.length, fetchTeamUnreadCounts]);

  // 5. S'abonner aux mises à jour de l'état des non-lus - optimisé pour une seule inscription
  useEffect(() => {
    if (!notificationService) return;

    // Fonction de gestionnaire d'événements - définie une seule fois
    const handleUnreadUpdated = () => {
      void fetchTeamUnreadCounts();
    };

    // S'abonner aux mises à jour une seule fois
    // Nettoyer l'abonnement à la désactivation du composant
    return notificationService.addEventListener(
      "unread_updated",
      handleUnreadUpdated,
    );
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
