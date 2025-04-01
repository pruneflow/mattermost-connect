// src/components/team-members/BulkInviteForm.jsx
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Send as SendIcon, People as PeopleIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";
import { useFormik } from "formik";

const BulkInviteForm = ({ onInvite, onBulkInvite, isSubmitting }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [invalidEmails, setInvalidEmails] = useState([]);

  // Schéma de validation pour un email
  const emailSchema = Yup.string().email();

  // Fonction pour valider une liste d'emails
  const validateEmails = (text) => {
    // Séparer les emails (par virgule, point-virgule, espace ou nouvelle ligne)
    const emailList = text
      .split(/[,;\s]+/)
      .filter((email) => email.trim() !== "");

    const valid = [];
    const invalid = [];

    emailList.forEach((email) => {
      try {
        emailSchema.validateSync(email.trim());
        valid.push(email.trim());
      } catch (error) {
        invalid.push(email.trim());
      }
    });

    return { valid, invalid };
  };

  // Initialisation du formulaire
  const formik = useFormik({
    initialValues: {
      emailList: "",
    },
    onSubmit: (values) => {
      const { valid, invalid } = validateEmails(values.emailList);
      setEmails(valid);
      setInvalidEmails(invalid);

      if (valid.length > 0) {
        setOpen(true);
      }
    },
  });

  // Fermer la boîte de dialogue
  const handleClose = () => {
    setOpen(false);
  };

  // Confirmer l'invitation
  const handleConfirm = async () => {
    try {
      // Si la fonction onBulkInvite est disponible, l'utiliser pour l'invitation en masse
      if (typeof onBulkInvite === "function") {
        await onBulkInvite(emails);
      } else {
        // Sinon, inviter chaque email individuellement
        for (const email of emails) {
          await onInvite(email);
        }
      }

      // Réinitialiser le formulaire
      formik.resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'invitation par lots:", error);
    }
  };

  return (
    <>
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t("members.bulkInvite.title")}
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {t("members.bulkInvite.description")}
        </Typography>

        <form onSubmit={formik.handleSubmit}>
          <TextField
            name="emailList"
            label={t("members.bulkInvite.emailsLabel")}
            variant="outlined"
            multiline
            rows={4}
            fullWidth
            value={formik.values.emailList}
            onChange={formik.handleChange}
            placeholder={t("members.bulkInvite.emailsPlaceholder")}
            helperText={t("members.bulkInvite.emailsHelp")}
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PeopleIcon />
              )
            }
            disabled={isSubmitting}
          >
            {t("members.bulkInvite.button")}
          </Button>
        </form>
      </Paper>

      {/* Boîte de dialogue de confirmation */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{t("members.bulkInvite.confirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("members.bulkInvite.confirmMessage", { count: emails.length })}
          </DialogContentText>

          {emails.length > 0 && (
            <List dense>
              {emails.map((email, index) => (
                <ListItem key={index}>
                  <ListItemText primary={email} />
                </ListItem>
              ))}
            </List>
          )}

          {invalidEmails.length > 0 && (
            <>
              <DialogContentText color="error">
                {t("members.bulkInvite.invalidEmails")}:
              </DialogContentText>
              <List dense>
                {invalidEmails.map((email, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={email}
                      sx={{ color: "error.main" }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t("common.cancel")}</Button>
          <Button
            onClick={handleConfirm}
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {t("members.bulkInvite.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkInviteForm;
