import { useCallback, useMemo, useState, useEffect } from 'react';
import { api } from '../api/client';
import { getUserInitials } from '../utils/formatters';
import { User } from '../api/types';

/**
 * Hook très simple pour gérer l'avatar d'un utilisateur.
 * Utilisation : const { avatarUrl } = useUserAvatar(userId)
 * IMPORTANT: Ce hook est conçu pour être utilisé dans un composant pour un seul userId spécifique.
 */
export function useUserAvatar(userId?: string) {
  // Stockage direct de l'URL dans l'état du composant
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  // Charger l'URL une seule fois au montage du composant
  useEffect(() => {
    if (userId) {
      const baseUrl = api.getBaseUrl();
      // Générer un cache-buster unique pour ce montage de composant
      const cacheBuster = Date.now();
      const url = `${baseUrl}/api/v4/users/${userId}/image?_=${cacheBuster}`;
      setAvatarUrl(url);
    }
  }, [userId]); // Ne dépend que de userId, ne change jamais pendant la vie du composant
  
  // Génère une couleur déterministe basée sur le nom d'utilisateur pour les fonds d'avatar
  const getAvatarColor = useCallback((username?: string): string => {
    if (!username) return '#909090';
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    
    return color;
  }, []);
  
  // Fonction simple qui ne fait rien - seulement pour rétro-compatibilité
  const refreshAvatar = useCallback(() => {
    // Aucune action - l'avatar ne change jamais pendant la vie du composant
    // Si besoin de rafraichir, le composant devrait être remonté
  }, []);

  return useMemo(() => ({
    avatarUrl,
    getAvatarColor,
    getUserInitials,
    refreshAvatar // Pour rétro-compatibilité
  }), [avatarUrl, getAvatarColor, refreshAvatar]);
}

export default useUserAvatar;