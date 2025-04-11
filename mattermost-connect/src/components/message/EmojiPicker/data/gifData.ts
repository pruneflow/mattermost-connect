// src/components/EmojiPicker/data/gifData.ts
/**
 * Configuration pour l'intégration API des GIFs
 *
 * Ce fichier est configuré pour fonctionner avec l'API Giphy ou Tenor.
 * Pour une utilisation en production, remplacez la clé API par la vôtre
 * et activez le mode API en définissant USE_API_PROVIDER à true.
 */

import { GifData } from "../../../../types";

// Catégories standard pour les GIFs
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

// Configuration de l'API
export const GIF_API_CONFIG = {
  // Définir à true pour utiliser l'API Giphy/Tenor en production
  USE_API_PROVIDER: false,

  // API à utiliser (giphy | tenor)
  PROVIDER: "giphy",

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
 * URL de prévisualisations GIF réelles pour le développement
 * Ces URLs sont pour des prévisualisations et peuvent être utilisées en développement
 */
export const REAL_PREVIEW_URLS: Record<string, string[]> = {
  Trending: [
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnh6ZXlxeXR5azYxNHNsMndhYnU3bGZvMXdqdjlnOXQ2dmNubjl4aiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4Zo41lhzKt6iZ8xff9/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHR6bG05ZzdwMWE0dnRxZzdiaDQ0Z2xneXAwZXZleHhjNnk1ZWEydiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3NtY188QaxDdC/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHpzMmVoaGx5cWJ0Z2FqYmJxdnduYnJ0NXI1aGlhdm00NTkyNGJ2MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BzyTuYCmvSORqs1ABM/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWt6azI1endyNDRnbTE3aW14dm95aWl2Z2tjdjV2dHBrejB2MWI1ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTiIzJSKB4l7xTouE8/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjh5bXZrYnR1a3B5NzJiZjRoajgydXN1aHQwNnAwc2theHZ3OHJzaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BlWF2vzpIPB0A/200w_d.gif",
  ],
  Reactions: [
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTl6ejgydmdyMXkzNWlxZHFkdmw3bnRvZDJjM2Vud2p1MXo3bHo5aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/DhstvI3zZ598Nb1rFf/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2h0MmoyZ3Z3YnU2eWdxZTE5YnZmZDJ3YXBnZXlxbHZnbW12MjJxZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2K5jinAlChoCLS/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnYxcmQ1NG82bjlvNmJibnhkdjdsYmFzcGY3aW1xcnFscDJzZTc2ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/S5n7Wkhhw5A2IrfKER/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWI3bzF6bTA0aTQ2cGNhemc2dzhiM2I1cmFoMGh3ZG5haXQxaDhxZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufmAlKt4ne2JDnq/200w_d.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmNjODVoZ3ducmh1a3oxbnRuNHBiMjF3a2hqdnl2NXM4emluNnRlayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1BXa2alBcDy6ZswVfe/200w_d.gif",
  ],
  Memes: [
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGd3a3ZwcHJpbG9iMnhkcXA0Z2tiMHh6MzhnbmU1Y2dzanJleTJucyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kHU8W94VS329y/200w_d.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzg5dXUzNWs1aTZ3ZWRxY3F5dHMyend3OTV6cmNuc3B1YzVtNXkyciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Yavo0SXhZYhSo/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWFlZ2dzdDdwMTBmaHZzZzRwMWVwNjU2ZnZrcGJnaTF6c3l6YmV1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/x0vMYz2R5OQXXgGny7/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXphdGNzbzA3bXN6Y3phejhzdWo0OHUwcWczYXJ0azN5enI4NnVleiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2JehQ2GitHGdVG9y/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExa21kdDl4c2p5YW03OTZ6c3h0cmdzcGViZHc5ZnFzZXI4MnkzempxdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1r91ZwKJ1ovRGF1s6d/200w_d.gif",
  ],
  Celebs: [
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDAxcWVmczlkenJkcXhoMDc2YWt6dHU5NHRncnlha3lpemIyODQxdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/j2Z7l1NxssaL1UzRyb/200w_d.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2kwYjY0cXN0am1vYnFkbmQ5NGhva3c5eGNoNTBicnBvaXRoOW5nYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4HodBpDmoB5lvruo/200w_d.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2hicTZoaGV5cnhucWl6eWM2Z2ZvcTN0YnkyZDltMXE5ZzR2cDl3NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kDBWAI9DRRbwZwJU7j/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWR6Y2Q1cjF1ampiaTNqcnQ0bm0wYzE2cW8xY201NGE3Z29lb2p0MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d3mlE7uhX8KFgEmY/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjJpZm4zenQwOHQzY2VwYWpqdmtsZDF5aWhudDV4NDJyZnUwaDJicSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/AJcXhd5zvBMIg/200w_d.gif",
  ],
  Sports: [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzJnNXdwaHN1NjgycXYxMHRoNTJkaGlveDM5ZWlydXQxcHF0Yjk0NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5xtDarLUQd5DqgXHJks/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmN5dm1jOGtmY3RjZGZiMnZmaXgzaXgyZWRqaTBqZzl2NjRnYWtwMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WvuTFk2IN7jxoLVJQz/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWhucnc3bGV6cXUwNmd0ZjBxb2RrbDc3aG9ubHZuYmQ1bWhyMzkyZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o85xJY7YvADRuAFKo/200w_d.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNnlneHRmdTFieGJ0MnU0bnpuYXdjY3h1YndxcnpvZTN2cHgxcHozZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ejDxbDaxZZkeQmr0yu/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWJjNmN2NnJhc3VoNXVzODR2eHAxdzRyMGl0cmswOG00OWhhOGZrbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OUkvwo7NZGwDDVPNMl/200w_d.gif",
  ],
  TV: [
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHV4OHVsem85aTVyZXptNXA5cmZxZ3AwdmpmeGpnbmZkMHBrMHkzNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/pUeXcg80cO8I8/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWNlMnRodGNyNGc3N2J2cW5qNGxjZjF0MmdvbTB5ZzNnNzBpemw1cSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Exk8EUzSLsrErEQ/200w_d.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHVhanRjNTRsbWdodjZubWJ0NWl4N2JxZzk3ZDdzdjliaXkxb3BucCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lT4sgXSUuIJMs9FZdO/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExY2dtZzRzdXNjbzNuN3BnMmtqNXp3MzgwcHhiODdtOWQ2cnZjYndweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YE5RrQAC1g7PW/200w_d.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndveGg1OTI2Y2FzNnRha2ZzZ21iYWV0cGY1Z241cGt2ZzFseWlwNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/JRF85D7Ao1hhCD9ymx/200w_d.gif",
  ],
  Movies: [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExazdmczlkbjlsNmI1bnZqMWIwYTJpcHk3MnJ1djdpbXRxdDViOHhuNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SbdDzU2QYWA24/200w_d.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExd201Z3NnbjU2bWZjczljaGJiMTZ2emNhMzRxbjZmeWtkNnNvN2lvNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LdOyjZ7io5Msw/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG54OHh2c2x3ZXhpZDZvbGc0azYxeGR3YndjY3UyNHR4Z2dpanRmMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/zXKHMTLjEgVYpgMmt1/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3F0Mm1hMmRrMTJ6djN0MjMwcDE3dmQzOHJ2ODhpOThrMzhweGdxeSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEduFvBfM48IlhjJ6/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3lwZDdsNTlsYjlncnlnZWZ1aG1uaW5sbHNjNWRpd3d1N2F0cmpodSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4FmAj1XiioCVW/200w_d.gif",
  ],
  Animals: [
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWMxMXYwcHVnODdxbXY5dmk3dXRtd2tsYWJuZnA5azU2MTI2dWkxcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vFKqnCdLPNOKc/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXNscmZyM21tc3BnZ2V2a2N1d2MxNW45a2R1cWtocDlpNHZwZzE5eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26FPvntWVkwaRWgXS/200w_d.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZxYjcyeXA3NGw5a2ZtZmt1dmNneW1ldG8ydWwzcDdwMnlweWcxbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EatwJZRUIv41G/200w_d.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXNzczZucWE0MXFhbG9naGdodDIyYm9qbjltZmszcjBiZGp3NG9sZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oriO0OEd9QIDdllqo/200w_d.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGE1MHhtYnBzOGZvd3o2MTN0NDk5MDN4M2hmNnRkcnYxdzY1cGllYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tBxyh2hbwMiqc/200w_d.gif",
  ],
};

/**
 * Fonction pour construire les GIFs par catégorie avec des données réelles
 * Cette fonction est utilisée en développement quand USE_API_PROVIDER est false
 */
export const buildMockGifs = (): Record<string, GifData[]> => {
  const result: Record<string, GifData[]> = {};

  Object.keys(REAL_PREVIEW_URLS).forEach((category) => {
    result[category] = REAL_PREVIEW_URLS[category].map((preview, index) => ({
      id: `${category.toLowerCase()}-${index}`,
      preview: preview,
      title: `${category} GIF ${index + 1}`,
      url: preview.replace("200w_d.gif", "giphy.gif"), // URL complète (simulation)
    }));
  });

  return result;
};

/**
 * Données GIF préconstruites pour le développement
 */
export const MOCK_GIFS = buildMockGifs();

/**
 * Construit l'URL de l'API pour différentes requêtes
 *
 * @param type Type de requête ('search', 'trending', 'category')
 * @param query Terme de recherche (pour search uniquement)
 * @param category Catégorie (pour category uniquement)
 * @returns URL complète pour la requête API
 */
export const buildApiUrl = (
  type: "search" | "trending" | "category",
  query?: string,
  category?: string,
): string => {
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
        params.append("tag", mapCategoryToApiTag(category));
      } else if (category) {
        // Tenor utilise un endpoint différent
        endpoint = `${config.TENOR.CATEGORIES_ENDPOINT}/${mapCategoryToApiTag(category)}`;
      }
      break;
  }

  // Ajouter le rating pour Giphy (G-rated content)
  if (isGiphy) {
    params.append("rating", config.DEFAULT_PARAMS.rating);
  }

  return `${baseUrl}${endpoint}?${params.toString()}`;
};

/**
 * Mappe les catégories internes vers les tags d'API
 */
const mapCategoryToApiTag = (category: string): string => {
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
};

/**
 * Parse la réponse de l'API en format GifData[]
 *
 * @param data Données brutes de l'API
 * @param provider Fournisseur API ('giphy' ou 'tenor')
 * @returns Tableau formaté de GifData
 */
export const parseApiResponse = (
  data: any,
  provider: "giphy" | "tenor",
): GifData[] => {
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
};

export default {
  GIF_CATEGORIES,
  GIF_API_CONFIG,
  MOCK_GIFS,
  buildApiUrl,
  parseApiResponse,
};
