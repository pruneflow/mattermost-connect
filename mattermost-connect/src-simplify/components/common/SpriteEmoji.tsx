import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { 
  getEmojiLoadingStatus, 
  getEmojiImage,
  enqueueEmoji
} from '../../utils/emojiPreloader';
import {
  SPRITE_CELL_SIZE,
  getEmojiSpritePosition,
  getEmojiSpriteCSS,
  loadSpriteSheet,
  isSpriteSheetLoaded
} from '../../utils/emojiSpriteSheet';
import { EMOJI_SPRITE_URL } from '../../utils/emojiMapping';

// Constants
const EMOJI_SIZE = 28; // Size of each emoji

// Component props
interface SpriteEmojiProps {
  emoji: { 
    emoji: string, 
    name: string, 
    unified: string,
    short_name?: string,
    short_names?: string[] 
  };
  onSelect: (emoji: string, name: string, unified: string) => void;
  serverUrl?: string;
}

// Optimized emoji component using sprite sheets when available
const SpriteEmoji = memo(({ emoji, onSelect, serverUrl }: SpriteEmojiProps) => {
  const unified = emoji.unified;
  const tooltipTitle = emoji.short_name || emoji.name;
  
  // State for sprite sheet approach
  const [spriteLoaded, setSpriteLoaded] = useState<boolean>(isSpriteSheetLoaded(unified));
  const [spriteCSS, setSpriteCSS] = useState<string | null>(getEmojiSpriteCSS(unified, serverUrl));
  
  // State for fallback approach using individual emojis
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'not-loaded'>(
    spriteLoaded ? 'loaded' : getEmojiLoadingStatus(unified, serverUrl)
  );
  const [everLoaded, setEverLoaded] = useState(loadState === 'loaded');
  const [lastLoadedImage, setLastLoadedImage] = useState(getEmojiImage(unified, serverUrl));
  const emojiImage = getEmojiImage(unified, serverUrl);

  // Initialize sprite sheets if position is available
  useEffect(() => {
    const spritePosition = getEmojiSpritePosition(unified);
    if (spritePosition) {
      const { category, sheetIndex } = spritePosition;
      
      // Check if sprite sheet is already loaded
      if (!isSpriteSheetLoaded(unified)) {
        // Load sprite sheet for this emoji
        loadSpriteSheet(category, sheetIndex, 'high', serverUrl)
          .then(() => {
            setSpriteLoaded(true);
            setSpriteCSS(getEmojiSpriteCSS(unified, serverUrl));
          })
          .catch(() => {
            // Fallback to individual emoji if sprite loading fails
            setSpriteLoaded(false);
            setSpriteCSS(null);
            
            // Request loading via traditional method
            if (loadState === 'not-loaded') {
              enqueueEmoji(unified, 'high', serverUrl);
              setLoadState('loading');
            }
          });
      } else {
        // Sprite sheet already loaded
        setSpriteLoaded(true);
        setSpriteCSS(getEmojiSpriteCSS(unified, serverUrl));
      }
    } else {
      // No sprite position available, use traditional loading
      const initialStatus = getEmojiLoadingStatus(unified, serverUrl);
      
      if (initialStatus === 'not-loaded') {
        enqueueEmoji(unified, 'high', serverUrl);
        setLoadState('loading');
      } else {
        setLoadState(initialStatus);
      }
    }
  }, [unified, serverUrl, loadState]);
  
  // Update everLoaded state when we successfully load
  useEffect(() => {
    if ((loadState === 'loaded' || spriteLoaded) && !everLoaded) {
      setEverLoaded(true);
    }
    
    // Update last loaded image when we get a new one
    if (loadState === 'loaded' && emojiImage) {
      setLastLoadedImage(emojiImage);
    }
  }, [loadState, emojiImage, everLoaded, spriteLoaded]);
  
  // Separate effect for monitoring changes in loading status
  useEffect(() => {
    // Only need this polling if not using sprite sheets
    if (spriteLoaded) return;
    
    // Setup polling to get notified of changes in emoji loading status
    const checkForUpdates = () => {
      // Skip if using sprite sheets
      if (spriteLoaded) return;
      
      const currentStatus = getEmojiLoadingStatus(unified, serverUrl);
      
      // During scrolling direction changes, we want to avoid flickering
      // If the emoji was loaded but now isn't, don't immediately update the state
      if (currentStatus === 'loading' && loadState === 'loaded' && lastLoadedImage) {
        // Don't update during direction changes - keep showing the loaded emoji
        // This prevents the disappearing emoji effect
        return;
      }
      
      if (currentStatus !== loadState && currentStatus !== 'not-loaded') {
        // Only update loadState if it's different and not going back to not-loaded
        // This prevents potential loops if cache gets cleared
        setLoadState(currentStatus);
      }
    };
    
    // Check every 100ms if the loading status has changed
    const intervalId = setInterval(checkForUpdates, 100);
    
    return () => clearInterval(intervalId);
  }, [unified, serverUrl, loadState, lastLoadedImage, spriteLoaded]);
  
  // Handle click
  const handleClick = useCallback(() => {
    onSelect(
      emoji.emoji, 
      emoji.short_name || emoji.name, 
      emoji.unified
    );
  }, [emoji, onSelect]);
  
  return (
    <Tooltip title={tooltipTitle} placement="top">
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: EMOJI_SIZE,
          height: EMOJI_SIZE,
          m: 0.5,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderRadius: '4px'
          }
        }}
        onClick={handleClick}
      >
        {/* Base container always present to prevent layout shifts */}
        <Box 
          sx={{ 
            width: Math.floor(EMOJI_SIZE * 0.75),
            height: Math.floor(EMOJI_SIZE * 0.75),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {/* Semi-transparent placeholder background - always visible for consistent layout */}
          <Box 
            sx={{ 
              position: 'absolute',
              width: '100%',
              height: '100%',
              bgcolor: (spriteLoaded || loadState === 'loaded') ? 'transparent' : 'action.hover',
              borderRadius: '4px',
              opacity: 0.3, // Very subtle - just enough to see, not distracting
              transition: 'opacity 0.2s ease-in-out',
              willChange: 'opacity'
            }}
          />
          
          {/* Unicode fallback when error loading */}
          {loadState === 'error' && !spriteLoaded && (
            <Box 
              sx={{ 
                fontSize: Math.floor(EMOJI_SIZE * 0.75),
                position: 'absolute',
                transition: 'opacity 0.2s ease-in',
                opacity: 1
              }}
            >
              {emoji.emoji}
            </Box>
          )}
          
          {/* Sprite sheet approach (preferred) */}
          {spriteLoaded && spriteCSS && (
            <Box 
              sx={{ 
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: 1,
                transition: 'opacity 0.3s ease-in-out',
                // Apply sprite CSS
                backgroundRepeat: 'no-repeat',
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
              style={{ 
                backgroundImage: `url(${EMOJI_SPRITE_URL})`,
                backgroundPosition: spriteCSS?.split(';')[1]?.split(':')[1]?.trim() || '0 0',
                backgroundSize: '3828px 3828px'
              }}
            />
          )}
          
          {/* Special persistent image handling for traditional approach */}
          {!spriteLoaded && lastLoadedImage && everLoaded && (
            <img 
              src={lastLoadedImage.src} 
              alt={tooltipTitle}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: loadState === 'loaded' ? 1 : 0.7, // Keep slightly visible even during reloading
                transition: 'opacity 0.3s ease-in-out',
                position: 'absolute',
                willChange: 'opacity, transform',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
              }}
            />
          )}
          
          {/* Current image for traditional approach */}
          {!spriteLoaded && emojiImage && !lastLoadedImage && (
            <img 
              src={emojiImage.src} 
              alt={tooltipTitle}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: loadState === 'loaded' ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                position: 'absolute',
                willChange: 'opacity, transform',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
              }}
            />
          )}
        </Box>
      </Box>
    </Tooltip>
  );
});

export default SpriteEmoji;