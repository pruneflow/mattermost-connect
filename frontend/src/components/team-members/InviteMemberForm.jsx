// src/components/team-members/InviteMemberForm.jsx (mise à jour)
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";
import { useFormik } from "formik";
import InviteResultDialog from "./InviteResultDialog";

const InviteMemberForm = ({ onInvite, isSubmitting }) => {
  const { t } = useTranslation();
  const [inviteResult, setInviteResult] = useState(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Schéma de validation
  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t("auth.validation.invalidEmail"))
      .required(t("auth.validation.emailRequired")),
  });

  // Initialisation du formulaire
  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const result = await onInvite(values.email);
        setInviteResult(result);
        setShowResultDialog(true);
        resetForm();
      } catch (error) {
        console.error("Erreur lors de l'invitation:", error);
        // Gérer l'erreur (peut-être afficher un message)
      }
    },
  });

  const handleCloseResultDialog = () => {
    setShowResultDialog(false);
  };

  return (
    <>
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t("members.invite.title")}
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          {t("members.invite.description")}
        </Typography>

        <form onSubmit={formik.handleSubmit}>
          <Box display="flex" alignItems="flex-start">
            <TextField
              name="email"
              label={t("members.invite.emailLabel")}
              variant="outlined"
              size="small"
              fullWidth
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              sx={{ mr: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon />
                )
              }
              disabled={isSubmitting}
            >
              {t("members.invite.button")}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Dialogue de résultat d'invitation */}
      <InviteResultDialog
        open={showResultDialog}
        onClose={handleCloseResultDialog}
        inviteResult={inviteResult}
      />
    </>
  );
};

export default InviteMemberForm;
