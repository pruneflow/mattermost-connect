/**
 * Global emoji preloading service
 * Manages emoji image loading and caching for the entire application
 * This service is initialized at application startup
 * 
 * IMPORTANT: This service is now enhanced with local storage persistence
 * and works together with the SpriteSheet system for optimal performance
 */

import { 
  EMOJIS_BY_CATEGORY, 
  CATEGORY_ORDER, 
  getEmojiImageUrl, 
  getRecentEmojis,
  EmojiData
} from './emojiUtils';

/**
 * Cache entry status for emoji images
 */
export interface EmojiImageCache {
  status: 'loading' | 'loaded' | 'error';
  image?: HTMLImageElement;
  loadTime?: number;
}

/**
 * Global cache for emoji images
 * Maintained outside component lifecycle for persistence between renders
 * Now enhanced with localStorage backup for faster cold starts
 */
export const globalEmojiCache = new Map<string, EmojiImageCache>();

// Constants for localStorage caching
const CACHE_VERSION = '1.0';
const CACHE_KEY = 'emoji_cache_v' + CACHE_VERSION;
const MAX_CACHE_ITEMS = 500; // Maximum number of emojis to persist in localStorage
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Initialize cache from localStorage if available
try {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    if (parsed.version === CACHE_VERSION && parsed.timestamp > Date.now() - CACHE_TTL) {
      // Apply cache entries with status 'loaded' - they'll be lazy-loaded when needed
      parsed.entries.forEach((entry: {key: string, status: string, timestamp: number}) => {
        if (!globalEmojiCache.has(entry.key)) {
          globalEmojiCache.set(entry.key, {
            status: 'loading', // Start as loading - images will be re-fetched
            loadTime: entry.timestamp
          });
        }
      });
      console.log(`Restored ${parsed.entries.length} emoji entries from cache`);
    }
  }
} catch (error) {
  console.error('Error loading emoji cache from localStorage:', error);
}

// Periodically save cache to localStorage
setInterval(() => {
  try {
    // Only save entries with 'loaded' status
    const entries = Array.from(globalEmojiCache.entries())
      .filter(([_, entry]) => entry.status === 'loaded')
      .slice(0, MAX_CACHE_ITEMS) // Limit entries to avoid storage limits
      .map(([key, entry]) => ({
        key,
        status: entry.status,
        timestamp: entry.loadTime || Date.now()
      }));
    
    if (entries.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        timestamp: Date.now(),
        entries
      }));
    }
  } catch (error) {
    console.error('Error saving emoji cache to localStorage:', error);
  }
}, 60000); // Update every minute

/**
 * Load status tracking for different categories
 */
export interface EmojiLoadStatus {
  recentEmojisDone: boolean;
  smileysCriticalDone: boolean;
  allCategoriesFirstPageDone: boolean;
  isInitialized: boolean;
}

// Global status tracking
export const emojiLoadStatus: EmojiLoadStatus = {
  recentEmojisDone: false,
  smileysCriticalDone: false,
  allCategoriesFirstPageDone: false,
  isInitialized: false
};

// Event system for listening to loading progress
type EmojiPreloadEventType = 
  'recentDone' | 
  'smileysCriticalDone' | 
  'allCategoriesFirstPageDone' | 
  'initialized';

type EmojiPreloadListener = () => void;

// Event listeners
const eventListeners = new Map<EmojiPreloadEventType, Set<EmojiPreloadListener>>();

/**
 * Add an event listener for emoji preloading events
 */
export function addEmojiPreloadListener(event: EmojiPreloadEventType, listener: EmojiPreloadListener): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)?.add(listener);
}

/**
 * Remove an event listener
 */
export function removeEmojiPreloadListener(event: EmojiPreloadEventType, listener: EmojiPreloadListener): void {
  eventListeners.get(event)?.delete(listener);
}

/**
 * Trigger an event
 */
function triggerEvent(event: EmojiPreloadEventType): void {
  eventListeners.get(event)?.forEach(listener => listener());
}

