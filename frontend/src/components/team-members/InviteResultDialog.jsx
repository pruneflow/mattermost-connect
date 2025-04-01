// src/components/team-members/InviteResultDialog.jsx (mise à jour)
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useTranslation } from "react-i18next";

const InviteResultDialog = ({ open, onClose, inviteResult }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!inviteResult) return null;

  const handleCopyInviteLink = () => {
    if (inviteResult.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Pour les invitations ajoutées directement (utilisateur existant)
  if (inviteResult.status === "added") {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>{t("members.invite.successTitle")}</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
            <DialogContentText>
              {t("members.invite.successAddedMessage", {
                email: inviteResult.email,
              })}
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Pour les utilisateurs déjà membres
  if (inviteResult.status === "already_member") {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>{t("members.invite.alreadyMemberTitle")}</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CheckCircleIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
            <DialogContentText>
              {t("members.invite.alreadyMemberMessage", {
                email: inviteResult.email,
              })}
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Pour les invitations envoyées par email
  if (inviteResult.status === "invitation_sent") {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>{t("members.invite.emailSentTitle")}</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
            <DialogContentText>
              {t("members.invite.emailSentMessage", {
                email: inviteResult.email,
                team: inviteResult.teamName,
              })}
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Pour les erreurs d'envoi d'email (mais avec lien)
  if (inviteResult.status === "email_failed") {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md">
        <DialogTitle>{t("members.invite.emailFailedTitle")}</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" mb={2}>
            <ErrorIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
            <DialogContentText>
              {t("members.invite.emailFailedMessage", {
                email: inviteResult.email,
                error: inviteResult.error,
              })}
            </DialogContentText>
          </Box>

          <Box mt={2} mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              {t("members.invite.inviteLink")}:
            </Typography>
            <TextField
              fullWidth
              value={inviteResult.inviteUrl}
              variant="outlined"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Tooltip title={t("members.invite.copyLink")}>
                    <IconButton onClick={handleCopyInviteLink} edge="end">
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                ),
              }}
            />
          </Box>

          <Typography variant="body2" color="textSecondary">
            {t("members.invite.manualEmailInstructions")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            {t("common.close")}
          </Button>
        </DialogActions>

        {/* Notification de copie */}
        <Snackbar
          open={copied}
          autoHideDuration={3000}
          onClose={() => setCopied(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="success" onClose={() => setCopied(false)}>
            {t("members.invite.linkCopied")}
          </Alert>
        </Snackbar>
      </Dialog>
    );
  }

  // Pour les liens d'invitation sans service d'email
  if (inviteResult.status === "invitation_link_only") {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md">
        <DialogTitle>{t("members.invite.linkGeneratedTitle")}</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CheckCircleIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
            <DialogContentText>
              {t("members.invite.linkGeneratedMessage", {
                email: inviteResult.email,
                team: inviteResult.teamName,
              })}
            </DialogContentText>
          </Box>

          <Box mt={2} mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              {t("members.invite.inviteLink")}:
            </Typography>
            <TextField
              fullWidth
              value={inviteResult.inviteUrl}
              variant="outlined"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Tooltip title={t("members.invite.copyLink")}>
                    <IconButton onClick={handleCopyInviteLink} edge="end">
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                ),
              }}
            />
          </Box>

          <Typography variant="body2" color="textSecondary">
            {t("members.invite.linkInstructions")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            {t("common.close")}
          </Button>
        </DialogActions>

        {/* Notification de copie */}
        <Snackbar
          open={copied}
          autoHideDuration={3000}
          onClose={() => setCopied(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="success" onClose={() => setCopied(false)}>
            {t("members.invite.linkCopied")}
          </Alert>
        </Snackbar>
      </Dialog>
    );
  }

  // Cas par défaut (cas non géré)
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t("members.invite.resultTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("members.invite.genericResult", {
            status: inviteResult.status || "unknown",
          })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteResultDialog;
