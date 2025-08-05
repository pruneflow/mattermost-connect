import { useCallback, useRef } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';

interface UseAutoScrollProps {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollElement: HTMLDivElement | null;
  shouldStartFromBottomWhenUnread: boolean;
  unreadChunkTimeStamp?: number;
}

interface UseAutoScrollReturn {
  scrollToBottom: (element: HTMLDivElement | null) => void;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
  isAtBottom: (element: HTMLDivElement | null) => boolean;
  scrollToOffset: (offset: number, smooth?: boolean) => void;
}

const BOTTOM_THRESHOLD = 10; // pixels from bottom to consider "at bottom"

export const useAutoScroll = ({
  virtualizer,
  scrollElement,
}: UseAutoScrollProps): UseAutoScrollReturn => {
  const isScrollingRef = useRef(false);

  const scrollToBottom = useCallback((element: HTMLDivElement | null) => {
    console.debug("Scroll to bottom ")
    if (!element) return;
    console.debug("Element is not null")
    isScrollingRef.current = true;
    
    // Scroll to the very bottom
    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    });
    
    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  }, []);

  const scrollToIndex = useCallback((
    index: number, 
    align: 'start' | 'center' | 'end' | 'auto' = 'start'
  ) => {
    if (!scrollElement || index < 0) return;
    
    isScrollingRef.current = true;
    
    try {
      virtualizer.scrollToIndex(index, { align, behavior: 'smooth' });
    } catch (error) {
      console.warn('Failed to scroll to index:', index, error);
      // Fallback: scroll to approximate position
      const itemHeight = 100; // estimated
      const targetOffset = index * itemHeight;
      scrollElement.scrollTo({
        top: targetOffset,
        behavior: 'smooth',
      });
    }
    
    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  }, [virtualizer, scrollElement]);

  const scrollToOffset = useCallback((
    offset: number, 
    smooth: boolean = true
  ) => {
    if (!scrollElement) return;
    
    isScrollingRef.current = true;
    
    scrollElement.scrollTo({
      top: offset,
      behavior: smooth ? 'smooth' : 'auto',
    });
    
    // Reset scrolling flag after animation
    setTimeout(() => {
      isScrollingRef.current = false;
    }, smooth ? 500 : 100);
  }, [scrollElement]);

  const isAtBottom = useCallback((element: HTMLDivElement | null): boolean => {
    if (!element) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = element;
    return scrollHeight - scrollTop - clientHeight <= BOTTOM_THRESHOLD;
  }, []);

  return {
    scrollToBottom,
    scrollToIndex,
    isAtBottom,
    scrollToOffset,
  };
};