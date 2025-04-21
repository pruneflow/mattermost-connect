// src/components/message/EmojiPicker/index.ts
/**
 * Export principal du module EmojiPicker
 * Les données d'emoji sont maintenant gérées de manière centralisée par les utils et services
 */

// Composants
export { default as EmojiPicker } from "./EmojiPicker";
export { default as EmojiPickerContent } from "./components/EmojiPickerContent";
export { default as GifPickerContent } from "./components/GifPickerContent";
export { default as EmojiPickerCategoryBar } from "./components/EmojiPickerCategoryBar";

// Types
export { PickerMode } from "../../../types";

// Icônes standard pour les catégories
export { DEFAULT_CATEGORY_ICONS } from "./components/EmojiPickerCategoryBar";

// Réexporter les fonctions utilitaires depuis utils pour compatibilité descendante
export {
  getEmojiName,
  getEmojiFromName,
  EMOJI_CATEGORIES,
  EMOJI_MAP,
  EMOJI_NAMES,
  GIF_CATEGORIES,
  GIF_API_CONFIG,
} from "../../../utils/emoji.utils";
