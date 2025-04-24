// src/internal/components/common/MenuList.tsx
/**
 * A reusable menu list component
 */
import React from "react";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
} from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface MenuItem {
  /** Item ID */
  id: string;
  /** Item label */
  label: string;
  /** Item icon */
  icon?: React.ReactNode;
  /** Whether the item is active */
  active?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Whether to show a divider after this item */
  divider?: boolean;
  /** Callback for item click */
  onClick?: () => void;
}

export interface MenuListProps extends BaseComponentProps {
  /** Array of menu items */
  items: MenuItem[];
  /** Whether to show compact items */
  compact?: boolean;
}

const MenuList: React.FC<MenuListProps> = ({
  items,
  compact = false,
  className,
  sx,
  id,
}) => {
  return (
    <List
      className={className}
      sx={{
        p: 0,
        ...sx,
      }}
      id={id}
      dense={compact}
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              selected={item.active}
              disabled={item.disabled}
              onClick={item.onClick}
              sx={{
                py: compact ? 0.75 : 1.5,
              }}
            >
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: compact ? "body2" : "body1",
                }}
              />
            </ListItemButton>
          </ListItem>
          {item.divider && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default MenuList;
