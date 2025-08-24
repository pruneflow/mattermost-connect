/**
 * Hook for detecting scroll state on a DOM element
 * Returns boolean indicating if element is currently being scrolled
 */
import { useState, useEffect, RefObject } from 'react';

export const useScrollDetection = (elementRef: RefObject<HTMLElement>, delay = 150): boolean => {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsScrolling(false);
      }, delay);
    };

    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [elementRef, delay]);

  return isScrolling;
};