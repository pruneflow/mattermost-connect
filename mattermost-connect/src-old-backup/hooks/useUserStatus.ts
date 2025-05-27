import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserStatus } from '../api/types';
import { userCache } from '../api/userCache';
import { WebSocketSingleton } from './useWebSocket';

/**
 * Hook qui s'abonne aux changements de statut d'un utilisateur spécifique
 * NOUVEAU: Utilise le système de batch unifié via userCache
 * 
 * @param userId L'ID de l'utilisateur à surveiller
 * @returns Le statut actuel de l'utilisateur
 */
export function useUserStatus(userId: string): UserStatus {
  // État local pour déclencher les re-rendus
  const [status, setStatus] = useState<UserStatus>(() => {
    // Initialiser avec le cache
    return userCache.hasUserStatus(userId) 
      ? userCache.getUserStatusFromCache(userId) || 'offline'
      : 'offline';
  });
  
  // S'abonner aux changements WebSocket pour cet utilisateur
  useEffect(() => {
    if (!userId) return;
    
    // S'abonner aux changements via WebSocketSingleton
    const unsubscribe = WebSocketSingleton.subscribeToUserStatus(userId, () => {
      const newStatus = WebSocketSingleton.getUserStatus(userId) as UserStatus;
      setStatus(newStatus);
    });
    
    // Fetch initial via système de batch
    userCache.queueStatusForBatch(userId).then(newStatus => {
      setStatus(newStatus);
    });
    
    return unsubscribe;
  }, [userId]);
  
  return status;
}