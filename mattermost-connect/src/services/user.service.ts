// src/services/user.service.ts
import { User, Channel, MattermostService } from "../types";
import { formatUserDisplayName } from "../utils";

/**
 * Service centralisé pour la gestion des utilisateurs
 * Évite les appels multiples et réduit les dépendances dans les composants
 */
export class UserService {
  private knownUsers: Record<string, User> = {};
  private pendingRequests: Record<string, Promise<User | null>> = {};
  private service: MattermostService;
  private currentUserId: string | null = null;
  private isLoading = false;
  private lastLoadTime = 0;
  private loadCooldown = 2000; // 2 secondes minimum entre les chargements
  private pendingBatchTimeout: NodeJS.Timeout | null = null;
  private pendingUserIds: Set<string> = new Set();

  /**
   * Crée une nouvelle instance du service utilisateur
   * @param service Service Mattermost pour les appels API
   */
  constructor(service: MattermostService) {
    this.service = service;
  }

  /**
   * Définit l'ID de l'utilisateur courant
   * @param userId ID de l'utilisateur courant
   */
  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  /**
   * Ajoute un utilisateur au cache
   * @param user Utilisateur à ajouter
   */
  addUser(user: User) {
    if (!user || !user.id) return;
    this.knownUsers[user.id] = user;
  }

  /**
   * Récupère un utilisateur par son ID, le charge depuis l'API si nécessaire
   * @param userId ID de l'utilisateur à récupérer
   * @returns L'utilisateur ou null si introuvable
   */
  async getUser(userId: string): Promise<User | null> {
    if (!userId || !this.service) return null;

    // Si l'utilisateur est déjà dans le cache, le retourner immédiatement
    if (this.knownUsers[userId]) {
      return this.knownUsers[userId];
    }

    // Si une requête est déjà en cours pour cet utilisateur, retourner sa promesse
    if (userId in this.pendingRequests) {
      return this.pendingRequests[userId];
    }

    this.pendingUserIds.add(userId);

    // Créer une nouvelle promesse pour cette requête
    const request = this.fetchUser(userId);
    this.pendingRequests[userId] = request;

    return request;
  }

  /**
   * Récupère plusieurs utilisateurs à la fois
   * @param userIds Liste des IDs d'utilisateurs à récupérer
   * @returns Liste des utilisateurs trouvés
   */
  async getUsers(userIds: string[]): Promise<User[]> {
    if (!userIds || !userIds.length || !this.service) return [];

    // Filtrer les IDs déjà présents dans le cache
    const cachedUsers = userIds
      .filter((id) => this.knownUsers[id])
      .map((id) => this.knownUsers[id]);

    // Filtrer les IDs qui ne sont pas dans le cache et pas déjà en cours de chargement
    const idsToFetch = userIds.filter(
      (id) => !this.knownUsers[id] && !this.pendingRequests[id],
    );

    if (idsToFetch.length === 0) {
      // Si tous les utilisateurs sont dans le cache ou en cours de chargement
      return cachedUsers;
    }

    try {
      // Charger les utilisateurs manquants
      const users = await this.service.getUsers({ ids: idsToFetch });

      // Ajouter les nouveaux utilisateurs au cache
      users.forEach((user) => {
        this.knownUsers[user.id] = user;
      });

      // Retourner tous les utilisateurs (ceux du cache + ceux nouvellement chargés)
      return [...cachedUsers, ...users];
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      return cachedUsers;
    }
  }

  /**
   * Charge les informations d'un utilisateur depuis l'API
   * @param userId ID de l'utilisateur à charger
   * @returns L'utilisateur ou null si l'appel a échoué
   */
  private async fetchUser(userId: string): Promise<User | null> {
    try {
      const users = await this.service.getUsers({ ids: [userId] });

      if (users && users.length > 0) {
        const user = users[0];
        this.knownUsers[userId] = user;
        return user;
      }
    } catch (error) {
      console.error(
        `Erreur lors du chargement de l'utilisateur ${userId}:`,
        error,
      );
    } finally {
      // Supprimer cette requête des requêtes en cours
      delete this.pendingRequests[userId];
    }
    return null;
  }

