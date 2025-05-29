import { useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { setIsMobile, setSidebarWidth } from '../store/slices/viewsSlice';

/**
 * Hook pour gérer la logique de layout responsive
 * Synchronise le state isMobile avec les breakpoints Material-UI
 */
export const useLayout = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  
  // Selector pour récupérer l'état du store
  const { isMobile, sidebarWidth } = useAppSelector(state => state.views.ui);
  
  // Détecter les breakpoints Material-UI
  const isMobileBreakpoint = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Synchroniser le state Redux avec les media queries
  useEffect(() => {
    if (isMobile !== isMobileBreakpoint) {
      dispatch(setIsMobile(isMobileBreakpoint));
    }
  }, [isMobileBreakpoint, isMobile, dispatch]);
  
  // Ajuster la largeur de sidebar selon la taille d'écran
  useEffect(() => {
    let newSidebarWidth = 240; // Desktop default
    
    if (isMobileBreakpoint) {
      newSidebarWidth = 0; // Pas de sidebar sur mobile (overlay)
    } else if (isTablet) {
      newSidebarWidth = 200; // Sidebar réduite sur tablette
    } else if (isDesktop) {
      newSidebarWidth = 260; // Sidebar large sur desktop
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