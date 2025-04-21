// src/services/user/user.service.ts (Fixed)
import { User, Channel, UserStatus } from "../../types";
import { MattermostService } from "../base";
import { formatUserDisplayName } from "../../utils";
import { ErrorHandlerInterface } from "../error/error-handler";

/**
 * Interface pour le service utilisateur
 * Ce service spécialisé gère la récupération et la mise en cache des utilisateurs
 */
export interface UserServiceInterface {
  /**
   * Définit l'ID de l'utilisateur courant
   * @param userId ID de l'utilisateur courant ou null
   */
  setCurrentUserId(userId: string | null): void;

  /**
   * Ajoute manuellement un utilisateur au cache
   * @param user Utilisateur à ajouter
   */
  addUser(user: User): void;

  /**
   * Récupère un utilisateur par son ID, le charge depuis l'API si nécessaire
   * @param userId ID de l'utilisateur à récupérer
   * @returns L'utilisateur ou null si introuvable
   */
  getUser(userId: string): Promise<User | null>;

  /**
   * Récupère plusieurs utilisateurs à la fois
   * @param userIds Liste des IDs d'utilisateurs à récupérer
   * @returns Liste des utilisateurs trouvés
   */
  getUsers(options?: any): Promise<User[]>;

  /**
   * Récupère le statut d'un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Statut de l'utilisateur
   */
  getUserStatus(userId: string): Promise<UserStatus>;

  /**
   * Récupère le nom d'affichage formaté d'un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Nom d'affichage formaté
   */
  getUserDisplayName(userId: string): string;

  /**
   * Charge les utilisateurs impliqués dans des canaux de messages directs
   * @param channels Liste des canaux à analyser
   * @param force Forcer le rechargement même si déjà en cours
   */
  loadUsersForDirectChannels(channels: Channel[]): Promise<void>;

  /**
   * Charge tous les utilisateurs impliqués dans des canaux de messages directs
   * @param channels Liste des canaux à analyser
   * @param force Forcer le rechargement même si déjà en cours
   */
  loadDirectMessageUsers(channels: Channel[], force?: boolean): Promise<void>;

  /**
   * Charge les utilisateurs d'une équipe
   * @param teamId ID de l'équipe
   */
  loadTeamUsers(teamId: string): Promise<void>;

  /**
   * Récupère tous les utilisateurs connus du cache
   * @returns Dictionnaire des utilisateurs connus
   */
  getAllUsers(): Record<string, User>;

  /**
   * Vérifie si un utilisateur est connu dans le cache
   * @param userId ID de l'utilisateur à vérifier
   * @returns true si l'utilisateur est dans le cache
   */
  hasUser(userId: string): boolean;

  /**
   * Vérifie si un utilisateur est en cours de chargement
   * @param userId ID de l'utilisateur à vérifier
   * @returns true si l'utilisateur est en cours de chargement
   */
  isUserLoading(userId: string): boolean;
}

/**
 * Implémentation du service utilisateur
 * Gère la récupération et la mise en cache efficace des informations utilisateurs
 */
export class UserService implements UserServiceInterface {
  private knownUsers: Record<string, User> = {};
  private pendingRequests: Record<string, Promise<User | null>> = {};
  private readonly service: MattermostService;
  private readonly errorHandler?: ErrorHandlerInterface;
  private currentUserId: string | null = null;
  private isLoading = false;
  private lastLoadTime = 0;
  private loadCooldown = 2000; // 2 secondes minimum entre les chargements
  private pendingBatchTimeout: NodeJS.Timeout | null = null;
  private pendingUserIds: Set<string> = new Set();

