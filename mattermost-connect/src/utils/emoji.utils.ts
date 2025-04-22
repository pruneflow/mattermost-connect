// src/utils/emoji.utils.ts
/**
 * Utilitaires centralisés pour la gestion des emojis
 * Fournit une source unique de vérité pour tous les noms d'emoji et leurs correspondances
 */

import { GifData } from "../types";

/**
 * Catégories standardisées pour les emojis
 */
export const EMOJI_CATEGORIES = [
  "Smileys & Emotion",
  "People & Body",
  "Animals & Nature",
  "Food & Drink",
  "Travel & Places",
  "Activities",
  "Objects",
  "Symbols",
  "Flags",
];

/**
 * Catégories pour les GIFs
 */
export const GIF_CATEGORIES = [
  "Trending",
  "Reactions",
  "Memes",
  "Celebs",
  "Sports",
  "TV",
  "Movies",
  "Animals",
];

/**
 * Mapping complet des emojis vers leurs noms pour l'API Mattermost
 * Ce mapping est utilisé par tous les services et composants qui interagissent avec les emojis
 */
export const EMOJI_NAMES: Record<string, string> = {
  // Smileys & Emotion
  "🎉": "tada",
  "😀": "grinning",
  "😃": "smiley",
  "😄": "smile",
  "😁": "grin",
  "😆": "laughing",
  "😅": "sweat_smile",
  "🤣": "rofl",
  "😂": "joy",
  "🙂": "slightly_smiling_face",
  "🙃": "upside_down_face",
  "😉": "wink",
  "😊": "blush",
  "😇": "innocent",
  "🥰": "smiling_face_with_3_hearts",
  "😍": "heart_eyes",
  "🤩": "star-struck",
  "😘": "kissing_heart",
  "😗": "kissing",
  "😚": "kissing_closed_eyes",
  "😙": "kissing_smiling_eyes",
  "😋": "yum",
  "😛": "stuck_out_tongue",
  "😜": "stuck_out_tongue_winking_eye",
  "🤪": "zany_face",
  "😝": "stuck_out_tongue_closed_eyes",
  "🤑": "money_mouth_face",
  "🤗": "hugs",
  "🤭": "face_with_hand_over_mouth",
  "🤫": "shushing_face",
  "🤔": "thinking_face",
  "🤐": "zipper_mouth_face",
  "🤨": "face_with_raised_eyebrow",
  "😐": "neutral_face",
  "😑": "expressionless",
  "😶": "no_mouth",
  "😏": "smirk",
  "😒": "unamused",
  "🙄": "roll_eyes",
  "😬": "grimacing",
  "😮": "open_mouth",
  "😯": "hushed",
  "😲": "astonished",
  "😳": "flushed",
  "🥺": "pleading_face",
  "😦": "frowning",
  "😧": "anguished",
  "😨": "fearful",
  "😰": "cold_sweat",
  "😥": "disappointed_relieved",
  "😢": "cry",
  "😭": "sob",
  "😱": "scream",
  "😖": "confounded",
  "😣": "persevere",
  "😞": "disappointed",
  "😓": "sweat",
  "😩": "weary",
  "😫": "tired_face",
  "🥱": "yawning_face",
  "😤": "triumph",
  "😡": "rage",
  "😠": "angry",
  "🤬": "face_with_symbols_on_mouth",
  "😈": "smiling_imp",
  "👿": "imp",
  "💀": "skull",
  "☠️": "skull_and_crossbones",
  "💩": "poop",
  "🤡": "clown_face",
  "👹": "japanese_ogre",
  "👺": "japanese_goblin",
  "👻": "ghost",
  "👽": "alien",
  "👾": "space_invader",
  "🤖": "robot",

  // People & Body
  "👋": "wave",
  "🤚": "raised_back_of_hand",
  "🖐️": "raised_hand_with_fingers_splayed",
  "✋": "hand",
  "🖖": "vulcan_salute",
  "👌": "ok_hand",
  "🤏": "pinching_hand",
  "✌️": "v",
  "🤞": "crossed_fingers",
  "🤟": "love_you_gesture",
  "🤘": "metal",
  "🤙": "call_me_hand",
  "👈": "point_left",
  "👉": "point_right",
  "👆": "point_up_2",
  "🖕": "middle_finger",
  "👇": "point_down",
  "☝️": "point_up",
  "👍": "thumbsup",
  "👎": "thumbsdown",
  "✊": "fist",
  "👊": "facepunch",
  "🤛": "fist_left",
  "🤜": "fist_right",
  "👏": "clap",
  "🙌": "raised_hands",
  "👐": "open_hands",
  "🤲": "palms_up_together",
  "🤝": "handshake",
  "🙏": "pray",
  "✍️": "writing_hand",
  "💅": "nail_care",
  "🤳": "selfie",
  "💪": "muscle",

  // Animals & Nature
  "🐶": "dog",
  "🐱": "cat",
  "🐭": "mouse",
  "🐹": "hamster",
  "🐰": "rabbit",
  "🦊": "fox_face",
  "🐻": "bear",
  "🐼": "panda_face",
  "🐨": "koala",
  "🐯": "tiger",
  "🦁": "lion",
  "🐮": "cow",
  "🐷": "pig",
  "🐸": "frog",
  "🐵": "monkey_face",
  "🙈": "see_no_evil",
  "🙉": "hear_no_evil",
  "🙊": "speak_no_evil",
  "🐒": "monkey",
  "🦍": "gorilla",
  "🦧": "orangutan",
  "🐔": "chicken",
  "🐧": "penguin",
  "🐦": "bird",
  "🐤": "baby_chick",
  "🦆": "duck",
  "🦅": "eagle",
  "🦉": "owl",
  "🦇": "bat",
  "🐺": "wolf",
  "🐗": "boar",
  "🐴": "horse",
  "🦄": "unicorn",
  "🐝": "bee",
  "🐛": "bug",
  "🦋": "butterfly",
  "🐌": "snail",
  "🐞": "lady_beetle",

  // Food & Drink
  "🍏": "green_apple",
  "🍎": "apple",
  "🍐": "pear",
  "🍊": "tangerine",
  "🍋": "lemon",
  "🍌": "banana",
  "🍉": "watermelon",
  "🍇": "grapes",
  "🍓": "strawberry",
  "🍈": "melon",
  "🍒": "cherries",
  "🍑": "peach",
  "🥭": "mango",
  "🍍": "pineapple",
  "🥥": "coconut",
  "🥝": "kiwi_fruit",
  "🍅": "tomato",
  "🍆": "eggplant",
  "🥑": "avocado",
  "🥦": "broccoli",
  "🍔": "hamburger",
  "🍟": "fries",
  "🍕": "pizza",
  "🌮": "taco",
  "🍣": "sushi",
  "🍦": "icecream",
  "🍰": "cake",
  "☕": "coffee",
  "🍺": "beer",
  "🍷": "wine_glass",
  "🥂": "clinking_glasses",

  // Travel & Places
  "🚗": "car",
  "🚕": "taxi",
  "✈️": "airplane",
  "🚀": "rocket",
  "🏠": "house",
  "🏡": "house_with_garden",
  "🏢": "office",
  "🏣": "post_office",
  "🏥": "hospital",
  "🏦": "bank",
  "🏨": "hotel",
  "🏛️": "classical_building",
  "⛪": "church",
  "🕌": "mosque",
  "🌃": "night_with_stars",
  "🌉": "bridge_at_night",
  "🌁": "foggy",

  // Activities
  "⚽": "soccer",
  "🏀": "basketball",
  "🏈": "football",
  "⚾": "baseball",
  "🎾": "tennis",
  "🏐": "volleyball",
  "🎱": "8ball",
  "🏓": "ping_pong",
  "🥊": "boxing_glove",
  "🎮": "video_game",
  "🎲": "game_die",
  "♟️": "chess_pawn",
  "🎯": "dart",
  "🎳": "bowling",

  // Objects
  "⌚": "watch",
  "📱": "iphone",
  "💻": "computer",
  "⌨️": "keyboard",
  "🖥️": "desktop_computer",
  "🖨️": "printer",
  "📷": "camera",
  "🔍": "mag",
  "🕯️": "candle",
  "💡": "bulb",
  "📕": "closed_book",
  "📗": "green_book",
  "📘": "blue_book",
  "📙": "orange_book",
  "📚": "books",
  "📒": "ledger",
  "📝": "memo",
  "💼": "briefcase",
  "📁": "file_folder",
  "🗂️": "card_index_dividers",

  // Symbols
  "❤️": "heart",
  "🧡": "orange_heart",
  "💛": "yellow_heart",
  "💚": "green_heart",
  "💙": "blue_heart",
  "💜": "purple_heart",
  "🖤": "black_heart",
  "🤍": "white_heart",
  "🤎": "brown_heart",
  "💔": "broken_heart",
  "💕": "two_hearts",
  "💞": "revolving_hearts",
  "💓": "heartbeat",
  "💗": "heartpulse",
  "💖": "sparkling_heart",
  "💘": "cupid",
  "💝": "gift_heart",
  "💯": "100",
  "✅": "white_check_mark",
  "❌": "x",
  "⭕": "o",
  "🚫": "no_entry_sign",
  "💤": "zzz",
  "🔴": "red_circle",
  "🟠": "orange_circle",
  "🟡": "yellow_circle",
  "🟢": "green_circle",
  "🔵": "large_blue_circle",
  "🟣": "purple_circle",
  "⚫": "black_circle",
  "⚪": "white_circle",
  "🟤": "brown_circle",

  // Flags (sélection limitée)
  "🏁": "checkered_flag",
  "🚩": "triangular_flag_on_post",
  "🎌": "crossed_flags",
  "🏴": "black_flag",
  "🏳️": "white_flag",
  "🏳️‍🌈": "rainbow_flag",
  "🏳️‍⚧️": "transgender_flag",
  "🏴‍☠️": "pirate_flag",
  "🇫🇷": "fr",
  "🇺🇸": "us",
  "🇬🇧": "gb",
  "🇪🇺": "eu",
};

