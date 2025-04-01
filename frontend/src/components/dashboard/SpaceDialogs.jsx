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
import { SpaceForm } from "../../components/mattermost";

/**
 * Composant regroupant tous les dialogues liés aux espaces Mattermost
 */
const SpaceDialogs = ({
  selectedSpace,
  addDialogOpen,
  editDialogOpen,
  tokenDialogOpen,
  deleteDialogOpen,
  createMutation,
  updateMutation,
  tokenMutation,
  deleteMutation,
  onAddClose,
  onEditClose,
  onTokenClose,
  onDeleteClose,
  onCreateSubmit,
  onUpdateSubmit,
  onTokenConfirm,
  onDeleteConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Dialog de création d'espace */}
      <Dialog open={addDialogOpen} onClose={onAddClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t("spaces.create.title")}</DialogTitle>
        <DialogContent>
          <SpaceForm
            onSubmit={onCreateSubmit}
            onCancel={onAddClose}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition d'espace */}
      <Dialog
        open={editDialogOpen}
        onClose={onEditClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("spaces.edit.title")}</DialogTitle>
        <DialogContent>
          <SpaceForm
            space={selectedSpace}
            onSubmit={onUpdateSubmit}
            onCancel={onEditClose}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog pour la génération de token */}
      <Dialog open={tokenDialogOpen} onClose={onTokenClose}>
        <DialogTitle>{t("spaces.token.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("spaces.token.message", { name: selectedSpace?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onTokenClose}>{t("spaces.token.cancel")}</Button>
          <Button
            color="primary"
            onClick={onTokenConfirm}
            disabled={tokenMutation.isPending}
          >
            {tokenMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t("spaces.token.confirm")
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour la suppression */}
      <Dialog open={deleteDialogOpen} onClose={onDeleteClose}>
        <DialogTitle>{t("spaces.delete.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("spaces.delete.message", { name: selectedSpace?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={onDeleteClose}>{t("spaces.delete.cancel")}</Button>
          <Button
            color="error"
            onClick={onDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              t("spaces.delete.confirm")
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SpaceDialogs;
