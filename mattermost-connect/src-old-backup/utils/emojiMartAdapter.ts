/**
 * Adapter for emoji-mart to use with Mattermost APIs
 * Uses emoji-mart as the single source of truth for emoji data and operations
 */

import { api } from '../api/client';
import data from '@emoji-mart/data';
import { init, SearchIndex, getEmojiDataFromNative } from 'emoji-mart';

// Initialize emoji-mart with data
init({ data });

// Constants for emoji-mart
const EMOJI_MART_SKIN_STORAGE_KEY = 'emoji-mart.skin';
const DEFAULT_SKIN_TONE = 1; // Default is 1 (yellow/default)

// Mapping between emoji-mart skin indices and Mattermost skin tone names
export const SKIN_TONE_MAP: Record<number, string> = {
  2: 'light_skin_tone',
  3: 'medium_light_skin_tone',
  4: 'medium_skin_tone',
  5: 'medium_dark_skin_tone',
  6: 'dark_skin_tone'
};

// Mapping from Mattermost skin tone names to emoji-mart indices
export const SKIN_TONE_NAME_TO_INDEX: Record<string, number> = {
  'light_skin_tone': 2,
  'medium_light_skin_tone': 3,
  'medium_skin_tone': 4,
  'medium_dark_skin_tone': 5,
  'dark_skin_tone': 6
};

/**
 * Interface for processed emoji data
 */
export interface EmojiData {
  emoji: string;      // Unicode emoji character
  name: string;       // Emoji name (used in API)
  unified: string;    // Unified code (used for image URLs)
  short_name?: string; // Short name for Mattermost compatibility
  category?: string;   // Category for grouping
  skinTone?: number;   // Skin tone index (1-6)
}

/**
 * Gets the current user's preferred skin tone from localStorage
 * @returns The skin tone index (1-6) where 1 is the default
 */
export function getUserPreferredSkinTone(): number {
  try {
    const storedSkin = localStorage.getItem(EMOJI_MART_SKIN_STORAGE_KEY);
    if (storedSkin) {
      const skinTone = parseInt(storedSkin, 10);
      if (skinTone >= 1 && skinTone <= 6) {
        return skinTone;
      }
    }
  } catch (error) {
    console.error('Error reading skin tone preference:', error);
  }
  
  return DEFAULT_SKIN_TONE;
}

/**
 * Gets the appropriate skin index from the skin tone preference
 * @param skinTone The skin tone preference (1-6)
 * @returns The index in the skins array (0-5)
 */
export function getSkinIndex(skinTone: number): number {
  // emoji-mart uses 1-based indexing for skin tone preferences
  // but array is 0-based, so we subtract 1
  return Math.min(Math.max(skinTone - 1, 0), 5);
}

/**
 * Checks if an emoji name has a skin tone modifier
 * @param emojiName The emoji name to check
 * @returns True if the name contains a skin tone modifier
 */
export function hasSkinToneModifier(emojiName: string): boolean {
  return Object.values(SKIN_TONE_MAP).some(tone => emojiName.includes(`_${tone}`));
}

/**
 * Extracts the base name and skin tone from a Mattermost emoji name
 * @param emojiName The emoji name with potential skin tone
 * @returns Object with base name and skin tone index (if any)
 */
export function extractEmojiBaseNameAndTone(emojiName: string): { baseName: string, skinTone?: number } {
  // Create array of possible tone values, sorted by length (longest first)
  // to ensure we match the most specific tone first
  const toneEntries = Object.entries(SKIN_TONE_MAP).sort(
    (a, b) => b[1].length - a[1].length
  );
  
  // Check if the name has a skin tone modifier, using suffix pattern
  for (const [indexStr, tone] of toneEntries) {
    const suffix = `_${tone}`;
    if (emojiName.endsWith(suffix)) {
      const baseName = emojiName.substring(0, emojiName.length - suffix.length);
      return { baseName, skinTone: parseInt(indexStr, 10) };
    }
  }
  
  // No skin tone modifier found
  return { baseName: emojiName };
}

/**
 * Creates a Mattermost-compatible emoji name with skin tone if applicable
 * @param baseName The base emoji name
 * @param skinTone The skin tone index (1-6)
 * @returns The emoji name with skin tone for Mattermost
 */
export function createEmojiNameWithTone(baseName: string, skinTone: number = 1): string {
  // Default skin tone (1) doesn't need a modifier
  if (skinTone === 1 || skinTone < 1 || skinTone > 6) {
    return baseName;
  }
  
  // Add appropriate skin tone modifier
  const toneName = SKIN_TONE_MAP[skinTone];
  if (toneName) {
    return `${baseName}_${toneName}`;
  }
  
  return baseName;
}

/**
 * Gets the emoji image URL for a given unified code
 * Uses Mattermost's image format for compatibility with the server
 * @param unified The unified code (e.g. "1F44D")
 * @param serverUrl Optional server URL, defaults to current origin
 * @returns The URL to the emoji image
 */
export function getEmojiImageUrl(unified: string | undefined, serverUrl?: string): string {
  if (!unified) return '';
  
  // Use serverUrl if provided or ask the API for the base URL
  const baseUrl = serverUrl || (typeof api !== 'undefined' ? api.getBaseUrl() : '');
  return `${baseUrl}/static/emoji/${unified.toLowerCase()}.png`;
}

/**
 * Get skin data for an emoji based on user preference
 * @param emojiData The emoji data from emoji-mart
 * @param specificSkinTone Optional specific skin tone to use instead of user preference
 * @returns The appropriate skin data for the emoji
 */
