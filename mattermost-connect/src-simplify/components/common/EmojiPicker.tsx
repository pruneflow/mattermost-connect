import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  Tooltip,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { VariableSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Search as SearchIcon,
  EmojiEmotions as EmoticonIcon,
  AccessTime as RecentIcon,
  Favorite as FavoriteIcon,
  People as PeopleIcon,
  Pets as AnimalsIcon,
  LocalDining as FoodIcon,
  Commute as TravelIcon,
  SportsSoccer as ActivitiesIcon,
  Lightbulb as ObjectsIcon,
  Flag as FlagsIcon,
  EmojiSymbols as SymbolsIcon
} from '@mui/icons-material';
// Utiliser les données d'émojis de notre implémentation optimisée
import { 
  EmojiData, 
  EMOJI_DATA_SAMPLE,
  EMOJIS_BY_CATEGORY as EMOJI_SPRITE_DATA,
  EMOJI_CATEGORIES,
  addToRecentEmojis as storeRecentEmoji,
  getRecentEmojis
} from '../../utils/emojiData';

// Définir une structure de catégories complète et cohérente
const CATEGORY_ORDER = [
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

// Interface pour nos mappages
interface EmojiByName {
  [key: string]: EmojiData;
}

// Construire dynamiquement les mappages d'émojis pour les recherches
const EMOJI_BY_SHORT_NAME: EmojiByName = {};
const EMOJI_BY_NAME: EmojiByName = {};

// Remplir les mappages avec les données des émojis
EMOJI_DATA_SAMPLE.forEach(emoji => {
  if (emoji.short_name) {
    EMOJI_BY_SHORT_NAME[emoji.short_name] = emoji;
  }
  if (emoji.name) {
    EMOJI_BY_NAME[emoji.name.toLowerCase()] = emoji;
  }
});
import {
  getEmojiLoadingStatus,
  getEmojiImage,
  emojiLoadStatus,
  addEmojiPreloadListener,
  removeEmojiPreloadListener,
  preloadEmojisAround,
  preloadInDirection,
  preloadCategoryEmojis,
  initializeEmojiPreloader,
  enqueueEmoji,
  stopEmojiLoading
} from '../../utils/emojiPreloader';
// Import the optimized EmojiItem component
import EmojiItem from './EmojiItem';

// Define category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  'recent': <RecentIcon />,
  'frequent': <FavoriteIcon />,
  'smileys-emotion': <EmoticonIcon />,
  'people-body': <PeopleIcon />,
  'animals-nature': <AnimalsIcon />,
  'food-drink': <FoodIcon />,
  'travel-places': <TravelIcon />,
  'activities': <ActivitiesIcon />,
  'objects': <ObjectsIcon />,
  'symbols': <SymbolsIcon />,
  'flags': <FlagsIcon />
};

// Constants
const EMOJI_SIZE = 28; // Size of each emoji (reduced from 32)
const EMOJIS_PER_ROW = 6; // Fixed number of emojis per row (reduced from 8)
const CATEGORY_HEADER_HEIGHT = 32; // Height of category headers
const EMOJI_ROW_HEIGHT = 36; // Height of a row of emojis (reduced from 40)
const ROWS_PER_SCREEN = 7; // Typically 7 rows fit in view at once with default height
const VISIBLE_EMOJI_COUNT = EMOJIS_PER_ROW * ROWS_PER_SCREEN; // Exactly what's visible (42 emojis)
const OVERSCAN_COUNT = 6; // Drastically reduced overscan (just 1 row = 6 emojis)
const PRELOAD_AHEAD_COUNT = 6; // Reduced from 12 to 6 (exactly one row)

// Function to preload emoji images globally (for backward compatibility)
export function preloadCommonEmojis(serverUrl?: string): void {
  // Use the global preloader service instead
  initializeEmojiPreloader(serverUrl);
}

// Props for the EmojiPicker component
export interface EmojiPickerProps {
  onEmojiSelect: (emoji: string, emojiName: string, unified?: string) => void;
  showCategoryTabs?: boolean;
  showSearchBar?: boolean;
  initialCategory?: string;
  height?: number;
  width?: number;
  serverUrl?: string;
  /**
   * @deprecated No longer used. The picker is now always immediately accessible
   * with emojis loading progressively in the background.
   */
  waitForLoad?: boolean;
}

// Using the externalized EmojiItem component instead

// Memoized row of emojis
const EmojiRow = memo(({ 
  emojis, 
  onEmojiSelect,
  serverUrl
}: { 
  emojis: Array<EmojiData | { emoji: string, name: string, unified: string }>, 
  onEmojiSelect: (emoji: string, name: string, unified: string) => void,
  serverUrl?: string
}) => {
  // Use React.memo at component level for maximum performance
  const memoizedEmojis = useMemo(() => {
    return emojis.map((emoji, i) => (
      <EmojiItem 
        key={`emoji-${(emoji as any).unified}-${i}`} 
        emoji={emoji as any} 
        onSelect={onEmojiSelect} 
        serverUrl={serverUrl}
      />
    ));
  }, [emojis, onEmojiSelect, serverUrl]);
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'row',
        px: 1,
        justifyContent: 'flex-start'
      }}
    >
      {memoizedEmojis}
    </Box>
  );
});