// Queue management for preloading - optimized for performance
let isPreloadingActive = false;
const criticalQueue: string[] = [];    // Needed immediately (recent & first visible)
const highPriorityQueue: string[] = []; // Next 12-18 emojis to load
const lowPriorityQueue: string[] = [];  // Everything else
const queuedEmojis = new Set<string>(); // Track what's already queued
let activeLoaders = 0;
const MAX_CONCURRENT_LOADS = 10; // Reduced from 20 to improve responsiveness

// Flag to control emergency stop of loading
let stopAllLoading = false;

/**
 * Add an emoji to the loading queue with specified priority
 * Exposed publicly to let components request immediate loading of specific emojis
 */
export function enqueueEmoji(unified: string, priority: 'critical' | 'high' | 'low', serverUrl?: string): boolean {
  if (!unified || queuedEmojis.has(unified)) {
    return false;
  }
  
  // Check if already in global cache
  const imgSrc = getEmojiImageUrl(unified, serverUrl);
  if (globalEmojiCache.has(imgSrc)) {
    return false;
  }
  
  // Mark as queued
  queuedEmojis.add(unified);
  
  // Add to appropriate queue
  switch (priority) {
    case 'critical':
      criticalQueue.push(unified);
      break;
    case 'high':
      highPriorityQueue.push(unified);
      break;
    case 'low':
      lowPriorityQueue.push(unified);
      break;
  }
  
  // Start processing if not already active
  if (!isPreloadingActive) {
    processQueues(serverUrl);
  }
  
  return true;
}

/**
 * Emergency stop for all emoji loading
 * Used when changing categories or search to prioritize new loading requests
 */
export function stopEmojiLoading(): void {
  // Set flag to prevent new queue processing
  stopAllLoading = true;
  
  // Clear all queues to ensure highest priority for new requests
  criticalQueue.length = 0; // Now clear even critical - we want immediate response to user actions
  highPriorityQueue.length = 0;
  lowPriorityQueue.length = 0;
  
  // Reset loader count to ensure we can immediately start loading new emojis
  // This is crucial for responsiveness during category changes
  activeLoaders = 0;
  
  // Reset stop flag immediately to allow new requests to be processed
  // Better performance: don't use timeout, just reset immediately
  stopAllLoading = false;
}

/**
 * Process the preloading queues
 */
function processQueues(serverUrl?: string): void {
  // If emergency stop is active, don't process anything
  if (stopAllLoading) {
    return;
  }
  
  // Check if all queues are empty
  if (criticalQueue.length === 0 && 
      highPriorityQueue.length === 0 && 
      lowPriorityQueue.length === 0) {
    isPreloadingActive = false;
    return;
  }
  
  isPreloadingActive = true;
  
  // If we're at max concurrent loads, wait a bit
  if (activeLoaders >= MAX_CONCURRENT_LOADS) {
    setTimeout(() => processQueues(serverUrl), 10);
    return;
  }
  
  // Get next emoji to load (priority order)
  let unified: string | undefined;
  
  if (criticalQueue.length > 0) {
    unified = criticalQueue.shift();
  } else if (highPriorityQueue.length > 0) {
    unified = highPriorityQueue.shift();
  } else if (lowPriorityQueue.length > 0) {
    unified = lowPriorityQueue.shift();
  }
  
  if (!unified) {
    // Shouldn't happen, but just in case
    processQueues(serverUrl);
    return;
  }
  
  const imgSrc = getEmojiImageUrl(unified, serverUrl);
  
  // Skip if already in cache
  if (globalEmojiCache.has(imgSrc)) {
    processQueues(serverUrl);
    return;
  }
  
  // Mark as loading and track load start time
  globalEmojiCache.set(imgSrc, { 
    status: 'loading',
    loadTime: Date.now()
  });
  
  // Track active loaders
  activeLoaders++;
  
  // Create new image
  const img = new Image();
  
  // Set load handlers
  img.onload = () => {
    // Check if we should stop loading (another emergency stop happened)
    if (stopAllLoading) {
      activeLoaders--;
      return;
    }
    
    const now = Date.now();
    
    // Update cache
    globalEmojiCache.set(imgSrc, { 
      status: 'loaded', 
      image: img,
      loadTime: now
    });
    
    // Also store in sessionStorage for quicker recovery during page refresh
    try {
      // Store image data in sessionStorage for advanced recovery
      if (typeof createImageBitmap === 'function') { // Modern browsers
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const cacheKey = `emoji_img_${unified}_${CACHE_VERSION}`;
          sessionStorage.setItem(cacheKey, canvas.toDataURL('image/png', 0.8));
          sessionStorage.setItem(`${cacheKey}_time`, now.toString());
        }
      }
    } catch (e) {
      // Ignore storage errors - not critical
    }
    
    activeLoaders--;
    
    // Check if this was a tracked emoji for event triggers
    checkCategoryProgress(unified);
    
    // Continue processing if not stopped
    if (!stopAllLoading) {
      processQueues(serverUrl);
    }
  };
  
  img.onerror = () => {
    // Mark as error
    globalEmojiCache.set(imgSrc, { 
      status: 'error',
      loadTime: Date.now()
    });
    
    activeLoaders--;
    
    // Check if this was a tracked emoji for event triggers
    checkCategoryProgress(unified);
    
    // Continue processing if not stopped
    if (!stopAllLoading) {
      processQueues(serverUrl);
    }
  };
  
  // Start loading
  img.src = imgSrc;
  
  // Continue processing other emojis in parallel if not stopped
  if (!stopAllLoading) {
    setTimeout(() => processQueues(serverUrl), 0);
  }
}

