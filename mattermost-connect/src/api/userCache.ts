/**
 * Service centralisé pour gérer le cache des utilisateurs et la déduplication des requêtes
 * Système ultra-simple avec une garantie forte: 1 userId = 1 seul appel API
 */

import { User, UserStatus, UserStatusObject } from './types';
import { api, ApiError } from './client';

/**
 * Classe qui implémente un cache d'utilisateurs et une déduplication des requêtes
 * Inspiré du système utilisé pour les fichiers, mais appliqué aux utilisateurs
 */
class UserCacheService {
  // Caches des utilisateurs et de leurs statuts
  private userCache: Map<string, User> = new Map();
  private userStatusCache: Map<string, UserStatus> = new Map();
  
  // Requêtes en cours pour la déduplication
  private pendingUserRequests: Map<string, Promise<User | null>> = new Map();
  private pendingStatusRequests: Map<string, Promise<UserStatus>> = new Map();
  
  // Singleton
  private static instance: UserCacheService;
  
  private constructor() {
    // Initialisation des propriétés globales
    // Utiliser window pour la persistance entre les rendus React
    if (typeof window !== 'undefined') {
      if (!(window as any).__mattermostUserCache) {
        (window as any).__mattermostUserCache = {
          users: new Map<string, User>(),
          statuses: new Map<string, UserStatus>(),
          pendingUsers: new Map<string, Promise<User | null>>(),
          pendingStatuses: new Map<string, Promise<UserStatus>>()
        };
      }
      
      // Utiliser les maps existantes pour éviter de perdre des données
      const globalCache = (window as any).__mattermostUserCache;
      this.userCache = globalCache.users;
      this.userStatusCache = globalCache.statuses;
      this.pendingUserRequests = globalCache.pendingUsers;
      this.pendingStatusRequests = globalCache.pendingStatuses;
    }
    
    // Initialiser depuis le localStorage au démarrage
    this.initFromLocalStorage();
  }
  
  /**
   * Récupère l'instance singleton
   */
  public static getInstance(): UserCacheService {
    if (!UserCacheService.instance) {
      UserCacheService.instance = new UserCacheService();
    }
    return UserCacheService.instance;
  }
  
  /**
   * Initialise le cache à partir du localStorage
   */
  private initFromLocalStorage(): void {
    try {
      const cachedUsersStr = localStorage.getItem('mattermost_cached_users');
      if (cachedUsersStr) {
        const cachedUsers = JSON.parse(cachedUsersStr);
        // Peupler le cache en mémoire
        Object.entries(cachedUsers).forEach(([userId, user]) => {
          this.userCache.set(userId, user as User);
          if ((user as any).status) {
            this.userStatusCache.set(userId, (user as any).status);
          }
        });
      }
    } catch (error) {
      console.error('Error initializing from localStorage:', error);
    }
  }
  
