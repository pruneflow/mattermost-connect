// src/context/index.ts
/**
 * Exporte tous les contextes et providers de la bibliothèque
 * Pour faciliter les imports et assurer la cohérence
 */

// Réexporter le contexte Mattermost principal
export {
  MattermostProvider,
  useMattermost,
  MattermostContext,
  type MattermostContextType,
} from "./MattermostProvider";

// Réexporter le contexte Emoji si présent
export { EmojiProvider, useEmoji, EmojiContext } from "./EmojiProvider";

// Ajouter d'autres contextes au besoin
// export { ... } from './OtherContext';