// Track loaded emojis for progress events
const loadedRecentEmojis = new Set<string>();
const loadedSmileysCritical = new Set<string>();
const loadedFirstPageEmojis = new Map<string, Set<string>>();

/**
 * Track category loading progress and trigger events when complete
 */
function checkCategoryProgress(unified: string): void {
  // Check if we've completed loading recent emojis
  if (!emojiLoadStatus.recentEmojisDone) {
    const recentEmojis = getRecentEmojis();
    const recentUnified = recentEmojis.map(emoji => emoji.unified);
    
    if (recentUnified.includes(unified)) {
      loadedRecentEmojis.add(unified);
      
      // Check if all recent emojis are loaded
      if (loadedRecentEmojis.size >= recentUnified.length) {
        emojiLoadStatus.recentEmojisDone = true;
        triggerEvent('recentDone');
      }
    }
  }
  
  // Check if we've completed loading critical smileys
  if (!emojiLoadStatus.smileysCriticalDone) {
    const smileysEmojis = EMOJIS_BY_CATEGORY['smileys-emotion'] || [];
    const critical70 = smileysEmojis.slice(0, 70).map(emoji => emoji.unified);
    
    if (critical70.includes(unified)) {
      loadedSmileysCritical.add(unified);
      
      // Check if all critical smileys emojis are loaded
      if (loadedSmileysCritical.size >= critical70.length) {
        emojiLoadStatus.smileysCriticalDone = true;
        triggerEvent('smileysCriticalDone');
      }
    }
  }
  
  // Check if we've completed loading first page of all categories
  if (!emojiLoadStatus.allCategoriesFirstPageDone) {
    for (const category of CATEGORY_ORDER) {
      if (category === 'recent') continue;
      
      // Initialize set if needed
      if (!loadedFirstPageEmojis.has(category)) {
        loadedFirstPageEmojis.set(category, new Set<string>());
      }
      
      const categoryEmojis = EMOJIS_BY_CATEGORY[category] || [];
      const first50 = categoryEmojis.slice(0, 50).map(emoji => emoji.unified);
      
      if (first50.includes(unified)) {
        loadedFirstPageEmojis.get(category)?.add(unified);
        
        // Check if all categories have their first page loaded
        let allDone = true;
        
        for (const cat of CATEGORY_ORDER) {
          if (cat === 'recent') continue;
          
          const catEmojis = EMOJIS_BY_CATEGORY[cat] || [];
          const catFirst50 = catEmojis.slice(0, 50).map(emoji => emoji.unified);
          
          // Skip empty categories
          if (catFirst50.length === 0) continue;
          
          const loadedCount = loadedFirstPageEmojis.get(cat)?.size || 0;
          
          // Consider a category done when at least 50% of first page is loaded
          // This is enough for a smooth experience
          if (loadedCount < catFirst50.length / 2) {
            allDone = false;
            break;
          }
        }
        
        if (allDone) {
          emojiLoadStatus.allCategoriesFirstPageDone = true;
          triggerEvent('allCategoriesFirstPageDone');
        }
      }
    }
  }
}

