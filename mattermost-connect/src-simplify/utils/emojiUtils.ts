/**
 * Emoji utilities for Mattermost
 * Uses pre-computed data structures for optimal performance
 * No runtime calculations - 100% optimized
 */

// Import pre-computed emoji data from dedicated file
import * as EmojiDataModule from './emojiData';

// Explicitly re-export the interface type
export type EmojiData = EmojiDataModule.EmojiData;

// Re-export all emoji data constants
export const {
  EMOJI_CATEGORIES,
  CATEGORY_ORDER,
  COMMON_REACTIONS,
  EMOJIS_BY_CATEGORY,
  EMOJI_BY_SHORT_NAME,
  EMOJI_BY_NAME,
  EMOJI_TO_NAME,
  AVAILABLE_CATEGORIES
} = EmojiDataModule;

// Default server URL for emoji images
export const DEFAULT_SERVER_URL = window.location.origin || '';

/**
 * Helper function to convert unified code to emoji character
 * Only used for backward compatibility - all emojis are pre-computed in data structures
 * @param unified The unified code (e.g. "1F44D")
 */
export function unifiedToEmoji(unified: string): string {
  if (!unified) return '';
  
  const codePoints = unified.split('-').map(hex => parseInt(hex, 16));
  return String.fromCodePoint(...codePoints);
}

/**
 * Gets the emoji image URL for a given unified code
 * @param unified The unified code (e.g. "1F44D")
 * @param serverUrl Optional server URL, defaults to current origin
 * @returns The URL to the emoji image
 */
export function getEmojiImageUrl(unified: string | undefined, serverUrl?: string): string {
  if (!unified) return '';
  
  const baseUrl = serverUrl || DEFAULT_SERVER_URL;
  return `${baseUrl}/static/emoji/${unified.toLowerCase()}.png`;
}

/**
 * Get emoji name from emoji character using pre-computed lookup (O(1))
 * @param emoji The emoji character
 * @returns The emoji name or the emoji itself if not found
 */
export function getEmojiName(emoji: string): string {
  if (!emoji) return '';
  return EMOJI_TO_NAME[emoji] || emoji;
}

/**
 * Get emoji character from name using pre-computed lookup (O(1))
 * @param name The emoji name
 * @returns The emoji character or empty string if not found
 */
export function getEmojiFromName(name: string): string {
  if (!name) return '';
  
  // Direct O(1) lookup in pre-computed structure
  return EMOJI_BY_SHORT_NAME[name]?.emoji || '';
}

/**
 * Gets emoji data from its name using pre-computed lookup (O(1))
 * @param name The emoji name
 * @returns The emoji data including unified code or null if not found
 */
export function getEmojiDataFromName(name: string): { emoji: string, unified: string } | null {
  if (!name) return null;

  // Direct lookup in our static structures
  const emojiData = findEmojiByName(name);
  if (emojiData) {
    return { 
      emoji: emojiData.emoji, 
      unified: emojiData.unified 
    };
  }

  return null;
}

/**
 * Finds emoji data by name or short_name using pre-computed lookups (O(1))
 * @param emojiName The emoji name to search for
 * @returns The emoji data or null if not found
 */
export function findEmojiByName(emojiName: string): EmojiDataModule.EmojiData | null {
  if (!emojiName) return null;
  
  // First try with exact short_name match (fastest O(1) lookup)
  if (EMOJI_BY_SHORT_NAME[emojiName]) {
    return EMOJI_BY_SHORT_NAME[emojiName];
  }
  
  // Then try with exact name match (still O(1))
  const lowerName = emojiName.toLowerCase();
  if (EMOJI_BY_NAME[lowerName]) {
    return EMOJI_BY_NAME[lowerName];
  }
  
  return null;
}

/**
 * Backward compatibility for older code
 */
export const findEmojiInJson = findEmojiByName;

/**
 * Converts reactions object from API to a friendlier format with emoji characters
 * Uses static pre-computed data structures for O(1) lookups
 */
export function processReactions(reactions?: Record<string, string[]>): Array<{
  name: string;
  emoji: string;
  unified: string;
  count: number;
  userIds: string[];
  category?: string;
  short_name?: string;
}> {
  // Return empty array if no reactions
  if (!reactions || typeof reactions !== 'object') return [];
  if (Object.keys(reactions).length === 0) return [];

  try {
    return Object.entries(reactions)
      .filter(([, userIds]) => Array.isArray(userIds) && userIds.length > 0)
      .map(([name, userIds]) => {
        // Direct O(1) lookup in our static structure
        const emojiData = EMOJI_BY_SHORT_NAME[name];
        
        if (emojiData) {
          // Fast path - emoji found directly in lookup
          return {
            name,
            emoji: emojiData.emoji,
            unified: emojiData.unified,
            category: emojiData.category,
            short_name: emojiData.short_name,
            count: userIds.length,
            userIds
          };
        } else {
          // Fallback path (rarely taken) - for custom or missing emojis
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

/**
 * Storage for recent emojis (limited to 10)
 */
export const MAX_RECENT_EMOJIS = 10;
export const RECENT_EMOJIS_KEY = 'mattermost-connect-recent-emojis';

/**
 * Store recently used emoji in localStorage
 */
export function storeRecentEmoji(emoji: string, name: string, unified: string): void {
  try {
    // Get existing recent emojis
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    const recentEmojis = stored ? JSON.parse(stored) : [];
    
    // Filter out duplicates
    const filteredEmojis = recentEmojis.filter((item: any) => item.name !== name);
    
    // Add new emoji at the beginning
    const updatedEmojis = [{ emoji, name, unified }, ...filteredEmojis].slice(0, MAX_RECENT_EMOJIS);
    
    // Store in localStorage
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updatedEmojis));
  } catch (e) {
    console.error('Failed to store recent emoji', e);
  }
}

/**
 * Retrieve recent emojis from storage
 */
export function getRecentEmojis(): Array<{ emoji: string, name: string, unified: string }> {
  try {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load recent emojis', e);
    return [];
  }
}

/**
 * Check if a string is a valid emoji name
 */
export function isValidEmojiName(name: string): boolean {
  // Mattermost emoji names only allow alphanumeric characters, underscores, and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(name);
}