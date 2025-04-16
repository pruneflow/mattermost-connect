// src/services/notification.service.ts
import { Message, Channel, User } from "../types";

/**
 * Types d'événements WebSocket de Mattermost
 * Cette liste n'est pas exhaustive et peut être étendue selon les besoins
 */
export enum WebSocketEventType {
  // Messages
  POSTED = "posted",
  POST_EDITED = "post_edited",
  POST_DELETED = "post_deleted",

  // Statuts
  STATUS_CHANGE = "status_change",
  TYPING = "typing",

  // Canaux
  CHANNEL_VIEWED = "channel_viewed",
  CHANNEL_CREATED = "channel_created",
  CHANNEL_UPDATED = "channel_updated",
  CHANNEL_DELETED = "channel_deleted",

  // Réactions
  REACTION_ADDED = "reaction_added",
  REACTION_REMOVED = "reaction_removed",

  // Autres
  HELLO = "hello",
  USER_UPDATED = "user_updated",
  PREFERENCE_CHANGED = "preference_changed",
  EPHEMERAL_MESSAGE = "ephemeral_message",
  WEBSOCKET_CLOSED = "websocket_closed",
}

/**
 * Format d'événement WebSocket de Mattermost
 */
export interface WebSocketEvent {
  event: WebSocketEventType;
  data: any;
  broadcast?: {
    omit_users?: Record<string, boolean>;
    user_id?: string;
    channel_id?: string;
    team_id?: string;
  };
  seq?: number;
}

/**
 * Format d'une notification à afficher à l'utilisateur
 */
export interface Notification {
  id: string;
  type: "message" | "reaction" | "mention" | "system" | "error";
  title: string;
  content: string;
  channelId?: string;
  messageId?: string;
  sender?: User;
  timestamp: number;
  read: boolean;
  priority: "low" | "medium" | "high";
}

/**
 * État des non-lus par canal
 */
export interface UnreadState {
  [channelId: string]: {
    msg_count: number;
    mention_count: number;
    lastMessageId?: string;
    lastViewedAt?: number;
  };
}

/**
 * Gestionnaire de notifications et événements temps réel
 * Cette classe centralise la logique de notification et mise à jour de l'UI
 */
export class NotificationService {
  private listeners: Record<string, ((data: any) => void)[]> = {};
  private notifications: Notification[] = [];
  private unreadState: UnreadState = {};
  private typingUsers: Record<string, { [userId: string]: number }> = {}; // Utilisateurs en train de taper par canal
  private typingTimeouts: Record<string, { [userId: string]: NodeJS.Timeout }> =
    {}; // Timeouts pour effacer l'état de frappe
  private currentChannelId: string | null = null;
  private currentUserId: string | null = null;
  /**
   * Cache pour les derniers messages traités, pour éviter les doublons
   * Clé: ID du message, Valeur: timestamp de traitement
   */
  private processedEvents: Map<string, number> = new Map();

  /**
   * Durée (en ms) pendant laquelle un événement est conservé dans le cache des doublons
   */
  private static readonly EVENT_CACHE_DURATION = 10000; // 10 secondes

  constructor() {
    // Initialiser les catégories d'événements
    Object.values(WebSocketEventType).forEach((eventType) => {
      this.listeners[eventType] = [];
    });

    this.listeners["notification_added"] = [];
    this.listeners["notifications_updated"] = [];
    this.listeners["unread_updated"] = [];
    this.listeners["typing_updated"] = [];
  }

  /**
   * Nettoie le cache des événements traités (pour éviter une croissance infinie)
   */
  private cleanEventCache() {
    const now = Date.now();
    const expireTime = now - NotificationService.EVENT_CACHE_DURATION;

    // Supprimer les entrées plus anciennes que EVENT_CACHE_DURATION
    this.processedEvents.forEach((timestamp, eventId) => {
      if (timestamp < expireTime) {
        this.processedEvents.delete(eventId);
      }
    });
  }

