import { useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { selectIsMobile, selectSidebarWidth } from '../store/selectors';
import { setIsMobile, setSidebarWidth } from '../store/slices/viewsSlice';

/**
 * Hook to manage responsive layout logic
 * Synchronizes isMobile state with Material-UI breakpoints
 */
export const useLayout = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  
  // Selector to get store state
  const isMobile = useAppSelector(selectIsMobile);
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  
  // Detect Material-UI breakpoints
  const isMobileBreakpoint = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Synchronize Redux state with media queries
  useEffect(() => {
    if (isMobile !== isMobileBreakpoint) {
      dispatch(setIsMobile(isMobileBreakpoint));
    }
  }, [isMobileBreakpoint, isMobile, dispatch]);
  
  // Adjust sidebar width based on screen size
  useEffect(() => {
    let newSidebarWidth = 240; // Desktop default
    
    if (isMobileBreakpoint) {
      newSidebarWidth = 0; // No sidebar on mobile (overlay)
    } else if (isTablet) {
      newSidebarWidth = 200; // Reduced sidebar on tablet
    } else if (isDesktop) {
      newSidebarWidth = 260; // Large sidebar on desktop
    }
    
    if (sidebarWidth !== newSidebarWidth) {
      dispatch(setSidebarWidth(newSidebarWidth));
    }
  }, [isMobileBreakpoint, isTablet, isDesktop, sidebarWidth, dispatch]);
  
  return {
    // Responsive states
    isMobile,
    isTablet,
    isDesktop,
    sidebarWidth,
    
    // Breakpoint helpers
    isMobileBreakpoint,
    
    // Actions
    setMobile: (mobile: boolean) => dispatch(setIsMobile(mobile)),
    setSidebarWidth: (width: number) => dispatch(setSidebarWidth(width)),
    
    // Responsive utilities
    getResponsiveValue: <T>(values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T }) => {
      if (isMobileBreakpoint && values.xs !== undefined) return values.xs;
      if (isTablet && values.sm !== undefined) return values.sm;
      if (values.md !== undefined) return values.md;
      if (isDesktop && values.lg !== undefined) return values.lg;
      if (values.xl !== undefined) return values.xl;
      return values.md || values.sm || values.xs;
    },
  };
};

export default useLayout;