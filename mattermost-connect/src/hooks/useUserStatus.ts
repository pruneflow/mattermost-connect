import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserStatus } from '../api/types';
import { userStatusService } from '../api/userStatusService';

/**
 * Hook qui s'abonne aux changements de statut d'un utilisateur spécifique
 * Version optimisée qui utilise le service singleton pour partager l'abonnement
 * entre toutes les instances pour le même userId
 * 
 * @param userId L'ID de l'utilisateur à surveiller
 * @returns Le statut actuel de l'utilisateur
 */
export function useUserStatus(userId: string): UserStatus {
  // Récupérer les informations d'authentification pour l'API
  const { token, serverUrl, user } = useAuth();
  
  // Vérifier si c'est l'utilisateur courant
  const isCurrentUser = user?.id === userId;
  
  // État local pour déclencher les re-rendus uniquement quand nécessaire
  const [status, setStatus] = useState<UserStatus>(() => {
    // Initialiser avec le statut du service centralisé
    return userStatusService.getStatus(userId);
  });
  
  // S'abonner aux changements et configurer l'abonnement via le service
  useEffect(() => {
    if (!userId) return;
    
    // S'abonner au service et obtenir la fonction de désabonnement
    const unsubscribe = userStatusService.subscribe(userId, isCurrentUser, newStatus => {
      // Mettre à jour l'état local quand le statut change
      setStatus(newStatus);
    });
    
    // Pour tous les utilisateurs, y compris l'utilisateur courant, récupérer le statut via API
    if (token && serverUrl) {
      // Forcer le rafraîchissement pour l'utilisateur courant ou si le statut est offline
      const forceRefresh = isCurrentUser || userStatusService.getStatus(userId) === 'offline';
      userStatusService.fetchUserStatus(userId, forceRefresh);
    }
    
    // Nettoyer l'abonnement lors du démontage
    return () => {
      unsubscribe();
    };
  }, [userId, isCurrentUser, token, serverUrl]);
  
  return status;
}