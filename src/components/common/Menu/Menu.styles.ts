/**
 * Static styles for Menu components extracted for performance
 * Based on ChannelItem menu styles with modern, clean design
 */

export const MENU_STYLES = {
  container: {
    position: "fixed" as const,
    backgroundColor: "background.paper",
    boxShadow: 12,
    borderRadius: 2,
    minWidth: 220,
    maxWidth: 280,
    zIndex: 1300,
    py: 1.5,
    px: 0.5,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },

  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    minHeight: 44,
    px: 2,
    py: 1.5,
    borderRadius: 1,
    transition: "all 0.15s ease-in-out",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    marginLeft: "-2px",
    color: "text.primary",
    "& .MuiSvgIcon-root": {
      color: "action.active",
    },
  },

  menuItemHover: (theme: any) => ({
    backgroundColor: theme.palette.action.hover,
    transform: "translateX(2px)",
  }),

  menuItemDanger: {
    color: "error.main",
    "&:hover": {
      backgroundColor: "error.light",
      color: "error.contrastText",
      transform: "translateX(2px)",
      boxShadow: "none",
      outline: "none",
    },
    "& .MuiSvgIcon-root": {
      color: "error.main",
    },
    "&:hover .MuiSvgIcon-root": {
      color: "error.contrastText",
    },
  },

  submenu: {
    position: "absolute" as const,
    backgroundColor: "background.paper",
    boxShadow: 12,
    borderRadius: 2,
    minWidth: 200,
    maxWidth: 280,
    zIndex: 1400,
    py: 1.5,
    px: 0.5,
    listStyle: "none",
    margin: 0,
    padding: 0,
    border: (theme: any) => `1px solid ${theme.palette.divider}`,
  },

  submenuPositioning: {
    left: "100%",
    top: 0,
  },

  submenuPositioningLeft: {
    right: "100%",
    top: 0,
  },

  submenuPositioningMobile: {
    left: "8px",
    top: "calc(100% + 4px)",
    width: "calc(100vw - 48px)",
    maxWidth: 320,
  },

  divider: {
    my: 0.5,
    mx: 1,
  },
} as const;