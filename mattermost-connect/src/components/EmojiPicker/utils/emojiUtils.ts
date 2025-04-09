// src/components/EmojiPicker/utils/emojiUtils.ts
// Utilitaires pour manipuler les emojis

import { useMattermost } from "../../../context/MattermostProvider";
import { getEmojiName } from "../data/emojiData";

/**
 * Envoie une réaction à un message via l'API Mattermost
 *
 * @param channelId - ID du canal
 * @param messageId - ID du message
 * @param emojiName - Nom de l'emoji pour l'API (ex: "+1" pour 👍)
 * @returns Promise<void>
 */
export const addReaction = async (
  service: any,
  channelId: string,
  messageId: string,
  emojiName: string,
): Promise<any> => {
  try {
    // Construction de l'URL et du corps de la requête selon l'API Mattermost
    const url = "/api/v4/reactions";
    const data = {
      user_id: "me", // L'API utilisera l'utilisateur actuel
      post_id: messageId,
      emoji_name: emojiName,
      channel_id: channelId,
    };

    // Effectuer la requête via le service Mattermost
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to add reaction: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding reaction:", error);
    throw error;
  }
};

/**
 * Hook pour gérer les réactions aux messages
 */
export const useReactions = () => {
  const { service } = useMattermost();

  /**
   * Ajoute une réaction à un message
   */
  const addEmojiReaction = async (
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<void> => {
    const emojiApiName = getEmojiName(emoji);

    try {
      await addReaction(service, channelId, messageId, emojiApiName);
    } catch (error) {
      console.error("Failed to add reaction:", error);
      throw error;
    }
  };

  return {
    addEmojiReaction,
  };
};

/**
 * Détecte les catégories d'emojis disponibles dans un navigateur
 * @returns Liste des catégories supportées
 */
export const getSupportedEmojiCategories = (): string[] => {
  // Liste de base des catégories
  return [
    "Smileys & Emotion",
    "People & Body",
    "Animals & Nature",
    "Food & Drink",
    "Travel & Places",
    "Activities",
    "Objects",
    "Symbols",
    "Flags",
  ];
};

export default {
  addReaction,
  useReactions,
  getSupportedEmojiCategories,
};
