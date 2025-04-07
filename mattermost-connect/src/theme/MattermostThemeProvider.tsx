// src/theme/MattermostThemeProvider.tsx
import React, { ReactNode } from "react";
import { ThemeProvider, Theme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { createDefaultTheme } from "./defaultTheme";

/**
 * Props for the MattermostThemeProvider component
 */
export interface MattermostThemeProviderProps {
  /** Children components */
  children: ReactNode;

  /** Optional custom theme */
  theme?: Theme;

  /** Whether to disable CssBaseline */
  disableCssBaseline?: boolean;
}

/**
 * Theme provider for MattermostConnect components
 *
 * Provides default theme and styling for all components
 */
export const MattermostThemeProvider: React.FC<
  MattermostThemeProviderProps
> = ({ children, theme, disableCssBaseline = false }) => {
  // Use custom theme if provided, otherwise use default theme
  const themeToUse = theme || createDefaultTheme();

  return (
    <ThemeProvider theme={themeToUse}>
      {!disableCssBaseline && <CssBaseline />}
      {children}
    </ThemeProvider>
  );
};

export default MattermostThemeProvider;
