import { useCallback, useMemo, useState, useEffect } from 'react';
import { api } from '../api/client';
import { getUserInitials } from '../utils/formatters';
import { User } from '../api/types';

// Cache statique des URLs d'avatar pour éviter les appels répétés
const avatarUrlCache = new Map<string, string>();

/**
 * Hook optimisé pour gérer l'avatar d'un utilisateur avec cache.
 * Utilisation : const { avatarUrl } = useUserAvatar(userId)
 * OPTIMISÉ: Génère l'URL une seule fois par userId et la met en cache
 */
export function useUserAvatar(userId?: string) {
  // Stockage direct de l'URL dans l'état du composant
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  // Charger l'URL une seule fois et la mettre en cache
  useEffect(() => {
    if (userId) {
      // Vérifier d'abord le cache
      if (avatarUrlCache.has(userId)) {
        setAvatarUrl(avatarUrlCache.get(userId)!);
        return;
      }
      
      const baseUrl = api.getBaseUrl();
      // Pas de cache-buster pour permettre le cache navigateur
      const url = `${baseUrl}/api/v4/users/${userId}/image`;
      
      // Mettre en cache pour tous les futurs composants
      avatarUrlCache.set(userId, url);
      setAvatarUrl(url);
    }
  }, [userId]);
  
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