// src/context/EmojiProvider.tsx
/**
 * Context provider pour les fonctionnalités liées aux emojis
 * Gère l'état global et les fonctionnalités des emojis et GIFs
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// Import des types et interfaces
import { GifData, EmojiContextType } from "../types";
import { useMattermost } from "./MattermostProvider";
import {
  EmojiServiceInterface,
  createEmojiService,
} from "../services/emoji.service";
import { EMOJI_CATEGORIES } from "../components/EmojiPicker/data/emojiData";
import { GIF_CATEGORIES } from "../components/EmojiPicker/data/gifData";

// Créer le contexte avec une valeur par défaut
export const EmojiContext = createContext<EmojiContextType | null>(null);

/**
 * Hook pour utiliser le contexte emoji
 */
export const useEmoji = (): EmojiContextType => {
  const context = useContext(EmojiContext);
  if (!context) {
    throw new Error("useEmoji must be used within an EmojiProvider");
  }
  return context;
};

/**
 * Props pour le provider
 */
interface EmojiProviderProps {
  children: ReactNode;
}

/**
 * Provider pour les fonctionnalités d'emoji
 */
export const EmojiProvider: React.FC<EmojiProviderProps> = ({ children }) => {
  const { service } = useMattermost();

  // État du service
  const [emojiService, setEmojiService] =
    useState<EmojiServiceInterface | null>(null);

  // États pour les emojis
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>([]);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>(
    EMOJI_CATEGORIES[0],
  );

  // États pour les GIFs
  const [activeGifCategory, setActiveGifCategory] = useState<string>(
    GIF_CATEGORIES[0],
  );
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [loadingGifs, setLoadingGifs] = useState<boolean>(false);

  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Initialiser le service emoji lorsque le service Mattermost est disponible
  useEffect(() => {
    if (service) {
      const emojiServiceInstance = createEmojiService(service);
      setEmojiService(emojiServiceInstance);

      // Charger les emojis fréquemment utilisés
      const loadFrequentEmojis = async () => {
        try {
          const emojis = await emojiServiceInstance.getFrequentEmojis();
          setFrequentEmojis(emojis);
        } catch (error) {
          console.error("Error loading frequent emojis:", error);
        }
      };

      void loadFrequentEmojis();
    }
  }, [service]);

  // Charger les GIFs lorsque la catégorie change
  useEffect(() => {
    if (!emojiService || searchQuery) return;

    const loadGifs = async () => {
      setLoadingGifs(true);
      try {
        const gifData = await emojiService.getGifs(activeGifCategory);
        setGifs(gifData);
      } catch (error) {
        console.error(
          `Error loading GIFs for category ${activeGifCategory}:`,
          error,
        );
      } finally {
        setLoadingGifs(false);
      }
    };

    void loadGifs();
  }, [emojiService, activeGifCategory, searchQuery]);

  /**
   * Ajoute une réaction à un message
   */
  const addReaction = useCallback(
    async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<void> => {
      if (!emojiService) return;

      try {
        await emojiService.addReaction(channelId, messageId, emoji);
      } catch (error) {
        console.error("Error adding reaction:", error);
        throw error;
      }
    },
    [emojiService],
  );

  /**
   * Supprime une réaction d'un message
   */
  const removeReaction = useCallback(
    async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<void> => {
      if (!emojiService) return;

      try {
        await emojiService.removeReaction(channelId, messageId, emoji);
      } catch (error) {
        console.error("Error removing reaction:", error);
        throw error;
      }
    },
    [emojiService],
  );

  /**
   * Vérifie si l'utilisateur a réagi avec un emoji spécifique
   */
  const hasReacted = useCallback(
    async (
      channelId: string,
      messageId: string,
      emoji: string,
    ): Promise<boolean> => {
      if (!emojiService) return false;

      try {
        return await emojiService.hasReacted(channelId, messageId, emoji);
      } catch (error) {
        console.error("Error checking reaction:", error);
        return false;
      }
    },
    [emojiService],
  );

  /**
   * Recherche des GIFs
   */
  const searchGifs = useCallback(
    async (query: string): Promise<void> => {
      if (!emojiService || !query.trim()) return;

      setLoadingGifs(true);
      try {
        const results = await emojiService.searchGifs(query);
        setGifs(results);
      } catch (error) {
        console.error("Error searching GIFs:", error);
      } finally {
        setLoadingGifs(false);
      }
    },
    [emojiService],
  );

  // Effectuer une recherche quand searchQuery change
  useEffect(() => {
    if (searchQuery) {
      void searchGifs(searchQuery);
    }
  }, [searchQuery, searchGifs]);

  // Construire la valeur du contexte
  const contextValue: EmojiContextType = {
    // Services
    emojiService,

    // Emojis
    frequentEmojis,
    activeEmojiCategory,
    setActiveEmojiCategory,
    emojiCategories: EMOJI_CATEGORIES,

    // GIFs
    activeGifCategory,
    setActiveGifCategory,
    gifCategories: GIF_CATEGORIES,
    gifs,
    loadingGifs,

    // Recherche
    searchQuery,
    setSearchQuery,

    // Fonctions
    addReaction,
    removeReaction,
    hasReacted,
    searchGifs,
  };

  return (
    <EmojiContext.Provider value={contextValue}>
      {children}
    </EmojiContext.Provider>
  );
};

export default EmojiProvider;
