import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

export interface HorizontalFileContainerProps {
  children: React.ReactNode;
  showBorder?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Container réutilisable pour l'affichage horizontal des fichiers
 * avec scroll moderne en desktop et comportement responsive
 */
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
        flexWrap: { xs: "wrap", sm: "wrap", md: "nowrap" }, // Pas de wrap en desktop
        gap: 1,
        width: "100%",
        // Padding pour laisser de l'espace pour la scrollbar
        pb: { xs: 0, sm: 0, md: 2 },
        // Scroll horizontal en desktop uniquement
        overflowX: { xs: "visible", sm: "visible", md: "auto" },
        overflowY: "visible",
        // Styling conditionnel pour le mode édition
        ...(showBorder && {
          p: 1,
          pb: { xs: 1, sm: 1, md: 3 }, // Plus d'espace en bas pour la scrollbar
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }),
        // Scrollbar moderne et visible pour desktop
        "&::-webkit-scrollbar": {
          height: { xs: 0, sm: 0, md: 8 }, // Scrollbar un peu plus épaisse en desktop
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: { xs: "transparent", sm: "transparent", md: "rgba(0,0,0,0.08)" },
          borderRadius: 4,
          margin: { xs: 0, sm: 0, md: "0 4px" }, // Marge pour ne pas toucher les bords
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
        // Pour Firefox
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