/**
 * Initialize emoji preloading for the application
 * Strict minimal approach to avoid excessive requests
 * Only loads exactly what's visible on first render
 * @param serverUrl Optional server URL for emoji images
 * @param callback Optional callback when initialization is complete
 */
export function initializeEmojiPreloader(serverUrl?: string, callback?: () => void): void {
  // If already initialized, don't do it again
  if (emojiLoadStatus.isInitialized) {
    if (callback) callback();
    return;
  }
  
  // Register callback if provided
  if (callback) {
    addEmojiPreloadListener('initialized', callback);
  }
  
  // CRITICAL TIER: Recent Emojis only - these are visible on first render
  const recentEmojis = getRecentEmojis();
  const recentCount = recentEmojis.length;
  
  // Only load recent emojis first (they're visible)
  recentEmojis.forEach(emoji => {
    if (emoji.unified) {
      enqueueEmoji(emoji.unified, 'critical', serverUrl);
    }
  });
  
  // Calculate how many smileys-emotion emojis to load to fill screen
  // Typically we need to show 42 emojis total (7 rows of 6 emojis)
  const smileysToLoad = Math.max(0, Math.min(24, 42 - recentCount));
  
  // Only load exactly what's visible in the first screen
  if (smileysToLoad > 0) {
    const smileysEmojis = EMOJIS_BY_CATEGORY['smileys-emotion'] || [];
    smileysEmojis.slice(0, smileysToLoad).forEach(emoji => {
      if (emoji.unified) {
        enqueueEmoji(emoji.unified, 'critical', serverUrl);
      }
    });
  }
  
  // No preloading of other categories or emojis - strictly visible only
  
  // Mark as initialized
  emojiLoadStatus.isInitialized = true;
  triggerEvent('initialized');
}

/**
 * Preload emojis around a specific index in a category
 * Uses a minimal targeted approach to reduce HTTP requests
 * @param category Category name
 * @param centerIndex Center index to preload around
 * @param serverUrl Optional server URL
 */
export function preloadEmojisAround(category: string, centerIndex: number, serverUrl?: string): void {
  if (category === 'recent') return;
  
  const emojis = EMOJIS_BY_CATEGORY[category] || [];
  
  // Focus ONLY on the visible area - 6 emojis total (1 row)
  // This dramatically reduces HTTP requests while still providing needed emojis
  const rowStart = Math.floor(centerIndex / 6) * 6; // Round to row start
  const startIndex = rowStart;
  const endIndex = Math.min(emojis.length, rowStart + 6);
  
  // Process ONLY the visible row with critical priority
  for (let i = startIndex; i < endIndex; i++) {
    const emoji = emojis[i];
    if (!emoji?.unified) continue;
    enqueueEmoji(emoji.unified, 'critical', serverUrl);
  }
  
  // No surrounding area preloading - only exactly what's visible
}

/**
 * Preload emojis for specific range in a category
 * @param category Category name
 * @param startIndex Start index
 * @param count Number of emojis to preload
 * @param serverUrl Optional server URL
 */
export function preloadCategoryEmojis(
  category: string, 
  startIndex: number, 
  count: number, 
  serverUrl?: string
): void {
  if (category === 'recent') return;
  
  const emojis = EMOJIS_BY_CATEGORY[category] || [];
  emojis.slice(startIndex, startIndex + count).forEach(emoji => {
    if (!emoji?.unified) return;
    enqueueEmoji(emoji.unified, 'high', serverUrl);
  });
}