// Memoized category header
const CategoryHeader = memo(({ 
  category 
}: { 
  category: string 
}) => {
  return (
    <Typography 
      variant="subtitle2" 
      sx={{ 
        px: 1, 
        py: 0.5, 
        fontWeight: 'bold',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        transform: 'translateZ(0)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}
    >
      {EMOJI_CATEGORIES[category]?.label || 
       category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </Typography>
  );
});

// Global CSS for animations
const emojiPickerStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

/**
 * Optimized emoji picker component with simplified virtualization
 */
export function EmojiPicker({
  onEmojiSelect,
  showCategoryTabs = true,
  showSearchBar = true,
  initialCategory = 'smileys-emotion',
  height = 280, // Reduced from 350 to fit 6x6 grid + header + search
  width = 222,  // Calculated exactly: (EMOJI_SIZE(28) + margin(8)) * 6 emojis = 216 + 6px padding
  serverUrl,
  waitForLoad = false
}: EmojiPickerProps) {
  // Add styles to document for animations
  useEffect(() => {
    // Add styles for animations if not already present
    if (!document.getElementById('emoji-picker-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'emoji-picker-styles';
      styleEl.textContent = emojiPickerStyles;
      document.head.appendChild(styleEl);
      
      // Return cleanup function
      return () => {
        if (document.getElementById('emoji-picker-styles')) {
          document.getElementById('emoji-picker-styles')?.remove();
        }
      };
    }
  }, []);
  
  // Loading state - always false as we don't want to block UI
  const [isLoading, setIsLoading] = useState(false);
  
  // State for recent emojis
  const [recentEmojis, setRecentEmojis] = useState<{ emoji: string, name: string, unified: string }[]>([]);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmojiData[]>([]);
  
  // State for active category (for highlighting in tabs)
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  
  // Refs
  const listRef = useRef<any>(null);
  const categoryPositionsRef = useRef<Record<string, number>>({});
  const isScrollingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const lastVisibleCategoryRef = useRef<string | null>(null);
  
  // Track last scroll direction
  const lastScrollDirectionRef = useRef<'up' | 'down'>('down');
  const lastScrollOffsetRef = useRef<number>(0);
  const directionChangeTimestampRef = useRef<number>(0);
  const lastTransitionCompleteRef = useRef<boolean>(true);
  
  // Track current visible emoji index
  const visibleEmojiIndexRef = useRef<{ category: string, index: number } | null>(null);
  
  // Make sure emoji preloader is initialized
  useEffect(() => {
    if (!emojiLoadStatus.isInitialized) {
      initializeEmojiPreloader(serverUrl);
    }
  }, [serverUrl]);
  
  // Preload emojis around a specific index in category
  const preloadAroundIndex = useCallback((category: string, centerIndex: number) => {
    if (category === 'recent' || category === 'search') return;
    
    // Use global preloader service to load emojis around center index (±30)
    preloadEmojisAround(category, centerIndex, serverUrl);
  }, [serverUrl]);
  
  // Preload emojis in specific scroll direction
  const preloadInDirectionHandler = useCallback((category: string, centerIndex: number, direction: 'up' | 'down') => {
    if (category === 'recent' || category === 'search') return;
    
    // Preload more in the direction of scroll using global service
    preloadInDirection(category, centerIndex, direction, serverUrl);
    
    // Also preload next/previous category if near edge
    const emojis = EMOJI_SPRITE_DATA[category] || [];
    const categoryIndex = CATEGORY_ORDER.indexOf(category);
    
    // If scrolling down and near end of category, preload next category
    if (direction === 'down' && centerIndex > emojis.length - 50 && categoryIndex < CATEGORY_ORDER.length - 1) {
      const nextCategory = CATEGORY_ORDER[categoryIndex + 1];
      if (nextCategory !== 'recent') {
        preloadEmojisAround(nextCategory, 0, serverUrl);
      }
    }
    
    // If scrolling up and near start of category, preload previous category
    if (direction === 'up' && centerIndex < 50 && categoryIndex > 0) {
      const prevCategory = CATEGORY_ORDER[categoryIndex - 1];
      if (prevCategory !== 'recent') {
        const prevCategoryEmojis = EMOJI_SPRITE_DATA[prevCategory] || [];
        if (prevCategoryEmojis.length > 0) {
          preloadEmojisAround(prevCategory, Math.max(0, prevCategoryEmojis.length - 1), serverUrl);
        }
      }
    }
  }, [serverUrl]);
  
  // We always set loading to false immediately to ensure UI is accessible
  // The background loading will happen transparently
  useEffect(() => {
    // Set loading state to false immediately - we don't want to block UI
    setIsLoading(false);
    
    // We still register listeners for tracking internal state (not for UI blocking)
    const handleSmileysCriticalDone = () => {
      // Just for tracking internally that critical emojis are loaded
      // No UI changes needed here
    };
    
    // Register listener
    addEmojiPreloadListener('smileysCriticalDone', handleSmileysCriticalDone);
    
    // Cleanup
    return () => {
      removeEmojiPreloadListener('smileysCriticalDone', handleSmileysCriticalDone);
    };
  }, []);
  
  // Load recent emojis on mount
  useEffect(() => {
    setRecentEmojis(getRecentEmojis());
  }, []);
  
  // Ensure that initial load is handled by the global preloader service
  useEffect(() => {
    // Only check this once
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    
    // Ensure the global preloader is initialized
    if (!emojiLoadStatus.isInitialized) {
      initializeEmojiPreloader(serverUrl);
    }
  }, [serverUrl]);
  
  // Preload more emojis when active category changes
  useEffect(() => {
    if (activeCategory === 'recent') return;
    
    // Calculate center index for this category
    let centerIndex = 0;
    
    // If we have a visible index, use it
    if (
      visibleEmojiIndexRef.current && 
      visibleEmojiIndexRef.current.category === activeCategory
    ) {
      centerIndex = visibleEmojiIndexRef.current.index;
    }
    
    // Preload around this center index
    preloadAroundIndex(activeCategory, centerIndex);
    
    // Update last visible category
    lastVisibleCategoryRef.current = activeCategory;
  }, [activeCategory, preloadAroundIndex]);
  
  // Get all emoji sections (categories with their emojis)
  const allEmojiSections = useMemo(() => {
    try {
      // Initialiser un tableau pour les sections
      const sections: Array<{
        category: string;
        emojis: Array<EmojiData | { emoji: string, name: string, unified: string }>;
      }> = [];
      
      // Ajouter les émojis récents s'ils existent
      if (recentEmojis && recentEmojis.length > 0) {
        sections.push({ category: 'recent', emojis: recentEmojis });
      }
      
      // Ajouter toutes les autres catégories
      for (const category of CATEGORY_ORDER) {
        if (category === 'recent') continue;
        
        // Utiliser EMOJI_SPRITE_DATA pour récupérer les émojis
        const emojis = EMOJI_SPRITE_DATA[category] || [];
        
        if (emojis.length > 0) {
          sections.push({ category, emojis });
        } else if (category === 'smileys-emotion') {
          // S'assurer que la catégorie smileys-emotion existe toujours
          sections.push({
            category,
            emojis: [{
              name: "GRINNING FACE",
              unified: "1F600",
              short_name: "grinning",
              short_names: ["grinning"],
              sheet_x: 12,
              sheet_y: 14,
              category: "smileys-emotion",
              emoji: '😀'
            }]
          });
        }
      }
      
      // Protection ultime : s'assurer qu'il y a au moins une section
      if (sections.length === 0) {
        console.warn('Aucune section d\'emoji trouvée, utilisation du fallback');
        sections.push({
          category: 'smileys-emotion',
          emojis: [{
            name: "GRINNING FACE",
            unified: "1F600",
            short_name: "grinning",
            short_names: ["grinning"],
            sheet_x: 12,
            sheet_y: 14,
            category: "smileys-emotion",
            emoji: '😀'
          }]
        });
      }
      
      return sections;
    } catch (error) {
      console.error('Erreur lors de la création des sections d\'émojis:', error);
      // Retourner une section minimale pour éviter les erreurs
      return [{
        category: 'smileys-emotion',
        emojis: [{
          name: "GRINNING FACE",
          unified: "1F600",
          short_name: "grinning",
          short_names: ["grinning"],
          sheet_x: 12,
          sheet_y: 14,
          category: "smileys-emotion",
          emoji: '😀'
        }]
      }];
    }
  }, [recentEmojis]);
  
  // Calculate the row data from the sections
  const rowData = useMemo(() => {
    const rows: Array<{
      type: 'header' | 'emojis';
      category: string;
      emojis?: Array<EmojiData | { emoji: string, name: string, unified: string }>;
      index: number;
    }> = [];
    
    let index = 0;
    
    // Prepare category positions for scrolling navigation
    const positions: Record<string, number> = {};
    
    allEmojiSections.forEach(({ category, emojis }) => {
      // Add header position
      positions[category] = index;
      
      // Add header
      rows.push({ type: 'header', category, index: index++ });
      
      // Add emoji rows
      const rowCount = Math.ceil(emojis.length / EMOJIS_PER_ROW);
      for (let i = 0; i < rowCount; i++) {
        const startIdx = i * EMOJIS_PER_ROW;
        const rowEmojis = emojis.slice(startIdx, startIdx + EMOJIS_PER_ROW);
        rows.push({ type: 'emojis', emojis: rowEmojis, category, index: index++ });
      }
    });
    
    // Update category positions ref
    categoryPositionsRef.current = positions;
    
    return rows;
  }, [allEmojiSections]);
  
  // Process search results into rows
  const searchResultRows = useMemo(() => {
    const rows: Array<Array<EmojiData>> = [];
    
    for (let i = 0; i < searchResults.length; i += EMOJIS_PER_ROW) {
      rows.push(searchResults.slice(i, i + EMOJIS_PER_ROW));
    }
    
    return rows;
  }, [searchResults]);
  
  // Handle emoji selection with memoization - optimized for faster response
  const handleEmojiSelect = useCallback((emoji: string, name: string, unified: string) => {
    if (!emoji || !name) return;
    
    // First call the provided callback immediately for fastest response
    // This ensures the reaction appears ASAP
    onEmojiSelect(emoji, name, unified);
    
    // Then do non-critical operations asynchronously
    setTimeout(() => {
      // Store in recent emojis
      storeRecentEmoji(emoji, name, unified);
      
      // Update recent emojis in UI (not critical since picker is closing)
      setRecentEmojis(getRecentEmojis());
    }, 0);
  }, [onEmojiSelect]);
  
  // Handle category change from tabs - high priority operation
  const handleCategoryChange = useCallback((category: string) => {
    // DRASTIC EMERGENCY STOP - halt all current emoji loading
    stopEmojiLoading();
    
    // Clear any pending scroll loads
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    
    setActiveCategory(category);
    
    // Clear search if active
    if (searchQuery) {
      setSearchQuery('');
    }
    
    // Load STRICTLY only visible emojis (42 max) with ZERO adjacent preloading
    if (category !== 'recent') {
      // Prepare to load ONLY the visible viewport
      const categoryEmojis = EMOJI_SPRITE_DATA[category] || [];
      
      // First, cancel ALL existing emoji loads to ensure resources focus on visible area
      stopEmojiLoading();
      
      // Load exactly and ONLY the visible area (7 rows of 6 = 42 emojis)
      // This is the absolute minimum required to render what's on screen
      const maxEmojisToLoad = Math.min(categoryEmojis.length, VISIBLE_EMOJI_COUNT);
      
      // Visual optimization: create perceptual priority by loading center-outward
      // Center rows are most important for user perception
      const visibleRows = Math.ceil(maxEmojisToLoad / EMOJIS_PER_ROW);
      const centerRowIndex = Math.floor(visibleRows / 2);
      
      // First, load ONLY row 3 and 4 (middle rows) - highest visual impact
      const middleRowsEmojis: number[] = [];
      
      // Row 3 (center row)
      const centerRowStart = centerRowIndex * EMOJIS_PER_ROW;
      for (let col = 0; col < EMOJIS_PER_ROW; col++) {
        const index = centerRowStart + col;
        if (index < maxEmojisToLoad) middleRowsEmojis.push(index);
      }
      
      // Row 4 (just below center)
      if (centerRowIndex + 1 < visibleRows) {
        const belowRowStart = (centerRowIndex + 1) * EMOJIS_PER_ROW;
        for (let col = 0; col < EMOJIS_PER_ROW; col++) {
          const index = belowRowStart + col;
          if (index < maxEmojisToLoad) middleRowsEmojis.push(index);
        }
      }
      
      // Middle rows load IMMEDIATELY (highest priority)
      middleRowsEmojis.forEach(i => {
        const emoji = categoryEmojis[i];
        if (emoji?.unified) {
          enqueueEmoji(emoji.unified, 'critical', serverUrl);
        }
      });
      
      // Prepare remaining rows by proximity to center (closest first)
      const remainingIndices: number[] = [];
      
      // Load other rows in alternating pattern starting from closest to center
      for (let offset = 1; offset <= visibleRows; offset++) {
        // Skip middle rows (already loaded)
        if (offset === 0 || offset === 1) continue;
        
        // Row above center
        if (centerRowIndex - offset >= 0) {
          const rowStart = (centerRowIndex - offset) * EMOJIS_PER_ROW;
          for (let col = 0; col < EMOJIS_PER_ROW; col++) {
            const index = rowStart + col;
            if (index < maxEmojisToLoad) remainingIndices.push(index);
          }
        }
        
        // Row below center + 1 (row 5 and beyond)
        if (centerRowIndex + offset + 1 < visibleRows) {
          const rowStart = (centerRowIndex + offset + 1) * EMOJIS_PER_ROW;
          for (let col = 0; col < EMOJIS_PER_ROW; col++) {
            const index = rowStart + col;
            if (index < maxEmojisToLoad) remainingIndices.push(index);
          }
        }
      }
      
      // Add any remaining indices (ensuring we don't miss any)
      for (let i = 0; i < maxEmojisToLoad; i++) {
        if (!middleRowsEmojis.includes(i) && !remainingIndices.includes(i)) {
          remainingIndices.push(i);
        }
      }
      
      // Now load remaining in batches with minimal staggered delays
      // Group into batches of 6 (one row at a time)
      const batchSize = 6;
      const batches = Math.ceil(remainingIndices.length / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, remainingIndices.length);
        const batchIndices = remainingIndices.slice(start, end);
        
        // Add a very small delay to allow UI to be responsive
        // Just enough to avoid blocking the main thread
        const delay = 10 + (batch * 15); // 10ms initial delay, then 15ms per batch
        
        setTimeout(() => {
          batchIndices.forEach(i => {
            const emoji = categoryEmojis[i];
            if (emoji?.unified) {
              enqueueEmoji(emoji.unified, 'critical', serverUrl);
            }
          });
        }, delay);
      }
    }
    
    // Scroll to category position
    if (listRef.current && categoryPositionsRef.current[category] !== undefined) {
      isScrollingRef.current = true;
      listRef.current.scrollToItem(categoryPositionsRef.current[category], 'start');
      
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }, [searchQuery, serverUrl]);
  
  // Track for debouncing search changes
  const searchTimeoutRef = useRef<number | null>(null);
  const prevSearchQueryRef = useRef<string>('');
  
  // Optimized search input handler with intelligent debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const isAddingText = value.length > prevSearchQueryRef.current.length;
    const isDeletingText = value.length < prevSearchQueryRef.current.length;
    
    // Cancel any existing timeout
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // If starting a search or deleting all text, process immediately
    if ((!searchQuery && value) || value === '') {
      // If starting, stop all current emoji loading
      if (!searchQuery && value) {
        stopEmojiLoading();
      }
      
      // Update without delay
      setSearchQuery(value);
      prevSearchQueryRef.current = value;
      return;
    }
    
    // Deletions should be faster to feel responsive
    // Adding text can have slightly more delay for better performance
    const debounceTime = isDeletingText ? 10 : 150;
    
    // Use timeout to debounce
    searchTimeoutRef.current = window.setTimeout(() => {
      // If deleting, first stop all loading to focus on immediately showing what's left
      if (isDeletingText) {
        stopEmojiLoading();
      }
      
      setSearchQuery(value);
      prevSearchQueryRef.current = value;
    }, debounceTime);
  }, [searchQuery]);
  
  // Search results cache to avoid recalculation on small changes
  const searchResultsCacheRef = useRef<Record<string, EmojiData[]>>({});
  
  // Search functionality with improved partial matching
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    
    // First stop all current emoji loading to prioritize search results
    stopEmojiLoading();
    
    const query = searchQuery.toLowerCase().trim();
    
    // Check if we have cached results for this query
    if (searchResultsCacheRef.current[query]) {
      const cachedResults = searchResultsCacheRef.current[query];
      setSearchResults(cachedResults);
      
      // Still load the emojis, but no need to recompute results
      const visibleResults = cachedResults;
      const maxEmojis = Math.min(visibleResults.length, VISIBLE_EMOJI_COUNT);
      
      // Immediately load the first visible row for fast feedback
      for (let i = 0; i < Math.min(6, maxEmojis); i++) {
        const emoji = visibleResults[i];
        if (emoji?.unified) {
          enqueueEmoji(emoji.unified, 'critical', serverUrl);
        }
      }
      
      // Load the rest with slight delay to prioritize first row
      if (maxEmojis > 6) {
        setTimeout(() => {
          for (let i = 6; i < maxEmojis; i++) {
            const emoji = visibleResults[i];
            if (emoji?.unified) {
              enqueueEmoji(emoji.unified, 'critical', serverUrl);
            }
          }
        }, 50);
      }
      
      return;
    }
    
    // Optimize for backspace/delete (check if current query is prefix of any cached query)
    if (prevSearchQueryRef.current.startsWith(query)) {
      // This is a delete operation - we can filter from previous results instead of full search
      const prevResults = searchResultsCacheRef.current[prevSearchQueryRef.current];
      if (prevResults) {
        // Filter the previous results to match the new query
        const filteredResults = prevResults.filter(emoji => {
          const shortName = emoji.short_name || '';
          return shortName.includes(query) || 
                 emoji.name.toLowerCase().includes(query) ||
                 emoji.short_names?.some(name => name.includes(query));
        });
        
        // Cache and use these results
        searchResultsCacheRef.current[query] = filteredResults;
        setSearchResults(filteredResults);
        
        // Load visible emojis only
        const maxEmojis = Math.min(filteredResults.length, VISIBLE_EMOJI_COUNT);
        for (let i = 0; i < maxEmojis; i++) {
          const emoji = filteredResults[i];
          if (emoji?.unified) {
            enqueueEmoji(emoji.unified, 'critical', serverUrl);
          }
        }
        
        return;
      }
    }
    
    // Not in cache, perform full search
    const results: Array<{ emoji: EmojiData, score: number }> = [];
    const seenUnified = new Set<string>();
    
    // Scoring function - higher score = better match
    const scoreMatch = (match: string, query: string): number => {
      // Exact match gets highest score
      if (match === query) return 100;
      
      // Starts with query gets high score
      if (match.startsWith(query)) return 80;
      
      // Contains query as a full word gets medium score
      if (match.includes(` ${query}`) || match.includes(`_${query}`)) return 60;
      
      // Contains query gets lower score
      if (match.includes(query)) return 40;
      
      // Word contains parts of query gets lowest score
      const queryParts = query.split(/[\s_-]+/).filter(Boolean);
      if (queryParts.length > 1) {
        let matchCount = 0;
        for (const part of queryParts) {
          if (part.length > 1 && match.includes(part)) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          return 20 + (matchCount / queryParts.length) * 20;
        }
      }
      
      return 0;
    };
    
    // First try exact matches for instant feedback
    if (EMOJI_BY_SHORT_NAME[query]) {
      results.push({ emoji: EMOJI_BY_SHORT_NAME[query], score: 100 });
      seenUnified.add(EMOJI_BY_SHORT_NAME[query].unified);
    }
    
    // Try partial matches across all categories
    for (const category of CATEGORY_ORDER) {
      if (category === 'recent') continue;
      
      const categoryEmojis = EMOJI_SPRITE_DATA[category] || [];
      for (const emoji of categoryEmojis) {
        // Skip already found emojis
        if (seenUnified.has(emoji.unified)) continue;
        
        let bestScore = 0;
        
        // Check short_name match score
        const shortNameScore = scoreMatch(emoji.short_name, query);
        if (shortNameScore > bestScore) bestScore = shortNameScore;
        
        // Check short_names for any matches
        for (const name of emoji.short_names) {
          const nameScore = scoreMatch(name, query);
          if (nameScore > bestScore) bestScore = nameScore;
        }
        
        // Check full name match score
        const fullNameScore = scoreMatch(emoji.name.toLowerCase(), query);
        if (fullNameScore > bestScore) bestScore = fullNameScore;
        
        // If we have a match, add to results
        if (bestScore > 0) {
          results.push({ emoji, score: bestScore });
          seenUnified.add(emoji.unified);
        }
      }
    }
    
    // Sort by score (highest first) and limit to what's visible
    results.sort((a, b) => b.score - a.score);
    
    // Only take exactly what fits on the screen (42 emojis = 7 rows of 6)
    const visibleResults = results.slice(0, VISIBLE_EMOJI_COUNT).map(result => result.emoji);
    
    // Cache the results for this query
    searchResultsCacheRef.current[query] = visibleResults;
    
    // Limit cache size to avoid memory issues
    const MAX_CACHE_ENTRIES = 20;
    const cacheKeys = Object.keys(searchResultsCacheRef.current);
    if (cacheKeys.length > MAX_CACHE_ENTRIES) {
      // Remove oldest entries (first ones in the object)
      const keysToRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
      keysToRemove.forEach(key => {
        delete searchResultsCacheRef.current[key];
      });
    }
    
    // IMPROVED LOADING: First load rows 3-4 (center) IMMEDIATELY for perceived performance
    const middleRowIndex = Math.floor(visibleResults.length / (EMOJIS_PER_ROW * 2));
    const middleRowStart = middleRowIndex * EMOJIS_PER_ROW;
    const middleRowEnd = Math.min(middleRowStart + (2 * EMOJIS_PER_ROW), visibleResults.length);
    
    // Load middle rows immediately
    for (let i = middleRowStart; i < middleRowEnd; i++) {
      const emoji = visibleResults[i];
      if (emoji?.unified) {
        enqueueEmoji(emoji.unified, 'critical', serverUrl);
      }
    }
    
    // Then load remaining with small staggered delay
    setTimeout(() => {
      for (let i = 0; i < visibleResults.length; i++) {
        // Skip already loaded middle rows
        if (i >= middleRowStart && i < middleRowEnd) continue;
        
        const emoji = visibleResults[i];
        if (emoji?.unified) {
          enqueueEmoji(emoji.unified, 'critical', serverUrl);
        }
      }
    }, 20);
    
    setSearchResults(visibleResults);
  }, [searchQuery, serverUrl]);
  
  // Track scroll velocity and timing for smart loading
  const scrollTimerRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollVelocityRef = useRef<number>(0);
  const isScrollingFastRef = useRef<boolean>(false);

  // Handle scroll to update active category and preload emojis
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    // Detect scroll direction as up/down
    const currentDirection: 'up' | 'down' = 
      scrollOffset < lastScrollOffsetRef.current ? 'up' : 'down';
    
    // Check if direction changed
    const directionChanged = currentDirection !== lastScrollDirectionRef.current;
    if (directionChanged) {
      // Record when direction changed
      directionChangeTimestampRef.current = Date.now();
      lastScrollDirectionRef.current = currentDirection;
      
      // Handle direction change - this is when flickering occurs
      // Ensure transitions are complete before allowing new loads
      if (lastTransitionCompleteRef.current) {
        lastTransitionCompleteRef.current = false;
        
        // Aggressively load emojis in both directions around current point
        if (visibleEmojiIndexRef.current) {
          const { category, index } = visibleEmojiIndexRef.current;
          const emojis = EMOJI_SPRITE_DATA[category] || [];
          
          // Load a smaller area around current position (3 rows total for better performance)
          const centerRowIndex = Math.floor(index / EMOJIS_PER_ROW);
          const startRow = Math.max(0, centerRowIndex - 1);
          const endRow = Math.min(Math.ceil(emojis.length / EMOJIS_PER_ROW), centerRowIndex + 2);
          
          // Cancel any pending loads to prioritize this
          if (scrollTimerRef.current !== null) {
            window.clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = null;
          }
          
          // Load all visible emojis first with critical priority
          for (let row = startRow; row < endRow; row++) {
            for (let col = 0; col < EMOJIS_PER_ROW; col++) {
              const emojiIndex = (row * EMOJIS_PER_ROW) + col;
              if (emojiIndex < emojis.length) {
                const emoji = emojis[emojiIndex];
                if (emoji?.unified) {
                  enqueueEmoji(emoji.unified, 'critical', serverUrl);
                }
              }
            }
          }
          
          // Mark transition as complete after a short delay
          setTimeout(() => {
            lastTransitionCompleteRef.current = true;
          }, 300);
        }
      }
    }
    
    // Calculate scroll velocity
    const now = Date.now();
    const timeDelta = now - lastScrollTimeRef.current;
    lastScrollTimeRef.current = now;
    
    const distanceDelta = Math.abs(scrollOffset - lastScrollOffsetRef.current);
    lastScrollOffsetRef.current = scrollOffset;
    
    // Calculate velocity (distance per ms)
    if (timeDelta > 0) {
      scrollVelocityRef.current = distanceDelta / timeDelta;
    }
    
    // Determine if we're scrolling fast (more than 0.5 pixels per ms, or 500px per second)
    const isFastScroll = scrollVelocityRef.current > 0.5;
    isScrollingFastRef.current = isFastScroll;
    
    // Skip if programmatic scrolling
    if (isScrollingRef.current) return;
    
    // Find the visible indices
    if (!listRef.current) return;
    
    const visibleIndices = listRef.current._getRangeToRender();
    if (!visibleIndices || visibleIndices.length < 2) return;
    
    const [startIndex, endIndex] = visibleIndices;
    const middleIndex = Math.floor((startIndex + endIndex) / 2);
    
    // Find which category these indices belong to
    let currentCategory = '';
    let nextCategory = '';
    
    // Entries sorted by position
    const sortedCategories = Object.entries(categoryPositionsRef.current)
      .sort(([, posA], [, posB]) => posA - posB);
    
    // Find current category for middle index
    for (let i = 0; i < sortedCategories.length; i++) {
      const [category, position] = sortedCategories[i];
      
      if (position <= middleIndex) {
        currentCategory = category;
        
        // Find the next category for boundary detection
        if (i < sortedCategories.length - 1) {
          nextCategory = sortedCategories[i + 1][0];
        }
      } else {
        break;
      }
    }
    
    // Always update active category regardless of scroll speed
    if (currentCategory && currentCategory !== activeCategory) {
      setActiveCategory(currentCategory);
    }
    
    // If we found a category for the middle index
    if (currentCategory && currentCategory !== 'recent') {
      // Calculate approximate emoji index within category
      const categoryPosition = categoryPositionsRef.current[currentCategory] || 0;
      const rowsIntoCategory = middleIndex - categoryPosition;
      
      // Each category has a header row, then emoji rows
      if (rowsIntoCategory > 0) {
        // First row is header, rest are emoji rows with EMOJIS_PER_ROW emojis each
        const approxEmojiIndex = (rowsIntoCategory - 1) * EMOJIS_PER_ROW;
        
        // Store visible emoji index for category switching
        visibleEmojiIndexRef.current = {
          category: currentCategory,
          index: approxEmojiIndex
        };
        
        // Direction change is now handled at the top of the scroll handler
        
        // If we're scrolling fast, stop all current loading and wait
        if (isFastScroll) {
          // Cancel any existing timer
          if (scrollTimerRef.current !== null) {
            window.clearTimeout(scrollTimerRef.current);
          }
          
          // Set timer for loading after scroll stops/slows
          scrollTimerRef.current = window.setTimeout(() => {
            // By now scrolling has slowed or stopped
            // Load exactly 36 emojis (6x6 grid) that are visible now
            
            // Get current visible window
            // This is the exact area user is looking at after scrolling
            const centerRowStart = Math.floor(approxEmojiIndex / EMOJIS_PER_ROW) * EMOJIS_PER_ROW;
            
            // Calculate EXACTLY the emojis that should be visible (7 rows of 6 = 42 emojis)
            const visibleStart = Math.max(0, centerRowStart - 3 * EMOJIS_PER_ROW); // 3 rows above
            const finalStart = Math.max(0, visibleStart);
            const visibleEnd = finalStart + VISIBLE_EMOJI_COUNT; // Exactly what's visible
            
            if (currentCategory !== 'recent') {
              const categoryEmojis = EMOJI_SPRITE_DATA[currentCategory] || [];
              const finalEnd = Math.min(categoryEmojis.length, visibleEnd);
              
              // Cancel all other loading by requesting ONLY EXACTLY what's visible
              // Using visual priority loading (center first, then outward)
              
              // Calculate rows and optimize loading order from center row outward
              const totalEmojis = finalEnd - finalStart;
              const rows = Math.ceil(totalEmojis / EMOJIS_PER_ROW);
              const centerRowIndex = Math.floor(rows / 2);
              
              // First load center row
              const centerRowStart = finalStart + (centerRowIndex * EMOJIS_PER_ROW);
              const centerRowEnd = Math.min(finalEnd, centerRowStart + EMOJIS_PER_ROW);
              
              const centerEmojis = categoryEmojis.slice(centerRowStart, centerRowEnd);
              // Load center row immediately with highest priority
              centerEmojis.forEach(emoji => {
                if (emoji?.unified) {
                  enqueueEmoji(emoji.unified, 'critical', serverUrl);
                }
              });
              
              // Then load rows above and below center in alternating order
              for (let offset = 1; offset <= centerRowIndex || centerRowIndex + offset < rows; offset++) {
                // Add small delay per row distance from center
                const delay = offset * 10; // 10ms per row away from center
                
                setTimeout(() => {
                  // Row below center (if exists)
                  if (centerRowIndex + offset < rows) {
                    const belowRowStart = centerRowStart + (offset * EMOJIS_PER_ROW);
                    const belowRowEnd = Math.min(finalEnd, belowRowStart + EMOJIS_PER_ROW);
                    
                    const belowEmojis = categoryEmojis.slice(belowRowStart, belowRowEnd);
                    belowEmojis.forEach(emoji => {
                      if (emoji?.unified) {
                        enqueueEmoji(emoji.unified, 'critical', serverUrl);
                      }
                    });
                  }
                  
                  // Row above center (if exists)
                  if (centerRowIndex - offset >= 0) {
                    const aboveRowStart = centerRowStart - (offset * EMOJIS_PER_ROW);
                    const aboveRowEnd = Math.min(aboveRowStart + EMOJIS_PER_ROW, centerRowStart);
                    
                    const aboveEmojis = categoryEmojis.slice(Math.max(0, aboveRowStart), aboveRowEnd);
                    aboveEmojis.forEach(emoji => {
                      if (emoji?.unified) {
                        enqueueEmoji(emoji.unified, 'critical', serverUrl);
                      }
                    });
                  }
                }, delay);
              }
              
              // REMOVED: No preloading in any direction until actually needed
              // This prevents unnecessary loading of non-visible emojis
            }
            
            scrollTimerRef.current = null;
          }, 100); // Reduced from 150ms to 100ms for faster response
        }
        // For slow scrolling, immediately load what's needed
        else {
          // Cancel any existing timer as we're now loading
          if (scrollTimerRef.current !== null) {
            window.clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = null;
          }
          
          // Check if we recently changed direction (within last 300ms)
          const timeSinceDirectionChange = Date.now() - directionChangeTimestampRef.current;
          const isInDirectionChangePeriod = timeSinceDirectionChange < 300;
          
          if (isInDirectionChangePeriod) {
            // When direction just changed, load EXACTLY what's visible at the new position
            // This prevents the "disappearing emoji" effect when changing scroll direction
            const categoryEmojis = EMOJI_SPRITE_DATA[currentCategory] || [];
            
            // Get exact visible area - ONLY what's visible (7 rows of 6 = 42 emojis)
            const centerRowStart = Math.floor(approxEmojiIndex / EMOJIS_PER_ROW) * EMOJIS_PER_ROW;
            const visibleRowStart = Math.max(0, Math.floor(centerRowStart / EMOJIS_PER_ROW) - 3);
            const visibleStart = visibleRowStart * EMOJIS_PER_ROW;
            const visibleEnd = Math.min(categoryEmojis.length, visibleStart + VISIBLE_EMOJI_COUNT);
            
            // Load only visible emojis with center-outward priority
            // First the center rows - they're most important
            const rows = Math.ceil((visibleEnd - visibleStart) / EMOJIS_PER_ROW);
            const middleRow = Math.floor(rows / 2);
            
            // Immediate load for middle row
            const middleRowStart = visibleStart + (middleRow * EMOJIS_PER_ROW);
            const middleRowEnd = Math.min(visibleEnd, middleRowStart + EMOJIS_PER_ROW);
            
            // Load middle row immediately
            for (let i = middleRowStart; i < middleRowEnd; i++) {
              const emoji = categoryEmojis[i];
              if (emoji?.unified) {
                enqueueEmoji(emoji.unified, 'critical', serverUrl);
              }
            }
            
            // Then load other rows with minimal delays
            for (let offset = 1; offset < rows; offset++) {
              // Row above middle (if exists)
              if (middleRow - offset >= 0) {
                const rowStart = visibleStart + ((middleRow - offset) * EMOJIS_PER_ROW);
                const rowEnd = rowStart + EMOJIS_PER_ROW;
                
                setTimeout(() => {
                  for (let i = rowStart; i < Math.min(rowEnd, visibleEnd); i++) {
                    const emoji = categoryEmojis[i];
                    if (emoji?.unified) {
                      enqueueEmoji(emoji.unified, 'critical', serverUrl);
                    }
                  }
                }, offset * 5); // Very tiny delays
              }
              
              // Row below middle (if exists)
              if (middleRow + offset < rows) {
                const rowStart = visibleStart + ((middleRow + offset) * EMOJIS_PER_ROW);
                const rowEnd = rowStart + EMOJIS_PER_ROW;
                
                setTimeout(() => {
                  for (let i = rowStart; i < Math.min(rowEnd, visibleEnd); i++) {
                    const emoji = categoryEmojis[i];
                    if (emoji?.unified) {
                      enqueueEmoji(emoji.unified, 'critical', serverUrl);
                    }
                  }
                }, offset * 5); // Very tiny delays
              }
            }
          } else {
            // For normal scrolling, just load what's exactly visible - no extra preloading
            // This loads EXACTLY the emoji rows on screen
            const categoryEmojis = EMOJI_SPRITE_DATA[currentCategory] || [];
            const visibleStart = Math.max(0, approxEmojiIndex - 18); // 3 rows above (18 emojis)
            const visibleEnd = Math.min(categoryEmojis.length, approxEmojiIndex + 24); // 4 rows below (24 emojis)
            
            // Load visible area (exactly 7 rows)
            const emojisToLoad = categoryEmojis.slice(visibleStart, visibleEnd);
            emojisToLoad.forEach(emoji => {
              if (emoji?.unified) {
                enqueueEmoji(emoji.unified, 'high', serverUrl);
              }
            });
          }
          
          // If we're near the edge of a category, prepare the next/prev
          const currentEmojis = EMOJI_SPRITE_DATA[currentCategory] || [];
          
          // No adjacent category preloading to minimize HTTP requests
          // We only load emojis when they become visible
        }
      }
    }
  }, [activeCategory, preloadAroundIndex, preloadInDirectionHandler, serverUrl]);
  
  // Get row height
  const getRowHeight = useCallback((index: number) => {
    const row = rowData[index];
    if (!row) return EMOJI_ROW_HEIGHT;
    
    return row.type === 'header' ? CATEGORY_HEADER_HEIGHT : EMOJI_ROW_HEIGHT;
  }, [rowData]);
  
  // Memoized category tabs
  const categoryTabs = useMemo(() => {
    // Get available categories
    const availableCategories = Object.keys(categoryPositionsRef.current);
    
    return (
      <Box 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.2) transparent',
          '&::-webkit-scrollbar': {
            height: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
          }
        }}
      >
        {availableCategories.map(category => (
          <Tooltip key={category} title={EMOJI_CATEGORIES[category]?.label || category}>
            <IconButton
              onClick={() => handleCategoryChange(category)}
              color={activeCategory === category ? 'primary' : 'default'}
              sx={{ 
                borderRadius: 0,
                borderBottom: activeCategory === category ? 2 : 0,
                borderColor: 'primary.main',
                p: 0.5, // Reduced padding
                minWidth: '24px', // Reduced from 32px
                width: '24px', // Fixed width for consistent spacing
                height: '24px', // Fixed height
                '& .MuiSvgIcon-root': {
                  fontSize: '1rem' // Smaller icons
                }
              }}
            >
              {CATEGORY_ICONS[category] || <EmoticonIcon />}
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    );
  }, [activeCategory, handleCategoryChange]);
  
  // Render row (memoized)
  const renderRow = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
    const row = rowData[index];
    if (!row) return null;
    
    if (row.type === 'header') {
      return (
        <div style={style}>
          <CategoryHeader category={row.category} />
        </div>
      );
    } else {
      // Emoji row
      return (
        <div style={style}>
          <EmojiRow 
            emojis={row.emojis || []} 
            onEmojiSelect={handleEmojiSelect} 
            serverUrl={serverUrl}
          />
        </div>
      );
    }
  }, [rowData, handleEmojiSelect, serverUrl]);
  
  // Memoized search results component
  const searchResultsComponent = useMemo(() => {
    if (searchResults.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No emojis found</Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle2" sx={{ px: 1, mb: 1, fontWeight: 'bold' }}>
          Search Results
        </Typography>
        
        {searchResultRows.map((row, rowIndex) => (
          <EmojiRow 
            key={`search-row-${rowIndex}`}
            emojis={row} 
            onEmojiSelect={handleEmojiSelect} 
            serverUrl={serverUrl}
          />
        ))}
      </Box>
    );
  }, [searchResults, searchResultRows, handleEmojiSelect, serverUrl]);
  
  // Prepare the main Paper wrapper for both loading and normal states
  const renderMain = () => (
    <Paper 
      sx={{ 
        width, 
        height, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      {/* Search bar */}
      {showSearchBar && (
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={handleSearchChange}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}
      
      {/* Category tabs - always displayed */}
      {showCategoryTabs && !searchQuery && categoryTabs}
      
      {/* No loading overlay - we want immediate access to all UI elements */}
      
      {/* Emoji content - still rendered during loading for faster transition */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'hidden', 
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        {/* Show search results if searching */}
        {searchQuery ? (
          <Box 
            sx={{ 
              height: '100%',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,0,0,0.2) transparent',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
              }
            }}
          >
            {searchResultsComponent}
          </Box>
        ) : (
          /* Show continuous scrollable list of all categories */
          <AutoSizer>
            {({ width: containerWidth, height: containerHeight }) => (
              <VirtualList
                ref={listRef}
                width={containerWidth}
                height={containerHeight}
                itemCount={rowData.length}
                itemSize={getRowHeight}
                overscanCount={OVERSCAN_COUNT}
                onScroll={handleScroll}
                initialScrollOffset={
                  // If we have a specific category to start at, scroll to it
                  activeCategory && categoryPositionsRef.current[activeCategory] 
                    ? categoryPositionsRef.current[activeCategory] * EMOJI_ROW_HEIGHT 
                    : 0
                }
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0,0,0,0.2) transparent',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                  }
                }}
                // Apply more helpful props for scroll performance
                useIsScrolling={true}
                smoothScrollDuration={200}
              >
                {renderRow}
              </VirtualList>
            )}
          </AutoSizer>
        )}
      </Box>
    </Paper>
  );
  
  // Always render the component immediately, with a loading overlay if needed
  return renderMain();
}

export default EmojiPicker;