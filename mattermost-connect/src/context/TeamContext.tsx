// src/context/TeamContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { Team } from "../types";
import { ServiceContainer } from "../services";
import { useConnection } from "./ConnectionContext";

/**
 * Interface pour le TeamContext
 * Fournit uniquement les fonctionnalités liées aux équipes
 */
export interface TeamContextType {
  // État des équipes
  teams: Team[];
  activeTeam: Team | null;
  isTeamsLoading: boolean;
  teamsError: Error | null;

  // Compteurs non-lus par équipe
  unreadCounts: Record<
    string,
    {
      messageCount: number;
      mentionCount: number;
    }
  >;

  // Méthodes pour la gestion des équipes
  loadTeams: () => Promise<Team[]>;
  setActiveTeam: (team: Team | null) => void;
  switchTeam: (teamId: string | Team) => Promise<Team | null>;
  getTeamById: (teamId: string) => Team | undefined;
  getTeamUnreadCount: (teamId: string) => {
    messageCount: number;
    mentionCount: number;
  };
}

// Création du contexte avec une valeur par défaut null
export const TeamContext = createContext<TeamContextType | null>(null);

/**
 * Hook personnalisé pour accéder au TeamContext
 * Lance une erreur s'il est utilisé en dehors d'un TeamProvider
 */
export function useTeamContext(): TeamContextType {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
}

/**
 * Props pour le composant TeamProvider
 */
export interface TeamProviderProps {
  children: ReactNode;
  services: ServiceContainer | null;
  refreshInterval?: number;
}

/**
 * Provider pour la gestion des équipes
 * Gère les équipes et leurs états
 */
