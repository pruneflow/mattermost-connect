// src/components/EmojiPicker/index.ts
/**
 * Export principal du module EmojiPicker
 * Permet d'accéder facilement aux composants et fonctionnalités liés aux emojis
 */

// Composants
export { default as EmojiPicker } from "./EmojiPicker";
export { default as EmojiPickerContent } from "./EmojiPickerContent";
export { default as GifPickerContent } from "./GifPickerContent";
export { default as CategoryBar } from "./CategoryBar";

// Types
export { PickerMode } from "../../../types";
export type {
  EmojiPickerProps,
  EmojiPickerContentProps,
  GifPickerContentProps,
  CategoryBarProps,
  EmojiSelectionResult,
  GifData,
} from "../../../types";

// Utilitaires et données
export {
  getEmojiName,
  getEmojiFromName,
  EMOJI_CATEGORIES,
  EMOJI_MAP,
  EMOJI_NAMES,
} from "./data/emojiData";

export {
  GIF_CATEGORIES,
  GIF_API_CONFIG,
  MOCK_GIFS,
  buildApiUrl,
  parseApiResponse,
} from "./data/gifData";

// Context et hooks
export { useEmoji } from "../../../context/EmojiProvider";

// Icônes standard pour les catégories
export { DEFAULT_CATEGORY_ICONS } from "./CategoryBar";