/**
 * Mapping inverse pour obtenir l'emoji depuis le nom API
 */
export const EMOJI_CHARS: Record<string, string> = Object.entries(
  EMOJI_NAMES,
).reduce(
  (acc, [emoji, name]) => ({
    ...acc,
    [name]: emoji,
  }),
  {},
);

/**
 * Données structurées des emojis par catégorie
 */
export const EMOJI_MAP: Record<string, string[]> = {
  "Smileys & Emotion": [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "😋",
    "😛",
    "😜",
    "🤪",
    "😝",
    "🤑",
    "🤗",
    "🤭",
    "🤫",
    "🤔",
    "🤐",
    "🤨",
    "😐",
    "😑",
    "😶",
    "😏",
    "😒",
    "🙄",
    "😬",
    "😮",
    "😯",
    "😲",
    "😳",
    "🥺",
    "😦",
    "😧",
    "😨",
    "😰",
    "😥",
    "😢",
    "😭",
    "😱",
    "😖",
    "😣",
    "😞",
    "😓",
    "😩",
    "😫",
    "🥱",
    "😤",
    "😡",
    "😠",
    "🤬",
    "😈",
    "👿",
    "💀",
    "☠️",
    "💩",
    "🤡",
    "👹",
    "👺",
    "👻",
    "👽",
    "👾",
    "🤖",
  ],
  "People & Body": [
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👍",
    "👎",
    "✊",
    "👊",
    "🤛",
    "🤜",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🤝",
    "🙏",
    "✍️",
    "💅",
    "🤳",
    "💪",
    "🦾",
    "🦿",
    "🦵",
    "🦶",
    "👂",
    "🦻",
    "👃",
    "🧠",
    "🦷",
    "🦴",
    "👀",
    "👁️",
    "👅",
    "👄",
  ],
  "Animals & Nature": [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐽",
    "🐸",
    "🐵",
    "🙈",
    "🙉",
    "🙊",
    "🐒",
    "🦍",
    "🦧",
    "🐔",
    "🐧",
    "🐦",
    "🐤",
    "🦆",
    "🦅",
    "🦉",
    "🦇",
    "🐺",
    "🐗",
    "🐴",
    "🦄",
    "🐝",
    "🐛",
    "🦋",
    "🐌",
    "🐞",
    "🐜",
    "🦟",
    "🦗",
    "🕷️",
    "🕸️",
    "🦂",
    "🐢",
    "🐍",
    "🦎",
  ],
  "Food & Drink": [
    "🍏",
    "🍎",
    "🍐",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🍈",
    "🍒",
    "🍑",
    "🥭",
    "🍍",
    "🥥",
    "🥝",
    "🍅",
    "🍆",
    "🥑",
    "🥦",
    "🍔",
    "🍟",
    "🍕",
    "🌮",
    "🍣",
    "🍦",
    "🍰",
    "☕",
    "🍺",
    "🍷",
    "🥂",
  ],
  "Travel & Places": [
    "🚗",
    "🚕",
    "✈️",
    "🚀",
    "🏠",
    "🏡",
    "🏢",
    "🏣",
    "🏥",
    "🏦",
    "🏨",
    "🏛️",
    "⛪",
    "🕌",
    "🌃",
    "🌉",
    "🌁",
  ],
  Activities: [
    "⚽",
    "🏀",
    "🏈",
    "⚾",
    "🎾",
    "🏐",
    "🎱",
    "🏓",
    "🥊",
    "🎮",
    "🎲",
    "♟️",
    "🎯",
    "🎳",
  ],
  Objects: [
    "⌚",
    "📱",
    "💻",
    "⌨️",
    "🖥️",
    "🖨️",
    "📷",
    "🔍",
    "🕯️",
    "💡",
    "📕",
    "📗",
    "📘",
    "📙",
    "📚",
    "📒",
    "📝",
    "💼",
    "📁",
    "🗂️",
  ],
  Symbols: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💯",
    "✅",
    "❌",
    "⭕",
    "🚫",
    "💤",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    "🔵",
    "🟣",
    "⚫",
    "⚪",
    "🟤",
  ],
  Flags: [
    "🏁",
    "🚩",
    "🎌",
    "🏴",
    "🏳️",
    "🏳️‍🌈",
    "🏳️‍⚧️",
    "🏴‍☠️",
    "🇫🇷",
    "🇺🇸",
    "🇬🇧",
    "🇪🇺",
  ],
};

