import { useState, useEffect, useRef } from 'react';
import { WebSocketSingleton } from './useWebSocket';

/**
 * Hook spécialisé pour s'abonner uniquement aux événements de saisie d'un canal spécifique
 * Cela permet d'éviter les rendus inutiles lorsque d'autres canaux reçoivent des événements
 * 
 * Usage:
 * ```tsx
 * const { typingEvents } = useTypingEventsForChannel(channelId);
 * ```
 */
export function useTypingEventsForChannel(channelId: string) {
  // État local pour déclencher les re-rendus uniquement quand nécessaire
  const [, setRenderKey] = useState(0);
  
  // Utiliser useRef pour stocker l'ID du canal actuel
  // Cela évite les problèmes de clôture lors du nettoyage des effets
  const channelIdRef = useRef(channelId);
  
  // Mettre à jour la référence si l'ID du canal change
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);
  
  // S'abonner uniquement aux événements du canal spécifique
  useEffect(() => {
    // Fonction pour forcer le re-rendu lorsque des événements pour ce canal changent
    const forceRender = () => setRenderKey(prev => prev + 1);
    
    // S'abonner aux changements pour ce canal spécifique
    const unsubscribe = WebSocketSingleton.subscribeToChannel(channelId, forceRender);
    
    // Nettoyage
    return () => {
      unsubscribe();
    };
  }, [channelId]); // Ne réexécuter que si l'ID du canal change
  
  // Retourner uniquement les événements pour ce canal spécifique
  const typingEvents = WebSocketSingleton.getTypingEventsForChannel(channelId);
  
  return { typingEvents };
}