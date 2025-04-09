// src/utils/emoji.utils.ts
/**
 * Utilitaires centralisés pour les fonctionnalités liées aux emojis
 * Ce module permet d'éviter la duplication de code entre les différents services
 */

import { GifData } from "../types";
import { getEmojiName } from "../components/EmojiPicker/data/emojiData";
import {
  MOCK_GIFS,
  GIF_API_CONFIG,
  buildApiUrl,
  parseApiResponse,
} from "../components/EmojiPicker/data/gifData";

/**
 * Interface pour les options lors des appels API
 */
interface ApiCallParams {
  baseUrl: string;
  token?: string;
  headers?: Record<string, string>;
  mode: "direct" | "proxy";
}

/**
 * Options pour les appels liés aux emojis
 */
export interface EmojiApiOptions extends ApiCallParams {
  isAuthenticated: boolean;
  currentUserId?: string; // Ajout de l'ID utilisateur actuel
}

/**
 * Options pour les appels liés aux GIFs
 */
export interface GifApiOptions extends ApiCallParams {
  useRealApi?: boolean;
}

/**
 * Fournit une liste d'emojis fréquemment utilisés
 * Dans une implémentation réelle, on pourrait récupérer cette liste depuis une API ou le local storage
 *
 * @returns Liste des emojis fréquents
 */
export const getFrequentEmojis = async (): Promise<string[]> => {
  // Valeurs par défaut pour la démo
  return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
};

/**
 * Ajoute une réaction à un message
 *
 * @param messageId ID du message
 * @param emoji Emoji à ajouter
 * @param options Options d'API (URL, token, etc.)
 */
export const addReaction = async (
  messageId: string,
  emoji: string,
  options: EmojiApiOptions,
): Promise<any> => {
  const { baseUrl, token, headers = {}, mode, currentUserId } = options;
  const emojiName = getEmojiName(emoji);

  let url: string;
  let body: any;

  if (mode === "direct") {
    url = `${baseUrl}/api/v4/reactions`;

    // Vérifier si l'ID utilisateur est fourni, sinon lancer une erreur
    if (!currentUserId) {
      throw new Error("L'ID utilisateur est requis pour ajouter une réaction");
    }

    body = {
      post_id: messageId,
      emoji_name: emojiName,
      user_id: currentUserId,
    };
  } else {
    // Mode proxy
    url = `${baseUrl}/reactions`;
    body = {
      post_id: messageId,
      emoji_name: emojiName,
    };
  }

  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message ||
          `Erreur API : ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(`Erreur lors de l'ajout de la réaction:`, error);
    throw error;
  }
};

/**
 * Supprime une réaction d'un message
 *
 * @param channelId ID du canal
 * @param messageId ID du message
 * @param emoji Emoji à supprimer
 * @param options Options d'API (URL, token, etc.)
 */
export const removeReaction = async (
  channelId: string,
  messageId: string,
  emoji: string,
  options: EmojiApiOptions,
): Promise<any> => {
  const { baseUrl, token, headers = {}, mode } = options;
  const emojiName = getEmojiName(emoji);

  let url: string;

  if (mode === "direct") {
    // Dans l'API Mattermost, on a besoin de l'ID utilisateur
    // "me" est utilisé pour l'utilisateur actuel
    const userId = "me";
    url = `${baseUrl}/api/v4/users/${userId}/posts/${messageId}/reactions/${emojiName}`;
  } else {
    // Mode proxy
    url = `${baseUrl}/reactions/${messageId}/${emojiName}`;
  }

  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: requestHeaders,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message ||
          `Erreur API : ${response.status} ${response.statusText}`,
      );
    }

    // Pour les requêtes DELETE qui peuvent ne pas renvoyer de corps
    if (response.status === 204) {
      return { success: true };
    }

    return response.json();
  } catch (error) {
    console.error(`Erreur lors de la suppression de la réaction:`, error);
    throw error;
  }
};

/**
 * Vérifie si l'utilisateur a réagi à un message avec un emoji spécifique
 *
 * @param channelId ID du canal
 * @param messageId ID du message
 * @param emoji Emoji à vérifier
 * @param options Options d'API (URL, token, etc.)
 * @param currentUserId ID de l'utilisateur actuel (optionnel)
 */