function getAppropriateSkin(emojiData: any, specificSkinTone?: number): any | null {
  if (!emojiData) return null;
  
  // Use the specified skin tone or user preference
  const skinTone = specificSkinTone || getUserPreferredSkinTone();
  const skinIndex = getSkinIndex(skinTone);
  
  // Check if emoji has skins and if the requested skin exists
  const hasSkins = Array.isArray(emojiData.skins) && emojiData.skins.length > 0;
  
  if (hasSkins) {
    const selectedSkin = emojiData.skins[Math.min(skinIndex, emojiData.skins.length - 1)];
    return selectedSkin;
  }
  
  return null;
}

/**
 * Get emoji data from its name using emoji-mart's advanced search
 * Applies the user's preferred skin tone or a specific skin tone
 * @param emojiName The emoji name to search for
 * @param specificSkinTone Optional specific skin tone to use
 * @returns The emoji data including unified code or null if not found
 */
export async function findEmojiByNameAsync(emojiName: string, specificSkinTone?: number): Promise<EmojiData | null> {
  if (!emojiName) return null;
  
  try {
    // Extract base name and skin tone if present
    const { baseName, skinTone: embeddedTone } = extractEmojiBaseNameAndTone(emojiName);
    
    // Use the embedded tone if present, otherwise use the specific or default
    const skinTone = embeddedTone || specificSkinTone || getUserPreferredSkinTone();
    
    // Use emoji-mart's built-in search functionality
    const searchResults = await SearchIndex.search(baseName);
    
    // Find the best match - exact matches first, then partial matches
    const exactMatch = searchResults.find((emoji: any) => 
      emoji.id === baseName || 
      emoji.short_names?.includes(baseName)
    );
    
    const bestMatch = exactMatch || searchResults[0];
    
    if (bestMatch) {
      // Get the appropriate skin data
      const skin = getAppropriateSkin(bestMatch, skinTone);
      
      // Extract data based on skin or default values
      const unified = skin ? skin.unified : (bestMatch.unified || '');
      const emoji = skin ? skin.native : (bestMatch.native || '');
      
      return {
        emoji,
        name: baseName,
        unified,
        short_name: bestMatch.id || baseName,
        category: bestMatch.category || '',
        skinTone
      };
    }
  } catch (error) {
    console.error('Error searching emoji:', error);
  }
  
  return null;
}

/**
 * Get emoji data from its name using direct access to emoji-mart data
 * @param emojiName The emoji name to find, can include skin tone
 * @param specificSkinTone Optional specific skin tone to use
 */
export function findEmojiByName(emojiName: string, specificSkinTone?: number): EmojiData | null {
  if (!emojiName) return null;
  
  try {
    // Extract base name and skin tone if present
    const { baseName, skinTone: embeddedTone } = extractEmojiBaseNameAndTone(emojiName);
    
    // Use the embedded tone if present, otherwise use the specific or default
    const skinTone = embeddedTone || specificSkinTone || getUserPreferredSkinTone();
    
    // Direct access to emoji-mart data for synchronous operation
    const emojiMartData = (data as any).emojis;
    
    // Try to find emoji directly by its base name
    let emojiData = emojiMartData[baseName];
    
    // If direct lookup failed, try searching by common aliases
    if (!emojiData) {
      // Try with underscores replaced by dashes (common difference)
      const normalizedName = baseName.replace(/_/g, '-');
      emojiData = emojiMartData[normalizedName];
      
      // If still not found, look through aliases
      if (!emojiData) {
        for (const id in emojiMartData) {
          const emoji = emojiMartData[id];
          if (emoji.aliases && emoji.aliases.includes(baseName)) {
            emojiData = emoji;
            break;
          }
        }
      }
    }
    
    if (emojiData) {
      // Get the appropriate skin data
      const skin = getAppropriateSkin(emojiData, skinTone);
      
      // Extract data based on skin or default values
      const unified = skin ? skin.unified : (emojiData.unified || '');
      const emoji = skin ? skin.native : (emojiData.native || '');
      
      return {
        emoji,
        name: baseName,
        unified,
        short_name: emojiData.id || baseName,
        category: emojiData.category || '',
        skinTone
      };
    }
  } catch (error) {
    console.error('Error finding emoji by name:', error);
  }
  
  return null;
}

/**
 * Converts reactions object from API to a friendlier format with emoji characters
 * Uses emoji-mart data directly for efficient lookups and respects specific skin tones
 */
export function processReactions(reactions?: Record<string, string[]>): Array<{
  name: string;
  emoji: string;
  unified: string;
  count: number;
  userIds: string[];
  category?: string;
  short_name?: string;
  skinTone?: number;
}> {
  // Return empty array if no reactions
  if (!reactions || typeof reactions !== 'object') return [];
  if (Object.keys(reactions).length === 0) return [];

  try {
    return Object.entries(reactions)
      .filter(([, userIds]) => Array.isArray(userIds) && userIds.length > 0)
      .map(([name, userIds]) => {
        // Find emoji data, respecting any embedded skin tone
        const emojiData = findEmojiByName(name);
        
        if (emojiData) {
          return {
            name,  // Keep the original name with skin tone for Mattermost
            emoji: emojiData.emoji,
            unified: emojiData.unified,
            category: emojiData.category || '',
            short_name: emojiData.short_name || name,
            count: userIds.length,
            userIds,
            skinTone: emojiData.skinTone
          };
        } else {
          // Fallback for custom or missing emojis
          return {
            name,
            emoji: '', // No character representation for unknown emojis
            unified: '',
            category: '',
            short_name: name,
            count: userIds.length,
            userIds
          };
        }
      });
  } catch (error) {
    console.error('Error processing reactions: ', error);
    return [];
  }
}