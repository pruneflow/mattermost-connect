// src/internal/theme/themeConfig.ts
/**
 * Theme configuration for MattermostConnect components
 * Provides consistent styling across all components
 */
import { createTheme, Theme, ThemeOptions } from "@mui/material/styles";

/**
 * Default theme configuration
 */
export const defaultThemeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: "#1976d2",
      light: "#4791db",
      dark: "#115293",
      contrastText: "#fff",
    },
    secondary: {
      main: "#dc004e",
      light: "#e33371",
      dark: "#9a0036",
      contrastText: "#fff",
    },
    error: {
      main: "#f44336",
      light: "#e57373",
      dark: "#d32f2f",
      contrastText: "#fff",
    },
    warning: {
      main: "#ff9800",
      light: "#ffb74d",
      dark: "#f57c00",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    info: {
      main: "#2196f3",
      light: "#64b5f6",
      dark: "#1976d2",
      contrastText: "#fff",
    },
    success: {
      main: "#4caf50",
      light: "#81c784",
      dark: "#388e3c",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    background: {
      default: "#f5f5f5",
      paper: "#fff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
};

/**
 * Creates a theme with the given options
 * @param options Theme options to override default theme
 * @returns Custom theme
 */
export const createCustomTheme = (options?: ThemeOptions): Theme => {
  return createTheme({
    ...defaultThemeOptions,
    ...options,
  });
};

/**
 * Default theme for MattermostConnect
 */
export const defaultTheme = createCustomTheme();