/**
 * Preload emojis in the direction of scroll (MINIMALLY)
 * Ultra-efficient implementation that loads ONLY what's needed
 * @param category Current category
 * @param centerIndex Current center index
 * @param direction Scroll direction ('up' or 'down')
 * @param serverUrl Optional server URL
 */
export function preloadInDirection(
  category: string, 
  centerIndex: number, 
  direction: 'up' | 'down',
  serverUrl?: string
): void {
  if (category === 'recent') return;
  
  const emojis = EMOJIS_BY_CATEGORY[category] || [];
  
  // Get the single row that will become visible next in the scroll direction
  // This minimizes requests to only what will become visible soon
  const rowSize = 6; // One row at a time
  
  // Calculate which row to load based on direction
  let targetRowStart;
  
  if (direction === 'up') {
    // For upward scrolling, load one row above current position
    const currentRow = Math.floor(centerIndex / rowSize);
    const targetRow = Math.max(0, currentRow - 1);
    targetRowStart = targetRow * rowSize;
  } else {
    // For downward scrolling, load one row below current position
    const currentRow = Math.floor(centerIndex / rowSize);
    const targetRow = currentRow + 1;
    targetRowStart = targetRow * rowSize;
    
    // Only if the row exists in this category
    if (targetRowStart >= emojis.length) {
      return; // No more rows to load in this category
    }
  }
  
  // Load ONLY the one row that will become visible soon
  const targetRowEnd = Math.min(emojis.length, targetRowStart + rowSize);
  
  // Load this single row with high priority
  for (let i = targetRowStart; i < targetRowEnd; i++) {
    const emoji = emojis[i];
    if (!emoji?.unified) continue;
    enqueueEmoji(emoji.unified, 'high', serverUrl);
  }
  
  // That's it - no extra loading, only what will become visible
}

/**
 * Check emoji image loading status
 * @param unified Emoji unified code
 * @param serverUrl Optional server URL
 */
export function getEmojiLoadingStatus(unified: string, serverUrl?: string): 'loading' | 'loaded' | 'error' | 'not-loaded' {
  if (!unified) return 'not-loaded';
  
  const imgSrc = getEmojiImageUrl(unified, serverUrl);
  const cacheEntry = globalEmojiCache.get(imgSrc);
  
  if (!cacheEntry) return 'not-loaded';
  return cacheEntry.status;
}

/**
 * Get emoji image if already loaded
 * @param unified Emoji unified code
 * @param serverUrl Optional server URL
 */
export function getEmojiImage(unified: string, serverUrl?: string): HTMLImageElement | undefined {
  if (!unified) return undefined;
  
  const imgSrc = getEmojiImageUrl(unified, serverUrl);
  const cacheEntry = globalEmojiCache.get(imgSrc);
  
  if (!cacheEntry || cacheEntry.status !== 'loaded') return undefined;
  return cacheEntry.image;
}

/**
 * Clear emoji cache (for testing/development)
 * @param clearStorage If true, also clears from localStorage/sessionStorage
 */
export function clearEmojiCache(clearStorage: boolean = false): void {
  globalEmojiCache.clear();
  queuedEmojis.clear();
  loadedRecentEmojis.clear();
  loadedSmileysCritical.clear();
  loadedFirstPageEmojis.clear();
  
  emojiLoadStatus.recentEmojisDone = false;
  emojiLoadStatus.smileysCriticalDone = false;
  emojiLoadStatus.allCategoriesFirstPageDone = false;
  emojiLoadStatus.isInitialized = false;
  
  if (clearStorage) {
    try {
      // Clear localStorage cache
      localStorage.removeItem(CACHE_KEY);
      
      // Clear all emoji images from sessionStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('emoji_img_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {
      // Ignore storage errors
    }
  }
}

// Initialize automatically when this module is imported
// This ensures the preloading starts as early as possible
setTimeout(() => {
  if (!emojiLoadStatus.isInitialized) {
    initializeEmojiPreloader();
  }
}, 100); // Short delay to let the application initialize first