/**
 * Context menu component with positioning and responsive behavior
 * Provides flexible menu system with custom positioning and mobile adaptations
 */
import React from 'react';
import { Box, ClickAwayListener, useTheme, useMediaQuery, alpha } from '@mui/material';
import { MenuItem, type MenuItemConfig } from './MenuItem';
import { MENU_STYLES } from './Menu.styles';

export interface MenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  items: MenuItemConfig[];
  placement?: 'right' | 'left' | 'bottom';
}

export const Menu: React.FC<MenuProps> = ({
  open,
  anchorEl,
  onClose,
  items,
  placement = 'right',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!open || !anchorEl) {
    return null;
  }

  // Calculate position based on anchor element and placement
  const rect = anchorEl.getBoundingClientRect();
  
  const getPosition = () => {
    switch (placement) {
      case 'left':
        return {
          left: isMobile ? Math.max(8, rect.left - 200) : rect.left - 220,
          top: rect.top,
        };
      case 'bottom':
        return {
          left: isMobile ? Math.max(8, rect.left) : rect.left,
          top: rect.bottom + 4,
        };
      case 'right':
      default:
        return {
          left: isMobile 
            ? Math.max(8, rect.left - 200)
            : rect.right + 8,
          top: rect.top,
        };
    }
  };

  const position = getPosition();

  const menuStyles = {
    ...MENU_STYLES.container,
    left: `${position.left}px`,
    top: `${position.top}px`
  };

  return (
    <ClickAwayListener onClickAway={onClose}>
      <Box
        component="ul"
        sx={menuStyles}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            onClose={onClose}
            placement={placement}
          />
        ))}
      </Box>
    </ClickAwayListener>
  );
};

export default Menu;

export type { MenuItemConfig };