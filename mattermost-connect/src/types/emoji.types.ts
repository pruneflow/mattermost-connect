// src/types/emoji.types.ts
/**
 * Types pour les fonctionnalités liées aux emojis et aux GIFs
 */

/**
 * Mode d'utilisation du picker d'emoji
 */
export enum PickerMode {
  /** Mode pour envoyer un message */
  MESSAGE = "message",
  /** Mode pour ajouter une réaction */
  REACTION = "reaction",
}

/**
 * Interface pour les données de GIF
 */
export interface GifData {
  /** Identifiant unique du GIF */
  id: string;
  /** URL de prévisualisation (thumbnail) */
  preview: string;
  /** Titre du GIF */
  title: string;
  /** URL complète du GIF */
  url?: string;
}

/**
 * Résultat de la sélection d'un emoji
 */
export interface EmojiSelectionResult {
  /** Emoji sélectionné (caractère Unicode) */
  emoji: string;
  /** Nom de l'emoji pour l'API Mattermost */
  emojiName: string;
  /** Type de contenu (emoji ou gif) */
  type: "emoji" | "gif";
  /** ID du GIF si type=gif */
  gifId?: string;
  /** URL du GIF si type=gif */
  gifUrl?: string;
}

/**
 * Props pour le composant EmojiPicker
 */
export interface EmojiPickerProps {
  /** Callback quand un emoji est sélectionné */
  onSelect?: (result: EmojiSelectionResult) => void;

  /** Callback pour fermer le sélecteur */
  onClose?: () => void;

  /** Mode d'utilisation du picker */
  mode?: PickerMode;

  /** ID du message pour lequel ajouter une réaction (si mode=REACTION) */
  messageId?: string;

  /** ID du canal */
  channelId?: string;

  /** Props de style supplémentaires */
  sx?: React.CSSProperties;
}

/**
 * Props pour le composant EmojiPickerContent
 */
export interface EmojiPickerContentProps {
  /** Callback lorsqu'un emoji est sélectionné */
  onEmojiSelect: (emoji: string, emojiName: string) => void;

  /** Valeur de recherche */
  searchQuery: string;

  /** Catégorie active */
  activeCategory: string;

  /** Liste des emojis fréquemment utilisés */
  frequentEmojis?: string[];
}

/**
 * Props pour le composant GifPickerContent
 */
export interface GifPickerContentProps {
  /** Callback lorsqu'un GIF est sélectionné */
  onGifSelect: (gifId: string, gifUrl?: string) => void;

  /** Valeur de recherche */
  searchQuery: string;

  /** Catégorie active */
  activeCategory: string;

  /** Liste des GIFs à afficher */
  gifs: GifData[];

  /** État de chargement */
  loading: boolean;
}

/**
 * Props pour le composant EmojiPickerCategoryBar
 */
export interface CategoryBarProps {
  /** Liste des catégories */
  categories: string[];

  /** Catégorie active */
  activeCategory: string;

  /** Callback quand une catégorie est sélectionnée */
  onCategoryChange: (category: string) => void;

  /** Mapping des icônes par catégorie */
  categoryIcons?: Record<string, React.ReactNode>;

  /** Afficher uniquement les icônes (mobile) */
  iconsOnly?: boolean;
}

/**
 * Interface du contexte pour les emoji
 * Utilise désormais le service Mattermost centralisé au lieu d'un service emoji spécifique
 */
export interface EmojiContextType {
  // Emojis
  frequentEmojis: string[];
  activeEmojiCategory: string;
  setActiveEmojiCategory: (category: string) => void;
  emojiCategories: string[];

  // GIFs
  activeGifCategory: string;
  setActiveGifCategory: (category: string) => void;
  gifCategories: string[];
  gifs: GifData[];
  loadingGifs: boolean;

  // Recherche
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Fonctions
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (
    channelId: string,
    messageId: string,
    emoji: string,
  ) => Promise<void>;
  hasReacted: (
    channelId: string,
    messageId: string,
    emoji: string,
  ) => Promise<boolean>;
  searchGifs: (query: string) => Promise<void>;
}
