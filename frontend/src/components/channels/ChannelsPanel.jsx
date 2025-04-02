// src/components/channels/ChannelsPanel.jsx
import { useState, useEffect } from "react";
import { Box, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import SpaceSelector from "./SpaceSelector";
import ChannelsList from "./ChannelsList";
import ChannelDetails from "./ChannelDetails";
import ChannelDialogs from "./ChannelDialogs";
import { LoadingState, ErrorState } from "../common";
import { useChannels } from "../../hooks/useChannels";
import { useMattermostSpaces } from "../../hooks/useMattermostSpaces";
import useDialogControls from "../../hooks/useDialogControls";

export const ChannelsPanel = ({ selectedSpace: externalSelectedSpace }) => {
  // Hooks pour les espaces et les canaux
  const { spaces } = useMattermostSpaces();
  const { t } = useTranslation();
  const [activeSpaceId, setActiveSpaceId] = useState(
    externalSelectedSpace?.id || spaces[0]?.id,
  );
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  // Hook pour contrôler les différentes boîtes de dialogue
  const { dialogState, openDialog, closeDialog } = useDialogControls([
    "create",
    "edit",
    "archive",
  ]);

  const {
    channels,
    isLoading,
    error,
    refetch,
    createChannelMutation,
    updateChannelMutation,
    archiveChannelMutation,
    snackbar,
    closeSnackbar,
  } = useChannels(activeSpaceId);

  // Mettre à jour l'espace actif lorsque l'espace sélectionné change
  useEffect(() => {
    if (externalSelectedSpace?.id) {
      setActiveSpaceId(externalSelectedSpace.id);
      setSelectedChannelId(null);
      setSelectedChannel(null);
    }
  }, [externalSelectedSpace]);

  // Mettre à jour le canal sélectionné quand la sélection ou les canaux changent
  useEffect(() => {
    if (selectedChannelId && channels) {
      const channel = channels.find((c) => c.id === selectedChannelId);
      setSelectedChannel(channel || null);
    } else {
      setSelectedChannel(null);
    }
  }, [selectedChannelId, channels]);

  // Gestionnaire de changement d'espace
  const handleSpaceChange = (spaceId) => {
    setActiveSpaceId(spaceId);
    setSelectedChannelId(null);
    setSelectedChannel(null);
  };

  // Gestionnaire de sélection de canal
  const handleChannelSelect = (channelId) => {
    setSelectedChannelId(channelId);
  };

  // Gestionnaires pour les actions de canaux
  const handleAddChannel = () => {
    openDialog("create");
  };

  const handleEditChannel = (channel) => {
    setSelectedChannel(channel);
    openDialog("edit");
  };

  const handleArchiveChannel = (channel) => {
    setSelectedChannel(channel);
    openDialog("archive");
  };

  // Gestionnaires pour les soumissions de formulaires
  const handleCreateSubmit = (values) => {
    createChannelMutation.mutate(values, {
      onSuccess: (newChannel) => {
        closeDialog("create");
        // Sélectionner automatiquement le nouveau canal
        setTimeout(() => {
          setSelectedChannelId(newChannel.id);
        }, 300);
      },
    });
  };

  const handleUpdateSubmit = (values) => {
    if (selectedChannel) {
      updateChannelMutation.mutate(
        { channelId: selectedChannel.id, data: values },
        {
          onSuccess: () => {
            closeDialog("edit");
            // Rafraîchir les données
            refetch();
          },
        },
      );
    }
  };

  const handleArchiveConfirm = () => {
    if (selectedChannel && !selectedChannel.isDefaultChannel) {
      archiveChannelMutation.mutate(selectedChannel.id, {
        onSuccess: () => {
          closeDialog("archive");
          // Désélectionner le canal archivé
          setSelectedChannelId(null);
          setSelectedChannel(null);
        },
      });
    } else {
      // Simplement fermer le dialogue si c'est un canal par défaut
      closeDialog("archive");
    }
  };

  // Afficher l'état de chargement
  if (isLoading) {
    return <LoadingState />;
  }

  // Afficher l'état d'erreur
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Si aucun espace n'est disponible
  if (!spaces || spaces.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="textSecondary" component={"div"}>
          {t("members.noSpacesAvailable")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {t("channels.title")}
      </Typography>

      {/* Sélecteur d'espace */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <SpaceSelector
          activeSpaceId={activeSpaceId}
          onSpaceChange={handleSpaceChange}
        />
      </Paper>

      {activeSpaceId && spaces.length > 0 && (
        <>
          <Typography variant="body1" paragraph>
            {t("channels.subtitle", { count: channels?.length || 0 })}
          </Typography>

          <Box sx={{ display: "flex", gap: 3 }}>
            {/* Liste des canaux - la largeur s'ajuste en fonction de la présence du panneau de détails */}
            <Box
              sx={{
                flex: selectedChannel ? 1 : 2,
                transition: "flex 0.3s ease-in-out",
              }}
            >
              <ChannelsList
                channels={channels}
                selectedChannelId={selectedChannelId}
                onChannelSelect={handleChannelSelect}
                onAddClick={handleAddChannel}
                onEditClick={handleEditChannel}
                onArchiveClick={handleArchiveChannel}
              />
            </Box>

            {/* Détails du canal sélectionné */}
            {selectedChannel && (
              <Box
                sx={{
                  flex: 1,
                  animation: "fadeIn 0.3s ease-in-out",
                  "@keyframes fadeIn": {
                    "0%": {
                      opacity: 0,
                      transform: "translateX(20px)",
                    },
                    "100%": {
                      opacity: 1,
                      transform: "translateX(0)",
                    },
                  },
                }}
              >
                <ChannelDetails
                  channel={selectedChannel}
                  onClose={() => {
                    setSelectedChannelId(null);
                    setSelectedChannel(null);
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Boîtes de dialogue pour les actions sur les canaux */}
          <ChannelDialogs
            selectedChannel={selectedChannel}
            activeSpaceId={activeSpaceId}
            createDialogOpen={dialogState.create}
            editDialogOpen={dialogState.edit}
            archiveDialogOpen={dialogState.archive}
            createMutation={createChannelMutation}
            updateMutation={updateChannelMutation}
            archiveMutation={archiveChannelMutation}
            onCreateClose={() => closeDialog("create")}
            onEditClose={() => closeDialog("edit")}
            onArchiveClose={() => closeDialog("archive")}
            onCreateSubmit={handleCreateSubmit}
            onUpdateSubmit={handleUpdateSubmit}
            onArchiveConfirm={handleArchiveConfirm}
          />
        </>
      )}

      {/* Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity || "info"}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default ChannelsPanel;
