/**
 * Emoji Sprite Sheet Management System
 * 
 * This module implements a sprite sheet approach for emoji rendering,
 * which drastically reduces the number of HTTP requests by combining
 * multiple emojis into a single image.
 * 
 * Each category of emojis is represented by a sprite sheet, allowing
 * for efficient on-demand loading while maintaining a responsive UI.
 */

import { CATEGORY_ORDER, getEmojiImageUrl } from './emojiUtils';

// Constants
export const SPRITE_CELL_SIZE = 32; // Size of each emoji in the sprite sheet
export const SPRITES_PER_ROW = 16;  // Number of emojis per row in the sprite
export const SPRITES_PER_SHEET = 256; // Max number of emojis per sheet

// Sprite status and loading state
export interface SpriteSheetInfo {
  status: 'loading' | 'loaded' | 'error';
  image?: HTMLImageElement;
  loadTime?: number;
  emojiCount: number;
}

// Global cache of loaded sprite sheets
export const spriteSheetsCache = new Map<string, SpriteSheetInfo>();

// Track which category+sheet index specific emojis belong to
const emojiSpriteMapping = new Map<string, { 
  category: string; 
  sheetIndex: number;
  row: number;
  col: number;
}>();

// Track which sprites are currently being loaded
const loadingSprites = new Set<string>();

// Track which sprites are needed immediately (for prioritization)
const criticalSprites = new Set<string>();

// Base directory for sprite sheets
const SPRITE_BASE_PATH = '/assets/emoji-sprites';

// Generate the sprite sheet URL for a category and index
export function getSpriteSheetUrl(category: string, sheetIndex: number = 0, serverUrl?: string): string {
  const basePath = serverUrl ? `${serverUrl}${SPRITE_BASE_PATH}` : SPRITE_BASE_PATH;
  return `${basePath}/${category}-${sheetIndex}.png`;
}

// Calculate position within sprite sheet for a specific emoji
export function getEmojiSpritePosition(unified: string): { 
  category: string;
  sheetIndex: number; 
  row: number; 
  col: number; 
} | null {
  // Check if we already know this emoji's position
  const mapping = emojiSpriteMapping.get(unified);
  if (mapping) return mapping;
  
  return null;
}

// Initialize emoji sprite mapping (called at startup)
export function initializeEmojiSpriteMapping(): void {
  // This would normally use real data, but for demo purposes
  // we'll create a simulated mapping
  
  // In a real implementation, this would map each emoji unified code 
  // to its position in a pre-generated sprite sheet
  
  // Example mapping format for 'smileys-emotion' category:
  // emoji unified -> { category, sheetIndex, row, col }
}

// Load a specific sprite sheet on demand
export function loadSpriteSheet(category: string, sheetIndex: number = 0, priority: 'critical' | 'normal' = 'normal', serverUrl?: string): Promise<SpriteSheetInfo> {
  const spriteKey = `${category}-${sheetIndex}`;
  
  // Return existing promise if already loaded or loading
  const existing = spriteSheetsCache.get(spriteKey);
  if (existing) {
    if (existing.status === 'loaded') {
      return Promise.resolve(existing);
    }
  }
  
  // Mark this sprite as being loaded
  if (loadingSprites.has(spriteKey)) {
    // If already loading, mark as critical if needed
    if (priority === 'critical') {
      criticalSprites.add(spriteKey);
    }
    
    // Return a promise that will resolve when the sprite is loaded
    return new Promise<SpriteSheetInfo>((resolve, reject) => {
      const checkLoaded = setInterval(() => {
        const cache = spriteSheetsCache.get(spriteKey);
        if (cache) {
          if (cache.status === 'loaded') {
            clearInterval(checkLoaded);
            resolve(cache);
          } else if (cache.status === 'error') {
            clearInterval(checkLoaded);
            reject(new Error(`Failed to load sprite sheet ${spriteKey}`));
          }
        }
      }, 50);
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error(`Timed out loading sprite sheet ${spriteKey}`));
      }, 10000);
    });
  }
  
  // Mark as loading and prioritize if critical
  loadingSprites.add(spriteKey);
  if (priority === 'critical') {
    criticalSprites.add(spriteKey);
  }
  
  // Create a new promise for this sprite sheet
  return new Promise<SpriteSheetInfo>((resolve, reject) => {
    // Set initial status
    spriteSheetsCache.set(spriteKey, {
      status: 'loading',
      loadTime: Date.now(),
      emojiCount: SPRITES_PER_SHEET
    });
    
    // Create a new image
    const img = new Image();
    
    // Set handlers
    img.onload = () => {
      // Update cache with loaded image
      const info: SpriteSheetInfo = {
        status: 'loaded',
        image: img,
        loadTime: Date.now(),
        emojiCount: SPRITES_PER_SHEET
      };
      spriteSheetsCache.set(spriteKey, info);
      
      // Clean up tracking
      loadingSprites.delete(spriteKey);
      criticalSprites.delete(spriteKey);
      
      // Resolve the promise
      resolve(info);
    };
    
    img.onerror = () => {
      // Update cache with error status
      const info: SpriteSheetInfo = {
        status: 'error',
        loadTime: Date.now(),
        emojiCount: 0
      };
      spriteSheetsCache.set(spriteKey, info);
      
      // Clean up tracking
      loadingSprites.delete(spriteKey);
      criticalSprites.delete(spriteKey);
      
      // Reject the promise
      reject(new Error(`Failed to load sprite sheet ${spriteKey}`));
    };
    
    // Start loading
    img.src = getSpriteSheetUrl(category, sheetIndex, serverUrl);
  });
}