/**
 * Obtient le nom API correspondant à un emoji
 * @param emoji Caractère emoji Unicode
 * @returns Nom de l'emoji pour l'API Mattermost, ou l'emoji lui-même si non trouvé
 */
export function getEmojiName(emoji: string): string {
  return EMOJI_NAMES[emoji] || emoji;
}

/**
 * Obtient l'emoji correspondant à un nom API
 * @param name Nom de l'emoji pour l'API Mattermost
 * @returns Caractère emoji correspondant, ou undefined si non trouvé
 */
export function getEmojiFromName(name: string): string | undefined {
  return EMOJI_CHARS[name];
}

/**
 * Recherche des emojis correspondant à un terme de recherche
 * @param query Terme de recherche
 * @returns Tableau d'emojis correspondants
 */
export function searchEmojis(query: string): string[] {
  if (!query.trim()) return [];

  const queryLower = query.toLowerCase();
  const results: string[] = [];

  // Rechercher par caractère emoji et par nom
  Object.entries(EMOJI_NAMES).forEach(([emoji, name]) => {
    if (emoji.includes(queryLower) || name.toLowerCase().includes(queryLower)) {
      results.push(emoji);
    }
  });

  return results;
}

/**
 * Liste des emojis fréquemment utilisés par défaut
 */
