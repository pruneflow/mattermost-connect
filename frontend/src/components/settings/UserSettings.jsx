// src/components/settings/UserSettings.jsx
import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../api/user";

// Composant principal de paramètres utilisateur
const UserSettings = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [language, setLanguage] = useState(i18n.language);
  const queryClient = useQueryClient();

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: (userData) => userService.updateProfile(userData),
    onSuccess: (data) => {
      // Mettre à jour l'utilisateur dans le contexte d'authentification
      updateUser(data);

      // Afficher un message de succès
      setSuccessMessage(t("settings.profileUpdatedSuccess"));

      // Invalider les requêtes concernant l'utilisateur
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      // Effacer le message après 3 secondes
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    },
  });

  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData) => userService.changePassword(passwordData),
    onSuccess: () => {
      // Réinitialiser le formulaire après succès
      passwordFormik.resetForm();

      // Afficher un message de succès
      setSuccessMessage(t("settings.passwordChangedSuccess"));

      // Effacer le message après 3 secondes
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    },
  });

  // Schéma de validation pour le formulaire de profil
  const profileValidationSchema = Yup.object({
    firstName: Yup.string().required(t("auth.validation.firstNameRequired")),
    lastName: Yup.string().required(t("auth.validation.lastNameRequired")),
    companyName: Yup.string().required(t("auth.validation.companyRequired")),
    email: Yup.string()
      .email(t("auth.validation.invalidEmail"))
      .required(t("auth.validation.emailRequired")),
  });

  // Schéma de validation pour le formulaire de changement de mot de passe
  const passwordValidationSchema = Yup.object({
    currentPassword: Yup.string().required(
      t("settings.currentPasswordRequired"),
    ),
    newPassword: Yup.string()
      .min(8, t("auth.validation.passwordMinLength"))
      .required(t("settings.newPasswordRequired")),
    confirmPassword: Yup.string()
      .oneOf(
        [Yup.ref("newPassword"), null],
        t("auth.validation.passwordsMatch"),
      )
      .required(t("auth.validation.confirmRequired")),
  });

  // Configuration du formulaire de profil avec Formik
  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      companyName: user?.companyName || "",
      email: user?.email || "",
    },
    validationSchema: profileValidationSchema,
    onSubmit: (values) => {
      updateProfileMutation.mutate(values);
    },
  });

  // Configuration du formulaire de changement de mot de passe avec Formik
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: passwordValidationSchema,
    onSubmit: (values) => {
      changePasswordMutation.mutate(values);
    },
  });

  // Gestionnaire de changement de langue
  const handleLanguageChange = (event, newLanguage) => {
    if (newLanguage !== null) {
      setLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
      localStorage.setItem("i18nextLng", newLanguage);
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        {t("settings.userPreferences")}
      </Typography>

      {/* Message de succès */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Section de préférences d'interface */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t("settings.interfacePreferences")}
        </Typography>
        <Box my={2}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t("settings.language")}
          </Typography>
          <ToggleButtonGroup
            value={language}
            exclusive
            onChange={handleLanguageChange}
            aria-label="language selection"
          >
            <ToggleButton value="fr" aria-label="français">
              🇫🇷 Français
            </ToggleButton>
            <ToggleButton value="en" aria-label="english">
              🇬🇧 English
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Formulaire de profil */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title={t("settings.profileInformation")} />
        <Divider />
        <CardContent>
          <form onSubmit={profileFormik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item md={6} xs={12}>
                <TextField
                  fullWidth
                  label={t("auth.firstName")}
                  name="firstName"
                  value={profileFormik.values.firstName}
                  onChange={profileFormik.handleChange}
                  error={
                    profileFormik.touched.firstName &&
                    Boolean(profileFormik.errors.firstName)
                  }
                  helperText={
                    profileFormik.touched.firstName &&
                    profileFormik.errors.firstName
                  }
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  fullWidth
                  label={t("auth.lastName")}
                  name="lastName"
                  value={profileFormik.values.lastName}
                  onChange={profileFormik.handleChange}
                  error={
                    profileFormik.touched.lastName &&
                    Boolean(profileFormik.errors.lastName)
                  }
                  helperText={
                    profileFormik.touched.lastName &&
                    profileFormik.errors.lastName
                  }
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  fullWidth
                  label={t("auth.companyName")}
                  name="companyName"
                  value={profileFormik.values.companyName}
                  onChange={profileFormik.handleChange}
                  error={
                    profileFormik.touched.companyName &&
                    Boolean(profileFormik.errors.companyName)
                  }
                  helperText={
                    profileFormik.touched.companyName &&
                    profileFormik.errors.companyName
                  }
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  fullWidth
                  label={t("auth.email")}
                  name="email"
                  value={profileFormik.values.email}
                  onChange={profileFormik.handleChange}
                  error={
                    profileFormik.touched.email &&
                    Boolean(profileFormik.errors.email)
                  }
                  helperText={
                    profileFormik.touched.email && profileFormik.errors.email
                  }
                />
              </Grid>
            </Grid>
            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                color="primary"
                variant="contained"
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  t("settings.saveChanges")
                )}
              </Button>
            </Box>
            {updateProfileMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {updateProfileMutation.error.message}
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Formulaire de changement de mot de passe */}
      <Card>
        <CardHeader title={t("settings.changePassword")} />
        <Divider />
        <CardContent>
          <form onSubmit={passwordFormik.handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t("settings.currentPassword")}
                  name="currentPassword"
                  type="password"
                  value={passwordFormik.values.currentPassword}
                  onChange={passwordFormik.handleChange}
                  error={
                    passwordFormik.touched.currentPassword &&
                    Boolean(passwordFormik.errors.currentPassword)
                  }
                  helperText={
                    passwordFormik.touched.currentPassword &&
                    passwordFormik.errors.currentPassword
                  }
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  fullWidth
                  label={t("settings.newPassword")}
                  name="newPassword"
                  type="password"
                  value={passwordFormik.values.newPassword}
                  onChange={passwordFormik.handleChange}
                  error={
                    passwordFormik.touched.newPassword &&
                    Boolean(passwordFormik.errors.newPassword)
                  }
                  helperText={
                    passwordFormik.touched.newPassword &&
                    passwordFormik.errors.newPassword
                  }
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  fullWidth
                  label={t("settings.confirmNewPassword")}
                  name="confirmPassword"
                  type="password"
                  value={passwordFormik.values.confirmPassword}
                  onChange={passwordFormik.handleChange}
                  error={
                    passwordFormik.touched.confirmPassword &&
                    Boolean(passwordFormik.errors.confirmPassword)
                  }
                  helperText={
                    passwordFormik.touched.confirmPassword &&
                    passwordFormik.errors.confirmPassword
                  }
                />
              </Grid>
            </Grid>
            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button
                color="primary"
                variant="contained"
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  t("settings.changePassword")
                )}
              </Button>
            </Box>
            {changePasswordMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {changePasswordMutation.error.message}
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserSettings;