export const hasReacted = async (
  channelId: string,
  messageId: string,
  emoji: string,
  options: EmojiApiOptions,
  currentUserId?: string,
): Promise<boolean> => {
  const { baseUrl, token, headers = {}, mode } = options;
  const emojiName = getEmojiName(emoji);

  let url: string;

  if (mode === "direct") {
    url = `${baseUrl}/api/v4/posts/${messageId}/reactions`;
  } else {
    // Mode proxy
    url = `${baseUrl}/posts/${messageId}/reactions`;
  }

  const requestHeaders = {
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      headers: requestHeaders,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message ||
          `Erreur API : ${response.status} ${response.statusText}`,
      );
    }

    const reactions = await response.json();

    // Si l'ID utilisateur n'est pas fourni, on doit le récupérer
    let userIdToCheck = currentUserId;

    if (!userIdToCheck && mode === "direct") {
      // Récupérer l'utilisateur actuel
      const userResponse = await fetch(`${baseUrl}/api/v4/users/me`, {
        headers: { ...requestHeaders },
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        userIdToCheck = user.id;
      }
    }

    // Vérifier si l'utilisateur a réagi avec cet emoji
    return reactions.some(
      (reaction: any) =>
        reaction.emoji_name === emojiName &&
        (userIdToCheck ? reaction.user_id === userIdToCheck : true),
    );
  } catch (error) {
    console.error(`Erreur lors de la vérification de la réaction:`, error);
    return false;
  }
};

/**
 * Recherche des GIFs en fonction d'un terme de recherche
 *
 * @param query Terme de recherche
 * @param options Options d'API (URL, token, etc.)
 * @param category Catégorie optionnelle pour filtrer les résultats
 */
export const searchGifs = async (
  query: string,
  options: GifApiOptions,
  category?: string,
): Promise<GifData[]> => {
  const { baseUrl, token, headers = {}, mode, useRealApi = false } = options;

  // Décider si on utilise l'API réelle ou les données de test
  if (useRealApi || GIF_API_CONFIG.USE_API_PROVIDER) {
    try {
      // Construire l'URL de recherche via l'API réelle (Giphy/Tenor)
      const apiUrl = buildApiUrl("search", query, category);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`GIF API error: ${response.status}`);
      }

      const data = await response.json();
      return parseApiResponse(data, GIF_API_CONFIG.PROVIDER);
    } catch (error) {
      console.error("Error searching GIFs via API:", error);
      return [];
    }
  } else if (mode === "proxy") {
    // Utiliser l'API proxy
    try {
      let endpoint = `gifs/search?q=${encodeURIComponent(query)}`;
      if (category) {
        endpoint += `&category=${encodeURIComponent(category)}`;
      }

      const url = `${baseUrl}/${endpoint}`;

      const response = await fetch(url, {
        headers: {
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Error searching GIFs: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error searching GIFs via proxy:", error);
      return [];
    }
  } else {
    // Utiliser les données de test
    // Pour simuler une recherche, filtrer par titre
    const allGifs = Object.values(MOCK_GIFS).flat();
    return allGifs.filter((gif) =>
      gif.title.toLowerCase().includes(query.toLowerCase()),
    );
  }
};

/**
 * Récupère des GIFs par catégorie
 *
 * @param category Catégorie de GIFs
 * @param options Options d'API (URL, token, etc.)
 * @param limit Nombre maximum de résultats
 */
export const getGifs = async (
  category: string,
  options: GifApiOptions,
  limit: number = 20,
): Promise<GifData[]> => {
  const { baseUrl, token, headers = {}, mode, useRealApi = false } = options;

  // Décider si on utilise l'API réelle ou les données de test
  if (useRealApi || GIF_API_CONFIG.USE_API_PROVIDER) {
    try {
      // Construire l'URL pour la catégorie via l'API réelle (Giphy/Tenor)
      const apiUrl = buildApiUrl(
        category.toLowerCase() === "trending" ? "trending" : "category",
        undefined,
        category,
      );

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`GIF API error: ${response.status}`);
      }

      const data = await response.json();
      return parseApiResponse(data, GIF_API_CONFIG.PROVIDER);
    } catch (error) {
      console.error(
        `Error getting GIFs for category ${category} via API:`,
        error,
      );
      return [];
    }
  } else if (mode === "proxy") {
    // Utiliser l'API proxy
    try {
      let endpoint =
        category.toLowerCase() === "trending"
          ? "gifs/trending"
          : `gifs/category/${encodeURIComponent(category.toLowerCase())}`;

      if (limit) {
        endpoint += `?limit=${limit}`;
      }

      const url = `${baseUrl}/${endpoint}`;

      const response = await fetch(url, {
        headers: {
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Error getting GIFs: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Error getting GIFs for category ${category} via proxy:`,
        error,
      );
      return [];
    }
  } else {
    // Utiliser les données de test
    return MOCK_GIFS[category] || [];
  }
};

export default {
  getFrequentEmojis,
  addReaction,
  removeReaction,
  hasReacted,
  searchGifs,
  getGifs,
};
