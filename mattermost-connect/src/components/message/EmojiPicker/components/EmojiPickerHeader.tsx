import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { PickerMode } from "../../../../types";

interface EmojiPickerHeaderProps {
  /** Mode du picker (message ou réaction) */
  mode: PickerMode;
  /** Index de l'onglet actif */
  activeTab: number;
  /** Fonction pour fermer le picker */
  onClose?: () => void;
}

export const EmojiPickerHeader: React.FC<EmojiPickerHeaderProps> = ({
  mode,
  activeTab,
  onClose,
}) => {
  // Si ce n'est pas en mode réaction, ne pas afficher l'en-tête
  if (mode !== PickerMode.REACTION) return null;

  // Déterminer le titre en fonction du mode
  const getTitle = () => {
    if (mode === PickerMode.REACTION) {
      return "Ajouter une réaction";
    }
    return activeTab === 0 ? "Emojis" : "GIFs";
  };

  return (
    <Box
      sx={{
        p: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography component={"div"} variant="subtitle2">
        {getTitle()}
      </Typography>
      {onClose && (
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};
