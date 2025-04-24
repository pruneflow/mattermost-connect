import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { PickerMode } from "../../../../types";
import React from "react";

interface EmojiPickerFooterProps {
  /** Mode du picker (message ou réaction) */
  mode: PickerMode;
  /** Index de l'onglet actif */
  activeTab: number;
  /** Requête de recherche actuelle */
  searchQuery: string;
  /** Catégorie d'emoji active */
  activeEmojiCategory: string;
  /** Catégorie de GIF active */
  activeGifCategory: string;
  /** Fonction pour fermer le picker */
  onClose?: () => void;
}

export const EmojiPickerFooter: React.FC<EmojiPickerFooterProps> = ({
  mode,
  activeTab,
  searchQuery,
  activeEmojiCategory,
  activeGifCategory,
  onClose,
}) => {
  // Déterminer le message d'état
  const getStatusMessage = () => {
    if (activeTab === 0 || mode === PickerMode.REACTION) {
      return "Emojis";
    } else {
      return searchQuery ? "Recherche de GIFs..." : `GIFs ${activeGifCategory}`;
    }
  };

  return (
    <Box
      sx={{
        p: 0.5,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        bgcolor: "background.default",
      }}
    >
      <Typography
        component={"div"}
        variant="caption"
        color="text.secondary"
        sx={{ ml: 1 }}
      >
        {getStatusMessage()}
      </Typography>

      {onClose && mode === PickerMode.MESSAGE && (
        <Tooltip title="Fermer">
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
