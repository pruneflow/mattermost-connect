// src/components/EmojiPicker/types.ts
// Types pour le module EmojiPicker

/**
 * Mode d'utilisation du picker
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
  id: string;
  preview: string;
  title: string;
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
}

/**
 * Props pour le composant CategoryBar
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
