/**
 * Generic Menu components for context menus, dropdowns, etc.
 * 
 * Features:
 * - Responsive positioning (desktop/mobile)
 * - Support for submenus with hover (desktop) and click (mobile)
 * - Variants (default, danger)
 * - Icons and dividers
 * - ClickAwayListener for proper closing
 * - Optional useMenu hook for simplified usage
 * 
 * @example Basic usage with hook
 * const { anchorEl, isOpen, openMenu, closeMenu } = useMenu();
 * 
 * <IconButton onClick={openMenu}>
 *   <MoreVert />
 * </IconButton>
 * <Menu
 *   open={isOpen}
 *   anchorEl={anchorEl}
 *   onClose={closeMenu}
 *   items={[
 *     {
 *       id: 'action1',
 *       label: 'Action 1',
 *       icon: <Icon />,
 *       onClick: handleAction1
 *     },
 *     {
 *       id: 'submenu',
 *       label: 'More actions...',
 *       submenu: [
 *         { id: 'sub1', label: 'Sub action', onClick: handleSub1 }
 *       ]
 *     }
 *   ]}
 * />
 */

export { Menu, type MenuProps } from './Menu';
export { MenuItem, type MenuItemConfig } from './MenuItem';
export { MENU_STYLES } from './Menu.styles';