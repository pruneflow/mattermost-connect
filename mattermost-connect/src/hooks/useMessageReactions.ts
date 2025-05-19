import { useState, useEffect } from 'react';
import { WebSocketSingleton } from './useWebSocket';
import { useMessages } from './useMessages';

/**
 * Type représentant une réaction à un message
 */
export interface MessageReaction {
  user_id: string;
  emoji_name: string;
  post_id: string;
  create_at: number;
}

/**
 * Hook qui s'abonne uniquement aux réactions d'un message spécifique
 * Optimise les performances en limitant les re-renders aux seuls composants
 * qui affichent les réactions d'un message donné.
 * 
 * @param postId L'ID du message à surveiller
 * @param channelId L'ID du canal (optionnel, pour l'initialisation des réactions)
 * @returns Les réactions pour ce message spécifique
 */
export function useMessageReactions(postId: string, channelId?: string) {
  // État local pour déclencher les re-rendus uniquement quand nécessaire
  const [, setRenderKey] = useState(0);
  
  // Tenter de récupérer les messages du canal si channelId est fourni
  const messages = channelId ? useMessages(channelId) : null;
  
  // S'abonner uniquement aux changements des réactions pour ce message spécifique
  useEffect(() => {
    if (!postId) return;
    
    // Fonction pour forcer le re-rendu lorsque les réactions de ce message changent
    const forceRender = () => setRenderKey(prev => prev + 1);
    
    // S'abonner aux changements pour ce message spécifique
    const unsubscribe = WebSocketSingleton.subscribeToMessageReactions(postId, forceRender);
    
    // Initialiser les réactions depuis les données existantes si disponibles
    if (messages?.data && channelId) {
      const message = messages.data.find(msg => msg.id === postId);
      if (message?.reactions) {
        // Convertir les réactions du format Mattermost vers notre format
        Object.entries(message.reactions).forEach(([emojiName, userIds]) => {
          userIds.forEach(userId => {
            WebSocketSingleton.updateMessageReactions(postId, {
              emoji_name: emojiName,
              post_id: postId,
              user_id: userId,
              create_at: Date.now()
            }, true);
          });
        });
      }
    }
    
    // Nettoyage
    return () => {
      unsubscribe();
    };
  }, [postId, channelId, messages?.data]);
  
  // Récupérer uniquement les réactions pour ce message spécifique
  const reactions = WebSocketSingleton.getMessageReactions(postId);
  
  // Grouper les réactions par emoji_name pour faciliter l'affichage
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const { emoji_name } = reaction;
    if (!acc[emoji_name]) {
      acc[emoji_name] = [];
    }
    acc[emoji_name].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);
  
  return {
    reactions,
    groupedReactions,
    // Raccourci utile pour savoir si le message a des réactions
    hasReactions: reactions.length > 0
  };
}