import { useState, useEffect, useRef } from 'react';
import { WebSocketSingleton } from './useWebSocket';
import { useAuth } from '../context/AuthContext';
import { userCache } from '../api/userCache';
import { UserStatus } from '../api/types';

// Objet pour suivre les composants utilisant chaque userId
// Cela nous permet d'éviter les ajouts/suppressions cycliques 
// quand plusieurs composants utilisent le même utilisateur
const activeStatusSubscriptions: Record<string, number> = {};

/**
 * Hook qui s'abonne uniquement aux changements de statut d'un utilisateur spécifique
 * Ajoute l'utilisateur au système de pull périodique et s'abonne aux notifications ciblées
 * Optimise les performances en limitant les re-renders aux seuls composants
 * qui dépendent du statut de cet utilisateur
 * 
 * @param userId L'ID de l'utilisateur à surveiller
 * @returns Le statut actuel de l'utilisateur
 */
export function useUserStatus(userId: string): UserStatus {
  // État local pour déclencher les re-rendus uniquement quand nécessaire
  const [status, setStatus] = useState<UserStatus>(() => {
    // Initialiser avec le statut du cache si disponible
    if (userCache.hasUserStatus(userId)) {
      return userCache.getUserStatusFromCache(userId) || 'offline';
    }
    return 'offline';
  });
  
  // Récupérer les informations d'authentification pour l'appel API
  const { token, serverUrl, user } = useAuth();
  
  // Référence pour savoir si c'est l'utilisateur connecté
  const isCurrentUser = user?.id === userId;
  
  // Référence pour déterminer si c'est le premier montage
  const isFirstMount = useRef(true);
  
  // S'abonner uniquement aux changements de statut pour cet utilisateur spécifique
  useEffect(() => {
    if (!userId) return;
    
    // Incrémenter le compteur de références pour cet utilisateur
    activeStatusSubscriptions[userId] = (activeStatusSubscriptions[userId] || 0) + 1;
    
    // Ne logger qu'au premier montage pour éviter les logs excessifs
    if (isFirstMount.current) {
      console.log(`Setting up status tracking for user: ${userId}${isCurrentUser ? ' (current user)' : ''} (refs: ${activeStatusSubscriptions[userId]})`);
      isFirstMount.current = false;
    }
    
    // Fonction pour mettre à jour l'état local quand le statut change
    const handleStatusChange = (newStatus: UserStatus) => {
      setStatus(newStatus);
    };
    
    // S'abonner aux changements pour cet utilisateur spécifique
    const unsubscribe = WebSocketSingleton.subscribeToUserStatus(userId, () => {
      // Quand le statut change, récupérer depuis le singleton de WebSocket
      const newStatus = WebSocketSingleton.getUserStatus(userId);
      
      // Mettre à jour notre cache centralisé
      if (newStatus) {
        userCache.setUserStatus(userId, newStatus);
      }
      
      // Mettre à jour l'état local
      setStatus(newStatus || 'offline');
    });
    
    // Pour l'utilisateur courant, initialiser son statut via API directe (une seule fois)
    if (isCurrentUser && token && serverUrl && !WebSocketSingleton.isUserStatusInitialized(userId)) {
      WebSocketSingleton.initializeUserStatus(userId, serverUrl, token)
        .then(status => {
          // Mettre à jour le cache quand on reçoit le statut initial
          userCache.setUserStatus(userId, status);
          setStatus(status);
        })
        .catch(err => console.error(`Failed to initialize status for current user ${userId}:`, err));
    }
    
    // Pour les autres utilisateurs, ajouter à la liste de surveillance pour le pull périodique
    // Mais seulement si c'est la première référence à cet utilisateur
    if (!isCurrentUser && activeStatusSubscriptions[userId] === 1) {
      // Récupérer le statut via API (forceRefresh=true pour le premier chargement)
      if (token && serverUrl) {
        // Utiliser notre système centralisé pour récupérer le statut
        const forceRefresh = !userCache.hasUserStatus(userId);
        userCache.getUserStatus(userId, forceRefresh)
          .then(newStatus => {
            setStatus(newStatus);
          })
          .catch(err => console.error(`Error fetching status for user ${userId}:`, err));
      }
      
      WebSocketSingleton.addUserToStatusWatch(userId);
      
      // Demander une mise à jour immédiate si la WebSocket est connectée
      const ws = WebSocketSingleton.getWebSocket();
      if (ws && ws.readyState === WebSocket.OPEN) {
        WebSocketSingleton.requestStatusUpdates(ws);
      }
    }
    
    // Nettoyage
    return () => {
      unsubscribe();
      
      // Décrémenter le compteur de références pour cet utilisateur
      activeStatusSubscriptions[userId] = activeStatusSubscriptions[userId] - 1;
      
      // Retirer l'utilisateur de la liste de surveillance seulement si plus aucun composant ne l'utilise
      if (!isCurrentUser && activeStatusSubscriptions[userId] <= 0) {
        delete activeStatusSubscriptions[userId]; // Nettoyer la référence
        WebSocketSingleton.removeUserFromStatusWatch(userId);
      }
    };
  }, [userId, token, serverUrl, isCurrentUser, user?.id]);
  
  return status;
}