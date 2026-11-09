/**
 * Hook for handling long press gestures on mobile
 * Based on https://spacejelly.dev/posts/how-to-detect-long-press-gestures-in-javascript-events-in-react
 */
import React, { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: (target: EventTarget) => void;
  onClick?: (target: EventTarget) => void;
  threshold?: number; // ms
  isScrolling?: boolean; // External scroll state to prevent long press during scroll
}

export const useLongPress = ({ 
  onLongPress, 
  onClick, 
  threshold = 350,
  isScrolling = false 
}: UseLongPressOptions) => {
  const isLongPress = useRef(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const startPressTimer = useCallback((target: EventTarget, clientX?: number, clientY?: number) => {
    // Don't start if already scrolling
    if (isScrolling) return;
    isLongPress.current = false;
    // Store touch position for movement detection
    if (clientX !== undefined && clientY !== undefined) {
      touchStartPos.current = { x: clientX, y: clientY };
    }
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress(target);
    }, threshold);
  }, [onLongPress, threshold, isScrolling]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const handleOnClick = useCallback((event: React.MouseEvent) => {
    if (isLongPress.current) {
      return;
    }
    
    if (onClick) {
      onClick(event.target as EventTarget);
    }
  }, [onClick]);

  const handleOnTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    // Prevent default text selection behavior
    event.preventDefault();
    startPressTimer(event.target as EventTarget, touch.clientX, touch.clientY);
  }, [startPressTimer]);

  const handleOnTouchEnd = useCallback(() => {
    clearTimer();
    touchStartPos.current = null;
    
    // Reset after a longer delay to prevent immediate ClickAway
    setTimeout(() => {
      isLongPress.current = false;
    }, 300);
  }, [clearTimer]);

  const handleOnTouchMove = useCallback((event: React.TouchEvent) => {
    if (!touchStartPos.current || !timerRef.current) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // Cancel long press if finger moved more than 10px (scroll detection)
    if (deltaX > 10 || deltaY > 10) {
      clearTimer();
      touchStartPos.current = null;
    }
  }, [clearTimer]);

  return {
    isLongPress: isLongPress,
    handlers: {
      onClick: handleOnClick,
      onTouchStart: handleOnTouchStart,
      onTouchEnd: handleOnTouchEnd,
      onTouchMove: handleOnTouchMove,
    }
  };
};