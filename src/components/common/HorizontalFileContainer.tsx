/**
 * Horizontal file container component with responsive scrolling behavior
 * Provides flexible layout for file attachments with desktop horizontal scrolling
 */
import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

export interface HorizontalFileContainerProps {
  children: React.ReactNode;
  showBorder?: boolean;
  sx?: SxProps<Theme>;
}

export const HorizontalFileContainer: React.FC<HorizontalFileContainerProps> = ({
  children,
  showBorder = false,
  sx,
}) => {
  return (
    <Box
      sx={{
        mt: 1,
        display: "flex",
        flexDirection: { xs: "column", sm: "row", md: "row" },
        flexWrap: { xs: "wrap", sm: "wrap", md: "nowrap" }, // No wrap on desktop
        gap: 1,
        width: "100%",
        // Padding to leave space for scrollbar
        pb: { xs: 0, sm: 0, md: 2 },
        // Desktop horizontal scrolling only
        overflowX: { xs: "visible", sm: "visible", md: "auto" },
        overflowY: "visible",
        ...(showBorder && {
          p: 1,
          pb: { xs: 1, sm: 1, md: 3 },
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }),
        // Modern and visible scrollbar for desktop
        "&::-webkit-scrollbar": {
          height: { xs: 0, sm: 0, md: 8 },
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: { xs: "transparent", sm: "transparent", md: "rgba(0,0,0,0.08)" },
          borderRadius: 4,
          margin: { xs: 0, sm: 0, md: "0 4px" },
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: { xs: "transparent", sm: "transparent", md: "rgba(0,0,0,0.3)" },
          borderRadius: 4,
          "&:hover": {
            backgroundColor: { xs: "transparent", sm: "transparent", md: "rgba(0,0,0,0.45)" },
          },
          "&:active": {
            backgroundColor: { xs: "transparent", sm: "transparent", md: "rgba(0,0,0,0.6)" },
          },
        },
        // For Firefox
        scrollbarWidth: { xs: "none", sm: "none", md: "thin" },
        scrollbarColor: { xs: "transparent", sm: "transparent", md: "rgba(0,0,0,0.3) rgba(0,0,0,0.08)" },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default HorizontalFileContainer;