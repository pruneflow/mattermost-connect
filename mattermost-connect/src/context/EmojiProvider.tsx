// src/context/EmojiProvider.tsx
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
import { EMOJI_CATEGORIES, GIF_CATEGORIES } from "../utils";

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
 * Utilise le service emoji centralisé pour toutes les opérations
 */
export const EmojiProvider: React.FC<EmojiProviderProps> = ({ children }) => {
  const { services } = useMattermost();

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

  // Charger les emojis fréquents lorsque le service est disponible
  useEffect(() => {
    if (!services?.emojiService) return;

    const loadFrequentEmojis = async () => {
      try {
        const emojis = await services.emojiService.getFrequentEmojis();
        setFrequentEmojis(emojis);
      } catch (error) {
        console.error("Error loading frequent emojis:", error);
        // En cas d'erreur, le service retournera déjà une liste par défaut
      }
    };

    void loadFrequentEmojis();
  }, [services?.emojiService]);

  // Charger les GIFs lorsque la catégorie change
  useEffect(() => {
    if (!services?.emojiService || searchQuery) return;

    const loadGifs = async () => {
      setLoadingGifs(true);
      try {
        const gifData = await services.emojiService.getGifs(activeGifCategory);
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
  }, [services?.emojiService, activeGifCategory, searchQuery]);

  /**
   * Ajoute une réaction à un message
   */
  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<void> => {
      if (!services?.emojiService) return;

      try {
        await services.emojiService.addReaction(messageId, emoji);
      } catch (error) {
        console.error("Error adding reaction:", error);
        throw error;
      }
    },
    [services?.emojiService],
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
      if (!services?.emojiService) return;

      try {
        await services.emojiService.removeReaction(channelId, messageId, emoji);
      } catch (error) {
        console.error("Error removing reaction:", error);
        throw error;
      }
    },
    [services?.emojiService],
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
      if (!services?.emojiService) return false;

      try {
        return await services.emojiService.hasReacted(
          channelId,
          messageId,
          emoji,
        );
      } catch (error) {
        console.error("Error checking reaction:", error);
        return false;
      }
    },
    [services?.emojiService],
  );

  /**
   * Recherche des GIFs
   */
  const searchGifs = useCallback(
    async (query: string): Promise<void> => {
      if (!services?.emojiService || !query.trim()) return;

      setLoadingGifs(true);
      try {
        const results = await services.emojiService.searchGifs(query);
        setGifs(results);
      } catch (error) {
        console.error("Error searching GIFs:", error);
      } finally {
        setLoadingGifs(false);
      }
    },
    [services?.emojiService],
  );

  // Effectuer une recherche quand searchQuery change
  useEffect(() => {
    if (searchQuery) {
      void searchGifs(searchQuery);
    }
  }, [searchQuery, searchGifs]);

  // Construire la valeur du contexte
  const contextValue: EmojiContextType = {
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
