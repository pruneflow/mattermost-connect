/**
 * Mapping des emojis pour le sprite sheet
 * Basé sur le système utilisé par Mattermost
 */

// Constantes pour le calcul des positions
export const EMOJI_SIZE = 64; // Taille de base d'un emoji
export const EMOJI_PADDING = 1; // Bordure de 1px autour de chaque emoji
export const EMOJI_SIZE_PADDED = EMOJI_SIZE + (EMOJI_PADDING * 2); // 66px au total

// Utilisation du sprite local dans le projet
export const EMOJI_SPRITE_PATH = '../../assets/sprite_mm.png';

// URL complète du sprite sheet (sera calculée à l'utilisation)
// Utilisation de l'import dynamique qui fonctionne avec Webpack/Rollup
import spriteImage from '../assets/sprite_mm.png';
export let EMOJI_SPRITE_URL = spriteImage;

// Catégories d'emoji standards
export const EMOJI_CATEGORIES = [
  'recent',
  'smileys-emotion',
  'people-body',
  'animals-nature',
  'food-drink',
  'travel-places',
  'activities',
  'objects',
  'symbols',
  'flags'
];

// Noms des catégories pour l'affichage
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'recent': 'Récents',
  'smileys-emotion': 'Smileys & Émotion',
  'people-body': 'Personnes & Corps',
  'animals-nature': 'Animaux & Nature',
  'food-drink': 'Nourriture & Boissons',
  'travel-places': 'Voyages & Lieux',
  'activities': 'Activités',
  'objects': 'Objets',
  'symbols': 'Symboles',
  'flags': 'Drapeaux'
};

/**
 * Calcule la position dans le sprite sheet pour un emoji à partir de ses coordonnées
 * @param sheetX Coordonnée X dans le sprite (basée sur un index, pas en pixels)
 * @param sheetY Coordonnée Y dans le sprite (basée sur un index, pas en pixels)
 * @returns L'objet avec les positions CSS pour le background-position
 */
export function getEmojiPosition(sheetX: number, sheetY: number): string {
  // Formule adaptée pour notre CSS avec background-size: 1320px 1320px
  // Calcul basé sur la nouvelle taille du sprite (1320px = 20 colonnes * 66px)
  const x = -66 * sheetX;
  const y = -66 * sheetY; 
  
  return `${x}px ${y}px`;
}

/**
 * Initialiser l'URL du sprite sheet 
 * Avec le sprite local, pas besoin de paramètres serveur
 */
export function initEmojiSpriteUrl(): string {
  // Sprite déjà importé directement, pas besoin de calcul
  return EMOJI_SPRITE_URL;
}

/**
 * Génère le style CSS pour un emoji à partir de ses coordonnées dans le sprite
 * @param unified Code unifié de l'emoji
 * @param sheetX Coordonnée X dans le sprite
 * @param sheetY Coordonnée Y dans le sprite
 * @returns L'objet de style pour l'emoji
 */
export function getEmojiStyle(sheetX: number, sheetY: number): React.CSSProperties {
  // URL du sprite directement importée, pas besoin de calcul
  return {
    backgroundImage: `url(${EMOJI_SPRITE_URL})`,
    backgroundPosition: getEmojiPosition(sheetX, sheetY),
    backgroundRepeat: 'no-repeat',
    width: `${EMOJI_SIZE}px`,
    height: `${EMOJI_SIZE}px`,
    display: 'inline-block',
    transform: 'scale(0.35)',
    transformOrigin: 'center',
    // Optimisations de performance
    willChange: 'transform',
    transition: 'transform 0.1s ease-in-out',
  };
}

/**
 * Structure de données pour un emoji
 */
export interface EmojiData {
  name: string;
  unified: string;
  short_name: string;
  short_names: string[];
  sheet_x: number;
  sheet_y: number;
  category: string;
  subcategory?: string;
  skin_variations?: Record<string, {
    unified: string;
    sheet_x: number;
    sheet_y: number;
  }>;
}

// Note: Le fichier complet emojiData.ts sera généré séparément avec les données complètes des emojis
// Ce fichier ne contient que le mappage et les utilitaires pour le calcul des positions