  /**
   * Récupère le nom d'affichage formaté d'un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Nom d'affichage formaté, ou texte de chargement si l'utilisateur n'est pas encore chargé
   */
  getUserDisplayName(userId: string): string {
    if (!userId) return "Utilisateur inconnu";

    const user = this.knownUsers[userId];
    if (!user) {
      // Charger l'utilisateur en arrière-plan mais retourner un état temporaire
      void this.getUser(userId);
      return "Chargement...";
    }

    return formatUserDisplayName(user);
  }

  /**
   * Charge tous les utilisateurs impliqués dans des canaux de messages directs
   * @param channels Liste des canaux à analyser
   * @param force Forcer le rechargement même si déjà en cours
   * @returns Promesse résolue lorsque le chargement est terminé
   */
  async loadDirectMessageUsers(
    channels: Channel[],
    force = false,
  ): Promise<void> {
    // Protection contre les appels trop fréquents
    const now = Date.now();
    if (
      !force &&
      (this.isLoading || now - this.lastLoadTime < this.loadCooldown)
    ) {
      return;
    }

    this.isLoading = true;
    this.lastLoadTime = now;

    try {
      // Filtrer les canaux de type direct (D) ou groupe (G)
      const directChannels = channels.filter(
        (c) => c.type === "D" || c.type === "G",
      );

      if (directChannels.length === 0) return;

      // Collecter tous les IDs utilisateurs depuis les noms des canaux
      const userIds: Set<string> = new Set();

      directChannels.forEach((channel) => {
        if (channel.name && channel.name.includes("__")) {
          const parts = channel.name.split("__");
          parts.forEach((part) => {
            if (part !== this.currentUserId) {
              userIds.add(part);
            }
          });
        }
      });

      // Filtrer les utilisateurs déjà connus ou en cours de chargement
      const usersToFetch = Array.from(userIds).filter(
        (id) => !this.knownUsers[id] && !this.pendingRequests[id],
      );

      if (usersToFetch.length === 0) return;

      // Charger les utilisateurs en batch
      const users = await this.service.getUsers({ ids: usersToFetch });

      // Ajouter les utilisateurs au cache
      users.forEach((user) => {
        this.knownUsers[user.id] = user;
      });
    } catch (error) {
      console.error(
        "Erreur lors du chargement des utilisateurs pour les DMs:",
        error,
      );
    } finally {
      setTimeout(() => {
        this.isLoading = false;
      }, 500);
    }
  }

  /**
   * Charge les utilisateurs d'une équipe
   * @param teamId ID de l'équipe
   * @returns Promesse résolue lorsque le chargement est terminé
   */
  async loadTeamUsers(teamId: string): Promise<void> {
    if (!teamId || !this.service) return;

    // Protection contre les appels trop fréquents
    const now = Date.now();
    if (this.isLoading || now - this.lastLoadTime < this.loadCooldown) {
      return;
    }

    this.isLoading = true;
    this.lastLoadTime = now;

    try {
      const users = await this.service.getUsers({
        inTeam: teamId,
        perPage: 200, // Une limite plus grande pour récupérer plus d'utilisateurs
      });

      // Ajouter les utilisateurs au cache
      users.forEach((user) => {
        this.knownUsers[user.id] = user;
      });
    } catch (error) {
      console.error(
        "Erreur lors du chargement des utilisateurs de l'équipe:",
        error,
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Récupère tous les utilisateurs connus
   * @returns Dictionnaire des utilisateurs connus
   */
  getAllUsers(): Record<string, User> {
    return { ...this.knownUsers };
  }

  /**
   * Vérifie si un utilisateur est connu
   * @param userId ID de l'utilisateur à vérifier
   * @returns true si l'utilisateur est dans le cache
   */
  hasUser(userId: string): boolean {
    return !!this.knownUsers[userId];
  }

  /**
   * Vérifie si un utilisateur est en cours de chargement
   * @param userId ID de l'utilisateur à vérifier
   * @returns true si l'utilisateur est en cours de chargement
   */
  isUserLoading(userId: string): boolean {
    return !!this.pendingRequests[userId];
  }
}

/**
 * Crée un service utilisateur
 * @param service Service Mattermost pour les appels API
 * @returns Une instance du service utilisateur
 */
export function createUserService(service: MattermostService): UserService {
  return new UserService(service);
}

export default UserService;
