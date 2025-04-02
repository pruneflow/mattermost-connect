// src/components/channels/CreateChannelForm.jsx
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  RadioGroup,
  Radio,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";

const CreateChannelForm = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
  spaceId,
}) => {
  const { t } = useTranslation();

  // Schéma de validation
  const validationSchema = Yup.object({
    name: Yup.string()
      .required(t("channels.form.nameRequired"))
      .min(2, t("channels.form.nameMinLength"))
      .max(22, t("channels.form.nameMaxLength"))
      .matches(/^[a-z0-9-_]+$/, t("channels.form.nameFormat")),
    display_name: Yup.string()
      .required(t("channels.form.displayNameRequired"))
      .min(2, t("channels.form.displayNameMinLength"))
      .max(64, t("channels.form.displayNameMaxLength")),
    type: Yup.string()
      .required(t("channels.form.typeRequired"))
      .oneOf(["O", "P"], t("channels.form.invalidType")),
    purpose: Yup.string().max(250, t("channels.form.purposeMaxLength")),
    header: Yup.string().max(1024, t("channels.form.headerMaxLength")),
  });

  // Helper pour convertir un nom d'affichage en nom de canal valide
  const generateChannelName = (displayName) => {
    if (!displayName) return "";
    return displayName
      .toLowerCase()
      .replace(/\s+/g, "-") // Remplacer les espaces par des tirets
      .replace(/[^a-z0-9-_]/g, "") // Supprimer les caractères non autorisés
      .substring(0, 22); // Limiter à 22 caractères
  };

  const formik = useFormik({
    initialValues: {
      name: "",
      display_name: "",
      type: "O", // Canal public par défaut
      purpose: "",
      header: "",
      spaceId: spaceId,
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  // Mettre à jour le nom du canal automatiquement lorsque le nom d'affichage change
  const handleDisplayNameChange = (e) => {
    const displayName = e.target.value;
    formik.setFieldValue("display_name", displayName);

    // Si l'utilisateur n'a pas encore modifié le nom manuellement
    if (!formik.touched.name) {
      formik.setFieldValue("name", generateChannelName(displayName));
    }
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" paragraph>
          {t("channels.form.instructions")}
        </Typography>
      </Box>

      <TextField
        fullWidth
        id="display_name"
        name="display_name"
        label={t("channels.form.displayName")}
        value={formik.values.display_name}
        onChange={handleDisplayNameChange}
        error={
          formik.touched.display_name && Boolean(formik.errors.display_name)
        }
        helperText={formik.touched.display_name && formik.errors.display_name}
        margin="normal"
        autoFocus
      />

      <TextField
        fullWidth
        id="name"
        name="name"
        label={t("channels.form.name")}
        value={formik.values.name}
        onChange={formik.handleChange}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={
          (formik.touched.name && formik.errors.name) ||
          t("channels.form.nameHelp")
        }
        margin="normal"
      />

      <FormControl component="fieldset" margin="normal">
        <Typography variant="subtitle2" gutterBottom>
          {t("channels.form.typeLabel")}
        </Typography>
        <RadioGroup
          row
          name="type"
          value={formik.values.type}
          onChange={formik.handleChange}
        >
          <FormControlLabel
            value="O"
            control={<Radio />}
            label={t("channels.types.O")}
          />
          <FormControlLabel
            value="P"
            control={<Radio />}
            label={t("channels.types.P")}
          />
        </RadioGroup>
        <FormHelperText>
          {formik.values.type === "O"
            ? t("channels.form.publicHelp")
            : t("channels.form.privateHelp")}
        </FormHelperText>
      </FormControl>

      <TextField
        fullWidth
        id="purpose"
        name="purpose"
        label={t("channels.form.purpose")}
        value={formik.values.purpose}
        onChange={formik.handleChange}
        error={formik.touched.purpose && Boolean(formik.errors.purpose)}
        helperText={
          (formik.touched.purpose && formik.errors.purpose) ||
          t("channels.form.purposeHelp")
        }
        margin="normal"
        multiline
        rows={2}
      />

      <TextField
        fullWidth
        id="header"
        name="header"
        label={t("channels.form.header")}
        value={formik.values.header}
        onChange={formik.handleChange}
        error={formik.touched.header && Boolean(formik.errors.header)}
        helperText={
          (formik.touched.header && formik.errors.header) ||
          t("channels.form.headerHelp")
        }
        margin="normal"
        multiline
        rows={3}
      />

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onCancel} sx={{ mr: 1 }}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={24} />
          ) : (
            t("channels.form.create")
          )}
        </Button>
      </Box>
    </form>
  );
};

export default CreateChannelForm;
