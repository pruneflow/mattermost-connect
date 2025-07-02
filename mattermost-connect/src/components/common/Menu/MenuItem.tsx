import React, { useState, useCallback } from 'react';
import { Box, Divider, useTheme, useMediaQuery, alpha } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { MENU_STYLES } from './Menu.styles';

export interface MenuItemConfig {
  id: string;
  type?: 'item' | 'divider';
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  submenu?: MenuItemConfig[]; // Items du sous-menu
}

interface MenuItemProps {
  item: MenuItemConfig;
  onClose?: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({ item, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // Si c'est un divider, on affiche juste le divider
  if (item.type === 'divider') {
    return <Divider sx={MENU_STYLES.divider} />;
  }

  const hasSubmenu = item.submenu && item.submenu.length > 0;

  const handleClick = useCallback(() => {
    if (hasSubmenu && isMobile) {
      // Mobile: toggle submenu on click
      setSubmenuOpen(!submenuOpen);
    } else if (item.onClick) {
      // Execute action and close menu
      item.onClick();
      onClose?.();
    }
  }, [hasSubmenu, isMobile, submenuOpen, item.onClick, onClose]);

  const handleSubmenuItemClick = useCallback((submenuItem: MenuItemConfig) => {
    submenuItem.onClick?.();
    onClose?.();
  }, [onClose]);

  const itemStyles = {
    ...MENU_STYLES.menuItem,
    ...(item.variant === 'danger' && MENU_STYLES.menuItemDanger),
    justifyContent: hasSubmenu ? 'space-between' : 'flex-start',
    position: hasSubmenu ? 'relative' : 'static',
    opacity: item.disabled ? 0.5 : 1,
    pointerEvents: item.disabled ? 'none' : 'auto',
    '&:hover': item.variant === 'danger' 
      ? MENU_STYLES.menuItemDanger['&:hover']
      : MENU_STYLES.menuItemHover(theme),
    // Desktop: CSS hover shows submenu
    ...(hasSubmenu && !isMobile && {
      '&:hover > ul': {
        display: 'block !important',
      },
    }),
  } as const;

  const submenuStyles = {
    ...MENU_STYLES.submenu,
    display: isMobile ? (submenuOpen ? 'block' : 'none') : 'none',
    ...MENU_STYLES.submenuPositioning,
    ...(isMobile && MENU_STYLES.submenuPositioningMobile),
    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  };

  return (
    <>
      <Box
        component="li"
        onClick={handleClick}
        sx={itemStyles}
      >
        {/* Content */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {item.icon}
          {item.label}
        </Box>
        
        {/* Chevron for submenu */}
        {hasSubmenu && <ChevronRight fontSize="small" />}
        
        {/* Submenu */}
        {hasSubmenu && (
          <Box component="ul" sx={submenuStyles}>
            {item.submenu!.map((submenuItem) => (
              <Box
                key={submenuItem.id}
                component="li"
                onClick={() => handleSubmenuItemClick(submenuItem)}
                sx={{
                  ...MENU_STYLES.menuItem,
                  ...(submenuItem.variant === 'danger' && MENU_STYLES.menuItemDanger),
                  opacity: submenuItem.disabled ? 0.5 : 1,
                  pointerEvents: submenuItem.disabled ? 'none' : 'auto',
                  '&:hover': submenuItem.variant === 'danger' 
                    ? MENU_STYLES.menuItemDanger['&:hover']
                    : MENU_STYLES.menuItemHover(theme),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {submenuItem.icon}
                  {submenuItem.label}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      
    </>
  );
};

export default MenuItem;