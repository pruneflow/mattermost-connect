import { WebSocketSingleton } from '../hooks/useWebSocket';
import { userCache } from './userCache';
import { UserStatus } from './types';

// Structure pour un abonnement au statut d'un utilisateur
interface UserStatusSubscription {
  // Le statut actuel de l'utilisateur
  status: UserStatus;
  
  // Set des callbacks pour les différents composants abonnés
  listeners: Set<(status: UserStatus) => void>;
  
  // Si cet utilisateur est l'utilisateur courant (comportement spécial)
  isCurrentUser: boolean;
  
  // Si un abonnement WebSocket est déjà en place pour cet utilisateur
  subscribed: boolean;
  
  // Fonction pour se désabonner du WebSocket
  unsubscribeWs: (() => void) | null;
  
  // Nombre de références (abonnements) actifs pour cet utilisateur
  refCount: number;
}

/**
 * Service singleton pour gérer les abonnements aux statuts utilisateurs
 * Permet le partage des abonnements entre différentes parties de l'application
 * pour éviter les connexions WebSocket redondantes
 */
class UserStatusService {
  // Map des abonnements: userId -> UserStatusSubscription
  private subscriptions = new Map<string, UserStatusSubscription>();
  
  // Pour logging (éviter les logs redondants)
  private loggedUsers = new Set<string>();
  
  /**
   * S'abonner au statut d'un utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @param isCurrentUser Si cet utilisateur est l'utilisateur actuellement connecté
   * @param callback Fonction à appeler quand le statut change
   * @returns Fonction pour se désabonner
   */
  subscribe(
    userId: string, 
    isCurrentUser: boolean,
    callback: (status: UserStatus) => void
  ): () => void {
    // Obtenir ou créer un abonnement pour cet utilisateur
    let subscription = this.getOrCreateSubscription(userId, isCurrentUser);
    
    // Ajouter ce callback à la liste des listeners
    subscription.listeners.add(callback);
    
    // Fonction de désabonnement
    return () => {
      this.unsubscribe(userId, callback);
    };
  }
  
  /**
   * Se désabonner du statut d'un utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @param callback Callback à supprimer
   */
  unsubscribe(userId: string, callback: (status: UserStatus) => void): void {
    if (!this.subscriptions.has(userId)) return;
    
    const subscription = this.subscriptions.get(userId)!;
    
    // Supprimer ce callback
    subscription.listeners.delete(callback);
    
    // Décrémenter le compteur
    subscription.refCount--;
    console.log(`Removing reference to user: ${userId} (refs: ${subscription.refCount}) [SERVICE]`);
    
    // Si plus aucun abonné, nettoyer complètement
    if (subscription.listeners.size === 0 || subscription.refCount <= 0) {
      console.log(`Cleaning up user: ${userId} (no more listeners) [SERVICE]`);
      
      // Désabonner du WebSocket
      if (subscription.unsubscribeWs) {
        subscription.unsubscribeWs();
      }
      
      // Retirer l'utilisateur de la liste de surveillance si ce n'est pas l'utilisateur courant
      if (!subscription.isCurrentUser) {
        WebSocketSingleton.removeUserFromStatusWatch(userId);
      }
      
      // Supprimer l'abonnement
      this.subscriptions.delete(userId);
      this.loggedUsers.delete(userId);
    }
  }
  
  /**
   * Récupère le statut actuel d'un utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @returns Le statut actuel ou 'offline' par défaut
   */
  getStatus(userId: string): UserStatus {
    if (this.subscriptions.has(userId)) {
      return this.subscriptions.get(userId)!.status;
    }
    
    // Essayer de récupérer depuis le cache
    if (userCache.hasUserStatus(userId)) {
      return userCache.getUserStatusFromCache(userId) || 'offline';
    }
    
    return 'offline';
  }
  
  /**
   * Initialise le statut d'un utilisateur depuis une API externe
   * 
   * @param userId ID de l'utilisateur
   * @param serverUrl URL du serveur Mattermost
   * @param token Token d'authentification
   */
  async initializeUserStatus(
    userId: string, 
    serverUrl: string,
    token: string
  ): Promise<void> {
    if (!this.subscriptions.has(userId)) return;
    
    // Vérifier si l'initialisation est déjà faite
    if (WebSocketSingleton.isUserStatusInitialized(userId)) return;
    
    try {
      // Initialiser via WebSocketSingleton
      const newStatus = await WebSocketSingleton.initializeUserStatus(userId, serverUrl, token);
      
      // Mettre à jour notre propre statut
      if (newStatus) {
        this.updateStatus(userId, newStatus);
      }
    } catch (error) {
      console.error(`Failed to initialize status for user ${userId}:`, error);
    }
  }
  
