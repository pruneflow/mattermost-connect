// src/services/emoji/emoji.service.ts
import { MattermostService } from "../base";
import { GifData } from "../../types";
import {
  getEmojiName,
  getEmojiFromName,
  DEFAULT_FREQUENT_EMOJIS,
  GIF_API_CONFIG,
  buildGifApiUrl,
  parseGifApiResponse,
  EMOJI_NAMES,
  EMOJI_MAP,
  searchEmojis,
} from "../../utils";

/**
 * Interface pour le service emoji
 * Ce service spécialisé gère les émojis et GIFs en utilisant les utilitaires centralisés
 */
export interface EmojiServiceInterface {
  /**
   * Ajoute une réaction emoji à un message
   * @param messageId ID du message
   * @param emoji Emoji à ajouter (caractère Unicode)
   * @returns Promise avec le résultat de l'opération
   */
  addReaction: (messageId: string, emoji: string) => Promise<any>;

  /**
   * Supprime une réaction emoji d'un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à supprimer (caractère Unicode)
   * @returns Promise avec le résultat de l'opération
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
   * @returns Promise indiquant si l'utilisateur a réagi
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
   * @returns Promise avec les résultats de la recherche
   */
  searchGifs: (query: string, category?: string) => Promise<GifData[]>;

  /**
   * Récupère les GIFs tendance ou par catégorie
   * @param category Catégorie de GIFs
   * @param limit Nombre de résultats maximum
   * @returns Promise avec les GIFs récupérés
   */
  getGifs: (category: string, limit?: number) => Promise<GifData[]>;

  /**
   * Récupère les emojis fréquemment utilisés par l'utilisateur
   * @returns Promise avec la liste des emojis fréquents
   */
  getFrequentEmojis: () => Promise<string[]>;

  /**
   * Convertit un caractère emoji en nom utilisable par l'API
   * @param emoji Caractère emoji
   * @returns Nom de l'emoji pour l'API
   */
  getEmojiName: (emoji: string) => string;

  /**
   * Convertit un nom d'emoji en caractère
   * @param emojiName Nom de l'emoji
   * @returns Caractère emoji correspondant
   */
  getEmojiFromName: (emojiName: string) => string | undefined;

  /**
   * Recherche des emojis correspondant à un terme
   * @param query Terme de recherche
   * @returns Emojis correspondants
   */
  searchEmojis: (query: string) => string[];

  /**
   * Récupère tous les emojis supportés sous forme de mapping
   * @returns Map des emojis vers leurs noms API
   */
  getAllEmojisMap: () => Record<string, string>;

  /**
   * Récupère tous les emojis par catégorie
   * @returns Structure des emojis par catégorie
   */
  getEmojisByCategory: () => Record<string, string[]>;
}

/**
 * Implémentation du service emoji
 * Utilise les utilitaires centralisés pour la gestion des emojis et les appels API pour les réactions
 */
export class EmojiService implements EmojiServiceInterface {
  private service: MattermostService;

  /**
   * Crée une instance du service emoji
   * @param service Service Mattermost pour les appels API
   */
  constructor(service: MattermostService) {
    this.service = service;

    // Initialiser les GIFs mockés pour le développement
    this.initMockGifs();
  }

  /**
   * Initialise les GIFs mockés pour le développement
   */
  private initMockGifs(): void {
    // Cette fonction pourrait charger des données de GIFs de test
    // Elle est vide pour l'instant car nous utilisons des données statiques
  }

  /**
   * Convertit un caractère emoji en nom utilisable par l'API
   * Utilise notre utilitaire centralisé
   */
  getEmojiName(emoji: string): string {
    return getEmojiName(emoji);
  }

  /**
   * Convertit un nom d'emoji en caractère
   * Utilise notre utilitaire centralisé
   */
  getEmojiFromName(emojiName: string): string | undefined {
    return getEmojiFromName(emojiName);
  }

  /**
   * Recherche des emojis correspondant à un terme
   * @param query Terme de recherche
   * @returns Emojis correspondants
   */
  searchEmojis(query: string): string[] {
    return searchEmojis(query);
  }

