// src/components/channels/ChannelDialogs.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
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
  createMutation,
  updateMutation,
  archiveMutation,
  onCreateClose,
  onEditClose,
  onArchiveClose,
  onCreateSubmit,
  onUpdateSubmit,
  onArchiveConfirm,
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
        <DialogTitle>{t("channels.archive.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedChannel?.isDefaultChannel
              ? t("channels.archive.defaultMessage", {
                  name: selectedChannel?.display_name,
                })
              : t("channels.archive.message", {
                  name: selectedChannel?.display_name,
                })}
          </DialogContentText>
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
    </>
  );
};

export default ChannelDialogs;