// Get CSS for rendering an emoji from a sprite sheet
export function getEmojiSpriteCSS(unified: string, serverUrl?: string): string | null {
  const position = getEmojiSpritePosition(unified);
  if (!position) return null;
  
  const { category, sheetIndex, row, col } = position;
  const spriteKey = `${category}-${sheetIndex}`;
  
  // Get the sprite sheet URL
  const url = getSpriteSheetUrl(category, sheetIndex, serverUrl);
  
  // Calculate position within sprite sheet
  const x = col * SPRITE_CELL_SIZE;
  const y = row * SPRITE_CELL_SIZE;
  
  // Generate CSS
  return `background-image: url(${url}); background-position: -${x}px -${y}px; background-size: ${SPRITES_PER_ROW * SPRITE_CELL_SIZE}px ${Math.ceil(SPRITES_PER_SHEET / SPRITES_PER_ROW) * SPRITE_CELL_SIZE}px;`;
}

// Preload sprite sheets for commonly used categories
export function preloadCommonSpriteSheets(serverUrl?: string): Promise<void> {
  // Prioritize loading recent emojis and common categories
  const promises: Promise<any>[] = [];
  
  // Load 'recent' category first (highest priority)
  promises.push(loadSpriteSheet('recent', 0, 'critical', serverUrl));
  
  // Then load smileys-emotion (most commonly used)
  promises.push(loadSpriteSheet('smileys-emotion', 0, 'critical', serverUrl));
  
  // Wait for critical sheets to load
  return Promise.all(promises).then(() => {
    // In background, start loading other common categories
    setTimeout(() => {
      loadSpriteSheet('people-body', 0, 'normal', serverUrl);
      loadSpriteSheet('animals-nature', 0, 'normal', serverUrl);
    }, 1000);
  }).then(() => {});
}

// Render an emoji using sprite sheet approach (if available) or fallback to individual image
export function renderEmoji(unified: string, serverUrl?: string): HTMLElement {
  const container = document.createElement('div');
  container.style.width = `${SPRITE_CELL_SIZE}px`;
  container.style.height = `${SPRITE_CELL_SIZE}px`;
  container.style.display = 'inline-block';
  
  // Try to use sprite sheet first
  const spriteCSS = getEmojiSpriteCSS(unified, serverUrl);
  if (spriteCSS) {
    container.style.cssText += spriteCSS;
    return container;
  }
  
  // Fallback to individual image
  const img = document.createElement('img');
  img.src = getEmojiImageUrl(unified, serverUrl);
  img.style.width = '100%';
  img.style.height = '100%';
  container.appendChild(img);
  
  return container;
}

// Get the image for an emoji using sprite sheets (with canvas extraction)
export function getEmojiSpriteImage(unified: string, serverUrl?: string): HTMLImageElement | null {
  const position = getEmojiSpritePosition(unified);
  if (!position) return null;
  
  const { category, sheetIndex, row, col } = position;
  const spriteKey = `${category}-${sheetIndex}`;
  
  // Check if sprite sheet is loaded
  const spriteInfo = spriteSheetsCache.get(spriteKey);
  if (!spriteInfo || spriteInfo.status !== 'loaded' || !spriteInfo.image) {
    // Schedule loading if not already loading
    if (!loadingSprites.has(spriteKey)) {
      loadSpriteSheet(category, sheetIndex, 'normal', serverUrl);
    }
    return null;
  }
  
  // Extract the emoji from sprite sheet using canvas
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_CELL_SIZE;
    canvas.height = SPRITE_CELL_SIZE;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Calculate position within sprite sheet
    const x = col * SPRITE_CELL_SIZE;
    const y = row * SPRITE_CELL_SIZE;
    
    // Draw the specific emoji from the sprite sheet
    ctx.drawImage(
      spriteInfo.image,
      x, y, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE,
      0, 0, SPRITE_CELL_SIZE, SPRITE_CELL_SIZE
    );
    
    // Convert to image
    const img = new Image();
    img.src = canvas.toDataURL();
    
    return img;
  } catch (error) {
    console.error('Error extracting emoji from sprite sheet:', error);
    return null;
  }
}

// Load all sprite sheets for a category
export function preloadCategorySpriteSheets(category: string, serverUrl?: string): Promise<void> {
  // For now, we assume one sheet per category
  return loadSpriteSheet(category, 0, 'normal', serverUrl)
    .then(() => {})
    .catch(() => {});
}

// Check if a sprite sheet is loaded for a specific emoji
export function isSpriteSheetLoaded(unified: string): boolean {
  const position = getEmojiSpritePosition(unified);
  if (!position) return false;
  
  const { category, sheetIndex } = position;
  const spriteKey = `${category}-${sheetIndex}`;
  
  const spriteInfo = spriteSheetsCache.get(spriteKey);
  return !!spriteInfo && spriteInfo.status === 'loaded';
}

// Initialize sprite mapping at startup
setTimeout(() => {
  initializeEmojiSpriteMapping();
}, 100);