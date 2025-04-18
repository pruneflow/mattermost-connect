// src/services/emoji/emoji.service.ts
import { MattermostService } from "../base";
import { GifData } from "../../types";

/**
 * Interface pour le service emoji
 * Ce service spécialisé gère les émojis et GIFs
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
  getEmojiFromName: (emojiName: string) => string | null;
}

/**
 * Implémentation du service emoji
 */
export class EmojiService implements EmojiServiceInterface {
  private service: MattermostService;
  private emojiNameMap: Record<string, string> = {
    "👍": "thumbsup",
    "❤️": "heart",
    "😂": "joy",
    "🎉": "tada",
    "🔥": "fire",
    "👏": "clap",
    "✅": "white_check_mark",
    "🙏": "pray",
  };

  private emojiCharMap: Record<string, string> = {};

  /**
   * Crée une instance du service emoji
   * @param service Service Mattermost pour les appels API
   */
  constructor(service: MattermostService) {
    this.service = service;

    // Initialiser la map inverse pour getEmojiFromName
    Object.entries(this.emojiNameMap).forEach(([emoji, name]) => {
      this.emojiCharMap[name] = emoji;
    });
  }

  /**
   * Convertit un caractère emoji en nom utilisable par l'API
   * @param emoji Caractère emoji
   * @returns Nom de l'emoji pour l'API
   */
  getEmojiName(emoji: string): string {
    return this.emojiNameMap[emoji] || emoji;
  }

  /**
   * Convertit un nom d'emoji en caractère
   * @param emojiName Nom de l'emoji
   * @returns Caractère emoji correspondant
   */
  getEmojiFromName(emojiName: string): string | null {
    return this.emojiCharMap[emojiName] || null;
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
      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.addReaction(messageId, emoji);
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
      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.removeReaction(channelId, messageId, emoji);
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
      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.hasReacted(channelId, messageId, emoji);
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
      // Utiliser directement le service Mattermost sous-jacent
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
      // Utiliser directement le service Mattermost sous-jacent
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
      // Utiliser directement le service Mattermost sous-jacent
      return await this.service.getFrequentEmojis();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des emojis fréquents:",
        error,
      );
      // Retourner une liste par défaut en cas d'erreur
      return ["👍", "❤️", "😂", "🎉", "🔥", "👏", "✅", "🙏"];
    }
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
