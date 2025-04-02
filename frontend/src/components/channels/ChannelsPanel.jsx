// src/components/channels/ChannelsPanel.jsx
import { useState, useEffect } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
import { useTranslation } from "react-i18next";
import SpaceSelector from "./SpaceSelector";
import ChannelsList from "./ChannelsList";
import ChannelDetails from "./ChannelDetails";
import { LoadingState, ErrorState } from "../common";
import { useChannels } from "../../hooks/useChannels";
import { useMattermostSpaces } from "../../hooks/useMattermostSpaces.js";

const ChannelsPanel = ({ selectedSpace: externalSelectedSpace }) => {
  const { t } = useTranslation();
  const [activeSpaceId, setActiveSpaceId] = useState(externalSelectedSpace?.id);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  const { spaces } = useMattermostSpaces();
  // Hook personnalisé pour récupérer les canaux
  const { channels, isLoading, error, refetch } = useChannels(activeSpaceId);

  // Trouver le canal sélectionné
  const selectedChannel = channels?.find(
    (channel) => channel.id === selectedChannelId,
  );

  // Mettre à jour l'espace actif lorsque l'espace sélectionné change
  useEffect(() => {
    if (externalSelectedSpace?.id) {
      setActiveSpaceId(externalSelectedSpace.id);
      setSelectedChannelId(null); // Réinitialiser le canal sélectionné
    }
  }, [externalSelectedSpace]);

  // Gestionnaire de changement d'espace
  const handleSpaceChange = (spaceId) => {
    setActiveSpaceId(spaceId);
    setSelectedChannelId(null);
  };

  // Gestionnaire de sélection de canal
  const handleChannelSelect = (channelId) => {
    setSelectedChannelId(channelId);
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

      {activeSpaceId && (
        <>
          <Typography variant="body1" paragraph>
            {t("channels.subtitle", { count: channels?.length || 0 })}
          </Typography>

          <Box sx={{ display: "flex", gap: 3 }}>
            {/* Liste des canaux */}
            <Box sx={{ flex: 1 }}>
              <ChannelsList
                channels={channels}
                selectedChannelId={selectedChannelId}
                onChannelSelect={handleChannelSelect}
              />
            </Box>

            {/* Détails du canal sélectionné */}
            {selectedChannel && (
              <Box sx={{ flex: 1 }}>
                <ChannelDetails channel={selectedChannel} />
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ChannelsPanel;
