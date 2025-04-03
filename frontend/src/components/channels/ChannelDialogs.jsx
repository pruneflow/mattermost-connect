// src/components/channels/ChannelDialogs.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import CreateChannelForm from "./CreateChannelForm";
import EditChannelForm from "./EditChannelForm";

/**
 * Composant regroupant tous les dialogues liés aux canaux Mattermost
 */
const ChannelDialogs = ({
  selectedChannel,
  activeSpaceId,
  createDialogOpen,
  editDialogOpen,
  archiveDialogOpen,
  restoreDialogOpen,
  createMutation,
  updateMutation,
  archiveMutation,
  restoreMutation,
  onCreateClose,
  onEditClose,
  onArchiveClose,
  onRestoreClose,
  onCreateSubmit,
  onUpdateSubmit,
  onArchiveConfirm,
  onRestoreConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Dialog de création de canal */}
      <Dialog
        open={createDialogOpen}
        onClose={onCreateClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t("channels.create.title")}</DialogTitle>
        <DialogContent>
          <CreateChannelForm
            onSubmit={onCreateSubmit}
            onCancel={onCreateClose}
            isSubmitting={createMutation.isPending}
            spaceId={activeSpaceId}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition de canal */}
      <Dialog
        open={editDialogOpen}
        onClose={onEditClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t("channels.edit.title")}</DialogTitle>
        <DialogContent>
          <EditChannelForm
            channel={selectedChannel}
            onSubmit={onUpdateSubmit}
            onCancel={onEditClose}
            isSubmitting={updateMutation.isPending}
            spaceId={activeSpaceId}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog pour l'archivage d'un canal */}
      <Dialog open={archiveDialogOpen} onClose={onArchiveClose}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <WarningIcon color="error" sx={{ mr: 1 }} />
            {t("channels.archive.title")}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedChannel?.isDefaultChannel ? (
            <>
              <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <Chip
                  label={t("channels.defaultChannel")}
                  color="primary"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="h6">
                  {selectedChannel?.display_name}
                </Typography>
              </Box>
              <DialogContentText>
                {t("channels.archive.defaultMessage", {
                  name: selectedChannel?.display_name,
                })}
              </DialogContentText>
            </>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">
                  {selectedChannel?.display_name}
                </Typography>
              </Box>
              <DialogContentText>
                {t("channels.archive.message", {
                  name: selectedChannel?.display_name,
                })}
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onArchiveClose}>{t("common.cancel")}</Button>
          <Button
            color="error"
            onClick={onArchiveConfirm}
            disabled={
              archiveMutation.isPending || selectedChannel?.isDefaultChannel
            }
          >
            {archiveMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t("channels.archive.confirm")
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour la restauration d'un canal archivé */}
      <Dialog open={restoreDialogOpen} onClose={onRestoreClose}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <RestoreIcon color="primary" sx={{ mr: 1 }} />
            {t("channels.restore.title")}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              {selectedChannel?.display_name}
            </Typography>
          </Box>
          <DialogContentText>
            {t("channels.restore.message", {
              name: selectedChannel?.display_name,
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onRestoreClose}>{t("common.cancel")}</Button>
          <Button
            color="primary"
            onClick={onRestoreConfirm}
            disabled={restoreMutation.isPending || !selectedChannel?.isArchived}
          >
            {restoreMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t("channels.restore.confirm")
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChannelDialogs;
