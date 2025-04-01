// src/hooks/useChannels.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsService } from "../api/channels";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const useChannels = (spaceId) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // État pour les notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fermer la notification
  const closeSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  // Requête pour obtenir les canaux
  const {
    data: channels,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["channels", spaceId],
    queryFn: () => channelsService.getChannels(spaceId),
    enabled: !!spaceId, // Ne s'exécute que si spaceId est défini
    staleTime: 60000, // 1 minute avant de considérer les données comme périmées
  });

  // Mutation pour créer un canal
  const createChannelMutation = useMutation({
    mutationFn: (channelData) =>
      channelsService.createChannel({
        ...channelData,
        spaceId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", spaceId] });
      setSnackbar({
        open: true,
        message: t("channels.create.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("channels.create.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  // Mutation pour mettre à jour un canal
  const updateChannelMutation = useMutation({
    mutationFn: ({ channelId, data }) =>
      channelsService.updateChannel(channelId, {
        ...data,
        spaceId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", spaceId] });
      setSnackbar({
        open: true,
        message: t("channels.update.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("channels.update.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  // Mutation pour archiver un canal
  const archiveChannelMutation = useMutation({
    mutationFn: (channelId) =>
      channelsService.archiveChannel(channelId, spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", spaceId] });
      setSnackbar({
        open: true,
        message: t("channels.archive.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("channels.archive.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  return {
    channels: channels || [],
    isLoading,
    error,
    refetch,
    createChannelMutation,
    updateChannelMutation,
    archiveChannelMutation,
    snackbar,
    closeSnackbar,
  };
};

export default useChannels;