  /**
   * Ajoute une réaction emoji à un message
   * @param messageId ID du message
   * @param emoji Emoji à ajouter
   */
  async addReaction(messageId: string, emoji: string): Promise<any> {
    if (!messageId || !emoji) {
      throw new Error("ID de message et emoji requis");
    }

    try {
      // Convertir l'emoji en nom API
      const emojiName = this.getEmojiName(emoji);

      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.addReaction(messageId, emojiName);
    } catch (error) {
      console.error(`Erreur lors de l'ajout de la réaction:`, error);
      throw error;
    }
  }

  /**
   * Supprime une réaction emoji d'un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à supprimer
   */
  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    if (!channelId || !messageId || !emoji) {
      throw new Error("channelId, messageId et emoji requis");
    }

    try {
      // Convertir l'emoji en nom API
      const emojiName = this.getEmojiName(emoji);

      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.removeReaction(channelId, messageId, emojiName);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la réaction:`, error);
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur actuel a ajouté une réaction à un message
   * @param channelId ID du canal
   * @param messageId ID du message
   * @param emoji Emoji à vérifier
   */
  async hasReacted(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<boolean> {
    if (!channelId || !messageId || !emoji) {
      return false;
    }

    try {
      // Convertir l'emoji en nom API
      const emojiName = this.getEmojiName(emoji);

      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.hasReacted(channelId, messageId, emojiName);
    } catch (error) {
      console.error(`Erreur lors de la vérification de la réaction:`, error);
      return false;
    }
  }

  /**
   * Recherche des GIFs
   * @param query Terme de recherche
   * @param category Catégorie optionnelle
   */
  async searchGifs(query: string, category?: string): Promise<GifData[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      // Si l'API réelle est activée
      if (GIF_API_CONFIG.USE_API_PROVIDER) {
        const apiUrl = buildGifApiUrl("search", query, category);
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Erreur API GIF: ${response.status}`);
        }

        const data = await response.json();
        return parseGifApiResponse(data, GIF_API_CONFIG.PROVIDER);
      }

      // Sinon, utiliser le service sous-jacent
      return await this.service.searchGifs(query, category);
    } catch (error) {
      console.error("Erreur lors de la recherche de GIFs:", error);
      return [];
    }
  }

  /**
   * Récupère les GIFs tendance ou par catégorie
   * @param category Catégorie de GIFs
   * @param limit Nombre de résultats maximum
   */
  async getGifs(category: string, limit: number = 20): Promise<GifData[]> {
    if (!category) {
      return [];
    }

    try {
      // Si l'API réelle est activée
      if (GIF_API_CONFIG.USE_API_PROVIDER) {
        const apiUrl = buildGifApiUrl(
          category.toLowerCase() === "trending" ? "trending" : "category",
          undefined,
          category,
        );

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Erreur API GIF: ${response.status}`);
        }

        const data = await response.json();
        return parseGifApiResponse(data, GIF_API_CONFIG.PROVIDER);
      }

      // Sinon, utiliser le service sous-jacent
      return await this.service.getGifs(category, limit);
    } catch (error) {
      console.error(`Erreur lors de la récupération des GIFs:`, error);
      return [];
    }
  }

  /**
   * Récupère les emojis fréquemment utilisés par l'utilisateur
   */
  async getFrequentEmojis(): Promise<string[]> {
    try {
      // Essayer d'obtenir les emojis fréquents depuis le service Mattermost
      const emojis = await this.service.getFrequentEmojis().catch(() => null);

      // Si le service a réussi à renvoyer des emojis, les utiliser
      if (emojis && emojis.length > 0) {
        return emojis;
      }

      // Sinon, utiliser les emojis fréquents par défaut
      return DEFAULT_FREQUENT_EMOJIS;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des emojis fréquents:",
        error,
      );
      // Retourner une liste par défaut en cas d'erreur
      return DEFAULT_FREQUENT_EMOJIS;
    }
  }

  /**
   * Récupère tous les emojis supportés sous forme de mapping
   * @returns Map des emojis vers leurs noms API
   */
  getAllEmojisMap(): Record<string, string> {
    return EMOJI_NAMES;
  }

  /**
   * Récupère tous les emojis par catégorie
   * @returns Structure des emojis par catégorie
   */
  getEmojisByCategory(): Record<string, string[]> {
    return { ...EMOJI_MAP };
  }
}

/**
 * Crée un service emoji
 * @param service Service Mattermost pour les appels API
 * @returns Une instance du service emoji
 */
export function createEmojiService(
  service: MattermostService,
): EmojiServiceInterface {
  return new EmojiService(service);
}
