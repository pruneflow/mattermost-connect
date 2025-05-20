import { useState, useCallback, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Hook for managing layout state, including mobile detection and sidebar state
 * 
 * @returns Layout state and helper functions
 */
export function useLayout() {
  // Get theme and check for mobile breakpoint
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Sidebar state - open by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Update sidebar state when screen size changes
  useEffect(() => {
    // On desktop, sidebar is open by default
    // On mobile, sidebar is closed by default
    setSidebarOpen(!isMobile);
  }, [isMobile]);
  
  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  // Close sidebar (useful for after selections on mobile)
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  
  // Open sidebar
  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);
  
  return {
    isMobile,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    setSidebarOpen
  };
}

export default useLayout;