export const TeamProvider: React.FC<TeamProviderProps> = ({
  children,
  services,
  refreshInterval = 0, // Pas de rafraîchissement auto par défaut
}) => {
  // Récupération du contexte de connexion
  const connection = useConnection();

  // État pour les équipes
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [isTeamsLoading, setIsTeamsLoading] = useState<boolean>(false);
  const [teamsError, setTeamsError] = useState<Error | null>(null);

  // État pour les compteurs non-lus
  const [unreadCounts, setUnreadCounts] = useState<
    Record<
      string,
      {
        messageCount: number;
        mentionCount: number;
      }
    >
  >({});

  // Références pour suivre l'état sans re-renders
  const activeTeamRef = useRef<Team | null>(null);
  const teamsRef = useRef<Team[]>([]);
  const lastTeamsFetchRef = useRef<number>(0);

  /**
   * Charge toutes les équipes disponibles
   */
  const loadTeams = useCallback(async (): Promise<Team[]> => {
    if (!services?.mattermostService || !connection.isConnected) {
      return [];
    }

    setIsTeamsLoading(true);
    setTeamsError(null);

    try {
      const availableTeams = await services.mattermostService.getTeams();

      // Mise à jour de l'état et de la référence
      setTeams(availableTeams);
      teamsRef.current = availableTeams;

      // Mise à jour du timestamp de dernière récupération
      lastTeamsFetchRef.current = Date.now();

      return availableTeams;
    } catch (error) {
      console.error("Error loading teams:", error);
      const typedError =
        error instanceof Error ? error : new Error(String(error));

      setTeamsError(typedError);
      return [];
    } finally {
      setIsTeamsLoading(false);
    }
  }, [services, connection.isConnected]);

  /**
   * Définit l'équipe active
   */
  const setActiveTeam = useCallback((team: Team | null) => {
    setActiveTeamState(team);
    activeTeamRef.current = team;
  }, []);

  /**
   * Change d'équipe active
   */
  const switchTeam = useCallback(
    async (teamIdOrTeam: string | Team): Promise<Team | null> => {
      if (!services?.mattermostService) {
        return null;
      }

      // Déterminer l'ID d'équipe
      const teamId =
        typeof teamIdOrTeam === "string" ? teamIdOrTeam : teamIdOrTeam.id;

      // Si déjà l'équipe active, pas besoin de changer
      if (activeTeamRef.current?.id === teamId) {
        return activeTeamRef.current;
      }

      try {
        // Si un objet d'équipe est fourni, l'utiliser directement
        if (typeof teamIdOrTeam !== "string") {
          setActiveTeam(teamIdOrTeam);
          return teamIdOrTeam;
        }

        // Chercher l'équipe dans les équipes déjà chargées
        const existingTeam = teamsRef.current.find((t) => t.id === teamId);
        if (existingTeam) {
          setActiveTeam(existingTeam);
          return existingTeam;
        }

        // Charger les détails de l'équipe depuis l'API
        const team = await services.mattermostService.getTeam(teamId);
        setActiveTeam(team);
        return team;
      } catch (error) {
        console.error(`Error switching to team ${teamId}:`, error);
        return null;
      }
    },
    [services, setActiveTeam],
  );

  /**
   * Récupère une équipe par son ID
   */
  const getTeamById = useCallback((teamId: string): Team | undefined => {
    return teamsRef.current.find((team) => team.id === teamId);
  }, []);

  /**
   * Initialise les compteurs non-lus pour les équipes
   */
  const initializeTeamsUnreadStates = useCallback(async (): Promise<void> => {
    if (
      !services?.mattermostService ||
      !connection.isConnected ||
      teamsRef.current.length === 0
    ) {
      return;
    }

    try {
      const newUnreadCounts: Record<
        string,
        { messageCount: number; mentionCount: number }
      > = {};

      // Récupérer les compteurs pour chaque équipe
      for (const team of teamsRef.current) {
        if (
          typeof services.mattermostService.getTeamUnreadCount === "function"
        ) {
          try {
            const teamUnread =
              await services.mattermostService.getTeamUnreadCount(team.id);

            newUnreadCounts[team.id] = {
              messageCount: teamUnread.msg_count || 0,
              mentionCount: teamUnread.mention_count || 0,
            };
          } catch (error) {
            console.warn(
              `Unable to get unread count for team ${team.id}:`,
              error,
            );
          }
        }
      }

      // Mettre à jour l'état avec les nouveaux compteurs
      setUnreadCounts(newUnreadCounts);
    } catch (error) {
      console.error("Error initializing teams unread states:", error);
    }
  }, [services, connection.isConnected]);

  /**
   * Récupère le compteur non-lu pour une équipe
   */
  const getTeamUnreadCount = useCallback(
    (teamId: string) => {
      return unreadCounts[teamId] || { messageCount: 0, mentionCount: 0 };
    },
    [unreadCounts],
  );

  // Charger les équipes lors de la connexion initiale
  useEffect(() => {
    if (
      connection.isConnected &&
      services?.mattermostService &&
      teams.length === 0
    ) {
      void loadTeams().then(() => {
        void initializeTeamsUnreadStates();
      });
    }
  }, [
    connection.isConnected,
    services,
    teams.length,
    loadTeams,
    initializeTeamsUnreadStates,
  ]);

  // Mettre à jour les références quand l'état change
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    activeTeamRef.current = activeTeam;
  }, [activeTeam]);

  // Mettre à jour les compteurs non-lus
  useEffect(() => {
    if (!services?.notificationService) return;

    // Gestionnaire pour les mises à jour non-lues
    const handleUnreadUpdated = () => {
      void initializeTeamsUnreadStates();
    };

    // S'abonner aux changements
    return services.notificationService.addEventListener(
      "unread_updated",
      handleUnreadUpdated,
    );
  }, [services, initializeTeamsUnreadStates]);

  // Configurer le rafraîchissement périodique si activé
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadTeams().then(() => {
        void initializeTeamsUnreadStates();
      });
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, loadTeams, initializeTeamsUnreadStates]);

  // Mémoriser la valeur du contexte pour éviter les re-renders inutiles
  const contextValue = useMemo<TeamContextType>(
    () => ({
      // État
      teams,
      activeTeam,
      isTeamsLoading,
      teamsError,
      unreadCounts,

      // Méthodes
      loadTeams,
      setActiveTeam,
      switchTeam,
      getTeamById,
      getTeamUnreadCount,
    }),
    [
      teams,
      activeTeam,
      isTeamsLoading,
      teamsError,
      unreadCounts,
      loadTeams,
      setActiveTeam,
      switchTeam,
      getTeamById,
      getTeamUnreadCount,
    ],
  );

  return (
    <TeamContext.Provider value={contextValue}>{children}</TeamContext.Provider>
  );
};
