import { useMessages } from "./useMessages";
import { useAuth } from "../context/AuthContext";

export interface UseReactionToggleOptions {
  channelId: string;
  messageId: string;
}

export function useReactionToggle({ channelId, messageId }: UseReactionToggleOptions) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { addReaction, removeReaction, messages } = useMessages(channelId, currentUserId);

  // Récupérer le message actuel pour les réactions
  const currentMessage = messages.find(msg => msg.id === messageId);
  
  // Convertir les réactions du format metadata en format d'affichage
  const reactions: Record<string, string[]> = (() => {
    const reactionsList = currentMessage?.metadata?.reactions || [];
    return reactionsList.reduce((acc: Record<string, string[]>, reaction) => {
      if (!acc[reaction.emoji_name]) {
        acc[reaction.emoji_name] = [];
      }
      acc[reaction.emoji_name].push(reaction.user_id);
      return acc;
    }, {} as Record<string, string[]>);
  })();

  const toggleReaction = async (emoji: string, emojiName: string) => {
    if (!currentUserId || !messageId) return;

    try {
      // Note: emojiName contient déjà le modificateur de teinte si nécessaire
      const mattermostEmojiName = emojiName;

      // Check if user has already added this reaction
      const hasReacted = reactions[mattermostEmojiName]?.includes(currentUserId) || false;

      if (hasReacted) {
        // Remove reaction
        await removeReaction({ messageId, emojiName: mattermostEmojiName });
      } else {
        // Add reaction
        await addReaction({ messageId, emojiName: mattermostEmojiName });
      }
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  return {
    toggleReaction,
    reactions,
    hasReacted: (emojiName: string) => 
      currentUserId ? reactions[emojiName]?.includes(currentUserId) || false : false
  };
}