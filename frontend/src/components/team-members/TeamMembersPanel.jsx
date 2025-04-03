// Modification de TeamMembersPanel.jsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useTeamMembers } from "../../hooks/useTeamMembers";
import { useAuth } from "../../hooks/useAuth";
import { useMattermostSpaces } from "../../hooks/useMattermostSpaces";
import InviteMemberForm from "./InviteMemberForm";
import BulkInviteForm from "./BulkInviteForm";
import MemberList from "./MemberList";
import NotificationSnackbar from "../common/NotificationSnackbar";
import { LoadingState, ErrorState } from "../common";
import { doesSpaceExists } from "../../spaceUtils.js";

const TeamMembersPanel = ({ selectedSpace: externalSelectedSpace }) => {
  // Récupération de tous les espaces disponibles
  const {
    spaces,
    isLoading: isLoadingSpaces,
    error: spaceError,
    refetch: refetchSpaces,
  } = useMattermostSpaces();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeSpaceId, setActiveSpaceId] = useState(
    externalSelectedSpace?.id || spaces[0]?.id,
  );
  const [inviteTabValue, setInviteTabValue] = useState(0);

  const {
    members,
    isLoading: isLoadingMembers,
    error: memberError,
    refetch,
    inviteMutation,
    bulkInviteMutation,
    inviteMultipleMembers,
    updateRoleMutation,
    removeMemberMutation,
    snackbar,
    closeSnackbar,
  } = useTeamMembers(
    doesSpaceExists(activeSpaceId, spaces) ? activeSpaceId : spaces[0]?.id,
  );

  // Lors du montage, refetch des espaces pour s'assurer d'avoir les données à jour
  useEffect(() => {
    if (refetchSpaces) void refetchSpaces();
  }, [refetchSpaces]);

  // Mettre à jour activeSpaceId lorsque externalSelectedSpace change
  useEffect(() => {
    if (externalSelectedSpace && spaces && spaces.length > 0) {
      let externalSpaceExists = false;
      if (
        spaces &&
        spaces.find((space) => space.id === externalSelectedSpace.id)
      ) {
        externalSpaceExists = true;
      }
      setActiveSpaceId(
        externalSpaceExists ? externalSelectedSpace.id : spaces[0].id,
      );
      // Force refetch des membres avec le nouvel espace
      if (refetch) void refetch();
    }
  }, [externalSelectedSpace, refetch, spaces]);

  // Auto-sélection du premier espace si nécessaire
  useEffect(() => {
    if (!activeSpaceId && spaces && spaces.length > 0) {
      setActiveSpaceId(spaces[0].id);
    }
  }, [spaces, activeSpaceId]);

  // Trouver l'espace actuellement sélectionné dans la liste des espaces
  const currentSpace = useMemo(() => {
    if (!spaces || !activeSpaceId) return null;
    return spaces.find((space) => space.id === activeSpaceId) || null;
  }, [spaces, activeSpaceId]);

  // Utiliser le hook personnalisé pour gérer les membres d'équipe avec l'ID d'espace actif

  // Handler pour le changement d'espace
  const handleSpaceChange = (event) => {
    const newSpaceId = event.target.value;
    setActiveSpaceId(newSpaceId);
  };

  // Handler pour inviter un utilisateur
  const handleInvite = async (email) => {
    await inviteMutation.mutateAsync(email);
  };

  // Handler pour changer d'onglet d'invitation
  const handleInviteTabChange = (event, newValue) => {
    setInviteTabValue(newValue);
  };

  // Handler pour mettre à jour le rôle d'un utilisateur
  const handleUpdateRole = async (userId, isAdmin) => {
    await updateRoleMutation.mutateAsync({ userId, isAdmin });
  };

  // Handler pour supprimer un utilisateur
  const handleRemoveMember = async (userId) => {
    await removeMemberMutation.mutateAsync(userId);
  };

  // Afficher l'état de chargement des espaces
  if (isLoadingSpaces) {
    return <LoadingState />;
  }

  // Afficher l'état d'erreur des espaces
  if (spaceError) {
    return <ErrorState error={spaceError} onRetry={refetchSpaces} />;
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
        {t("members.title")}
      </Typography>

      {/* Sélecteur d'espace - MODIFICATION: Suppression de disabled={!!externalSelectedSpace} */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <FormControl fullWidth>
          <InputLabel id="space-select-label">
            {t("members.selectSpace")}
          </InputLabel>
          <Select
            labelId="space-select-label"
            id="space-select"
            value={activeSpaceId || ""}
            label={t("members.selectSpace")}
            onChange={handleSpaceChange}
          >
            {spaces.map((space) => (
              <MenuItem key={space.id} value={space.id}>
                {space.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {currentSpace && (
        <>
          <Typography variant="body1" component={"div"}>
            {t("members.subtitle", { spaceName: currentSpace.name })}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Onglets pour les méthodes d'invitation */}
          <Box sx={{ width: "100%" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={inviteTabValue}
                onChange={handleInviteTabChange}
                aria-label="invitation methods tabs"
              >
                <Tab label={t("members.invite.singleTab")} />
                <Tab label={t("members.invite.bulkTab")} />
              </Tabs>
            </Box>

            {/* Panneau d'invitation individuelle */}
            <Box role="tabpanel" hidden={inviteTabValue !== 0}>
              {inviteTabValue === 0 && (
                <InviteMemberForm
                  onInvite={handleInvite}
                  isSubmitting={inviteMutation.isPending}
                />
              )}
            </Box>

            {/* Panneau d'invitation par lots */}
            <Box role="tabpanel" hidden={inviteTabValue !== 1}>
              {inviteTabValue === 1 && (
                <BulkInviteForm
                  onInvite={handleInvite}
                  onBulkInvite={inviteMultipleMembers}
                  isSubmitting={
                    inviteMutation.isPending || bulkInviteMutation.isPending
                  }
                />
              )}
            </Box>
          </Box>

          {/* Liste des membres */}
          <Typography variant="h6" gutterBottom>
            {t("members.currentMembers")}
          </Typography>
          <MemberList
            members={members.map((member) => ({
              ...member,
              isCurrentUser: member.email === user.email,
              isOwner: member.isOwner,
            }))}
            isLoading={isLoadingMembers}
            error={memberError}
            currentUserId={user.id}
            onRefresh={refetch}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
            isUpdatingRole={updateRoleMutation.isPending}
            isRemovingMember={removeMemberMutation.isPending}
          />
        </>
      )}

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

export default TeamMembersPanel;
