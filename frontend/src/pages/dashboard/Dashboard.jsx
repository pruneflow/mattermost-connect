import { useEffect, useState } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { SpaceList } from "../../components/mattermost";
import NotificationSnackbar from "../../components/common/NotificationSnackbar";
import useSpaceMutations from "../../hooks/useSpaceMutations";
import useDialogControls from "../../hooks/useDialogControls";
import {
  AppHeader,
  SpaceDialogs,
  TabbedContent,
  WelcomeBanner,
} from "../../components/dashboard";

import StatisticsPanel from "../../components/statistics/StatisticsPanel";
import UserSettings from "../../components/settings/UserSettings";
import { TeamMembersPanel } from "../../components/team-members";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Page du tableau de bord principal de l'application
 */
const Dashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Utiliser nos hooks personnalisés
  const { dialogState, openDialog, closeDialog } = useDialogControls([
    "add",
    "edit",
    "token",
    "delete",
  ]);

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    tokenMutation,
    snackbar,
    closeSnackbar,
  } = useSpaceMutations();

  // State pour suivre l'onglet actif
  const [activeTab, setActiveTab] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    // Si on bascule vers l'onglet Membres (index 1) et qu'aucun espace n'est sélectionné
    // mais que des espaces existent, forcer le rechargement
    if (activeTab === 1 && !selectedSpace && createMutation.isSuccess) {
      // Force le rechargement des espaces
      queryClient.invalidateQueries({ queryKey: ["mattermostSpaces"] });
    }
  }, [activeTab, selectedSpace, createMutation.isSuccess, queryClient]);

  // Configuration des onglets
  const tabs = [
    {
      label: t("dashboard.tabs.spaces"),
      content: (
        <SpaceList
          onAddClick={() => openDialog("add")}
          onEditClick={(space) => {
            setSelectedSpace(space);
            openDialog("edit");
          }}
          onTokenClick={(space) => {
            setSelectedSpace(space);
            openDialog("token");
          }}
          onDeleteClick={(space) => {
            setSelectedSpace(space);
            openDialog("delete");
          }}
          onSpaceSelect={(space) => {
            setSelectedSpace(space);
          }}
          selectedSpaceId={selectedSpace?.id}
        />
      ),
    },
    {
      label: t("dashboard.tabs.members"),
      content: <TeamMembersPanel selectedSpace={selectedSpace} />,
    },
    {
      label: t("dashboard.tabs.stats"),
      content: <StatisticsPanel user={user} />,
    },
    {
      label: t("dashboard.tabs.settings"),
      content: <UserSettings />,
    },
  ];

  // Gestionnaires pour les formulaires
  const handleCreateSubmit = (values) => {
    createMutation.mutate(values, {
      onSuccess: (newSpace) => {
        closeDialog("add");
        // Sélectionner automatiquement le nouvel espace créé
        setSelectedSpace(newSpace);
      },
    });
  };

  const handleUpdateSubmit = (values) => {
    if (selectedSpace) {
      updateMutation.mutate(
        { id: selectedSpace.id, data: values },
        { onSuccess: () => closeDialog("edit") },
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSpace) {
      deleteMutation.mutate(selectedSpace.id, {
        onSuccess: () => closeDialog("delete"),
      });
    }
  };

  const handleTokenConfirm = () => {
    if (selectedSpace) {
      tokenMutation.mutate(selectedSpace.id, {
        onSuccess: () => closeDialog("token"),
      });
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* En-tête de l'application */}
      <AppHeader onLogout={logout} />

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Bannière de bienvenue */}
        <WelcomeBanner user={user} />

        {/* Contenu en onglets */}
        <TabbedContent tabs={tabs} />
      </Container>

      {/* Dialogues des espaces */}
      <SpaceDialogs
        selectedSpace={selectedSpace}
        addDialogOpen={dialogState.add}
        editDialogOpen={dialogState.edit}
        tokenDialogOpen={dialogState.token}
        deleteDialogOpen={dialogState.delete}
        createMutation={createMutation}
        updateMutation={updateMutation}
        tokenMutation={tokenMutation}
        deleteMutation={deleteMutation}
        onAddClose={() => closeDialog("add")}
        onEditClose={() => closeDialog("edit")}
        onTokenClose={() => closeDialog("token")}
        onDeleteClose={() => closeDialog("delete")}
        onCreateSubmit={handleCreateSubmit}
        onUpdateSubmit={handleUpdateSubmit}
        onTokenConfirm={handleTokenConfirm}
        onDeleteConfirm={handleDeleteConfirm}
      />

      {/* Notification */}
      <NotificationSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={closeSnackbar}
      />
    </Box>
  );
};

export default Dashboard;
