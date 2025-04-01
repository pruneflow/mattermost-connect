import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { teamMembersService } from "../api/team-members";

/**
 * Hook personnalisé pour gérer les opérations sur les membres d'équipe
 */
export const useTeamMembers = (spaceId) => {
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

  // Fonction pour extraire et formater les messages d'erreur
  const formatErrorMessage = (error) => {
    // Extraire le message d'erreur du serveur si disponible
    if (error.response && error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    // Sinon utiliser le message d'erreur standard
    return error.message || "Une erreur inconnue s'est produite";
  };

  // Récupérer les membres de l'équipe
  const {
    data: members = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["teamMembers", spaceId],
    queryFn: () => teamMembersService.getMembers(spaceId),
    enabled: !!spaceId, // Ne pas exécuter la requête si spaceId n'est pas défini
    staleTime: 30000, // 30 secondes avant de considérer les données comme périmées
  });

  // Mutation pour inviter un membre
  // Modification à apporter à la mutation inviteMutation dans useTeamMembers.js

  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      const response = await teamMembersService.inviteMember(spaceId, email);
      return response; // Retourner la réponse complète pour la traiter dans le composant
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", spaceId] });

      // Afficher un snackbar avec un message approprié selon le statut
      let message = "";
      let severity = "success";

      switch (data.status) {
        case "added":
          message = t("members.invite.success");
          break;
        case "already_member":
          message = t("members.invite.alreadyMember");
          break;
        case "invitation_sent":
          message = t("members.invite.emailSent");
          break;
        case "email_failed":
          message = t("members.invite.emailFailed");
          severity = "warning";
          break;
        case "invitation_link_only":
          message = t("members.invite.linkGenerated");
          break;
        default:
          message = t("members.invite.success");
      }

      // Afficher le snackbar
      setSnackbar({
        open: true,
        message: message,
        severity: severity,
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("members.invite.error", {
          message: formatErrorMessage(error),
        }),
        severity: "error",
      });
    },
  });

  // Nouvelle mutation pour inviter plusieurs membres à la fois
  const bulkInviteMutation = useMutation({
    mutationFn: (emails) => teamMembersService.inviteMembers(spaceId, emails),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", spaceId] });

      // Personnaliser le message en fonction des résultats
      if (data.invitations.failed === 0) {
        setSnackbar({
          open: true,
          message: t("members.bulkInvite.successAll", {
            count: data.invitations.successful,
          }),
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: t("members.bulkInvite.partialSuccess", {
            success: data.invitations.successful,
            failed: data.invitations.failed,
            total: data.invitations.total,
          }),
          severity: "warning",
        });
      }
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("members.bulkInvite.error", {
          message: formatErrorMessage(error),
        }),
        severity: "error",
      });
    },
  });

  // Mutation pour mettre à jour le rôle d'un membre
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, isAdmin }) =>
      teamMembersService.updateMemberRole(spaceId, userId, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", spaceId] });
      setSnackbar({
        open: true,
        message: t("members.role.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("members.role.error", {
          message: formatErrorMessage(error),
        }),
        severity: "error",
      });
    },
  });

  // Mutation pour supprimer un membre
  const removeMemberMutation = useMutation({
    mutationFn: (userId) => teamMembersService.removeMember(spaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", spaceId] });
      setSnackbar({
        open: true,
        message: t("members.remove.success"),
        severity: "success",
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: t("members.remove.error", {
          message: formatErrorMessage(error),
        }),
        severity: "error",
      });
    },
  });

  // Méthode pratique pour inviter plusieurs membres
  const inviteMultipleMembers = useCallback(
    (emails) => {
      return bulkInviteMutation.mutateAsync(emails);
    },
    [bulkInviteMutation],
  );

  return {
    members,
    isLoading,
    error,
    refetch,
    inviteMutation,
    bulkInviteMutation,
    inviteMultipleMembers, // Nouvelle méthode d'aide
    updateRoleMutation,
    removeMemberMutation,
    snackbar,
    closeSnackbar,
  };
};

export default useTeamMembers;
