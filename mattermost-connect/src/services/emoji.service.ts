// src/services/emoji.service.ts
/**
 * Service pour les fonctionnalités liées aux emojis et GIFs
 * Gère les appels API pour les réactions et la recherche de GIFs
 */

import { MattermostService } from "../types";
import {
  getEmojiName,
  getEmojiFromName,
} from "../components/EmojiPicker/data/emojiData";

/**
 * Interface pour le service emoji
 */
export interface EmojiServiceInterface {
  /**
   * Ajoute une réaction emoji à un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à ajouter (caractère Unicode)
   */
  addReaction: (messageId: string, emoji: string) => Promise<any>;

  /**
   * Supprime une réaction emoji d'un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à supprimer (caractère Unicode)
   */
  removeReaction: (
    channelId: string,
    messageId: string,
    emoji: string,
  ) => Promise<any>;

  /**
   * Vérifie si l'utilisateur actuel a ajouté une réaction à un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à vérifier (caractère Unicode)
   */
  hasReacted: (
    channelId: string,
    messageId: string,
    emoji: string,
  ) => Promise<boolean>;

  /**
   * Recherche des GIFs
   * @param query Terme de recherche
   * @param category Catégorie optionnelle
   */
  searchGifs: (
    query: string,
    category?: string,
  ) => Promise<
    Array<{
      id: string;
      preview: string;
      title: string;
      url: string;
    }>
  >;

  /**
   * Récupère les GIFs tendance ou par catégorie
   * @param category Catégorie de GIFs
   * @param limit Nombre de résultats maximum
   */
  getGifs: (
    category: string,
    limit?: number,
  ) => Promise<
    Array<{
      id: string;
      preview: string;
      title: string;
      url: string;
    }>
  >;

  /**
   * Récupère les emojis fréquemment utilisés par l'utilisateur
   */
  getFrequentEmojis: () => Promise<string[]>;
}

/**
 * Crée une instance du service emoji
 * @param mattermostService Service Mattermost existant
 * @returns Instance du service emoji
 */
export const createEmojiService = (
  mattermostService: MattermostService,
): EmojiServiceInterface => {
  // URLs de base pour les endpoints
  const apiBaseUrl = "/api/v4";

  /**
   * Effectue un appel API à Mattermost
   */
  const apiCall = async <T>(
    endpoint: string,
    method: string = "GET",
    body?: any,
  ): Promise<T> => {
    const url = `${apiBaseUrl}/${endpoint}`;

    try {
      // Créer les options de la requête
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      // Ajouter le corps de la requête si nécessaire
      if (body) {
        options.body = JSON.stringify(body);
      }

      // Utiliser fetch pour les appels API
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `API Error: ${response.status} ${response.statusText}`,
        );
      }

      // Pour les requêtes DELETE qui peuvent ne pas renvoyer de corps
      if (method === "DELETE" && response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling API at ${endpoint}:`, error);
      throw error;
    }
  };

  return {
    /**
     * Ajoute une réaction emoji à un message
     */
    addReaction: async (messageId: string, emoji: string): Promise<any> => {
      const emojiName = getEmojiName(emoji);

      return apiCall<any>("reactions", "POST", {
        post_id: messageId,
        emoji_name: emojiName,
        user_id: "me",
      });
    },

    /**
     * Supprime une réaction emoji d'un message
     */
    removeReaction: async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<any> => {
      const emojiName = getEmojiName(emoji);

      // L'API Mattermost pour supprimer une réaction nécessite l'ID utilisateur
      // Nous utilisons "me" pour l'utilisateur courant
      const userId = "me";

      return apiCall<any>(
        `users/${userId}/posts/${messageId}/reactions/${emojiName}`,
        "DELETE",
      );
    },

    /**
     * Vérifie si l'utilisateur actuel a ajouté une réaction à un message
     */
    hasReacted: async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<boolean> => {
      const emojiName = getEmojiName(emoji);

      try {
        // Récupérer les réactions pour ce message
        const reactions = await apiCall<any[]>(`posts/${messageId}/reactions`);

        // Vérifier si l'utilisateur actuel a réagi avec cet emoji
        const currentUser = await mattermostService.getCurrentUser();

        return reactions.some(
          (reaction) =>
            reaction.emoji_name === emojiName &&
            reaction.user_id === currentUser.id,
        );
      } catch (error) {
        console.error("Error checking reaction:", error);
        return false;
      }
    },

    /**
     * Recherche des GIFs
     * Note: Cette implémentation utilise une API fictive
     * À remplacer par l'API réelle (ex: Giphy, Tenor)
     */
    searchGifs: async (
      query: string,
      category?: string,
    ): Promise<Array<any>> => {
      // Simuler une recherche de GIFs
      // Dans une implémentation réelle, vous utiliseriez une API de GIFs
      console.log(`Searching GIFs with query: ${query}, category: ${category}`);

      // Retourner des données fictives pour la démonstration
      return [
        {
          id: "gif1",
          preview: "https://placeholder.com/150x100",
          title: `Result for "${query}" 1`,
          url: "https://example.com/gifs/1",
        },
        {
          id: "gif2",
          preview: "https://placeholder.com/150x100",
          title: `Result for "${query}" 2`,
          url: "https://example.com/gifs/2",
        },
      ];
    },

    /**
     * Récupère les GIFs tendance ou par catégorie
     */
    getGifs: async (
      category: string,
      limit: number = 20,
    ): Promise<Array<any>> => {
      // Simuler une récupération de GIFs par catégorie
      console.log(`Getting GIFs for category: ${category}, limit: ${limit}`);

      // Retourner des données fictives pour la démonstration
      return [
        {
          id: "trend1",
          preview: "https://placeholder.com/150x100",
          title: `${category} GIF 1`,
          url: "https://example.com/gifs/trend1",
        },
        {
          id: "trend2",
          preview: "https://placeholder.com/150x100",
          title: `${category} GIF 2`,
          url: "https://example.com/gifs/trend2",
        },
      ];
    },

    /**
     * Récupère les emojis fréquemment utilisés par l'utilisateur
     */
    getFrequentEmojis: async (): Promise<string[]> => {
      try {
        // Dans une implémentation réelle, cette fonction récupérerait les emojis
        // fréquemment utilisés à partir de l'API ou du stockage local

        // Pour la démonstration, nous retournons une liste statique
        return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
      } catch (error) {
        console.error("Error getting frequent emojis:", error);
        return [];
      }
    },
  };
};

export default createEmojiService;