  /**
   * Définir l'ID du canal actuel (celui que l'utilisateur est en train de visualiser)
   */
  setCurrentChannelId(channelId: string | null) {
    this.currentChannelId = channelId;

    // Réinitialiser les non-lus du canal actif
    if (channelId && this.unreadState[channelId]) {
      this.unreadState[channelId] = {
        ...this.unreadState[channelId],
        msg_count: 0,
        mention_count: 0,
        lastViewedAt: Date.now(),
      };

      this.notifyListeners("unread_updated", this.unreadState);
    }
  }

  /**
   * Définir l'ID de l'utilisateur actuel
   */
  setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  /**
   * Ajouter un écouteur pour un type d'événement spécifique
   */
  addEventListener(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Notifier tous les écouteurs pour un événement spécifique
   */
  private notifyListeners(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        try {
          console.debug("callback for event", event);
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Traiter un événement WebSocket reçu du serveur Mattermost
   */
  processWebSocketEvent(event: WebSocketEvent) {
    if (!event.event) {
      console.warn("Received WebSocket message without event type:", event);
      return;
    }

    // Générer un identifiant unique pour cet événement
    // Pour les messages, utiliser l'ID du message
    // Pour les autres événements, combiner le type et le timestamp
    let eventId: string;

    if (event.event === WebSocketEventType.POSTED && event.data?.post) {
      try {
        // Pour les messages, utiliser l'ID du message
        const post = JSON.parse(event.data.post);
        eventId = `${event.event}_${post.id}`;
      } catch (err) {
        // En cas d'erreur, utiliser une combinaison du type et du timestamp
        eventId = `${event.event}_${Date.now()}`;
      }
    } else {
      // Pour les autres événements, utiliser une combinaison du type et du sequence (s'il existe)
      eventId = `${event.event}_${event.seq || Date.now()}`;
    }

    // Vérifier si cet événement a déjà été traité récemment
    if (this.processedEvents.has(eventId)) {
      console.debug(`Ignoring duplicate event: ${eventId}`);
      return;
    }

    // Marquer cet événement comme traité
    this.processedEvents.set(eventId, Date.now());

    // Nettoyer périodiquement le cache des événements
    // Ne nettoyer que si le cache devient trop grand ou périodiquement
    if (this.processedEvents.size > 100 || Math.random() < 0.1) {
      this.cleanEventCache();
    }

    console.debug(`WebSocket event processed: ${event.event}`, event);

    // Notifier les écouteurs spécifiques à ce type d'événement
    this.notifyListeners(event.event, event.data);

    // Traiter selon le type d'événement
    switch (event.event) {
      case WebSocketEventType.POSTED:
        this.handleNewPost(event.data);
        break;

      case WebSocketEventType.POST_EDITED:
        this.handlePostEdited(event.data);
        break;

      case WebSocketEventType.POST_DELETED:
        this.handlePostDeleted(event.data);
        break;

      case WebSocketEventType.TYPING:
        this.handleTyping(event);
        break;

      case WebSocketEventType.REACTION_ADDED:
      case WebSocketEventType.REACTION_REMOVED:
        this.handleReactionChange(
          event.data,
          event.event === WebSocketEventType.REACTION_ADDED,
        );
        break;

      case WebSocketEventType.CHANNEL_VIEWED:
        this.handleChannelViewed(event.data);
        break;

      // Ajouter d'autres gestionnaires d'événements selon les besoins
    }
  }

  /**
   * Gérer un nouveau message
   */
  private handleNewPost(data: any) {
    try {
      const post = JSON.parse(data.post);
      console.debug("new post", post);
      const isFromCurrentUser = post.user_id === this.currentUserId;
      console.debug("isFromCurrentUser", isFromCurrentUser);
      // Vérifier si le message est dans le canal actif
      const isInCurrentChannel = post.channel_id === this.currentChannelId;
      console.debug("isInCurrentChannel", isInCurrentChannel);
      // Ne pas notifier pour les messages de l'utilisateur actuel
      if (isFromCurrentUser || isInCurrentChannel) {
        return;
      }

      // Incrémenter les compteurs non lus pour le canal
      if (!isInCurrentChannel) {
        // Initialiser si c'est le premier message non lu dans ce canal
        if (!this.unreadState[post.channel_id]) {
          this.unreadState[post.channel_id] = {
            msg_count: 0,
            mention_count: 0,
          };
        }

        // Mettre à jour les compteurs
        this.unreadState[post.channel_id].msg_count++;
        this.unreadState[post.channel_id].lastMessageId = post.id;

        // Vérifier si le message mentionne l'utilisateur actuel
        const hasMention =
          post.props?.mentions &&
          Array.isArray(post.props.mentions) &&
          post.props.mentions.includes(this.currentUserId);

        if (hasMention) {
          this.unreadState[post.channel_id].mention_count++;
        }

        // Notifier les écouteurs que les non-lus ont changé
        this.notifyListeners("unread_updated", this.unreadState);

        // Créer une notification pour l'utilisateur
        const notification: Notification = {
          id: `msg_${post.id}`,
          type: hasMention ? "mention" : "message",
          title: data.sender_name || "New message",
          content:
            post.message.substring(0, 100) +
            (post.message.length > 100 ? "..." : ""),
          channelId: post.channel_id,
          messageId: post.id,
          timestamp: post.create_at,
          read: false,
          priority: hasMention ? "high" : "medium",
        };

        this.notifications.push(notification);
        this.notifyListeners("notification_added", notification);
      }
    } catch (error) {
      console.error("Error handling new post:", error);
    }
  }

  /**
   * Gérer un message modifié
   */
  private handlePostEdited(data: any) {
    try {
      const post = JSON.parse(data.post);
      // Notifier que le message a été modifié pour mise à jour de l'UI
      this.notifyListeners(WebSocketEventType.POST_EDITED, post);
    } catch (error) {
      console.error("Error handling edited post:", error);
    }
  }

  /**
   * Gérer un message supprimé
   */
  private handlePostDeleted(data: any) {
    try {
      const post = JSON.parse(data.post);
      // Notifier que le message a été supprimé pour mise à jour de l'UI
      this.notifyListeners(WebSocketEventType.POST_DELETED, post);
    } catch (error) {
      console.error("Error handling deleted post:", error);
    }
  }

  /**
   * Gérer les événements de saisie
   */
  private handleTyping(event: any) {
    const { data, broadcast } = event;
    try {
      const { user_id } = data;
      const { channel_id, omit_users } = broadcast;

      // Ignorer les événements de frappe de l'utilisateur actuel
      if (user_id === this.currentUserId) {
        return;
      }

      if (omit_users && this.currentUserId && omit_users[this.currentUserId]) {
        return;
      }

      // Initialiser l'objet des utilisateurs en train de taper pour ce canal si nécessaire
      if (!this.typingUsers[channel_id]) {
        this.typingUsers[channel_id] = {};
      }

      // Initialiser l'objet des timeouts pour ce canal si nécessaire
      if (!this.typingTimeouts[channel_id]) {
        this.typingTimeouts[channel_id] = {};
      }

      // Effacer le timeout existant si présent
      if (this.typingTimeouts[channel_id][user_id]) {
        clearTimeout(this.typingTimeouts[channel_id][user_id]);
      }

      // Enregistrer l'horodatage de la dernière activité de frappe
      const timestamp = Date.now();
      this.typingUsers[channel_id][user_id] = timestamp;

      // Définir un nouveau timeout pour supprimer l'utilisateur après 5 secondes
      this.typingTimeouts[channel_id][user_id] = setTimeout(() => {
        this.removeTypingUser(channel_id, user_id, timestamp);
      }, 5000);

      // Notifier les écouteurs que les états de frappe ont changé
      this.notifyListeners("typing_updated", {
        channelId: channel_id,
        typingUsers: this.getTypingUsers(channel_id),
        timestamp,
      });
    } catch (error) {
      console.error("Error handling typing event:", error);
    }
  }

  /**
   * Supprimer un utilisateur de la liste des utilisateurs en train de taper
   */
  private removeTypingUser(
    channelId: string,
    userId: string,
    timestamp: number,
  ) {
    // Vérifier si l'utilisateur existe encore dans la liste et si la timestamp correspond
    if (this.typingUsers[channelId]?.[userId] === timestamp) {
      // Supprimer l'utilisateur
      delete this.typingUsers[channelId][userId];
      delete this.typingTimeouts[channelId][userId];

      // Si aucun utilisateur ne tape plus dans ce canal, nettoyer l'objet
      if (Object.keys(this.typingUsers[channelId]).length === 0) {
        delete this.typingUsers[channelId];
        delete this.typingTimeouts[channelId];
      }

      // Notifier à nouveau les écouteurs
      this.notifyListeners("typing_updated", {
        channelId,
        typingUsers: this.getTypingUsers(channelId),
        timestamp,
      });
    }
  }

  /**
   * Obtenir la liste des IDs utilisateurs actuellement en train de taper dans un canal
   */
  getTypingUsers(channelId: string): string[] {
    if (!this.typingUsers[channelId]) {
      return [];
    }

    const now = Date.now();
    const typingUserIds: string[] = [];

    // Ne retourner que les utilisateurs qui ont tapé dans les 5 dernières secondes
    Object.entries(this.typingUsers[channelId]).forEach(
      ([userId, timestamp]) => {
        if (now - timestamp < 5000) {
          typingUserIds.push(userId);
        } else {
          // Nettoyer automatiquement les entrées expirées
          this.removeTypingUser(channelId, userId, timestamp);
        }
      },
    );

    return typingUserIds;
  }

  /**
   * Gérer les changements de réactions (ajout/suppression)
   */
  private handleReactionChange(data: any, isAdded: boolean) {
    // Notifier pour mise à jour de l'UI
    const eventType = isAdded
      ? WebSocketEventType.REACTION_ADDED
      : WebSocketEventType.REACTION_REMOVED;

    this.notifyListeners(eventType, data);
  }

  /**
   * Gérer l'événement de visualisation d'un canal
   */
  private handleChannelViewed(data: any) {
    const { channel_id } = data;

    // Réinitialiser les compteurs non lus pour ce canal
    if (this.unreadState[channel_id]) {
      this.unreadState[channel_id] = {
        ...this.unreadState[channel_id],
        msg_count: 0,
        mention_count: 0,
        lastViewedAt: Date.now(),
      };

      this.notifyListeners("unread_updated", this.unreadState);
    }
  }

  /**
   * Obtenir toutes les notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Marquer une notification comme lue
   */
  markNotificationAsRead(notificationId: string) {
    const notification = this.notifications.find(
      (n) => n.id === notificationId,
    );
    if (notification) {
      notification.read = true;
      this.notifyListeners("notification_updated", notification);
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllNotificationsAsRead() {
    this.notifications.forEach((notification) => {
      notification.read = true;
    });
    this.notifyListeners("notifications_updated", this.notifications);
  }

  /**
   * Obtenir l'état des non-lus pour tous les canaux
   */
  getUnreadState(): UnreadState {
    return { ...this.unreadState };
  }

  /**
   * Obtenir l'état des non-lus pour un canal spécifique
   */
  getChannelUnreadState(channelId: string) {
    return this.unreadState[channelId] || { msg_count: 0, mention_count: 0 };
  }

  /**
   * Définit manuellement l'état non lu d'un canal
   * @param channelId ID du canal
   * @param state Nouvel état non lu
   */
  setChannelUnreadState(
    channelId: string,
    state: {
      msg_count: number;
      mention_count: number;
      lastViewedAt?: number;
      lastMessageId?: string;
    },
  ): void {
    if (!channelId) return;

    this.unreadState[channelId] = state;
    this.notifyListeners("unread_updated", this.unreadState);
  }

  /**
   * Réinitialise l'état non lu d'un canal
   * @param channelId ID du canal
   */
  resetChannelUnreadState(channelId: string): void {
    if (channelId && this.unreadState[channelId]) {
      this.unreadState[channelId] = {
        msg_count: 0,
        mention_count: 0,
        lastViewedAt: Date.now(),
      };

      this.notifyListeners("unread_updated", this.unreadState);
    }
  }

  /**
   * Supprimer toutes les notifications
   */
  clearNotifications() {
    this.notifications = [];
    this.notifyListeners("notifications_updated", this.notifications);
  }
}

// Créer une instance singleton du service
export const notificationService = new NotificationService();

export default notificationService;
