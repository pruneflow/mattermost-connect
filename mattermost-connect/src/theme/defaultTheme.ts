// src/theme/defaultTheme.ts
import { createTheme, responsiveFontSizes, Theme } from "@mui/material/styles";

/**
 * Default theme configuration for MattermostConnect
 *
 * This theme can be customized or overridden by consumers
 */
export const createDefaultTheme = (): Theme => {
  const baseTheme = createTheme({
    palette: {
      primary: {
        main: "#1976d2",
        light: "#42a5f5",
        dark: "#1565c0",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#9c27b0",
        light: "#ba68c8",
        dark: "#7b1fa2",
        contrastText: "#ffffff",
      },
      background: {
        default: "#f5f8fa",
        paper: "#ffffff",
      },
      text: {
        primary: "#172b4d",
        secondary: "#5e6c84",
      },
      divider: "rgba(0, 0, 0, 0.08)",
    },
    typography: {
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ].join(","),
      h1: {
        fontSize: "2rem",
        fontWeight: 600,
      },
      h2: {
        fontSize: "1.75rem",
        fontWeight: 600,
      },
      h3: {
        fontSize: "1.5rem",
        fontWeight: 600,
      },
      h4: {
        fontSize: "1.25rem",
        fontWeight: 600,
      },
      h5: {
        fontSize: "1.1rem",
        fontWeight: 600,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
      },
      subtitle1: {
        fontSize: "1rem",
        fontWeight: 500,
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 500,
      },
      body1: {
        fontSize: "0.975rem",
      },
      body2: {
        fontSize: "0.875rem",
      },
      button: {
        textTransform: "none",
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          },
          contained: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
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
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow:
              "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04)",
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              backgroundColor: "rgba(25, 118, 210, 0.08)",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: `
          .highlight {
            animation: highlightMessage 2s ease-in-out;
          }
          
          @keyframes highlightMessage {
            0% {
              background-color: rgba(25, 118, 210, 0.1);
              transform: scale(1);
            }
            50% {
              background-color: rgba(25, 118, 210, 0.2);
              transform: scale(1.02);
            }
            100% {
              background-color: transparent;
              transform: scale(1);
            }
          }
          
          @media (max-width: 600px) {
            .message-bubble {
              max-width: 90% !important;
            }
            
            .message-actions {
              top: -12px !important;
              right: -6px !important;
              left: -6px !important;
            }
          }
        `,
      },
    },
  });

  return responsiveFontSizes(baseTheme);
};

export default createDefaultTheme;
