import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { mattermostSpacesService } from "../api/mattermost-spaces";

/**
 * Hook personnalisé qui encapsule toutes les mutations liées aux espaces Mattermost
 */
const useSpaceMutations = () => {
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

  // Mutation pour créer un espace
  const createMutation = useMutation({
    mutationFn: (spaceData) => mattermostSpacesService.create(spaceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mattermostSpaces"] });
      setSnackbar({
        open: true,
        message: t("spaces.create.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("spaces.create.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  // Mutation pour mettre à jour un espace
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => mattermostSpacesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mattermostSpaces"] });
      setSnackbar({
        open: true,
        message: t("spaces.update.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("spaces.update.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  // Mutation pour supprimer un espace
  const deleteMutation = useMutation({
    mutationFn: (id) => mattermostSpacesService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["mattermostSpaces"] });
      setSnackbar({
        open: true,
        message: t("spaces.delete.success", { name: id }), // Ici, on devrait idéalement avoir le nom
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("spaces.delete.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  // Mutation pour générer un token
  const tokenMutation = useMutation({
    mutationFn: (spaceId) => mattermostSpacesService.generateToken(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mattermostSpaces"] });
      setSnackbar({
        open: true,
        message: t("spaces.token.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("spaces.token.error", { message: error.message }),
        severity: "error",
      });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    tokenMutation,
    snackbar,
    closeSnackbar,
  };
};

export default useSpaceMutations;