export const DEFAULT_FREQUENT_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "🎉",
  "🔥",
  "👏",
  "✅",
  "🙏",
];

/**
 * Configuration de l'API pour les GIFs
 */
export const GIF_API_CONFIG = {
  // Définir à true pour utiliser l'API Giphy/Tenor en production
  USE_API_PROVIDER: false,

  // API à utiliser (giphy | tenor)
  PROVIDER: "giphy" as "giphy" | "tenor",

  // Clé API (à remplacer par votre propre clé)
  API_KEY: "YOUR_API_KEY_HERE",

  // URLs de base pour les différentes API
  GIPHY: {
    BASE_URL: "https://api.giphy.com/v1/gifs",
    SEARCH_ENDPOINT: "/search",
    TRENDING_ENDPOINT: "/trending",
    CATEGORIES_ENDPOINT: "/categories",
  },

  TENOR: {
    BASE_URL: "https://tenor.googleapis.com/v2",
    SEARCH_ENDPOINT: "/search",
    TRENDING_ENDPOINT: "/trending",
    CATEGORIES_ENDPOINT: "/categories",
  },

  // Paramètres par défaut pour les requêtes
  DEFAULT_PARAMS: {
    limit: 20,
    rating: "g", // G-rated content only
  },
};

/**
 * Construit l'URL de l'API GIF pour différentes requêtes
 * @param type Type de requête ('search', 'trending', 'category')
 * @param query Terme de recherche (pour search uniquement)
 * @param category Catégorie (pour category uniquement)
 * @returns URL complète pour la requête API
 */