  /**
   * Récupère le statut d'un utilisateur via API
   * 
   * @param userId ID de l'utilisateur
   * @param forceRefresh Forcer un rechargement
   */
  async fetchUserStatus(
    userId: string,
    forceRefresh: boolean = false
  ): Promise<void> {
    if (!this.subscriptions.has(userId)) return;
    
    try {
      // Utiliser le cache centralisé existant
      const newStatus = await userCache.getUserStatus(userId, forceRefresh);
      
      // Mettre à jour notre propre statut
      this.updateStatus(userId, newStatus);
    } catch (error) {
      console.error(`Error fetching status for user ${userId}:`, error);
    }
  }
  
  /**
   * Ajoute un utilisateur à la liste de surveillance WebSocket
   * 
   * @param userId ID de l'utilisateur
   */
  addToStatusWatch(userId: string): void {
    WebSocketSingleton.addUserToStatusWatch(userId);
    
    // Demander une mise à jour immédiate si la WebSocket est connectée
    const ws = WebSocketSingleton.getWebSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      WebSocketSingleton.requestStatusUpdates(ws);
    }
  }
  
  /**
   * Met à jour le statut d'un utilisateur et notifie tous les abonnés
   * 
   * @param userId ID de l'utilisateur
   * @param newStatus Nouveau statut
   */
  updateStatus(userId: string, newStatus: UserStatus): void {
    if (!this.subscriptions.has(userId) || !newStatus) return;
    
    const subscription = this.subscriptions.get(userId)!;
    
    // Mettre à jour le cache central
    userCache.setUserStatus(userId, newStatus);
    
    // Mettre à jour notre statut en mémoire
    subscription.status = newStatus;
    
    // Notifier tous les listeners
    subscription.listeners.forEach(callback => {
      try {
        callback(newStatus);
      } catch (error) {
        console.error(`Error notifying status listener for user ${userId}:`, error);
      }
    });
  }
  
  /**
   * Obtient ou crée un abonnement pour un utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @param isCurrentUser Si c'est l'utilisateur courant
   * @returns L'abonnement existant ou nouvellement créé
   */
  private getOrCreateSubscription(
    userId: string,
    isCurrentUser: boolean
  ): UserStatusSubscription {
    if (this.subscriptions.has(userId)) {
      // Incrémenter le compteur de références
      const subscription = this.subscriptions.get(userId)!;
      subscription.refCount++;
      
      console.log(`Adding reference to user: ${userId} (refs: ${subscription.refCount}) [SERVICE]`);
      return subscription;
    }
    
    // Initialiser avec le statut du cache si disponible
    const initialStatus = userCache.hasUserStatus(userId)
      ? userCache.getUserStatusFromCache(userId) || 'offline'
      : 'offline';
    
    // Créer un nouvel abonnement
    const subscription: UserStatusSubscription = {
      status: initialStatus,
      listeners: new Set(),
      isCurrentUser,
      subscribed: false,
      unsubscribeWs: null,
      refCount: 1
    };
    
    // Stocker l'abonnement
    this.subscriptions.set(userId, subscription);
    
    console.log(`Setting up status tracking for user: ${userId}${isCurrentUser ? ' (current user)' : ''} (refs: 1) [SERVICE]`);
    this.loggedUsers.add(userId);
    
    // Mettre en place l'abonnement WebSocket
    this.setupWebSocketSubscription(userId, subscription);
    
    return subscription;
  }
  
  /**
   * Configure l'abonnement WebSocket pour un utilisateur
   * 
   * @param userId ID de l'utilisateur
   * @param subscription Abonnement à configurer
   */
  private setupWebSocketSubscription(
    userId: string,
    subscription: UserStatusSubscription
  ): void {
    if (subscription.subscribed) return;
    
    // S'abonner aux changements pour cet utilisateur spécifique via WebSocketSingleton
    const unsubscribe = WebSocketSingleton.subscribeToUserStatus(userId, () => {
      // Quand le statut change, récupérer depuis le singleton de WebSocket
      const newStatus = WebSocketSingleton.getUserStatus(userId);
      this.updateStatus(userId, newStatus);
    });
    
    // Stocker la fonction de désabonnement
    subscription.unsubscribeWs = unsubscribe;
    subscription.subscribed = true;
    
    // Ajouter à la liste de surveillance (sauf pour l'utilisateur courant)
    if (!subscription.isCurrentUser) {
      this.addToStatusWatch(userId);
    }
  }
}

// Exporter l'instance singleton
export const userStatusService = new UserStatusService();