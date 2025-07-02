import { useState, useCallback, useEffect } from 'react';

// Store global pour un seul menu ouvert à la fois
let globalMenuState: {
  currentMenuId: string | null;
  listeners: Set<(menuId: string | null) => void>;
} = {
  currentMenuId: null,
  listeners: new Set(),
};

/**
 * Hook for simplified Menu usage
 * Encapsulates common menu state management patterns
 * Ensures only one menu is open at a time globally
 * 
 * @example
 * const { anchorEl, isOpen, openMenu, closeMenu } = useMenu();
 * 
 * <IconButton onClick={openMenu}>
 *   <MoreVert />
 * </IconButton>
 * <Menu
 *   open={isOpen}
 *   anchorEl={anchorEl}
 *   onClose={closeMenu}
 *   items={menuItems}
 * />
 */
export const useMenu = (menuId?: string) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const finalMenuId = menuId || `menu-${Math.random().toString(36).substr(2, 9)}`;

  // Écouter les changements globaux
  useEffect(() => {
    const listener = (currentMenuId: string | null) => {
      if (currentMenuId !== finalMenuId) {
        setIsOpen(false);
        setAnchorEl(null);
      }
    };

    globalMenuState.listeners.add(listener);
    return () => {
      globalMenuState.listeners.delete(listener);
    };
  }, [finalMenuId]);

  const openMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Fermer tous les autres menus
    globalMenuState.currentMenuId = finalMenuId;
    globalMenuState.listeners.forEach(listener => listener(finalMenuId));
    
    // Ouvrir ce menu
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  }, [finalMenuId]);

  const closeMenu = useCallback(() => {
    globalMenuState.currentMenuId = null;
    globalMenuState.listeners.forEach(listener => listener(null));
    
    setAnchorEl(null);
    setIsOpen(false);
  }, []);

  return {
    /** HTML element that anchors the menu position */
    anchorEl,
    /** Whether the menu is currently open */
    isOpen,
    /** Function to open the menu - pass to onClick handler */
    openMenu,
    /** Function to close the menu - pass to Menu onClose prop */
    closeMenu,
  };
};

export default useMenu;