export function buildGifApiUrl(
  type: "search" | "trending" | "category",
  query?: string,
  category?: string,
): string {
  const config = GIF_API_CONFIG;
  const isGiphy = config.PROVIDER === "giphy";
  const baseUrl = isGiphy ? config.GIPHY.BASE_URL : config.TENOR.BASE_URL;

  let endpoint = "";
  let params = new URLSearchParams();

  // Ajouter la clé API
  params.append(isGiphy ? "api_key" : "key", config.API_KEY);

  // Ajouter la limite
  params.append("limit", config.DEFAULT_PARAMS.limit.toString());

  // Configuration spécifique selon le type
  switch (type) {
    case "search":
      endpoint = isGiphy
        ? config.GIPHY.SEARCH_ENDPOINT
        : config.TENOR.SEARCH_ENDPOINT;
      if (query) {
        params.append("q", query);
      }
      break;
    case "trending":
      endpoint = isGiphy
        ? config.GIPHY.TRENDING_ENDPOINT
        : config.TENOR.TRENDING_ENDPOINT;
      break;
    case "category":
      endpoint = isGiphy
        ? config.GIPHY.CATEGORIES_ENDPOINT
        : config.TENOR.CATEGORIES_ENDPOINT;
      if (category && isGiphy) {
        // Giphy utilise un paramètre spécifique pour les catégories
        params.append("tag", mapGifCategoryToApiTag(category));
      } else if (category) {
        // Tenor utilise un endpoint différent
        endpoint = `${config.TENOR.CATEGORIES_ENDPOINT}/${mapGifCategoryToApiTag(category)}`;
      }
      break;
  }

  // Ajouter le rating pour Giphy (G-rated content)
  if (isGiphy) {
    params.append("rating", config.DEFAULT_PARAMS.rating);
  }

  return `${baseUrl}${endpoint}?${params.toString()}`;
}

/**
 * Mappe les catégories internes vers les tags d'API
 */
function mapGifCategoryToApiTag(category: string): string {
  const mappings: Record<string, string> = {
    Trending: "trending",
    Reactions: "reactions",
    Memes: "memes",
    Celebs: "celebrities",
    Sports: "sports",
    TV: "tv",
    Movies: "movies",
    Animals: "animals",
  };

  return mappings[category] || category.toLowerCase();
}

/**
 * Parse la réponse de l'API en format GifData[]
 * @param data Données brutes de l'API
 * @param provider Fournisseur API ('giphy' ou 'tenor')
 * @returns Tableau formaté de GifData
 */
export function parseGifApiResponse(
  data: any,
  provider: "giphy" | "tenor" = "giphy",
): GifData[] {
  if (!data) return [];

  try {
    if (provider === "giphy") {
      // Format pour Giphy
      return data.data.map((item: any) => ({
        id: item.id,
        preview: item.images.fixed_width.url,
        title: item.title,
        url: item.images.original.url,
      }));
    } else {
      // Format pour Tenor
      return data.results.map((item: any) => ({
        id: item.id,
        preview: item.media_formats.tinygif.url,
        title: item.title,
        url: item.media_formats.gif.url,
      }));
    }
  } catch (error) {
    console.error("Error parsing API response:", error);
    return [];
  }
}

export default {
  EMOJI_CATEGORIES,
  EMOJI_NAMES,
  EMOJI_CHARS,
  EMOJI_MAP,
  getEmojiName,
  getEmojiFromName,
  searchEmojis,
  DEFAULT_FREQUENT_EMOJIS,
  GIF_CATEGORIES,
  GIF_API_CONFIG,
  buildGifApiUrl,
  parseGifApiResponse,
};