  /**
   * Crée une nouvelle instance du service utilisateur
   * @param service Service Mattermost pour les appels API
   * @param errorHandler Gestionnaire d'erreurs optionnel
   */
  constructor(
    service: MattermostService,
    errorHandler?: ErrorHandlerInterface,
  ) {
    this.service = service;
    this.errorHandler = errorHandler;
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
   * @returns Liste des utilisateurs trouvés
   * @param options
   */
  async getUsers(options: any = {}): Promise<User[]> {
    try {
      const userIds = options.ids || [];

      if (userIds.length === 0 && !options.inChannel && !options.inTeam) {
        // Si aucun critère de sélection n'est fourni, retourner tous les utilisateurs connus
        return Object.values(this.knownUsers);
      }

      // Filtrer les IDs déjà présents dans le cache
      const cachedUsers = userIds
        .filter((id: string) => this.knownUsers[id])
        .map((id: string) => this.knownUsers[id]);

      // Filtrer les IDs qui ne sont pas dans le cache et pas déjà en cours de chargement
      const idsToFetch = userIds.filter(
        (id: string) => !this.knownUsers[id] && !this.pendingRequests[id],
      );

      if (idsToFetch.length === 0 && !options.inChannel && !options.inTeam) {
        // Si tous les utilisateurs sont dans le cache ou en cours de chargement
        return cachedUsers;
      }

      // Construire les options pour l'appel API
      const apiOptions: any = {};
      if (options.inChannel) apiOptions.inChannel = options.inChannel;
      if (options.inTeam) apiOptions.inTeam = options.inTeam;
      if (options.page) apiOptions.page = options.page;
      if (options.perPage) apiOptions.perPage = options.perPage;

      // Si des IDs spécifiques sont à charger, les ajouter
      if (idsToFetch.length > 0) {
        apiOptions.ids = idsToFetch;
      }

      // Charger les utilisateurs manquants
      const users = await this.service.getUsers(apiOptions);

      // Ajouter les nouveaux utilisateurs au cache
      users.forEach((user) => {
        this.knownUsers[user.id] = user;
      });

      // Retourner tous les utilisateurs (ceux du cache + ceux nouvellement chargés)
      // Si c'était une requête par ID, retourner uniquement les utilisateurs demandés
      if (userIds.length > 0) {
        return [
          ...cachedUsers,
          ...users.filter(
            (user) =>
              !cachedUsers.some((cached: User) => cached.id === user.id),
          ),
        ];
      }

      // Sinon retourner tous les utilisateurs chargés
      return users;
    } catch (error) {
      const typedError = this.errorHandler
        ? this.errorHandler.handleHttpError(error)
        : error instanceof Error
          ? error
          : new Error(String(error));

      console.error("Erreur lors du chargement des utilisateurs:", typedError);
      throw typedError;
    }
  }

  /**
   * Récupère le statut d'un utilisateur
   * @param userId ID de l'utilisateur
   * @returns Statut de l'utilisateur
   */
  async getUserStatus(userId: string): Promise<UserStatus> {
    if (!userId || !this.service) {
      throw new Error("userId et service sont requis pour obtenir le statut");
    }

    try {
      // Utilise directement le service Mattermost sous-jacent
      // car cette opération n'est pas mise en cache
      return await this.service.getUserStatus(userId);
    } catch (error) {
      const typedError = this.errorHandler
        ? this.errorHandler.handleHttpError(error)
        : error instanceof Error
          ? error
          : new Error(String(error));

      console.error(
        `Erreur lors de la récupération du statut pour l'utilisateur ${userId}:`,
        typedError,
      );
      throw typedError;
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
  public getUserDisplayName(userId: string): string {
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
   * Charge les utilisateurs impliqués dans les canaux de messages directs
   * @param channels Liste des canaux à analyser
   */
  public async loadUsersForDirectChannels(channels: Channel[]): Promise<void> {
    if (!channels || channels.length === 0 || !this.currentUserId) return;

    try {
      // Extraire tous les IDs utilisateurs uniques des canaux directs
      const userIds = new Set<string>();

      channels.forEach((channel) => {
        if ((channel.type === "D" || channel.type === "G") && channel.name) {
          const parts = channel.name.split("__");
          parts.forEach((part) => {
            if (part !== this.currentUserId) {
              userIds.add(part);
            }
          });
        }
      });

      // Filtrer les utilisateurs déjà connus
      const idsToFetch = Array.from(userIds).filter(
        (id) => !this.knownUsers[id],
      );

      if (idsToFetch.length === 0) return;

      // Charger tous les utilisateurs en une seule requête
      console.debug(
        `Chargement groupé de ${idsToFetch.length} utilisateurs pour canaux DM`,
      );
      await this.getUsers({ ids: idsToFetch });
    } catch (error) {
      console.error(
        "Erreur lors du chargement des utilisateurs pour les canaux directs:",
        error,
      );
    }
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
      await this.getUsers({ ids: usersToFetch });
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
 * @param errorHandler Gestionnaire d'erreurs optionnel
 * @returns Une instance du service utilisateur
 */
export function createUserService(
  service: MattermostService,
  errorHandler?: ErrorHandlerInterface,
): UserServiceInterface {
  return new UserService(service, errorHandler);
}

export default {
  UserService,
  createUserService,
};