  /**
   * Sauvegarde les données utilisateur dans le localStorage
   */
  private saveToLocalStorage(): void {
    try {
      // Récupérer ce qui existe déjà
      const cachedUsersStr = localStorage.getItem('mattermost_cached_users') || '{}';
      const cachedUsers = JSON.parse(cachedUsersStr);
      
      // Mettre à jour avec les nouvelles données
      this.userCache.forEach((user, userId) => {
        cachedUsers[userId] = user;
        // Ajouter le statut si disponible
        if (this.userStatusCache.has(userId)) {
          cachedUsers[userId].status = this.userStatusCache.get(userId);
        }
      });
      
      // Sauvegarder
      localStorage.setItem('mattermost_cached_users', JSON.stringify(cachedUsers));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  /**
   * Récupère les informations d'un utilisateur depuis l'API
   * avec déduplication forte pour éviter les appels multiples
   * @param forceRefresh forcer un rafraîchissement depuis l'API même si en cache
   * @returns User ou null si l'utilisateur n'est pas trouvé ou en cas d'erreur
   */
  public async getUserInfo(userId: string, forceRefresh: boolean = false): Promise<User | null> {
    // 1. Vérifier d'abord le cache en mémoire (sauf si forceRefresh)
    if (!forceRefresh && this.hasUser(userId)) {
      console.log(`Using cached user data for: ${userId}`);
      return this.getUser(userId)!;
    }
    
    // 2. Vérifier si une requête est déjà en cours
    if (this.pendingUserRequests.has(userId)) {
      console.log(`Reusing pending request for user: ${userId}`);
      // Réutiliser la requête existante
      return this.pendingUserRequests.get(userId)!;
    }
    
    // 3. Créer une nouvelle requête API
    console.log(`Making API call for user: ${userId}`);
    const fetchPromise = this.fetchUserInfo(userId);
    
    // 4. Stocker dans les requêtes en cours pour déduplication
    this.pendingUserRequests.set(userId, fetchPromise);
    
    try {
      return await fetchPromise;
    } finally {
      // Nettoyage: supprimer des requêtes en cours une fois terminée
      this.pendingUserRequests.delete(userId);
    }
  }
  
  /**
   * Récupère le statut d'un utilisateur depuis l'API
   * avec déduplication forte
   * @param forceRefresh forcer un rafraîchissement depuis l'API même si en cache
   * @returns UserStatus ou 'offline' par défaut en cas d'erreur
   */
  public async getUserStatus(userId: string, forceRefresh: boolean = false): Promise<UserStatus> {
    // 1. Vérifier d'abord le cache (sauf si forceRefresh)
    if (!forceRefresh && this.hasUserStatus(userId)) {
      console.log(`Using cached status for user: ${userId}`);
      return this.getUserStatusFromCache(userId)!;
    }
    
    // 2. Vérifier si une requête est déjà en cours
    if (this.pendingStatusRequests.has(userId)) {
      console.log(`Reusing pending request for user status: ${userId}`);
      // Réutiliser la requête existante
      return this.pendingStatusRequests.get(userId)!;
    }
    
    // 3. Créer une nouvelle requête API
    console.log(`Making API call for user status: ${userId}`);
    const fetchPromise = this.fetchUserStatus(userId);
    
    // 4. Stocker dans les requêtes en cours pour déduplication
    this.pendingStatusRequests.set(userId, fetchPromise);
    
    try {
      return await fetchPromise;
    } finally {
      // Nettoyage
      this.pendingStatusRequests.delete(userId);
    }
  }
  
  /**
   * Vérifie si un utilisateur est dans le cache
   */
  public hasUser(userId: string): boolean {
    return this.userCache.has(userId);
  }
  
  /**
   * Récupère un utilisateur depuis le cache
   */
  public getUser(userId: string): User | null {
    return this.userCache.get(userId) || null;
  }
  
  /**
   * Vérifie si un statut d'utilisateur est dans le cache
   */
  public hasUserStatus(userId: string): boolean {
    return this.userStatusCache.has(userId);
  }
  
  /**
   * Récupère un statut d'utilisateur depuis le cache
   */
  public getUserStatusFromCache(userId: string): UserStatus | null {
    return this.userStatusCache.get(userId) || null;
  }
  
  /**
   * Met à jour un utilisateur dans le cache
   */
  public setUser(userId: string, user: User): void {
    this.userCache.set(userId, user);
    this.saveToLocalStorage();
  }
  
  /**
   * Met à jour un statut d'utilisateur dans le cache
   */
  public setUserStatus(userId: string, status: UserStatus): void {
    this.userStatusCache.set(userId, status);
    this.saveToLocalStorage();
  }
  
  /**
   * Fait l'appel API pour récupérer les informations d'un utilisateur
   * @returns User ou null si l'utilisateur n'est pas trouvé ou en cas d'erreur
   */
  private async fetchUserInfo(userId: string): Promise<User | null> {
    try {
      const response = await api.get<User>(`users/${userId}`);
      const user = response.data;
      
      // Mettre en cache pour une utilisation future
      this.setUser(userId, user);
      
      return user;
    } catch (error: unknown) {
      // Si l'utilisateur n'existe pas (404) ou autre erreur, retourner null
      if (error instanceof ApiError) {
        if (error.status === 404) {
          console.warn(`User ${userId} not found, returning null`);
        } else {
          console.error(`Error fetching user ${userId}:`, error);
        }
      } else {
        console.error(`Unexpected error fetching user ${userId}:`, error);
      }
      
      // Ne pas propager l'erreur, simplement retourner null
      return null;
    }
  }
  
  /**
   * Fait l'appel API pour récupérer le statut d'un utilisateur
   * @returns UserStatus ou 'offline' par défaut en cas d'erreur
   */
  private async fetchUserStatus(userId: string): Promise<UserStatus> {
    try {
      const response = await api.get<UserStatusObject>(`users/${userId}/status`);
      const status = response.data.status;
      
      // Mettre en cache pour une utilisation future
      this.setUserStatus(userId, status);
      
      return status;
    } catch (error: unknown) {
      // Si l'utilisateur n'existe pas ou autre erreur, retourner 'offline' par défaut
      if (error instanceof ApiError) {
        if (error.status === 404) {
          console.warn(`Status for user ${userId} not found, returning 'offline'`);
        } else {
          console.error(`Error fetching status for user ${userId}:`, error);
        }
      } else {
        console.error(`Unexpected error fetching status for user ${userId}:`, error);
      }
      
      // Par défaut, un utilisateur est considéré comme hors ligne
      return 'offline' as UserStatus;
    }
  }
  
  /**
   * Invalide un utilisateur dans le cache (quand on sait qu'il a changé)
   */
  public invalidateUser(userId: string): void {
    this.userCache.delete(userId);
  }
  
  /**
   * Invalide un statut d'utilisateur dans le cache
   */
  public invalidateUserStatus(userId: string): void {
    this.userStatusCache.delete(userId);
  }
  
  /**
   * Nettoie le cache entier
   */
  public clearCache(): void {
    this.userCache.clear();
    this.userStatusCache.clear();
  }
}

// Exporter l'instance singleton
export const userCache = UserCacheService.getInstance();

/**
 * Hook simplifié pour récupérer les données d'un utilisateur
 * avec déduplication forte
 * @returns User ou null si l'utilisateur n'est pas trouvé ou en cas d'erreur
 */
export async function getUserWithCache(userId: string): Promise<User | null> {
  return userCache.getUserInfo(userId);
}

/**
 * Hook simplifié pour récupérer le statut d'un utilisateur
 * avec déduplication forte
 */
export async function getUserStatusWithCache(userId: string): Promise<UserStatus> {
  return userCache.getUserStatus(userId);
}