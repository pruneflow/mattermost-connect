import React, { useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAppSelector } from '../hooks/useAppSelector';
import { getPreference } from '../store/slices/preferencesSlice';
import { selectPreferences } from '../store/selectors';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const preferences = useAppSelector(selectPreferences);
  const themePreference = getPreference(preferences, 'display_settings', 'theme', 'auto') as 'light' | 'dark' | 'auto';
  
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>(getSystemTheme);
  
  const resolvedTheme = useMemo(() => {
    return themePreference === 'auto' ? systemTheme : themePreference;
  }, [themePreference, systemTheme]);

  useEffect(() => {
    if (themePreference === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setSystemTheme(getSystemTheme());
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themePreference]);

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: resolvedTheme,
        primary: {
          main: '#1976d2', // Primary brand color
        },
        secondary: {
          main: '#9c27b0',
        },
        success: {
          main: '#28a745', // StatusBadge online
        },
        warning: {
          main: '#ffc107', // StatusBadge away  
        },
        error: {
          main: '#dc3545', // StatusBadge dnd
        },
        // Custom colors for user messages
        userMessage: {
          main: resolvedTheme === 'light' ? '#f8fafc' : 'rgba(100, 116, 139, 0.15)',
          border: resolvedTheme === 'light' ? '#e2e8f0' : 'rgba(100, 116, 139, 0.3)',
          hover: resolvedTheme === 'light' ? '#f1f5f9' : 'rgba(100, 116, 139, 0.25)',
          text: resolvedTheme === 'light' ? '#334155' : '#e2e8f0',
          link: resolvedTheme === 'light' ? '#0f172a' : '#94a3b8',
        },
        ...(resolvedTheme === 'light' ? {
          background: {
            default: '#fafafa',
            paper: '#ffffff',
          },
        } : {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          primary: {
            main: '#90caf9',
          },
        }),
      },
      breakpoints: {
        values: {
          xs: 0,
          sm: 600,
          md: 900,
          lg: 1200,
          xl: 1536,
        },
      },
      components: {
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            variant: 'outlined',
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 6,
            },
          },
        },
      },
      shape: {
        borderRadius: 8,
      },
      typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h5: {
          fontWeight: 600,
        },
        h6: {
          fontWeight: 600,
        },
        subtitle1: {
          fontWeight: 500,
        },
        button: {
          fontWeight: 500,
        },
      },
    });
  }, [resolvedTheme]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;