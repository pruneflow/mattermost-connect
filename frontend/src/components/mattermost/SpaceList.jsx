// src/components/mattermost/SpaceList.jsx
import { useState } from "react";
import { Box, Typography, Button, List, Snackbar } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useMattermostSpaces } from "../../hooks/useMattermostSpaces";
import useClipboard from "../../hooks/useClipboard";
import SpaceCard from "./SpaceCard";
import EmptySpacesList from "./EmptySpacesList";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";

/**
 * Composant principal pour afficher la liste des espaces Mattermost
 */
const SpaceList = ({
  onAddClick,
  onEditClick,
  onTokenClick,
  onDeleteClick,
  onSpaceSelect,
  selectedSpaceId,
}) => {
  const { t } = useTranslation();
  const { spaces, isLoading, error, refetch } = useMattermostSpaces();
  const { snackbar, copyToClipboard, closeSnackbar } = useClipboard();

  // Gestion de la sélection d'un espace
  const handleItemClick = (id) => {
    const selectedSpace = spaces.find((space) => space.id === id);
    if (selectedSpace) {
      onSpaceSelect(selectedSpace);
    }
  };
  // Affichage de l'état de chargement
  if (isLoading) {
    return <LoadingState />;
  }
  // Affichage de l'état d'erreur
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  return (
    <Box>
      {/* En-tête avec titre et bouton d'ajout */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">{t("spaces.yourSpaces")}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddClick}
        >
          {t("spaces.newSpace")}
        </Button>
      </Box>

      {/* Affichage de la liste vide ou remplie */}
      {spaces?.length === 0 ? (
        <EmptySpacesList onAddClick={onAddClick} />
      ) : (
        <List>
          {spaces?.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              isSelected={selectedSpaceId === space.id}
              onSelect={handleItemClick}
              onEdit={onEditClick}
              onToken={onTokenClick}
              onDelete={onDeleteClick}
              onCopyToClipboard={copyToClipboard}
            />
          ))}
        </List>
      )}

      {/* Notification de copie dans le presse-papiers */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default SpaceList;
