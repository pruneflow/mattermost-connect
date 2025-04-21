// src/services/emoji/index.ts
/**
 * Exporte le service pour la gestion des émojis et GIFs
 */
export * from "./emoji.service";

// Réexporter les utilitaires pour faciliter l'accès
export {
  EMOJI_CATEGORIES,
  EMOJI_NAMES,
  EMOJI_MAP,
  GIF_CATEGORIES,
  getEmojiName,
  getEmojiFromName,
  searchEmojis,
  DEFAULT_FREQUENT_EMOJIS,
} from "../../utils/emoji.utils";
