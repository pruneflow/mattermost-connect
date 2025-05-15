import React, { useState, useEffect, useCallback, memo } from 'react';
import { Box, Tooltip } from '@mui/material';
import { 
  getEmojiLoadingStatus, 
  getEmojiImage,
  enqueueEmoji
} from '../../utils/emojiPreloader';

// Constants
const EMOJI_SIZE = 28; // Size of each emoji

// More efficient implementation of EmojiItem component
interface EmojiItemProps {
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

// Component for individual emoji (memoized)
const EmojiItem = memo(({ emoji, onSelect, serverUrl }: EmojiItemProps) => {
  const unified = emoji.unified;
  const tooltipTitle = emoji.short_name || emoji.name;
  
  // Track image loading state locally using the global service
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error' | 'not-loaded'>(
    getEmojiLoadingStatus(unified, serverUrl)
  );
  
  // Track if we've ever loaded this emoji successfully
  const [everLoaded, setEverLoaded] = useState(loadState === 'loaded');
  
  // Keep reference to last successfully loaded image
  const [lastLoadedImage, setLastLoadedImage] = useState(getEmojiImage(unified, serverUrl));
  
  // Get current image if available
  const emojiImage = getEmojiImage(unified, serverUrl);
  
  // Update everLoaded state when we successfully load
  useEffect(() => {
    if (loadState === 'loaded' && !everLoaded) {
      setEverLoaded(true);
    }
    
    // Update last loaded image when we get a new one
    if (loadState === 'loaded' && emojiImage) {
      setLastLoadedImage(emojiImage);
    }
  }, [loadState, emojiImage, everLoaded]);
  
  // Initial load handling and status monitoring (separated to avoid infinite loop)
  useEffect(() => {
    // Only run this ONCE at component mount
    // Initial check of status
    const initialStatus = getEmojiLoadingStatus(unified, serverUrl);
    
    // If not loaded/loading, trigger a load
    if (initialStatus === 'not-loaded') {
      // Request loading this specific emoji with high priority
      enqueueEmoji(unified, 'high', serverUrl);
      
      // Set to loading state
      setLoadState('loading');
    } else {
      // Set initial state correctly
      setLoadState(initialStatus);
    }
  }, [unified, serverUrl]); // deliberately NOT depending on loadState to prevent loop
  
  // Separate effect for monitoring changes in loading status
  useEffect(() => {
    // Setup polling to get notified of changes in emoji loading status
    const checkForUpdates = () => {
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
  }, [unified, serverUrl, loadState, lastLoadedImage]);
  
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
              bgcolor: loadState === 'loaded' ? 'transparent' : 'action.hover',
              borderRadius: '4px',
              opacity: 0.3, // Very subtle - just enough to see, not distracting
              transition: 'opacity 0.2s ease-in-out',
              willChange: 'opacity'
            }}
          />
          
          {/* Unicode fallback when error loading image */}
          {loadState === 'error' && (
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
          
          {/* Special persistent image handling */}
          {/* IMPORTANT: If ever loaded successfully, KEEP showing the last loaded image */}
          {/* This prevents flickering during direction changes and other reflows */}
          {lastLoadedImage && everLoaded && (
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
          
          {/* Current image */}
          {emojiImage && !lastLoadedImage && (
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

export default EmojiItem;