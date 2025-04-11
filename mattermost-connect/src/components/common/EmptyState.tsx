import React, { ReactNode } from "react";
import { Box, Typography, SxProps, Theme } from "@mui/material";

interface EmptyStateProps {
  /** Icône à afficher */
  icon?: ReactNode;
  /** Titre principal */
  title: string;
  /** Sous-titre ou description */
  subtitle?: string;
  /** Action optionnelle (bouton, lien, etc.) */
  action?: ReactNode;
  /** Styles personnalisés pour le conteneur */
  containerSx?: SxProps<Theme>;
  /** Styles personnalisés pour l'icône */
  iconSx?: SxProps<Theme>;
  /** Styles personnalisés pour le titre */
  titleSx?: SxProps<Theme>;
  /** Styles personnalisés pour le sous-titre */
  subtitleSx?: SxProps<Theme>;
}

/**
 * Composant pour afficher un état vide (aucun élément, résultat de recherche vide, etc.)
 * avec une présentation cohérente dans toute l'application
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  action,
  containerSx,
  iconSx,
  titleSx,
  subtitleSx,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 3,
        width: "100%",
        height: "100%",
        color: "text.secondary",
        ...containerSx,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            fontSize: 48,
            opacity: 0.6,
            ...iconSx,
          }}
        >
          {icon}
        </Box>
      )}

      <Typography
        variant="h6"
        component="div"
        sx={{
          fontWeight: 500,
          ...titleSx,
        }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            maxWidth: "80%",
            ...subtitleSx,
          }}
          component="div"
        >
          {subtitle}
        </Typography>
      )}

      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
};
