// src/hooks/useChannels.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsService } from "../api/channels";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const useChannels = (spaceId) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

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
    queryKey: ["channels", spaceId, showArchived],
    queryFn: () =>
      showArchived
        ? channelsService.getArchivedChannels(spaceId)
        : channelsService.getChannels(spaceId),
    enabled: !!spaceId, // Ne s'exécute que si spaceId est défini
    staleTime: 30000, // 1 minute avant de considérer les données comme périmées
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
        message: t("channels.edit.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("channels.edit.error", { message: error.message }),
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

  // Mutation pour restaurer un canal
  const restoreChannelMutation = useMutation({
    mutationFn: (channelId) =>
      channelsService.restoreChannel(channelId, spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", spaceId] });
      setSnackbar({
        open: true,
        message: t("channels.restore.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("channels.restore.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  return {
    channels: channels || [],
    isLoading,
    error,
    refetch,
    showArchived,
    setShowArchived,
    createChannelMutation,
    updateChannelMutation,
    archiveChannelMutation,
    restoreChannelMutation,
    snackbar,
    closeSnackbar,
  };
};

export default useChannels;
